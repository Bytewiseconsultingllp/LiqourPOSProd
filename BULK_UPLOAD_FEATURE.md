# Bulk Product Upload Feature

## Overview
Added Excel-based bulk upload functionality to quickly add multiple products to the inventory system.

## Features

### 🎯 Main Components
1. **Excel Template Download** - Pre-formatted template with example data
2. **Bulk Upload** - Upload filled Excel file to create multiple products
3. **Validation** - Server-side validation with detailed error reporting
4. **Results Summary** - Clear feedback on success/failure counts

## How to Use

### Step 1: Download Template
1. Navigate to **Dashboard → Management → Products**
2. Click the purple **"Template"** button
3. Excel file downloads: `Product_Upload_Template_YYYY-MM-DD.xlsx`

### Step 2: Fill Template
Open the downloaded Excel file. It contains two sheets:

#### Sheet 1: Products Template
Contains example products with all fields:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| Product Name | ✅ Yes | Full product name | Example Whisky 750ml |
| Description | ❌ No | Product description | Premium blended whisky |
| SKU | ❌ No | Stock Keeping Unit | WHY-750-001 |
| Brand | ✅ Yes | Brand name | Premium Brand |
| Category | ✅ Yes | Product category | Whisky |
| Price Per Unit | ✅ Yes | Selling price | 1500 |
| Volume (ML) | ✅ Yes | Volume in milliliters | 750 |
| Current Stock | ✅ Yes | Current stock quantity | 50 |
| Morning Stock | ❌ No | Morning stock count | 50 |
| Reorder Level | ❌ No | Minimum stock alert | 10 |
| Bottles Per Caret | ❌ No | Bottles per box | 12 |
| Barcode | ❌ No | Product barcode | 1234567890123 |
| Is Active | ❌ No | Active status (Yes/No) | Yes |

#### Sheet 2: Instructions
Detailed instructions and field descriptions.

### Step 3: Upload File
1. Click the orange **"Bulk Upload"** button
2. In the modal, click **"Choose File"** or drag & drop
3. Select your filled Excel file
4. Upload starts automatically
5. View results summary

## Validation Rules

### Required Fields
- Product Name
- Brand
- Category
- Price Per Unit (must be > 0)
- Volume (ML) (must be > 0)

### Duplicate Check
- System checks if product name already exists
- Duplicates are skipped with error message

### Data Types
- Numbers: Price, Volume, Stock, Reorder Level, Bottles Per Caret
- Text: Name, Description, SKU, Brand, Category, Barcode
- Boolean: Is Active (Yes/No)

## Upload Results

### Success Summary
```
✅ Successfully created: 45 products
❌ Failed: 5 products
```

### Error Details
Each failed row shows specific error:
- `Row 3: Missing required fields (name, brand, or category)`
- `Row 7: Invalid price per unit`
- `Row 12: Product "Whisky 750ml" already exists`

## UI Components

### Buttons Added
1. **Template (Purple)** - Download Excel template
2. **Bulk Upload (Orange)** - Open bulk upload modal
3. **Stock Sheet (Green)** - Print stock sheet (existing)
4. **Add Product (Blue)** - Add single product (existing)

### Bulk Upload Modal
- Instructions panel
- File upload input
- Template download button
- Progress indicator
- Results summary
- Error list (scrollable)

## Technical Implementation

### Files Created
1. **`lib/excelTemplates.ts`**
   - `downloadProductTemplate()` - Generate and download template
   - `parseProductExcel()` - Parse uploaded Excel file

2. **`app/api/products/bulk-upload/route.ts`**
   - POST endpoint for bulk product creation
   - Validation and error handling
   - Returns detailed results

### Files Modified
1. **`app/dashboard/management/products/page.tsx`**
   - Added bulk upload UI
   - File upload handler
   - Results display

### Dependencies
- **xlsx** - Excel file parsing and generation
  ```bash
  npm install xlsx
  ```

## API Endpoint

### POST /api/products/bulk-upload

**Request Body:**
```json
{
  "products": [
    {
      "name": "Whisky 750ml",
      "brand": "Premium Brand",
      "category": "Whisky",
      "pricePerUnit": 1500,
      "volumeML": 750,
      "currentStock": 50,
      "morningStock": 50,
      "reorderLevel": 10,
      "bottlesPerCaret": 12,
      "barcode": "1234567890123",
      "isActive": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk upload completed. 45 products created, 5 failed.",
  "results": {
    "success": 45,
    "failed": 5,
    "errors": [
      "Row 3: Missing required fields",
      "Row 7: Invalid price per unit"
    ],
    "createdProducts": [...]
  }
}
```

## Error Handling

### Client-Side
- File format validation (.xlsx, .xls only)
- Empty file check
- Parse error handling
- Toast notifications

### Server-Side
- Authentication check
- Required field validation
- Data type validation
- Duplicate product check
- Per-row error tracking

## Best Practices

### For Users
1. **Always download the latest template** - Format may change
2. **Delete example rows** - Don't upload sample data
3. **Check required fields** - Ensure all required columns are filled
4. **Use consistent naming** - Avoid duplicate product names
5. **Review errors** - Fix failed rows and re-upload

### For Developers
1. **Validate on server** - Never trust client data
2. **Provide detailed errors** - Include row numbers and reasons
3. **Handle partial success** - Don't fail entire upload for one bad row
4. **Log errors** - Track upload issues for debugging
5. **Test with large files** - Ensure performance with 100+ products

## Limitations

### Current
- Maximum file size: Browser dependent (typically 10MB)
- No update support: Only creates new products
- No image upload: Images must be added separately
- Single sheet: Only first sheet is processed

### Future Enhancements
- [ ] Update existing products
- [ ] Image upload via URLs
- [ ] Multiple sheet support
- [ ] CSV format support
- [ ] Async processing for large files
- [ ] Progress bar for upload
- [ ] Download failed rows as Excel
- [ ] Bulk edit/delete

## Troubleshooting

### "No valid products found"
- Check required fields are filled
- Ensure column names match template exactly
- Verify data types (numbers vs text)

### "Failed to parse Excel file"
- Use .xlsx or .xls format only
- Don't modify template structure
- Ensure file isn't corrupted

### "Product already exists"
- Check for duplicate names in your file
- Verify product doesn't exist in system
- Use unique product names

### Upload is slow
- Large files (100+ products) may take time
- Check network connection
- Try smaller batches (50 products at a time)

## Example Workflow

1. **Download Template**
   ```
   Click "Template" → Save file
   ```

2. **Fill Data**
   ```
   Open Excel → Fill products → Delete examples → Save
   ```

3. **Upload**
   ```
   Click "Bulk Upload" → Choose file → Wait for results
   ```

4. **Review Results**
   ```
   Check success count → Fix errors if any → Re-upload failed rows
   ```

5. **Verify**
   ```
   Check products table → Verify data is correct
   ```

## Security Considerations

- ✅ Authentication required
- ✅ Tenant isolation (organizationId)
- ✅ Server-side validation
- ✅ No SQL injection (using Mongoose)
- ✅ File type validation
- ⚠️ No file size limit (add if needed)
- ⚠️ No rate limiting (add if needed)

---

**Created**: November 3, 2025  
**Version**: 1.0.0  
**Feature Status**: ✅ Production Ready
