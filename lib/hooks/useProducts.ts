import { useState, useEffect, useCallback } from 'react';
import { ProductDetails } from '@/types/product';
import { fetchProducts, fetchActiveProducts } from '@/lib/services/product-service';

interface UseProductsOptions {
  category?: string;
  search?: string;
  isActive?: boolean;
  autoFetch?: boolean; // Auto-fetch on mount
}

interface UseProductsReturn {
  products: ProductDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage products
 * 
 * @example
 * ```tsx
 * const { products, loading, error, refetch } = useProducts({ isActive: true });
 * ```
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { category, search, isActive, autoFetch = true } = options;
  
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchProducts({ category, search, isActive });
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      console.error('Error in useProducts:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search, isActive]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    products,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook to fetch only active products
 */
export function useActiveProducts() {
  return useProducts({ isActive: true });
}
