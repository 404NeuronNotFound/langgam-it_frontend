# Backend Fixes Needed

## Issue 1: Income Allocation Logic

### Problem
When adding 10k income, the system is allocating:
- 10k to `emergency_fund`
- 10k to `cash_on_hand`
- **Total: 20k from 10k income (INCORRECT)**

## Expected Behavior
- **10k income** → 10k to `cash_on_hand` (for needs/wants), 0 to `emergency_fund`
- **20k income** → 10k to `emergency_fund`, 10k to `cash_on_hand`

## Where to Fix
The backend endpoint: `POST /api/income/`

This endpoint is called from the frontend at:
- File: `langgam-it/apps/web/src/api/cycle.ts`
- Function: `submitIncome()`

## Suggested Fix

### Current (Incorrect) Logic
```python
# This is likely what's happening in your backend
def allocate_income(income_amount):
    emergency_fund += income_amount  # 10k
    cash_on_hand += income_amount    # 10k
    # Total: 20k from 10k income ❌
```

### Correct Logic Option 1: Threshold-based
```python
def allocate_income(income_amount):
    """
    Allocate income to buckets based on amount.
    Only allocate to emergency fund when income >= 20k
    """
    if income_amount >= 20000:
        # Split 50-50 when income is sufficient
        emergency_allocation = income_amount * 0.5
        cash_allocation = income_amount * 0.5
        
        emergency_fund += emergency_allocation
        cash_on_hand += cash_allocation
    else:
        # All income goes to cash on hand for immediate needs
        cash_on_hand += income_amount
        # emergency_fund remains unchanged
```

### Correct Logic Option 2: Priority-based
```python
def allocate_income(income_amount):
    """
    Prioritize cash on hand first, then emergency fund.
    """
    # First 10k always goes to cash on hand
    if income_amount <= 10000:
        cash_on_hand += income_amount
    else:
        # First 10k to cash on hand
        cash_on_hand += 10000
        # Remaining to emergency fund
        emergency_fund += (income_amount - 10000)
```

### Correct Logic Option 3: Proportional with minimum
```python
def allocate_income(income_amount):
    """
    Ensure minimum cash on hand, then split remaining.
    """
    MIN_CASH_ON_HAND = 10000
    
    if income_amount <= MIN_CASH_ON_HAND:
        # All to cash on hand if below minimum
        cash_on_hand += income_amount
    else:
        # Ensure minimum cash on hand first
        cash_allocation = MIN_CASH_ON_HAND
        emergency_allocation = income_amount - MIN_CASH_ON_HAND
        
        cash_on_hand += cash_allocation
        emergency_fund += emergency_allocation
```

## Testing
After fixing, test with these scenarios:

1. **5k income**
   - Expected: cash_on_hand +5k, emergency_fund +0

2. **10k income**
   - Expected: cash_on_hand +10k, emergency_fund +0

3. **15k income**
   - Expected: cash_on_hand +10k, emergency_fund +5k (Option 2)
   - OR: cash_on_hand +15k, emergency_fund +0 (Option 1)

4. **20k income**
   - Expected: cash_on_hand +10k, emergency_fund +10k

5. **30k income**
   - Expected: cash_on_hand +15k, emergency_fund +15k

## Frontend Impact
No changes needed in the frontend. The frontend correctly displays the values returned by the backend in the `profile` object.

The allocation results are shown in:
- `Dashboard.tsx` - displays emergency_fund and cash_on_hand
- `IncomePage.tsx` - shows allocation logs after income submission


---

## Issue 2: Expense Deduction Logic - CRITICAL

### Problem
When expenses are added, the backend is DEDUCTING from `expenses_budget` and `wants_budget`, causing them to go NEGATIVE.

**Current (WRONG) behavior:**
- Initial: expenses_budget = 7,000, wants_budget = 3,000
- After 5,500 spent on needs: expenses_budget = 1,500 (7,000 - 5,500)
- After 2,000 spent on wants: wants_budget = 1,000 (3,000 - 2,000)
- Result: Shows -4,000 remaining for needs, -1,000 for wants ❌

### Expected Behavior
`expenses_budget` and `wants_budget` should represent ALLOCATED amounts and NEVER change when expenses are added.

**Correct behavior:**
- Initial: expenses_budget = 7,000, wants_budget = 3,000
- After 5,500 spent on needs: expenses_budget = 7,000 (STAYS THE SAME)
- After 2,000 spent on wants: wants_budget = 3,000 (STAYS THE SAME)
- Frontend calculates: needs remaining = 7,000 - 5,500 = 1,500 ✓
- Frontend calculates: wants remaining = 3,000 - 2,000 = 1,000 ✓

### Where to Fix
The backend expense creation endpoint (likely in `services.py` or similar)

### Current (Incorrect) Logic
```python
def create_expense(amount, category):
    # WRONG - Don't deduct from budget fields!
    if category == "needs":
        cycle.expenses_budget -= amount  # ❌ WRONG
    else:
        cycle.wants_budget -= amount     # ❌ WRONG
    
    cycle.remaining_budget -= amount
    cycle.save()
```

### Correct Logic
```python
def create_expense(amount, category):
    # expenses_budget and wants_budget should NEVER be modified
    # They represent the ALLOCATED amounts, not remaining
    
    # Only deduct from overall remaining_budget
    cycle.remaining_budget -= amount
    cycle.save()
    
    # The frontend will calculate category remaining as:
    # needs_remaining = expenses_budget - sum(all needs expenses)
    # wants_remaining = wants_budget - sum(all wants expenses)
```

### Data Model Clarification
```python
class MonthCycle:
    expenses_budget: Decimal  # ALLOCATED for needs (constant after income allocation)
    wants_budget: Decimal     # ALLOCATED for wants (constant after income allocation)
    remaining_budget: Decimal # TOTAL remaining to spend (decreases with expenses)
```

### Testing After Fix
1. **Add 10k income**
   - expenses_budget = 7,000
   - wants_budget = 3,000
   - remaining_budget = 10,000

2. **Add 5,500 expense (needs)**
   - expenses_budget = 7,000 (unchanged)
   - wants_budget = 3,000 (unchanged)
   - remaining_budget = 4,500 (10,000 - 5,500)

3. **Add 2,000 expense (wants)**
   - expenses_budget = 7,000 (unchanged)
   - wants_budget = 3,000 (unchanged)
   - remaining_budget = 2,500 (4,500 - 2,000)

4. **Frontend displays:**
   - Needs: Allocated 7,000, Spent 5,500, Remaining 1,500 ✓
   - Wants: Allocated 3,000, Spent 2,000, Remaining 1,000 ✓

### Summary
**DO NOT** modify `expenses_budget` or `wants_budget` when expenses are created. These fields represent allocated amounts and should only be set during income allocation. Only `remaining_budget` should decrease when expenses are added.


---

## Issue 3: Monthly Cycle Reset and Unspent Budget Rollover

### Problem
When a new month starts, unspent budget from the previous month is not being rolled over to `cash_on_hand`.

### Expected Behavior
At the end of each month (or when a new cycle starts):
1. Calculate unspent amounts from previous cycle
2. Roll over unspent budget to `cash_on_hand` in the profile
3. Start new cycle with fresh budgets (7k needs, 3k wants)

### Logic for Month-End Rollover

```python
def close_monthly_cycle(cycle):
    """
    Close the current cycle and roll over unspent budget to cash_on_hand
    """
    # Calculate total expenses for the cycle
    needs_expenses = Expense.objects.filter(
        cycle=cycle, 
        category='needs'
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    wants_expenses = Expense.objects.filter(
        cycle=cycle, 
        category='wants'
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Calculate unspent amounts
    unspent_needs = cycle.expenses_budget - needs_expenses
    unspent_wants = cycle.wants_budget - wants_expenses
    
    # Total unspent budget
    total_unspent = unspent_needs + unspent_wants
    
    # Roll over to cash_on_hand
    if total_unspent > 0:
        profile = cycle.profile
        profile.cash_on_hand += total_unspent
        profile.save()
        
        # Log the rollover
        AllocationLog.objects.create(
            cycle=cycle,
            from_bucket="unspent_budget",
            to_bucket="cash_on_hand",
            amount=total_unspent
        )
    
    # Mark cycle as closed
    cycle.status = 'closed'
    cycle.save()


def create_new_monthly_cycle(profile, income):
    """
    Create a new monthly cycle with fresh budgets
    """
    # Close previous cycle if exists
    previous_cycle = MonthCycle.objects.filter(
        profile=profile,
        status='active'
    ).first()
    
    if previous_cycle:
        close_monthly_cycle(previous_cycle)
    
    # Create new cycle with fresh allocation
    new_cycle = MonthCycle.objects.create(
        profile=profile,
        month=get_current_month(),  # YYYY-MM format
        income=income,
        expenses_budget=income * 0.7,  # 70% for needs
        wants_budget=income * 0.3,     # 30% for wants
        remaining_budget=income,
        status='active'
    )
    
    return new_cycle
```

### Example Flow

**Month 1:**
- Income: 10,000
- Allocated: 7,000 needs + 3,000 wants
- Spent: 5,500 needs + 2,000 wants
- Unspent: 1,500 needs + 1,000 wants = 2,500 total

**End of Month 1:**
- Roll over 2,500 to cash_on_hand
- Close cycle

**Month 2 starts:**
- New income: 10,000
- Fresh allocation: 7,000 needs + 3,000 wants
- Cash on hand: 2,500 (from previous month rollover)
- User can use cash_on_hand for gifts or other discretionary purchases

### When to Trigger Rollover

Option 1: Automatic at month end
```python
# Run as a scheduled task (cron job)
def monthly_rollover_task():
    current_month = get_current_month()
    
    # Find all active cycles from previous month
    previous_cycles = MonthCycle.objects.filter(
        status='active',
        month__lt=current_month
    )
    
    for cycle in previous_cycles:
        close_monthly_cycle(cycle)
```

Option 2: On new income submission
```python
def submit_income(profile, amount):
    # Check if there's an active cycle from a previous month
    active_cycle = MonthCycle.objects.filter(
        profile=profile,
        status='active'
    ).first()
    
    if active_cycle:
        cycle_month = datetime.strptime(active_cycle.month, '%Y-%m')
        current_month = datetime.now().replace(day=1)
        
        # If cycle is from previous month, close it first
        if cycle_month < current_month:
            close_monthly_cycle(active_cycle)
    
    # Create new cycle or add to existing
    return create_or_update_cycle(profile, amount)
```

### Summary
- Each month gets fresh budgets (7k needs, 3k wants)
- Unspent budget rolls over to `cash_on_hand`
- Cash on hand accumulates and can be used for discretionary purchases
- This encourages saving while maintaining monthly budget discipline


---

## Issue 4: Reset Spent Amounts for Current Cycle

### Problem
Need a way to reset spent amounts to ₱0 for the current cycle (delete all expenses in the current cycle).

### Solution
Add a backend endpoint to delete all expenses for the current cycle.

### Backend Implementation

```python
# In views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def reset_cycle_expenses(request):
    """
    Delete all expenses from the current active cycle
    """
    try:
        profile = request.user.financialprofile
        
        # Get current active cycle
        cycle = MonthCycle.objects.filter(
            profile=profile,
            status='active'
        ).first()
        
        if not cycle:
            return Response(
                {"error": "No active cycle found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete all expenses for this cycle
        deleted_count = Expense.objects.filter(cycle=cycle).delete()[0]
        
        # Recalculate remaining_budget (should equal income)
        cycle.remaining_budget = cycle.income
        cycle.save()
        
        return Response({
            "message": f"Reset successful. Deleted {deleted_count} expenses.",
            "cycle": {
                "id": cycle.id,
                "month": cycle.month,
                "income": str(cycle.income),
                "expenses_budget": str(cycle.expenses_budget),
                "wants_budget": str(cycle.wants_budget),
                "remaining_budget": str(cycle.remaining_budget),
            }
        })
        
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Add to urls.py
urlpatterns = [
    # ... existing patterns
    path('cycle/reset-expenses/', reset_cycle_expenses, name='reset-cycle-expenses'),
]
```

### Frontend Implementation

Add the API call:

```typescript
// In langgam-it/apps/web/src/api/cycle.ts
export async function resetCycleExpenses(): Promise<any> {
  const response = await apiClient.post("/cycle/reset-expenses/");
  return response.data;
}
```

Add to the store:

```typescript
// In langgam-it/apps/web/src/store/cycleStore.ts
interface CycleState {
  // ... existing state
  resetExpenses: () => Promise<void>;
}

export const useCycleStore = create<CycleState>((set) => ({
  // ... existing state
  
  resetExpenses: async () => {
    set({ isLoading: true, error: null });
    try {
      await resetCycleExpenses();
      // Refresh current cycle
      const cycle = await getCurrentCycle();
      set({ currentCycle: cycle, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to reset expenses", isLoading: false });
      throw error;
    }
  },
}));
```

Add a button to BudgetPage:

```typescript
// In BudgetPage.tsx
import { useCycleStore } from "../../store/cycleStore";

export default function BudgetPage() {
  const { currentCycle, fetchCurrentCycle, resetExpenses } = useCycleStore();
  const [isResetting, setIsResetting] = useState(false);
  
  async function handleResetExpenses() {
    if (!confirm("Are you sure you want to delete all expenses for this cycle? This cannot be undone.")) {
      return;
    }
    
    setIsResetting(true);
    try {
      await resetExpenses();
      await fetchCurrentCycle();
      alert("Expenses reset successfully!");
    } catch (error) {
      alert("Failed to reset expenses");
    } finally {
      setIsResetting(false);
    }
  }
  
  // Add button in the UI
  return (
    <>
      {/* ... existing code ... */}
      
      <button 
        onClick={handleResetExpenses}
        disabled={isResetting}
        className="budget-btn-danger"
      >
        {isResetting ? "Resetting..." : "Reset All Expenses"}
      </button>
    </>
  );
}
```

### Warning
This will permanently delete all expenses for the current cycle. Use with caution!
