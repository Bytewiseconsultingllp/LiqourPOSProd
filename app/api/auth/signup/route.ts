import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { hashPassword, normalizeEmail, isValidEmail, validatePassword, generateVerificationToken } from '@/lib/auth';
import { sendOrgVerificationEmail } from '@/lib/email';

const signupSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { organizationName, email, adminName, password, subdomain } = validation.data;

    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if organization with email already exists
    const existingOrg = await Organization.findOne({ email: normalizedEmail });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this email already exists' },
        { status: 409 }
      );
    }

    // Check if subdomain is taken
    if (subdomain) {
      const existingSubdomain = await Organization.findOne({ subdomain });
      if (existingSubdomain) {
        return NextResponse.json(
          { error: 'This subdomain is already taken' },
          { status: 409 }
        );
      }
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create organization (inactive until verified)
    const organization = await Organization.create({
      name: organizationName,
      email: normalizedEmail,
      subdomain,
      isActive: false,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user (also inactive until org is verified)
    await User.create({
      name: adminName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
      organizationId: organization._id.toString(),
      isActive: false,
    });

    // Send verification email
    try {
      await sendOrgVerificationEmail(
        normalizedEmail,
        organizationName,
        verificationToken
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - admin can resend verification
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Organization created successfully. Please check your email to verify your account.',
        organizationId: organization._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Organization with this email or subdomain already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
