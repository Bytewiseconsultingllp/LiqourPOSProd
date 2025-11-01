# Product to ProductDetails Migration

## Overview
Updated the entire codebase to use `ProductDetails` naming convention instead of `Product` to better reflect the actual schema structure and avoid confusion.

## Changes Made

### 1. Model Updates (`models/Product.ts`)

**Interface Renamed:**
- `IProduct` → `IProductDetails` (with backward compatibility alias)
- Schema renamed: `ProductSchema` → `ProductDetailsSchema`

**New Functions:**
- `getProductDetailsModel()` - Primary function to get ProductDetails model
- `getProductModel()` - Deprecated, kept for backward compatibility

**Schema Structure:**
The ProductDetails schema includes:
- `currentStock` (not `stockQuantity`)
- `volumeML` (not `volume`)
- `pricePerUnit` (not `price`)
- `brand` (required field)
- All ProductDetails interface fields

### 2. Model Registry Updates (`lib/model-registry.ts`)

**Schema Renamed:**
- `ProductSchema` → `ProductDetailsSchema`

**Registration:**
```typescript
registerModelSchema('ProductDetails', ProductDetailsSchema);
registerModelSchema('Product', ProductDetailsSchema); // Backward compatibility
```

**Exports:**
```typescript
export { ProductDetailsSchema, ProductDetailsSchema as ProductSchema };
```

### 3. API Routes Updated

#### `app/api/products/route.ts`
- Changed: `getTenantModel(tenantConnection, 'Product')` 
- To: `getTenantModel(tenantConnection, 'ProductDetails')`
- Updated all variable names from `Product` to `ProductDetails`

#### `app/api/products/[id]/route.ts`
- Changed: `getProductModel()` 
- To: `getProductDetailsModel()`
- Updated all variable names from `Product` to `ProductDetails`

### 4. Sales Route (`app/api/sales/create/route.ts`)
- Already using `getProductModel()` which now returns ProductDetails model
- Uses `currentStock` field correctly
- No changes needed (backward compatible)

## Database Collections

### Current Setup:
- **Collection Name:** `ProductDetails` (primary)
- **Alias:** `Product` (for backward compatibility)

Both names point to the same collection, so existing data is preserved.

## Field Mapping

| Old Field Name | New Field Name | Type |
|---------------|----------------|------|
| `stockQuantity` | `currentStock` | number |
| `volume` | `volumeML` | number |
| `price` | `pricePerUnit` | number |
| - | `brand` | string (required) |
| - | `imageUrl` | string (optional) |
| - | `taxInfo` | object (optional) |
| - | `purchasePricePerUnit` | array (optional) |

## Backward Compatibility

### Maintained For:
1. **Type Alias:** `IProduct` still exists as alias for `IProductDetails`
2. **Function Alias:** `getProductModel()` calls `getProductDetailsModel()`
3. **Model Registration:** Both 'Product' and 'ProductDetails' registered
4. **Exports:** `ProductSchema` exported as alias for `ProductDetailsSchema`

### Migration Path:
- Old code using `Product` will continue to work
- New code should use `ProductDetails`
- Gradual migration recommended
- No database migration needed

## Files Modified

1. ✅ `models/Product.ts`
2. ✅ `lib/model-registry.ts`
3. ✅ `app/api/products/route.ts`
4. ✅ `app/api/products/[id]/route.ts`
5. ✅ `app/api/sales/create/route.ts` (already compatible)

## Testing Checklist

- [ ] Product listing works
- [ ] Product creation works
- [ ] Product update works
- [ ] Product deletion works
- [ ] Sales creation with stock deduction works
- [ ] Inventory transactions work
- [ ] Search and filters work
- [ ] No database errors in console

## Benefits

1. **Clarity:** Name matches the actual TypeScript interface (`ProductDetails`)
2. **Consistency:** Aligns with frontend types in `types/product.ts`
3. **Accuracy:** Reflects the comprehensive nature of the schema
4. **Maintainability:** Easier to understand codebase
5. **Backward Compatible:** No breaking changes

## Next Steps

1. Monitor application for any issues
2. Gradually update remaining references in comments/docs
3. Consider deprecation warnings for old function names
4. Update API documentation if exists

## Notes

- All existing data remains intact
- No database migration required
- Both model names work simultaneously
- Frontend already uses `ProductDetails` type
- Sales page integration already compatible
