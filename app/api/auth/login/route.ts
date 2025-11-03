import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';
import Organization from '@/models/Organization';
import {
  comparePassword,
  normalizeEmail,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth';
import { cacheUser, cacheOrganization } from '@/lib/cache';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
    
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Normalize email to lowercase
    const normalizedEmail = normalizeEmail(email);

    // Connect to main database to find user and organization
    await connectToDatabase();

    // Find user by email (include password field)
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password +refreshToken');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if organization is active
    const organization = await Organization.findById(user.organizationId);
    if (!organization || !organization.isActive || !organization.isVerified) {
      return NextResponse.json(
        { error: 'Your organization is not active or verified' },
        { status: 403 }
      );
    }

    const organizationId = organization._id.toString();
    const mainUserId = user._id.toString();
    const mainUserData = {
      email: user.email,
      password: user.password,
      role: user.role,
      name: user.name,
    };

    // STEP 2: Connect to tenant database and verify user exists
    let tenantConnection;
    let tenantUser;
    try {
      // Register all model schemas FIRST (before getting connection)      
      // Get tenant connection (this will use the registered schemas)
      tenantConnection = await getTenantConnection(organizationId);
      
      // Get User model from tenant DB
      const TenantUser = getTenantModel(tenantConnection, 'User');
      
      // Check if user exists in tenant DB
      tenantUser = await TenantUser.findOne({ 
        email: normalizedEmail,
        organizationId 
      }).select('+password');
      
      if (!tenantUser) {
        console.log(`⚠️ User not found in tenant DB, this is expected for old users`);
        // User doesn't exist in tenant DB yet - this is OK for existing users
        // They will be created on first login
      } else {
        console.log(`✅ User found in tenant database: ${tenantUser.email}`);
      }
      
      console.log(`✅ Tenant database connected: tenant_${organizationId}`);
    } catch (dbError) {
      console.error('Failed to connect to tenant database:', dbError);
      return NextResponse.json(
        { error: 'Failed to initialize organization database' },
        { status: 500 }
      );
    }

    // STEP 3: Generate tokens (for tenant DB, not main DB)
    const tokenPayload = {
      userId: mainUserId,
      email: mainUserData.email,
      organizationId: organizationId,
      role: mainUserData.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token in MAIN DB user for refresh endpoint validation
    user.refreshToken = refreshToken;
    await user.save();

    // STEP 4: Update user's last login in TENANT DB (if user exists)
    if (tenantUser) {
      tenantUser.lastLogin = new Date();
      tenantUser.refreshToken = refreshToken;
      await tenantUser.save();
      console.log(`✅ Updated last login in tenant database`);
    }

    // Note: We keep BOTH main and tenant DB connections active
    // Main DB is needed for user edit/delete operations
    // Tenant DB is used for all other operations
    console.log(`✅ Both database connections active (main + tenant)`);

    // Cache user and organization data
    const userData = {
      id: mainUserId,
      name: mainUserData.name,
      email: mainUserData.email,
      role: mainUserData.role,
      organizationId: organizationId,
    };

    const orgData = {
      id: organization._id,
      name: organization.name,
      email: organization.email,
      settings: organization.settings,
    };

    cacheUser(mainUserId, userData);
    cacheOrganization(organization._id.toString(), orgData);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData,
      organization: orgData,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
