import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';
import { hashPassword, normalizeEmail } from '@/lib/auth';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']).optional(),
  isEmployee: z.boolean().optional(),
  salary: z.number().min(0).optional(),
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
 * PUT /api/users/[id] - Update user in BOTH main and tenant databases
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    
    // Only org_admin can update users
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only Organization Admins can update users' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Build update document with explicit $set/$unset
    const set: any = {};
    const unset: any = {};

    if (validation.data.name) {
      set.name = validation.data.name;
    }

    if (validation.data.email) {
      set.email = normalizeEmail(validation.data.email);
    }

    if (validation.data.password) {
      set.password = await hashPassword(validation.data.password);
    }

    if (validation.data.role) {
      // Prevent changing to or from org_admin
      if (validation.data.role === 'org_admin') {
        return NextResponse.json(
          { error: 'Cannot change role to Organization Admin' },
          { status: 403 }
        );
      }
      set.role = validation.data.role;
    }

    if (validation.data.isEmployee !== undefined) {
      set.isEmployee = validation.data.isEmployee;
      if (!validation.data.isEmployee) {
        unset.salary = '';
      }
    }

    if (validation.data.salary !== undefined) {
      // Only set salary if employee
      if (validation.data.isEmployee !== false) {
        set.salary = Number(validation.data.salary);
      }
    }

    // Connect to main database
    await connectToDatabase();

    // Check if user exists and belongs to same organization
    const existingUser = await User.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent modifying org_admin
    if (existingUser.role === 'org_admin') {
      return NextResponse.json(
        { error: 'Cannot modify Organization Admin' },
        { status: 403 }
      );
    }

    // Register all models first
    registerAllModels();

    // Update in TENANT database FIRST
    const tenantConnection = await getTenantConnection(user.organizationId);
    const TenantUser = getTenantModel(tenantConnection, 'User');

    // Find user in tenant DB by email
    const tenantUser = await TenantUser.findOne({
      email: existingUser.email,
      organizationId: user.organizationId,
    });

    const updateDoc = Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };

    if (tenantUser) {
      await TenantUser.findByIdAndUpdate(
        tenantUser._id,
        updateDoc,
        { new: true, runValidators: true }
      );
      console.log(`✅ User updated in tenant database: ${existingUser.email}`);
    } else {
      console.warn(`⚠️ User not found in tenant database: ${existingUser.email}`);
    }

    // Update in MAIN database
    const { connectToDatabase: connectMain } = require('@/lib/mongoose');
    const UserMain = require('@/models/User').default;
    
    await connectMain();
    const updatedUserMain = await UserMain.findByIdAndUpdate(
      params.id,
      updateDoc,
      { new: true, runValidators: true }
    ).select('-password -refreshToken -passwordResetToken');

    console.log(`✅ User updated in main database: ${updatedUserMain?.email}`);

    return NextResponse.json({
      success: true,
      data: updatedUserMain,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Delete user from BOTH main and tenant databases
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    
    // Only org_admin can delete users
    if (user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only Organization Admins can delete users' },
        { status: 403 }
      );
    }

    // Connect to main database
    await connectToDatabase();

    // Check if user exists and belongs to same organization
    const existingUser = await User.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting org_admin
    if (existingUser.role === 'org_admin') {
      return NextResponse.json(
        { error: 'Cannot delete Organization Admin' },
        { status: 403 }
      );
    }

    // Only org_admin can delete admin users
    if (existingUser.role === 'admin' && user.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'Only Organization Admins can delete Admins' },
        { status: 403 }
      );
    }

    // Register all models first
    registerAllModels();

    // Delete from TENANT database FIRST
    const tenantConnection = await getTenantConnection(user.organizationId);
    const TenantUser = getTenantModel(tenantConnection, 'User');

    // Find and delete user in tenant DB by email
    const tenantUser = await TenantUser.findOne({
      email: existingUser.email,
      organizationId: user.organizationId,
    });

    if (tenantUser) {
      await TenantUser.findByIdAndDelete(tenantUser._id);
      console.log(`✅ User deleted from tenant database: ${existingUser.email}`);
    } else {
      console.warn(`⚠️ User not found in tenant database: ${existingUser.email}`);
    }

    // Delete from MAIN database
    const { connectToDatabase: connectMain } = require('@/lib/mongoose');
    const UserMain = require('@/models/User').default;
    
    await connectMain();
    await UserMain.findByIdAndDelete(params.id);
    console.log(`✅ User deleted from main database: ${existingUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully from both databases',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    if (error.message.includes('token') || error.message.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
