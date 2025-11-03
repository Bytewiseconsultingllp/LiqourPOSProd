import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  type: z.enum(['Retail', 'Wholesale', 'Walk-In', 'B2B']),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    gstin: z.string().optional(),
  }),
  maxDiscountPercentage: z.number().min(0).max(100).optional(),
  walletBalance: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  outstandingBalance: z.number().min(0).optional(),
  openingBalance: z.number().optional(),
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
 * GET /api/customers - List all customers
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Register models first
    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Build query
    const query: any = { organizationId: user.organizationId };
    
    if (type && type !== 'all') {
      query.type = type;
    }

    // Execute query
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers - Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = customerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Register models first
    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Customer = getTenantModel(tenantConnection, 'Customer');

    // Check if customer with same email already exists
    const existingCustomer = await Customer.findOne({
      'contactInfo.email': validation.data.contactInfo.email,
      organizationId: user.organizationId,
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 409 }
      );
    }

    // Create customer
    const customer = await Customer.create({
      ...validation.data,
      organizationId: user.organizationId,
      isActive: validation.data.isActive ?? true,
    });

    console.log(`✅ Customer created in tenant database: ${customer.name}`);

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
