# Purchases API Fix

## Issue
```
Error creating purchase: MissingSchemaError: Schema hasn't been registered for model "Product".
Use mongoose.model(name, schema)
```

**Root Cause:** Models were not being registered before accessing them, and Product model was being accessed incorrectly.

## Problem Analysis

### Console Output
```
📋 Registering 0 models for tenant connection...
📋 Total models in connection: 0
```

This showed that `registerAllModels()` was never called in the purchases route.

### Code Issue
```typescript
// ❌ WRONG - Models not registered
const connection = await getTenantConnection(user.organizationId);
const Product = connection.models.Product || connection.model('Product');
// Error: Schema hasn't been registered
```

## Solution

### 1. Added Missing Imports
```typescript
import { getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';
```

### 2. Register Models Before Use
```typescript
// ✅ CORRECT - Register models first
registerAllModels();

const connection = await getTenantConnection(user.organizationId);
```

### 3. Use getTenantModel for Product
```typescript
// ✅ CORRECT - Use getTenantModel
const Product = getTenantModel(connection, 'Product');
```

## Changes Made

**File:** `app/api/purchases/route.ts`

### Before:
```typescript
import { getTenantConnection } from '@/lib/tenant-db';
// Missing: registerAllModels import

export async function POST(request: NextRequest) {
  // ...
  const connection = await getTenantConnection(user.organizationId);
  
  // ❌ No registerAllModels() call
  
  const Product = connection.models.Product || connection.model('Product');
  // ❌ Incorrect way to get model
}
```

### After:
```typescript
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

export async function POST(request: NextRequest) {
  // ...
  
  // ✅ Register models first
  registerAllModels();
  
  const connection = await getTenantConnection(user.organizationId);
  
  // ✅ Use getTenantModel
  const Product = getTenantModel(connection, 'Product');
}
```

## Why This Works

### Model Registration Flow
```
1. registerAllModels() called
   ↓
2. Registers all schemas (User, Product, Sale, etc.)
   ↓
3. getTenantConnection() returns connection
   ↓
4. getTenantModel(connection, 'Product') returns registered model
   ↓
5. Model ready to use ✅
```

### Without Registration
```
1. getTenantConnection() returns connection
   ↓
2. Try to get Product model
   ↓
3. Schema not registered
   ↓
4. MissingSchemaError ❌
```

## Testing

### Before Fix:
```
POST /api/purchases
❌ Error: MissingSchemaError: Schema hasn't been registered for model "Product"
```

### After Fix:
```
POST /api/purchases
✅ 200 OK
✅ Purchase created successfully
✅ Product stock updated
✅ Vendor stock updated
```

## Related Files

This same pattern should be used in ALL API routes:

```typescript
// Standard pattern for all API routes
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

export async function POST(request: NextRequest) {
  // 1. Register models FIRST
  registerAllModels();
  
  // 2. Get connection
  const connection = await getTenantConnection(tenantId);
  
  // 3. Get models using getTenantModel
  const Product = getTenantModel(connection, 'Product');
  const Sale = getTenantModel(connection, 'Sale');
  
  // 4. Use models
  await Product.find({...});
}
```

## Summary

**Issue:** Schema not registered for Product model
**Cause:** Missing `registerAllModels()` call
**Fix:** 
1. ✅ Import `registerAllModels` and `getTenantModel`
2. ✅ Call `registerAllModels()` before getting connection
3. ✅ Use `getTenantModel()` to get Product model

The purchases API now works correctly! 🎉
