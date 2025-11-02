import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';
import { registerAllModels } from '@/lib/model-registry';
import { getBillModel } from '@/models/Bill';
import mongoose from 'mongoose';

interface ClosingStockItem {
  productId: string;
  productName: string;
  volumePerUnitML: number;
  morningStock: number;
  currentStock: number;
  closingStock: number;
  expectedStock: number;
  discrepancy: number;
  pricePerUnit: number;
  discrepancyValue: number;
}

interface ClosingStockRequest {
  date: string;
  nextMorningDate: string;
  fromDate: string;
  toDate: string;
  items: ClosingStockItem[];
}

/**
 * Split bill into sub-bills if total volume > 2500 ML (2.5 L)
 */
function splitBillByVolume(items: any[], totalAmount: number) {
  const MAX_VOLUME_ML = 2500;
  
  // Calculate total volume
  const totalVolume = items.reduce((sum, item) => 
    sum + (item.volumePerUnitML * item.quantity), 0
  );
  
  // If total volume <= 2.5L, no split needed
  if (totalVolume <= MAX_VOLUME_ML) {
    return undefined;
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
          finalAmount: (item.rate * quantityForThisSubBill),
        };
        
        if (currentSubBill.length > 0) {
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
  return subBills.map(subBillItems => {
    const subBillTotal = subBillItems.reduce((sum: number, item: any) => sum + item.finalAmount, 0);
    const proportion = subBillTotal / totalAmount;
    
    return {
      items: subBillItems,
      subTotalAmount: subBillItems.reduce((sum: number, item: any) => sum + item.subTotal, 0),
      totalDiscountAmount: 0,
      totalAmount: subBillTotal,
      paymentMode: 'Cash',
      cashPaidAmount: subBillTotal,
      onlinePaidAmount: 0,
      creditPaidAmount: 0,
    };
  });
}

export async function POST(request: NextRequest) {
  let session: any = null;
  
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body: ClosingStockRequest = await request.json();
    const { date, nextMorningDate, fromDate, toDate, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    registerAllModels();
    
    // Get tenant connection and models
    const connection = await getTenantConnection(tenantId);
    const ProductDetails = getTenantModel(connection, 'Product');
    const InventoryTransaction = getTenantModel(connection, 'InventoryTransaction');
    const Bill = getBillModel(connection);

    // Start transaction on tenant connection
    session = await connection.startSession();
    session.startTransaction();

    console.log('🔄 Starting closing stock update transaction...');

    // Arrays to track updates
    const productUpdates = [];
    const inventoryTransactions = [];
    const discrepancyItems = [];

    // Process each item
    for (const item of items) {
      const product = await ProductDetails.findById(item.productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      // Update product stocks
      product.morningStock = item.closingStock; // Tomorrow's morning stock is today's closing
      product.currentStock = item.closingStock;
      product.morningStockLastUpdatedDate = new Date(nextMorningDate); 
      product.morningStockUpdateDate = new Date(nextMorningDate);
      await product.save({ session });
      productUpdates.push(product._id);

      console.log(`✅ Updated ${product.name}: closing=${item.closingStock}`);

      // If there's a discrepancy, record it
      if (item.discrepancy !== 0) {
        // Create inventory transaction for discrepancy
        const transaction = await InventoryTransaction.create([{
          productId: item.productId,
          type: 'adjustment',
          quantity: item.discrepancy,
          previousStock: item.currentStock,
          newStock: item.closingStock,
          reason: `Closing stock discrepancy - ${item.discrepancy > 0 ? 'Excess' : 'Shortage'}`,
          performedBy: decoded.userId,
          organizationId: tenantId,
        }], { session });

        inventoryTransactions.push(transaction[0]._id);

        // Add to discrepancy items for bill (only shortages)
        if (item.discrepancy < 0) {
          const itemAmount = Math.abs(item.discrepancy) * item.pricePerUnit;
          discrepancyItems.push({
            productId: item.productId,
            vendorId: product.vendorId || 'unknown',
            productName: item.productName || product.name,
            brand: product.brand || 'Unknown',
            category: product.category || 'Unknown',
            quantity: Math.abs(item.discrepancy),
            volumePerUnitML: item.volumePerUnitML || product.volumePerUnitML || 750, // Fallback to product or default
            rate: item.pricePerUnit || product.pricePerUnit || 0,
            subTotal: itemAmount,
            itemDiscountAmount: 0,
            promotionDiscountAmount: 0,
            discountAmount: 0,
            finalAmount: itemAmount,
            vatAmount: 0,
            tcsAmount: 0,
          });

          console.log(`⚠️  Shortage detected for ${product.name}: ${Math.abs(item.discrepancy)} bottles`);
        }
      }
    }

    // Generate bill for discrepancies (shortages only) - using sales logic
    let generatedBill = null;
    
    if (discrepancyItems.length > 0) {
      const billCount = await Bill.countDocuments().session(session);
      const totalBillId = `DISC-${Date.now()}-${billCount + 1}`;
      
      // Calculate totals
      const totalQuantity = discrepancyItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalVolume = discrepancyItems.reduce((sum, item) => sum + (item.quantity * item.volumePerUnitML), 0);
      const subTotalAmount = discrepancyItems.reduce((sum, item) => sum + item.subTotal, 0);
      const totalAmount = discrepancyItems.reduce((sum, item) => sum + item.finalAmount, 0);
      const uniqueVendorIds = Array.from(new Set(discrepancyItems.map(item => item.vendorId)));
      
      // Split into optimized sub-bills if total volume > 2.5L (like sales entry)
      const subBills = splitBillByVolume(discrepancyItems, totalAmount);
      
      console.log(`📊 Total volume: ${totalVolume}ML, Sub-bills: ${subBills ? subBills.length : 0}`);

      // Create ONE bill with sub-bills inside (like sales entry)
      const billDoc = await Bill.create([{
        totalBillId,
        vendorIds: uniqueVendorIds,
        userId: decoded.userId,
        customerId: undefined,
        customerName: 'Walk-in Customer',
        customerType: 'walk-in',
        items: discrepancyItems,
        totalQuantityBottles: totalQuantity,
        totalVolumeML: totalVolume,
        subTotalAmount,
        totalDiscountAmount: 0,
        itemDiscountAmount: 0,
        billDiscountAmount: 0,
        promotionDiscountAmount: 0,
        appliedPromotions: [],
        totalAmount,
        subBills,  // Sub-bills array inside the main bill
        saleDate: new Date(date),
        payment: {
          mode: 'Cash',
          cashAmount: totalAmount,
          onlineAmount: 0,
          creditAmount: 0,
          totalAmount,
        },
        organizationId: tenantId,
        createdBy: decoded.userId,
      }], { session });

      generatedBill = billDoc[0];

      console.log(`📄 Generated discrepancy bill: ${totalBillId} with ${subBills ? subBills.length : 0} sub-bills for ₹${totalAmount.toFixed(2)}`);
      
      // Note: We don't deduct vendor stock here because:
      // 1. The shortage already happened (stock was sold/lost)
      // 2. Vendor stock was already deducted during actual sales
      // 3. This bill is just recording the discrepancy for accounting
    }

    // Commit transaction
    await session.commitTransaction();
    console.log('✅ Transaction committed successfully');

    return NextResponse.json({
      success: true,
      message: 'Closing stock updated successfully',
      data: {
        productsUpdated: productUpdates.length,
        discrepanciesRecorded: inventoryTransactions.length,
        bill: generatedBill ? {
          totalBillId: (generatedBill as any).totalBillId,
          totalAmount: (generatedBill as any).totalAmount,
          itemsCount: discrepancyItems.length,
          subBillsCount: (generatedBill as any).subBills?.length || 0,
        } : null,
      },
    });

  } catch (error: any) {
    // Rollback transaction on error
    if (session) {
      await session.abortTransaction();
      console.error('❌ Transaction aborted:', error);
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update closing stock' },
      { status: 500 }
    );
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

