import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import Organization from '@/models/Organization';
import { verifyAccessToken } from '@/lib/auth';

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

// POST - Sync organization data from main DB to tenant DB
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    // Connect to main database
    await connectToDatabase();
    
    // Get organization from main database
    const organization = await Organization.findById(user.organizationId);
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found in main database' },
        { status: 404 }
      );
    }

    // Get tenant connection and OrgDetails model
    const tenantConnection = await getTenantConnection(user.organizationId);
    const OrgDetails = getTenantModel(tenantConnection, 'OrgDetails');

    // Check if OrgDetails already exists
    let orgDetails = await OrgDetails.findOne({ organizationId: user.organizationId });

    if (orgDetails) {
      return NextResponse.json({
        success: true,
        message: 'Organization details already exist in tenant database',
        data: orgDetails,
      });
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

    return NextResponse.json({
      success: true,
      message: 'Organization details synced successfully to tenant database',
      data: orgDetails,
    });
  } catch (error: any) {
    console.error('Error syncing organization:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to sync organization data', details: error.message },
      { status: 500 }
    );
  }
}
