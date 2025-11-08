/**
 * Migration Script: Convert old barcode field to new barcodes array
 * 
 * This script migrates products from the old single barcode field
 * to the new barcodes array format.
 * 
 * Usage: node scripts/migrate-barcodes.js
 */

const mongoose = require('mongoose');

// MongoDB connection URI
const MONGODB_URI = 'mongodb+srv://bytewiseconsultingllp_db_user:admin@liquorposindia.eskuohm.mongodb.net/tenant_690ec6dcb75a041617f37b92?retryWrites=true&w=majority&appName=LiquorPosIndia';

// Product Schema (simplified for migration)
const BarcodeSchema = new mongoose.Schema({
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: String,
  barcode: String,
  barcodes: [BarcodeSchema],
  organizationId: String,
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema, 'products');

/**
 * Main migration function
 */
async function migrateBarcodes() {
  try {
    console.log('🚀 Starting barcode migration...\n');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all products with old barcode field but no barcodes array
    const query = {
      barcode: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { barcodes: { $exists: false } },
        { barcodes: { $size: 0 } },
        { barcodes: null }
      ]
    };

    const productsToMigrate = await Product.find(query);
    console.log(`📦 Found ${productsToMigrate.length} products to migrate\n`);

    if (productsToMigrate.length === 0) {
      console.log('✨ No products need migration. All done!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each product
    for (const product of productsToMigrate) {
      try {
        // Create new barcode object from old barcode field
        const newBarcode = {
          code: product.barcode.trim(),
          createdAt: product.createdAt || new Date(),
          createdBy: 'migration-script'
        };

        // Update product with new barcodes array
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              barcodes: [newBarcode]
            }
          }
        );

        successCount++;
        console.log(`✅ [${successCount}/${productsToMigrate.length}] Migrated: ${product.name} (${product.barcode})`);
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ Failed to migrate ${product.name}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ productId: product._id, productName: product.name, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} products`);
    console.log(`❌ Failed migrations: ${errorCount} products`);
    console.log(`📦 Total processed: ${productsToMigrate.length} products`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.productName} (${err.productId}): ${err.error}`);
      });
    }

    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Dry run function - shows what would be migrated without making changes
 */
async function dryRun() {
  try {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const query = {
      barcode: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { barcodes: { $exists: false } },
        { barcodes: { $size: 0 } },
        { barcodes: null }
      ]
    };

    const productsToMigrate = await Product.find(query).select('name barcode organizationId');
    console.log(`📦 Found ${productsToMigrate.length} products that would be migrated:\n`);

    productsToMigrate.forEach((product, idx) => {
      console.log(`  ${idx + 1}. ${product.name}`);
      console.log(`     Old barcode: "${product.barcode}"`);
      console.log(`     Would create: barcodes = [{ code: "${product.barcode}", createdAt: ..., createdBy: "migration-script" }]`);
      console.log('');
    });

    console.log('✨ Dry run completed!');

  } catch (error) {
    console.error('\n❌ Dry run failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

// Run migration
if (isDryRun) {
  dryRun().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
} else {
  // Confirm before running actual migration
  console.log('⚠️  WARNING: This will modify your database!');
  console.log('💡 TIP: Run with --dry-run flag to preview changes first\n');
  
  migrateBarcodes().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}
