# Model Registration & Multi-Tenant Connection Fixes

## ✅ Issues Fixed

### 1. **Auto-execution of registerAllModels() at import** ❌ → ✅
**Problem:** Models were being registered automatically when the module was imported, causing `OverwriteModelError: Cannot overwrite 'User' model once compiled` in Next.js due to module reloading.

**Solution:**
- Removed auto-call of `registerAllModels()` at module import
- Added `ensureSchemasRegistered()` function in `tenant-db.ts` that uses a global flag
- Models are now registered only once globally, then attached to each tenant connection

**Files Changed:**
- `lib/model-registry.ts`: Removed auto-call at line 751
- `lib/tenant-db.ts`: Added global flag `_modelSchemasRegistered` and `ensureSchemasRegistered()`

---

### 2. **Email uniqueness is global, not per organization** ❌ → ✅
**Problem:** `UserSchema.index({ email: 1 }, { unique: true })` prevented different organizations from having users with the same email address.

**Solution:**
- Changed to compound unique index: `{ organizationId: 1, email: 1 }`
- Now allows same email across different organizations while maintaining uniqueness within each org

**Files Changed:**
- `lib/model-registry.ts`: Line 65

---

### 3. **Auto-indexing in production causing E11000 errors** ❌ → ✅
**Problem:** In serverless environments (Vercel, AWS Lambda), MongoDB connections are reused but index creation on every cold start caused duplicate key errors.

**Solution:**
- Disabled auto-indexing in production: `mongoose.set('autoIndex', false)`
- Enabled auto-indexing in development for convenience
- Added clear logging to indicate which mode is active

**Files Changed:**
- `lib/tenant-db.ts`: Lines 21-29

**Production Index Management:**
You need to create indexes manually in production. See section below.

---

### 4. **Text index performance concern** ⚠️ → ✅
**Problem:** `ProductDetailsSchema.index({ name: 'text', description: 'text', brand: 'text' })` can slow down writes and increase RAM usage in multi-tenant setup.

**Solution:**
- Removed text index from ProductDetails schema
- Kept compound indexes for efficient searching: `{ organizationId: 1, name: 1 }`, etc.
- Added comment suggesting Elasticsearch for full-text search if needed

**Files Changed:**
- `lib/model-registry.ts`: Lines 215-216

---

### 5. **Model isolation per tenant** ✅
**Already Correct:** The current implementation properly uses `connection.model()` instead of `mongoose.model()`, ensuring each tenant connection has its own model registry. This prevents cross-tenant data leakage.

---

## 🔧 How It Works Now

### Model Registration Flow

```
1. API Route Called
   ↓
2. getTenantConnection(organizationId) called
   ↓
3. ensureSchemasRegistered() checks global._modelSchemasRegistered
   ↓
4. If not registered: registerAllModels() called (ONCE)
   ↓
5. Schemas stored in modelSchemas Map
   ↓
6. Connection created for tenant (or reused if exists)
   ↓
7. registerModelsForTenant() attaches schemas to connection
   ↓
8. Each tenant connection has isolated model instances
```

### Key Benefits
- ✅ No duplicate registration errors
- ✅ Proper multi-tenant isolation
- ✅ Connection pooling and reuse
- ✅ Production-safe (no auto-indexing)
- ✅ Same email allowed across orgs

---

## 📋 Production Index Management

Since auto-indexing is disabled in production, you need to create indexes manually.

### Option 1: Create Index Script (Recommended)

Create `scripts/create-indexes.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all tenant databases
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    
    const tenantDbs = databases.filter(db => db.name.startsWith('tenant_'));
    
    console.log(`Found ${tenantDbs.length} tenant databases`);
    
    for (const dbInfo of tenantDbs) {
      console.log(`\nCreating indexes for ${dbInfo.name}...`);
      const db = mongoose.connection.useDb(dbInfo.name);
      
      // User indexes
      await db.collection('users').createIndex(
        { organizationId: 1, email: 1 },
        { unique: true }
      );
      await db.collection('users').createIndex({ organizationId: 1 });
      await db.collection('users').createIndex({ role: 1 });
      
      // Product indexes
      await db.collection('products').createIndex({ organizationId: 1, sku: 1 });
      await db.collection('products').createIndex(
        { organizationId: 1, barcode: 1 },
        { sparse: true }
      );
      await db.collection('products').createIndex({ organizationId: 1, category: 1 });
      await db.collection('products').createIndex({ organizationId: 1, brand: 1 });
      await db.collection('products').createIndex({ organizationId: 1, name: 1 });
      
      // Bill indexes
      await db.collection('bills').createIndex({ totalBillId: 1, organizationId: 1 });
      await db.collection('bills').createIndex({ customerId: 1, organizationId: 1 });
      await db.collection('bills').createIndex({ saleDate: -1, organizationId: 1 });
      await db.collection('bills').createIndex({ createdAt: -1, organizationId: 1 });
      
      // Add other indexes as needed...
      
      console.log(`✅ Indexes created for ${dbInfo.name}`);
    }
    
    console.log('\n✅ All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
```

Run with: `node scripts/create-indexes.js`

### Option 2: MongoDB Atlas Auto-Index

If using MongoDB Atlas, you can enable auto-index creation in the cluster settings. However, this is not recommended for high-traffic production environments.

### Option 3: Index on First Tenant Creation

Add index creation to your organization signup flow:

```typescript
// In your organization creation API
async function createOrganization(orgData) {
  const connection = await getTenantConnection(orgData.id);
  
  // Manually create critical indexes
  await connection.collection('users').createIndex(
    { organizationId: 1, email: 1 },
    { unique: true }
  );
  
  // ... create other indexes
  
  return orgData;
}
```

---

## 🧪 Testing the Fixes

### Test 1: No Duplicate Registration Errors
```bash
# Start dev server and make multiple API calls
npm run dev

# In another terminal, make rapid requests
curl http://localhost:3000/api/products
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/bills
```

**Expected:** No "Cannot overwrite model" errors in console

### Test 2: Same Email Across Orgs
```javascript
// Create user in org1
POST /api/auth/register
{
  "email": "admin@example.com",
  "organizationId": "org1",
  "password": "test123"
}

// Create user with same email in org2
POST /api/auth/register
{
  "email": "admin@example.com",
  "organizationId": "org2",
  "password": "test123"
}
```

**Expected:** Both users created successfully

### Test 3: Tenant Isolation
```javascript
// Create product in org1
const conn1 = await getTenantConnection('org1');
const Product1 = getTenantModel(conn1, 'Product');
await Product1.create({ name: 'Product A', organizationId: 'org1' });

// Query from org2
const conn2 = await getTenantConnection('org2');
const Product2 = getTenantModel(conn2, 'Product');
const products = await Product2.find({});
```

**Expected:** org2 should not see org1's products

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Verify `NODE_ENV=production` is set
- [ ] Run index creation script for existing tenants
- [ ] Test with a staging environment first
- [ ] Monitor for E11000 errors in production logs
- [ ] Set up alerts for connection pool exhaustion
- [ ] Document index creation process for new tenants

---

## 📚 Additional Resources

- [Mongoose Multi-Tenancy Guide](https://mongoosejs.com/docs/discriminators.html)
- [MongoDB Index Best Practices](https://docs.mongodb.com/manual/indexes/)
- [Next.js API Routes Best Practices](https://nextjs.org/docs/api-routes/introduction)

---

## 🐛 Troubleshooting

### Issue: "Cannot overwrite model" error still appears
**Solution:** Clear Next.js cache and restart dev server
```bash
rm -rf .next
npm run dev
```

### Issue: Indexes not working in production
**Solution:** Run the index creation script manually
```bash
node scripts/create-indexes.js
```

### Issue: Slow queries in production
**Solution:** Check if indexes are created
```javascript
// In MongoDB shell or Compass
db.products.getIndexes()
```

### Issue: E11000 duplicate key error
**Solution:** This means a unique index exists but you're trying to insert a duplicate. Check your data or index definition.

---

## 📝 Summary

All critical issues have been fixed:
1. ✅ No auto-execution at import
2. ✅ Email uniqueness per organization
3. ✅ Auto-indexing disabled in production
4. ✅ Text index removed for performance
5. ✅ Proper tenant isolation maintained

The system is now production-ready with proper multi-tenant isolation and no model registration conflicts.
