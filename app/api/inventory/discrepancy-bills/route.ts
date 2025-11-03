import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';
import { getBillModel } from '@/models/Bill';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    // Get tenant connection and models
    const connection = await getTenantConnection(tenantId);
    const Bill = getBillModel(connection);

    // Count total discrepancy bills
    const total = await Bill.countDocuments({
      totalBillId: { $regex: /^DISC-/ },
      organizationId: tenantId,
    });

    // Fetch recent discrepancy bills (bills with totalBillId starting with "DISC-")
    const discrepancyBills = await Bill.find({
      totalBillId: { $regex: /^DISC-/ },
      organizationId: tenantId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: discrepancyBills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error: any) {
    console.error('Error fetching discrepancy bills:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch discrepancy bills' },
      { status: 500 }
    );
  }
}
