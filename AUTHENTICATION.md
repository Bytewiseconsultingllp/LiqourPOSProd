# Authentication System Documentation

## Overview

The Liquor POS system implements a comprehensive authentication system with:
- Organization signup with email verification
- JWT-based authentication with access and refresh tokens
- Role-based access control (Admin, Manager, Staff)
- Password reset with admin approval
- System-level caching for performance
- Email notifications for all authentication events

## Architecture

### Multi-Tenant Authentication

Each organization is completely isolated:
- Organizations stored in main database
- Users stored in main database with `organizationId` reference
- All data operations are scoped to the authenticated user's organization

### Token System

**Access Token**
- Short-lived (15 minutes default)
- Used for API authentication
- Contains: userId, email, organizationId, role

**Refresh Token**
- Long-lived (7 days default)
- Used to obtain new access tokens
- Stored in database for validation

## User Roles

### Admin
- Full system access
- Can manage all users
- Can create/update/delete other admins
- Receives password reset approval requests

### Manager
- Can manage staff users
- Cannot manage admins
- Can access all business features

### Staff
- Basic access to business features
- Cannot manage users
- Limited to assigned permissions

## API Endpoints

### Organization Signup

**POST /api/auth/signup**

Creates a new organization and admin user. Sends verification email.

```json
{
  "organizationName": "My Liquor Store",
  "email": "admin@example.com",
  "adminName": "John Doe",
  "password": "SecurePass123!",
  "subdomain": "mystore" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organization created successfully. Please check your email to verify your account.",
  "organizationId": "..."
}
```

**Email:** Verification link sent to provided email

### Organization Verification

**POST /api/auth/verify-organization**

Verifies organization email and activates the account.

```json
{
  "token": "verification_token_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organization verified successfully! You can now log in.",
  "organization": { ... }
}
```

**Email:** Welcome email sent after successful verification

### Login

**POST /api/auth/login**

Authenticates user and returns tokens. Email is automatically converted to lowercase.

```json
{
  "email": "Admin@Example.com", // Will be normalized to lowercase
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "admin@example.com",
    "role": "admin",
    "organizationId": "..."
  },
  "organization": {
    "id": "...",
    "name": "My Liquor Store",
    "settings": { ... }
  }
}
```

### Refresh Token

**POST /api/auth/refresh**

Obtains new access and refresh tokens.

```json
{
  "refreshToken": "current_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

### Forgot Password

**POST /api/auth/forgot-password**

Initiates password reset. Sends email to organization admins for approval.

```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset request has been sent to your organization administrators for approval."
}
```

**Email:** Sent to all organization admins with reset approval link

### Reset Password

**POST /api/auth/reset-password**

Resets password after admin approval.

```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

## User Management

### List Users

**GET /api/users**

Lists all users in the organization. Requires admin or manager role.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "..."
    }
  ],
  "count": 1
}
```

### Create User

**POST /api/users**

Creates a new user in the organization. Requires admin or manager role.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "staff" // admin, manager, or staff
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "User created successfully"
}
```

### Get User

**GET /api/users/[id]**

Gets a specific user by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

### Update User

**PUT /api/users/[id]**

Updates user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "name": "Updated Name",
  "role": "manager",
  "isActive": true,
  "password": "NewPassword123!" // optional
}
```

### Delete User

**DELETE /api/users/[id]**

Soft deletes a user (sets isActive to false).

**Headers:**
```
Authorization: Bearer <access_token>
```

## Frontend Pages

### /signup
Organization registration page with email verification

### /login
User login page with forgot password link

### /verify-organization
Email verification landing page

### /reset-password
Password reset page (accessed via email link)

### /dashboard
Protected dashboard - requires authentication

### /dashboard/users
User management page - requires admin or manager role

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Email Normalization
All emails are automatically converted to lowercase to prevent duplicate accounts with different casing.

### Token Security
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Tokens are validated on every request
- Refresh tokens are stored in database for additional validation

### Password Reset Security
- Reset tokens expire after 1 hour
- Requires admin approval (email sent to all admins)
- Old refresh tokens are invalidated after password reset

### Role-Based Access Control
- Middleware enforces role requirements
- Users can only access resources in their organization
- Admins required for sensitive operations

## Caching System

The system uses in-memory caching for performance:

### Cached Data
- User information (15 minutes TTL)
- Organization data (30 minutes TTL)
- Session data (15 minutes TTL)

### Cache Invalidation
- User cache invalidated on update/delete
- Organization cache invalidated on verification
- Session cache invalidated on logout

### Cache Functions
```typescript
// User caching
cacheUser(userId, userData, ttl)
getCachedUser(userId)
invalidateUserCache(userId)

// Organization caching
cacheOrganization(orgId, orgData, ttl)
getCachedOrganization(orgId)
invalidateOrganizationCache(orgId)

// Session caching
cacheSession(sessionId, sessionData, ttl)
getCachedSession(sessionId)
invalidateSession(sessionId)
```

## Email Templates

### Organization Verification
- Sent immediately after signup
- Contains verification link
- Expires in 24 hours

### Welcome Email
- Sent after successful verification
- Contains login link
- Includes next steps

### Password Reset Request
- Sent to organization admins
- Contains approval/reset link
- Expires in 1 hour

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Application
APP_URL=http://localhost:3000
```

## Client-Side Authentication

### Storing Tokens
```javascript
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('organization', JSON.stringify(org));
```

### Making Authenticated Requests
```javascript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  }
});
```

### Handling Token Refresh
```javascript
if (response.status === 401) {
  // Try to refresh token
  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });
  
  if (refreshResponse.ok) {
    const data = await refreshResponse.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    // Retry original request
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Best Practices

1. **Always use HTTPS in production**
2. **Rotate JWT secrets regularly**
3. **Use strong SMTP credentials**
4. **Monitor failed login attempts**
5. **Implement rate limiting on auth endpoints**
6. **Log all authentication events**
7. **Regular security audits**
8. **Keep dependencies updated**

## Troubleshooting

### Email Not Sending
- Check SMTP credentials
- Verify SMTP_HOST and SMTP_PORT
- For Gmail, use App Password, not regular password
- Check firewall/network settings

### Token Expired Errors
- Implement automatic token refresh
- Check system clock synchronization
- Verify JWT_EXPIRES_IN configuration

### Cache Issues
- Cache automatically cleans up expired entries
- Restart server to clear all cache
- Consider Redis for production caching

### Organization Not Activating
- Check email delivery
- Verify verification token hasn't expired
- Check database for organization status
