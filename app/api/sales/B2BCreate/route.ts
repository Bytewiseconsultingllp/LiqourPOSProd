import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getBillModel } from '@/models/Bill';
import { getVendorStockModel } from '@/models/VendorStock';

interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  promotionType: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountAmount: number;
  description?: string;
}

interface CartItem {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  volumePerUnitML: number;
  rate: number;
  subTotal: number;
  discountAmount: number;
  itemDiscountAmount?: number; // Manual item discount
  promotionDiscountAmount?: number; // Promotion discount
  finalAmount: number;
  vatAmount: number;
  tcsAmount: number;
}

interface CreateSaleRequest {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType: 'Walk-In' | 'B2B' | 'Wholesale' | 'Retail';
  items: CartItem[];
  payment: {
    mode: 'Cash' | 'Online' | 'Wallet' | 'Credit' | 'Mixed';
    cashAmount: number;
    onlineAmount: number;
    creditAmount: number;
    totalAmount: number;
    transactionId?: string;
  };
  saleDate?: string;
  // Discount breakdown
  itemDiscountAmount?: number;
  billDiscountAmount?: number;
  promotionDiscountAmount?: number;
  appliedPromotions?: AppliedPromotion[];
  totalAmount: number
}

/**
 * Generate unique bill ID
 * Format: BILL-YYYYMMDD-HHMMSS-RANDOM
 */
function generateBillId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `BILL-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

/**
 * Split bill into sub-bills if total volume > 2500 ML (2.5 L)
 */
function splitBillByVolume(items: any[], payment: any) {
  const MAX_VOLUME_ML = 2500;

  // Calculate total volume
  const totalVolume = items.reduce((sum, item) =>
    sum + (item.volumePerUnitML * item.quantity), 0
  );

  // If total volume <= 2.5L, no split needed
  if (totalVolume <= MAX_VOLUME_ML) {
    return null;
  }

  // Split items into optimized sub-bills
  const subBills: any[] = [];
  let currentSubBill: any[] = [];
  let currentVolume = 0;

  // Sort items by volume (largest first) for better optimization
  const sortedItems = [...items].sort((a, b) =>
    (b.volumePerUnitML * b.quantity) - (a.volumePerUnitML * a.quantity)
  );

  for (const item of sortedItems) {
    const itemVolume = item.volumePerUnitML * item.quantity;

    // If single item exceeds max volume, split the item
    if (itemVolume > MAX_VOLUME_ML) {
      const bottlesPerSubBill = Math.floor(MAX_VOLUME_ML / item.volumePerUnitML);
      let remainingQuantity = item.quantity;

      while (remainingQuantity > 0) {
        const quantityForThisSubBill = Math.min(bottlesPerSubBill, remainingQuantity);
        const subBillItem = {
          ...item,
          quantity: quantityForThisSubBill,
          subTotal: item.rate * quantityForThisSubBill,
          finalAmount: (item.rate * quantityForThisSubBill) - (item.discountAmount * quantityForThisSubBill / item.quantity),
        };

        if (currentSubBill.length > 0) {
          // Finish current sub-bill
          subBills.push([...currentSubBill]);
          currentSubBill = [];
          currentVolume = 0;
        }

        subBills.push([subBillItem]);
        remainingQuantity -= quantityForThisSubBill;
      }
      continue;
    }

    // If adding this item would exceed max volume, start new sub-bill
    if (currentVolume + itemVolume > MAX_VOLUME_ML && currentSubBill.length > 0) {
      subBills.push([...currentSubBill]);
      currentSubBill = [];
      currentVolume = 0;
    }

    currentSubBill.push(item);
    currentVolume += itemVolume;
  }

  // Add remaining items as last sub-bill
  if (currentSubBill.length > 0) {
    subBills.push(currentSubBill);
  }

  // Calculate payment distribution proportionally
  const totalAmount = items.reduce((sum, item) => sum + item.finalAmount, 0);

  return subBills.map(subBillItems => {
    const subBillTotal = subBillItems.reduce((sum: number, item: any) => sum + item.finalAmount, 0);
    const proportion = subBillTotal / totalAmount;

    return {
      items: subBillItems,
      subTotalAmount: subBillItems.reduce((sum: number, item: any) => sum + item.subTotal, 0),
      totalDiscountAmount: subBillItems.reduce((sum: number, item: any) => sum + (item.discountAmount || 0), 0),
      totalAmount: subBillTotal,
      paymentMode: payment.mode,
      cashPaidAmount: payment.cashAmount * proportion,
      onlinePaidAmount: payment.onlineAmount * proportion,
      creditPaidAmount: payment.creditAmount * proportion,
    };
  });
}

export async function POST(request: NextRequest) {
  let session: any = null;

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = request.headers.get('x-tenant-id') || user.organizationId;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const body: CreateSaleRequest = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerType,
      items,
      payment,
      saleDate,
      totalAmount,
      itemDiscountAmount,
      billDiscountAmount,
      promotionDiscountAmount,
      appliedPromotions
    } = body;

    // Validation
    if (!customerName || !items || items.length === 0 || !payment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure models are registered    
    // Get database connection
    const connection = await getTenantConnection(tenantId);
    const Bill = getBillModel(connection);
    const ProductDetails = getTenantModel(connection, 'Product'); // Use ProductDetails with 'Product' collection
    const VendorStock = getVendorStockModel(connection);

    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    // Generate unique bill ID
    const totalBillId = generateBillId();

    // Calculate totals
    const totalQuantityBottles = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalVolumeML = items.reduce((sum, item) => sum + (item.volumePerUnitML * item.quantity), 0);
    const subTotalAmount = items.reduce((sum, item) => sum + item.subTotal, 0);
    const totalDiscountAmount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

    // Calculate total amount after all discounts
    const totalBeforeAdditionalDiscounts = items.reduce((sum, item) => sum + item.finalAmount, 0);
    // const totalAmount = totalBeforeAdditionalDiscounts - (billDiscountAmount || 0) - (promotionDiscountAmount || 0);

    // Process each item: validate stock and assign vendors
    const processedItems = [];
    const vendorIds: string[] = [];

    for (const item of items) {
      // 1. Check product stock
      const product = await ProductDetails.findById(item.productId).session(session).read('primary');
      if (!product) {
        throw new Error(`Product ${item.productName} not found`);
      }

      // Check stock using currentStock field from ProductDetails schema
      const productStock = (product as any).currentStock || 0;
      console.log(`📊 Product ${item.productName} stock: ${productStock}`);

      if (productStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productName}. Available: ${productStock}, Required: ${item.quantity}`);
      }

      // 2. Get vendor stocks (with stock available)
      console.log(`🔍 Looking for vendor stocks for product: ${item.productId}`);
      const vendorStocks = await VendorStock.find({
        productId: Object(item.productId),
        currentStock: { $gt: 0 },
      })
        .populate('vendorId')
        .session(session)
        .read('primary');



      console.log(`📦 Found ${vendorStocks.length} vendor stocks`);

      if (vendorStocks.length === 0) {
        // Try without session to debug
        const debugStocks = await VendorStock.find({
          productId: item.productId,
        });
        console.log(`🐛 Debug: Total stocks for product (no session): ${debugStocks.length}`);
        console.log(`🐛 Debug: Stocks data:`, JSON.stringify(debugStocks, null, 2));
        throw new Error(`No vendor stock available for ${item.productName}`);
      }

      // Sort by vendor priority (1 is highest)
      vendorStocks.sort((a: any, b: any) => {
        const priorityA = a.vendorId?.priority || 999;
        const priorityB = b.vendorId?.priority || 999;
        return priorityA - priorityB;
      });

      // 3. Calculate total available vendor stock
      const totalVendorStock = vendorStocks.reduce((sum, vs: any) => sum + vs.currentStock, 0);
      if (totalVendorStock < item.quantity) {
        throw new Error(`Insufficient vendor stock for ${item.productName}. Available: ${totalVendorStock}, Required: ${item.quantity}`);
      }

      // 4. Deduct from vendor stocks by priority
      let remainingQuantity = item.quantity;
      let assignedVendorId = '';

      for (const vendorStock of vendorStocks) {
        if (remainingQuantity <= 0) break;

        const deductQuantity = Math.min(remainingQuantity, (vendorStock as any).currentStock);

        // Deduct from vendor stock
        await VendorStock.findByIdAndUpdate(
          vendorStock._id,
          { $inc: { currentStock: -deductQuantity } },
          { session }
        );

        remainingQuantity -= deductQuantity;

        // Use the first vendor (highest priority) as the assigned vendor
        if (!assignedVendorId) {
          assignedVendorId = (vendorStock as any).vendorId._id.toString();
          if (!vendorIds.includes(assignedVendorId)) {
            vendorIds.push(assignedVendorId);
          }
        }
      }

      // 5. Deduct from product stock using currentStock field
      await ProductDetails.findByIdAndUpdate(
        item.productId,
        { $inc: { currentStock: -item.quantity } },
        { session }
      );

      // Add processed item with vendor ID
      processedItems.push({
        ...item,
        vendorId: assignedVendorId,
      });
    }

    // Check if bill needs to be split (> 2.5L)
    const subBills = splitBillByVolume(processedItems, payment);

    // Filter and validate applied promotions
    const validPromotions = (appliedPromotions || []).filter((promo: any) =>
      promo.promotionId &&
      promo.promotionName &&
      promo.promotionType &&
      promo.discountAmount !== undefined
    );

    console.log('📊 Applied Promotions:', JSON.stringify(validPromotions, null, 2));

    // Create bill
    const bill = await Bill.create(
      [{
        totalBillId,
        vendorIds,
        userId: user.userId,
        customerId: (customerType === 'B2B' || customerType === 'Wholesale' || customerType === 'Retail') ? customerId : undefined,
        customerName,
        customerPhone,
        customerType,
        items: processedItems,
        totalQuantityBottles,
        totalVolumeML,
        subTotalAmount,
        totalDiscountAmount,
        itemDiscountAmount: itemDiscountAmount || 0,
        billDiscountAmount: billDiscountAmount || 0,
        promotionDiscountAmount: promotionDiscountAmount || 0,
        appliedPromotions: validPromotions,
        totalAmount,
        subBills: subBills || undefined,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        payment,
        organizationId: tenantId,
        createdBy: user.userId,
      }],
      { session }
    );

    // Update customer outstanding balance if credit payment
    if ((customerType === 'B2B' || customerType === 'Wholesale' || customerType === 'Retail') && customerId && payment.creditAmount > 0) {
      const Customer = getTenantModel(connection, 'Customer');
      await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { outstandingBalance: payment.creditAmount } },
        { session }
      );
    }

    // Commit transaction
    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      data: {
        ...bill[0].toObject(),
        message: subBills ? `Bill split into ${subBills.length} sub-bills due to volume > 2.5L` : undefined,
      },
      message: 'Sale completed successfully',
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

    console.error('Error creating sale:', error);

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
      { success: false, error: error.message || 'Failed to create sale' },
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
