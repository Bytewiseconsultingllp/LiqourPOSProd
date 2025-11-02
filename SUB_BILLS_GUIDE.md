# Sub-Bills Feature Guide

## Overview
The system automatically splits large sales into multiple sub-bills when the total volume exceeds 2.5 liters (2500ml). This feature helps comply with regulations and makes handling large orders more manageable.

## How Sub-Bills Work

### Automatic Splitting
When you complete a sale:
1. **System calculates total volume** of all items in the cart
2. **If total > 2.5L**, the sale is automatically split into multiple sub-bills
3. **Each sub-bill contains max 2.5L** of products
4. **Payment is distributed proportionally** across all sub-bills
5. **All sub-bills are saved** with the main bill

### Splitting Logic
The system uses an optimized algorithm:
- **Sorts items by volume** (largest first)
- **Groups items efficiently** to minimize number of sub-bills
- **Handles large single items** by splitting quantities
- **Maintains item integrity** (doesn't split individual bottles unnecessarily)

## Viewing Sub-Bills

### From Recent Sales Table
1. Navigate to **Dashboard → Sales**
2. Scroll to **Recent Sales** table
3. Look for sales with a **blue badge** showing sub-bill count
4. Click the **"X Sub"** button (e.g., "3 Sub" for 3 sub-bills)

### Sub-Bills Viewer Interface
The viewer shows:
- **Overview card** explaining the split
- **Grid of all sub-bills** with individual cards
- **Each card displays:**
  - Sub-bill number and ID
  - Total amount
  - Number of items
  - Total quantity (bottles)
  - Total volume (liters)
  - Subtotal and discounts
  - Payment breakdown (Cash/Online/Credit)
  - List of products included
  - **"View & Print"** button for each sub-bill

### Printing Individual Sub-Bills
1. Click **"View & Print Sub-Bill X"** on any sub-bill card
2. Thermal printer preview opens
3. Review the sub-bill details
4. Click **"Print Bill"** to send to printer
5. Sub-bill shows:
   - **"--- SUB BILL ---"** designation
   - Sub-bill ID (e.g., BILL-20241102-143052-123-SUB1)
   - All standard bill information
   - Only items in that specific sub-bill

## Example Scenarios

### Scenario 1: Large Order (5L Total)
**Cart:**
- 4 bottles × 750ml = 3000ml
- 3 bottles × 650ml = 1950ml
- **Total: 4950ml (4.95L)**

**Result:**
- **Sub-Bill 1:** 3 bottles × 750ml = 2250ml
- **Sub-Bill 2:** 1 bottle × 750ml + 3 bottles × 650ml = 2700ml
- **Total: 2 sub-bills**

### Scenario 2: Very Large Order (10L Total)
**Cart:**
- 10 bottles × 1000ml = 10000ml
- **Total: 10L**

**Result:**
- **Sub-Bill 1:** 2 bottles × 1000ml = 2000ml
- **Sub-Bill 2:** 2 bottles × 1000ml = 2000ml
- **Sub-Bill 3:** 2 bottles × 1000ml = 2000ml
- **Sub-Bill 4:** 2 bottles × 1000ml = 2000ml
- **Sub-Bill 5:** 2 bottles × 1000ml = 2000ml
- **Total: 5 sub-bills**

### Scenario 3: Small Order (No Split)
**Cart:**
- 2 bottles × 750ml = 1500ml
- **Total: 1.5L**

**Result:**
- **No sub-bills created** (under 2.5L threshold)
- Single main bill only

## Payment Distribution

### How Payment is Split
Payment amounts are distributed **proportionally** based on sub-bill totals:

**Example:**
- **Total Sale:** ₹10,000
- **Payment:** ₹6,000 Cash + ₹4,000 Online

**Sub-Bill 1 (₹6,000 - 60% of total):**
- Cash: ₹3,600 (60% of ₹6,000)
- Online: ₹2,400 (60% of ₹4,000)

**Sub-Bill 2 (₹4,000 - 40% of total):**
- Cash: ₹2,400 (40% of ₹6,000)
- Online: ₹1,600 (40% of ₹4,000)

### Mixed Payment Support
All payment modes are supported:
- ✅ Cash
- ✅ Online
- ✅ Credit
- ✅ Mixed (combination of above)

## Technical Details

### Database Structure
```typescript
interface ISubBill {
  items: IBillItem[];              // Products in this sub-bill
  subTotalAmount: number;          // Subtotal before discounts
  totalDiscountAmount: number;     // Total discounts applied
  totalAmount: number;             // Final amount for this sub-bill
  paymentMode: string;             // Payment method
  cashPaidAmount: number;          // Cash portion
  onlinePaidAmount: number;        // Online portion
  creditPaidAmount: number;        // Credit portion
}
```

### Main Bill Structure
```typescript
interface IBill {
  totalBillId: string;             // Main bill ID
  items: IBillItem[];              // All items (full order)
  totalAmount: number;             // Total across all sub-bills
  subBills?: ISubBill[];          // Array of sub-bills (if split)
  // ... other fields
}
```

### Sub-Bill ID Format
- **Main Bill:** `BILL-20241102-143052-123`
- **Sub-Bill 1:** `BILL-20241102-143052-123-SUB1`
- **Sub-Bill 2:** `BILL-20241102-143052-123-SUB2`
- **Sub-Bill 3:** `BILL-20241102-143052-123-SUB3`

## UI Components

### Files Created/Modified

**New Components:**
- `components/SubBillsViewer.tsx` - Main sub-bills viewer interface
- Shows grid of all sub-bills
- Handles individual sub-bill printing
- Displays summary totals

**Modified Components:**
- `app/dashboard/sales/page.tsx` - Added sub-bills button and viewer
- `components/ThermalBillPrint.tsx` - Supports sub-bill printing

### Visual Indicators
- **Blue badge** on "X Sub" button indicates number of sub-bills
- **Highlighted button** (blue background) for sales with sub-bills
- **Volume indicator** shows total volume in each sub-bill card
- **"SUB BILL" header** on printed receipts

## Benefits

### Regulatory Compliance
- ✅ Meets volume restrictions per transaction
- ✅ Proper documentation for each sub-bill
- ✅ Clear audit trail

### Operational Efficiency
- ✅ Automatic splitting (no manual work)
- ✅ Print individual sub-bills as needed
- ✅ Easy to track and manage
- ✅ Proportional payment distribution

### Customer Experience
- ✅ Transparent breakdown of large orders
- ✅ Individual receipts for each sub-bill
- ✅ Clear itemization

## Troubleshooting

### Sub-Bills Not Created
**Issue:** Large order but no sub-bills
**Solution:** 
- Check if total volume actually exceeds 2.5L
- Verify volume data is correct in product details
- Check console for any errors during sale creation

### Wrong Number of Sub-Bills
**Issue:** Expected different number of splits
**Solution:**
- System optimizes for minimum number of sub-bills
- Large single items may create more splits
- Check splitting algorithm in `api/sales/create/route.ts`

### Payment Amounts Don't Match
**Issue:** Sub-bill payments don't add up to total
**Solution:**
- Payments are distributed proportionally
- Small rounding differences may occur
- Total across all sub-bills will match original payment

### Can't Print Sub-Bill
**Issue:** Print button doesn't work
**Solution:**
- Check if printer is connected
- Verify browser print permissions
- Try different browser (Chrome/Edge recommended)
- Check thermal printer settings

## Configuration

### Changing Volume Threshold
To modify the 2.5L threshold, edit:
```typescript
// File: app/api/sales/create/route.ts
// Line: ~77

const MAX_VOLUME_ML = 2500; // Change this value
```

**Common thresholds:**
- 2500ml (2.5L) - Default
- 3000ml (3L) - Alternative
- 5000ml (5L) - For larger limits

### Customizing Sub-Bill Format
Edit `components/ThermalBillPrint.tsx`:
- Change "SUB BILL" text (line ~260)
- Modify sub-bill ID format
- Adjust layout and styling

## Future Enhancements
- [ ] Bulk print all sub-bills at once
- [ ] Export sub-bills as PDF
- [ ] Email individual sub-bills
- [ ] Custom volume thresholds per product category
- [ ] Sub-bill analytics and reporting
- [ ] Merge sub-bills option
- [ ] Manual sub-bill creation

## Support
For issues with sub-bills:
1. Check Recent Sales table for sub-bill indicator
2. Verify volume calculations are correct
3. Review splitting logic in API route
4. Test with different volume combinations
5. Check browser console for errors
