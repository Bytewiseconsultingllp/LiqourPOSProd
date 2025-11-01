# Vendor Stock Field Fix ✅

## Issue
Error: `No vendor stock available for Testing`

Even though vendor stock exists in the database.

## Root Cause
The VendorStock model uses `currentStock` field, but the sales create API was looking for `stockQuantity` field.

## VendorStock Model Schema
```typescript
{
  vendorId: ObjectId,
  productId: ObjectId,
  productName: String,
  brand: String,
  volumeML: Number,
  currentStock: Number,  // ✅ This is the correct field
  lastPurchasePrice: Number,
  lastPurchaseDate: Date,
  organizationId: String
}
```

## Fix Applied

### 1. Query Filter
```typescript
// ❌ Before (Wrong field)
const vendorStocks = await VendorStock.find({
  productId: item.productId,
  stockQuantity: { $gt: 0 },  // Wrong field!
})

// ✅ After (Correct field)
const vendorStocks = await VendorStock.find({
  productId: item.productId,
  currentStock: { $gt: 0 },  // Correct field!
})
```

### 2. Priority Sorting
```typescript
// ❌ Before (Doesn't work with populate)
.sort({ 'vendorId.priority': 1 })

// ✅ After (Manual sort after populate)
vendorStocks.sort((a: any, b: any) => {
  const priorityA = a.vendorId?.priority || 999;
  const priorityB = b.vendorId?.priority || 999;
  return priorityA - priorityB;
});
```

### 3. Stock Calculation
```typescript
// ❌ Before
const totalVendorStock = vendorStocks.reduce((sum, vs) => sum + vs.stockQuantity, 0);

// ✅ After
const totalVendorStock = vendorStocks.reduce((sum, vs: any) => sum + vs.currentStock, 0);
```

### 4. Stock Deduction
```typescript
// ❌ Before
const deductQuantity = Math.min(remainingQuantity, vendorStock.stockQuantity);
await VendorStock.findByIdAndUpdate(
  vendorStock._id,
  { $inc: { stockQuantity: -deductQuantity } },
  { session }
);

// ✅ After
const deductQuantity = Math.min(remainingQuantity, (vendorStock as any).currentStock);
await VendorStock.findByIdAndUpdate(
  vendorStock._id,
  { $inc: { currentStock: -deductQuantity } },
  { session }
);
```

### 5. Vendor ID Access
```typescript
// ❌ Before
assignedVendorId = vendorStock.vendorId._id.toString();

// ✅ After
assignedVendorId = (vendorStock as any).vendorId._id.toString();
```

## Complete Flow

### Stock Validation & Deduction
```
1. Find vendor stocks with currentStock > 0
2. Populate vendorId to get vendor details
3. Sort by vendor priority (1 = highest)
4. Calculate total available stock
5. Validate sufficient stock exists
6. Deduct from vendor stocks by priority
7. Deduct from product stock
8. Create bill record
9. Commit transaction
```

## What This Fixes

✅ **Vendor Stock Query** - Now finds stocks correctly  
✅ **Priority Sorting** - Vendors sorted by priority  
✅ **Stock Calculation** - Uses correct field  
✅ **Stock Deduction** - Decrements currentStock  
✅ **Vendor Assignment** - Assigns highest priority vendor  

## Testing

After this fix, sales creation should work when:

1. **Product has stock** in Product model
2. **Vendor stock exists** with currentStock > 0
3. **Vendor is linked** to the product
4. **Sufficient stock** across all vendors

### Example Scenario
```
Product: Testing
- Product Stock: 100 bottles

Vendor Stocks:
- Vendor A (priority: 1): currentStock = 50
- Vendor B (priority: 2): currentStock = 30

Sale: 60 bottles
Result:
- Deduct 50 from Vendor A (priority 1)
- Deduct 10 from Vendor B (priority 2)
- Deduct 60 from Product
- Assign Vendor A as primary vendor
```

## Files Modified

### `/app/api/sales/create/route.ts`
- Line 217-222: Query filter uses `currentStock`
- Line 228-233: Manual priority sorting
- Line 236: Stock calculation uses `currentStock`
- Line 248: Deduction uses `currentStock`
- Line 253: Update uses `currentStock`
- Line 261: Vendor ID access with type casting

## Status
✅ **FIXED - READY TO TEST**

The vendor stock validation and deduction now use the correct field name (`currentStock`). Sales creation should work when vendor stock is available!
