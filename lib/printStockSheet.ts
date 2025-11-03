import { ProductDetails } from "@/types/product";

/**
 * Format date to readable string
 */
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Print thermal stock sheet with current and morning stock
 */
export const printStockSheet = (products: ProductDetails[]) => {
  if (typeof window === "undefined") return; // Ensure it's client-side

  const printWindow = window.open("", "_blank", "width=400,height=600");

  if (!printWindow) {
    alert("Please allow pop-ups to enable printing.");
    return;
  }

  // Filter products with current stock
  const stockedProducts = products.filter(p => (p.currentStock || 0) > 0);

  const styles = `
    <style>
      * {
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }
      body {
        width: 58mm; /* Adjust to 80mm for larger printers */
        margin: 0;
        padding: 6px;
      }
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 6px;
        margin-bottom: 6px;
      }
      h3 {
        margin: 0;
        font-size: 14px;
      }
      small {
        font-size: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        padding: 2px 0;
      }
      th {
        border-bottom: 1px dashed #000;
      }
      td {
        vertical-align: top;
      }
      tr:nth-child(even) td {
        background: #fafafa;
      }
      .footer {
        border-top: 1px dashed #000;
        text-align: center;
        margin-top: 8px;
        padding-top: 4px;
      }
      .summary {
        margin-top: 8px;
        padding-top: 4px;
        border-top: 1px dashed #000;
        font-weight: bold;
      }
    </style>
  `;

  const totalProducts = stockedProducts.length;
  const totalCurrentStock = stockedProducts.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalMorningStock = stockedProducts.reduce((sum, p) => sum + (p.morningStock || 0), 0);

  const content = `
    <div class="header">
      <h3>Stock Sheet</h3>
      <small>${formatDate(new Date())}</small>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:8%">#</th>
          <th style="width:40%">Product</th>
          <th style="width:13%;text-align:right;padding-right:2px;">M.S.</th>
          <th style="width:13%;text-align:right;padding-right:2px;">C.S.</th>
          <th style="width:13%;text-align:right;padding-right:2px;">Caret</th>
          <th style="width:13%;text-align:right;padding-right:2px;">Bottle</th>
        </tr>
      </thead>
      <tbody>
        ${stockedProducts
          .map(
            (p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.name}</td>
              <td style="text-align:right;padding-right:2px;">${p.morningStock || 0}</td>
              <td style="text-align:right;padding-right:2px;">${p.currentStock || 0}</td>
              <td style="text-align:right;padding-right:2px;">______</td>
              <td style="text-align:right;padding-right:2px;">______</td>
            </tr>
          `
          )
          .join("")}
      </tbody>
    </table>
    <div class="summary">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span>Total Products:</span>
        <span>${totalProducts}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span>Total Morning Stock:</span>
        <span>${totalMorningStock}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Total Current Stock:</span>
        <span>${totalCurrentStock}</span>
      </div>
    </div>
    <div class="footer">
      <small>Generated via POS System</small>
    </div>
  `;

  printWindow.document.write(`
    <html>
      <head>${styles}</head>
      <body>${content}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};
