# Backend Reports API Setup Guide

## Overview

The Reports API needs to support time range filtering (monthly, 6 months, 1 year, all time) and return:
- Total Income
- Total Expenses
- Total Savings
- Savings Rate
- Income vs Expenses (monthly breakdown)
- Savings Trend (monthly and cumulative)
- Net Worth History

## Current Frontend Expectations

The frontend sends a GET request to `/api/reports/` and expects:

```json
{
  "summary": {
    "total_income": "50000.00",
    "total_expenses": "15000.00",
    "total_savings": "35000.00",
    "savings_rate": "70.0"
  },
  "income_vs_expenses": [
    {
      "month": "Jan 2026",
      "income": 50000,
      "expenses": 15000
    },
    {
      "month": "Feb 2026",
      "income": 45000,
      "expenses": 12000
    }
  ],
  "savings_trend": [
    {
      "month": "Jan 2026",
      "savings": 35000,
      "cumulative": 35000
    },
    {
      "month": "Feb 2026",
      "savings": 33000,
      "cumulative": 68000
    }
  ],
  "net_worth_history": [
    {
      "month": "Jan 2026",
      "net_worth": 500000
    },
    {
      "month": "Feb 2026",
      "net_worth": 533000
    }
  ]
}
```

## Implementation Steps

### Step 1: Update the Reports View

**File**: `api/views.py`

```python
from datetime import datetime, timedelta
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Income, Expense, MonthCycle, FinancialProfile, NetWorthSnapshot
from decimal import Decimal

class ReportsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get financial reports with time range filtering
        Query params: time_range (1m, 6m, 1y, all) - defaults to 6m
        """
        user = request.user
        time_range = request.query_params.get('time_range', '6m')
        
        # Calculate date range
        today = datetime.now().date()
        if time_range == '1m':
            start_date = today.replace(day=1)  # First day of current month
        elif time_range == '6m':
            start_date = today - timedelta(days=180)
        elif time_range == '1y':
            start_date = today - timedelta(days=365)
        else:  # 'all'
            start_date = None
        
        # Build query filters
        filters = Q(user=user)
        if start_date:
            filters &= Q(created_at__date__gte=start_date)
        
        # Get income and expenses
        income_data = Income.objects.filter(filters).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        expense_data = Expense.objects.filter(filters).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Calculate savings and rate
        total_savings = income_data - expense_data
        savings_rate = (total_savings / income_data * 100) if income_data > 0 else Decimal('0')
        
        # Get monthly breakdown
        income_vs_expenses = self._get_monthly_breakdown(user, start_date)
        savings_trend = self._get_savings_trend(user, start_date)
        net_worth_history = self._get_net_worth_history(user, start_date)
        
        return Response({
            'summary': {
                'total_income': float(income_data),
                'total_expenses': float(expense_data),
                'total_savings': float(total_savings),
                'savings_rate': float(savings_rate),
            },
            'income_vs_expenses': income_vs_expenses,
            'savings_trend': savings_trend,
            'net_worth_history': net_worth_history,
        })
    
    def _get_monthly_breakdown(self, user, start_date):
        """Get monthly income vs expenses breakdown"""
        from django.db.models.functions import TruncMonth
        
        filters = Q(user=user)
        if start_date:
            filters &= Q(created_at__date__gte=start_date)
        
        # Get monthly income
        income_monthly = Income.objects.filter(filters).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        # Get monthly expenses
        expense_monthly = Expense.objects.filter(filters).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        # Combine into single list
        months_dict = {}
        for item in income_monthly:
            month_key = item['month'].strftime('%b %Y') if item['month'] else 'Unknown'
            months_dict[month_key] = {'month': month_key, 'income': float(item['total']), 'expenses': 0}
        
        for item in expense_monthly:
            month_key = item['month'].strftime('%b %Y') if item['month'] else 'Unknown'
            if month_key not in months_dict:
                months_dict[month_key] = {'month': month_key, 'income': 0, 'expenses': 0}
            months_dict[month_key]['expenses'] = float(item['total'])
        
        return sorted(months_dict.values(), key=lambda x: x['month'])
    
    def _get_savings_trend(self, user, start_date):
        """Get monthly savings and cumulative savings"""
        from django.db.models.functions import TruncMonth
        
        filters = Q(user=user)
        if start_date:
            filters &= Q(created_at__date__gte=start_date)
        
        # Get monthly income and expenses
        income_monthly = {}
        expense_monthly = {}
        
        for item in Income.objects.filter(filters).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(total=Sum('amount')):
            month_key = item['month'].strftime('%b %Y') if item['month'] else 'Unknown'
            income_monthly[month_key] = float(item['total'])
        
        for item in Expense.objects.filter(filters).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(total=Sum('amount')):
            month_key = item['month'].strftime('%b %Y') if item['month'] else 'Unknown'
            expense_monthly[month_key] = float(item['total'])
        
        # Calculate monthly savings and cumulative
        all_months = sorted(set(list(income_monthly.keys()) + list(expense_monthly.keys())))
        result = []
        cumulative = 0
        
        for month in all_months:
            income = income_monthly.get(month, 0)
            expenses = expense_monthly.get(month, 0)
            monthly_savings = income - expenses
            cumulative += monthly_savings
            
            result.append({
                'month': month,
                'savings': monthly_savings,
                'cumulative': cumulative,
            })
        
        return result
    
    def _get_net_worth_history(self, user, start_date):
        """Get net worth history from snapshots"""
        filters = Q(profile__user=user)
        if start_date:
            filters &= Q(snapshot_date__gte=start_date)
        
        snapshots = NetWorthSnapshot.objects.filter(filters).order_by('snapshot_date')
        
        # Group by month and get latest per month
        months_dict = {}
        for snapshot in snapshots:
            month_key = snapshot.snapshot_date.strftime('%b %Y')
            months_dict[month_key] = {
                'month': month_key,
                'net_worth': float(snapshot.net_worth),
            }
        
        return sorted(months_dict.values(), key=lambda x: x['month'])
```

### Step 2: Update URL Routing

**File**: `api/urls.py`

Make sure the reports endpoint is mapped:

```python
path("reports/", ReportsView.as_view(), name="reports"),
```

### Step 3: Update Frontend API Call (Optional)

**File**: `apps/web/src/api/report.ts`

```typescript
export async function getReports(timeRange: "1m" | "6m" | "1y" | "all" = "6m"): Promise<ReportData> {
  const response = await apiClient.get("/reports/", {
    params: { time_range: timeRange }
  });
  return response.data;
}
```

### Step 4: Update Frontend Store (Optional)

**File**: `apps/web/src/store/reportStore.ts`

```typescript
interface ReportState {
  reportData: ReportData | null;
  timeRange: "1m" | "6m" | "1y" | "all";
  isLoading: boolean;
  error: string | null;
  
  fetchReports: (timeRange?: "1m" | "6m" | "1y" | "all") => Promise<void>;
  setTimeRange: (range: "1m" | "6m" | "1y" | "all") => void;
  reset: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reportData: null,
  timeRange: "6m",
  isLoading: false,
  error: null,

  fetchReports: async (timeRange = "6m") => {
    set({ isLoading: true, error: null, timeRange });
    try {
      const data = await getReports(timeRange);
      set({ reportData: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch reports", isLoading: false });
    }
  },

  setTimeRange: (range) => set({ timeRange: range }),

  reset: () => set({ reportData: null, timeRange: "6m", isLoading: false, error: null }),
}));
```

## Testing the API

### Test with cURL

```bash
# Get 6 months report (default)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/reports/

# Get monthly report
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/reports/?time_range=1m

# Get 1 year report
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/reports/?time_range=1y

# Get all time report
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/reports/?time_range=all
```

## Database Queries Needed

Make sure these models exist and have the required fields:
- `Income` - user, amount, created_at
- `Expense` - user, amount, created_at
- `NetWorthSnapshot` - profile, net_worth, snapshot_date
- `FinancialProfile` - user

## Performance Optimization

For large datasets, consider:
1. Adding database indexes on `created_at` and `user` fields
2. Caching reports for 1 hour
3. Using select_related/prefetch_related for foreign keys
4. Aggregating data at the database level (already done with Sum)

## Error Handling

The API should handle:
- Missing user (401 Unauthorized)
- Invalid time_range parameter (use default)
- No data for the time period (return empty arrays)
- Database errors (500 Internal Server Error)

## Next Steps

1. Implement the ReportsView in your backend
2. Test with the provided cURL commands
3. Update frontend API call if needed
4. Update frontend store if needed
5. Test the full flow in the UI
