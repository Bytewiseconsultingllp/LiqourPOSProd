import { NextRequest } from 'next/server';
import { Connection } from 'mongoose';
import { getTenantConnection, getTenantModel } from './tenant-db';
import { verifyAccessToken } from './auth';

export interface TenantContext {
  organizationId: string;
  connection: Connection;
  userId?: string;
  userRole?: string;
}

/**
 * Get tenant context from request
 * Extracts organization ID from JWT token and establishes database connection
 */
export async function getTenantContext(request: NextRequest): Promise<TenantContext> {
  // Get authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  
  // Verify token and extract payload
  const payload = verifyAccessToken(token);
  if (!payload || !payload.organizationId) {
    throw new Error('Invalid token or missing organization ID');
  }

  // Get or create tenant connection
  const connection = await getTenantConnection(payload.organizationId);

  return {
    organizationId: payload.organizationId,
    connection,
    userId: payload.userId,
    userRole: payload.role,
  };
}

/**
 * Helper to get a model from tenant context
 */
export function getModel<T = any>(context: TenantContext, modelName: string) {
  return getTenantModel<T>(context.connection, modelName);
}

/**
 * Wrapper for API routes with automatic tenant context
 */
export function withTenantContext<T = any>(
  handler: (request: NextRequest, context: TenantContext) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const context = await getTenantContext(request);
      return await handler(request, context);
    } catch (error: any) {
      console.error('Tenant context error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Check if user has required role
 */
export function requireRole(context: TenantContext, allowedRoles: string[]): boolean {
  if (!context.userRole) {
    return false;
  }
  return allowedRoles.includes(context.userRole);
}

/**
 * Middleware to ensure user has admin or manager role
 */
export function requireAdminOrManager(context: TenantContext): void {
  if (!requireRole(context, ['admin', 'manager'])) {
    throw new Error('Insufficient permissions. Admin or Manager role required.');
  }
}

/**
 * Middleware to ensure user has admin role
 */
export function requireAdmin(context: TenantContext): void {
  if (!requireRole(context, ['admin'])) {
    throw new Error('Insufficient permissions. Admin role required.');
  }
}
