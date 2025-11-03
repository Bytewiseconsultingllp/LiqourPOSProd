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

  // 1. TOTAL SALES SUMMARY
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('1. TOTAL SALES SUMMARY', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Total Sale Amount (MRP)', `₹${data.sales.subTotalAmount.toFixed(2)}`],
      ['Total Discount Amount', `₹${data.sales.totalDiscountAmount.toFixed(2)}`],
      ['Total Final Amount', `₹${data.sales.totalAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Payment Mode', 'Amount']],
    body: [
      ['Cash', `₹${data.sales.cashAmount.toFixed(2)}`],
      ['Online', `₹${data.sales.onlineAmount.toFixed(2)}`],
      ['Credit', `₹${data.sales.creditAmount.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 2. CATEGORY-WISE SALES
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('2. CATEGORY-WISE SALES REPORT', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.categorySales && data.categorySales.length > 0) {
    const categoryRows = data.categorySales.map((cat) => [
      cat.category,
      `₹${cat.subTotal.toFixed(2)}`,
      `₹${cat.discount.toFixed(2)}`,
      `₹${cat.finalAmount.toFixed(2)}`,
      `₹${cat.cashAmount.toFixed(2)}`,
      `₹${cat.onlineAmount.toFixed(2)}`,
      `₹${cat.creditAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'MRP', 'Discount', 'Final', 'Cash', 'Online', 'Credit']],
      body: categoryRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25, halign: 'left' },
        2: { cellWidth: 25, halign: 'left' },
        3: { cellWidth: 25, halign: 'left' },
        4: { cellWidth: 22, halign: 'left' },
        5: { cellWidth: 22, halign: 'left' },
        6: { cellWidth: 23, halign: 'left' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // 3. CREDIT GIVEN
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('3. CREDIT GIVEN (Individual Customer-Wise)', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.creditGiven && data.creditGiven.length > 0) {
    const creditGivenRows = data.creditGiven.map((cust) => [
      cust.customerName,
      `₹${cust.creditAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Customer Name', 'Credit Amount']],
      body: creditGivenRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 62, halign: 'left' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    const totalCreditGiven = data.creditGiven.reduce((sum, c) => sum + c.creditAmount, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Credit Given: ₹${totalCreditGiven.toFixed(2)}`, 14, yPos + 5);
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No credit given today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 4. CREDIT COLLECTED
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('4. CREDIT COLLECTED (Individual Customer-Wise)', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.creditCollected && data.creditCollected.customerWise.length > 0) {
    const creditCollectedRows = data.creditCollected.customerWise.map((cust) => [
      cust.customerName,
      `₹${cust.cashAmount.toFixed(2)}`,
      `₹${cust.onlineAmount.toFixed(2)}`,
      `₹${cust.totalAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Customer Name', 'Cash', 'Online', 'Total']],
      body: creditCollectedRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], fontSize: 10 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: 'left' },
        2: { cellWidth: 30, halign: 'left' },
        3: { cellWidth: 32, halign: 'left' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total Credit Collected: ₹${data.creditCollected.totalAmount.toFixed(2)} (Cash: ₹${data.creditCollected.cashAmount.toFixed(2)}, Online: ₹${data.creditCollected.onlineAmount.toFixed(2)})`,
      14,
      yPos + 5
    );
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No credit collected today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 5. EXPENSES
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text('5. EXPENSES', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  if (data.expenses && data.expenses.byCategory.length > 0) {
    const expenseRows = data.expenses.byCategory.map((exp) => [
      exp.category,
      `₹${exp.amount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: expenseRows,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], fontSize: 10 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 62, halign: 'left' },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total Expenses: ₹${data.expenses.totalAmount.toFixed(2)} (Cash: ₹${data.expenses.cashAmount.toFixed(2)}, Online: ₹${data.expenses.onlineAmount.toFixed(2)})`,
      14,
      yPos + 5
    );
    yPos += 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('No expenses recorded today', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // 6. VERIFICATION
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('6. VERIFICATION', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Total Sales (Cash + Online + Credit)', `₹${data.verification.totalSalesReceived.toFixed(2)}`],
      ['Total Expenses', `₹${data.verification.totalExpenses.toFixed(2)}`],
      ['Total Credit Collected', `₹${data.verification.totalCreditCollected.toFixed(2)}`],
      ['Net Cash Flow', `₹${data.verification.netCashFlow.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    columnStyles: {
      1: { halign: 'left' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Highlight Net Cash Flow
  const cashFlowColor = data.verification.netCashFlow >= 0 ? [22, 163, 74] : [220, 38, 38];
  doc.setFillColor(cashFlowColor[0], cashFlowColor[1], cashFlowColor[2]);
  doc.rect(14, yPos, 182, 12, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('NET CASH FLOW', 20, yPos + 8);
  doc.text(`₹${data.verification.netCashFlow.toFixed(2)}`, 160, yPos + 8, { align: 'left' });
  doc.setTextColor(0, 0, 0);

  yPos += 20;

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