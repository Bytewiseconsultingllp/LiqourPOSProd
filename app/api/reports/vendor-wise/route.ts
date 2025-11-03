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
    const Vendor = getTenantModel(tenantConnection, 'Vendor');

    // Fetch all bills in the date range
    const bills = await Bill.find({
      organizationId: user.organizationId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    // Group by vendor
    const vendorMap = new Map();

    for (const bill of bills) {
      for (const item of bill.items) {
        if (!item.vendorId) continue;

        if (!vendorMap.has(item.vendorId)) {
          vendorMap.set(item.vendorId, {
            vendorId: item.vendorId,
            vendorName: '',
            totalQuantity: 0,
            totalAmount: 0,
            totalVolumeML: 0,
            billCount: 0,
            billIds: new Set(),
            products: new Map(),
          });
        }

        const vendorData = vendorMap.get(item.vendorId);
        vendorData.totalQuantity += item.quantity;
        vendorData.totalAmount += item.finalAmount;
        vendorData.totalVolumeML += item.quantity * item.volumePerUnitML;
        vendorData.billIds.add((bill as any)._id.toString());

        // Track products
        const productKey = item.productId;
        if (!vendorData.products.has(productKey)) {
          vendorData.products.set(productKey, {
            productId: item.productId,
            productName: item.productName,
            brand: item.brand,
            category: item.category,
            quantity: 0,
            volumePerUnitML: item.volumePerUnitML,
            totalVolumeML: 0,
            amount: 0,
          });
        }

        const productData = vendorData.products.get(productKey);
        productData.quantity += item.quantity;
        productData.totalVolumeML += item.quantity * item.volumePerUnitML;
        productData.amount += item.finalAmount;
      }
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

    // Format response
    const result = Array.from(vendorMap.values()).map((vendor) => ({
      vendorId: vendor.vendorId,
      vendorName: vendorNameMap.get(vendor.vendorId) || 'Unknown Vendor',
      totalQuantity: vendor.totalQuantity,
      totalAmount: vendor.totalAmount,
      totalVolumeML: vendor.totalVolumeML,
      billCount: vendor.billIds.size,
      products: Array.from(vendor.products.values()),
    }));

    // Sort by total amount descending
    result.sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching vendor-wise report:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor-wise report' },
      { status: 500 }
    );
  }
}
