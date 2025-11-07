import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';

const qrCodeSchema = z.object({
  name: z.string().min(1, 'QR Code name is required'),
  imageBase64: z.string().min(1, 'QR Code image is required'),
  isDefault: z.boolean().optional(),
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

// GET - List all QR codes for organization
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    // Get tenant connection and OrgDetails model
    const tenantConnection = await getTenantConnection(user.organizationId);
    const OrgDetails = getTenantModel(tenantConnection, 'OrgDetails');

    const orgDetails = await OrgDetails.findOne({ organizationId: user.organizationId });

    if (!orgDetails) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    return NextResponse.json({
      success: true,
      data: orgDetails.qrCodes || [],
    });
  } catch (error: any) {
    console.error('Error fetching QR codes:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    );
  }
}

// POST - Create new QR code
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = qrCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, imageBase64, isDefault } = validation.data;

    // Get tenant connection and OrgDetails model
    const tenantConnection = await getTenantConnection(user.organizationId);
    const OrgDetails = getTenantModel(tenantConnection, 'OrgDetails');

    const orgDetails = await OrgDetails.findOne({ organizationId: user.organizationId });

    if (!orgDetails) {
      return NextResponse.json(
        { error: 'Organization details not found' },
        { status: 404 }
      );
    }

    // Check if a QR code with this name already exists
    const existingQR = orgDetails.qrCodes.find((qr: any) => qr.name === name);
    if (existingQR) {
      return NextResponse.json(
        { error: 'A QR code with this name already exists' },
        { status: 409 }
      );
    }

    // If this is being set as default, unset all other defaults
    if (isDefault) {
      orgDetails.qrCodes.forEach((qr: any) => {
        qr.isDefault = false;
      });
    }

    // Add new QR code
    orgDetails.qrCodes.push({
      name,
      imageBase64,
      isDefault: isDefault || false,
    });

    await orgDetails.save();

    // Get the newly added QR code
    const newQR = orgDetails.qrCodes[orgDetails.qrCodes.length - 1];

    return NextResponse.json(
      {
        success: true,
        message: 'QR code created successfully',
        data: newQR,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating QR code:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create QR code' },
      { status: 500 }
    );
  }
}
