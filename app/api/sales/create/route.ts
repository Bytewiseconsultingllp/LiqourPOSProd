import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/tenant-db';
import { getBillModel } from '@/models/Bill';
import { getProductModel } from '@/models/Product';
import { getVendorStockModel } from '@/models/VendorStock';
import { getAuthenticatedUser } from '@/lib/auth';

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
  finalAmount: number;
  vatAmount: number;
  tcsAmount: number;
}

interface CreateSaleRequest {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType: 'walk-in' | 'registered';
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
    const { customerId, customerName, customerPhone, customerType, items, payment, saleDate } = body;
    
    // Validation
    if (!customerName || !items || items.length === 0 || !payment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get database connection
    const connection = await getTenantConnection(tenantId);
    const Bill = getBillModel(connection);
    const Product = getProductModel(connection);
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
    const totalAmount = items.reduce((sum, item) => sum + item.finalAmount, 0);
    
    // Process each item: validate stock and assign vendors
    const processedItems = [];
    const vendorIds: string[] = [];
    
    for (const item of items) {
      // 1. Check product stock
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product ${item.productName} not found`);
      }
      
      // Check stock (try both fields for compatibility)
      const productStock = (product as any).currentStock || (product as any).stockQuantity || 0;
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
        .session(session);

        
      
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
      
      // 5. Deduct from product stock (try both fields for compatibility)
      const updateFields: any = {};
      if ((product as any).currentStock !== undefined) {
        updateFields.currentStock = -item.quantity;
      }
      if ((product as any).stockQuantity !== undefined) {
        updateFields.stockQuantity = -item.quantity;
      }
      
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: updateFields },
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
    
    // Create bill
    const bill = await Bill.create(
      [{
        totalBillId,
        vendorIds,
        userId: user.userId,
        customerId: customerType === 'registered' ? customerId : undefined,
        customerName,
        customerPhone,
        customerType,
        items: processedItems,
        totalQuantityBottles,
        totalVolumeML,
        subTotalAmount,
        totalDiscountAmount,
        totalAmount,
        subBills: subBills || undefined,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        payment,
        organizationId: tenantId,
        createdBy: user.userId,
      }],
      { session }
    );
    
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
