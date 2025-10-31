/**
 * Tenant Context Management
 * This module handles tenant identification and context throughout the application
 */

export interface TenantInfo {
  id: string;
  name: string;
  subdomain?: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
  settings?: Record<string, any>;
}

/**
 * Extract tenant ID from request headers or subdomain
 * Priority: 
 * 1. X-Tenant-ID header (for API calls)
 * 2. Subdomain extraction
 * 3. Default tenant (for development)
 */
export function extractTenantId(
  headers: Headers,
  hostname?: string
): string | null {
  // Check for explicit tenant ID in headers
  const tenantIdHeader = headers.get('x-tenant-id');
  if (tenantIdHeader) {
    return tenantIdHeader;
  }

  // Extract from subdomain
  if (hostname) {
    const subdomain = extractSubdomain(hostname);
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }

  // Return null if no tenant identified
  return null;
}

/**
 * Extract subdomain from hostname
 * Examples:
 * - tenant1.example.com -> tenant1
 * - www.example.com -> www
 * - localhost -> null
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Skip localhost and IP addresses
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');
  
  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return null;
  }

  return parts[0];
}

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId: string): boolean {
  // Tenant ID should be alphanumeric with hyphens/underscores
  return /^[a-z0-9_-]+$/i.test(tenantId);
}

/**
 * Get default tenant ID for development
 */
export function getDefaultTenantId(): string {
  return process.env.DEFAULT_TENANT_ID || 'default';
}
