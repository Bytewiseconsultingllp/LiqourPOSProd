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
    endDate.setHours(3, 59, 59, 999); const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');
    const Purchase = getTenantModel(tenantConnection, 'Purchase');

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
    };

    for (const bill of bills) {
      salesSummary.totalQuantity += bill.totalQuantityBottles || 0;
      salesSummary.totalVolumeML += bill.totalVolumeML || 0;
      salesSummary.subTotalAmount += bill.subTotalAmount || 0;
      salesSummary.totalDiscountAmount += bill.totalDiscountAmount || 0;
      salesSummary.totalAmount += bill.totalAmount || 0;
      salesSummary.cashAmount += bill.payment?.cashAmount || 0;
      salesSummary.onlineAmount += bill.payment?.onlineAmount || 0;
      salesSummary.creditAmount += bill.payment?.creditAmount || 0;
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

    // Create report data
    const reportData = {
      reportDate: date,
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      sales: salesSummary,
      purchases: purchaseSummary,
      vendorSales,
      netProfit: salesSummary.totalAmount - purchaseSummary.totalAmount,
    };

    // Generate PDF
    const pdfBuffer = generateQuickReportPDF(reportData);

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
