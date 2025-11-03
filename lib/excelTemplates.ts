import * as XLSX from 'xlsx';

/**
 * Download Excel template for bulk product upload
 */
export const downloadProductTemplate = () => {
  // Define template headers with example data
  const templateData = [
    {
      'Product Name': 'Example Whisky 750ml',
      'Description': 'Premium blended whisky',
      'SKU': 'WHY-750-001',
      'Brand': 'Premium Brand',
      'Category': 'Whisky',
      'Price Per Unit': 1500,
      'Volume (ML)': 750,
      'Current Stock': 50,
      'Morning Stock': 50,
      'Reorder Level': 10,
      'Bottles Per Caret': 12,
      'Barcode': '1234567890123',
      'Is Active': 'Yes',
    },
    {
      'Product Name': 'Example Vodka 1L',
      'Description': 'Premium vodka',
      'SKU': 'VOD-1000-001',
      'Brand': 'Premium Brand',
      'Category': 'Vodka',
      'Price Per Unit': 2000,
      'Volume (ML)': 1000,
      'Current Stock': 30,
      'Morning Stock': 30,
      'Reorder Level': 5,
      'Bottles Per Caret': 12,
      'Barcode': '1234567890124',
      'Is Active': 'Yes',
    },
  ];

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Product Name
    { wch: 30 }, // Description
    { wch: 15 }, // SKU
    { wch: 15 }, // Brand
    { wch: 15 }, // Category
    { wch: 15 }, // Price Per Unit
    { wch: 12 }, // Volume (ML)
    { wch: 15 }, // Current Stock
    { wch: 15 }, // Morning Stock
    { wch: 15 }, // Reorder Level
    { wch: 18 }, // Bottles Per Caret
    { wch: 18 }, // Barcode
    { wch: 10 }, // Is Active
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products Template');

  // Add instructions sheet
  const instructions = [
    { Instruction: 'PRODUCT BULK UPLOAD TEMPLATE' },
    { Instruction: '' },
    { Instruction: 'Instructions:' },
    { Instruction: '1. Fill in the product details in the "Products Template" sheet' },
    { Instruction: '2. Product Name, Brand, Category, Price Per Unit, Volume (ML), and Current Stock are REQUIRED' },
    { Instruction: '3. Other fields are optional but recommended' },
    { Instruction: '4. Is Active: Use "Yes" or "No" (default is "Yes")' },
    { Instruction: '5. Delete the example rows before uploading' },
    { Instruction: '6. Save the file and upload it using the "Upload Excel" button' },
    { Instruction: '' },
    { Instruction: 'Field Descriptions:' },
    { Instruction: '- Product Name: Full name of the product (Required)' },
    { Instruction: '- Description: Brief description of the product' },
    { Instruction: '- SKU: Stock Keeping Unit (unique identifier)' },
    { Instruction: '- Brand: Brand name (Required)' },
    { Instruction: '- Category: Product category like Whisky, Vodka, etc. (Required)' },
    { Instruction: '- Price Per Unit: Selling price per bottle (Required)' },
    { Instruction: '- Volume (ML): Volume in milliliters (Required)' },
    { Instruction: '- Current Stock: Current stock quantity (Required)' },
    { Instruction: '- Morning Stock: Morning stock count' },
    { Instruction: '- Reorder Level: Minimum stock level for alerts' },
    { Instruction: '- Bottles Per Caret: Number of bottles per caret/box' },
    { Instruction: '- Barcode: Product barcode number' },
    { Instruction: '- Is Active: Whether product is active (Yes/No)' },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Generate file
  const fileName = `Product_Upload_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Parse uploaded Excel file and convert to product data
 */
export const parseProductExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet (Products Template)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Transform data to match API format
        const products = jsonData.map((row: any) => ({
          name: row['Product Name'],
          description: row['Description'] || '',
          sku: row['SKU'] || '',
          brand: row['Brand'],
          category: row['Category'],
          pricePerUnit: parseFloat(row['Price Per Unit']) || 0,
          volumeML: parseFloat(row['Volume (ML)']) || 0,
          currentStock: parseFloat(row['Current Stock']) || 0,
          morningStock: parseFloat(row['Morning Stock']) || 0,
          reorderLevel: parseFloat(row['Reorder Level']) || 0,
          bottlesPerCaret: parseFloat(row['Bottles Per Caret']) || 0,
          barcode: row['Barcode'] || '',
          isActive: row['Is Active']?.toLowerCase() === 'yes' || row['Is Active'] === true || !row['Is Active'],
        }));

        // Validate required fields
        const validProducts = products.filter(p => 
          p.name && p.brand && p.category && p.pricePerUnit > 0 && p.volumeML > 0
        );

        if (validProducts.length === 0) {
          reject(new Error('No valid products found in the Excel file. Please check required fields.'));
          return;
        }

        if (validProducts.length < products.length) {
          console.warn(`${products.length - validProducts.length} products skipped due to missing required fields`);
        }

        resolve(validProducts);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it matches the template format.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
};
