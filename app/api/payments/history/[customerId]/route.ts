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
    const customerId = params.customerId;

    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Payment = getTenantModel(tenantConnection, 'Payment');

    const payments = await Payment.find({
      organizationId: user.organizationId,
      customerId: customerId,
      isReverted: false,
    })
      .sort({ paymentDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
