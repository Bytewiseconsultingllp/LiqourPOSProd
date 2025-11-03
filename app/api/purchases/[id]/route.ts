import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';
import { getPurchaseModel } from '@/models/Purchase';
import { getVendorStockModel } from '@/models/VendorStock';
import mongoose from 'mongoose';

/**
 * GET /api/purchases/[id]
 * Fetch a single purchase by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connection = await getTenantConnection(user.organizationId);
    const Purchase = getPurchaseModel(connection);

    const purchase = await Purchase.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).lean();

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: purchase,
    });
  } catch (error: any) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch purchase' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/purchases/[id]
 * Update a purchase with transaction support
 * - Reverts old product and vendor stocks
 * - Applies new product and vendor stocks
 * - Validates against morningStockLastUpdatedDate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: mongoose.ClientSession | null = null;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, taxAmount, paidAmount, notes, invoiceNumber } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid purchase data. Items are required.' },
        { status: 400 }
      );
    }

    // Register models first
    registerAllModels();
    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Purchase = getPurchaseModel(connection);
    const VendorStock = getVendorStockModel(connection);
    const Product = getTenantModel(connection, 'Product');

    // Fetch existing purchase
    const existingPurchase = await Purchase.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).session(session).read('primary');

    if (!existingPurchase) {
      throw new Error('Purchase not found');
    }

    // Check if purchase date is before any product's morningStockLastUpdatedDate
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.morningStockLastUpdatedDate && 
          new Date(existingPurchase.purchaseDate) < new Date(product.morningStockLastUpdatedDate)) {
        throw new Error(
          `Cannot edit purchase. Purchase date (${new Date(existingPurchase.purchaseDate).toLocaleDateString()}) is before product "${product.name}" morning stock last updated date (${new Date(product.morningStockLastUpdatedDate).toLocaleDateString()})`
        );
      }
    }

    // Step 1: Revert old stock changes
    for (const oldItem of existingPurchase.items) {
      // Revert product stock (subtract the old quantity)
      await Product.findByIdAndUpdate(
        oldItem.productId,
        {
          $inc: { currentStock: -oldItem.quantity },
        },
        { session }
      );

      // Revert vendor stock
      await VendorStock.findOneAndUpdate(
        {
          vendorId: existingPurchase.vendorId,
          productId: oldItem.productId,
          organizationId: user.organizationId,
        },
        {
          $inc: { currentStock: -oldItem.quantity },
        },
        { session }
      );
    }

    // Step 2: Apply new stock changes and process items
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { productId, quantity, purchasePricePerUnit, batchNumber, expiryDate } = item;

      if (!productId || !quantity || quantity <= 0 || !purchasePricePerUnit || purchasePricePerUnit < 0) {
        throw new Error('Invalid item data. Product, quantity, and price are required.');
      }

      // Fetch product details
      const product = await Product.findOne({
        _id: productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const totalAmount = quantity * purchasePricePerUnit;
      subtotal += totalAmount;

      // Update product stock
      await Product.findByIdAndUpdate(
        productId,
        {
          $inc: { currentStock: quantity },
          $push: {
            purchasePricePerUnit: {
              purchasePrice: purchasePricePerUnit,
              batchNumber: batchNumber || undefined,
              effectiveFrom: existingPurchase.purchaseDate,
              createdAt: new Date(),
            },
          },
        },
        { session }
      );

      // Update or create vendor stock
      const vendorStock = await VendorStock.findOne({
        vendorId: existingPurchase.vendorId,
        productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (vendorStock) {
        // Update existing vendor stock
        await VendorStock.findByIdAndUpdate(
          vendorStock._id,
          {
            $inc: { currentStock: quantity },
            lastPurchasePrice: purchasePricePerUnit,
            lastPurchaseDate: existingPurchase.purchaseDate,
          },
          { session }
        );
      } else {
        // Create new vendor stock
        await VendorStock.create(
          [
            {
              vendorId: existingPurchase.vendorId,
              productId,
              productName: product.name,
              brand: product.brand,
              volumeML: product.volumeML,
              currentStock: quantity,
              lastPurchasePrice: purchasePricePerUnit,
              lastPurchaseDate: existingPurchase.purchaseDate,
              organizationId: user.organizationId,
            },
          ],
          { session }
        );
      }

      processedItems.push({
        productId,
        productName: product.name,
        brand: product.brand,
        volumeML: product.volumeML,
        quantity,
        purchasePricePerUnit,
        totalAmount,
        batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      });
    }

    const totalAmount = subtotal + (taxAmount || 0);
    const dueAmount = totalAmount - (paidAmount || 0);
    
    let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (paidAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    // Update purchase
    const updatedPurchase = await Purchase.findByIdAndUpdate(
      params.id,
      {
        items: processedItems,
        subtotal,
        taxAmount: taxAmount || 0,
        totalAmount,
        paymentStatus,
        paidAmount: paidAmount || 0,
        dueAmount,
        notes,
        invoiceNumber,
      },
      { session, new: true }
    );

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      data: updatedPurchase,
      message: 'Purchase updated successfully',
    });
  } catch (error: any) {
    // Rollback transaction on error
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    console.error('Error updating purchase:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update purchase' },
      { status: 500 }
    );
  } finally {
    // End session
    if (session) {
      try {
        session.endSession();
      } catch (endError) {
        console.error('Error ending session:', endError);
      }
    }
  }
}
