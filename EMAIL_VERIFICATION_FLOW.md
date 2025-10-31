# Email Verification Flow

## Overview

The organization signup process now requires **email verification before creating the organization**. This ensures that only verified email addresses can create organizations.

## Flow Diagram

```
User Signup
    ↓
Create PendingOrganization (temporary)
    ↓
Send Verification Email
    ↓
User Clicks Email Link
    ↓
Verify Token
    ↓
Create Organization + Admin User
    ↓
Delete PendingOrganization
    ↓
Send Welcome Email
    ↓
User Can Login
```

## Implementation Details

### 1. Signup Process (`POST /api/auth/signup`)

**What Happens:**
- User submits organization details
- System validates input (email, password strength, subdomain)
- Checks if email/subdomain already exists (in both verified and pending)
- **Creates `PendingOrganization`** (NOT a real organization yet)
- Sends verification email with token
- Returns success message

**Data Stored in PendingOrganization:**
```javascript
{
  organizationName: "My Store",
  email: "admin@example.com",
  adminName: "John Doe",
  hashedPassword: "bcrypt_hash",
  subdomain: "mystore",
  verificationToken: "jwt_token",
  verificationTokenExpires: Date (24 hours)
}
```

**Important:**
- No Organization or User is created yet
- Pending records auto-expire after 24 hours (MongoDB TTL index)
- User cannot login until verification is complete

### 2. Email Verification (`POST /api/auth/verify-organization`)

**What Happens:**
- User clicks verification link from email
- System finds `PendingOrganization` by token
- Validates token hasn't expired
- **Creates actual Organization** (isActive: true, isVerified: true)
- **Creates Admin User** (isActive: true)
- **Deletes PendingOrganization**
- Sends welcome email
- Returns success message

**Organization Created:**
```javascript
{
  name: "My Store",
  email: "admin@example.com",
  subdomain: "mystore",
  isActive: true,
  isVerified: true,
  settings: {
    currency: "USD",
    timezone: "America/New_York",
    taxRate: 0
  }
}
```

**Admin User Created:**
```javascript
{
  name: "John Doe",
  email: "admin@example.com",
  password: "hashed_from_pending",
  role: "admin",
  organizationId: "org_id",
  isActive: true
}
```

### 3. Welcome Email

After successful verification, a welcome email is sent containing:
- Confirmation of successful verification
- Organization name
- Login link
- Next steps guidance

## Database Models

### PendingOrganization Model

**Purpose:** Temporary storage for unverified signups

**Fields:**
- `organizationName` - Organization name
- `email` - Admin email (unique)
- `adminName` - Admin user name
- `hashedPassword` - Pre-hashed password
- `subdomain` - Optional subdomain
- `verificationToken` - JWT token for verification
- `verificationTokenExpires` - Token expiration date
- `createdAt` - Auto-expires after 24 hours

**Indexes:**
- `email` (unique)
- `verificationToken`
- `createdAt` (TTL index - auto-delete after 24 hours)

### Organization Model

**Changes:**
- Removed `verificationToken` field
- Removed `verificationTokenExpires` field
- `isActive` defaults to `true` (only created after verification)
- `isVerified` defaults to `true` (only created after verification)

## Security Features

### 1. Token Expiration
- Verification tokens expire after 24 hours
- Expired tokens are rejected
- Pending organizations auto-delete after 24 hours

### 2. Duplicate Prevention
- Email uniqueness checked in both `Organization` and `PendingOrganization`
- Subdomain uniqueness checked in both collections
- Prevents multiple pending verifications for same email

### 3. Password Security
- Password is hashed **before** storing in `PendingOrganization`
- Uses bcrypt with salt rounds
- Never stored in plain text

### 4. Token Security
- JWT tokens with expiration
- Tokens are single-use (pending org deleted after verification)
- Cannot be reused after verification

## Email Templates

### Verification Email

**Subject:** Verify Your Organization - Liquor POS

**Content:**
- Organization name
- Verification link (expires in 24 hours)
- Clear call-to-action button
- Warning about expiration
- Ignore instructions if not requested

**Link Format:**
```
http://localhost:3000/verify-organization?token=JWT_TOKEN
```

### Welcome Email

**Subject:** Welcome to Liquor POS - Your Organization is Active!

**Content:**
- Congratulations message
- Organization name
- Login link
- Next steps:
  - Log in to account
  - Set up products
  - Add team members
  - Start processing sales

## Error Handling

### Signup Errors

| Error | Status | Description |
|-------|--------|-------------|
| Email already exists | 409 | Organization with email already verified |
| Pending verification exists | 409 | Verification email already sent |
| Subdomain taken | 409 | Subdomain used by verified or pending org |
| Invalid email format | 400 | Email doesn't match regex |
| Weak password | 400 | Password doesn't meet requirements |

### Verification Errors

| Error | Status | Description |
|-------|--------|-------------|
| Invalid token | 400 | Token not found or expired |
| Organization exists | 409 | Email already has verified organization |
| Verification failed | 500 | Database or system error |

## User Experience

### Signup Flow

1. User fills signup form
2. Sees success message: "Verification email sent!"
3. Checks email inbox
4. Clicks verification link
5. Redirected to verification page
6. Sees success: "Email verified! Organization created!"
7. Clicks "Go to Login"
8. Logs in with credentials

### If Token Expires

1. User tries to verify after 24 hours
2. Sees error: "Invalid or expired verification token"
3. Can sign up again (pending org auto-deleted)
4. Receives new verification email

## API Endpoints

### POST /api/auth/signup

**Request:**
```json
{
  "organizationName": "My Store",
  "email": "admin@example.com",
  "adminName": "John Doe",
  "password": "SecurePass123!",
  "subdomain": "mystore"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email sent! Please check your email...",
  "pendingId": "pending_org_id"
}
```

### POST /api/auth/verify-organization

**Request:**
```json
{
  "token": "jwt_verification_token"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully! Your organization has been created...",
  "organization": {
    "id": "org_id",
    "name": "My Store",
    "email": "admin@example.com"
  }
}
```

## Testing

### Test Signup Flow

```bash
# 1. Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Store",
    "email": "test@example.com",
    "adminName": "Test Admin",
    "password": "Test123!@#",
    "subdomain": "teststore"
  }'

# 2. Check email for verification link

# 3. Verify (use token from email)
curl -X POST http://localhost:3000/api/auth/verify-organization \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_FROM_EMAIL"
  }'

# 4. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Check Database

```javascript
// Check pending organizations
db.pendingorganizations.find()

// Check verified organizations
db.organizations.find()

// Check users
db.users.find()
```

## Cleanup

### Automatic Cleanup

- **PendingOrganization** records auto-delete after 24 hours (MongoDB TTL)
- No manual cleanup required

### Manual Cleanup (if needed)

```javascript
// Delete expired pending organizations
db.pendingorganizations.deleteMany({
  verificationTokenExpires: { $lt: new Date() }
})

// Delete old pending organizations (older than 24 hours)
db.pendingorganizations.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
})
```

## Benefits

### 1. Email Verification Required
- Only verified emails can create organizations
- Prevents spam signups
- Ensures valid contact information

### 2. Clean Database
- No inactive/unverified organizations cluttering database
- Pending records auto-expire
- Only verified organizations stored permanently

### 3. Better Security
- Tokens are single-use
- Expired tokens automatically rejected
- Password hashed before temporary storage

### 4. Improved UX
- Clear verification flow
- Welcome email after successful verification
- Helpful error messages

## Migration Notes

### From Old System

If you have existing organizations with `verificationToken` fields:

```javascript
// Clean up old verification fields
db.organizations.updateMany(
  {},
  {
    $unset: {
      verificationToken: "",
      verificationTokenExpires: ""
    }
  }
)

// Ensure all existing orgs are verified
db.organizations.updateMany(
  {},
  {
    $set: {
      isActive: true,
      isVerified: true
    }
  }
)
```

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify SMTP configuration in `.env`
3. Check server logs for email errors
4. Try signing up again after 24 hours

### Token Expired

1. Wait for pending org to auto-delete (24 hours)
2. Or manually delete from database
3. Sign up again with same email

### Organization Already Exists

1. User may have already verified
2. Try logging in instead
3. Use forgot password if needed

## Future Enhancements

- Resend verification email endpoint
- Email change verification
- Phone number verification
- Two-factor authentication
- Admin approval for organizations
