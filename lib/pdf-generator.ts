import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SalesSummary {
  totalBills: number;
  totalQuantity: number;
  totalVolumeML: number;
  subTotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
}

interface PurchaseSummary {
  totalPurchases: number;
  totalQuantity: number;
  totalVolumeML: number;
  totalAmount: number;
}

interface VendorSales {
  vendorName: string;
  totalAmount: number;
  totalQuantity: number;
  products: {
    productName: string;
    brand: string;
    quantity: number;
    amount: number;
  }[];
}

interface QuickReportData {
  reportDate: string;
  period: {
    from: string;
    to: string;
  };
  sales: SalesSummary;
  purchases: PurchaseSummary;
  vendorSales: VendorSales[];
  netProfit: number;
}

export function generateQuickReportPDF(data: QuickReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DAILY QUICK REPORT', 105, yPos, { align: 'center' });
  yPos += 15;

  // Report Date
  const reportDate = new Date(data.reportDate);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Date: ${reportDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}`,
    105,
    yPos,
    { align: 'center' }
  );
  yPos += 8;

  // Period
  const fromDate = new Date(data.period.from);
  const toDate = new Date(data.period.to);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Period: ${fromDate.toLocaleString('en-IN')} to ${toDate.toLocaleString('en-IN')}`,
    105,
    yPos,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Sales Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue color
  doc.text('SALES SUMMARY', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Sales Table
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Bills', data.sales.totalBills.toString()],
      ['Total Quantity (Bottles)', data.sales.totalQuantity.toString()],
      ['Total Volume', `${(data.sales.totalVolumeML / 1000).toFixed(2)} L`],
      ['Subtotal Amount', `₹${data.sales.subTotalAmount.toFixed(2)}`],
      ['Total Discount', `₹${data.sales.totalDiscountAmount.toFixed(2)}`],
      ['Total Amount', `₹${data.sales.totalAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Payment Breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Breakdown', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Payment Method', 'Amount']],
    body: [
      ['Cash Payments', `₹${data.sales.cashAmount.toFixed(2)}`],
      ['Online Payments', `₹${data.sales.onlineAmount.toFixed(2)}`],
      ['Credit Payments', `₹${data.sales.creditAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Purchase Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Green color
  doc.text('PURCHASE SUMMARY', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Purchase Table
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Purchases', data.purchases.totalPurchases.toString()],
      ['Total Quantity (Bottles)', data.purchases.totalQuantity.toString()],
      ['Total Volume', `${(data.purchases.totalVolumeML / 1000).toFixed(2)} L`],
      ['Total Amount', `₹${data.purchases.totalAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], fontSize: 11 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Vendor-Wise Sales Section
  if (data.vendorSales && data.vendorSales.length > 0) {
    // Add new page if needed
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234); // Purple color
    doc.text('VENDOR-WISE SALES', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    // Show top 5 vendors
    const topVendors = data.vendorSales.slice(0, 5);
    
    for (const vendor of topVendors) {
      // Check if we need a new page
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Vendor header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(vendor.vendorName, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        `Total: ₹${vendor.totalAmount.toFixed(2)} | Qty: ${vendor.totalQuantity}`,
        14,
        yPos + 5
      );
      yPos += 10;

      // Products table
      const productRows = vendor.products.slice(0, 5).map((p) => [
        p.productName,
        p.brand,
        p.quantity.toString(),
        `₹${p.amount.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Brand', 'Qty', 'Amount']],
        body: productRows,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], fontSize: 9 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 37, halign: 'right' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    if (data.vendorSales.length > 5) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `... and ${data.vendorSales.length - 5} more vendor(s)`,
        14,
        yPos
      );
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }
  }

  // Net Profit Section
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  const profitColor = data.netProfit >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.rect(14, yPos, 182, 15, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET PROFIT / LOSS', 20, yPos + 10);
  doc.setFontSize(16);
  doc.text(`₹${data.netProfit.toFixed(2)}`, 190, yPos + 10, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Footer
  yPos += 25;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-IN')}`,
    105,
    yPos,
    { align: 'center' }
  );
  doc.text(
    'This is a system-generated report',
    105,
    yPos + 4,
    { align: 'center' }
  );

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      287,
      { align: 'center' }
    );
  }

  // Convert to Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
