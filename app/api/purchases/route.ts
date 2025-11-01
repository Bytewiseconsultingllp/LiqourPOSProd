import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
import { getPurchaseModel } from '@/models/Purchase';
import { getVendorStockModel } from '@/models/VendorStock';
import { getVendorModel } from '@/models/Vendor';
import mongoose from 'mongoose';

/**
 * GET /api/purchases
 * Fetch all purchases with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentStatus = searchParams.get('paymentStatus');

    const connection = await getTenantConnection(user.organizationId);
    const Purchase = getPurchaseModel(connection);

    // Build query
    const query: any = { organizationId: user.organizationId };
    
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) {
        query.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.purchaseDate.$lte = new Date(endDate);
      }
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const purchases = await Purchase.find(query)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: purchases,
      count: purchases.length,
    });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchases
 * Create a new purchase entry with transaction support
 */
export async function POST(request: NextRequest) {
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
    const { vendorId, purchaseDate, items, taxAmount, paidAmount, notes, invoiceNumber } = body;

    // Validation
    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid purchase data. Vendor and items are required.' },
        { status: 400 }
      );
    }

    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Purchase = getPurchaseModel(connection);
    const VendorStock = getVendorStockModel(connection);
    const Vendor = getVendorModel(connection);

    // Get Product model dynamically
    const Product = connection.models.Product || connection.model('Product');

    // Verify vendor exists
    const vendor = await Vendor.findOne({
      _id: vendorId,
      organizationId: user.organizationId,
    }).session(session);

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Generate unique purchase number
    const purchaseCount = await Purchase.countDocuments({
      organizationId: user.organizationId,
    }).session(session);
    const purchaseNumber = `PUR-${Date.now()}-${String(purchaseCount + 1).padStart(4, '0')}`;

    // Process each item and update stocks
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
      }).session(session);

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
              effectiveFrom: purchaseDate || new Date(),
              createdAt: new Date(),
            },
          },
        },
        { session }
      );

      // Update or create vendor stock
      const vendorStock = await VendorStock.findOne({
        vendorId,
        productId,
        organizationId: user.organizationId,
      }).session(session);

      if (vendorStock) {
        // Update existing vendor stock
        await VendorStock.findByIdAndUpdate(
          vendorStock._id,
          {
            $inc: { currentStock: quantity },
            lastPurchasePrice: purchasePricePerUnit,
            lastPurchaseDate: purchaseDate || new Date(),
          },
          { session }
        );
      } else {
        // Create new vendor stock
        await VendorStock.create(
          [
            {
              vendorId,
              productId,
              productName: product.name,
              brand: product.brand,
              volumeML: product.volumeML,
              currentStock: quantity,
              lastPurchasePrice: purchasePricePerUnit,
              lastPurchaseDate: purchaseDate || new Date(),
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

    // Create purchase record
    const purchase = await Purchase.create(
      [
        {
          purchaseNumber,
          vendorId,
          vendorName: vendor.name,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          items: processedItems,
          subtotal,
          taxAmount: taxAmount || 0,
          totalAmount,
          paymentStatus,
          paidAmount: paidAmount || 0,
          dueAmount,
          notes,
          invoiceNumber,
          organizationId: user.organizationId,
          createdBy: user.userId,
        },
      ],
      { session }
    );

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      data: purchase[0],
      message: 'Purchase created successfully',
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
    
    console.error('Error creating purchase:', error);
    
    // Check for MongoDB transaction conflicts
    if (error.code === 112 || error.codeName === 'WriteConflict') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction conflict. Please try again.',
          details: 'The system is busy processing another request. Please retry in a moment.'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create purchase' },
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
