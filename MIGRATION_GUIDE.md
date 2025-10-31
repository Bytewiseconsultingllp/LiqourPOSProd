# Migration Guide: Multi-Tenant Database Architecture

## Overview

This guide will help you migrate existing API routes to use the new multi-tenant database architecture.

## Quick Reference

### File Naming Convention

New API routes are created with `.new.ts` extension:
- `route.new.ts` - New multi-tenant version
- `route.ts` - Old version (keep for reference)

Once tested, rename:
```bash
# Backup old version
mv route.ts route.old.ts

# Activate new version
mv route.new.ts route.ts
```

## Step-by-Step Migration

### Step 1: Update Imports

**Before:**
```typescript
import { connectToDatabase } from '@/lib/mongoose';
import Product from '@/models/Product';
import User from '@/models/User';
```

**After:**
```typescript
import { withTenantContext, getModel } from '@/lib/tenant-middleware';
```

### Step 2: Wrap Route Handler

**Before:**
```typescript
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    // ... your logic
  } catch (error) {
    // ... error handling
  }
}
```

**After:**
```typescript
export const GET = withTenantContext(async (request, context) => {
  try {
    // ... your logic (no need for connectToDatabase)
  } catch (error) {
    // ... error handling
  }
});
```

### Step 3: Replace Model Access

**Before:**
```typescript
const products = await Product.find({ organizationId: tenantId });
```

**After:**
```typescript
const Product = getModel(context, 'Product');
const products = await Product.find({ organizationId: context.organizationId });
```

### Step 4: Use Context Properties

**Available Context Properties:**
- `context.organizationId` - The tenant's organization ID
- `context.connection` - The tenant's database connection
- `context.userId` - The authenticated user's ID
- `context.userRole` - The user's role (admin/manager/staff)

### Step 5: Add Permission Checks

**Before:**
```typescript
// Manual role checking
const user = await User.findById(userId);
if (user.role !== 'admin' && user.role !== 'manager') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

**After:**
```typescript
import { requireAdminOrManager } from '@/lib/tenant-middleware';

export const DELETE = withTenantContext(async (request, context) => {
  requireAdminOrManager(context); // Throws error if not authorized
  // ... your logic
});
```

## Complete Examples

### Example 1: GET Products

**Before:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    await connectToDatabase();
    
    const products = await Product.find({
      organizationId: payload.organizationId
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After:**
```typescript
import { NextResponse } from 'next/server';
import { withTenantContext, getModel } from '@/lib/tenant-middleware';

export const GET = withTenantContext(async (request, context) => {
  try {
    const Product = getModel(context, 'Product');
    
    const products = await Product.find({
      organizationId: context.organizationId
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
```

### Example 2: POST Create User (with permissions)

**Before:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';
import { verifyAccessToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    // Check permissions
    if (payload.role !== 'admin' && payload.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const body = await request.json();
    const hashedPassword = await hashPassword(body.password);
    
    const user = await User.create({
      ...body,
      password: hashedPassword,
      organizationId: payload.organizationId
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After:**
```typescript
import { NextResponse } from 'next/server';
import { withTenantContext, getModel, requireAdminOrManager } from '@/lib/tenant-middleware';
import { hashPassword } from '@/lib/auth';

export const POST = withTenantContext(async (request, context) => {
  try {
    requireAdminOrManager(context);
    
    const User = getModel(context, 'User');
    const body = await request.json();
    const hashedPassword = await hashPassword(body.password);
    
    const user = await User.create({
      ...body,
      password: hashedPassword,
      organizationId: context.organizationId
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    if (error.message.includes('permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
```

### Example 3: DELETE with ID Parameter

**Before:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Product from '@/models/Product';
import { verifyAccessToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    await connectToDatabase();
    
    const product = await Product.findOneAndDelete({
      _id: params.id,
      organizationId: payload.organizationId
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext, getModel } from '@/lib/tenant-middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext(request);
    const Product = getModel(context, 'Product');
    
    const product = await Product.findOneAndDelete({
      _id: params.id,
      organizationId: context.organizationId
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    if (error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Note:** For routes with params, use `getTenantContext` directly instead of `withTenantContext`.

## Available Models

Use these model names with `getModel(context, 'ModelName')`:

- `User` - User accounts
- `Product` - Products
- `Sale` - Sales transactions
- `InventoryTransaction` - Inventory movements

## Permission Helpers

```typescript
import {
  requireRole,
  requireAdmin,
  requireAdminOrManager
} from '@/lib/tenant-middleware';

// Check specific roles
if (!requireRole(context, ['admin', 'manager'])) {
  throw new Error('Insufficient permissions');
}

// Require admin only
requireAdmin(context);

// Require admin or manager
requireAdminOrManager(context);
```

## Testing Checklist

After migrating a route, test:

- [ ] Authentication works (valid token required)
- [ ] Authorization works (role-based access)
- [ ] Data isolation (only tenant's data returned)
- [ ] Error handling (proper error messages)
- [ ] Performance (no regression)

## Common Issues

### Issue 1: Model Not Found

**Error:** `Model "Product" not found`

**Solution:** Ensure `registerAllModels()` is called in the login route.

### Issue 2: Connection Timeout

**Error:** `Connection timeout`

**Solution:** Check MongoDB URI and network connectivity.

### Issue 3: Permission Denied

**Error:** `Insufficient permissions`

**Solution:** Verify JWT token includes correct role and use appropriate permission helper.

### Issue 4: organizationId Mismatch

**Error:** Data from wrong organization

**Solution:** Always include `organizationId: context.organizationId` in queries.

## Rollback Plan

If issues arise:

1. Keep old routes as backup (`.old.ts`)
2. Rename new route: `route.new.ts` → `route.backup.ts`
3. Restore old route: `route.old.ts` → `route.ts`
4. Restart application

## Migration Order

Recommended order for migrating routes:

1. ✅ **Login route** (already done)
2. **Read-only routes** (GET endpoints)
   - `/api/products` (GET)
   - `/api/users` (GET)
   - `/api/sales` (GET)
3. **Write routes** (POST/PUT/DELETE)
   - `/api/products` (POST, PUT, DELETE)
   - `/api/users` (POST, PUT, DELETE)
   - `/api/sales` (POST)
4. **Complex routes** (with transactions)
   - Sales with inventory updates
   - Bulk operations

## Support

If you encounter issues during migration:

1. Check `MULTI_TENANT_ARCHITECTURE.md` for architecture details
2. Review example routes in `app/api/*/route.new.ts`
3. Check console logs for connection/model errors
4. Verify JWT token contains `organizationId`

## Next Steps

After successful migration:

1. Remove old route files (`.old.ts`)
2. Update frontend to handle new response formats (if changed)
3. Update tests to use new architecture
4. Monitor performance and connection usage
5. Document any custom patterns for your team
