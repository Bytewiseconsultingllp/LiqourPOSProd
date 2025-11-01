import { Customer } from '@/types/customer';

/**
 * Customer Service
 * Reusable service for fetching customer data from the API
 */

interface FetchCustomersOptions {
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
 * Fetch all customers with optional filters
 */
export async function fetchCustomers(
  options: FetchCustomersOptions = {}
): Promise<Customer[]> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (options.search) {
      params.append('search', options.search);
    }

    const url = `/api/customers${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
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
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch customers');
    }

    const result: ApiResponse<Customer[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch customers');
    }

    // Filter by isActive if specified
    let customers = result.data;
    if (options.isActive !== undefined) {
      customers = customers.filter(c => c.isActive === options.isActive);
    }

    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
}

/**
 * Fetch a single customer by ID
 */
export async function fetchCustomerById(customerId: string): Promise<Customer> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/customers/${customerId}`, {
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
        throw new Error('Customer not found');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch customer');
    }

    const result: ApiResponse<Customer> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch customer');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
}

/**
 * Search customers by name or phone
 */
export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  return fetchCustomers({ search: searchTerm });
}

/**
 * Fetch only active customers
 */
export async function fetchActiveCustomers(): Promise<Customer[]> {
  return fetchCustomers({ isActive: true });
}

/**
 * Create a new customer
 */
export async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create customer');
    }

    const result: ApiResponse<Customer> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create customer');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  customerId: string,
  customerData: Partial<Customer>
): Promise<Customer> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update customer');
    }

    const result: ApiResponse<Customer> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update customer');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}
