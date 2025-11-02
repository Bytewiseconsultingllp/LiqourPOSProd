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

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const user = getUserFromToken(request);
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const customerId = params.customerId;

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Bill = getTenantModel(tenantConnection, 'Bill');

    const bills = await Bill.find({
      organizationId: user.organizationId,
      customerId: customerId,
      saleDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ saleDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: bills,
    });
  } catch (error: any) {
    console.error('Error fetching customer bills:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}
