# Multi-Tenant Database Architecture

## Overview

This application uses a **multi-tenant database architecture** where each organization gets its own isolated MongoDB database. This provides:

- **Data Isolation**: Complete separation of data between organizations
- **Security**: No risk of data leakage between tenants
- **Scalability**: Each tenant database can be optimized independently
- **Performance**: Reduced query complexity and better indexing
- **Compliance**: Easier to meet data residency requirements

## Architecture Components

### 1. Tenant Database Manager (`lib/tenant-db.ts`)

Manages database connections for each tenant organization.

**Key Functions:**
- `getTenantConnection(organizationId)` - Get or create a tenant-specific database connection
- `getTenantModel(connection, modelName)` - Get a model from a tenant connection
- `registerModelSchema(modelName, schema)` - Register a model schema for all tenants
- `closeTenantConnection(organizationId)` - Close a specific tenant connection

**Database Naming:**
- Main database: `liquor_pos_main` (stores organizations and pending signups)
- Tenant databases: `tenant_{organizationId}` (e.g., `tenant_507f1f77bcf86cd799439011`)

### 2. Model Registry (`lib/model-registry.ts`)

Centralized registration of all Mongoose schemas.

**Registered Models:**
- `User` - User accounts within an organization
- `Product` - Product catalog
- `Sale` - Sales transactions
- `InventoryTransaction` - Inventory movement tracking

**Usage:**
```typescript
import { registerAllModels } from '@/lib/model-registry';

// Call once at application startup or login
registerAllModels();
```

### 3. Tenant Middleware (`lib/tenant-middleware.ts`)

Provides utilities for handling tenant context in API routes.

**Key Functions:**
- `getTenantContext(request)` - Extract tenant info from JWT token
- `withTenantContext(handler)` - Wrapper for API routes with automatic tenant context
- `getModel(context, modelName)` - Get a model from tenant context
- `requireRole(context, roles)` - Check user permissions
- `requireAdminOrManager(context)` - Ensure admin/manager access
- `requireAdmin(context)` - Ensure admin-only access

### 4. Tenant Context (`lib/tenant-context.ts`)

Utilities for extracting tenant information from requests.

## How It Works

### 1. User Signup & Organization Creation

```
User Signs Up
    ↓
Create PendingOrganization (main database)
    ↓
Send Verification Email
    ↓
User Verifies Email
    ↓
Create Organization (main database)
Create Admin User (main database)
```

### 2. User Login & Database Initialization

```
User Logs In
    ↓
Verify Credentials (main database)
    ↓
Register All Model Schemas
    ↓
Create/Connect to Tenant Database
    ↓
Return JWT with organizationId
```

**Login Process:**
```typescript
// 1. Authenticate user (main database)
const user = await User.findOne({ email });
const organization = await Organization.findById(user.organizationId);

// 2. Initialize tenant database
registerAllModels();
const tenantConnection = await getTenantConnection(organization._id);

// 3. Generate JWT with organizationId
const token = generateAccessToken({
  userId: user._id,
  organizationId: user.organizationId,
  role: user.role
});
```

### 3. API Request Flow

```
API Request with JWT
    ↓
Extract organizationId from Token
    ↓
Get/Create Tenant Connection
    ↓
Get Models from Tenant Connection
    ↓
Execute Database Operations
    ↓
Return Response
```

**Example API Route:**
```typescript
import { withTenantContext, getModel } from '@/lib/tenant-middleware';

export const GET = withTenantContext(async (request, context) => {
  // context.organizationId - The tenant's organization ID
  // context.connection - The tenant's database connection
  // context.userId - The authenticated user's ID
  // context.userRole - The user's role
  
  const Product = getModel(context, 'Product');
  
  const products = await Product.find({
    organizationId: context.organizationId
  });
  
  return NextResponse.json({ data: products });
});
```

## Database Structure

### Main Database (`liquor_pos_main`)

Stores shared data:
- `organizations` - Organization registry
- `users` - All user accounts (with organizationId reference)
- `pendingorganizations` - Unverified signups

### Tenant Databases (`tenant_{organizationId}`)

Each tenant has their own database with:
- `users` - Organization's users
- `products` - Product catalog
- `sales` - Sales transactions
- `inventorytransactions` - Inventory movements

## Migration Guide

### Converting Existing API Routes

**Before (Old Approach):**
```typescript
import { connectToDatabase } from '@/lib/mongoose';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  await connectToDatabase();
  
  const tenantId = request.headers.get('x-tenant-id');
  const products = await Product.find({ organizationId: tenantId });
  
  return NextResponse.json({ data: products });
}
```

**After (New Approach):**
```typescript
import { withTenantContext, getModel } from '@/lib/tenant-middleware';

export const GET = withTenantContext(async (request, context) => {
  const Product = getModel(context, 'Product');
  
  const products = await Product.find({
    organizationId: context.organizationId
  });
  
  return NextResponse.json({ data: products });
});
```

### Key Changes

1. **No Manual Connection**: `withTenantContext` handles connection automatically
2. **No Manual Model Import**: Use `getModel(context, 'ModelName')`
3. **Automatic Auth**: Token verification happens automatically
4. **Type Safety**: Context provides typed access to tenant info

## Benefits

### 1. Performance
- **Smaller Databases**: Each query operates on a smaller dataset
- **Better Indexes**: Indexes are more efficient with less data
- **Reduced Complexity**: No need to filter by organizationId in every query

### 2. Security
- **Complete Isolation**: Impossible to accidentally query another tenant's data
- **Easier Auditing**: Each tenant's data is clearly separated
- **Compliance**: Easier to meet GDPR, HIPAA, etc.

### 3. Scalability
- **Independent Scaling**: Can move tenant databases to different servers
- **Backup/Restore**: Can backup/restore individual tenants
- **Database Sharding**: Easier to implement sharding strategies

### 4. Development
- **Cleaner Code**: No organizationId filters in every query
- **Better Testing**: Can test with isolated tenant databases
- **Easier Debugging**: Clear separation of tenant data

## Connection Management

### Connection Pooling

Each tenant connection maintains its own connection pool:
- **Max Pool Size**: 10 connections
- **Min Pool Size**: 2 connections
- **Socket Timeout**: 45 seconds
- **Server Selection Timeout**: 5 seconds

### Connection Lifecycle

1. **Creation**: On first API request after login
2. **Reuse**: Subsequent requests use cached connection
3. **Cleanup**: Automatic cleanup on process termination

### Monitoring

Get connection statistics:
```typescript
import { getConnectionStats } from '@/lib/tenant-db';

const stats = getConnectionStats();
// {
//   activeConnections: 5,
//   registeredModels: 4,
//   connections: [...]
// }
```

## Best Practices

### 1. Always Use Tenant Context

```typescript
// ✅ Good
export const GET = withTenantContext(async (request, context) => {
  const Product = getModel(context, 'Product');
  // ...
});

// ❌ Bad
export async function GET(request: NextRequest) {
  await connectToDatabase();
  // ...
}
```

### 2. Include organizationId in Queries

Even though data is isolated, always include organizationId for consistency:

```typescript
const products = await Product.find({
  organizationId: context.organizationId,
  category: 'wine'
});
```

### 3. Use Role-Based Access Control

```typescript
import { requireAdminOrManager } from '@/lib/tenant-middleware';

export const DELETE = withTenantContext(async (request, context) => {
  requireAdminOrManager(context); // Throws error if not authorized
  
  // Delete operation
});
```

### 4. Handle Errors Gracefully

```typescript
export const POST = withTenantContext(async (request, context) => {
  try {
    // Your logic
  } catch (error: any) {
    console.error('Error:', error);
    
    if (error.message.includes('permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
});
```

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to tenant database"
**Solution**: Check MongoDB URI and ensure database name is valid

### Model Not Found

**Problem**: "Model 'Product' not found"
**Solution**: Ensure `registerAllModels()` is called at login

### Permission Errors

**Problem**: "Insufficient permissions"
**Solution**: Check user role in JWT token and use appropriate middleware

### Stale Connections

**Problem**: Connection timeout errors
**Solution**: Connections are automatically cleaned up. If issues persist, restart the application.

## Environment Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/liquor_pos_main

# JWT Secrets
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Optional: Default tenant for development
DEFAULT_TENANT_ID=default
```

## Testing

### Unit Tests

```typescript
import { getTenantConnection, registerModelSchema } from '@/lib/tenant-db';

describe('Tenant Database', () => {
  it('should create separate connections for different tenants', async () => {
    const conn1 = await getTenantConnection('org1');
    const conn2 = await getTenantConnection('org2');
    
    expect(conn1.name).toBe('tenant_org1');
    expect(conn2.name).toBe('tenant_org2');
  });
});
```

### Integration Tests

```typescript
describe('Products API', () => {
  it('should only return products for the authenticated tenant', async () => {
    const response = await fetch('/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    expect(data.data.every(p => p.organizationId === orgId)).toBe(true);
  });
});
```

## Future Enhancements

1. **Database Sharding**: Distribute tenant databases across multiple servers
2. **Read Replicas**: Use read replicas for high-traffic tenants
3. **Caching Layer**: Add Redis caching for frequently accessed data
4. **Analytics**: Per-tenant analytics and reporting
5. **Backup Automation**: Automated backup/restore for each tenant
6. **Migration Tools**: Tools for migrating tenants between databases

## Support

For questions or issues with the multi-tenant architecture, please refer to:
- This documentation
- Code comments in `lib/tenant-db.ts`
- Example API routes in `app/api/*/route.new.ts`
