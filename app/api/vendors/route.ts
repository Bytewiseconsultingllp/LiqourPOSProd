import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactInfo: z.object({
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email'),
    address: z.string().min(1, 'Address is required'),
  }),
  gstin: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankDetails: z.object({
    accountName: z.string().min(1, 'Account name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    ifscCode: z.string().min(1, 'IFSC code is required'),
  }),
  tin: z.string().min(1, 'TIN is required'),
  cin: z.string().min(1, 'CIN is required'),
  vendorPriority: z.number().min(0).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

function getUserFromToken(request: NextRequest): any {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('No authorization token');
  const token = authHeader.substring(7);
  const { verifyAccessToken } = require('@/lib/auth');
  const payload = verifyAccessToken(token);
  if (!payload) throw new Error('Invalid token');
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Vendor = getTenantModel(tenantConnection, 'Vendor');
    const vendors = await Vendor.find({ organizationId: user.organizationId }).sort({ vendorPriority: -1, name: 1 }).lean();
    return NextResponse.json({ success: true, data: vendors, count: vendors.length });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();
    const validation = vendorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Vendor = getTenantModel(tenantConnection, 'Vendor');
    const existingVendor = await Vendor.findOne({ 'contactInfo.email': validation.data.contactInfo.email, organizationId: user.organizationId });
    if (existingVendor) {
      return NextResponse.json({ error: 'A vendor with this email already exists' }, { status: 409 });
    }
    const vendor = await Vendor.create({ ...validation.data, organizationId: user.organizationId, isActive: validation.data.isActive ?? true });
    console.log(`✅ Vendor created: ${vendor.name}`);
    return NextResponse.json({ success: true, message: 'Vendor created successfully', data: vendor }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create vendor' }, { status: 500 });
  }
}
