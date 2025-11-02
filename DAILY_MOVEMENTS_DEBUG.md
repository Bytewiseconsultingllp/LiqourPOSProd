# Daily Movements API - Empty Response Debug

## Issue
```json
{
  "success": true,
  "date": null,
  "sales": [],
  "purchases": []
}
```

## Root Cause

The API is returning empty because there are **no InventoryTransaction records** in the database for the date range.

## How Inventory Transactions Are Created

### Sales
When a bill is created, inventory transactions should be created:

```typescript
// In sales/bill creation
for (const item of billItems) {
  await InventoryTransaction.create({
    productId: item.productId,
    transactionType: 'sale',
    quantity: -item.quantity, // Negative for sales
    pricePerUnit: item.pricePerUnit,
    billId: bill._id,
    createdAt: new Date(),
  });
}
```

### Purchases
When a purchase is created:

```typescript
// In purchase creation
for (const item of purchaseItems) {
  await InventoryTransaction.create({
    productId: item.productId,
    transactionType: 'purchase',
    quantity: item.quantity, // Positive for purchases
    pricePerUnit: item.pricePerUnit,
    vendorId: vendor._id,
    createdAt: new Date(),
  });
}
```

## Alternative: Query Bills Directly

If inventory transactions aren't being created, we can query Bills directly:

### Option 1: Query Bills Collection

```typescript
// Get sales from bills
const bills = await Bill.find({
  createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
  billType: { $ne: 'discrepancy' }, // Exclude discrepancy bills
});

// Aggregate items
const salesMap = new Map();
bills.forEach(bill => {
  bill.items.forEach(item => {
    const current = salesMap.get(item.productId) || 0;
    salesMap.set(item.productId, current + item.quantity);
  });
});

const sales = Array.from(salesMap.entries()).map(([productId, quantity]) => ({
  productId,
  quantity,
}));
```

### Option 2: Use Bill Aggregation

```typescript
const sales = await Bill.aggregate([
  {
    $match: {
      createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
      billType: { $ne: 'discrepancy_main' },
    },
  },
  {
    $unwind: '$items',
  },
  {
    $group: {
      _id: '$items.productId',
      quantity: { $sum: '$items.quantity' },
    },
  },
  {
    $project: {
      productId: '$_id',
      quantity: 1,
      _id: 0,
    },
  },
]);
```

## Quick Fix: Update Daily Movements API

Let me update the API to query Bills if InventoryTransactions are empty:

```typescript
// Try InventoryTransaction first
let sales = await InventoryTransaction.aggregate([...]);

// If empty, try Bills
if (sales.length === 0) {
  sales = await Bill.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
        billType: { $nin: ['discrepancy_main', 'discrepancy_sub'] },
      },
    },
    {
      $unwind: '$items',
    },
    {
      $group: {
        _id: '$items.productId',
        quantity: { $sum: '$items.quantity' },
      },
    },
    {
      $project: {
        productId: '$_id',
        quantity: 1,
        _id: 0,
      },
    },
  ]);
}
```

## Debug Steps

### 1. Check if you have any bills
```javascript
db.bills.find().count()
```

### 2. Check if you have inventory transactions
```javascript
db.inventorytransactions.find().count()
```

### 3. Check date range
Look at the console logs:
```
📊 Daily Movements Query: {
  fromDate: '2025-11-01',
  toDate: '2025-11-02',
  startOfPeriod: '2025-11-01T04:00:00.000Z',
  endOfPeriod: '2025-11-03T03:59:59.999Z'
}
```

### 4. Check if bills exist in that range
```javascript
db.bills.find({
  createdAt: {
    $gte: ISODate("2025-11-01T04:00:00.000Z"),
    $lte: ISODate("2025-11-03T03:59:59.999Z")
  }
}).count()
```

## Recommended Solution

Update the daily movements API to use Bills as the source of truth since that's what you're actually creating.

Would you like me to:
1. Update the API to query Bills instead of InventoryTransactions?
2. Or add InventoryTransaction creation to your sales/purchase flows?

Let me know which approach you prefer!
