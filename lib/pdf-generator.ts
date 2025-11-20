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
  averageBillValue: number;
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

interface CategorySales {
  category: string;
  subTotal: number;
  discount: number;
  finalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
}

interface CreditGiven {
  customerId: string;
  customerName: string;
  creditAmount: number;
}

interface CreditCollected {
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  customerWise: {
    customerId: string;
    customerName: string;
    totalAmount: number;
    cashAmount: number;
    onlineAmount: number;
  }[];
}

interface Expenses {
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  byCategory: {
    category: string;
    amount: number;
  }[];
}

interface Verification {
  totalSalesReceived: number;
  totalExpenses: number;
  totalCreditCollected: number;
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
}

interface QuickReportData {
  reportDate: string;
  period: {
    from: string;
    to: string;
  };
  sales: SalesSummary;
  categorySales: CategorySales[];
  creditGiven: CreditGiven[];
  creditCollected: CreditCollected;
  expenses: Expenses;
  purchases: PurchaseSummary;
  vendorSales: VendorSales[];
  verification: Verification;
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

  // 1. SALES OVERVIEW
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('1. SALES OVERVIEW', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Sales Statistics
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Bills', `${data.sales.totalBills}`],
      ['Total Quantity (Bottles)', `${data.sales.totalQuantity}`],
      ['Total Volume', `${(data.sales.totalVolumeML / 1000).toFixed(2)} L`],
      ['Average Bill Value', `₹${data.sales.averageBillValue.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 92, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Financial Summary
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Subtotal (MRP)', `₹${data.sales.subTotalAmount.toFixed(2)}`],
      ['Less: Discount', `- ₹${data.sales.totalDiscountAmount.toFixed(2)}`],
      ['Net Sales Amount', `₹${data.sales.totalAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 92, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Payment Breakdown
  autoTable(doc, {
    startY: yPos,
    head: [['Payment Mode', 'Amount', 'Percentage']],
    body: [
      [
        'Cash', 
        `₹${data.sales.cashAmount.toFixed(2)}`,
        `${((data.sales.cashAmount / data.sales.totalAmount) * 100).toFixed(1)}%`
      ],
      [
        'Online', 
        `₹${data.sales.onlineAmount.toFixed(2)}`,
        `${((data.sales.onlineAmount / data.sales.totalAmount) * 100).toFixed(1)}%`
      ],
      [
        'Credit', 
        `₹${data.sales.creditAmount.toFixed(2)}`,
        `${((data.sales.creditAmount / data.sales.totalAmount) * 100).toFixed(1)}%`
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 62, halign: 'right' },
      2: { cellWidth: 60, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 2. CATEGORY-WISE SALES
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  // doc.setFontSize(16);
  // doc.setFont('helvetica', 'bold');
  // doc.setTextColor(37, 99, 235);
  // doc.text('2. CATEGORY-WISE SALES REPORT', 14, yPos);
  // doc.setTextColor(0, 0, 0);
  // yPos += 8;

  // if (data.categorySales && data.categorySales.length > 0) {
  //   const categoryRows = data.categorySales.map((cat) => [
  //     cat.category,
  //     `₹${cat.subTotal.toFixed(2)}`,
  //     `₹${cat.discount.toFixed(2)}`,
  //     `₹${cat.finalAmount.toFixed(2)}`,
  //     `₹${cat.cashAmount.toFixed(2)}`,
  //     `₹${cat.onlineAmount.toFixed(2)}`,
  //     `₹${cat.creditAmount.toFixed(2)}`,
  //   ]);

  //   autoTable(doc, {
  //     startY: yPos,
  //     head: [['Category', 'MRP', 'Discount', 'Final', 'Cash', 'Online', 'Credit']],
  //     body: categoryRows,
  //     theme: 'grid',
  //     headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
  //     styles: { fontSize: 8 },
  //     margin: { left: 14, right: 14 },
  //     columnStyles: {
  //       0: { cellWidth: 40 },
  //       1: { cellWidth: 25, halign: 'left' },
  //       2: { cellWidth: 25, halign: 'left' },
  //       3: { cellWidth: 25, halign: 'left' },
  //       4: { cellWidth: 22, halign: 'left' },
  //       5: { cellWidth: 22, halign: 'left' },
  //       6: { cellWidth: 23, halign: 'left' },
  //     },
  //   });
  //   yPos = (doc as any).lastAutoTable.finalY + 15;
  // }

  // 2. CREDIT GIVEN
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('2. CREDIT GIVEN (Customer-Wise)', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.creditGiven && data.creditGiven.length > 0) {
    const creditGivenRows = data.creditGiven.map((cust, index) => [
      (index + 1).toString(),
      cust.customerName || 'Unknown',
      `₹${cust.creditAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Customer Name', 'Credit Amount']],
      body: creditGivenRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38], 
        fontSize: 10, 
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 125, halign: 'left' },
        2: { cellWidth: 45, halign: 'right' },
      },
      didDrawPage: (data) => {
        // Ensure all rows are drawn across pages if needed
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    const totalCreditGiven = data.creditGiven.reduce((sum, c) => sum + c.creditAmount, 0);
    doc.setFillColor(220, 38, 38);
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Total Credit Given: ₹${totalCreditGiven.toFixed(2)}`, 20, yPos + 6);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No credit given today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 3. CREDIT COLLECTED
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('3. CREDIT COLLECTED (Customer-Wise)', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.creditCollected && data.creditCollected.customerWise.length > 0) {
    const creditCollectedRows = data.creditCollected.customerWise.map((cust, index) => [
      (index + 1).toString(),
      cust.customerName || 'Unknown',
      `₹${cust.cashAmount.toFixed(2)}`,
      `₹${cust.onlineAmount.toFixed(2)}`,
      `₹${cust.totalAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Customer Name', 'Cash', 'Online', 'Total']],
      body: creditCollectedRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [22, 163, 74], 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 95, halign: 'left' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
      },
      didDrawPage: (data) => {
        // Ensure all rows are drawn across pages if needed
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Summary box
    doc.setFillColor(22, 163, 74);
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Total: ₹${data.creditCollected.totalAmount.toFixed(2)} | Cash: ₹${data.creditCollected.cashAmount.toFixed(2)} | Online: ₹${data.creditCollected.onlineAmount.toFixed(2)}`,
      20,
      yPos + 6
    );
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No credit collected today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 4. EXPENSES
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text('4. EXPENSES', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.expenses && data.expenses.byCategory.length > 0) {
    const expenseRows = data.expenses.byCategory.map((exp, index) => [
      (index + 1).toString(),
      exp.category || 'Uncategorized',
      `₹${exp.amount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Category', 'Amount']],
      body: expenseRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [147, 51, 234], 
        fontSize: 10, 
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 125, halign: 'left' },
        2: { cellWidth: 45, halign: 'right' },
      },
      didDrawPage: (data) => {
        // Ensure all rows are drawn across pages if needed
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Summary box
    doc.setFillColor(147, 51, 234);
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Total: ₹${data.expenses.totalAmount.toFixed(2)} | Cash: ₹${data.expenses.cashAmount.toFixed(2)} | Online: ₹${data.expenses.onlineAmount.toFixed(2)}`,
      20,
      yPos + 6
    );
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No expenses recorded today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 5. CASH SUMMARY & VERIFICATION
  if (yPos > 180) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('5. CASH SUMMARY & VERIFICATION', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Sales - Cash Received', `₹${data.sales.cashAmount.toFixed(2)}`],
      ['Sales - Online Received', `₹${data.sales.onlineAmount.toFixed(2)}`],
      ['Credit Collected - Cash', `₹${data.creditCollected.cashAmount.toFixed(2)}`],
      ['Credit Collected - Online', `₹${data.creditCollected.onlineAmount.toFixed(2)}`],
      ['Total Cash Inflow', `₹${(data.sales.cashAmount + data.creditCollected.cashAmount).toFixed(2)}`],
      ['Total Online Inflow', `₹${(data.sales.onlineAmount + data.creditCollected.onlineAmount).toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 72, halign: 'right', fontStyle: 'bold' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Expenses - Cash', `₹${data.expenses.cashAmount.toFixed(2)}`],
      ['Expenses - Online', `₹${data.expenses.onlineAmount.toFixed(2)}`],
      ['Total Expenses', `₹${data.expenses.totalAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 72, halign: 'right', fontStyle: 'bold' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Closing Cash in Hand', `₹${data.verification.closingCash.toFixed(2)}`],
      ['Net Cash Flow (Cash+Online-Expenses)', `₹${data.verification.netCashFlow.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 11, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 72, halign: 'right' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Highlight Net Cash Flow
  const cashFlowColor = data.verification.netCashFlow >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(cashFlowColor[0], cashFlowColor[1], cashFlowColor[2]);
  doc.rect(14, yPos, 182, 15, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET CASH FLOW', 20, yPos + 10);
  doc.text(`₹${data.verification.netCashFlow.toFixed(2)}`, 175, yPos + 10, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  yPos += 25;

  // Footer
  if (yPos > 260) {
    doc.addPage();
    yPos = 20;
  }
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