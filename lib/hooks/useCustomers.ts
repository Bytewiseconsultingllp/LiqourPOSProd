import { useState, useEffect, useCallback } from 'react';
import { Customer } from '@/types/customer';
import { fetchCustomers, fetchActiveCustomers } from '@/lib/services/customer-service';

interface UseCustomersOptions {
  search?: string;
  isActive?: boolean;
  autoFetch?: boolean; // Auto-fetch on mount
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage customers
 * 
 * @example
 * ```tsx
 * const { customers, loading, error, refetch } = useCustomers({ isActive: true });
 * ```
 */
export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { search, isActive, autoFetch = true } = options;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchCustomers({ search, isActive });
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
      console.error('Error in useCustomers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, isActive]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    customers,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook to fetch only active customers
 */
export function useActiveCustomers() {
  return useCustomers({ isActive: true });
}
