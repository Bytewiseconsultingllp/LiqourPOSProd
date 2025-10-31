import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update user's last login and refresh token
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    await user.save();

    // Cache user and organization data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const orgData = {
      id: organization._id,
      name: organization.name,
      email: organization.email,
      settings: organization.settings,
    };

    cacheUser(user._id.toString(), userData);
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
