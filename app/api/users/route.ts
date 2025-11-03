import { hashPassword, normalizeEmail } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongoose';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
    
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']).optional(),
});

/**
 * Extract user info from JWT token
 */
function getUserFromToken(request: NextRequest): any {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token');
  }

  const token = authHeader.substring(7);
  const { verifyAccessToken } = require('@/lib/auth');
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    throw new Error('Invalid token');
  }

  return payload;
}

/**
 * GET /api/users - List all users in the organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    // Only org_admin can view users
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only Organization Admins can view users' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Get users from main database
    const users = await User.find({
      organizationId: user.organizationId,
    }).select('-password -refreshToken -passwordResetToken').sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user in BOTH main and tenant databases
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    
    // Only org_admin can create users
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only Organization Admins can create users' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.data;

    // Prevent creating another org_admin
    if (role === 'org_admin') {
      return NextResponse.json(
        { error: 'Cannot create another Organization Admin' },
        { status: 403 }
      );
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    // Hash password
    const hashedPassword = await hashPassword(password);
    // Create user in TENANT database FIRST
    const tenantConnection = await getTenantConnection(user.organizationId);
    const TenantUser = getTenantModel(tenantConnection, 'User');

    // Check if user already exists in tenant database
    const existingTenantUser = await TenantUser.findOne({ 
      email: normalizedEmail,
      organizationId: user.organizationId 
    });
    
    if (existingTenantUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const newUserTenant = await TenantUser.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      organizationId: user.organizationId,
      isActive: true,
    });

    console.log(`✅ User created in tenant database: ${newUserTenant.email}`);

    // Create user in MAIN database
    const { connectToDatabase: connectMain } = require('@/lib/mongoose');
    const UserMain = require('@/models/User').default;
    
    await connectMain();
    
    const newUserMain = await UserMain.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      organizationId: user.organizationId,
      isActive: true,
    });

    console.log(`✅ User created in main database: ${newUserMain.email}`);

    // Return user without sensitive data
    const userResponse = {
      _id: newUserTenant._id,
      name: newUserTenant.name,
      email: newUserTenant.email,
      role: newUserTenant.role,
      organizationId: newUserTenant.organizationId,
      isActive: newUserTenant.isActive,
      createdAt: newUserTenant.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: userResponse,
        message: 'User created successfully in both databases',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
