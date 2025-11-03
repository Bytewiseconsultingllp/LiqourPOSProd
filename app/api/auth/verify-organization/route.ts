import { sendWelcomeEmail } from '@/lib/email';
import { connectToDatabase } from '@/lib/mongoose';
import { getTenantConnection, getTenantModel } from '@/lib/tenant-db';
import Organization from '@/models/Organization';
import PendingOrganization from '@/models/PendingOrganization';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
    
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

    // Find pending organization with this token
    const pendingOrg = await PendingOrganization.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!pendingOrg) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if organization already exists (shouldn't happen, but safety check)
    const existingOrg = await Organization.findOne({ email: pendingOrg.email });
    if (existingOrg) {
      // Clean up pending org
      await PendingOrganization.deleteOne({ _id: pendingOrg._id });
      return NextResponse.json(
        { error: 'Organization already exists. Please login.' },
        { status: 409 }
      );
    }

    // Create the actual organization
    const organization = await Organization.create({
      name: pendingOrg.organizationName,
      email: pendingOrg.email,
      subdomain: pendingOrg.subdomain,
      isActive: true,
      isVerified: true,
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        taxRate: 0,
      },
    });

    // Create org admin user in MAIN database
    const adminUser = await User.create({
      name: pendingOrg.adminName,
      email: pendingOrg.email,
      password: pendingOrg.hashedPassword,
      role: 'org_admin', // Changed from 'admin' to 'org_admin'
      organizationId: organization._id.toString(),
      isActive: true,
    });

    console.log(`✅ Org admin created in main database: ${adminUser.email}`);

    // Create org admin user in TENANT database
    try {
      // Register all model schemas      
      // Get tenant connection
      const tenantConnection = await getTenantConnection(organization._id.toString());
      const TenantUser = getTenantModel(tenantConnection, 'User');

      // Create org admin in tenant database
      await TenantUser.create({
        name: pendingOrg.adminName,
        email: pendingOrg.email,
        password: pendingOrg.hashedPassword,
        role: 'org_admin',
        organizationId: organization._id.toString(),
        isActive: true,
      });

      console.log(`✅ Org admin created in tenant database: ${adminUser.email}`);
    } catch (tenantError) {
      console.error('Failed to create org admin in tenant database:', tenantError);
      // Rollback: Delete organization and admin user
      await User.findByIdAndDelete(adminUser._id);
      await Organization.findByIdAndDelete(organization._id);
      
      return NextResponse.json(
        { error: 'Failed to initialize organization database' },
        { status: 500 }
      );
    }

    // Delete pending organization
    await PendingOrganization.deleteOne({ _id: pendingOrg._id });

    // Send welcome/verification success email
    try {
      await sendWelcomeEmail(
        organization.email,
        organization.name,
        adminUser.name
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue anyway - organization is created
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your organization has been created. You can now log in.',
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
