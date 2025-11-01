# 🚨 Immediate Actions Required

## Current Issues

1. ❌ **Login failing** - Role validation error (existing users have old roles)
2. ❌ **Management center redirects** - Role check failing
3. ⚠️ **Tenant users not created** - Need to activate dual-database routes

## 🔧 Quick Fix (5 minutes)

### Step 1: Run the PowerShell Script

```powershell
# In PowerShell, navigate to project root
cd c:\Users\RudranshWork\Desktop\new\FinalLiqourPOS

# Run the fix script
.\fix-user-routes.ps1
```

This will replace the user routes with the dual-database versions.

### Step 2: Migrate User Roles in Database

```powershell
# Run the migration script
node scripts/migrate-user-roles.js
```

This will update:
- First `admin` → `org_admin`
- Other `admin` → stays `admin`  
- All `staff` → `sales`
- `manager` → stays `manager`

### Step 3: Restart Dev Server

```powershell
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Clear Browser & Re-login

1. Open browser DevTools (F12)
2. Go to **Application** → **Storage** → **Clear site data**
3. Close DevTools
4. Go to login page
5. Log in again

## ✅ What's Been Fixed

### Code Changes Completed:

1. **✅ User Roles Updated**
   - `models/User.ts` - New role enum
   - `lib/model-registry.ts` - Updated schema
   - `lib/auth.ts` - Updated TokenPayload
   - `lib/auth-middleware.ts` - Added org_admin support

2. **✅ Dual-Database User APIs Created**
   - `app/api/users/route.ts` - Saves to BOTH databases
   - `app/api/users/[id]/route.dual-db.ts` - Update/delete in BOTH databases

3. **✅ Organization Verification Fixed**
   - `app/api/auth/verify-organization/route.ts` - Creates org_admin in both DBs

4. **✅ Login Enhanced**
   - `app/api/auth/login/route.ts` - Initializes tenant database

## 🧪 Testing After Fix

### 1. Test Login
```
✅ Should log in successfully
✅ Should see correct role in localStorage
✅ Console should show: "Tenant database initialized"
```

### 2. Test Management Center
```
✅ Should NOT redirect to dashboard
✅ Should show management options
```

### 3. Test User Creation
```
✅ Create a new user
✅ Check main database: user should exist
✅ Check tenant database: user should exist
```

### 4. Check Databases

**Main Database:**
```javascript
use liquor_pos_main
db.users.find().pretty()
// Should show users with new roles
```

**Tenant Database:**
```javascript
// Replace with your actual org ID
use tenant_507f1f77bcf86cd799439011
db.users.find().pretty()
// Should show users created after the fix
```

## 📋 Expected Console Logs

After login, you should see:
```
✅ All model schemas registered
✅ Tenant database connected: tenant_xxxxx
✅ Tenant database initialized for organization: [Your Org Name]
```

When creating a user:
```
✅ User created in main database: user@example.com
✅ User created in tenant database: user@example.com
```

## 🐛 Troubleshooting

### Issue: "User validation failed: role"
**Solution:** Run the migration script (Step 2 above)

### Issue: Management center still redirects
**Solution:** 
1. Clear browser localStorage
2. Log out and log back in
3. Check your role in DevTools → Application → Local Storage

### Issue: Users not appearing in tenant database
**Solution:**
1. Verify `fix-user-routes.ps1` ran successfully
2. Check that `app/api/users/[id]/route.ts` has the dual-database code
3. Restart dev server

### Issue: "Cannot find module" errors
**Solution:**
```powershell
npm install
```

## 📞 Verification Checklist

After completing all steps:

- [ ] Migration script ran successfully
- [ ] Dev server restarted
- [ ] Browser cache cleared
- [ ] Can log in without errors
- [ ] Management center accessible
- [ ] Can create new users
- [ ] New users appear in both databases
- [ ] Console shows tenant database logs

## 🎯 What Happens After Fix

### User Creation Flow:
```
1. Org Admin creates user via UI
   ↓
2. POST /api/users
   ↓
3. User saved to MAIN database (liquor_pos_main)
   ↓
4. User saved to TENANT database (tenant_xxxxx)
   ↓
5. Success response
```

### Login Flow:
```
1. User logs in
   ↓
2. Authenticate against MAIN database
   ↓
3. Register all model schemas
   ↓
4. Initialize TENANT database connection
   ↓
5. Return JWT with organizationId
   ↓
6. All subsequent requests use TENANT database
```

## 📚 Next Steps (After Fix)

Once everything is working:

1. **Update User Management UI** - Add table view, edit modal, password toggles
2. **Test all CRUD operations** - Create, read, update, delete users
3. **Verify data isolation** - Check that orgs can't see each other's data
4. **Update other API routes** - Products, Sales, etc. to use tenant DB

## 💡 Important Notes

- **Org Admin** is the highest role - only one per organization
- **Admin** can manage users but can't delete other admins
- **Manager** can view users but has limited edit rights
- **Sales/Accountant/Tax Officer** are staff roles with specific permissions

- Users are stored in **BOTH** databases for redundancy and flexibility
- Main DB is used for authentication and cross-org queries
- Tenant DB is used for all business operations

---

**Need help?** Check `FIXES_NEEDED.md` for detailed troubleshooting.
