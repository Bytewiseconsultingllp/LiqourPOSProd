import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

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
    endDate.setHours(3, 59, 59, 999);

    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');

    // Fetch all bills in the date range
    const bills = await Bill.find({
      organizationId: user.organizationId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Group by category
    const categoryMap = new Map();

    for (const bill of bills) {
      for (const item of bill.items) {
        const category = item.category || 'Uncategorized';

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            totalQuantity: 0,
            totalVolumeML: 0,
            totalAmount: 0,
            productCount: 0,
            products: new Set(),
            billCount: 0,
            billIds: new Set(),
          });
        }

        const categoryData = categoryMap.get(category);
        categoryData.totalQuantity += item.quantity;
        categoryData.totalVolumeML += item.quantity * item.volumePerUnitML;
        categoryData.totalAmount += item.finalAmount;
        categoryData.products.add(item.productId);
        categoryData.billIds.add((bill as any)._id.toString());
      }
    }

    // Format response
    const result = Array.from(categoryMap.values()).map((cat) => ({
      category: cat.category,
      totalQuantity: cat.totalQuantity,
      totalVolumeML: cat.totalVolumeML,
      totalAmount: cat.totalAmount,
      productCount: cat.products.size,
      billCount: cat.billIds.size,
    }));

    // Sort by total amount descending
    result.sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching category-wise report:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch category-wise report' },
      { status: 500 }
    );
  }
}
