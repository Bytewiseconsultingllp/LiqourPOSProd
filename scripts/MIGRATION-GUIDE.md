# Barcode Migration Guide

## Quick Start

### Step 1: Preview Changes (Dry Run)
```bash
npm run migrate:barcodes:dry-run
```
This will show you what products will be migrated without making any changes.

### Step 2: Backup Database
Before running the actual migration, backup your database:
```bash
# Using mongodump
mongodump --uri="your-mongodb-uri" --out=./backup-$(date +%Y%m%d)
```

### Step 3: Run Migration
```bash
npm run migrate:barcodes
```

## What This Migration Does

### Problem
Your products currently have a single `barcode` field (string), but the new system supports multiple barcodes per product using a `barcodes` array.

### Solution
This script converts:
```javascript
// OLD FORMAT
{
  name: "Johnnie Walker Black Label",
  barcode: "1234567890"
}
```

To:
```javascript
// NEW FORMAT
{
  name: "Johnnie Walker Black Label",
  barcode: "1234567890",  // kept for backward compatibility
  barcodes: [
    {
      code: "1234567890",
      createdAt: "2024-11-08T04:30:00.000Z",
      createdBy: "migration-script"
    }
  ]
}
```

## Migration Criteria

The script will migrate products that:
- ✅ Have a `barcode` field with a value
- ✅ Don't have a `barcodes` array, OR
- ✅ Have an empty `barcodes` array

The script will skip products that:
- ❌ Don't have a `barcode` field
- ❌ Have an empty `barcode` field
- ❌ Already have items in the `barcodes` array

## Expected Output

### Dry Run Output
```
🔍 DRY RUN MODE - No changes will be made

📡 Connecting to MongoDB: mongodb://***@localhost:27017/liquor-pos
✅ Connected to MongoDB

📦 Found 150 products that would be migrated:

  1. Johnnie Walker Black Label
     Old barcode: "1234567890"
     Would create: barcodes = [{ code: "1234567890", createdAt: ..., createdBy: "migration-script" }]

  2. Jack Daniels
     Old barcode: "9876543210"
     Would create: barcodes = [{ code: "9876543210", createdAt: ..., createdBy: "migration-script" }]

...

✨ Dry run completed!

🔌 Database connection closed
```

### Actual Migration Output
```
⚠️  WARNING: This will modify your database!
💡 TIP: Run with --dry-run flag to preview changes first

🚀 Starting barcode migration...

📡 Connecting to MongoDB: mongodb://***@localhost:27017/liquor-pos
✅ Connected to MongoDB

📦 Found 150 products to migrate

✅ [1/150] Migrated: Johnnie Walker Black Label (1234567890)
✅ [2/150] Migrated: Jack Daniels (9876543210)
✅ [3/150] Migrated: Absolut Vodka (1122334455)
...
✅ [150/150] Migrated: Grey Goose (9988776655)

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Successfully migrated: 150 products
❌ Failed migrations: 0 products
📦 Total processed: 150 products

✨ Migration completed!

🔌 Database connection closed
```

## Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution:** Check your `.env` file and ensure `MONGODB_URI` is set correctly.

### Issue: "No products need migration"
**Possible reasons:**
1. All products already have the `barcodes` array populated
2. No products have the old `barcode` field
3. You're connected to the wrong database

**Solution:** Run the dry-run command to see what products would be migrated.

### Issue: Some products failed to migrate
**Solution:** Check the error messages in the output. The script will show which products failed and why.

## Post-Migration Verification

After migration, verify the results:

```javascript
// In MongoDB shell or Compass
db.products.findOne({ name: "Your Product Name" })

// Should show:
{
  _id: ObjectId("..."),
  name: "Your Product Name",
  barcode: "1234567890",  // old field still present
  barcodes: [              // new field populated
    {
      code: "1234567890",
      createdAt: ISODate("2024-11-08T04:30:00.000Z"),
      createdBy: "migration-script"
    }
  ],
  // ... other fields
}
```

## Rollback (If Needed)

If you need to rollback the migration:

```javascript
// Remove the barcodes array from all products
db.products.updateMany(
  { "barcodes.createdBy": "migration-script" },
  { $unset: { barcodes: "" } }
)
```

Or restore from your backup:
```bash
mongorestore --uri="your-mongodb-uri" ./backup-20241108
```

## Support

If you encounter issues:
1. Check the error messages in the script output
2. Verify your database connection
3. Ensure you have proper permissions
4. Review the migration logs
