# Promotion Type Field Name Fix

## Problem
Bill validation was failing with error:
```
Error: Bill validation failed: 
appliedPromotions.0.promotionType: Path `promotionType` is required.
```

## Root Cause
There was a mismatch between field names:
- **API Response:** Used `type` field
- **Bill Schema:** Expected `promotionType` field
- **TypeScript Interface:** Used `type` field

## Solution
Standardized all code to use `promotionType` consistently.

## Files Updated

### 1. API Route (`app/api/promotions/apply/route.ts`)
**Changed:**
```typescript
// ❌ Before
applicablePromotions.push({
  promotionId: promotion._id,
  promotionName: promotion.name,
  type: promotion.type,  // Wrong field name
  discountAmount: ...
});

// ✅ After
applicablePromotions.push({
  promotionId: promotion._id,
  promotionName: promotion.name,
  promotionType: promotion.type,  // Correct field name
  discountAmount: ...
});
```

### 2. TypeScript Interface (`types/promotion.ts`)
**Changed:**
```typescript
// ❌ Before
export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  type: string;  // Wrong field name
  discountAmount: number;
}

// ✅ After
export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  promotionType: 'percentage' | 'fixed' | 'buy_x_get_y' | 'bundle';  // Correct
  discountAmount: number;
  description?: string;
}
```

### 3. PromotionsDisplay Component (`app/dashboard/sales/PromotionsDisplay.tsx`)
**Changed:**
- Validation check: `promo.type` → `promo.promotionType`
- Display usage: `promo.type` → `promo.promotionType`

### 4. ShoppingCart Component (`app/dashboard/sales/ShoppingCart.tsx`)
**Changed:**
- Validation check: `promo.type` → `promo.promotionType`

## Validation Added

Both components now validate promotions before using them:

```typescript
const validPromotions = promotions.filter(promo => 
  promo.promotionId && 
  promo.promotionName && 
  promo.promotionType &&  // Must have promotionType
  promo.discountAmount !== undefined
);
```

This ensures:
- Only valid promotions are stored in the bill
- Missing or malformed promotions are filtered out
- Database validation always passes

## Database Schema (No Changes Needed)

The Bill schema was already correct:

```typescript
const AppliedPromotionSchema = new Schema({
  promotionId: { type: String, required: true },
  promotionName: { type: String, required: true },
  promotionType: {  // Correct field name
    type: String,
    enum: ['percentage', 'fixed', 'buy_x_get_y', 'bundle'],
    required: true,
  },
  discountAmount: { type: Number, required: true },
  description: { type: String },
});
```

## Testing

After these changes:
1. ✅ Add items to cart
2. ✅ Promotions should apply automatically
3. ✅ Complete sale
4. ✅ Bill should save successfully
5. ✅ No validation errors

## Data Flow

```
1. Promotion in Database
   { type: 'percentage', ... }
   ↓
2. API Response
   { promotionType: 'percentage', ... }  ← Fixed
   ↓
3. Frontend State
   { promotionType: 'percentage', ... }  ← Fixed
   ↓
4. Bill Creation
   { promotionType: 'percentage', ... }  ← Matches schema
   ↓
5. Database Storage
   ✅ Validation passes
```

## Prevention

To prevent similar issues:

1. **Use TypeScript interfaces** - Catch mismatches at compile time
2. **Validate API responses** - Filter out invalid data
3. **Consistent naming** - Use same field names across stack
4. **Schema validation** - Let Mongoose catch issues early

## Summary

The issue was a simple field name mismatch:
- Changed `type` → `promotionType` in API response
- Updated TypeScript interface to match
- Added validation to filter invalid promotions
- All components now use consistent field names

✅ **Fixed:** Promotions now save correctly in bills
✅ **Fixed:** No more validation errors
✅ **Added:** Data validation at multiple levels
