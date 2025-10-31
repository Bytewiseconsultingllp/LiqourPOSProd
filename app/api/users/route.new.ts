import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenantContext, getModel, requireAdminOrManager } from '@/lib/tenant-middleware';
import { hashPassword } from '@/lib/auth';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'staff']),
});

/**
 * GET /api/users - List all users for the tenant
 */
export const GET = withTenantContext(async (request, context) => {
  try {
    // Only admin and manager can view users
    requireAdminOrManager(context);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const User = getModel(context, 'User');

    // Build query
    const query: any = { organizationId: context.organizationId };
    
    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const users = await User.find(query)
      .select('-password -refreshToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    
    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/users - Create a new user
 */
export const POST = withTenantContext(async (request, context) => {
  try {
    // Only admin and manager can create users
    requireAdminOrManager(context);

    const body = await request.json();

    // Validate input
    const validation = userSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const User = getModel(context, 'User');

    // Check if email already exists
    const existingUser = await User.findOne({
      email: validation.data.email.toLowerCase(),
      organizationId: context.organizationId,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validation.data.password);

    // Create user
    const user = await User.create({
      name: validation.data.name,
      email: validation.data.email.toLowerCase(),
      password: hashedPassword,
      role: validation.data.role,
      organizationId: context.organizationId,
      isActive: true,
    });

    // Return user without sensitive data
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: userData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});
