# Migration Steps - Model Registration Fixes

## 🚀 Quick Migration (5 minutes)

### Step 1: Clean Up Redundant Calls
```powershell
# Run the cleanup script to remove all redundant registerAllModels() calls
.\scripts\cleanup-register-calls.ps1
```

### Step 2: Test in Development
```bash
# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Start dev server
npm run dev

# Test a few API endpoints
# You should see "✅ Model schemas registered globally" only ONCE in console
```

### Step 3: Verify Multi-Tenancy
```bash
# Test with different organizations
# Each should work independently without errors
```

### Step 4: Deploy to Production
```bash
# Build and deploy
npm run build

# After deployment, create indexes
npm run create-indexes
```

---

## 📋 Detailed Migration Checklist

### Pre-Migration
- [ ] Backup your database
- [ ] Review `MODEL_REGISTRATION_FIXES.md`
- [ ] Ensure you have Node.js and npm installed
- [ ] Have access to MongoDB connection string

### Code Changes (Already Done)
- [x] Removed auto-execution from `model-registry.ts`
- [x] Fixed User email uniqueness index
- [x] Removed text index from ProductDetails
- [x] Added global flag in `tenant-db.ts`
- [x] Added auto-index configuration
- [x] Created index creation script

### Cleanup (Do This Now)
- [ ] Run `.\scripts\cleanup-register-calls.ps1`
- [ ] Verify no compilation errors
- [ ] Check git diff to review changes

### Testing
- [ ] Clear `.next` folder
- [ ] Start dev server
- [ ] Test product creation
- [ ] Test customer creation
- [ ] Test bill creation
- [ ] Test with multiple organizations
- [ ] Verify no "Cannot overwrite model" errors

### Production Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Deploy application
- [ ] Run `npm run create-indexes`
- [ ] Monitor logs for errors
- [ ] Test critical workflows

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Check database indexes are created
- [ ] Verify performance metrics
- [ ] Document any issues

---

## 🔍 What the Cleanup Script Does

The PowerShell script (`cleanup-register-calls.ps1`) will:

1. **Find all API route files** in `app/api/**/*.ts`
2. **Remove import statements** like:
   ```typescript
   import { registerAllModels } from '@/lib/model-registry';
   ```
3. **Remove function calls** like:
   ```typescript
   // Register all models first
   registerAllModels();
   ```
4. **Clean up** extra blank lines
5. **Report** how many files were modified

### Why Remove These Calls?

Before the fix:
```typescript
// ❌ OLD CODE - Called manually in every route
import { registerAllModels } from '@/lib/model-registry';

export async function GET(req: NextRequest) {
  registerAllModels(); // ❌ Redundant!
  const conn = await getTenantConnection(orgId);
  // ...
}
```

After the fix:
```typescript
// ✅ NEW CODE - Automatic via getTenantConnection
export async function GET(req: NextRequest) {
  const conn = await getTenantConnection(orgId); // ✅ Auto-registers!
  // ...
}
```

The `getTenantConnection()` function now automatically calls `ensureSchemasRegistered()` which uses a global flag to register schemas only once.

---

## 🧪 Testing Scenarios

### Test 1: Single Organization
```bash
# Create products, customers, bills
# Should work without errors
```

### Test 2: Multiple Organizations
```bash
# Create same email user in org1 and org2
POST /api/auth/register
{
  "email": "admin@test.com",
  "organizationId": "org1",
  "password": "test123"
}

POST /api/auth/register
{
  "email": "admin@test.com",
  "organizationId": "org2",
  "password": "test123"
}

# Both should succeed ✅
```

### Test 3: Rapid API Calls
```bash
# Make multiple rapid requests
for ($i=0; $i -lt 10; $i++) {
  Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Headers @{Authorization="Bearer $token"}
}

# Should see "Model schemas registered globally" only ONCE in console
```

### Test 4: Cold Start (Production)
```bash
# Restart server and make first request
# Should not see E11000 errors
```

---

## 🐛 Troubleshooting

### Issue: Cleanup script doesn't run
**Solution:**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run script
.\scripts\cleanup-register-calls.ps1
```

### Issue: TypeScript compilation errors after cleanup
**Solution:**
```bash
# Check if any files still import registerAllModels but don't use it
# The cleanup script should have removed these, but verify manually
```

### Issue: "Cannot overwrite model" still appears
**Solution:**
```bash
# Clear Next.js cache completely
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# Restart dev server
npm run dev
```

### Issue: Indexes not created in production
**Solution:**
```bash
# Manually run index creation
npm run create-indexes

# Or create indexes for specific tenant
node scripts/create-indexes.js
```

---

## 📊 Expected Results

### Console Output (Development)
```
⚙️  Auto-indexing enabled in development
✅ Model schemas registered globally
✅ All 11 model schemas registered
✅ Tenant database connected: tenant_org123
📋 Registering 11 models for tenant connection...
  ✅ Registered model: User
  ✅ Registered model: Product
  ...
📋 Total models in connection: 11
```

### Console Output (Production)
```
⚙️  Auto-indexing disabled in production
✅ Model schemas registered globally
✅ All 11 model schemas registered
✅ Tenant database connected: tenant_org123
📋 Registering 11 models for tenant connection...
  ✅ Registered model: User
  ✅ Registered model: Product
  ...
📋 Total models in connection: 11
```

### Index Creation Output
```
🚀 Starting index creation process...
📡 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 3 tenant database(s)

📋 Creating indexes for tenant_org1...
  Creating User indexes...
  Creating Product indexes...
  ...
✅ All indexes created for tenant_org1

==================================================
📊 Index Creation Summary
==================================================
✅ Successful: 3
❌ Failed: 0
📁 Total: 3
==================================================
```

---

## 🎯 Success Criteria

Migration is successful when:

- ✅ No "Cannot overwrite model" errors
- ✅ No E11000 duplicate key errors in production
- ✅ Same email works across different organizations
- ✅ All API routes work correctly
- ✅ Console shows "Model schemas registered globally" only once
- ✅ Indexes are created in production
- ✅ Performance is improved (faster cold starts)

---

## 📞 Support

If you encounter issues:

1. Check `MODEL_REGISTRATION_FIXES.md` for detailed explanations
2. Review `QUICK_FIX_SUMMARY.md` for quick reference
3. Check the troubleshooting section above
4. Review git diff to see what changed

---

## 🎓 Key Learnings

1. **Never auto-execute at module import** in Next.js - modules reload frequently
2. **Use global flags** to prevent duplicate operations
3. **Disable auto-indexing in production** - create indexes manually
4. **Multi-tenant indexes** should always include `organizationId`
5. **Test with multiple tenants** to ensure proper isolation

---

## ✅ Final Checklist

Before marking migration as complete:

- [ ] Cleanup script executed successfully
- [ ] No TypeScript errors
- [ ] Dev server runs without errors
- [ ] Tested with multiple organizations
- [ ] Production deployment successful
- [ ] Indexes created in production
- [ ] Monitoring shows no errors
- [ ] Performance metrics look good
- [ ] Team notified of changes

---

**Status:** Ready to migrate 🚀

Run the cleanup script and you're good to go!
