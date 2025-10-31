# Multi-Tenant Database - Quick Reference

## 🚀 Basic Usage

### Simple GET Route
```typescript
import { withTenantContext, getModel } from '@/lib/tenant-middleware';

export const GET = withTenantContext(async (request, context) => {
  const Product = getModel(context, 'Product');
  const products = await Product.find({ organizationId: context.organizationId });
  return NextResponse.json({ data: products });
});
```

### POST with Validation
```typescript
import { withTenantContext, getModel } from '@/lib/tenant-middleware';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
});

export const POST = withTenantContext(async (request, context) => {
  const body = await request.json();
  const validation = schema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
  }
  
  const Product = getModel(context, 'Product');
  const product = await Product.create({
    ...validation.data,
    organizationId: context.organizationId
  });
  
  return NextResponse.json({ data: product }, { status: 201 });
});
```

### With Permission Check
```typescript
import { withTenantContext, getModel, requireAdmin } from '@/lib/tenant-middleware';

export const DELETE = withTenantContext(async (request, context) => {
  requireAdmin(context); // Only admins can delete
  
  const Product = getModel(context, 'Product');
  // ... delete logic
});
```

### With Route Parameters
```typescript
import { getTenantContext, getModel } from '@/lib/tenant-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await getTenantContext(request);
  const Product = getModel(context, 'Product');
  
  const product = await Product.findByIdAndUpdate(params.id, data);
  return NextResponse.json({ data: product });
}
```

## 📦 Available Models

```typescript
const User = getModel(context, 'User');
const Product = getModel(context, 'Product');
const Sale = getModel(context, 'Sale');
const InventoryTransaction = getModel(context, 'InventoryTransaction');
```

## 🔐 Permission Helpers

```typescript
import { requireRole, requireAdmin, requireAdminOrManager } from '@/lib/tenant-middleware';

// Check specific roles
requireRole(context, ['admin', 'manager']);

// Admin only
requireAdmin(context);

// Admin or Manager
requireAdminOrManager(context);
```

## 🎯 Context Properties

```typescript
context.organizationId  // Tenant's organization ID
context.connection      // Database connection
context.userId          // Authenticated user ID
context.userRole        // User's role (admin/manager/staff)
```

## 🔄 Common Patterns

### List with Pagination
```typescript
export const GET = withTenantContext(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;
  
  const Product = getModel(context, 'Product');
  const [products, total] = await Promise.all([
    Product.find({ organizationId: context.organizationId })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments({ organizationId: context.organizationId })
  ]);
  
  return NextResponse.json({
    data: products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});
```

### Search and Filter
```typescript
export const GET = withTenantContext(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  
  const Product = getModel(context, 'Product');
  const query: any = { organizationId: context.organizationId };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  const products = await Product.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ data: products });
});
```

### Create with Validation
```typescript
export const POST = withTenantContext(async (request, context) => {
  try {
    const body = await request.json();
    
    // Validate
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const Model = getModel(context, 'ModelName');
    
    // Check duplicates
    const existing = await Model.findOne({
      uniqueField: validation.data.uniqueField,
      organizationId: context.organizationId
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Already exists' },
        { status: 409 }
      );
    }
    
    // Create
    const item = await Model.create({
      ...validation.data,
      organizationId: context.organizationId
    });
    
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
```

### Update
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext(request);
    const body = await request.json();
    
    const Model = getModel(context, 'ModelName');
    const item = await Model.findOneAndUpdate(
      { _id: params.id, organizationId: context.organizationId },
      body,
      { new: true }
    );
    
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data: item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Delete
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext(request);
    requireAdminOrManager(context);
    
    const Model = getModel(context, 'ModelName');
    const item = await Model.findOneAndDelete({
      _id: params.id,
      organizationId: context.organizationId
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 🐛 Error Handling

```typescript
export const POST = withTenantContext(async (request, context) => {
  try {
    // Your logic
  } catch (error: any) {
    console.error('Error:', error);
    
    // Permission errors
    if (error.message.includes('permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    // Validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
    }
    
    // Generic error
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
});
```

## 📝 Imports Cheat Sheet

```typescript
// Tenant middleware
import { 
  withTenantContext,
  getTenantContext,
  getModel,
  requireRole,
  requireAdmin,
  requireAdminOrManager
} from '@/lib/tenant-middleware';

// Validation
import { z } from 'zod';

// Next.js
import { NextRequest, NextResponse } from 'next/server';

// Auth utilities (if needed)
import { hashPassword, comparePassword } from '@/lib/auth';
```

## ✅ Checklist for New Routes

- [ ] Import `withTenantContext` and `getModel`
- [ ] Wrap handler with `withTenantContext`
- [ ] Get models using `getModel(context, 'ModelName')`
- [ ] Include `organizationId: context.organizationId` in queries
- [ ] Add permission checks if needed
- [ ] Validate input with Zod
- [ ] Handle errors properly
- [ ] Test with different roles
- [ ] Test data isolation

## 🔍 Debugging

### Check Connection Stats
```typescript
import { getConnectionStats } from '@/lib/tenant-db';
console.log(getConnectionStats());
```

### Verify Token
```typescript
const authHeader = request.headers.get('authorization');
const token = authHeader?.substring(7);
console.log('Token:', token);
```

### Check Context
```typescript
export const GET = withTenantContext(async (request, context) => {
  console.log('Context:', {
    orgId: context.organizationId,
    userId: context.userId,
    role: context.userRole
  });
  // ...
});
```

## 📚 Documentation

- `MULTI_TENANT_ARCHITECTURE.md` - Full architecture guide
- `MIGRATION_GUIDE.md` - Migration instructions
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `app/api/*/route.new.ts` - Example implementations

## 🎯 Key Points

1. **Always use `withTenantContext`** for automatic tenant handling
2. **Get models with `getModel()`** instead of importing
3. **Include `organizationId`** in all queries
4. **Use permission helpers** for access control
5. **Handle errors gracefully** with proper status codes
6. **Test data isolation** between tenants
7. **Keep `.new.ts` files** until fully tested

---

**Quick Start**: Copy a `.new.ts` example and modify for your needs!
