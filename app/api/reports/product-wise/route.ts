import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
    
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
    endDate.setHours(3, 59, 59, 999);    const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');

    // Fetch all bills in the date range
    const bills = await Bill.find({
      organizationId: user.organizationId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Group by product
    const productMap = new Map();

    for (const bill of bills) {
      for (const item of bill.items) {
        const productKey = item.productId;

        if (!productMap.has(productKey)) {
          productMap.set(productKey, {
            productId: item.productId,
            productName: item.productName,
            brand: item.brand,
            category: item.category,
            volumePerUnitML: item.volumePerUnitML,
            totalQuantity: 0,
            totalVolumeML: 0,
            totalAmount: 0,
            billCount: 0,
            billIds: new Set(),
          });
        }

        const productData = productMap.get(productKey);
        productData.totalQuantity += item.quantity;
        productData.totalVolumeML += item.quantity * item.volumePerUnitML;
        productData.totalAmount += item.finalAmount;
        productData.billIds.add((bill as any)._id.toString());
      }
    }

    // Format response
    const result = Array.from(productMap.values()).map((product) => ({
      productId: product.productId,
      productName: product.productName,
      brand: product.brand,
      category: product.category,
      volumePerUnitML: product.volumePerUnitML,
      totalQuantity: product.totalQuantity,
      totalVolumeML: product.totalVolumeML,
      totalAmount: product.totalAmount,
      billCount: product.billIds.size,
    }));

    // Sort by total amount descending
    result.sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching product-wise report:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch product-wise report' },
      { status: 500 }
    );
  }
}
