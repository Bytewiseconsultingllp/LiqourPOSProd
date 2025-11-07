import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const singleBarcodeSchema = z.object({
  code: z.string().min(1, 'Barcode code is required'),
});

const multipleBarcodeSchema = z.object({
  barcodes: z.array(z.string().min(1, 'Barcode cannot be empty')).min(1, 'At least one barcode is required'),
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
 * ✅ POST /api/products/[id]/barcodes
 * Handles adding one or multiple barcodes to a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Determine if input is single or multiple
    let barcodes: string[] = [];

    if ('barcodes' in body) {
      const validation = multipleBarcodeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }
      barcodes = validation.data.barcodes;
    } else if ('code' in body) {
      const validation = singleBarcodeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }
      barcodes = [validation.data.code];
    } else {
      return NextResponse.json(
        { error: 'Invalid request: must include either "code" or "barcodes" field' },
        { status: 400 }
      );
    }

    // Register all models
    registerAllModels();

    // Tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const ProductDetails = getTenantModel(tenantConnection, 'Product');

    // Find product
    const product = await ProductDetails.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    product.barcodes = product.barcodes || [];

    const existingCodes = new Set(product.barcodes.map((b: any) => b.code));
    const newBarcodes = [];
    const skippedBarcodes = [];

    for (const code of barcodes) {
      if (existingCodes.has(code)) {
        skippedBarcodes.push(code);
        continue;
      }

      const barcodeEntry = {
        code,
        createdAt: new Date(),
        createdBy: user.userId,
      };
      product.barcodes.push(barcodeEntry);
      newBarcodes.push(barcodeEntry);
    }

    if (newBarcodes.length > 0) {
      await product.save();
    }

    console.log(
      `✅ Added ${newBarcodes.length} new barcode(s) to product: ${product.name}`
    );

    return NextResponse.json({
      success: true,
      message: 'Barcodes processed successfully',
      data: {
        added: newBarcodes,
        skipped: skippedBarcodes,
        totalAdded: newBarcodes.length,
        totalSkipped: skippedBarcodes.length,
      },
    });
  } catch (error: any) {
    console.error('Error adding barcodes:', error);

    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add barcodes' },
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
