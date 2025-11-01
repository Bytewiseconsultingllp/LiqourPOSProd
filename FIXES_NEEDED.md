# Critical Fixes Needed

## ✅ Completed

1. **Updated User Roles** - Changed from `admin/manager/staff` to `org_admin/admin/manager/sales/accountant/tax_officer`
   - ✅ `models/User.ts`
   - ✅ `lib/model-registry.ts`
   - ✅ `lib/auth.ts` (TokenPayload interface)
   - ✅ `lib/auth-middleware.ts` (added requireOrgAdmin, updated others)

2. **Created Dual-Database User APIs**
   - ✅ `app/api/users/route.ts` - Now saves to BOTH main and tenant databases
   - ⚠️ `app/api/users/[id]/route.ts` - Needs manual replacement (see below)

3. **Fixed Organization Verification**
   - ✅ `app/api/auth/verify-organization/route.ts` - Creates org_admin in both databases

## ⚠️ Needs Manual Action

### 1. Replace `app/api/users/[id]/route.ts`

The file `app/api/users/[id]/route.dual-db.ts` contains the correct dual-database version.

**Manual steps:**
```powershell
# In PowerShell, navigate to the project root
cd c:\Users\RudranshWork\Desktop\new\FinalLiqourPOS

# Delete old file
Remove-Item "app\api\users\[id]\route.ts"

# Rename dual-db version
Rename-Item "app\api\users\[id]\route.dual-db.ts" "route.ts"
```

OR simply copy the content from `route.dual-db.ts` to `route.ts` manually in your editor.

### 2. Update Existing Users' Roles in Database

Your existing users have old roles (`admin`, `manager`, `staff`) that don't match the new enum. You need to update them:

**Option A: Via MongoDB Compass or mongosh:**
```javascript
// Connect to your main database
use liquor_pos_main

// Update all users with old roles
db.users.updateMany(
  { role: "admin" },
  { $set: { role: "org_admin" } }
)

db.users.updateMany(
  { role: "staff" },
  { $set: { role: "sales" } }
)

// manager stays as manager
```

**Option B: Create a migration script:**

Create `scripts/migrate-roles.js`:
```javascript
const mongoose = require('mongoose');

async function migrateRoles() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = mongoose.model('User');
  
  // Update admins to org_admin
  await User.updateMany(
    { role: 'admin' },
    { $set: { role: 'org_admin' } }
  );
  
  // Update staff to sales
  await User.updateMany(
    { role: 'staff' },
    { $set: { role: 'sales' } }
  );
  
  console.log('✅ Roles migrated successfully');
  await mongoose.disconnect();
}

migrateRoles().catch(console.error);
```

Run with: `node scripts/migrate-roles.js`

### 3. Fix Management Center Redirect

The management center is redirecting because of role checks. After updating user roles in the database, this should work.

**Check your user's role:**
1. Open browser DevTools
2. Go to Application > Local Storage
3. Find the `user` key
4. Check the `role` value - it should be one of the new roles

If it's still an old role, **log out and log back in** to get a new JWT token with the correct role.

### 4. Environment Variable Check

Ensure your `.env` file has:
```env
APP_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/liquor_pos_main
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

The verification email URL uses `APP_URL`.

## 🔄 After Login - Tenant Database Usage

The login route (`app/api/auth/login/route.ts`) now:
1. ✅ Registers all model schemas
2. ✅ Creates/connects to tenant database
3. ✅ Returns JWT with organizationId

**All subsequent API calls should use the tenant database.**

The new user routes (`app/api/users/route.ts`) already do this:
- Creates users in BOTH main and tenant databases
- Updates users in BOTH databases
- Deletes users from BOTH databases

## 📋 Testing Checklist

After making the above fixes:

1. **Update user roles in database** (see step 2 above)
2. **Log out and log back in** to get new JWT token
3. **Test Management Center access** - should work now
4. **Create a new user** - should appear in both main and tenant databases
5. **Edit a user** - should update in both databases
6. **Delete a user** - should remove from both databases

## 🐛 Debugging

If you still have issues:

### Check Console Logs
Look for these messages:
- `✅ Tenant database initialized for organization: [name]`
- `✅ User created in main database: [email]`
- `✅ User created in tenant database: [email]`

### Check Database
```javascript
// Main database
use liquor_pos_main
db.users.find().pretty()

// Tenant database (replace with your org ID)
use tenant_507f1f77bcf86cd799439011
db.users.find().pretty()
```

### Common Errors

**"User validation failed: role: `org_admin` is not a valid enum value"**
- Your user model still has old enum values
- Check `models/User.ts` line 45
- Should be: `enum: ['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']`

**"Only Organization Admins can manage users"**
- Your JWT token has an old role
- Log out and log back in
- Or update your role in the database

**"Management center redirects to dashboard"**
- Check browser console for errors
- Verify your role is `org_admin`, `admin`, or `manager`
- Clear browser cache and localStorage

## 📞 Need Help?

If you encounter any issues:
1. Check the console logs (both browser and server)
2. Verify database contents
3. Ensure all files are saved
4. Restart the dev server (`npm run dev`)
