import { NextRequest, NextResponse } from 'next/server';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { verifyAccessToken } from '@/lib/auth';
import { registerAllModels } from '@/lib/model-registry';
import { getBillModel } from '@/models/Bill';
import { getPurchaseModel } from '@/models/Purchase';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');
    const dateStr = searchParams.get('date'); // For backward compatibility
    
    let startOfPeriod: Date;
    let endOfPeriod: Date;
    
    if (fromDateStr && toDateStr) {
      // Date range mode: fromDate 4:00 AM IST to toDate+1 3:59:59.999 AM IST
      // IST is UTC+5:30, so 4:00 AM IST = 22:30 UTC (previous day)
      // Convert IST to UTC by subtracting 5 hours 30 minutes
      
      // fromDate 4:00 AM IST = (fromDate - 1 day) 22:30 UTC
      const fromParts = fromDateStr.split('-');
      const fromYear = parseInt(fromParts[0]);
      const fromMonth = parseInt(fromParts[1]) - 1; // Month is 0-indexed
      const fromDay = parseInt(fromParts[2]);
      startOfPeriod = new Date(Date.UTC(fromYear, fromMonth, fromDay, 0, 0, 0, 0));
      startOfPeriod.setUTCDate(startOfPeriod.getUTCDate() - 1);
      startOfPeriod.setUTCHours(22, 30, 0, 0);
      
      // toDate+1 3:59:59.999 AM IST = toDate 22:29:59.999 UTC
      const toParts = toDateStr.split('-');
      const toYear = parseInt(toParts[0]);
      const toMonth = parseInt(toParts[1]) - 1;
      const toDay = parseInt(toParts[2]);
      endOfPeriod = new Date(Date.UTC(toYear, toMonth, toDay, 22, 29, 59, 999));
    } else {
      // Single date mode (backward compatibility)
      // Convert IST day to UTC range
      const singleDate = dateStr || new Date().toISOString().split('T')[0];
      
      // Start: 00:00 IST = previous day 18:30 UTC
      const parts = singleDate.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      startOfPeriod = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      startOfPeriod.setUTCDate(startOfPeriod.getUTCDate() - 1);
      startOfPeriod.setUTCHours(18, 30, 0, 0);
      
      // End: 23:59:59.999 IST = same day 18:29:59.999 UTC
      endOfPeriod = new Date(Date.UTC(year, month, day, 18, 29, 59, 999));
    }

    registerAllModels();
    
    // Get tenant connection
    const connection = await getTenantConnection(tenantId);
    const InventoryTransaction = getTenantModel(connection, 'InventoryTransaction');
    const Bill = getBillModel(connection);

    console.log('📊 Daily Movements Query:', {
      fromDate: fromDateStr,
      toDate: toDateStr,
      startOfPeriod: startOfPeriod.toISOString(),
      endOfPeriod: endOfPeriod.toISOString(),
    });

    // Try to get sales from InventoryTransaction first
    let sales = await InventoryTransaction.aggregate([
      {
        $match: {
          transactionType: 'sale',
          createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
        },
      },
      {
        $group: {
          _id: '$productId',
          quantity: { $sum: { $abs: '$quantity' } }, // Sales are negative, so abs
        },
      },
      {
        $project: {
          productId: '$_id',
          quantity: 1,
          _id: 0,
        },
      },
    ]);

    // If no sales from InventoryTransaction, try Bills
    if (sales.length === 0) {
      console.log('⚠️  No InventoryTransactions found, querying Bills...');
      sales = await Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
            billType: { $nin: ['discrepancy_main', 'discrepancy_sub'] },
          },
        },
        {
          $unwind: '$items',
        },
        {
          $group: {
            _id: '$items.productId',
            quantity: { $sum: '$items.quantity' },
          },
        },
        {
          $project: {
            productId: '$_id',
            quantity: 1,
            _id: 0,
          },
        },
      ]);
      console.log(`✅ Found ${sales.length} products with sales from Bills`);
    }

    // Try to get purchases from InventoryTransaction first
    let purchases = await InventoryTransaction.aggregate([
      {
        $match: {
          transactionType: 'purchase',
          createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
        },
      },
      {
        $group: {
          _id: '$productId',
          quantity: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          productId: '$_id',
          quantity: 1,
          _id: 0,
        },
      },
    ]);

    // If no purchases from InventoryTransaction, try Purchase collection
    if (purchases.length === 0) {
      console.log('⚠️  No purchase InventoryTransactions found, querying Purchases...');
      const Purchase = getPurchaseModel(connection);
      
      const purchaseDocs = await Purchase.aggregate([
        {
          $match: {
            purchaseDate: { $gte: startOfPeriod, $lte: endOfPeriod },
          },
        },
        {
          $unwind: '$items',
        },
        {
          $group: {
            _id: '$items.productId',
            quantity: { $sum: '$items.quantity' },
          },
        },
        {
          $project: {
            productId: '$_id',
            quantity: 1,
            _id: 0,
          },
        },
      ]);
      
      purchases = purchaseDocs;
      console.log(`✅ Found ${purchases.length} products with purchases from Purchase collection`);
    }

    console.log('📊 Results:', {
      salesCount: sales.length,
      purchasesCount: purchases.length,
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      fromDate: fromDateStr,
      toDate: toDateStr,
      sales,
      purchases,
    });
  } catch (error: any) {
    console.error('Error fetching daily movements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch daily movements' },
      { status: 500 }
    );
  }
}
