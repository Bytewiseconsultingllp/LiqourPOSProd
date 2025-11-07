import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';

const updateQRCodeSchema = z.object({
  name: z.string().min(1).optional(),
  imageBase64: z.string().min(1).optional(),
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

// GET - Get single QR code
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    
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

    const qrCode = orgDetails.qrCodes.id(params.id);

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: qrCode,
    });
  } catch (error: any) {
    console.error('Error fetching QR code:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch QR code' },
      { status: 500 }
    );
  }
}

// PUT - Update QR code
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = updateQRCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

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

    const qrCode = orgDetails.qrCodes.id(params.id);

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    const { name, imageBase64, isDefault } = validation.data;

    // If name is being changed, check for duplicates
    if (name && name !== qrCode.name) {
      const existingQR = orgDetails.qrCodes.find(
        (qr: any) => qr.name === name && qr._id.toString() !== params.id
      );

      if (existingQR) {
        return NextResponse.json(
          { error: 'A QR code with this name already exists' },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      orgDetails.qrCodes.forEach((qr: any) => {
        if (qr._id.toString() !== params.id) {
          qr.isDefault = false;
        }
      });
    }

    // Update QR code
    if (name) qrCode.name = name;
    if (imageBase64) qrCode.imageBase64 = imageBase64;
    if (isDefault !== undefined) qrCode.isDefault = isDefault;

    await orgDetails.save();

    return NextResponse.json({
      success: true,
      message: 'QR code updated successfully',
      data: qrCode,
    });
  } catch (error: any) {
    console.error('Error updating QR code:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update QR code' },
      { status: 500 }
    );
  }
}

// DELETE - Delete QR code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    
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

    const qrCode = orgDetails.qrCodes.id(params.id);

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of default QR code
    if (qrCode.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default QR code. Please set another QR code as default first.' },
        { status: 400 }
      );
    }

    // Remove QR code from array
    qrCode.deleteOne();
    await orgDetails.save();

    return NextResponse.json({
      success: true,
      message: 'QR code deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting QR code:', error);
    
    if (error.message.includes('token') || error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete QR code' },
      { status: 500 }
    );
  }
}
