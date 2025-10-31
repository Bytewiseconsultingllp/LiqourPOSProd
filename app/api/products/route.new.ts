import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantContext, getModel } from '@/lib/tenant-middleware';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0).optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  minStock: z.number().int().min(0, 'Minimum stock must be non-negative'),
  unit: z.enum(['bottle', 'case', 'pack', 'unit']),
});

/**
 * GET /api/products - List all products for the tenant
 */
export const GET = withTenantContext(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const Product = getModel(context, 'Product');

    // Build query
    const query: any = { organizationId: context.organizationId };
    
    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/products - Create a new product
 */
export const POST = withTenantContext(async (request, context) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = productSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const Product = getModel(context, 'Product');

    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      sku: validation.data.sku,
      organizationId: context.organizationId,
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 409 }
      );
    }

    // Create product
    const product = await Product.create({
      ...validation.data,
      organizationId: context.organizationId,
    });

    // Log inventory transaction
    const InventoryTransaction = getModel(context, 'InventoryTransaction');
    await InventoryTransaction.create({
      productId: product._id,
      type: 'adjustment',
      quantity: validation.data.stock,
      previousStock: 0,
      newStock: validation.data.stock,
      reason: 'Initial stock',
      performedBy: context.userId,
      organizationId: context.organizationId,
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: product,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
});
