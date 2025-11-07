import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, TokenPayload, verifyRefreshToken, generateAccessToken, generateRefreshToken } from './auth';
import { getCachedUser } from './cache';
import { connectToDatabase } from './mongoose';
import User from '@/models/User';

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
 * Middleware that attempts refresh-token flow if access token is missing/expired.
 * It reads refresh token from either:
 * - Header: x-refresh-token (preferred for SPA using localStorage)
 * - Cookie: refreshToken (fallback)
 * If refresh succeeds, it sets x-new-access-token and x-new-refresh-token headers on the response.
 */
export async function requireAuthWithRefresh(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  // First try normal access token path
  const user = await getAuthenticatedUser(request);
  if (user) {
    return handler(request, user);
  }

  // Try refresh flow
  try {
    const headers = request.headers;
    const headerRefresh = headers.get('x-refresh-token');
    const cookieRefresh = request.cookies.get('refreshToken')?.value;
    const refreshToken = headerRefresh || cookieRefresh;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify refresh token and user validity
    const payload = verifyRefreshToken(refreshToken);

    await connectToDatabase();
    const mainUser = await User.findById(payload.userId).select('+refreshToken');
    if (!mainUser || mainUser.refreshToken !== refreshToken) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }
    if (!mainUser.isActive) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 });
    }

    // Mint new tokens
    const newPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: mainUser._id.toString(),
      email: mainUser.email,
      organizationId: mainUser.organizationId,
      role: mainUser.role,
    };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // Persist new refresh token
    mainUser.refreshToken = newRefreshToken;
    await mainUser.save();

    // Proceed to handler using refreshed identity
    const response = await handler(request, { ...newPayload } as TokenPayload);

    // Attach new tokens to response headers so client can update storage
    response.headers.set('x-new-access-token', newAccessToken);
    response.headers.set('x-new-refresh-token', newRefreshToken);

    // Also set cookies if the app prefers cookie storage (non-HttpOnly here; adjust if needed)
    // NOTE: Keeping header approach as primary to work with existing localStorage setup

    return response;
  } catch (e) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
}

/**
 * Middleware to require org_admin role
 */
export async function requireOrgAdmin(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireAuthWithRefresh(request, async (req, user) => {
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Organization Admin access required' },
        { status: 403 }
      );
    }
    return handler(req, user);
  });
}

/**
 * Middleware to require admin role (org_admin or admin)
 */
export async function requireAdmin(
  request: NextRequest,
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  return requireAuth(request, async (req, user) => {
    if (user.role !== 'org_admin' && user.role !== 'admin') {
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
    const allowedRoles = ['org_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(user.role)) {
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
