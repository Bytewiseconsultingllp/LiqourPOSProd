import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import Organization from '@/models/Organization';
import { verifyAccessToken } from '@/lib/auth';

const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().optional(),
  gstNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  panNumber: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

// Helper to get user from token
function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    throw new Error('Invalid token');
  }

  return payload;
}

// GET - Get organization details
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    // Get tenant connection and OrgDetails model
    const tenantConnection = await getTenantConnection(user.organizationId);
    const OrgDetails = getTenantModel(tenantConnection, 'OrgDetails');

    let orgDetails = await OrgDetails.findOne({ organizationId: user.organizationId });

    // If OrgDetails doesn't exist in tenant DB, create it from main DB (migration fallback)
    if (!orgDetails) {
      console.log(`OrgDetails not found for ${user.organizationId}, syncing from main database...`);
      
      // Connect to main database and get organization
      await connectToDatabase();
      const organization = await Organization.findById(user.organizationId);

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Create OrgDetails in tenant database
      orgDetails = await OrgDetails.create({
        organizationId: user.organizationId,
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        pincode: organization.pincode,
        country: organization.country || 'India',
        gstNumber: organization.gstNumber,
        licenseNumber: organization.licenseNumber,
        fssaiNumber: organization.fssaiNumber,
        panNumber: organization.panNumber,
        website: organization.website,
        qrCodes: [], // Initialize with empty QR codes array
      });

      console.log(`✅ OrgDetails created for ${organization.name}`);
    }

    return NextResponse.json({
      success: true,
      data: orgDetails,
    });
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// PUT - Update organization details
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Only org_admin can update organization details
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only organization admins can update organization details' },
        { status: 403 }
      );
    }

    // Validate input
    const validation = updateOrganizationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get tenant connection and OrgDetails model
    const tenantConnection = await getTenantConnection(user.organizationId);
    const OrgDetails = getTenantModel(tenantConnection, 'OrgDetails');

    // Check if organization details exist
    const orgDetails = await OrgDetails.findOne({ organizationId: user.organizationId });

    if (!orgDetails) {
      return NextResponse.json(
        { error: 'Organization details not found' },
        { status: 404 }
      );
    }

    // Update organization details
    const updatedOrg = await OrgDetails.findOneAndUpdate(
      { organizationId: user.organizationId },
      { $set: validation.data },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      data: updatedOrg,
    });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
