# Quick Start Guide

## Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Set MongoDB connection string
- Generate strong JWT secrets
- Configure SMTP email settings (Gmail recommended)

3. **Start Development Server**
```bash
npm run dev
```

## First Steps

### 1. Create Your Organization

Visit `http://localhost:3000/signup` and fill out:
- Organization Name
- Email (will be used as admin username)
- Admin Name
- Password (must meet security requirements)
- Subdomain (optional)

### 2. Verify Email

Check your email inbox for the verification link and click it. This activates your organization and admin account.

### 3. Login

Visit `http://localhost:3000/login` and enter:
- Email (automatically converted to lowercase)
- Password

### 4. Access Dashboard

After login, you'll be redirected to `/dashboard` where you can:
- Manage users (Admin/Manager only)
- Manage products
- Process sales
- View reports
- Configure settings (Admin only)

## User Management

### Adding Team Members

1. Navigate to `/dashboard/users`
2. Click "Add User"
3. Fill in user details:
   - Name
   - Email
   - Password
   - Role (Staff, Manager, or Admin)

### User Roles

**Admin**
- Full system access
- Can manage all users
- Can create/delete other admins
- Receives password reset requests

**Manager**
- Can manage staff users
- Cannot manage admins
- Full business feature access

**Staff**
- Basic business feature access
- Cannot manage users

## Password Reset

### For Users

1. Click "Forgot Password" on login page
2. Enter your email
3. Wait for admin approval

### For Admins

1. Check email for password reset request
2. Click approval link
3. User can now reset their password

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated password

3. Update `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### Other SMTP Providers

Update SMTP settings according to your provider:
- **SendGrid**: smtp.sendgrid.net:587
- **Mailgun**: smtp.mailgun.org:587
- **AWS SES**: email-smtp.region.amazonaws.com:587

## Security Best Practices

### JWT Secrets

Generate strong secrets:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Password Requirements

Passwords must have:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## API Usage

### Authentication

All protected endpoints require Bearer token:

```javascript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Token Refresh

When access token expires (401 response):

```javascript
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
```

## Troubleshooting

### Email Not Sending

**Check:**
- SMTP credentials are correct
- Using App Password for Gmail (not regular password)
- SMTP_PORT is correct (usually 587)
- Firewall allows outbound connections on SMTP port

**Test:**
```bash
# Check if you can connect to SMTP server
telnet smtp.gmail.com 587
```

### Cannot Login

**Check:**
- Organization is verified (check email)
- Email is entered correctly (case doesn't matter)
- Password meets requirements
- User account is active

### Token Expired Errors

**Solutions:**
- Implement automatic token refresh in frontend
- Check system clock is synchronized
- Verify JWT_EXPIRES_IN is set correctly

### Database Connection Issues

**Check:**
- MongoDB is running
- MONGODB_URI is correct
- Network connectivity
- Database user has proper permissions

## Development Tips

### Testing Authentication

Use tools like Postman or curl:

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Test Org","email":"test@example.com","adminName":"Test Admin","password":"Test123!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Use token
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Viewing Logs

Check console for:
- Authentication events
- Email sending status
- Database operations
- API requests

### Database Inspection

Use MongoDB Compass or mongosh:

```bash
mongosh
use liquor_pos_main
db.organizations.find()
db.users.find()
```

## Production Deployment

### Before Deploying

1. **Update Environment Variables**
   - Use production MongoDB URI
   - Generate new JWT secrets
   - Configure production email service
   - Set APP_URL to production domain

2. **Build Application**
```bash
npm run build
```

3. **Test Build**
```bash
npm start
```

4. **Security Checklist**
   - [ ] Strong JWT secrets
   - [ ] HTTPS enabled
   - [ ] Environment variables secured
   - [ ] Database access restricted
   - [ ] Email service configured
   - [ ] Rate limiting enabled
   - [ ] CORS configured properly

## Support

For issues or questions:
1. Check [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed auth docs
2. Review [README.md](./README.md) for general documentation
3. Check application logs for error messages
4. Contact development team

## Next Steps

- Configure organization settings
- Add team members
- Set up product catalog
- Configure tax rates
- Start processing sales
- Review analytics and reports
