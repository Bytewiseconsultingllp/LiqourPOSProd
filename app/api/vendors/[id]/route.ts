import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }).optional(),
  gstin: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankDetails: z.object({
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    ifscCode: z.string().optional(),
  }).optional(),
  tin: z.string().optional(),
  cin: z.string().optional(),
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();
    const validation = updateVendorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Vendor = getTenantModel(tenantConnection, 'Vendor');
    const existingVendor = await Vendor.findOne({ _id: params.id, organizationId: user.organizationId });
    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    const updatedVendor = await Vendor.findByIdAndUpdate(params.id, { $set: validation.data }, { new: true, runValidators: true });
    console.log(`✅ Vendor updated: ${updatedVendor.name}`);
    return NextResponse.json({ success: true, data: updatedVendor, message: 'Vendor updated successfully' });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromToken(request);
    registerAllModels();
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Vendor = getTenantModel(tenantConnection, 'Vendor');
    const existingVendor = await Vendor.findOne({ _id: params.id, organizationId: user.organizationId });
    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    await Vendor.findByIdAndDelete(params.id);
    console.log(`✅ Vendor deleted: ${existingVendor.name}`);
    return NextResponse.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete vendor' }, { status: 500 });
  }
}
