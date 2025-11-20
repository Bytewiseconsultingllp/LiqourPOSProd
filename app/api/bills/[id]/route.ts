import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';
import { getBillModel } from '@/models/Bill';
import { getVendorStockModel } from '@/models/VendorStock';
import mongoose from 'mongoose';
import { closeTenantConnection } from '@/lib/mongoose';

/**
 * GET /api/bills/[id]
 * Fetch a single bill by ID
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
    const Bill = getBillModel(connection);

    const bill = await Bill.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).lean();

    if (!bill) {
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bills/[id]
 * Update a bill with transaction support
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
    const { items, customerName, customerPhone, customerType, customerId, payment, subBills } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid bill data. Items are required.' },
        { status: 400 }
      );
    }

    // Register models first
    registerAllModels();
    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Bill = getBillModel(connection);
    const VendorStock = getVendorStockModel(connection);
    const Product = getTenantModel(connection, 'Product');

    // Fetch existing bill
    const existingBill = await Bill.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).session(session).read('primary');

    if (!existingBill) {
      throw new Error('Bill not found');
    }

    // Check if bill date is before any product's morningStockLastUpdatedDate
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.morningStockLastUpdatedDate && 
          new Date(existingBill.saleDate) < new Date(product.morningStockLastUpdatedDate)) {
        throw new Error(
          `Cannot edit bill. Bill date (${new Date(existingBill.saleDate).toLocaleDateString()}) is before product "${product.name}" morning stock last updated date (${new Date(product.morningStockLastUpdatedDate).toLocaleDateString()})`
        );
      }
    }

    // Step 1: Revert old stock changes
    for (const oldItem of existingBill.items) {
      // Revert product stock
      await Product.findByIdAndUpdate(
        oldItem.productId,
        {
          $inc: { currentStock: oldItem.quantity },
        },
        { session, readPreference: 'primary' }
      );

      // Revert vendor stock
      await VendorStock.findOneAndUpdate(
        {
          vendorId: oldItem.vendorId,
          productId: oldItem.productId,
          organizationId: user.organizationId,
        },
        {
          $inc: { currentStock: oldItem.quantity },
        },
        { session, readPreference: 'primary' }
      );
    }

    // Step 2: Apply new stock changes and process items
    const processedItems = [];
    let totalQuantityBottles = 0;
    let totalVolumeML = 0;
    let subTotalAmount = 0;
    let totalDiscountAmount = 0;
    const vendorIds = new Set<string>();

    for (const item of items) {
      const { productId, vendorId, quantity, rate, discountAmount = 0 } = item;

      if (!productId || !vendorId || !quantity || quantity <= 0 || !rate || rate < 0) {
        throw new Error('Invalid item data. Product, vendor, quantity, and rate are required.');
      }

      // Fetch product details
      const product = await Product.findOne({
        _id: productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Check stock availability
      const vendorStock = await VendorStock.findOne({
        vendorId,
        productId,
        organizationId: user.organizationId,
      }).session(session).read('primary');

      if (!vendorStock || vendorStock.currentStock < quantity) {
        throw new Error(`Insufficient stock for product "${product.name}" from vendor`);
      }

      // Update product stock
      await Product.findByIdAndUpdate(
        productId,
        {
          $inc: { currentStock: -quantity },
        },
        { session }
      );

      // Update vendor stock
      await VendorStock.findOneAndUpdate(
        {
          vendorId,
          productId,
          organizationId: user.organizationId,
        },
        {
          $inc: { currentStock: -quantity },
        },
        { session }
      );

      const subTotal = quantity * rate;
      const finalAmount = subTotal - discountAmount;
      const vatAmount = product.taxInfo?.vat ? (finalAmount * product.taxInfo.vat) / 100 : 0;
      const tcsAmount = product.taxInfo?.tcs ? (finalAmount * product.taxInfo.tcs) / 100 : 0;

      totalQuantityBottles += quantity;
      totalVolumeML += quantity * product.volumeML;
      subTotalAmount += subTotal;
      totalDiscountAmount += discountAmount;
      vendorIds.add(vendorId.toString());

      processedItems.push({
        productId,
        vendorId,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        quantity,
        volumePerUnitML: product.volumeML,
        rate,
        subTotal,
        discountAmount,
        itemDiscountAmount: discountAmount,
        promotionDiscountAmount: 0,
        finalAmount,
        vatAmount,
        tcsAmount,
      });
    }

    const totalAmount = subTotalAmount - totalDiscountAmount;

    // Update bill
    const updatedBill = await Bill.findByIdAndUpdate(
      params.id,
      {
        vendorIds: Array.from(vendorIds),
        customerId,
        customerName,
        customerPhone,
        customerType,
        items: processedItems,
        totalQuantityBottles,
        totalVolumeML,
        subTotalAmount,
        totalDiscountAmount,
        itemDiscountAmount: totalDiscountAmount,
        totalAmount,
        payment,
        subBills: subBills || [],
      },
      { session, new: true }
    );

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    closeTenantConnection(user.organizationId);
    return NextResponse.json({
      success: true,
      data: updatedBill,
      message: 'Bill updated successfully',
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
    
    console.error('Error updating bill:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update bill' },
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
