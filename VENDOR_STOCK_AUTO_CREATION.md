# Vendor Stock Auto-Creation Feature

## Overview
Automatically creates vendor stock entries when products are created (both single and bulk upload), ensuring inventory is tracked at both product and vendor levels.

## Key Features

### 🎯 Automatic Vendor Stock Creation
When a product is created:
1. ✅ **Product stock** is set to `currentStock` value
2. ✅ **Vendor stock** is automatically created for the **priority 1 vendor**
3. ✅ **Inventory transaction** is logged for audit trail

### 🔄 Duplicate Handling (Bulk Upload)
- **Existing products**: Skipped (not updated)
- **New products**: Created with vendor stock
- **Clear feedback**: Shows created/skipped/failed counts

## How It Works

### Single Product Creation
**Location**: Products Management → Add Product

1. User fills product form
2. Clicks "Save"
3. System:
   - Creates product with `currentStock`
   - Finds vendor with `vendorPriority = 1`
   - Creates vendor stock entry with same stock quantity
   - Logs inventory transaction

### Bulk Upload
**Location**: Products Management → Bulk Upload

1. User uploads Excel file
2. For each row:
   - **If product exists**: Skip (show in "Skipped" count)
   - **If product is new**: Create product + vendor stock
3. Results show: Created, Skipped, Failed

## Vendor Priority System

### Priority 1 Vendor
- The system looks for a vendor with `vendorPriority = 1`
- If multiple exist, uses the oldest (by `createdAt`)
- Must be `isActive = true`

### No Priority 1 Vendor
- Product is still created successfully
- Vendor stock creation is skipped
- Warning logged in console
- User can manually create vendor stock later

## Technical Implementation

### Files Modified

#### 1. `app/api/products/route.ts` (Single Product)
```typescript
// After creating product...

// Find priority 1 vendor
const Vendor = getVendorModel(tenantConnection);
const priority1Vendor = await Vendor.findOne({
  organizationId: user.organizationId,
  vendorPriority: 1,
  isActive: true,
}).sort({ createdAt: 1 });

// Create vendor stock
if (priority1Vendor) {
  const VendorStock = getVendorStockModel(tenantConnection);
  await VendorStock.create({
    vendorId: priority1Vendor._id,
    productId: product._id,
    productName: product.name,
    brand: product.brand,
    volumeML: product.volumeML,
    currentStock: validation.data.currentStock || 0,
    lastPurchasePrice: validation.data.pricePerUnit || 0,
    lastPurchaseDate: new Date(),
    organizationId: user.organizationId,
  });
}
```

#### 2. `app/api/products/bulk-upload/route.ts` (Bulk Upload)
```typescript
// Find priority 1 vendor once (optimization)
const priority1Vendor = await Vendor.findOne({
  organizationId: user.organizationId,
  vendorPriority: 1,
  isActive: true,
}).sort({ createdAt: 1 });

// For each product...
const existingProduct = await Product.findOne({
  name: productData.name,
  organizationId: user.organizationId,
});

if (existingProduct) {
  results.skipped++;
  results.errors.push(`Row ${i + 1}: Product "${productData.name}" already exists - skipped`);
  continue; // Skip, don't update
}

// Create product + vendor stock...
```

#### 3. `app/dashboard/management/products/page.tsx` (UI)
Updated results display:
```typescript
✅ Successfully created: 45 products
⏭️ Skipped (already exists): 5 products
❌ Failed: 2 products
```

## Data Flow

### Product Creation Flow
```
User Input
    ↓
Create Product
    ↓
Log Inventory Transaction
    ↓
Find Priority 1 Vendor
    ↓
Create Vendor Stock (if vendor exists)
    ↓
Return Success
```

### Bulk Upload Flow
```
Excel File
    ↓
Parse Products
    ↓
For Each Product:
    ├─ Check if exists → Skip
    ├─ Validate fields → Fail or Continue
    ├─ Create Product
    ├─ Log Transaction
    └─ Create Vendor Stock
    ↓
Return Summary (Created/Skipped/Failed)
```

## Vendor Stock Schema

```typescript
{
  vendorId: ObjectId,           // Reference to vendor
  productId: ObjectId,          // Reference to product
  productName: string,          // Denormalized for quick access
  brand: string,                // Denormalized
  volumeML: number,             // Denormalized
  currentStock: number,         // Vendor's stock quantity
  lastPurchasePrice: number,    // Last purchase price
  lastPurchaseDate: Date,       // Last purchase date
  organizationId: string,       // Tenant isolation
  createdAt: Date,
  updatedAt: Date
}
```

## Inventory Transaction Schema

```typescript
{
  productId: ObjectId,
  type: 'adjustment',
  quantity: number,             // Stock added
  previousStock: 0,             // Always 0 for new products
  newStock: number,             // Same as currentStock
  reason: 'Initial stock' | 'Initial stock (bulk upload)',
  performedBy: userId,
  organizationId: string,
  createdAt: Date
}
```

## Benefits

### 1. **Consistency**
- Product stock and vendor stock always in sync at creation
- No manual vendor stock entry needed

### 2. **Audit Trail**
- Every stock creation is logged
- Can track who created what and when

### 3. **Multi-Vendor Support**
- Uses priority system to determine default vendor
- Can add more vendors later

### 4. **Bulk Efficiency**
- Finds priority 1 vendor once, not per product
- Skips duplicates instead of failing entire upload

### 5. **Graceful Degradation**
- Product creation succeeds even if vendor stock fails
- Clear error messages for troubleshooting

## Usage Examples

### Example 1: Single Product Creation
```
Input:
- Product Name: Whisky 750ml
- Current Stock: 50
- Price: 1500

Result:
✅ Product created with stock: 50
✅ Vendor stock created for "ABC Distributors" (Priority 1): 50
✅ Inventory transaction logged
```

### Example 2: Bulk Upload (New Products)
```
Excel File: 100 products

Result:
✅ Successfully created: 95 products
⏭️ Skipped (already exists): 3 products
❌ Failed: 2 products (missing required fields)

All 95 new products have vendor stock entries
```

### Example 3: Bulk Upload (All Duplicates)
```
Excel File: 50 products (all exist)

Result:
✅ Successfully created: 0 products
⏭️ Skipped (already exists): 50 products
❌ Failed: 0 products

No changes made to existing products
```

## Error Handling

### Scenarios

#### 1. No Priority 1 Vendor
```
Product: ✅ Created
Vendor Stock: ⚠️ Skipped
Console: "⚠️ No priority 1 vendor found, skipping vendor stock creation"
```

#### 2. Vendor Stock Creation Fails
```
Product: ✅ Created
Vendor Stock: ❌ Failed
Console: "Error creating vendor stock: [error details]"
Result: Product creation succeeds anyway
```

#### 3. Duplicate Product (Bulk Upload)
```
Product: ⏭️ Skipped
Vendor Stock: ⏭️ Not attempted
Message: "Row 5: Product 'Whisky 750ml' already exists - skipped"
```

## Best Practices

### For Administrators
1. **Set Priority 1 Vendor**: Ensure at least one vendor has `vendorPriority = 1`
2. **Keep Vendor Active**: Priority 1 vendor must be `isActive = true`
3. **Review Skipped Products**: Check bulk upload results for duplicates

### For Users
1. **Check Existing Products**: Before bulk upload, verify product names
2. **Use Consistent Naming**: Avoid duplicate product names
3. **Review Results**: Always check upload summary

### For Developers
1. **Don't Fail Product Creation**: Vendor stock is secondary
2. **Log Errors**: Always log vendor stock failures
3. **Optimize Bulk Operations**: Find vendor once, not per product
4. **Validate Before Create**: Check duplicates early

## Troubleshooting

### "No vendor stock created"
**Cause**: No priority 1 vendor found  
**Solution**: Create a vendor with `vendorPriority = 1` and `isActive = true`

### "Bulk upload skipped all products"
**Cause**: All products already exist  
**Solution**: This is expected behavior - duplicates are skipped

### "Vendor stock creation failed"
**Cause**: Database constraint violation or connection issue  
**Solution**: Check logs, verify vendor exists, check database connection

### "Product created but no vendor stock"
**Cause**: Vendor stock creation failed (non-critical)  
**Solution**: Manually create vendor stock or check vendor configuration

## Future Enhancements

- [ ] Support multiple default vendors (priority 1, 2, 3)
- [ ] Distribute stock across multiple vendors
- [ ] Update existing products in bulk upload (optional flag)
- [ ] Vendor stock allocation rules (by category, brand, etc.)
- [ ] Automatic reorder from priority vendors
- [ ] Vendor performance tracking

## Database Indexes

### VendorStock Collection
```javascript
// Unique constraint
{ vendorId: 1, productId: 1, organizationId: 1 } - unique

// Query optimization
{ vendorId: 1, organizationId: 1 }
{ productId: 1, organizationId: 1 }
```

## API Responses

### Single Product Creation
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "...",
    "name": "Whisky 750ml",
    "currentStock": 50,
    ...
  }
}
```

### Bulk Upload
```json
{
  "success": true,
  "message": "Bulk upload completed. 45 created, 3 skipped, 2 failed.",
  "results": {
    "success": 45,
    "skipped": 3,
    "failed": 2,
    "errors": [
      "Row 5: Product 'Vodka 1L' already exists - skipped",
      "Row 12: Missing required fields"
    ],
    "createdProducts": [...]
  }
}
```

---

**Created**: November 3, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
