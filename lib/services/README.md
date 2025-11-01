# API Services Documentation

This directory contains reusable service modules for interacting with the backend API.

## Overview

All services follow a consistent pattern:
- Handle authentication automatically via JWT tokens stored in localStorage
- Provide typed responses using TypeScript interfaces
- Include comprehensive error handling
- Support optional query parameters for filtering

## Available Services

### Product Service (`product-service.ts`)

Handles all product-related API operations.

#### Functions

##### `fetchProducts(options?)`
Fetch all products with optional filters.

```typescript
import { fetchProducts } from '@/lib/services/product-service';

// Fetch all products
const products = await fetchProducts();

// Fetch by category
const whiskeys = await fetchProducts({ category: 'Whiskey' });

// Search products
const searchResults = await fetchProducts({ search: 'Jack' });

// Fetch only active products
const activeProducts = await fetchProducts({ isActive: true });
```

**Options:**
- `category?: string` - Filter by product category
- `search?: string` - Search by name, SKU, or description
- `isActive?: boolean` - Filter by active status

##### `fetchProductById(productId)`
Fetch a single product by its ID.

```typescript
const product = await fetchProductById('507f1f77bcf86cd799439011');
```

##### `fetchProductsByCategory(category)`
Convenience method to fetch products by category.

```typescript
const vodkas = await fetchProductsByCategory('Vodka');
```

##### `searchProducts(searchTerm)`
Convenience method to search products.

```typescript
const results = await searchProducts('Johnnie Walker');
```

##### `fetchActiveProducts()`
Convenience method to fetch only active products.

```typescript
const activeProducts = await fetchActiveProducts();
```

##### `createProduct(productData)`
Create a new product.

```typescript
const newProduct = await createProduct({
  name: 'Jack Daniels',
  brand: 'Jack Daniels',
  category: 'Whiskey',
  volumeML: 750,
  pricePerUnit: 2500,
  currentStock: 50,
});
```

##### `updateProduct(productId, productData)`
Update an existing product.

```typescript
const updated = await updateProduct('507f1f77bcf86cd799439011', {
  pricePerUnit: 2600,
  currentStock: 45,
});
```

##### `deleteProduct(productId)`
Delete a product.

```typescript
await deleteProduct('507f1f77bcf86cd799439011');
```

---

### Customer Service (`customer-service.ts`)

Handles all customer-related API operations.

#### Functions

##### `fetchCustomers(options?)`
Fetch all customers with optional filters.

```typescript
import { fetchCustomers } from '@/lib/services/customer-service';

// Fetch all customers
const customers = await fetchCustomers();

// Search customers
const searchResults = await fetchCustomers({ search: 'John' });

// Fetch only active customers
const activeCustomers = await fetchCustomers({ isActive: true });
```

**Options:**
- `search?: string` - Search by name or phone
- `isActive?: boolean` - Filter by active status

##### `fetchCustomerById(customerId)`
Fetch a single customer by ID.

```typescript
const customer = await fetchCustomerById('507f1f77bcf86cd799439011');
```

##### `searchCustomers(searchTerm)`
Convenience method to search customers.

```typescript
const results = await searchCustomers('John Doe');
```

##### `fetchActiveCustomers()`
Convenience method to fetch only active customers.

```typescript
const activeCustomers = await fetchActiveCustomers();
```

##### `createCustomer(customerData)`
Create a new customer.

```typescript
const newCustomer = await createCustomer({
  name: 'John Doe',
  contactInfo: {
    phone: '9876543210',
    email: 'john@example.com',
  },
  creditLimit: 50000,
});
```

##### `updateCustomer(customerId, customerData)`
Update an existing customer.

```typescript
const updated = await updateCustomer('507f1f77bcf86cd799439011', {
  creditLimit: 75000,
});
```

---

## React Hooks

For easier integration in React components, use the custom hooks located in `lib/hooks/`.

### `useProducts` Hook

```typescript
import { useProducts } from '@/lib/hooks/useProducts';

function ProductList() {
  const { products, loading, error, refetch } = useProducts({ isActive: true });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product._id}>{product.name}</div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**Options:**
- `category?: string` - Filter by category
- `search?: string` - Search term
- `isActive?: boolean` - Filter by active status
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

**Returns:**
- `products: ProductDetails[]` - Array of products
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `refetch: () => Promise<void>` - Function to manually refetch data

### `useCustomers` Hook

```typescript
import { useCustomers } from '@/lib/hooks/useCustomers';

function CustomerList() {
  const { customers, loading, error, refetch } = useCustomers({ isActive: true });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {customers.map(customer => (
        <div key={customer._id}>{customer.name}</div>
      ))}
    </div>
  );
}
```

**Options:**
- `search?: string` - Search term
- `isActive?: boolean` - Filter by active status
- `autoFetch?: boolean` - Auto-fetch on mount (default: true)

**Returns:**
- `customers: Customer[]` - Array of customers
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `refetch: () => Promise<void>` - Function to manually refetch data

---

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const products = await fetchProducts();
} catch (error) {
  if (error.message.includes('Unauthorized')) {
    // Redirect to login
  } else {
    // Show error message
    console.error('Failed to fetch products:', error.message);
  }
}
```

Common error scenarios:
- **401 Unauthorized**: Token is missing or invalid - redirect to login
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate resource (e.g., SKU already exists)
- **500 Server Error**: Backend error

---

## Authentication

All API calls require a valid JWT token stored in `localStorage` under the key `'token'`.

The token is automatically included in the `Authorization` header:
```
Authorization: Bearer <token>
```

If no token is found or the token is invalid, services will throw an authentication error.

---

## Best Practices

1. **Use React Hooks in Components**: Prefer `useProducts` and `useCustomers` hooks over direct service calls in React components for automatic state management.

2. **Handle Loading States**: Always show loading indicators when fetching data.

3. **Handle Errors Gracefully**: Display user-friendly error messages and provide retry options.

4. **Refetch When Needed**: Use the `refetch` function after creating, updating, or deleting resources to keep data fresh.

5. **Type Safety**: All services return properly typed data matching the TypeScript interfaces.

---

## Example: Complete Sales Page Integration

```typescript
import { useProducts } from '@/lib/hooks/useProducts';
import { useCustomers } from '@/lib/hooks/useCustomers';

function SalesPage() {
  const { products, loading: productsLoading, error: productsError } = useProducts({ isActive: true });
  const { customers, loading: customersLoading } = useCustomers({ isActive: true });

  if (productsLoading || customersLoading) {
    return <LoadingSpinner />;
  }

  if (productsError) {
    return <ErrorMessage message={productsError} />;
  }

  return (
    <div>
      <CustomerSelector customers={customers} />
      <ProductGrid products={products} />
    </div>
  );
}
```

---

## Future Enhancements

Potential additions to the service layer:
- Caching with React Query or SWR
- Optimistic updates
- Pagination support
- Batch operations
- WebSocket support for real-time updates
