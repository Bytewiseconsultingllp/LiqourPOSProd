import { ProductDetails } from '@/types/product';

/**
 * Product Service
 * Reusable service for fetching product data from the API
 */

interface FetchProductsOptions {
  category?: string;
  search?: string;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Fetch all products with optional filters
 */
export async function fetchProducts(
  options: FetchProductsOptions = {}
): Promise<ProductDetails[]> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (options.category && options.category !== 'all') {
      params.append('category', options.category);
    }
    if (options.search) {
      params.append('search', options.search);
    }

    const url = `/api/products${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Disable caching for fresh data
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch products');
    }

    const result: ApiResponse<ProductDetails[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch products');
    }

    // Filter by isActive if specified
    let products = result.data;
    if (options.isActive !== undefined) {
      products = products.filter(p => p.isActive === options.isActive);
    }

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(productId: string): Promise<ProductDetails> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/products/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch product');
    }

    const result: ApiResponse<ProductDetails> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch product');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<ProductDetails[]> {
  return fetchProducts({ category });
}

/**
 * Search products by name, SKU, or description
 */
export async function searchProducts(searchTerm: string): Promise<ProductDetails[]> {
  return fetchProducts({ search: searchTerm });
}

/**
 * Fetch only active products
 */
export async function fetchActiveProducts(): Promise<ProductDetails[]> {
  return fetchProducts({ isActive: true });
}

/**
 * Create a new product
 */
export async function createProduct(productData: Partial<ProductDetails>): Promise<ProductDetails> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create product');
    }

    const result: ApiResponse<ProductDetails> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create product');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  productData: Partial<ProductDetails>
): Promise<ProductDetails> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update product');
    }

    const result: ApiResponse<ProductDetails> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update product');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete product');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete product');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
