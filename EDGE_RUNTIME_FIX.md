# Edge Runtime Build Fix

## Problem
Build was failing with error:
```
Dynamic Code Evaluation (e.g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime

Import trace for requested module:
  ./node_modules\mongoose\dist\browser.umd.js
  ./lib\model-registry.ts
  ./middleware.ts
```

## Root Cause
Next.js middleware runs in **Edge Runtime**, which is a lightweight JavaScript runtime that doesn't support:
- Node.js APIs
- Dynamic code evaluation
- Native modules like Mongoose

We were trying to import and use Mongoose in `middleware.ts` by calling `registerAllModels()`, which caused the build to fail.

## Solution
Removed Mongoose imports from middleware. Models are now registered automatically when API routes import them.

### Changes Made

**File: `middleware.ts`**
```typescript
// ❌ BEFORE - Caused build failure
import { registerAllModels } from './lib/model-registry';
registerAllModels();

// ✅ AFTER - Fixed
// Note: Cannot register models here because middleware runs in Edge Runtime
// Models are registered automatically when model-registry.ts is imported in API routes
```

## How Model Registration Works Now

### 1. Auto-Registration in model-registry.ts
```typescript
// At the end of lib/model-registry.ts
registerAllModels(); // Auto-called when module is imported
```

### 2. API Routes Import Models
```typescript
// In any API route
import { getTenantModel } from '@/lib/tenant-db';
// This imports model-registry.ts, which auto-registers models
```

### 3. Registration Flow
```
1. First API request comes in
   ↓
2. API route imports getTenantModel
   ↓
3. getTenantModel imports model-registry
   ↓
4. model-registry auto-calls registerAllModels()
   ↓
5. Models registered once (singleton pattern)
   ↓
6. All subsequent requests use registered models
```

## Why This Works

### Edge Runtime vs Node.js Runtime

**Middleware (Edge Runtime):**
- Runs on edge servers
- Lightweight, fast
- No Node.js APIs
- No Mongoose
- Only handles request routing/headers

**API Routes (Node.js Runtime):**
- Runs on Node.js servers
- Full Node.js APIs available
- Can use Mongoose
- Handles database operations

### Singleton Pattern
The `modelsRegistered` flag ensures models are only registered once:
```typescript
let modelsRegistered = false;

export function registerAllModels() {
  if (modelsRegistered) {
    return; // Skip if already registered
  }
  
  // Register all models...
  modelsRegistered = true;
}
```

## Build Process

### Before Fix:
```
npm run build
  ↓
Middleware tries to import Mongoose
  ↓
Edge Runtime error: Dynamic code evaluation not allowed
  ↓
❌ Build fails
```

### After Fix:
```
npm run build
  ↓
Middleware only imports tenant-context (no Mongoose)
  ↓
Models registered when API routes load
  ↓
✅ Build succeeds
```

## Testing

### 1. Build Test
```bash
npm run build
```
Should complete successfully without Edge Runtime errors.

### 2. Runtime Test
```bash
npm run dev
# or
npm start
```

1. Make any API request (e.g., login, get products)
2. Check console for: `✅ All model schemas registered`
3. Verify models work correctly

### 3. Production Test
```bash
npm run build
npm start
```
All API routes should work normally.

## What Middleware Does Now

Middleware only handles:
1. ✅ Tenant ID extraction from headers
2. ✅ Tenant ID validation
3. ✅ Setting tenant ID in request/response headers
4. ✅ Request routing

Middleware does NOT:
- ❌ Import Mongoose
- ❌ Register models
- ❌ Connect to database
- ❌ Query database

## Best Practices

### ✅ DO in Middleware:
- Extract headers
- Validate tenant IDs
- Set response headers
- Route requests
- Use lightweight utilities

### ❌ DON'T in Middleware:
- Import Mongoose
- Connect to database
- Use Node.js APIs
- Use native modules
- Perform heavy computations

## Related Files

- `middleware.ts` - Tenant routing (Edge Runtime)
- `lib/model-registry.ts` - Model registration (Node.js Runtime)
- `lib/tenant-db.ts` - Database connections (Node.js Runtime)
- All API routes - Use models (Node.js Runtime)

## Summary

**Problem:** Mongoose in Edge Runtime middleware
**Solution:** Remove Mongoose from middleware, use auto-registration in API routes
**Result:** ✅ Build succeeds, models work correctly

The application now follows Next.js best practices:
- Middleware is lightweight and Edge-compatible
- Database operations stay in API routes
- Models register automatically on first use
- Singleton pattern prevents duplicate registration

✅ **Build fixed and ready for production!**
