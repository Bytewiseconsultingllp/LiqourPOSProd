import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['Retail', 'Wholesale', 'Walk-In', 'B2B']).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    gstin: z.string().optional(),
  }).optional(),
  maxDiscountPercentage: z.number().min(0).max(100).optional(),
  walletBalance: z.number().min(0).optional(),
  openingBalance: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  outstandingBalance: z.number().min(0).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

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

/**
 * PUT /api/customers/[id] - Update a customer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = updateCustomerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Register models first
    registerAllModels();

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Check if customer exists
    const existingCustomer = await Customer.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      params.id,
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    console.log(`✅ Customer updated in tenant database: ${updatedCustomer.name}`);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id] - Delete a customer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);

    // Register models first
    registerAllModels();

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Check if customer exists
    const existingCustomer = await Customer.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer has outstanding balance
    if (existingCustomer.outstandingBalance && existingCustomer.outstandingBalance > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with outstanding balance' },
        { status: 400 }
      );
    }

    // Delete customer
    await Customer.findByIdAndDelete(params.id);

    console.log(`✅ Customer deleted from tenant database: ${existingCustomer.name}`);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
