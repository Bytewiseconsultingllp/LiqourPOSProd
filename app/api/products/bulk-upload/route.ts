import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { getProductModel } from '@/models/Product';
import { getVendorModel } from '@/models/Vendor';
import { getVendorStockModel } from '@/models/VendorStock';

/**
 * POST /api/products/bulk-upload
 * Bulk upload products from Excel
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products provided' },
        { status: 400 }
      );
    }

    // Get tenant connection
    const tenantConnection = await getTenantConnection(user.organizationId);
    const Product = getProductModel(tenantConnection);
    const Vendor = getVendorModel(tenantConnection);
    const VendorStock = getVendorStockModel(tenantConnection);
    const InventoryTransaction = getTenantModel(tenantConnection, 'InventoryTransaction');

    // Find priority 1 vendor once for all products
    const priority1Vendor = await Vendor.findOne({
      organizationId: user.organizationId,
      vendorPriority: 1,
      isActive: true,
    }).sort({ createdAt: 1 });

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Ensure unique index on (organizationId, name) so DB can de-duplicate fast
    try {
      await Product.collection.createIndex({ organizationId: 1, name: 1 }, { unique: true, background: true });
    } catch {}

    // NOTE: We no longer pre-query for existing names (saves time on large uploads)
    // The unique index will safely skip duplicates at insert time.

    // Validate and prepare new product docs
    const newProductsData = [] as any[];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p || !p.name || !p.brand || !p.category) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Missing required fields (name, brand, category)`);
        continue;
      }
      if (!p.pricePerUnit || p.pricePerUnit <= 0) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Invalid price per unit`);
        continue;
      }
      if (!p.volumeML || p.volumeML <= 0) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Invalid volume`);
        continue;
      }
      // We will rely on unique index to skip duplicates at insert time
      // (no pre-skip here to avoid extra DB roundtrips)

      newProductsData.push({
        ...p,
        organizationId: user.organizationId,
        createdAt: new Date().toISOString(),
        isActive: p.isActive !== false,
      });
    }

    // If nothing to insert, return
    if (newProductsData.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Bulk upload completed. ${results.success} created, ${results.skipped} skipped, ${results.failed} failed.`,
        results,
      });
    }

    // Insert products in bulk
    // Use unordered to continue on duplicates (unique index) and speed up
    let createdProducts: any[] = [];
    try {
      createdProducts = await Product.insertMany(newProductsData, { ordered: false });
    } catch (bulkErr: any) {
      // Mongo bulk write error will include writeErrors for duplicates
      const writeErrors = bulkErr?.writeErrors || [];
      const dupCount = writeErrors.filter((e: any) => e?.code === 11000).length;
      if (dupCount > 0) {
        results.skipped += dupCount;
      }
      // Collect other error messages for insight
      if (Array.isArray(writeErrors)) {
        writeErrors.forEach((e: any) => {
          if (e?.errmsg && !String(e.errmsg).includes('E11000')) {
            results.errors.push(e.errmsg);
          }
        });
      }
      // Successful inserts are still available via bulkErr.result?.getInsertedIds etc., but many drivers
      // in Mongoose v7 don't expose conveniently; we proceed with what we can.
    }
    results.success = createdProducts.length;

    // Prepare related documents for bulk insert
    // Only create inventory docs for successfully inserted products
    const inventoryDocs = createdProducts.map((prod: any, idx: number) => ({
      productId: prod._id,
      type: 'adjustment',
      quantity: Number(newProductsData[idx].currentStock || 0),
      previousStock: 0,
      newStock: Number(newProductsData[idx].currentStock || 0),
      reason: 'Initial stock (bulk upload)',
      performedBy: user.userId,
      organizationId: user.organizationId,
    }));

    if (inventoryDocs.length > 0) {
      await InventoryTransaction.insertMany(inventoryDocs, { ordered: false });
    }

    if (priority1Vendor) {
      // Only create vendor stock for successfully inserted products
      const vendorStockDocs = createdProducts.map((prod: any, idx: number) => ({
        vendorId: priority1Vendor._id,
        productId: prod._id,
        productName: prod.name,
        brand: prod.brand,
        volumeML: prod.volumeML,
        currentStock: Number(newProductsData[idx].currentStock || 0),
        lastPurchasePrice: Number(newProductsData[idx].pricePerUnit || 0),
        lastPurchaseDate: new Date(),
        organizationId: user.organizationId,
      }));
      if (vendorStockDocs.length > 0) {
        try {
          await VendorStock.insertMany(vendorStockDocs, { ordered: false });
        } catch (vendorStockError: any) {
          console.error('VendorStock bulk insert warnings:', vendorStockError?.message || vendorStockError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk upload completed. ${results.success} created, ${results.skipped} skipped, ${results.failed} failed.`,
      results,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}
