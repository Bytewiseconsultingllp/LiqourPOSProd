# Promotions System - Testing Guide

## Quick Start

### 1. Access Promotions Management
Navigate to: `http://localhost:3000/promotions`

### 2. Create Your First Promotion

#### Example 1: 10% Off All Products
1. Click "Add Promotion"
2. Fill in:
   - Name: "10% Off Everything"
   - Type: Percentage Off
   - Discount Percentage: 10
   - Applicable On: All Products
   - Start Date: Today
   - End Date: 30 days from now
   - Active: ✓
3. Click "Create"

#### Example 2: Buy 3 Get 1 Free
1. Click "Add Promotion"
2. Fill in:
   - Name: "Buy 3 Get 1 Free"
   - Type: Buy X Get Y
   - Buy Quantity: 3
   - Get Quantity: 1
   - Applicable On: All Products (or specific category)
   - Start Date: Today
   - End Date: 30 days from now
   - Active: ✓
3. Click "Create"

#### Example 3: Flat ₹200 Off on ₹1000+
1. Click "Add Promotion"
2. Fill in:
   - Name: "₹200 Off on ₹1000+"
   - Type: Fixed Amount
   - Discount Amount: 200
   - Applicable On: All Products
   - Min Purchase Amount: 1000
   - Start Date: Today
   - End Date: 30 days from now
   - Active: ✓
3. Click "Create"

### 3. Test on Sales Page

1. Navigate to: `http://localhost:3000/dashboard/sales`
2. Select a customer
3. Add products to cart
4. Watch for:
   - Green "Active Promotions" section appears
   - Promotion names and discount amounts shown
   - "Promotion Discount" line in bill summary
   - Total automatically adjusted

### 4. Test Enable/Disable

1. Go back to `/promotions`
2. Click the power icon to disable a promotion
3. Go to sales page
4. Verify promotion no longer applies
5. Enable it again and verify it reappears

### 5. Test Multiple Promotions

1. Create 2-3 different promotions
2. Set different priorities (higher number = higher priority)
3. Add items to cart
4. Verify all applicable promotions show up
5. Check total discount is sum of all promotions

## Testing Checklist

### Promotions Management Page
- [ ] Can create new promotion
- [ ] Can edit existing promotion
- [ ] Can delete promotion
- [ ] Can toggle active/inactive status
- [ ] Table shows all promotions correctly
- [ ] Dates display in readable format
- [ ] Status badges show correct color

### Sales Page Integration
- [ ] Promotions appear when cart has items
- [ ] Promotions disappear when cart is empty
- [ ] Discount calculates correctly for percentage type
- [ ] Discount calculates correctly for fixed type
- [ ] Buy X Get Y calculates correctly
- [ ] Min purchase amount condition works
- [ ] Max discount cap works
- [ ] Multiple promotions apply together
- [ ] Total updates in real-time
- [ ] Promotion section has green styling

### Edge Cases
- [ ] Promotion with future start date doesn't apply
- [ ] Promotion with past end date doesn't apply
- [ ] Inactive promotion doesn't apply
- [ ] Category-specific promotion only applies to matching items
- [ ] Product-specific promotion only applies to matching items
- [ ] Brand-specific promotion only applies to matching items

## Common Issues & Solutions

### Promotion Not Showing on Sales Page
- Check if promotion is active (toggle is on)
- Verify start date is today or earlier
- Verify end date is today or later
- Check if min purchase amount is met
- Ensure applicability matches cart items

### Discount Not Calculating
- Check browser console for errors
- Verify MongoDB connection
- Check if promotion type has required fields:
  - Percentage: needs discountPercentage
  - Fixed: needs discountAmount
  - Buy X Get Y: needs buyQuantity and getQuantity

### Multiple Promotions Not Working
- Verify all promotions are active
- Check date ranges
- Ensure applicability criteria are met
- Check priority values (higher applies first)

## API Testing with Postman/cURL

### Get All Active Promotions
```bash
curl -X GET "http://localhost:3000/api/promotions?activeOnly=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Promotion
```bash
curl -X POST "http://localhost:3000/api/promotions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Promotion",
    "type": "percentage",
    "discountPercentage": 15,
    "applicableOn": "all",
    "startDate": "2024-11-01",
    "endDate": "2024-11-30",
    "isActive": true
  }'
```

### Apply Promotions to Cart
```bash
curl -X POST "http://localhost:3000/api/promotions/apply" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "123",
        "productName": "Test Product",
        "brand": "Test Brand",
        "category": "Whiskey",
        "quantity": 2,
        "rate": 500,
        "subTotal": 1000
      }
    ],
    "totalAmount": 1000
  }'
```

## Performance Notes

- Promotions are calculated on every cart change
- API call is debounced to prevent excessive requests
- Calculations happen server-side for security
- Results are cached during the session

## Next Steps

After testing, you can:
1. Create seasonal promotions (Diwali, New Year, etc.)
2. Set up category-specific offers
3. Create brand partnership promotions
4. Configure loyalty program discounts
5. Set up flash sales with time limits
