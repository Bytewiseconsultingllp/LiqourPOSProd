import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, TokenPayload } from './auth';
import { getCachedUser } from './cache';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

/**
 * Middleware to protect routes - requires authentication
 */
export async function requireAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check cache for user data
  const cachedUser = getCachedUser(user.userId);
  if (cachedUser && !cachedUser.isActive) {
    return NextResponse.json(
      { error: 'User account is inactive' },
      { status: 403 }
    );
  }

  return handler(request, user);
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireAuth(request, async (req, user) => {
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    return handler(req, user);
  });
}

/**
 * Middleware to require admin or manager role
 */
export async function requireAdminOrManager(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireAuth(request, async (req, user) => {
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Admin or manager access required' },
        { status: 403 }
      );
    }
    return handler(req, user);
  });
}

/**
 * Extract organization ID from authenticated user
 */
export function getOrganizationId(user: TokenPayload): string {
  return user.organizationId;
}
