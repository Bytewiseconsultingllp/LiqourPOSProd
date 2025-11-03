import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/lib/auth';
import { cacheUser } from '@/lib/cache';
import { connectToDatabase } from '@/lib/mongoose';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const tenantId = payload.organizationId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID missing in token' },
        { status: 400 }
      );
    }

    // Connect to main DB to verify refresh token
    await connectToDatabase();
    const mainUser = await User.findById(payload.userId).select('+refreshToken');
    
    if (!mainUser || mainUser.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    if (!mainUser.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Also get tenant user if exists
    const tenantConnection = await getTenantConnection(tenantId);
    const TenantUser = getTenantModel(tenantConnection, 'User');
    const tenantUser = await TenantUser.findById(payload.userId).select('+refreshToken');

    // Generate new tokens
    const newTokenPayload = {
      userId: mainUser._id.toString(),
      email: mainUser.email,
      organizationId: mainUser.organizationId,
      role: mainUser.role,
    };

    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);

    // Update refresh token in MAIN database
    mainUser.refreshToken = newRefreshToken;
    await mainUser.save();

    // Update refresh token in TENANT database if user exists there
    if (tenantUser) {
      tenantUser.refreshToken = newRefreshToken;
      await tenantUser.save();
    }

    // Update cache
    const userData = {
      id: mainUser._id,
      name: mainUser.name,
      email: mainUser.email,
      role: mainUser.role,
      organizationId: mainUser.organizationId,
    };
    cacheUser(mainUser._id.toString(), userData);

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
