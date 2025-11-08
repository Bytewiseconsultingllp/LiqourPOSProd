import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const connection = await getTenantConnection(tenantId);
    // Using tenant-registered 'Product' model
    const ProductDetails = getTenantModel(connection, 'Product');

    const product = await ProductDetails.findById(params.id).lean();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const connection = await getTenantConnection(tenantId);
    // Using tenant-registered 'Product' model
    const ProductDetails = getTenantModel(connection, 'Product');

    // Handle purchase price update separately
    const { purchasePriceUpdate, ...updateData } = body;
    
    // If purchase price update is provided, add it to the purchasePricePerUnit array
    if (purchasePriceUpdate) {
      const product = await ProductDetails.findById(params.id);
      if (product) {
        if (!product.purchasePricePerUnit) {
          product.purchasePricePerUnit = [];
        }
        product.purchasePricePerUnit.push(purchasePriceUpdate);
        await product.save();
      }
    }

    const product = await ProductDetails.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const connection = await getTenantConnection(tenantId);
    // Using tenant-registered 'Product' model
    const ProductDetails = getTenantModel(connection, 'Product');

    // Soft delete by setting isActive to false
    const product = await ProductDetails.findByIdAndDelete(
      {_id:(params.id)},
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
