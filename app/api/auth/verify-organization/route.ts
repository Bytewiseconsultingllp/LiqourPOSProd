import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { sendWelcomeEmail } from '@/lib/email';
import { invalidateOrganizationCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find organization with this token
    const organization = await Organization.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    }).select('+verificationToken +verificationTokenExpires');

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Update organization
    organization.isVerified = true;
    organization.isActive = true;
    organization.verificationToken = undefined;
    organization.verificationTokenExpires = undefined;
    await organization.save();

    // Activate admin user
    await User.updateMany(
      { organizationId: organization._id.toString(), role: 'admin' },
      { isActive: true }
    );

    // Get admin user for welcome email
    const adminUser = await User.findOne({
      organizationId: organization._id.toString(),
      role: 'admin',
    });

    // Invalidate cache
    invalidateOrganizationCache(organization._id.toString());

    // Send welcome email
    if (adminUser) {
      try {
        await sendWelcomeEmail(
          organization.email,
          organization.name,
          adminUser.name
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organization verified successfully! You can now log in.',
      organization: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify organization' },
      { status: 500 }
    );
  }
}
