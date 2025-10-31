import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Tenant from '@/models/Tenant';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const tenants = await Tenant.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: tenants,
      count: tenants.length,
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const tenant = await Tenant.create(body);

    return NextResponse.json(
      {
        success: true,
        data: tenant,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Tenant with this subdomain or domain already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
