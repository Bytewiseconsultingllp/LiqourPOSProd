# Schema Registration Fix

## Problem
Users were experiencing "Unable to register schema" errors when navigating between pages. This happened because:

1. Multiple API routes were calling `registerAllModels()` on every request
2. Mongoose schemas were being registered multiple times
3. This caused conflicts and errors when switching pages

## Root Cause
```typescript
// ❌ OLD APPROACH - Called on every API request
export async function GET(request: NextRequest) {
  registerAllModels(); // This runs on EVERY request!
  const connection = await getTenantConnection(orgId);
  // ...
}
```

When navigating from one page to another:
- Page 1 loads → API call → `registerAllModels()` called
- Page 2 loads → API call → `registerAllModels()` called again
- Result: "Schema already registered" errors

## Solution

### 1. Added Registration Guard
```typescript
// lib/model-registry.ts
let modelsRegistered = false;

export function registerAllModels() {
  if (modelsRegistered) {
    return; // Skip if already registered
  }
  
  // Register all schemas...
  modelsRegistered = true;
}
```

### 2. Auto-Registration on Module Import
```typescript
// lib/model-registry.ts (at the end)
registerAllModels(); // Auto-register when module is imported
```

### 3. Early Registration in Middleware
```typescript
// middleware.ts
import { registerAllModels } from './lib/model-registry';

// Register once when middleware loads (at app startup)
registerAllModels();

export function middleware(request: NextRequest) {
  // ...
}
```

## How It Works Now

### Application Startup Flow:
```
1. Next.js starts
   ↓
2. middleware.ts loads
   ↓
3. registerAllModels() called ONCE
   ↓
4. All schemas registered in memory
   ↓
5. Application ready to handle requests
```

### Request Flow:
```
User navigates to Page 1
   ↓
API request made
   ↓
registerAllModels() called (but skipped - already registered)
   ↓
getTenantConnection() uses pre-registered schemas
   ↓
Models created for tenant
   ↓
Response sent

User navigates to Page 2
   ↓
API request made
   ↓
registerAllModels() called (but skipped - already registered)
   ↓
Same pre-registered schemas used
   ↓
No conflicts!
```

## Key Changes

### `lib/model-registry.ts`
- ✅ Added `modelsRegistered` flag
- ✅ Guard prevents multiple registrations
- ✅ Auto-registers on module import
- ✅ Safe to call multiple times

### `middleware.ts`
- ✅ Imports and calls `registerAllModels()` at startup
- ✅ Ensures schemas are ready before any API requests

### API Routes (No Changes Needed)
- ✅ Can still call `registerAllModels()` (now a no-op after first call)
- ✅ Backward compatible
- ✅ No breaking changes

## Benefits

1. **No More Errors:** Schema registration happens once, no conflicts
2. **Better Performance:** No repeated registration overhead
3. **Cleaner Code:** Registration logic centralized
4. **Backward Compatible:** Existing code still works
5. **Predictable:** Always registered before first request

## Testing

### Before Fix:
```
✅ Load Page 1 → Works
❌ Navigate to Page 2 → Error: "Unable to register schema"
❌ Navigate back to Page 1 → Error continues
🔄 Need to refresh browser to fix
```

### After Fix:
```
✅ Load Page 1 → Works
✅ Navigate to Page 2 → Works
✅ Navigate to Page 3 → Works
✅ Navigate back and forth → Always works
✅ No browser refresh needed
```

## Verification Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Check console for registration message:**
   ```
   ✅ All model schemas registered
   ```
   Should appear ONCE at startup.

3. **Navigate between pages:**
   - Products page
   - Sales page
   - Customers page
   - Vendors page
   - Users page

4. **Verify no errors:**
   - No "Unable to register schema" errors
   - No "Schema already exists" warnings
   - Smooth navigation between all pages

## Technical Details

### Schema Registration Flow:
```typescript
// 1. Schemas defined in model-registry.ts
const ProductDetailsSchema = new Schema({ ... });
const UserSchema = new Schema({ ... });

// 2. Registered with tenant-db system
registerModelSchema('Product', ProductDetailsSchema);
registerModelSchema('User', UserSchema);

// 3. Available for all tenant connections
const Product = getTenantModel(connection, 'Product');
```

### Tenant Connection Flow:
```typescript
// 1. Get or create tenant connection
const connection = await getTenantConnection(orgId);

// 2. Models automatically registered for this connection
// (uses pre-registered schemas from step 2 above)

// 3. Use models
const Product = getTenantModel(connection, 'Product');
const products = await Product.find({ ... });
```

## Important Notes

1. **Registration is Global:** Schemas are registered once for the entire application
2. **Per-Tenant Models:** Each tenant gets its own model instances using the same schemas
3. **Thread-Safe:** The guard ensures safe concurrent access
4. **Memory Efficient:** Schemas stored once, reused for all tenants

## Troubleshooting

### If you still see errors:

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check console for multiple registration messages:**
   - Should see "✅ All model schemas registered" only ONCE
   - If you see it multiple times, the guard isn't working

3. **Verify middleware is loading:**
   - Check that `middleware.ts` is in the root directory
   - Ensure it's not being skipped by Next.js config

4. **Check for circular imports:**
   - Ensure no circular dependencies in model files
   - Use `import type` for type-only imports

## Related Files

- `lib/model-registry.ts` - Schema registration logic
- `lib/tenant-db.ts` - Tenant connection management
- `middleware.ts` - Application-level middleware
- `models/Product.ts` - Product schema definition
- All API routes in `app/api/*` - Use registered schemas

## Summary

The fix ensures schemas are registered exactly once at application startup, preventing conflicts when navigating between pages. The solution is:
- ✅ Simple
- ✅ Robust
- ✅ Backward compatible
- ✅ Performance-friendly
- ✅ Easy to maintain
