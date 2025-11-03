import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import mongoose from 'mongoose';
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

    // Group by vendor (use item.vendorId as the key)
    const vendorMap = new Map<string, any>();

    for (const bill of bills) {
      const billId = (bill as any)._id.toString();

      for (const item of bill.items || []) {
        const vendorId = item.vendorId;
        if (!vendorId) continue; // skip if item has no vendor

        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendorId,
            vendorName: '',
            totalQuantity: 0,
            totalAmount: 0,
            totalVolumeML: 0,
            billIds: new Set<string>(),
            products: new Map<string, any>(),
          });
        }

        const vendorData = vendorMap.get(vendorId);

        // Aggregate vendor totals from items
        vendorData.totalQuantity += item.quantity || 0;
        vendorData.totalAmount += (item.subTotal || 0) - (item.itemDiscountAmount || 0) - (item.discountAmount || 0)-(item.promotionDiscountAmount || 0);
        vendorData.totalVolumeML += (item.quantity || 0) * (item.volumePerUnitML || 0);
        vendorData.billIds.add(billId);

        // Track products under this vendor
        const productKey = item.productId;
        if (!vendorData.products.has(productKey)) {
          vendorData.products.set(productKey, {
            productId: item.productId,
            productName: item.productName,
            brand: item.brand,
            category: item.category,
            quantity: item.quantity || 0,
            volumePerUnitML: item.volumePerUnitML || 0,
            totalVolumeML: (item.quantity || 0) * (item.volumePerUnitML || 0),
            amount: item.finalAmount || 0,
          });
        } else {
          const productData = vendorData.products.get(productKey);
          productData.quantity += item.quantity || 0;
          productData.totalVolumeML += (item.quantity || 0) * (item.volumePerUnitML || 0);
          productData.amount += item.finalAmount || 0;
        }
      }
    }


    // Fetch vendor names
    const vendorIds = Array.from(vendorMap.keys()).filter(Boolean);
    // Convert to ObjectId where possible
    const vendorObjectIds = vendorIds
      .map((id: any) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((v): v is mongoose.Types.ObjectId => !!v);

    const vendors = await Vendor.find({
      _id: { $in: vendorObjectIds },
      organizationId: user.organizationId,
    }).lean();

    const vendorNameMap = new Map();
    vendors.forEach((v: any) => {
      vendorNameMap.set(v._id.toString(), v.name);
    });

    // Format response
    const result = Array.from(vendorMap.values()).map((vendor: any) => ({
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
