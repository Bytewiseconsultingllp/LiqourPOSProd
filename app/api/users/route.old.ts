import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAdminOrManager, getOrganizationId } from '@/lib/auth-middleware';
import { hashPassword, normalizeEmail, validatePassword } from '@/lib/auth';
import { invalidateUserCache } from '@/lib/cache';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'staff']),
});

/**
 * GET /api/users - List all users in the organization
 */
export async function GET(request: NextRequest) {
  return requireAdminOrManager(request, async (req, user) => {
    try {
      const organizationId = getOrganizationId(user);
      
      await connectToDatabase();

      const users = await User.find({
        organizationId,
        isActive: true,
      }).select('-password -refreshToken -passwordResetToken');

      return NextResponse.json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/users - Create a new user in the organization
 */
export async function POST(request: NextRequest) {
  return requireAdminOrManager(request, async (req, user) => {
    try {
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

      // Only admins can create other admins
      if (role === 'admin' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can create admin users' },
          { status: 403 }
        );
      }

      // Normalize email
      const normalizedEmail = normalizeEmail(email);

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.message },
          { status: 400 }
        );
      }

      await connectToDatabase();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const organizationId = getOrganizationId(user);
      const newUser = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        organizationId,
        isActive: true,
      });

      // Return user without sensitive data
      const userResponse = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      };

      return NextResponse.json(
        {
          success: true,
          data: userResponse,
          message: 'User created successfully',
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating user:', error);
      
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
  });
}
