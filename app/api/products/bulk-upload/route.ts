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
      createdProducts: [] as any[],
    };

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        // Validate required fields
        if (!productData.name || !productData.brand || !productData.category) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields (name, brand, or category)`);
          continue;
        }

        if (!productData.pricePerUnit || productData.pricePerUnit <= 0) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Invalid price per unit`);
          continue;
        }

        if (!productData.volumeML || productData.volumeML <= 0) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Invalid volume`);
          continue;
        }

        // Check if product with same name already exists (skip, don't update)
        const existingProduct = await Product.findOne({
          name: productData.name,
          organizationId: user.organizationId,
        });

        if (existingProduct) {
          results.skipped++;
          results.errors.push(`Row ${i + 1}: Product "${productData.name}" already exists - skipped`);
          continue;
        }

        // Create product
        const newProduct = new Product({
          ...productData,
          organizationId: user.organizationId,
          createdAt: new Date().toISOString(),
          isActive: productData.isActive !== false,
        });

        await newProduct.save();

        // Log inventory transaction
        await InventoryTransaction.create({
          productId: newProduct._id,
          type: 'adjustment',
          quantity: productData.currentStock || 0,
          previousStock: 0,
          newStock: productData.currentStock || 0,
          reason: 'Initial stock (bulk upload)',
          performedBy: user.userId,
          organizationId: user.organizationId,
        });

        // Create vendor stock if priority 1 vendor exists
        if (priority1Vendor) {
          try {
            await VendorStock.create({
              vendorId: priority1Vendor._id,
              productId: newProduct._id,
              productName: newProduct.name,
              brand: newProduct.brand,
              volumeML: newProduct.volumeML,
              currentStock: productData.currentStock || 0,
              lastPurchasePrice: productData.pricePerUnit || 0,
              lastPurchaseDate: new Date(),
              organizationId: user.organizationId,
            });
          } catch (vendorStockError: any) {
            console.error(`Vendor stock creation failed for ${newProduct.name}:`, vendorStockError);
            // Don't fail the product creation
          }
        }

        results.success++;
        results.createdProducts.push(newProduct);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
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
