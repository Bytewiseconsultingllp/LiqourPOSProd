import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const barcodeSchema = z.object({
  code: z.string().min(1, 'Barcode is required'),
});

/**
 * Extract user info from JWT token
 */
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
 * POST /api/products/[id]/barcodes - Add a new barcode to product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = barcodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Register all models first
    registerAllModels();

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const ProductDetails = getTenantModel(tenantConnection, 'Product');

    // Find product
    const product = await ProductDetails.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if barcode already exists for this product
    const barcodeExists = product.barcodes?.some(
      (b: any) => b.code === validation.data.code
    );

    if (barcodeExists) {
      return NextResponse.json(
        { error: 'This barcode already exists for this product' },
        { status: 409 }
      );
    }

    // Add new barcode
    const newBarcode = {
      code: validation.data.code,
      createdAt: new Date(),
      createdBy: user.userId,
    };

    product.barcodes = product.barcodes || [];
    product.barcodes.push(newBarcode);
    await product.save();

    console.log(`✅ Barcode added to product: ${product.name}`);

    return NextResponse.json({
      success: true,
      message: 'Barcode added successfully',
      data: newBarcode,
    });
  } catch (error: any) {
    console.error('Error adding barcode:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add barcode' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]/barcodes - Delete a barcode from product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const { searchParams } = new URL(request.url);
    const barcodeCode = searchParams.get('code');

    if (!barcodeCode) {
      return NextResponse.json(
        { error: 'Barcode code is required' },
        { status: 400 }
      );
    }

    // Register all models first
    registerAllModels();

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const ProductDetails = getTenantModel(tenantConnection, 'Product');

    // Find product
    const product = await ProductDetails.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Remove barcode
    const initialLength = product.barcodes?.length || 0;
    product.barcodes = product.barcodes?.filter(
      (b: any) => b.code !== barcodeCode
    ) || [];

    if (product.barcodes.length === initialLength) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      );
    }

    await product.save();

    console.log(`✅ Barcode removed from product: ${product.name}`);

    return NextResponse.json({
      success: true,
      message: 'Barcode deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting barcode:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete barcode' },
      { status: 500 }
    );
  }
}
