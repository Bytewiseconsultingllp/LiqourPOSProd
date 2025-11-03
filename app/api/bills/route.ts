import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
import { NextRequest, NextResponse } from 'next/server';

import { getBillModel } from '@/models/Bill';

/**
 * GET /api/bills
 * Fetch all bills with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');
    const customerType = searchParams.get('customerType');

    // Register models    
    const connection = await getTenantConnection(user.organizationId);
    const Bill = getBillModel(connection);

    // Build query
    const query: any = { organizationId: user.organizationId };

    if (customerId) {
      query.customerId = customerId;
    }

    if (customerType) {
      query.customerType = customerType;
    }

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.saleDate.$lte = new Date(endDate);
      }
    }

    const bills = await Bill.find(query)
      .sort({ saleDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: bills,
      count: bills.length,
    });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
