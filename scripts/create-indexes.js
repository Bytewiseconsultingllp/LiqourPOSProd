/**
 * Production Index Creation Script
 * 
 * This script creates all necessary indexes for tenant databases in production.
 * Run this script after deployment or when adding new tenants.
 * 
 * Usage: node scripts/create-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexesForTenant(db, dbName) {
  console.log(`\n📋 Creating indexes for ${dbName}...`);
  
  try {
    // User indexes
    console.log('  Creating User indexes...');
    await db.collection('users').createIndex(
      { organizationId: 1, email: 1 },
      { unique: true, name: 'org_email_unique' }
    );
    await db.collection('users').createIndex(
      { organizationId: 1 },
      { name: 'org_index' }
    );
    await db.collection('users').createIndex(
      { role: 1 },
      { name: 'role_index' }
    );
    
    // Product indexes
    console.log('  Creating Product indexes...');
    await db.collection('products').createIndex(
      { organizationId: 1, sku: 1 },
      { name: 'org_sku_index' }
    );
    await db.collection('products').createIndex(
      { organizationId: 1, barcode: 1 },
      { sparse: true, name: 'org_barcode_index' }
    );
    await db.collection('products').createIndex(
      { organizationId: 1, category: 1 },
      { name: 'org_category_index' }
    );
    await db.collection('products').createIndex(
      { organizationId: 1, brand: 1 },
      { name: 'org_brand_index' }
    );
    await db.collection('products').createIndex(
      { organizationId: 1, name: 1 },
      { name: 'org_name_index' }
    );
    
    // Sale indexes (if used)
    console.log('  Creating Sale indexes...');
    await db.collection('sales').createIndex(
      { organizationId: 1, createdAt: -1 },
      { name: 'org_created_index' }
    );
    await db.collection('sales').createIndex(
      { soldBy: 1 },
      { name: 'soldby_index' }
    );
    await db.collection('sales').createIndex(
      { status: 1 },
      { name: 'status_index' }
    );
    await db.collection('sales').createIndex(
      { customerPhone: 1 },
      { sparse: true, name: 'customer_phone_index' }
    );
    
    // Inventory Transaction indexes
    console.log('  Creating InventoryTransaction indexes...');
    await db.collection('inventorytransactions').createIndex(
      { productId: 1, createdAt: -1 },
      { name: 'product_created_index' }
    );
    await db.collection('inventorytransactions').createIndex(
      { organizationId: 1, createdAt: -1 },
      { name: 'org_created_index' }
    );
    await db.collection('inventorytransactions').createIndex(
      { type: 1 },
      { name: 'type_index' }
    );
    
    // Customer indexes
    console.log('  Creating Customer indexes...');
    await db.collection('customers').createIndex(
      { organizationId: 1, 'contactInfo.email': 1 },
      { name: 'org_email_index' }
    );
    await db.collection('customers').createIndex(
      { organizationId: 1, type: 1 },
      { name: 'org_type_index' }
    );
    await db.collection('customers').createIndex(
      { organizationId: 1, name: 1 },
      { name: 'org_name_index' }
    );
    
    // Vendor indexes
    console.log('  Creating Vendor indexes...');
    await db.collection('vendors').createIndex(
      { organizationId: 1, 'contactInfo.email': 1 },
      { name: 'org_email_index' }
    );
    await db.collection('vendors').createIndex(
      { organizationId: 1, name: 1 },
      { name: 'org_name_index' }
    );
    await db.collection('vendors').createIndex(
      { organizationId: 1, vendorPriority: -1 },
      { name: 'org_priority_index' }
    );
    await db.collection('vendors').createIndex(
      { organizationId: 1, isActive: 1 },
      { name: 'org_active_index' }
    );
    
    // Bill indexes
    console.log('  Creating Bill indexes...');
    await db.collection('bills').createIndex(
      { totalBillId: 1, organizationId: 1 },
      { name: 'billid_org_index' }
    );
    await db.collection('bills').createIndex(
      { customerId: 1, organizationId: 1 },
      { name: 'customer_org_index' }
    );
    await db.collection('bills').createIndex(
      { saleDate: -1, organizationId: 1 },
      { name: 'saledate_org_index' }
    );
    await db.collection('bills').createIndex(
      { createdAt: -1, organizationId: 1 },
      { name: 'created_org_index' }
    );
    
    // Purchase indexes
    console.log('  Creating Purchase indexes...');
    await db.collection('purchases').createIndex(
      { purchaseNumber: 1 },
      { name: 'purchase_number_index' }
    );
    await db.collection('purchases').createIndex(
      { vendorId: 1 },
      { name: 'vendor_index' }
    );
    await db.collection('purchases').createIndex(
      { purchaseDate: -1 },
      { name: 'purchase_date_index' }
    );
    await db.collection('purchases').createIndex(
      { organizationId: 1, purchaseDate: -1 },
      { name: 'org_purchase_date_index' }
    );
    await db.collection('purchases').createIndex(
      { paymentStatus: 1 },
      { name: 'payment_status_index' }
    );
    
    // Payment indexes
    console.log('  Creating Payment indexes...');
    await db.collection('payments').createIndex(
      { customerId: 1, organizationId: 1 },
      { name: 'customer_org_index' }
    );
    await db.collection('payments').createIndex(
      { paymentDate: -1, organizationId: 1 },
      { name: 'payment_date_org_index' }
    );
    await db.collection('payments').createIndex(
      { isReverted: 1 },
      { name: 'reverted_index' }
    );
    
    // VendorStock indexes
    console.log('  Creating VendorStock indexes...');
    await db.collection('vendorstocks').createIndex(
      { vendorId: 1, productId: 1, organizationId: 1 },
      { unique: true, name: 'vendor_product_org_unique' }
    );
    await db.collection('vendorstocks').createIndex(
      { vendorId: 1, organizationId: 1 },
      { name: 'vendor_org_index' }
    );
    await db.collection('vendorstocks').createIndex(
      { productId: 1, organizationId: 1 },
      { name: 'product_org_index' }
    );
    
    // ExpenseCategory indexes
    console.log('  Creating ExpenseCategory indexes...');
    await db.collection('expensecategories').createIndex(
      { name: 1, organizationId: 1 },
      { unique: true, name: 'name_org_unique' }
    );
    
    // Expense indexes
    console.log('  Creating Expense indexes...');
    await db.collection('expenses').createIndex(
      { expenseNumber: 1 },
      { name: 'expense_number_index' }
    );
    await db.collection('expenses').createIndex(
      { categoryId: 1 },
      { name: 'category_index' }
    );
    await db.collection('expenses').createIndex(
      { expenseDate: -1 },
      { name: 'expense_date_index' }
    );
    await db.collection('expenses').createIndex(
      { organizationId: 1, expenseDate: -1 },
      { name: 'org_expense_date_index' }
    );
    await db.collection('expenses').createIndex(
      { paymentMode: 1 },
      { name: 'payment_mode_index' }
    );
    
    console.log(`✅ All indexes created for ${dbName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating indexes for ${dbName}:`, error.message);
    return false;
  }
}

async function createAllIndexes() {
  console.log('🚀 Starting index creation process...\n');
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all databases
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    
    // Filter tenant databases
    const tenantDbs = databases.filter(db => db.name.startsWith('tenant_'));
    
    console.log(`📊 Found ${tenantDbs.length} tenant database(s)\n`);
    
    if (tenantDbs.length === 0) {
      console.log('⚠️  No tenant databases found. Indexes will be created when tenants are added.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Create indexes for each tenant
    let successCount = 0;
    let failCount = 0;
    
    for (const dbInfo of tenantDbs) {
      const db = mongoose.connection.useDb(dbInfo.name);
      const success = await createIndexesForTenant(db, dbInfo.name);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Index Creation Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Total: ${tenantDbs.length}`);
    console.log('='.repeat(50) + '\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createAllIndexes();
