# Thermal Printer Bill Implementation Guide

## Overview
This implementation adds thermal printer support (80mm width) for generating bills and sub-bills with an in-app preview and print functionality.

## Features Implemented

### 1. **ThermalBillPrint Component** (`components/ThermalBillPrint.tsx`)
- Optimized for 80mm thermal printers
- Supports both **Main Bill** and **Sub Bill** formats
- In-app preview before printing
- Automatic organization info from localStorage
- Professional receipt layout with:
  - Organization header (name, address, phone, GSTIN)
  - Bill/Sub-bill designation
  - Customer details
  - Itemized product list with quantities and prices
  - Discount breakdown
  - Payment information
  - Summary totals

### 2. **Sales Page Integration** (`app/dashboard/sales/page.tsx`)
Added the following features:
- **View buttons** in Recent Sales table:
  - **"Bill"** button - Opens main bill preview
  - **"Sub"** button - Opens sub-bill preview
- **Auto-print prompt** after completing a sale
- **Bill viewer modal** with print functionality

## How to Use

### Viewing Bills from Recent Sales
1. Navigate to **Dashboard → Sales**
2. Scroll to the **Recent Sales** table at the bottom
3. For any sale, click:
   - **"Bill"** button to view/print the main bill
   - **"Sub"** button to view/print the sub-bill
4. In the preview modal:
   - Review the bill details
   - Click **"Print Bill"** to send to printer
   - Click **"Close"** to exit without printing

### Printing After Sale Completion
1. Complete a sale as normal
2. After successful sale, a confirmation dialog appears:
   - **"Sale completed! Would you like to print the bill?"**
3. Click **OK** to open bill preview
4. Click **Cancel** to skip printing

### Bill Format Differences

#### Main Bill
- Full detailed bill
- Shows all items with complete information
- Includes all discounts and payment details
- Standard format for customer records

#### Sub Bill
- Compact version
- Shows "SUB BILL" designation
- Includes sub-bill ID if available
- Useful for internal tracking or duplicate copies

## Thermal Printer Setup

### Recommended Settings
- **Paper Width:** 80mm (standard thermal roll)
- **Print Margins:** 0mm (handled by CSS)
- **Font:** Courier New (monospace for alignment)
- **Font Size:** 12px base

### Browser Print Settings
When the print dialog opens:
1. Select your thermal printer
2. Set paper size to **80mm** or **Custom**
3. Remove headers/footers
4. Set margins to **None** or **0**
5. Enable **Background graphics** (for borders)

### Supported Printers
Works with any 80mm thermal printer that supports:
- ESC/POS protocol
- Standard browser printing
- Common models: Epson TM-T20, Star TSP100, Bixolon SRP-350

## Customization

### Organization Information
The bill automatically pulls organization details from localStorage:
```javascript
{
  name: "Your Store Name",
  address: "Store Address",
  phone: "Contact Number",
  gstin: "GST Number"
}
```

### Bill Layout
To customize the bill layout, edit `components/ThermalBillPrint.tsx`:
- **Header section:** Lines 248-262
- **Bill info:** Lines 265-285
- **Items table:** Lines 288-308
- **Totals:** Lines 327-343
- **Footer:** Lines 369-372

### Styling
The component uses inline styles for print compatibility. Key style sections:
- `.header` - Top section with org info
- `.section` - Content sections with borders
- `.item-row` - Product line items
- `.totals` - Summary calculations
- `.footer` - Bottom thank you message

## Technical Details

### Component Props
```typescript
interface ThermalBillPrintProps {
  billData: BillData;          // Sale data object
  onClose: () => void;          // Close handler
  billType?: 'main' | 'sub';   // Bill type (default: 'main')
}
```

### Bill Data Structure
```typescript
interface BillData {
  totalBillId?: string;         // Main bill number
  subBillId?: string;           // Sub-bill number
  customerName: string;         // Customer name
  customerPhone?: string;       // Customer phone
  items: BillItem[];           // Array of products
  totalAmount: number;         // Final total
  payment?: PaymentInfo;       // Payment details
  saleDate?: string;           // Sale timestamp
  // ... discount fields
}
```

## Troubleshooting

### Bill Not Printing
1. Check if printer is connected and powered on
2. Verify printer is set as default or selected in print dialog
3. Ensure paper is loaded correctly
4. Check browser print permissions

### Layout Issues
1. Verify paper width is set to 80mm
2. Check printer margins are set to 0
3. Ensure "Fit to page" is disabled
4. Try different browsers (Chrome/Edge recommended)

### Missing Organization Info
1. Check localStorage has 'organization' key
2. Verify organization object has required fields
3. Component will use fallback values if missing

## Future Enhancements
- [ ] Add barcode/QR code to bills
- [ ] Support for multiple paper sizes (58mm, 80mm)
- [ ] Email bill option
- [ ] SMS bill link
- [ ] Automatic print without preview option
- [ ] Print queue for multiple bills
- [ ] Custom bill templates
- [ ] Logo image support

## Support
For issues or questions about thermal printing:
1. Check printer manufacturer documentation
2. Verify ESC/POS compatibility
3. Test with standard browser print dialog
4. Ensure latest printer drivers installed
