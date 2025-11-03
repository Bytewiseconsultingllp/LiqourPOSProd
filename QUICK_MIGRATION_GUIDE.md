# Quick Migration Guide - Enable Automatic Token Refresh

## ✅ What's Already Done

I've successfully migrated the **most critical pages** to use automatic token refresh:

### ✅ Migrated Pages (Token Refresh Active)
1. **Purchases Page** - `/app/dashboard/purchases/page.tsx`
2. **Sales Page** - `/app/dashboard/sales/page.tsx`  
3. **Products Management** - `/app/dashboard/management/products/page.tsx`
4. **Vendors Management** - `/app/dashboard/management/vendors/page.tsx`
5. **Volume Report** - `/app/dashboard/reports/VolumeWiseReport.tsx`

### ✅ What This Means
- Users can now work continuously in these pages without being logged out
- When access token expires (15 min), it automatically refreshes
- No interruption to user workflow
- Sessions last up to 7 days (refresh token expiry)

## 🎯 How It Works

### Before (Manual Token Management)
```typescript
const token = localStorage.getItem('accessToken');
const response = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': orgId,
  },
});

if (response.status === 401) {
  // User gets kicked out!
  router.push('/login');
}
```

### After (Automatic Token Refresh)
```typescript
import { apiFetch } from '@/lib/api-client';

const response = await apiFetch('/api/products');
// That's it! Token refresh happens automatically
// Headers are added automatically
// 401 errors trigger refresh automatically
```

## 📋 To Migrate Remaining Pages

For each file that makes API calls:

### Step 1: Add Import
```typescript
import { apiFetch } from '@/lib/api-client';
```

### Step 2: Replace fetch calls
```typescript
// FIND THIS:
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': orgId,
    'Content-Type': 'application/json',
  },
  method: 'POST',
  body: JSON.stringify(data),
});

// REPLACE WITH:
const response = await apiFetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### Step 3: Remove Manual 401 Handling
```typescript
// DELETE THIS:
if (response.status === 401) {
  toast.error('Session expired');
  router.push('/login');
  return;
}
```

### Step 4: Remove Token Extraction (Optional Cleanup)
```typescript
// CAN DELETE THESE (no longer needed):
const token = localStorage.getItem('accessToken');
const orgId = localStorage.getItem('organization')
  ? JSON.parse(localStorage.getItem('organization')!).id
  : 'default';
```

## 🔧 Remaining Files to Migrate

### High Priority (User-Facing)
- [ ] `app/dashboard/management/customers/page.tsx`
- [ ] `app/dashboard/users/page.tsx`
- [ ] `app/dashboard/vendors/page.tsx`

### Reports (Medium Priority)
- [ ] `app/dashboard/reports/VendorWiseReport.tsx`
- [ ] `app/dashboard/reports/SalesSummaryReport.tsx`
- [ ] `app/dashboard/reports/PurchaseSummaryReport.tsx`
- [ ] `app/dashboard/reports/ProductWiseReport.tsx`
- [ ] `app/dashboard/reports/CategoryWiseReport.tsx`
- [ ] `app/dashboard/reports/BrandWiseReport.tsx`

### Other Components
- [ ] `app/dashboard/ledger/PaymentHistoryDialog.tsx`
- [ ] `app/dashboard/sales/PromotionsDisplay.tsx`

## ✨ Benefits You'll See

1. **No More Unexpected Logouts** - Users stay logged in during active use
2. **Better UX** - Seamless experience, no interruptions
3. **Cleaner Code** - Less boilerplate, easier to maintain
4. **Centralized Auth** - All token logic in one place
5. **Automatic Retry** - Failed requests due to expired tokens retry automatically

## 🧪 Testing

1. Login to the app
2. Wait 15+ minutes (or change JWT_EXPIRES_IN to 1m for testing)
3. Try to create a product/purchase/sale
4. **Expected**: Request succeeds automatically (you'll see `/api/auth/refresh` in Network tab)
5. **Old behavior**: Would have been kicked to login

## 📚 Technical Details

- **Access Token**: Expires in 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Refresh Token**: Expires in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Refresh Endpoint**: `/api/auth/refresh`
- **Storage**: Both tokens in localStorage
- **Auto-Redirect**: If refresh fails, redirects to `/login`

## 🚀 Next Steps

1. **Test the migrated pages** - Verify token refresh works
2. **Migrate remaining pages** - Follow the pattern above
3. **Optional**: Adjust token expiry times in `.env`
4. **Optional**: Move to HttpOnly cookies for better security (future enhancement)

---

**Need Help?** Check `lib/API_CLIENT_USAGE.md` for detailed examples.
