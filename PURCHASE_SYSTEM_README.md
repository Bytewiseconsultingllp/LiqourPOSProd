# Purchase Entry System - Production Ready

## Overview
A complete, production-level purchase entry system with transaction support, automatic stock updates, and vendor stock management.

## Features Implemented

### ✅ 1. Transaction Support
- **MongoDB Transactions**: All database operations wrapped in transactions
- **Automatic Rollback**: If any error occurs, all changes are rolled back
- **ACID Compliance**: Ensures data consistency across multiple collections

### ✅ 2. Stock Management
- **Product Stock Update**: Automatically increments `currentStock` when purchase is processed
- **Purchase Price History**: Tracks purchase prices with batch numbers and dates
- **Vendor Stock Tracking**: Maintains separate stock records per vendor-product combination

### ✅ 3. Vendor Stock Management
- **Auto-Create**: Creates vendor stock record if it doesn't exist
- **Auto-Update**: Updates existing vendor stock with new quantities
- **Last Purchase Tracking**: Records last purchase price and date

### ✅ 4. Date Flexibility
- **Custom Purchase Date**: Can create purchases for previous dates
- **Date Validation**: Prevents future dates
- **ISO Format**: Proper date handling across frontend and backend

### ✅ 5. Toast Notifications
- **Success Messages**: Green toast for successful operations
- **Error Messages**: Red toast for errors with detailed messages
- **Auto-Dismiss**: Toasts automatically disappear after 5 seconds

## File Structure

```
├── types/
│   └── purchase.ts                    # TypeScript interfaces
├── models/
│   ├── Purchase.ts                    # Purchase MongoDB schema
│   ├── VendorStock.ts                 # Vendor stock MongoDB schema
│   └── Vendor.ts                      # Vendor MongoDB schema
├── app/
│   ├── api/
│   │   └── purchases/
│   │       └── route.ts               # API endpoints with transactions
│   └── dashboard/
│       └── management/
│           └── purchases/
│               └── page.tsx           # Purchase entry UI
└── lib/
    └── services/
        └── purchase-service.ts        # Reusable API service functions
```

## API Endpoints

### POST /api/purchases
Creates a new purchase with transaction support.

**Request Body:**
```json
{
  "vendorId": "vendor_id",
  "purchaseDate": "2024-11-01",
  "items": [
    {
      "productId": "product_id",
      "quantity": 10,
      "purchasePricePerUnit": 500,
      "batchNumber": "BATCH001",
      "expiryDate": "2025-12-31"
    }
  ],
  "taxAmount": 50,
  "paidAmount": 5000,
  "notes": "First purchase",
  "invoiceNumber": "INV-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "purchase_id",
    "purchaseNumber": "PUR-1730476800000-0001",
    "vendorName": "ABC Suppliers",
    "totalAmount": 5050,
    "paymentStatus": "paid",
    ...
  },
  "message": "Purchase created successfully"
}
```

### GET /api/purchases
Fetches all purchases with optional filters.

**Query Parameters:**
- `vendorId`: Filter by vendor
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `paymentStatus`: Filter by payment status (pending/partial/paid)

## Transaction Flow

When a purchase is created:

1. **Start Transaction** → Begin MongoDB session
2. **Validate Vendor** → Check vendor exists
3. **Generate Purchase Number** → Create unique identifier
4. **For Each Item:**
   - Fetch product details
   - Update product stock (`currentStock += quantity`)
   - Add purchase price to history
   - Update/Create vendor stock record
5. **Create Purchase Record** → Save purchase with all details
6. **Commit Transaction** → Save all changes
7. **On Error** → Rollback all changes

## Database Models

### Purchase Schema
```typescript
{
  purchaseNumber: string (unique)
  vendorId: ObjectId
  vendorName: string
  purchaseDate: Date
  items: [
    {
      productId: ObjectId
      productName: string
      brand: string
      volumeML: number
      quantity: number
      purchasePricePerUnit: number
      totalAmount: number
      batchNumber?: string
      expiryDate?: Date
    }
  ]
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentStatus: 'pending' | 'partial' | 'paid'
  paidAmount: number
  dueAmount: number
  notes?: string
  invoiceNumber?: string
  organizationId: string
  createdBy: ObjectId
}
```

### VendorStock Schema
```typescript
{
  vendorId: ObjectId
  productId: ObjectId
  productName: string
  brand: string
  volumeML: number
  currentStock: number
  lastPurchasePrice: number
  lastPurchaseDate: Date
  organizationId: string
}
```

## UI Features

### Purchase Entry Form
- **Vendor Selection**: Dropdown with active vendors
- **Date Picker**: Select purchase date (past dates allowed)
- **Invoice Number**: Optional field for vendor invoice
- **Dynamic Items**: Add/remove items dynamically
- **Product Selection**: Dropdown with product details
- **Quantity & Price**: Input fields with validation
- **Batch Tracking**: Optional batch number per item
- **Real-time Calculations**: Auto-calculate subtotal, tax, total, due
- **Payment Tracking**: Track paid amount and calculate due
- **Notes**: Additional notes field

### Recent Purchases Table
- Shows last 10 purchases
- Displays purchase number, vendor, date, items count, total
- Color-coded payment status badges
- Responsive design

## Error Handling

### Transaction Errors
- All database operations wrapped in try-catch
- Automatic transaction rollback on any error
- Detailed error messages returned to frontend

### Validation Errors
- Vendor existence check
- Product existence check
- Item quantity and price validation
- Minimum one item requirement

### Frontend Validation
- Required field validation
- Positive number validation
- Date range validation
- Empty items check

## Payment Status Logic

```typescript
if (paidAmount >= totalAmount) {
  paymentStatus = 'paid'
} else if (paidAmount > 0) {
  paymentStatus = 'partial'
} else {
  paymentStatus = 'pending'
}
```

## Usage Example

```typescript
// In your component
import { createPurchase } from '@/lib/services/purchase-service';

const handleSubmit = async () => {
  try {
    const purchase = await createPurchase({
      vendorId: 'vendor123',
      purchaseDate: '2024-11-01',
      items: [
        {
          productId: 'prod123',
          quantity: 10,
          purchasePricePerUnit: 500,
        }
      ],
      taxAmount: 50,
      paidAmount: 5000,
    });
    
    console.log('Purchase created:', purchase);
  } catch (error) {
    console.error('Failed to create purchase:', error);
  }
};
```

## Testing Checklist

- [ ] Create purchase with single item
- [ ] Create purchase with multiple items
- [ ] Verify product stock increases
- [ ] Verify vendor stock is created/updated
- [ ] Test with previous date
- [ ] Test transaction rollback on error
- [ ] Test partial payment
- [ ] Test full payment
- [ ] Test with batch numbers
- [ ] Test validation errors

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Organization Isolation**: Multi-tenant support with organization ID
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Prevention**: React auto-escaping

## Performance Optimizations

- **Indexed Fields**: Purchase number, vendor ID, purchase date
- **Compound Indexes**: Organization + date for fast queries
- **Lean Queries**: Use `.lean()` for read-only operations
- **Connection Pooling**: Reuse database connections
- **Batch Operations**: Process multiple items efficiently

## Future Enhancements

1. **Purchase Returns**: Handle product returns
2. **Purchase Editing**: Allow editing pending purchases
3. **PDF Generation**: Generate purchase orders
4. **Email Notifications**: Notify vendors
5. **Purchase Analytics**: Dashboard with charts
6. **Barcode Scanning**: Quick product selection
7. **Multi-Currency**: Support different currencies
8. **Approval Workflow**: Multi-level approvals

## Troubleshooting

### Transaction Fails
- Check MongoDB version (requires 4.0+)
- Ensure replica set is configured
- Verify connection string

### Stock Not Updating
- Check transaction logs
- Verify product ID is correct
- Ensure sufficient permissions

### Vendor Stock Not Created
- Check vendor ID validity
- Verify organization ID matches
- Check unique constraint on vendor-product combination

## Support

For issues or questions, check:
1. Console logs for detailed error messages
2. MongoDB logs for transaction errors
3. Network tab for API response details
