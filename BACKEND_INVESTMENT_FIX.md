# Backend Investment Validation Bug Fix

## Problem Summary

The backend is incorrectly validating investment creation, blocking users from adding investments that should be within their transferred budget.

### Error Message
```
Cannot add investment. Total invested (₱252,896.98) exceeds available investment budget. 
Please transfer more funds from savings to increase investment budget.
```

### What's Happening

**User Flow:**
1. User transfers ₱100,000 from savings to investments → `FinancialProfile.investments_total = 100,000`
2. User creates Investment A (USDT) with `total_invested = 100,000` ✓ Works
3. User tries to create Investment B (BTC) with `total_invested = 100,000` ✗ **FAILS with 400 error**

**Why It Fails:**
The backend validation is checking:
```python
# WRONG - Current behavior
if total_invested > profile.investments_total:
    raise ValidationError("exceeds available investment budget")
```

This checks if the NEW investment amount exceeds the TOTAL transferred budget, but it doesn't account for investments already created.

**Correct Logic Should Be:**
```python
# CORRECT - What should happen
available = profile.investments_total - sum_of_existing_investments
if total_invested > available:
    raise ValidationError("exceeds available investment budget")
```

## Root Cause

The Investment serializer's validation method is not calculating the available investment pool correctly. It should:

1. Get `FinancialProfile.investments_total` (total transferred from savings)
2. Calculate sum of all existing `Investment.total_invested` for this user
3. Calculate available: `investments_total - sum_of_existing_investments`
4. Validate: `new_total_invested <= available`

## Files to Fix

### Backend Files
- `api/serializers.py` - InvestmentSerializer
- `api/views.py` - InvestmentListCreateView (if validation is in the view)
- `api/models.py` - Investment model (if there's a save() method with validation)

## Solution

### Step 1: Find the Investment Serializer

Look for `InvestmentSerializer` in `api/serializers.py`. It should look something like:

```python
class InvestmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = ['id', 'name', 'type', 'total_invested', 'current_value', 'profit_loss', 'profit_loss_percentage', 'created_at', 'updated_at']
```

### Step 2: Add Proper Validation

Add or update the `validate_total_invested()` method:

```python
def validate_total_invested(self, value):
    """
    Validate that total_invested doesn't exceed available investment pool.
    
    Available pool = investments_total - sum of all existing investments' total_invested
    """
    request = self.context.get('request')
    if not request or not request.user.is_authenticated:
        return value
    
    try:
        profile = request.user.financialprofile
    except:
        return value
    
    # Calculate already-invested amount
    from django.db.models import Sum
    already_invested = Investment.objects.filter(
        user=request.user
    ).aggregate(total=Sum('total_invested'))['total'] or 0
    
    # Available = transferred funds - already invested
    from decimal import Decimal
    available = Decimal(profile.investments_total) - Decimal(str(already_invested))
    
    if Decimal(str(value)) > available:
        raise serializers.ValidationError(
            f"Investment amount exceeds available investment budget. "
            f"Available: ₱{float(available):,.2f}, Requested: ₱{float(value):,.2f}. "
            f"Please transfer more funds from savings to increase your investment budget."
        )
    
    return value
```

### Step 3: Ensure User Context

Make sure the serializer has access to the request context. In the view:

```python
class InvestmentListCreateView(generics.ListCreateAPIView):
    queryset = Investment.objects.all()
    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request  # Ensure request is in context
        return context
    
    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```

### Step 4: Test the Fix

**Test Case 1: Single Investment**
- Transfer ₱100,000 to investments
- Create Investment with `total_invested = 100,000` ✓ Should work

**Test Case 2: Multiple Investments**
- Transfer ₱100,000 to investments
- Create Investment A with `total_invested = 60,000` ✓ Should work
- Create Investment B with `total_invested = 40,000` ✓ Should work
- Create Investment C with `total_invested = 1,000` ✗ Should fail (exceeds available)

**Test Case 3: Exceed Budget**
- Transfer ₱100,000 to investments
- Create Investment with `total_invested = 150,000` ✗ Should fail

## Frontend Context

The frontend is already correctly calculating and displaying:
- `availableInvestmentPool = profile.investments_total - totalInvested`
- Shows "Available to Invest" card with the remaining budget
- Passes correct data to backend

The frontend error handling now shows:
- The actual backend error message
- A helpful tip to transfer more funds if needed

## Verification

After fixing, verify:

1. ✓ User can add multiple investments up to their transferred budget
2. ✓ User cannot exceed their transferred budget
3. ✓ Error message clearly states available vs requested amount
4. ✓ Frontend "Available to Invest" card matches backend validation
5. ✓ After adding investment, profile.sync_investments_total() updates correctly

## Related Code

**Frontend Investment Page:**
- `apps/web/src/pages/user/InvestmentsPage.tsx` - Shows available pool
- `apps/web/src/components/AddInvestmentModal.tsx` - Submits investment with error handling
- `apps/web/src/store/investmentStore.ts` - Calls backend API

**Frontend API:**
- `apps/web/src/api/investment.ts` - Logs full error response for debugging

**Backend Endpoints:**
- `POST /api/investments/` - Create investment (needs fix)
- `GET /api/investments/` - List investments
- `PATCH /api/investments/<id>/` - Update investment
- `DELETE /api/investments/<id>/` - Delete investment

## Notes

- The fix should be in the serializer's `validate_total_invested()` method
- Make sure to import `Sum` from `django.db.models`
- Use `Decimal` for accurate financial calculations
- The error message should be clear and actionable
- After creation, `profile.sync_investments_total()` should be called to update the profile
