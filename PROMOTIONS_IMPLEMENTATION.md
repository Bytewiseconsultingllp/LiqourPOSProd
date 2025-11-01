# Promotions & Offers System Implementation

## Overview
A comprehensive promotions and offers management system has been implemented with full CRUD operations, automatic application on sales, and real-time discount calculations.

## Features Implemented

### 1. Promotion Types
- **Percentage Discount**: Apply a percentage discount on eligible items
- **Fixed Amount**: Apply a fixed amount discount
- **Buy X Get Y**: Buy X items and get Y items free
- **Bundle Offers**: Special bundle pricing

### 2. Applicability Options
- **All Products**: Apply to entire cart
- **Specific Categories**: Target specific product categories
- **Specific Products**: Apply to selected products only
- **Specific Brands**: Target specific brands

### 3. Promotion Conditions
- **Minimum Purchase Amount**: Set minimum cart value to activate promotion
- **Maximum Discount Cap**: Limit the maximum discount amount
- **Validity Period**: Start and end dates for promotions
- **Priority System**: Higher priority promotions apply first
- **Active/Inactive Status**: Enable or disable promotions

## Files Created

### Models
- `models/Promotion.ts` - Mongoose schema for promotions with tenant support

### Types
- `types/promotion.ts` - TypeScript interfaces for promotions

### API Routes
- `app/api/promotions/route.ts` - GET (list) and POST (create) endpoints
- `app/api/promotions/[id]/route.ts` - GET, PUT, PATCH, DELETE for individual promotions
- `app/api/promotions/apply/route.ts` - Calculate applicable promotions for a cart

### UI Components
- `app/(dashboard)/promotions/page.tsx` - Management page with table and modal
- `app/dashboard/sales/PromotionsDisplay.tsx` - Shows active promotions in cart

### Updated Files
- `app/dashboard/sales/ShoppingCart.tsx` - Integrated promotions display and discount calculation

## API Endpoints

### GET /api/promotions
Get all promotions with optional filters
- Query params: `isActive`, `type`, `activeOnly`
- Returns: Array of promotions

### POST /api/promotions
Create a new promotion
- Body: Promotion data
- Returns: Created promotion

### GET /api/promotions/[id]
Get a single promotion by ID
- Returns: Promotion object

### PUT /api/promotions/[id]
Update a promotion
- Body: Updated promotion data
- Returns: Updated promotion

### PATCH /api/promotions/[id]
Toggle promotion active status
- Body: `{ isActive: boolean }`
- Returns: Updated promotion

### DELETE /api/promotions/[id]
Delete a promotion
- Returns: Success message

### POST /api/promotions/apply
Calculate applicable promotions for a cart
- Body: `{ items: CartItem[], totalAmount: number }`
- Returns: Array of applicable promotions with discount amounts

## Usage

### Managing Promotions
1. Navigate to `/promotions` page
2. Click "Add Promotion" to create new promotion
3. Fill in promotion details:
   - Name and description
   - Type (percentage, fixed, buy X get Y, bundle)
   - Discount value
   - Applicability (all, category, product, brand)
   - Conditions (min purchase, max discount)
   - Validity dates
   - Priority and active status
4. Use toggle buttons to enable/disable promotions
5. Edit or delete promotions as needed

### Sales Page Integration
- Active promotions automatically appear in the shopping cart
- Promotions are calculated in real-time as items are added
- Discount is shown separately in the bill summary
- Green badge displays active promotion names and amounts
- Total is automatically adjusted with promotion discounts

## Promotion Calculation Logic

1. **Filter Active Promotions**: Only promotions with current date between start and end dates
2. **Check Minimum Purchase**: Verify cart total meets minimum requirement
3. **Check Applicability**: Match promotion criteria with cart items
4. **Calculate Discount**:
   - Percentage: `(totalAmount * percentage) / 100`
   - Fixed: Direct discount amount
   - Buy X Get Y: Calculate free items based on quantity
5. **Apply Maximum Cap**: Limit discount to max amount if set
6. **Sort by Priority**: Higher priority promotions apply first

## Example Promotions

### Weekend Sale (20% Off)
```json
{
  "name": "Weekend Sale",
  "type": "percentage",
  "discountPercentage": 20,
  "applicableOn": "all",
  "startDate": "2024-11-02",
  "endDate": "2024-11-03",
  "isActive": true
}
```

### Buy 2 Get 1 Free
```json
{
  "name": "Buy 2 Get 1 Free",
  "type": "buy_x_get_y",
  "buyQuantity": 2,
  "getQuantity": 1,
  "applicableOn": "category",
  "categoryIds": ["Whiskey"],
  "startDate": "2024-11-01",
  "endDate": "2024-11-30",
  "isActive": true
}
```

### Flat ₹500 Off
```json
{
  "name": "Flat ₹500 Off",
  "type": "fixed",
  "discountAmount": 500,
  "applicableOn": "all",
  "minPurchaseAmount": 2000,
  "startDate": "2024-11-01",
  "endDate": "2024-12-31",
  "isActive": true
}
```

## UI Features

### Promotions Management Page
- ✅ Tabular view with all promotion details
- ✅ Create/Edit modal with form validation
- ✅ Enable/Disable toggle buttons
- ✅ Edit and Delete actions
- ✅ Status badges (Active/Inactive)
- ✅ Formatted dates and discount values
- ✅ Responsive design

### Sales Page Integration
- ✅ Real-time promotion calculation
- ✅ Visual promotion badges with icons
- ✅ Separate promotion discount line in bill
- ✅ Green color coding for promotions
- ✅ Automatic updates on cart changes

## Notes
- Promotions are tenant-specific (multi-tenant support)
- Multiple promotions can apply simultaneously
- Priority system determines application order
- All monetary values in INR (₹)
- Dates are stored in ISO format
- Discounts are rounded to 2 decimal places
