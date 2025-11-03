# API Client Usage Guide

## Overview
The `api-client.ts` provides automatic token refresh functionality. When an API call returns 401 (Unauthorized), it automatically:
1. Calls `/api/auth/refresh` with the stored refresh token
2. Updates the access and refresh tokens in localStorage
3. Retries the original request with the new token
4. Redirects to login if refresh fails

## Migration Guide

### Before (manual fetch):
```typescript
const token = localStorage.getItem('accessToken');
const orgId = localStorage.getItem('organization')
  ? JSON.parse(localStorage.getItem('organization')!).id
  : 'default';

const response = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': orgId,
  },
});

if (response.status === 401) {
  // Manual redirect to login
  router.push('/login');
  return;
}

const data = await response.json();
```

### After (using apiFetch):
```typescript
import { apiFetch, apiRequest } from '@/lib/api-client';

// Option 1: Using apiFetch (returns Response)
const response = await apiFetch('/api/products');
const data = await response.json();

// Option 2: Using apiRequest (returns parsed JSON, throws on error)
try {
  const data = await apiRequest('/api/products');
  console.log(data);
} catch (error) {
  console.error('Request failed:', error);
}
```

## Examples

### GET Request
```typescript
import { apiRequest } from '@/lib/api-client';

const products = await apiRequest<ProductDetails[]>('/api/products');
```

### POST Request
```typescript
import { apiRequest } from '@/lib/api-client';

const newProduct = await apiRequest('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Product Name',
    price: 100,
  }),
});
```

### With Custom Headers
```typescript
import { apiFetch } from '@/lib/api-client';

const response = await apiFetch('/api/custom', {
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Features

- **Automatic Token Refresh**: Handles 401 errors transparently
- **Request Queuing**: Multiple simultaneous requests wait for a single refresh
- **Auto Logout**: Redirects to login if refresh fails
- **Tenant ID Injection**: Automatically adds x-tenant-id header from localStorage
- **TypeScript Support**: Full type safety with generics

## Notes

- The Authorization header and x-tenant-id are added automatically
- You don't need to handle 401 errors manually anymore
- Refresh tokens are rotated on each refresh for security
- All tokens are stored in localStorage
