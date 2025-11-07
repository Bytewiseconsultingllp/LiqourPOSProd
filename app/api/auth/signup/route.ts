import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import Organization from '@/models/Organization';
import PendingOrganization from '@/models/PendingOrganization';
import User from '@/models/User';
import { hashPassword, normalizeEmail, isValidEmail, validatePassword, generateVerificationToken } from '@/lib/auth';
import { sendOrgVerificationEmail } from '@/lib/email';

const signupSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().optional(),
  gstNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  panNumber: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
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

    const { 
      organizationName, 
      email, 
      phone,
      address,
      city,
      state,
      pincode,
      country,
      gstNumber,
      licenseNumber,
      fssaiNumber,
      panNumber,
      website,
      adminName, 
      password, 
      subdomain 
    } = validation.data;

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

    // Check if organization with email already exists (verified)
    const existingOrg = await Organization.findOne({ email: normalizedEmail });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this email already exists' },
        { status: 409 }
      );
    }

    // Check if there's already a pending verification for this email
    const existingPending = await PendingOrganization.findOne({ email: normalizedEmail });
    if (existingPending) {
      return NextResponse.json(
        { error: 'A verification email has already been sent to this address. Please check your email or wait for it to expire.' },
        { status: 409 }
      );
    }

    // Check if subdomain is taken (in both verified and pending)
    if (subdomain) {
      const existingSubdomain = await Organization.findOne({ subdomain });
      const pendingSubdomain = await PendingOrganization.findOne({ subdomain });
      
      if (existingSubdomain || pendingSubdomain) {
        return NextResponse.json(
          { error: 'This subdomain is already taken' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create pending organization (will be converted to real org after verification)
    const pendingOrg = await PendingOrganization.create({
      organizationName,
      email: normalizedEmail,
      phone,
      address,
      city,
      state,
      pincode,
      country: country || 'India',
      gstNumber,
      licenseNumber,
      fssaiNumber,
      panNumber,
      website,
      adminName,
      hashedPassword,
      subdomain,
      verificationToken,
      verificationTokenExpires,
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
        message: 'Verification email sent! Please check your email and click the verification link to complete your registration.',
        pendingId: pendingOrg._id,
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
