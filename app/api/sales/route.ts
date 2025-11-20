import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { getBillModel } from '@/models/Bill';
import { closeTenantConnection } from '@/lib/mongoose';

/**
 * GET /api/sales
 * Fetch recent sales/bills
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const connection = await getTenantConnection(tenantId);
    const Bill = getBillModel(connection);

    const sales = await Bill.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Bill.countDocuments({});

    closeTenantConnection(tenantId);
    return NextResponse.json({
      success: true,
      data: sales,
      count: sales.length,
      total,
      hasMore: skip + sales.length < total,
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}
