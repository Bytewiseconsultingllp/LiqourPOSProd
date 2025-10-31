import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantContext, getModel } from '@/lib/tenant-middleware';
import { Types } from 'mongoose';

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'upi']),
  totalAmount: z.number().min(0),
});

/**
 * GET /api/sales - List all sales for the tenant
 */
export const GET = withTenantContext(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const Sale = getModel(context, 'Sale');

    // Build query
    const query: any = { organizationId: context.organizationId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    // Calculate summary stats
    const stats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 },
          averageSale: { $avg: '$totalAmount' },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: sales,
      stats: stats[0] || { totalRevenue: 0, totalSales: 0, averageSale: 0 },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/sales - Create a new sale
 */
export const POST = withTenantContext(async (request, context) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = saleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const Product = getModel(context, 'Product');
    const Sale = getModel(context, 'Sale');
    const InventoryTransaction = getModel(context, 'InventoryTransaction');
    const User = getModel(context, 'User');

    // Get user info
    const user = await User.findById(context.userId).lean();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate products and stock
    const saleItems = [];
    const inventoryUpdates = [];

    for (const item of validation.data.items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 }
        );
      }

      // Prepare sale item
      saleItems.push({
        productId: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price,
      });

      // Prepare inventory update
      inventoryUpdates.push({
        product,
        quantity: item.quantity,
      });
    }

    // Create sale
    const sale = await Sale.create({
      items: saleItems,
      totalAmount: validation.data.totalAmount,
      customerName: validation.data.customerName,
      customerPhone: validation.data.customerPhone,
      paymentMethod: validation.data.paymentMethod,
      soldBy: context.userId,
      soldByName: user.name,
      organizationId: context.organizationId,
      status: 'completed',
    });

    // Update inventory and create transactions
    for (const update of inventoryUpdates) {
      const previousStock = update.product.stock;
      const newStock = previousStock - update.quantity;

      // Update product stock
      await Product.findByIdAndUpdate(update.product._id, {
        stock: newStock,
      });

      // Create inventory transaction
      await InventoryTransaction.create({
        productId: update.product._id,
        type: 'sale',
        quantity: -update.quantity,
        previousStock,
        newStock,
        referenceId: sale._id,
        referenceType: 'Sale',
        performedBy: context.userId,
        organizationId: context.organizationId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sale completed successfully',
      data: sale,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sale' },
      { status: 500 }
    );
  }
});
