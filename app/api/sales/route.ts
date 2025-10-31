import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/mongoose';
import { getSaleModel } from '@/models/Sale';
import { getProductModel } from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');

    const connection = await getTenantConnection(tenantId);
    const Sale = getSaleModel(connection.connection);

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Sale.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: sales,
      count: sales.length,
      total,
      hasMore: skip + sales.length < total,
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const Sale = getSaleModel(connection.connection);
    const Product = getProductModel(connection.connection);

    // Validate and update stock for each item
    for (const item of body.items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // Update stock
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stockQuantity: -item.quantity },
      });
    }

    // Generate sale number
    const saleCount = await Sale.countDocuments();
    const saleNumber = `SALE-${Date.now()}-${saleCount + 1}`;

    const sale = await Sale.create({
      ...body,
      saleNumber,
    });

    return NextResponse.json(
      {
        success: true,
        data: sale,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
