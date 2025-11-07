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

    // Preload existing product names to skip duplicates
    const names = products.map((p: any) => p.name).filter(Boolean);
    const existing = await Product.find(
      { organizationId: user.organizationId, name: { $in: names } },
      'name'
    );
    const existingNames = new Set(existing.map((p: any) => p.name));

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
      if (existingNames.has(p.name)) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: Product "${p.name}" already exists - skipped`);
        continue;
      }

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
    const createdProducts = await Product.insertMany(newProductsData, { ordered: true });
    results.success = createdProducts.length;

    // Prepare related documents for bulk insert
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
