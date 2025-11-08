# Database Migration Scripts

This folder contains database migration and maintenance scripts for the Liquor POS application.

## Available Scripts

### 1. Barcode Migration (`migrate-barcodes.js`)

Migrates products from the old single `barcode` field to the new `barcodes` array format.

#### What it does:
- Finds all products with the old `barcode` field (string)
- Converts them to the new `barcodes` array format (array of objects)
- Preserves the original barcode value
- Adds metadata (createdAt, createdBy)

#### Usage:

**Dry Run (Preview changes without modifying data):**
```bash
node scripts/migrate-barcodes.js --dry-run
```

**Run Migration:**
```bash
node scripts/migrate-barcodes.js
```

#### Before Migration:
```javascript
{
  name: "Product Name",
  barcode: "1234567890",
  barcodes: [] // or null or doesn't exist
}
```

#### After Migration:
```javascript
{
  name: "Product Name",
  barcode: "1234567890", // kept for backward compatibility
  barcodes: [
    {
      code: "1234567890",
      createdAt: "2024-11-08T04:30:00.000Z",
      createdBy: "migration-script"
    }
  ]
}
```

#### Requirements:
- Node.js installed
- MongoDB connection configured in `.env` file
- `MONGODB_URI` environment variable set

#### Safety Features:
- ✅ Dry run mode to preview changes
- ✅ Detailed logging of each migration
- ✅ Error handling and reporting
- ✅ Summary statistics
- ✅ Preserves original barcode field

#### Example Output:
```
🚀 Starting barcode migration...

📡 Connecting to MongoDB: mongodb://***@localhost:27017/liquor-pos
✅ Connected to MongoDB

📦 Found 150 products to migrate

✅ [1/150] Migrated: Johnnie Walker Black Label (1234567890)
✅ [2/150] Migrated: Jack Daniels (9876543210)
...

============================================================
📊 MIGRATION SUMMARY
============================================================
✅ Successfully migrated: 150 products
❌ Failed migrations: 0 products
📦 Total processed: 150 products

✨ Migration completed!

🔌 Database connection closed
```

## Best Practices

1. **Always run dry-run first** to preview changes
2. **Backup your database** before running migrations
3. **Run during off-peak hours** to minimize impact
4. **Monitor the output** for any errors
5. **Verify the results** after migration

## Adding New Scripts

When adding new migration scripts:
1. Follow the naming convention: `migrate-{feature}.js`
2. Include dry-run mode
3. Add detailed logging
4. Handle errors gracefully
5. Provide summary statistics
6. Document in this README
