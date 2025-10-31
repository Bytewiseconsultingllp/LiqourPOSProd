import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTenantId, isValidTenantId, getDefaultTenantId } from './lib/tenant-context';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes that don't need tenant context
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Extract tenant ID from request
  const hostname = request.headers.get('host') || '';
  const tenantId = extractTenantId(request.headers, hostname);

  // For development, use default tenant if none specified
  const finalTenantId = tenantId || getDefaultTenantId();

  // Validate tenant ID
  if (!isValidTenantId(finalTenantId)) {
    return NextResponse.json(
      { error: 'Invalid tenant identifier' },
      { status: 400 }
    );
  }

  // Clone the request headers and add tenant ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', finalTenantId);

  // Return response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set tenant ID in response headers for debugging
  response.headers.set('x-tenant-id', finalTenantId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
