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

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();
    const { customerId, cashAmount, onlineAmount, totalAmount } = body;

    if (!customerId || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment data' },
        { status: 400 }
      );
    }

    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Customer = getTenantModel(tenantConnection, 'Customer');
    const Payment = getTenantModel(tenantConnection, 'Payment');

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

    // Check if payment exceeds outstanding balance
    if (totalAmount > customer.outstandingBalance) {
      return NextResponse.json(
        { error: 'Payment amount exceeds outstanding balance' },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = await Payment.create({
      customerId: customer._id,
      customerName: customer.name,
      cashAmount: cashAmount || 0,
      onlineAmount: onlineAmount || 0,
      totalAmount,
      paymentDate: new Date(),
      organizationId: user.organizationId,
      createdBy: user.userId,
      isReverted: false,
    });

    // Update customer outstanding balance
    customer.outstandingBalance -= totalAmount;
    await customer.save();

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment collected successfully',
    });
  } catch (error: any) {
    console.error('Error collecting payment:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to collect payment' },
      { status: 500 }
    );
  }
}
