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
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      );
    }

    // Calculate date range: fromDate 4:00 AM to toDate+1 3:59:59.999 AM
    const startDate = new Date(fromDate);
    startDate.setHours(4, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(3, 59, 59, 999); const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');

    // Fetch all bills in the date range
    const bills = await Bill.find({
      organizationId: user.organizationId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Calculate summary
    let totalBills = bills.length;
    let totalQuantity = 0;
    let totalVolumeML = 0;
    let subTotalAmount = 0;
    let totalDiscountAmount = 0;
    let totalAmount = 0;
    let cashAmount = 0;
    let onlineAmount = 0;
    let creditAmount = 0;

    const productMap = new Map();
    const categoryMap = new Map();

    for (const bill of bills) {
      totalQuantity += bill.totalQuantityBottles || 0;
      totalVolumeML += bill.totalVolumeML || 0;
      subTotalAmount += bill.subTotalAmount || 0;
      totalDiscountAmount += bill.totalDiscountAmount || 0;
      totalAmount += bill.totalAmount || 0;
      cashAmount += bill.payment?.cashAmount || 0;
      onlineAmount += bill.payment?.onlineAmount || 0;
      creditAmount += bill.payment?.creditAmount || 0;

      // Track products
      for (const item of bill.items) {
        const productKey = item.productId;
        if (!productMap.has(productKey)) {
          productMap.set(productKey, {
            productName: item.productName,
            quantity: 0,
            amount: 0,
          });
        }
        const productData = productMap.get(productKey);
        productData.quantity += item.quantity;
        productData.amount += item.finalAmount;

        // Track categories
        const category = item.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            quantity: 0,
            amount: 0,
          });
        }
        const categoryData = categoryMap.get(category);
        categoryData.quantity += item.quantity;
        categoryData.amount += item.finalAmount;
      }
    }

    // Get top 5 products
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get top 5 categories
    const topCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        totalBills,
        totalQuantity,
        totalVolumeML,
        subTotalAmount,
        totalDiscountAmount,
        totalAmount,
        cashAmount,
        onlineAmount,
        creditAmount,
        topProducts,
        topCategories,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales summary:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales summary' },
      { status: 500 }
    );
  }
}
