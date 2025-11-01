import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const productPurchasePriceSchema = z.object({
  purchasePrice: z.number().min(0),
  batchNumber: z.string().optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

const taxInfoSchema = z.object({
  vat: z.number().min(0).optional(),
  tcs: z.number().min(0).optional(),
  gst: z.number().min(0).optional(),
  cess: z.number().min(0).optional(),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  currentStock: z.number().min(0, 'Stock must be non-negative'),
  volumeML: z.number().min(0, 'Volume must be positive'),
  reorderLevel: z.number().min(0).optional(),
  morningStock: z.number().min(0).optional(),
  morningStockLastUpdatedDate: z.string().optional(),
  eveningStock: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0, 'Price must be positive'),
  purchasePricePerUnit: z.array(productPurchasePriceSchema).optional(),
  taxInfo: taxInfoSchema.optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  bottlesPerCaret: z.number().min(0).optional(),
  noOfCarets: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  location: z.string().optional(),
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
 * GET /api/products - List all products for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Register all models first
    registerAllModels();

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Product = getTenantModel(tenantConnection, 'Product');

    // Build query
    const query: any = { organizationId: user.organizationId };
    
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

    // Execute query
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const body = await request.json();

    // Validate input
    const validation = productSchema.safeParse(body);
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
    const Product = getTenantModel(tenantConnection, 'Product');

    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      sku: validation.data.sku,
      organizationId: user.organizationId,
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
      organizationId: user.organizationId,
      isActive: true,
    });

    // Log inventory transaction
    const InventoryTransaction = getTenantModel(tenantConnection, 'InventoryTransaction');
    await InventoryTransaction.create({
      productId: product._id,
      type: 'adjustment',
      quantity: validation.data.currentStock,
      previousStock: 0,
      newStock: validation.data.currentStock,
      reason: 'Initial stock',
      performedBy: user.userId,
      organizationId: user.organizationId,
    });

    console.log(`✅ Product created in tenant database: ${product.name}`);

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: product,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
