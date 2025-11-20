import { closeTenantConnection } from '@/lib/mongoose';
import { generateQuickReportPDF } from '@/lib/pdf-generator';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { NextRequest, NextResponse } from 'next/server';

function getUserFromToken(request: NextRequest): any {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token');
  }

  const token = authHeader.substring(7);
  const { verifyAccessToken } = require('@/lib/auth');
  const payload = verifyAccessToken(token);

  if (!payload) {
    throw new Error('Invalid token');
  }

  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }

    // Calculate date range: date 4:00 AM to date+1 3:59:59.999 AM
    const startDate = new Date(date);
    startDate.setHours(4, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(3, 59, 59, 999);

    const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');
    const Purchase = getTenantModel(tenantConnection, 'Purchase');
    const Expense = getTenantModel(tenantConnection, 'Expense');
    const Payment = getTenantModel(tenantConnection, 'Payment');
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Fetch sales bills
    const bills = await Bill.find({
      organizationId: user.organizationId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Fetch purchases
    const purchases = await Purchase.find({
      organizationId: user.organizationId,
      purchaseDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Fetch expenses
    const expenses = await Expense.find({
      organizationId: user.organizationId,
      expenseDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Fetch credit payments collected
    const creditPayments = await Payment.find({
      organizationId: user.organizationId,
      paymentDate: {
        $gte: startDate,
        $lte: endDate,
      },
      isReverted: { $ne: true },
    }).lean();

    // Calculate sales summary
    let salesSummary = {
      totalBills: bills.length,
      totalQuantity: 0,
      totalVolumeML: 0,
      subTotalAmount: 0,
      totalDiscountAmount: 0,
      totalAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      creditAmount: 0,
      averageBillValue: 0,
    };

    // Category-wise sales map
    const categoryMap = new Map<string, {
      category: string;
      subTotal: number;
      discount: number;
      finalAmount: number;
      cashAmount: number;
      onlineAmount: number;
      creditAmount: number;
      // internal accumulator before bill-level discount allocation
      __baseFinal: number;
    }>();

    // Customer-wise credit given map
    const creditGivenMap = new Map();

    for (const bill of bills) {
      salesSummary.totalQuantity += bill.totalQuantityBottles || 0;
      salesSummary.totalVolumeML += bill.totalVolumeML || 0;
      salesSummary.subTotalAmount += bill.subTotalAmount || 0;
      
      // Calculate total discount correctly
      const itemDiscount = bill.itemDiscountAmount || 0;
      const billDiscount = bill.billDiscountAmount || 0;
      const promotionDiscount = bill.promotionDiscountAmount || 0;
      salesSummary.totalDiscountAmount += itemDiscount + billDiscount + promotionDiscount;
      
      salesSummary.totalAmount += bill.totalAmount || 0;
      salesSummary.cashAmount += bill.payment?.cashAmount || 0;
      salesSummary.onlineAmount += bill.payment?.onlineAmount || 0;
      salesSummary.creditAmount += bill.payment?.creditAmount || 0;

      // Category-wise breakdown (item-level)
      let billBaseFinalSum = 0;
      for (const item of bill.items || []) {
        const category = item.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            subTotal: 0,
            discount: 0,
            finalAmount: 0,
            cashAmount: 0,
            onlineAmount: 0,
            creditAmount: 0,
            __baseFinal: 0,
          });
        }
        const catData = categoryMap.get(category)!;
        const itemSubTotal = (item.quantity || 0) * (item.rate || 0);
        const itemItemDisc = Number(item.itemDiscountAmount || 0);
        const itemPromoDisc = Number(item.promotionDiscountAmount || 0);
        const itemStoredDisc = Number(item.discountAmount || 0);
        // Prefer explicit item components, fallback to stored total
        const itemDiscount = (itemItemDisc + itemPromoDisc) > 0 ? (itemItemDisc + itemPromoDisc) : itemStoredDisc;
        const itemBaseFinal = Math.max(0, itemSubTotal - itemDiscount);

        catData.subTotal += itemSubTotal;
        catData.discount += itemDiscount;
        catData.__baseFinal += itemBaseFinal;
        billBaseFinalSum += itemBaseFinal;
      }

      // Allocate bill-level discounts proportionally to categories
      const billLevelDiscount = Number(bill.billDiscountAmount || 0);
      if (billLevelDiscount > 0 && billBaseFinalSum > 0) {
        categoryMap.forEach((catData) => {
          const catShare = catData.__baseFinal / billBaseFinalSum;
          const alloc = billLevelDiscount * catShare;
          catData.discount += alloc;
          catData.__baseFinal = Math.max(0, catData.__baseFinal - alloc);
        });
      }

      // Finalize category totals and allocate payments using baseFinal proportions
      const billFinalTotal = Math.max(1, bill.totalAmount || 0);
      categoryMap.forEach((catData) => {
        catData.finalAmount += catData.__baseFinal;
        const proportion = catData.__baseFinal / billFinalTotal;
        catData.cashAmount += (bill.payment?.cashAmount || 0) * proportion;
        catData.onlineAmount += (bill.payment?.onlineAmount || 0) * proportion;
        catData.creditAmount += (bill.payment?.creditAmount || 0) * proportion;
        // cleanup internal field
        // @ts-ignore
        delete (catData as any).__baseFinal;
      });

      // Customer-wise credit given
      if (bill.payment?.creditAmount && bill.payment.creditAmount > 0) {
        const customerId = bill.customerId || 'walk-in';
        const customerName = bill.customerName || 'Walk-in Customer';
        if (!creditGivenMap.has(customerName)) {
          creditGivenMap.set(customerName, {
            customerId,
            customerName,
            creditAmount: 0,
          });
        }
        creditGivenMap.get(customerName).creditAmount += bill.payment.creditAmount;
      }
    }

    // Calculate purchase summary
    let purchaseSummary = {
      totalPurchases: purchases.length,
      totalQuantity: 0,
      totalVolumeML: 0,
      totalAmount: 0,
    };

    for (const purchase of purchases) {
      purchaseSummary.totalQuantity += purchase.totalQuantity || 0;
      purchaseSummary.totalVolumeML += purchase.totalVolumeML || 0;
      purchaseSummary.totalAmount += purchase.totalAmount || 0;
    }

    // Calculate expense summary
    let expenseSummary = {
      totalExpenses: expenses.length,
      totalAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      categories: new Map(),
    };

    for (const expense of expenses) {
      expenseSummary.totalAmount += expense.amount || 0;
      if (expense.paymentMode === 'Cash') {
        expenseSummary.cashAmount += expense.amount || 0;
      } else if (expense.paymentMode === 'Online') {
        expenseSummary.onlineAmount += expense.amount || 0;
      }

      // Category-wise expenses
      const category = expense.categoryName || 'Uncategorized';
      if (!expenseSummary.categories.has(category)) {
        expenseSummary.categories.set(category, 0);
      }
      expenseSummary.categories.set(
        category,
        expenseSummary.categories.get(category) + expense.amount
      );
    }

    // Calculate credit collected summary
    let creditCollectedSummary = {
      totalPayments: creditPayments.length,
      totalAmount: 0,
      cashAmount: 0,
      onlineAmount: 0,
      customerWise: new Map(),
    };

    for (const payment of creditPayments) {
      creditCollectedSummary.totalAmount += payment.totalAmount || 0;
      creditCollectedSummary.cashAmount += payment.cashAmount || 0;
      creditCollectedSummary.onlineAmount += payment.onlineAmount || 0;

      // Customer-wise credit collected
      const inferredCustomerId = payment.customerId?.toString?.();
      const customerKey = inferredCustomerId || `${payment.customerName || 'Unknown'}-${payment._id?.toString?.() || Math.random().toString(36).slice(2)}`;
      const customerName = payment.customerName || 'Unknown Customer';

      if (!creditCollectedSummary.customerWise.has(customerKey)) {
        creditCollectedSummary.customerWise.set(customerKey, {
          customerId: inferredCustomerId || null,
          customerName,
          totalAmount: 0,
          cashAmount: 0,
          onlineAmount: 0,
        });
      }

      const custData = creditCollectedSummary.customerWise.get(customerKey);
      custData.totalAmount += payment.totalAmount || 0;
      custData.cashAmount += payment.cashAmount || 0;
      custData.onlineAmount += payment.onlineAmount || 0;
    }

    // Calculate vendor-wise sales
    const vendorMap = new Map();
    for (const bill of bills) {
      for (const item of bill.items) {
        if (!vendorMap.has(item.vendorId)) {
          vendorMap.set(item.vendorId, {
            vendorId: item.vendorId,
            vendorName: '',
            products: new Map(),
            totalAmount: 0,
            totalQuantity: 0,
          });
        }
        const vendorData = vendorMap.get(item.vendorId);
        vendorData.totalAmount += item.finalAmount;
        vendorData.totalQuantity += item.quantity;

        // Track products
        const productKey = item.productId;
        if (!vendorData.products.has(productKey)) {
          vendorData.products.set(productKey, {
            productName: item.productName,
            brand: item.brand,
            quantity: 0,
            amount: 0,
          });
        }
        const productData = vendorData.products.get(productKey);
        productData.quantity += item.quantity;
        productData.amount += item.finalAmount;
      }
    }

    // Get vendor names
    const Vendor = getTenantModel(tenantConnection, 'Vendor');
    const vendorIds = Array.from(vendorMap.keys());
    const vendors = await Vendor.find({
      _id: { $in: vendorIds },
      organizationId: user.organizationId,
    }).lean();

    const vendorNameMap = new Map();
    vendors.forEach((v: any) => {
      vendorNameMap.set(v._id.toString(), v.name);
    });

    // Format vendor data
    const vendorSales = Array.from(vendorMap.values()).map((vendor) => ({
      vendorName: vendorNameMap.get(vendor.vendorId) || 'Unknown Vendor',
      totalAmount: vendor.totalAmount,
      totalQuantity: vendor.totalQuantity,
      products: Array.from(vendor.products.values()).map((p: any) => ({
        productName: p.productName,
        brand: p.brand,
        quantity: p.quantity,
        amount: p.amount,
      })).sort((a, b) => b.amount - a.amount),
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    // Format category-wise sales
    const categorySales = Array.from(categoryMap.values()).sort(
      (a, b) => b.finalAmount - a.finalAmount
    );

    // Format credit given
    const creditGiven = Array.from(creditGivenMap.values()).sort(
      (a, b) => b.creditAmount - a.creditAmount
    );

    // Format credit collected
    const creditCollected = Array.from(creditCollectedSummary.customerWise.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    // Format expenses by category
    const expensesByCategory = Array.from(expenseSummary.categories.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate average bill value
    if (bills.length > 0) {
      salesSummary.averageBillValue = salesSummary.totalAmount / bills.length;
    }

    // Create report data
    const reportData = {
      reportDate: date,
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      sales: salesSummary,
      categorySales,
      creditGiven,
      creditCollected: {
        totalAmount: creditCollectedSummary.totalAmount,
        cashAmount: creditCollectedSummary.cashAmount,
        onlineAmount: creditCollectedSummary.onlineAmount,
        customerWise: creditCollected,
      },
      expenses: {
        totalAmount: expenseSummary.totalAmount,
        cashAmount: expenseSummary.cashAmount,
        onlineAmount: expenseSummary.onlineAmount,
        byCategory: expensesByCategory,
      },
      purchases: purchaseSummary,
      vendorSales,
      verification: {
        totalSalesReceived: salesSummary.cashAmount + salesSummary.onlineAmount + salesSummary.creditAmount,
        totalExpenses: expenseSummary.totalAmount,
        totalCreditCollected: creditCollectedSummary.totalAmount,
        netCashFlow: (salesSummary.cashAmount + salesSummary.onlineAmount) - expenseSummary.totalAmount + creditCollectedSummary.totalAmount,
        openingCash: 0, // Can be set from organization settings
        closingCash: (salesSummary.cashAmount + creditCollectedSummary.cashAmount) - expenseSummary.cashAmount,
      },
    };
    // Generate PDF
    const pdfBuffer = generateQuickReportPDF(reportData);

    closeTenantConnection(user.organizationId);
    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quick_Report_${date}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating quick report:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate quick report' },
      { status: 500 }
    );
  }
}
