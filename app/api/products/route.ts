import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { getVendorModel } from '@/models/Vendor';
import { getVendorStockModel } from '@/models/VendorStock';

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
  noOfBottlesPerCaret: z.number().min(0).optional(),
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
    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const ProductDetails = getTenantModel(tenantConnection, 'Product'); // Using ProductDetails type with 'Product' collection

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
    const products = await ProductDetails.find(query)
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
    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const ProductDetails = getTenantModel(tenantConnection, 'Product'); // Using ProductDetails type with 'Product' collection

    // Check if SKU already exists
    const existingProduct = await ProductDetails.findOne({
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
    const product = await ProductDetails.create({
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

    // Create vendor stock for vendor with priority 1
    try {
      const Vendor = getVendorModel(tenantConnection);
      const priority1Vendor = await Vendor.findOne({
        organizationId: user.organizationId,
        vendorPriority: 1,
        isActive: true,
      }).sort({ createdAt: 1 });

      if (priority1Vendor) {
        const VendorStock = getVendorStockModel(tenantConnection);
        await VendorStock.create({
          vendorId: priority1Vendor._id,
          productId: product._id,
          productName: product.name,
          brand: product.brand,
          volumeML: product.volumeML,
          currentStock: validation.data.currentStock || 0,
          lastPurchasePrice: validation.data.pricePerUnit || 0,
          lastPurchaseDate: new Date(),
          organizationId: user.organizationId,
        });
        console.log(`✅ Vendor stock created for vendor: ${priority1Vendor.name}`);
      } else {
        console.log('⚠️ No priority 1 vendor found, skipping vendor stock creation');
      }
    } catch (vendorStockError: any) {
      console.error('Error creating vendor stock:', vendorStockError);
      // Don't fail the product creation if vendor stock fails
    }

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
