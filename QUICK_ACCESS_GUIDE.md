# Quick Access Guide - Management Pages

## New Pages Created

### 1. Sales Management
**URL:** `/dashboard/management/sales`
**File:** `app/dashboard/management/sales/page.tsx`

**Features:**
- View all sales bills
- Edit bill items (products, quantities, rates, discounts)
- View detailed bill information
- Search by Bill ID, Customer name, Phone
- Filter by date range
- Automatic stock reversion on edit
- Transaction-safe operations

**Key Actions:**
- 👁️ **View Button** - Opens modal with complete bill details
- ✏️ **Edit Button** - Opens edit modal to modify bill items
- 🔍 **Search** - Real-time search across bills
- 📅 **Date Filters** - Filter bills by date range

---

### 2. Purchase Management
**URL:** `/dashboard/management/purchases`
**File:** `app/dashboard/management/purchases/page.tsx`

**Features:**
- View all purchase orders
- Edit purchase items (products, quantities, prices)
- View detailed purchase information
- Search by Purchase #, Vendor, Invoice
- Filter by date range
- Payment status tracking
- Automatic stock reversion on edit
- Transaction-safe operations

**Key Actions:**
- 👁️ **View Button** - Opens modal with complete purchase details
- ✏️ **Edit Button** - Opens edit modal to modify purchase items
- 🔍 **Search** - Real-time search across purchases
- 📅 **Date Filters** - Filter purchases by date range

---

### 3. Expenses Management
**URL:** `/dashboard/management/expenses`
**File:** `app/dashboard/management/expenses/page.tsx`

**Features:**
- Create, Read, Update, Delete expenses
- Create and manage expense categories
- Track expenses by category
- Multiple payment modes (Cash, Online, Credit, Cheque)
- Transaction ID tracking
- Search and filter capabilities
- Summary dashboard with total expenses
- Transaction-safe operations

**Key Actions:**
- ➕ **Add Expense** - Create new expense entry
- 🏷️ **New Category** - Create expense category
- ✏️ **Edit Button** - Modify existing expense
- 🗑️ **Delete Button** - Remove expense (with confirmation)
- 🔍 **Search** - Search by expense number, category, description
- 📅 **Date Filters** - Filter by date range
- 🏷️ **Category Filter** - Filter by expense category

---

## API Endpoints Created

### Bills API
- `GET /api/bills/[id]` - Fetch single bill
- `PUT /api/bills/[id]` - Update bill (with stock reversion)

### Purchases API
- `GET /api/purchases/[id]` - Fetch single purchase
- `PUT /api/purchases/[id]` - Update purchase (with stock reversion)

### Expenses API
- `GET /api/expenses` - List all expenses (with filters)
- `POST /api/expenses` - Create new expense
- `GET /api/expenses/[id]` - Fetch single expense
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Expense Categories API
- `GET /api/expenses/categories` - List all categories
- `POST /api/expenses/categories` - Create new category

---

## Database Models Created

### Expense Model
**File:** `models/Expense.ts`

```typescript
{
  expenseNumber: string (auto-generated)
  categoryId: ObjectId
  categoryName: string
  amount: number
  description?: string
  expenseDate: Date
  paymentMode: 'Cash' | 'Online' | 'Credit' | 'Cheque'
  transactionId?: string
  receiptUrl?: string
  notes?: string
  organizationId: string
  createdBy: ObjectId
}
```

### ExpenseCategory Model
**File:** `models/Expense.ts`

```typescript
{
  name: string (unique per organization)
  description?: string
  organizationId: string
}
```

---

## Important Validations

### Sales & Purchase Edit Restrictions
Both sales and purchase edit operations validate:
- ❌ **Cannot edit** if transaction date is **before** product's `morningStockLastUpdatedDate`
- ✅ This prevents editing historical transactions that would affect finalized stock counts

### Stock Reversion Logic
When editing bills or purchases:
1. **Revert old stock** - Add/subtract old quantities back
2. **Apply new stock** - Apply new quantities
3. **Update vendor stock** - Keep vendor-specific inventory in sync
4. **All in transaction** - Atomic operation (all or nothing)

---

## Navigation

From the dashboard, you can access these pages through:

1. **Management Menu** → **Sales Management**
2. **Management Menu** → **Purchase Management**
3. **Management Menu** → **Expenses**

Or directly via URLs:
- `http://localhost:3000/dashboard/management/sales`
- `http://localhost:3000/dashboard/management/purchases`
- `http://localhost:3000/dashboard/management/expenses`

---

## Common Operations

### Editing a Bill
1. Navigate to Sales Management
2. Find the bill using search or filters
3. Click **Edit** button
4. Modify quantities, rates, or discounts
5. Remove items if needed (X button)
6. Click **Update Bill**
7. System automatically:
   - Reverts old stock quantities
   - Applies new stock quantities
   - Updates vendor stocks
   - Replaces subbills

### Editing a Purchase
1. Navigate to Purchase Management
2. Find the purchase using search or filters
3. Click **Edit** button
4. Modify quantities, prices, or batch info
5. Update tax amount or paid amount
6. Click **Update Purchase**
7. System automatically:
   - Reverts old stock quantities
   - Applies new stock quantities
   - Updates vendor stocks
   - Recalculates payment status

### Creating an Expense
1. Navigate to Expenses Management
2. Click **Add Expense** button
3. Select category (or create new one)
4. Enter amount and date
5. Choose payment mode
6. Add description and notes (optional)
7. Click **Create Expense**

### Creating Expense Category
1. Navigate to Expenses Management
2. Click **New Category** button
3. Enter category name
4. Add description (optional)
5. Click **Create Category**
6. Category is now available for expense creation

---

## Security Features

✅ **Authentication Required** - All pages require valid access token
✅ **Organization Isolation** - Users only see their organization's data
✅ **Transaction Safety** - All operations wrapped in database transactions
✅ **Input Validation** - All inputs validated before processing
✅ **Error Handling** - Comprehensive error handling with user-friendly messages

---

## Troubleshooting

### "Cannot edit bill/purchase" Error
- **Cause:** Transaction date is before product's morning stock last updated date
- **Solution:** This is by design to prevent editing historical transactions. Contact admin if you need to modify finalized records.

### Stock Discrepancy After Edit
- **Cause:** Transaction failed midway
- **Solution:** All operations are atomic. If you see this, check the error message and retry. The transaction would have been rolled back.

### Category Already Exists
- **Cause:** Trying to create a category with a name that already exists
- **Solution:** Use a different category name or use the existing category

---

## Performance Tips

1. **Use Date Filters** - Narrow down results for faster loading
2. **Use Search** - Find specific records quickly
3. **Category Filters** - For expenses, filter by category for better organization

---

## Future Enhancements (Planned)

- [ ] Bulk edit operations
- [ ] Export to CSV/PDF
- [ ] Expense approval workflow
- [ ] Recurring expenses
- [ ] Analytics and charts
- [ ] Audit logs
- [ ] Email notifications
- [ ] Budget tracking and alerts

---

## Support

For issues or questions:
1. Check the error message displayed
2. Verify your permissions
3. Ensure transaction date is valid
4. Contact system administrator if issue persists

---

**Last Updated:** November 2024
**Version:** 1.0.0
