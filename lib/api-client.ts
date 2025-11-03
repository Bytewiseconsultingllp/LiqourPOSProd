/**
 * API Client with automatic token refresh
 * Wraps fetch to handle 401 errors and refresh tokens automatically
 */

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    if (data.success && data.accessToken && data.refreshToken) {
      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Enhanced fetch that automatically refreshes tokens on 401
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');
  
  // Add authorization header if token exists
  const headers = new Headers(options.headers);
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Add tenant ID if available
  const organization = localStorage.getItem('organization');
  if (organization && !headers.has('x-tenant-id')) {
    try {
      const orgData = JSON.parse(organization);
      if (orgData.id) {
        headers.set('x-tenant-id', orgData.id);
      }
    } catch (e) {
      console.warn('Failed to parse organization data');
    }
  }

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  // Make the initial request
  let response = await fetch(url, requestOptions);

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && localStorage.getItem('refreshToken')) {
    if (!isRefreshing) {
      isRefreshing = true;
      
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        // Notify all waiting requests
        onTokenRefreshed(newToken);
        
        // Retry the original request with new token
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...requestOptions, headers });
      } else {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('organization');
        window.location.href = '/login';
      }
    } else {
      // Wait for the ongoing refresh to complete
      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh((token) => {
          resolve(token);
        });
      });

      // Retry with new token
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...requestOptions, headers });
    }
  }

  return response;
}

/**
 * Convenience wrapper for JSON responses
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
