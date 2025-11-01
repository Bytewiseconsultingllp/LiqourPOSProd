# Manual Role Update Guide

Since the migration script requires MongoDB connection, here's how to update roles manually:

## Option 1: Using MongoDB Compass (Recommended)

1. **Open MongoDB Compass**
2. **Connect to your database**
3. **Select database**: `liquor_pos_main`
4. **Select collection**: `users`
5. **Update roles:**

### Update First Admin to org_admin:
```javascript
// Find the first admin user
// Click on the user document
// Change "role" field from "admin" to "org_admin"
// Click Update
```

### Update Staff to Sales:
```javascript
// Filter: { "role": "staff" }
// For each staff user:
//   - Click on document
//   - Change "role" from "staff" to "sales"
//   - Click Update
```

## Option 2: Using MongoDB Atlas Web Interface

1. Go to **MongoDB Atlas**
2. Click **Browse Collections**
3. Select **liquor_pos_main** database
4. Select **users** collection
5. Find and edit each user's role field

## Option 3: Using mongosh (MongoDB Shell)

```javascript
// Connect to your database
mongosh "your-connection-string"

// Switch to database
use liquor_pos_main

// Update first admin to org_admin
db.users.updateOne(
  { role: "admin" },
  { $set: { role: "org_admin" } }
)

// Update all staff to sales
db.users.updateMany(
  { role: "staff" },
  { $set: { role: "sales" } }
)

// Verify changes
db.users.find({}, { email: 1, role: 1 }).pretty()
```

## Option 4: Run Migration with Correct MongoDB URI

If you know your MongoDB connection string:

1. **Edit** `scripts/migrate-user-roles.js`
2. **Line 18**, replace with your actual MongoDB URI:
   ```javascript
   const mongoUri = 'YOUR_ACTUAL_MONGODB_URI_HERE';
   ```
3. **Run**: `node scripts/migrate-user-roles.js`

## What Roles to Use

- **org_admin** - Organization administrator (highest role, one per org)
- **admin** - Administrator (can manage users except org_admin)
- **manager** - Manager (can view and manage operations)
- **sales** - Sales staff (default for most users)
- **accountant** - Accountant role
- **tax_officer** - Tax officer role

## After Updating Roles

1. **Restart your dev server**: `npm run dev`
2. **Clear browser cache**:
   - Open DevTools (F12)
   - Application → Storage → Clear site data
3. **Log out and log back in**
4. **Verify**: Check localStorage → user → role should be one of the new roles

## Verification

After updating, run this in mongosh to verify:

```javascript
use liquor_pos_main
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

Expected output:
```
[
  { _id: 'admin', count: X },
  { _id: 'manager', count: X },
  { _id: 'org_admin', count: X },
  { _id: 'sales', count: X }
]
```

## Quick Test

After updating roles and restarting:

1. **Login** - Should work without errors
2. **Check Console** - Should see "Tenant database initialized"
3. **Access Management Center** - Should NOT redirect
4. **Create a User** - Should create in both databases

---

**Need your MongoDB URI?** Check your `.env` file or MongoDB Atlas dashboard.
