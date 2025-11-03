# Discount Validation Implementation

## Overview
Implemented comprehensive discount validation to ensure total discounts (item + bill + promotion) don't exceed the customer's `maxDiscountPercentage`.

## Validation Rules

### 1. **Item Discount (Per Bottle)**
- **Location**: `QuantityDialog.tsx`
- **Rule**: Discount per bottle ≤ `(pricePerUnit × maxDiscountPercentage) / 100`
- **Validation**: Real-time when user enters discount
- **UI Indicator**: Shows max allowed discount in orange badge

### 2. **Bill Discount (Additional)**
- **Location**: `ShoppingCart.tsx`
- **Rule**: `itemDiscounts + billDiscount + promotionDiscount ≤ (subtotal × maxDiscountPercentage) / 100`
- **Validation**: 
  - Real-time when entering bill discount
  - Final check before completing sale
- **UI Indicator**: Shows remaining discount allowed

### 3. **Total Discount Check**
- **Location**: `ShoppingCart.tsx` → `handleComplete()`
- **Rule**: Validates total discount percentage before sale completion
- **Error Message**: Shows actual vs allowed percentage

## Implementation Details

### ShoppingCart.tsx Changes

```typescript
// Calculate max allowed discount
const maxAllowedDiscount = customer && customer.maxDiscountPercentage 
  ? (subtotal * customer.maxDiscountPercentage) / 100 
  : subtotal;

// Calculate total discount
const totalDiscount = itemDiscounts + billDiscount + promotionDiscount;
const totalDiscountPercentage = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;

// Calculate remaining discount for bill
const remainingDiscountAllowed = Math.max(0, maxAllowedDiscount - itemDiscounts - promotionDiscount);
```

### Validation Points

1. **On Bill Discount Input**:
   ```typescript
   if (newTotalDiscount > maxAllowedDiscount) {
     toast.error(
       `Total discount (item + bill) cannot exceed ${customer?.maxDiscountPercentage}%. ` +
       `Item discounts: ₹${itemDiscounts.toFixed(2)}, Remaining: ₹${remainingDiscountAllowed.toFixed(2)}`
     );
     setBillDiscount(remainingDiscountAllowed);
   }
   ```

2. **On Sale Completion**:
   ```typescript
   if (totalDiscount > maxAllowedDiscount) {
     toast.error(
       `Total discount (${totalDiscountPercentage.toFixed(1)}%) exceeds customer's maximum allowed discount (${customer?.maxDiscountPercentage}%)`
     );
     return;
   }
   ```

## UI Indicators

### QuantityDialog (Item Discount)
```
Discount per Bottle (₹)     [Max: 10% (₹50.00)]
```

### ShoppingCart (Bill Discount)
```
Additional Discount (₹)     [Max: 10% | Remaining: ₹120.50]
```

## Example Scenarios

### Scenario 1: Customer with 10% max discount
- Subtotal: ₹1000
- Max allowed: ₹100
- Item discounts: ₹60
- **Remaining for bill discount**: ₹40
- If user tries to enter ₹50 bill discount → Auto-capped to ₹40

### Scenario 2: Multiple items with discounts
- Item 1: ₹500 × 2 bottles, ₹20/bottle discount = ₹40 total
- Item 2: ₹300 × 1 bottle, ₹10/bottle discount = ₹10 total
- Subtotal: ₹1300
- Item discounts: ₹50
- Max (10%): ₹130
- **Remaining for bill**: ₹80

### Scenario 3: With Promotions
- Subtotal: ₹2000
- Item discounts: ₹100
- Promotion discount: ₹50
- Max (15%): ₹300
- **Remaining for bill**: ₹150

## Error Messages

1. **Item Discount Exceeded**:
   > "Discount per bottle cannot exceed 10% (₹50.00)"

2. **Bill Discount Exceeded**:
   > "Total discount (item + bill) cannot exceed 10%. Item discounts: ₹60.00, Remaining: ₹40.00"

3. **Final Validation Failed**:
   > "Total discount (12.5%) exceeds customer's maximum allowed discount (10%)"

## Testing Checklist

- [ ] Item discount validation per bottle
- [ ] Bill discount validation with existing item discounts
- [ ] Combined validation with promotions
- [ ] Walk-in customer (no limit)
- [ ] Customer with no maxDiscountPercentage set
- [ ] Customer with 100% maxDiscountPercentage
- [ ] Edge case: Exactly at limit
- [ ] Edge case: Multiple items with varying discounts

## Notes

- **Walk-in customers**: No discount limit (maxDiscountPercentage defaults to 100%)
- **Customers without limit**: Can apply any discount
- **Promotion discounts**: Counted towards total discount limit
- **Rounding**: Grand total is rounded, but discount validation uses precise values
- **UI feedback**: Real-time validation with toast messages and auto-capping
