# Promotions & Discounts in Bills - Implementation

## Overview
The system now stores detailed information about applied promotions and discounts in every bill, providing complete transparency and audit trail for all transactions.

## What's Stored in Bills

### 1. Discount Breakdown
Every bill now tracks three types of discounts separately:

- **Item Discounts** (`itemDiscountAmount`): Manual discounts applied to individual items
- **Bill Discounts** (`billDiscountAmount`): Overall bill-level discounts
- **Promotion Discounts** (`promotionDiscountAmount`): Automatic discounts from promotions/offers

### 2. Applied Promotions
Complete details of all promotions applied to the bill:

```typescript
{
  promotionId: string;        // ID of the promotion
  promotionName: string;      // Name (e.g., "Buy 2 Get 1 Free")
  promotionType: string;      // Type: percentage, fixed, buy_x_get_y, bundle
  discountAmount: number;     // Actual discount given
  description?: string;       // Optional description
}
```

## Database Schema Updates

### Bill Model (`models/Bill.ts`)

**Added Fields:**
```typescript
interface IBill {
  // ... existing fields ...
  
  // Discount breakdown
  itemDiscountAmount?: number;      // Total manual item discounts
  billDiscountAmount?: number;      // Bill-level discount
  promotionDiscountAmount?: number; // Total promotion discounts
  appliedPromotions?: IAppliedPromotion[]; // List of applied promotions
  
  // ... rest of fields ...
}
```

**Bill Item Updates:**
```typescript
interface IBillItem {
  // ... existing fields ...
  
  itemDiscountAmount?: number;      // Manual item-level discount
  promotionDiscountAmount?: number; // Promotion-based discount on this item
  
  // ... rest of fields ...
}
```

## API Integration

### Sales Create Endpoint (`app/api/sales/create/route.ts`)

**Request Body:**
```typescript
{
  // ... existing fields ...
  
  itemDiscountAmount?: number;
  billDiscountAmount?: number;
  promotionDiscountAmount?: number;
  appliedPromotions?: AppliedPromotion[];
}
```

**Stored in Database:**
All discount and promotion data is automatically saved with the bill.

## Frontend Integration

### Shopping Cart Component (`app/dashboard/sales/ShoppingCart.tsx`)

**Tracks:**
- Promotion discount from `PromotionsDisplay` component
- Bill discount from manual input
- Applied promotions list

**Passes to Sale:**
```typescript
const payment = {
  // ... payment details ...
  billDiscountAmount: billDiscount,
  promotionDiscountAmount: promotionDiscount,
  appliedPromotions: appliedPromotions,
};
```

### Sales Page (`app/dashboard/sales/page.tsx`)

**Calculates:**
- Item-level discounts from cart items
- Aggregates all discount types
- Sends complete discount breakdown to API

## Data Flow

```
1. User adds items to cart
   ↓
2. PromotionsDisplay fetches applicable promotions
   ↓
3. Promotions applied automatically
   ↓
4. User can add manual bill discount
   ↓
5. Checkout triggered
   ↓
6. All discount data collected:
   - Item discounts (from cart items)
   - Bill discount (from input)
   - Promotion discounts (from PromotionsDisplay)
   - Applied promotions list
   ↓
7. Sent to API with sale data
   ↓
8. Stored in Bill document
   ↓
9. Available for reports and audits
```

## Bill Structure Example

```json
{
  "totalBillId": "BILL-20241102-143052-ABC",
  "customerName": "John Doe",
  "items": [
    {
      "productName": "Whiskey 750ml",
      "quantity": 2,
      "rate": 2500,
      "subTotal": 5000,
      "itemDiscountAmount": 100,
      "promotionDiscountAmount": 250,
      "discountAmount": 350,
      "finalAmount": 4650
    }
  ],
  "subTotalAmount": 5000,
  "itemDiscountAmount": 100,
  "billDiscountAmount": 50,
  "promotionDiscountAmount": 250,
  "totalDiscountAmount": 400,
  "appliedPromotions": [
    {
      "promotionId": "promo123",
      "promotionName": "Weekend Sale",
      "promotionType": "percentage",
      "discountAmount": 250,
      "description": "20% off on all items"
    }
  ],
  "totalAmount": 4600,
  "payment": { ... }
}
```

## Benefits

### 1. Complete Transparency
- See exactly which promotions were applied
- Track manual vs automatic discounts
- Full audit trail for every transaction

### 2. Reporting & Analytics
- Analyze promotion effectiveness
- Track discount patterns
- Calculate ROI on promotions

### 3. Customer Service
- Show customers exactly what discounts they received
- Resolve disputes with detailed records
- Provide itemized receipts

### 4. Compliance & Auditing
- Complete financial records
- Track all discount sources
- Support tax and regulatory requirements

## Usage Examples

### Viewing Bill Details
```typescript
// Fetch a bill
const bill = await Bill.findById(billId);

// Access discount breakdown
console.log('Item Discounts:', bill.itemDiscountAmount);
console.log('Bill Discount:', bill.billDiscountAmount);
console.log('Promotion Discounts:', bill.promotionDiscountAmount);

// View applied promotions
bill.appliedPromotions.forEach(promo => {
  console.log(`${promo.promotionName}: -₹${promo.discountAmount}`);
});
```

### Generating Reports
```typescript
// Total promotion discounts given this month
const totalPromoDiscounts = await Bill.aggregate([
  {
    $match: {
      saleDate: { $gte: startOfMonth, $lte: endOfMonth }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$promotionDiscountAmount' }
    }
  }
]);

// Most effective promotions
const promoStats = await Bill.aggregate([
  { $unwind: '$appliedPromotions' },
  {
    $group: {
      _id: '$appliedPromotions.promotionId',
      name: { $first: '$appliedPromotions.promotionName' },
      timesUsed: { $sum: 1 },
      totalDiscount: { $sum: '$appliedPromotions.discountAmount' }
    }
  },
  { $sort: { timesUsed: -1 } }
]);
```

## Testing Checklist

- [ ] Create sale with promotion applied
- [ ] Verify promotion details stored in bill
- [ ] Create sale with manual item discount
- [ ] Create sale with bill-level discount
- [ ] Create sale with multiple promotions
- [ ] Verify discount breakdown is correct
- [ ] Check bill totals match discount amounts
- [ ] Retrieve bill and verify all data present
- [ ] Generate report using promotion data

## Migration Notes

### Existing Bills
- Old bills without promotion data will continue to work
- New fields are optional, so no migration needed
- Reports should handle bills with/without promotion data

### Backward Compatibility
- All new fields are optional
- Existing code continues to work
- Gradual adoption of new features possible

## Future Enhancements

1. **Promotion Analytics Dashboard**
   - Visual charts of promotion effectiveness
   - ROI calculations
   - Customer response rates

2. **Promotion History**
   - Track customer's promotion usage
   - Personalized promotion recommendations
   - Loyalty program integration

3. **Advanced Reporting**
   - Export promotion data
   - Custom report builders
   - Scheduled reports

## Summary

The system now provides complete visibility into all discounts and promotions applied to every sale:

✅ **Detailed Tracking**: Item, bill, and promotion discounts tracked separately
✅ **Full History**: Complete list of applied promotions with details
✅ **Audit Trail**: Every discount source documented
✅ **Reporting Ready**: Data structured for analytics and reports
✅ **Customer Transparency**: Clear breakdown of all savings
✅ **Backward Compatible**: Works with existing bills and code
