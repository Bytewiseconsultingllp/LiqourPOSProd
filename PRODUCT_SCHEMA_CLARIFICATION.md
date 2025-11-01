# Product Schema Structure - Final Clarification

## Overview
This document clarifies the product schema structure to eliminate confusion between "Product" and "ProductDetails".

## The Solution

### ✅ Code Structure (TypeScript)
- **Interface Name:** `IProductDetails`
- **Schema Name:** `ProductDetailsSchema`
- **Variable Name in Code:** `ProductDetails`
- **Function Name:** `getProductDetailsModel()`

### ✅ Database Structure (MongoDB)
- **Collection Name:** `products` (from model name 'Product')
- **Model Registration:** `'Product'`

## Key Principle

```typescript
// In Code: Use ProductDetails (descriptive, accurate)
const ProductDetails = getTenantModel(connection, 'Product');

// In Database: Stored as 'Product' collection
// MongoDB Collection: 'products'
```

## Why This Approach?

1. **Code Clarity:** `ProductDetails` accurately describes the comprehensive schema
2. **Database Simplicity:** Single `products` collection, no confusion
3. **Type Safety:** TypeScript interface matches actual schema structure
4. **Backward Compatible:** Existing data and queries work without migration

## File Structure

### `models/Product.ts`
```typescript
export interface IProductDetails {
  // All product fields including currentStock, volumeML, etc.
}

export const ProductDetailsSchema = new Schema<IProductDetails>({ ... });

export function getProductDetailsModel(connection: Connection): Model<IProductDetails> {
  return connection.model<IProductDetails>('Product', ProductDetailsSchema);
  // ↑ Uses 'Product' as model name → creates 'products' collection
}
```

### `lib/model-registry.ts`
```typescript
export function registerAllModels() {
  registerModelSchema('Product', ProductDetailsSchema);
  // ↑ Registers as 'Product' in database
}
```

### `app/api/products/route.ts`
```typescript
// Variable name is ProductDetails for clarity
const ProductDetails = getTenantModel(tenantConnection, 'Product');
//                                                       ↑
//                                    Model name in database

// Use it like this:
const products = await ProductDetails.find(query);
const product = await ProductDetails.create(data);
```

## Schema Fields (ProductDetails)

```typescript
{
  name: string;
  brand: string;              // Required
  category: string;           // Required
  currentStock: number;       // NOT stockQuantity
  volumeML: number;           // NOT volume
  pricePerUnit: number;       // NOT price
  purchasePricePerUnit: [];   // Array of purchase prices
  taxInfo: {                  // Tax information
    vat?: number;
    tcs?: number;
    gst?: number;
    cess?: number;
  };
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  reorderLevel?: number;
  morningStock?: number;
  eveningStock?: number;
  batchNumber?: string;
  expiryDate?: Date;
  bottlesPerCaret?: number;
  noOfCarets?: number;
  isActive: boolean;
  location?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### ✅ Correct Usage

```typescript
// Import
import { getProductDetailsModel, IProductDetails } from '@/models/Product';

// Get model (registered as 'Product' in DB)
const ProductDetails = getTenantModel(connection, 'Product');

// Query
const products = await ProductDetails.find({ isActive: true });

// Create
const product = await ProductDetails.create({
  name: 'Whiskey',
  brand: 'Jack Daniels',
  category: 'Whiskey',
  currentStock: 100,
  volumeML: 750,
  pricePerUnit: 2500,
  organizationId: 'org123'
});

// Update
await ProductDetails.findByIdAndUpdate(id, {
  currentStock: 95
});
```

### ❌ Avoid This

```typescript
// Don't use 'ProductDetails' as model name in getTenantModel
const Product = getTenantModel(connection, 'ProductDetails'); // ❌ Wrong

// Don't mix naming conventions
const Product = getTenantModel(connection, 'Product'); // ⚠️ Confusing variable name
```

## Database Collections

```
MongoDB Database: tenant_xxxxx
├── users
├── products          ← ProductDetails schema stored here
├── sales
├── customers
├── vendors
└── inventorytransactions
```

## Migration Notes

- ✅ No database migration needed
- ✅ Existing `products` collection works as-is
- ✅ All existing data preserved
- ✅ No breaking changes to API

## Summary

| Aspect | Name |
|--------|------|
| TypeScript Interface | `IProductDetails` |
| Mongoose Schema | `ProductDetailsSchema` |
| Variable in Code | `ProductDetails` |
| Model Name (DB) | `'Product'` |
| Collection Name (MongoDB) | `products` |
| API Endpoints | `/api/products` |

## Benefits

1. **Clear Code:** Variable name `ProductDetails` indicates comprehensive schema
2. **Simple DB:** Single `products` collection, no duplicates
3. **Type Safe:** Interface matches actual schema structure
4. **Consistent:** All files follow same pattern
5. **Maintainable:** Easy to understand and modify

## Testing

After these changes, verify:
- [ ] Products API returns data correctly
- [ ] Product creation works
- [ ] Product updates work
- [ ] Sales page can access product data
- [ ] Stock deduction uses `currentStock` field
- [ ] No duplicate collections in MongoDB
- [ ] Console shows "Registered model: Product" (not ProductDetails)
