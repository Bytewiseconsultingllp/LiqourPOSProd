import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';
import { registerAllModels } from '@/lib/model-registry';
import { getVendorStockModel } from '@/models/VendorStock';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { productId } = params;

    registerAllModels();
    
    // Get tenant connection and models
    const connection = await getTenantConnection(tenantId);
    const VendorStock = getVendorStockModel(connection);
    
    console.log("productId", productId);
    
    // Get vendor stocks for this product
    const vendorStocks = await VendorStock.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          currentStock: { $gt: 0 }, // Only stocks with currentStock > 0
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      {
        $unwind: '$vendor',
      },
      {
        $project: {
          vendorId: '$vendorId',
          vendorName: '$vendor.name',
          quantity: '$currentStock', // Map currentStock to quantity
          pricePerUnit: '$lastPurchasePrice', // Use lastPurchasePrice
        },
      },
      {
        $sort: { quantity: -1 }, // Sort by quantity descending (priority)
      },
    ]);
    
    console.log("vendorStocks found:", vendorStocks.length);

    return NextResponse.json({
      success: true,
      data: vendorStocks,
    });
  } catch (error: any) {
    console.error('Error fetching vendor stocks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vendor stocks' },
      { status: 500 }
    );
  }
}
