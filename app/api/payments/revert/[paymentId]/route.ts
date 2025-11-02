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

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();
    const { customerId } = body;
    const paymentId = params.paymentId;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Payment = getTenantModel(tenantConnection, 'Payment');
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Get payment
    const payment = await Payment.findOne({
      _id: paymentId,
      organizationId: user.organizationId,
      isReverted: false,
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found or already reverted' },
        { status: 404 }
      );
    }

    // Get customer
    const customer = await Customer.findOne({
      _id: customerId,
      organizationId: user.organizationId,
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Mark payment as reverted
    payment.isReverted = true;
    payment.revertedAt = new Date();
    payment.revertedBy = user.userId;
    await payment.save();

    // Add amount back to customer's outstanding balance
    customer.outstandingBalance += payment.totalAmount;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: 'Payment reverted successfully',
    });
  } catch (error: any) {
    console.error('Error reverting payment:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to revert payment' },
      { status: 500 }
    );
  }
}
