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
    const Purchase = getTenantModel(tenantConnection, 'Purchase');
    const Vendor = getTenantModel(tenantConnection, 'Vendor');

    // Fetch all purchases in the date range
    const purchases = await Purchase.find({
      organizationId: user.organizationId,
      purchaseDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Calculate summary
    let totalPurchases = purchases.length;
    let totalQuantity = 0;
    let totalVolumeML = 0;
    let totalAmount = 0;

    const productMap = new Map();
    const vendorMap = new Map();

    for (const purchase of purchases) {
      totalQuantity += purchase.totalQuantity || 0;
      totalVolumeML += purchase.totalVolumeML || 0;
      totalAmount += purchase.totalAmount || 0;

      // Track products
      for (const item of purchase.items) {
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
        productData.amount += item.totalAmount;
      }

      // Track vendors
      const vendorId = purchase.vendorId;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          vendorName: '',
          quantity: 0,
          amount: 0,
        });
      }
      const vendorData = vendorMap.get(vendorId);
      vendorData.quantity += purchase.totalQuantity || 0;
      vendorData.amount += purchase.totalAmount || 0;
    }

    // Fetch vendor names
    const vendorIds = Array.from(vendorMap.keys());
    const vendors = await Vendor.find({
      _id: { $in: vendorIds },
      organizationId: user.organizationId,
    }).lean();

    const vendorNameMap = new Map();
    vendors.forEach((v: any) => {
      vendorNameMap.set(v._id.toString(), v.name);
    });

    // Update vendor names
    vendorMap.forEach((value, key) => {
      value.vendorName = vendorNameMap.get(key) || 'Unknown Vendor';
    });

    // Get top 5 products
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get top 5 vendors
    const topVendors = Array.from(vendorMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(({ vendorId, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: {
        totalPurchases,
        totalQuantity,
        totalVolumeML,
        totalAmount,
        topProducts,
        topVendors,
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchase summary:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchase summary' },
      { status: 500 }
    );
  }
}
