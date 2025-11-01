# Product Stock Field Compatibility Fix ✅

## Issue
Your Product data uses `currentStock` but the model schema defines `stockQuantity`.

## Your Data Structure
```json
{
  "_id": "6906174e67b158afb12a8ec5",
  "name": "Testing",
  "currentStock": 18,  // ← Your data uses this
  "volumeML": 750,
  // ... other fields
}
```

## Model Schema
```typescript
// Product.ts defines:
stockQuantity: Number  // ← But schema expects this
```

## Fix Applied - Dual Field Support

The sales API now supports BOTH field names for compatibility:

### 1. Stock Validation
```typescript
// Check both fields
const productStock = (product as any).currentStock || 
                     (product as any).stockQuantity || 
                     0;

if (productStock < item.quantity) {
  throw new Error(`Insufficient stock...`);
}
```

### 2. Stock Deduction
```typescript
// Update both fields if they exist
const updateFields: any = {};
if ((product as any).currentStock !== undefined) {
  updateFields.currentStock = -item.quantity;
}
if ((product as any).stockQuantity !== undefined) {
  updateFields.stockQuantity = -item.quantity;
}

await Product.findByIdAndUpdate(
  item.productId,
  { $inc: updateFields },
  { session }
);
```

## Debug Logging Added

The API now logs:
```
📊 Product {name} stock: {amount}
🔍 Looking for vendor stocks for product: {id}
📦 Found {count} vendor stocks
🐛 Debug: Total stocks for product (no session): {count}
🐛 Debug: Stocks data: {json}
```

## What This Fixes

✅ **Works with currentStock** - Your current data structure  
✅ **Works with stockQuantity** - Standard schema field  
✅ **Dual field updates** - Updates whichever field exists  
✅ **Debug logging** - Shows what's happening  

## Testing Steps

1. **Open Browser Console** (F12)
2. **Navigate to Sales Page**
3. **Add product to cart**
4. **Complete checkout**
5. **Check terminal logs** for debug output

### Expected Logs
```
📊 Product Testing stock: 18
🔍 Looking for vendor stocks for product: 6906174e67b158afb12a8ec5
📦 Found 1 vendor stocks
✅ Sale completed successfully
```

### If Still Failing
```
🐛 Debug: Total stocks for product (no session): 1
🐛 Debug: Stocks data: [...]
```

This will show us exactly what's in the database.

## Long-term Solution

You should standardize on ONE field name. Options:

### Option A: Update Data to Match Schema
```javascript
// MongoDB update command
db.products.updateMany(
  { currentStock: { $exists: true } },
  { $rename: { "currentStock": "stockQuantity" } }
);
```

### Option B: Update Schema to Match Data
```typescript
// In Product.ts, change:
stockQuantity: Number
// To:
currentStock: Number
```

## Current Status

✅ **Compatibility mode active** - Works with both fields  
✅ **Debug logging enabled** - Shows what's happening  
✅ **Ready to test** - Try creating a sale now  

The API will now work regardless of which field name your data uses!
