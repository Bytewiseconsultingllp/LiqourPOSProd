# B2B Sales Implementation

## Overview
Created a complete B2B sales page that uses **purchase prices** instead of selling prices, with VAT and TCS calculations displayed but not saved to the database.

## Key Features

### 1. Purchase Price Based Sales
- Uses `purchasePricePerUnit` from product schema
- Automatically selects the latest purchase price (sorted by `effectiveFrom` date)
- Falls back to `pricePerUnit` if no purchase price exists

### 2. Tax Calculations (Display Only)
- **VAT**: 35% of subtotal
  - Formula: `vatAmount = subtotal * 0.35`
- **TCS**: 1% of (subtotal + VAT)
  - Formula: `tcsAmount = (subtotal * 1.35) * 0.01`
- **Grand Total**: `subtotal + VAT + TCS`

### 3. No Discounts or Promotions
- Item discounts: **Disabled**
- Bill discounts: **Disabled**
- Promotions: **Not applied**
- All discount fields set to 0 in the bill

### 4. Same Bill Schema
- Uses the existing Bill schema from `/models/Bill.ts`
- Sets all discount fields to 0:
  - `totalDiscountAmount: 0`
  - `itemDiscountAmount: 0`
  - `billDiscountAmount: 0`
  - `promotionDiscountAmount: 0`
  - `appliedPromotions: []`

## Files Created

### 1. `/app/dashboard/b2b-sales/page.tsx`
Main B2B sales page component with:
- Product selection with purchase price display
- Customer selection
- Cart management
- Bill creation using `/api/bills` endpoint
- Recent sales table
- Bill viewing and printing

### 2. `/app/dashboard/b2b-sales/B2BQuantityDialog.tsx`
Quantity selection dialog with:
- Purchase price display
- Vendor selection (from purchase price records)
- Stock validation
- VAT and TCS preview (for reference)
- Real-time total calculation

### 3. `/app/dashboard/b2b-sales/B2BShoppingCart.tsx`
Shopping cart component with:
- Item list with purchase prices
- VAT and TCS calculation display
- Payment method selection (Cash/Online/Credit)
- Grand total calculation
- Complete sale button

## Usage

### Access the Page
Navigate to: `/dashboard/b2b-sales`

### Workflow
1. **Select Customer**: Choose from existing customers or use walk-in
2. **Add Products**: Click on products to add to cart
3. **Select Quantity**: Enter quantity and select vendor
4. **Review Cart**: See subtotal, VAT, TCS, and grand total
5. **Payment**: Choose payment method and complete sale
6. **Bill Generated**: Uses same Bill schema with purchase prices

## Calculation Examples

### Example 1: Single Item
- Product: Whisky 750ml
- Purchase Price: ₹1,000/bottle
- Quantity: 10 bottles

**Calculations:**
```
Subtotal = 10 × ₹1,000 = ₹10,000
VAT (35%) = ₹10,000 × 0.35 = ₹3,500
TCS (1.35%) = ₹10,000 × 1.35 × 0.01 = ₹135
Grand Total = ₹10,000 + ₹3,500 + ₹135 = ₹13,635
```

### Example 2: Multiple Items
- Item 1: 5 bottles @ ₹800 = ₹4,000
- Item 2: 3 bottles @ ₹1,200 = ₹3,600

**Calculations:**
```
Subtotal = ₹4,000 + ₹3,600 = ₹7,600
VAT (35%) = ₹7,600 × 0.35 = ₹2,660
TCS (1.35%) = ₹7,600 × 1.35 × 0.01 = ₹102.60
Grand Total = ₹7,600 + ₹2,660 + ₹102.60 = ₹10,362.60
```

## Database Storage

### Bill Document Structure
```json
{
  "customerId": "customer_id",
  "customerName": "Customer Name",
  "customerPhone": "1234567890",
  "customerType": "registered",
  "items": [
    {
      "productId": "product_id",
      "vendorId": "vendor_id",
      "productName": "Product Name",
      "brand": "Brand",
      "category": "Category",
      "quantity": 10,
      "volumePerUnitML": 750,
      "rate": 1000,  // Purchase price
      "subTotal": 10000,
      "discountAmount": 0,  // Always 0
      "itemDiscountAmount": 0,  // Always 0
      "promotionDiscountAmount": 0,  // Always 0
      "finalAmount": 10000,
      "vatAmount": 3500,  // Calculated but stored
      "tcsAmount": 135  // Calculated but stored
    }
  ],
  "totalQuantityBottles": 10,
  "totalVolumeML": 7500,
  "subTotalAmount": 10000,
  "totalDiscountAmount": 0,  // Always 0
  "itemDiscountAmount": 0,  // Always 0
  "billDiscountAmount": 0,  // Always 0
  "promotionDiscountAmount": 0,  // Always 0
  "appliedPromotions": [],  // Always empty
  "totalAmount": 13635,  // Includes VAT and TCS
  "payment": {
    "mode": "Cash",
    "cashAmount": 13635,
    "onlineAmount": 0,
    "creditAmount": 0,
    "totalAmount": 13635
  },
  "metadata": {
    "vatAmount": 3500,
    "tcsAmount": 135,
    "isB2BSale": true
  }
}
```

## Key Differences from Regular Sales

| Feature | Regular Sales | B2B Sales |
|---------|--------------|-----------|
| **Price** | Selling price (`pricePerUnit`) | Purchase price (`purchasePricePerUnit`) |
| **Item Discounts** | ✅ Allowed | ❌ Not allowed |
| **Bill Discounts** | ✅ Allowed | ❌ Not allowed |
| **Promotions** | ✅ Applied | ❌ Not applied |
| **VAT Display** | ❌ Not shown | ✅ Shown (35%) |
| **TCS Display** | ❌ Not shown | ✅ Shown (1.35%) |
| **Tax Storage** | ❌ Not stored | ✅ Stored in items |

## Navigation

To add B2B Sales to the navigation menu, update the navbar component to include:
```tsx
{
  name: "B2B Sales",
  href: "/dashboard/b2b-sales",
  icon: ShoppingBag,
}
```

## Testing Checklist

- [ ] Product selection shows purchase price
- [ ] Quantity dialog displays VAT and TCS preview
- [ ] Cart shows correct calculations
- [ ] VAT = 35% of subtotal
- [ ] TCS = 1% of (subtotal × 1.35)
- [ ] Grand total = subtotal + VAT + TCS
- [ ] Bill saves with purchase prices
- [ ] All discount fields are 0
- [ ] No promotions applied
- [ ] Payment processing works
- [ ] Bill printing works
- [ ] Recent sales table displays correctly

## Notes

1. **VAT and TCS are calculated and displayed** but the formulas are:
   - VAT: 35% of subtotal
   - TCS: 1% of (subtotal + VAT)

2. **Purchase Price Selection**: The system automatically picks the latest purchase price based on `effectiveFrom` date. If multiple vendors exist, user can select the vendor in the quantity dialog.

3. **Stock Management**: Stock is still deducted from inventory when B2B sales are made, same as regular sales.

4. **Reports**: B2B sales are stored in the same Bills collection, so they will appear in regular sales reports. You can filter by checking if `totalDiscountAmount === 0` or by adding a `metadata.isB2BSale` flag.

## Future Enhancements

1. Add a filter to distinguish B2B sales in reports
2. Create separate B2B sales reports
3. Add vendor-wise B2B sales analysis
4. Implement B2B customer management
5. Add purchase price history tracking
