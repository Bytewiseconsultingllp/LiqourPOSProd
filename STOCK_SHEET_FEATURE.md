# Stock Sheet Printing Feature

## Overview
Added a thermal printer-friendly stock sheet that can be printed directly from the Products Management page.

## Location
**Products Management Page** → `Stock Sheet` button (green button with printer icon)

## Features

### 📋 Stock Sheet Contents
- **Product List**: All products with current stock > 0
- **Columns**:
  - # (Serial number)
  - Product Name
  - Morning Stock
  - Current Stock
  - Carets (blank for manual entry)
  - Bottles (blank for manual entry)

### 📊 Summary Section
- Total Products (with stock)
- Total Morning Stock
- Total Current Stock

### 🖨️ Print Format
- **Thermal Printer Optimized**: 58mm width (adjustable to 80mm)
- **Monospace Font**: Courier New for alignment
- **Compact Layout**: Minimal padding for thermal paper
- **Dashed Borders**: Printer-friendly separators

## Usage

### From Products Management Page
1. Navigate to **Dashboard → Management → Products**
2. Click the **Stock Sheet** button (green, with printer icon)
3. A print preview window opens
4. Click Print or use Ctrl+P
5. Select your thermal printer
6. Print!

### Programmatic Usage
```typescript
import { printStockSheet } from '@/lib/printStockSheet';

// Print all products
printStockSheet(products);

// Print filtered products
const stockedProducts = products.filter(p => p.currentStock > 0);
printStockSheet(stockedProducts);
```

## File Structure

### Created Files
1. **`lib/printStockSheet.ts`** - Main utility function
2. **`STOCK_SHEET_FEATURE.md`** - This documentation

### Modified Files
1. **`app/dashboard/management/products/page.tsx`**
   - Added import for `printStockSheet`
   - Added `Printer` icon import
   - Added "Stock Sheet" button

## Stock Sheet Layout

```
┌─────────────────────────────────────┐
│         Stock Sheet                 │
│      03/11/2025 07:46              │
├─────────────────────────────────────┤
│ #  Product      Morning Current ... │
├─────────────────────────────────────┤
│ 1  Whisky 750ml    50      45   ... │
│ 2  Vodka 1L        30      28   ... │
│ 3  Rum 750ml       20      18   ... │
├─────────────────────────────────────┤
│ Total Products: 3                   │
│ Total Morning Stock: 100            │
│ Total Current Stock: 91             │
├─────────────────────────────────────┤
│    Generated via POS System         │
└─────────────────────────────────────┘
```

## Customization

### Adjust Paper Width
In `lib/printStockSheet.ts`:
```typescript
body {
  width: 58mm; /* Change to 80mm for larger printers */
}
```

### Add/Remove Columns
Modify the table header and body in the `content` section:
```typescript
<th style="width:XX%">New Column</th>
// ...
<td>${p.newField}</td>
```

### Change Date Format
Modify the `formatDate` function:
```typescript
const formatDate = (date: Date): string => {
  // Your custom format
  return date.toLocaleDateString('en-IN');
};
```

## Browser Compatibility
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires pop-up permission

## Troubleshooting

### "Please allow pop-ups" message
- Enable pop-ups for your domain in browser settings
- Or hold Ctrl/Cmd while clicking the button

### Print preview doesn't open
- Check browser console for errors
- Ensure `window.open` is not blocked
- Try a different browser

### Alignment issues
- Adjust column widths in the `<th>` style attributes
- Ensure monospace font is used
- Check printer DPI settings

## Future Enhancements
- [ ] Export to PDF
- [ ] Export to Excel
- [ ] Email stock sheet
- [ ] Schedule automatic stock reports
- [ ] Add barcode column
- [ ] Add category grouping
- [ ] Add low stock highlighting

## Technical Details

### Dependencies
- None (vanilla JavaScript/TypeScript)
- Uses browser's native print API

### Data Source
- Filters products where `currentStock > 0`
- Reads from `ProductDetails` interface
- Uses `morningStock` and `currentStock` fields

### Performance
- Lightweight: ~2KB function
- No external API calls
- Instant preview generation
- Client-side only

---

**Created**: November 3, 2025  
**Version**: 1.0.0  
**Author**: POS System
