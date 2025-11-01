# Sales Route Update - ProductDetails Integration

## Changes Made

Updated the sales/create route to use the new ProductDetails model pattern for consistency with the rest of the application.

## Files Modified

### `app/api/sales/create/route.ts`

**Imports Updated:**
```typescript
// OLD
import { getProductModel } from '@/models/Product';

// NEW
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';
import { getProductDetailsModel } from '@/models/Product';
```

**Model Initialization:**
```typescript
// OLD
const Product = getProductModel(connection);

// NEW
registerAllModels(); // Ensure schemas are registered
const ProductDetails = getTenantModel(connection, 'Product');
```

**Usage Throughout File:**
```typescript
// OLD
const product = await Product.findById(item.productId);
await Product.findByIdAndUpdate(...);

// NEW
const product = await ProductDetails.findById(item.productId);
await ProductDetails.findByIdAndUpdate(...);
```

## Why These Changes?

1. **Consistency:** All routes now use the same pattern
2. **Clarity:** `ProductDetails` variable name is more descriptive
3. **Reliability:** Uses the centralized model registration system
4. **Type Safety:** Better TypeScript support with `getTenantModel`

## Schema Fields Used

The sales route correctly uses ProductDetails schema fields:
- ✅ `currentStock` (not `stockQuantity`)
- ✅ `volumeML` (for volume calculations)
- ✅ `pricePerUnit` (for pricing)
- ✅ All other ProductDetails fields

## Database Collection

- **Collection Name:** `products` (from 'Product' model registration)
- **Variable Name:** `ProductDetails` (for code clarity)
- **Schema:** `ProductDetailsSchema` (comprehensive product schema)

## Testing Checklist

After these changes, verify:
- [ ] Sales creation works correctly
- [ ] Stock deduction happens properly
- [ ] Product stock validation works
- [ ] Vendor stock assignment works
- [ ] Transaction rollback works on errors
- [ ] Bill generation completes successfully

## Related Files

- `app/api/sales/create/route.ts` - Sales creation endpoint
- `models/Product.ts` - ProductDetails model definition
- `lib/tenant-db.ts` - Tenant connection management
- `lib/model-registry.ts` - Schema registration

## Summary

The sales route now uses:
- ✅ `ProductDetails` variable (descriptive)
- ✅ `'Product'` collection name (database)
- ✅ `currentStock` field (correct schema)
- ✅ `getTenantModel()` pattern (consistent)
- ✅ `registerAllModels()` call (safe)
