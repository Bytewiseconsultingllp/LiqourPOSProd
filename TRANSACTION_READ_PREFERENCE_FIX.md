# MongoDB Transaction Read Preference Fix

## Issue
When using MongoDB transactions with Mongoose, queries must use `readPreference: 'primary'` instead of the default `'primaryPreferred'`. This error was occurring in all API routes that use transactions:

```
MongoTransactionError: Read preference in a transaction must be primary, not: primaryPreferred
```

## Root Cause
MongoDB requires that all read operations within a transaction must be performed against the primary node to ensure consistency. The default read preference of `'primaryPreferred'` is not allowed within transactions.

## Solution
Added `.read('primary')` to all `findOne()` and `countDocuments()` queries that are executed within a transaction session.

## Files Fixed

### 1. Purchase Creation API
**File:** `app/api/purchases/route.ts`

Fixed queries:
- Vendor lookup: `Vendor.findOne().session(session).read('primary')`
- Purchase count: `Purchase.countDocuments().session(session).read('primary')`
- Product lookup: `Product.findOne().session(session).read('primary')`
- Vendor stock lookup: `VendorStock.findOne().session(session).read('primary')`

### 2. Bill Edit API
**File:** `app/api/bills/[id]/route.ts`

Fixed queries:
- Existing bill lookup: `Bill.findOne().session(session).read('primary')`
- Product validation: `Product.findOne().session(session).read('primary')`
- Product lookup for new items: `Product.findOne().session(session).read('primary')`
- Vendor stock check: `VendorStock.findOne().session(session).read('primary')`

### 3. Purchase Edit API
**File:** `app/api/purchases/[id]/route.ts`

Fixed queries:
- Existing purchase lookup: `Purchase.findOne().session(session).read('primary')`
- Product validation: `Product.findOne().session(session).read('primary')`
- Product lookup for new items: `Product.findOne().session(session).read('primary')`
- Vendor stock lookup: `VendorStock.findOne().session(session).read('primary')`

### 4. Expense Creation API
**File:** `app/api/expenses/route.ts`

Fixed queries:
- Expense count: `Expense.countDocuments().session(session).read('primary')`

### 5. Expense Edit API
**File:** `app/api/expenses/[id]/route.ts`

Fixed queries:
- Existing expense lookup: `Expense.findOne().session(session).read('primary')`
- Expense lookup for delete: `Expense.findOne().session(session).read('primary')`

### 6. Expense Category Creation API
**File:** `app/api/expenses/categories/route.ts`

Fixed queries:
- Existing category check: `ExpenseCategory.findOne().session(session).read('primary')`

### 7. Sales Creation API
**File:** `app/api/sales/create/route.ts`

Fixed queries:
- Product lookup: `ProductDetails.findById().session(session).read('primary')`
- Vendor stocks lookup: `VendorStock.find().populate().session(session).read('primary')`

## Pattern to Follow

When using MongoDB transactions with Mongoose, always use this pattern:

```typescript
// ❌ WRONG - Will cause transaction error
const doc = await Model.findOne({ ... }).session(session);

// ✅ CORRECT - Explicitly set read preference to primary
const doc = await Model.findOne({ ... }).session(session).read('primary');
```

## Why This Matters

1. **Data Consistency:** Reading from primary ensures you're reading the most up-to-date data within the transaction
2. **Transaction Isolation:** Prevents reading stale data from secondary nodes during a transaction
3. **ACID Compliance:** Maintains atomicity, consistency, isolation, and durability guarantees

## Testing

After this fix, all transaction-based operations should work correctly:
- ✅ Creating sales/bills
- ✅ Creating purchases
- ✅ Editing bills
- ✅ Editing purchases
- ✅ Creating expenses
- ✅ Editing expenses
- ✅ Deleting expenses
- ✅ Creating expense categories

## Additional Notes

- Update operations (`findByIdAndUpdate`, `findOneAndUpdate`) don't require `.read('primary')` as they implicitly use primary
- Only read operations (`findOne`, `find`, `countDocuments`) within transactions need this fix
- This is a MongoDB requirement, not a Mongoose limitation

## Related Documentation

- [MongoDB Transactions Read Preference](https://docs.mongodb.com/manual/core/read-preference/#read-preference-and-transactions)
- [Mongoose Transactions](https://mongoosejs.com/docs/transactions.html)

---

**Status:** ✅ Fixed
**Date:** November 2024
**Impact:** All transaction-based API routes now work correctly
