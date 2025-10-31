import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongoose';
import User, { getOrganizationAdmins } from '@/models/User';
import { normalizeEmail, generatePasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = normalizeEmail(email);

    await connectToDatabase();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent to the organization administrators.',
      });
    }

    if (!user.isActive) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent to the organization administrators.',
      });
    }

    // Get organization admins
    const admins = await getOrganizationAdmins(user.organizationId);

    if (admins.length === 0) {
      console.error('No admins found for organization:', user.organizationId);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent to the organization administrators.',
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken(
      user._id.toString(),
      user.email
    );
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send email to all admins
    const adminEmails = admins.map(admin => admin.email);
    
    try {
      await sendPasswordResetEmail(
        adminEmails,
        user.name,
        user.email,
        resetToken
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset request has been sent to your organization administrators for approval.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
