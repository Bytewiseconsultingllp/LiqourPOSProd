import { Purchase, CreatePurchaseRequest } from '@/types/purchase';

/**
 * Purchase Service
 * Reusable service for managing purchase operations
 */

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  message?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Get organization ID from localStorage
 */
function getOrganizationId(): string {
  if (typeof window === 'undefined') return 'default';
  const org = localStorage.getItem('organization');
  return org ? JSON.parse(org).id : 'default';
}

/**
 * Fetch all purchases with optional filters
 */
export async function fetchPurchases(filters?: {
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
}): Promise<Purchase[]> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.vendorId) params.append('vendorId', filters.vendorId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);

    const url = `/api/purchases${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': getOrganizationId(),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch purchases');
    }

    const result: ApiResponse<Purchase[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch purchases');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
}

/**
 * Create a new purchase
 */
export async function createPurchase(purchaseData: CreatePurchaseRequest): Promise<Purchase> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': getOrganizationId(),
      },
      body: JSON.stringify(purchaseData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create purchase');
    }

    const result: ApiResponse<Purchase> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create purchase');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
}

/**
 * Fetch a single purchase by ID
 */
export async function fetchPurchaseById(purchaseId: string): Promise<Purchase> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }

    const response = await fetch(`/api/purchases/${purchaseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': getOrganizationId(),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      }
      if (response.status === 404) {
        throw new Error('Purchase not found');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch purchase');
    }

    const result: ApiResponse<Purchase> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch purchase');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching purchase:', error);
    throw error;
  }
}
