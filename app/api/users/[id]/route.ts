import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';
import { requireAdminOrManager, getOrganizationId } from '@/lib/auth-middleware';
import { hashPassword, validatePassword } from '@/lib/auth';
import { invalidateUserCache } from '@/lib/cache';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

/**
 * GET /api/users/[id] - Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdminOrManager(request, async (req, user) => {
    try {
      const organizationId = getOrganizationId(user);
      
      await connectToDatabase();

      const targetUser = await User.findOne({
        _id: params.id,
        organizationId,
      }).select('-password -refreshToken -passwordResetToken');

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: targetUser,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/users/[id] - Update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdminOrManager(request, async (req, user) => {
    try {
      const body = await request.json();

      // Validate input
      const validation = updateUserSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const updates = validation.data;

      // Only admins can change roles or update other admins
      if (updates.role && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can change user roles' },
          { status: 403 }
        );
      }

      const organizationId = getOrganizationId(user);
      
      await connectToDatabase();

      const targetUser = await User.findOne({
        _id: params.id,
        organizationId,
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Only admins can update other admins
      if (targetUser.role === 'admin' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can update admin users' },
          { status: 403 }
        );
      }

      // Prevent users from deactivating themselves
      if (updates.isActive === false && targetUser._id.toString() === user.userId) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        );
      }

      // Handle password update
      if (updates.password) {
        const passwordValidation = validatePassword(updates.password);
        if (!passwordValidation.valid) {
          return NextResponse.json(
            { error: passwordValidation.message },
            { status: 400 }
          );
        }
        updates.password = await hashPassword(updates.password);
      }

      // Update user
      Object.assign(targetUser, updates);
      await targetUser.save();

      // Invalidate cache
      invalidateUserCache(targetUser._id.toString());

      // Return updated user without sensitive data
      const userResponse = await User.findById(targetUser._id)
        .select('-password -refreshToken -passwordResetToken');

      return NextResponse.json({
        success: true,
        data: userResponse,
        message: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/users/[id] - Soft delete user (set isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdminOrManager(request, async (req, user) => {
    try {
      const organizationId = getOrganizationId(user);
      
      await connectToDatabase();

      const targetUser = await User.findOne({
        _id: params.id,
        organizationId,
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Only admins can delete other admins
      if (targetUser.role === 'admin' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can delete admin users' },
          { status: 403 }
        );
      }

      // Prevent users from deleting themselves
      if (targetUser._id.toString() === user.userId) {
        return NextResponse.json(
          { error: 'You cannot delete your own account' },
          { status: 400 }
        );
      }

      // Soft delete
      targetUser.isActive = false;
      await targetUser.save();

      // Invalidate cache
      invalidateUserCache(targetUser._id.toString());

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  });
}
