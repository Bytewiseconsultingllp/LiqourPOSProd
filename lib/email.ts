import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`Email sent to: ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send organization verification email
 */
export async function sendOrgVerificationEmail(
  email: string,
  orgName: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.APP_URL}/verify-organization?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Organization Verification</h1>
          </div>
          <div class="content">
            <h2>Welcome to Liquor POS!</h2>
            <p>A new organization "<strong>${orgName}</strong>" has been registered with this email address.</p>
            <p>Please click the button below to verify and activate your organization:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Organization</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not create this organization, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Liquor POS. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Organization - Liquor POS',
    html,
    text: `Please verify your organization by visiting: ${verificationUrl}`,
  });
}

/**
 * Send password reset email to organization admins
 */
export async function sendPasswordResetEmail(
  adminEmails: string[],
  userName: string,
  userEmail: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Password Reset Notification</h2>
            <p>A password reset has been requested for user:</p>
            <ul>
              <li><strong>Name:</strong> ${userName}</li>
              <li><strong>Email:</strong> ${userEmail}</li>
            </ul>
            <div class="warning">
              <strong>⚠️ Admin Approval Required</strong>
              <p>As an organization administrator, you are receiving this notification. Please approve this password reset request by clicking the button below.</p>
            </div>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Approve & Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this password reset, please contact your system administrator immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Liquor POS. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: adminEmails,
    subject: 'Password Reset Request - Admin Approval Required',
    html,
    text: `Password reset requested for ${userEmail}. Approve at: ${resetUrl}`,
  });
}

/**
 * Send welcome email after organization verification
 */
export async function sendWelcomeEmail(
  email: string,
  orgName: string,
  adminName: string
): Promise<void> {
  const loginUrl = `${process.env.APP_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Liquor POS!</h1>
          </div>
          <div class="content">
            <h2>Hello ${adminName},</h2>
            <p>Your organization "<strong>${orgName}</strong>" has been successfully verified and activated!</p>
            <p>You can now log in and start using the system:</p>
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Go to Login</a>
            </p>
            <h3>Next Steps:</h3>
            <ul>
              <li>Log in to your account</li>
              <li>Set up your products and inventory</li>
              <li>Add team members to your organization</li>
              <li>Start processing sales</li>
            </ul>
            <p>If you need any assistance, please don't hesitate to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Liquor POS. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Liquor POS - Your Organization is Active!',
    html,
    text: `Welcome to Liquor POS! Your organization ${orgName} is now active. Login at: ${loginUrl}`,
  });
}
