# Production SSL/TLS Fix - Complete Guide

## Issue
Production deployment failing with SSL error on login:
```
MongooseServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

## Root Cause
Three MongoDB connection files were missing SSL/TLS configuration:
1. ✅ `lib/mongoose.ts` - Main database connection (LOGIN ROUTE)
2. ✅ `lib/tenant-db.ts` - Tenant database connections
3. ✅ `lib/mongodb.ts` - MongoClient connections

## Files Fixed

### 1. `lib/mongoose.ts` ⭐ CRITICAL FOR LOGIN
```typescript
// Main database connection
const opts = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  retryWrites: true,
  retryReads: true,
};
```

### 2. `lib/tenant-db.ts`
```typescript
// Tenant connections with SSL
const connection = mongoose.createConnection(finalUri, {
  // ... same SSL options
});
```

### 3. `lib/mongodb.ts`
```typescript
// MongoClient with SSL
const options = {
  tls: true,
  // ... same SSL options
};
```

## Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "fix: Add SSL/TLS configuration for MongoDB connections"
git push origin main
```

### Step 2: Verify Environment Variables
Check your production environment (Vercel/Netlify/etc.):

**Required:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
```

**Format Check:**
- ✅ Must start with `mongodb+srv://` (for Atlas)
- ✅ No spaces in the URI
- ✅ Special characters in password must be URL-encoded
- ✅ Include `?retryWrites=true&w=majority`

### Step 3: MongoDB Atlas Configuration

#### A. Network Access
1. Go to MongoDB Atlas Dashboard
2. Click **Network Access** (left sidebar)
3. Click **Add IP Address**
4. Add `0.0.0.0/0` (allow all) OR your production server IPs

#### B. Database User
1. Go to **Database Access**
2. Verify user exists with correct password
3. Ensure user has **Read and write to any database** role

#### C. Cluster Status
1. Go to **Database** (Clusters)
2. Verify cluster is **RUNNING** (not paused)
3. Check cluster tier is M0 or higher

### Step 4: Redeploy

#### For Vercel:
```bash
vercel --prod
```
Or push to main branch (auto-deploys)

#### For Netlify:
```bash
netlify deploy --prod
```
Or push to main branch (auto-deploys)

#### For Other Platforms:
Trigger manual redeploy from dashboard

### Step 5: Test Production

#### Test Login:
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "...",
  "user": {...}
}
```

#### Test Sales API:
```bash
curl https://your-domain.com/api/sales?limit=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting Production

### Error: Still getting SSL errors

**Solution 1: Check MongoDB Atlas IP Whitelist**
```
Atlas → Network Access → Add 0.0.0.0/0
```

**Solution 2: Verify Connection String**
```bash
# In production logs, check if MONGODB_URI is set
echo $MONGODB_URI
```

**Solution 3: Check MongoDB Atlas Cluster**
- Ensure cluster is not paused
- Verify cluster is in same region as deployment
- Check cluster tier supports connections

### Error: Environment variables not found

**Solution:**
1. Go to deployment platform dashboard
2. Navigate to Environment Variables
3. Add `MONGODB_URI` with correct value
4. Redeploy

### Error: Connection timeout

**Solution:**
Increase timeout in production:
```typescript
serverSelectionTimeoutMS: 30000,  // 30 seconds
socketTimeoutMS: 60000,           // 60 seconds
```

### Error: Duplicate schema index warnings

**These are warnings, not errors. To fix:**
```typescript
// In model files, remove duplicate index definitions
// Either use:
field: { type: String, index: true }
// OR
schema.index({ field: 1 })
// But not both
```

## Production Checklist

Before deploying:
- ✅ All three MongoDB connection files updated with SSL config
- ✅ Code committed and pushed to repository
- ✅ Environment variables set in production platform
- ✅ MongoDB Atlas IP whitelist configured
- ✅ MongoDB Atlas cluster is running
- ✅ Database user credentials are correct
- ✅ Connection string format is correct

After deploying:
- ✅ Test login endpoint
- ✅ Test sales API
- ✅ Check production logs for errors
- ✅ Verify no SSL errors in logs
- ✅ Test from frontend application

## Monitoring

### Check Production Logs

**Vercel:**
```bash
vercel logs
```

**Netlify:**
```bash
netlify logs
```

### Look for Success Messages:
```
✅ All 9 model schemas registered
✅ Tenant database connected: tenant_xxx
✅ User found in tenant database
✅ Both database connections active
```

### Look for Error Messages:
```
❌ Failed to connect to tenant database
❌ MongooseServerSelectionError
❌ SSL routines error
```

## Performance Optimization

### Connection Pooling
```typescript
maxPoolSize: 10,    // Max connections
minPoolSize: 2,     // Min connections always open
```

### Timeouts
```typescript
socketTimeoutMS: 45000,              // 45 seconds
serverSelectionTimeoutMS: 10000,     // 10 seconds
```

### Retry Logic
```typescript
retryWrites: true,   // Retry failed writes
retryReads: true,    // Retry failed reads
```

## Security Best Practices

### Production Environment:
1. ✅ Use strong JWT secrets (32+ characters)
2. ✅ Enable SSL/TLS for MongoDB
3. ✅ Whitelist specific IPs (not 0.0.0.0/0)
4. ✅ Use environment variables for secrets
5. ✅ Enable MongoDB Atlas encryption at rest
6. ✅ Use MongoDB Atlas backup
7. ✅ Monitor connection metrics

### Connection String Security:
```env
# ✅ Good - Uses environment variable
MONGODB_URI=mongodb+srv://...

# ❌ Bad - Hardcoded in code
const uri = "mongodb+srv://user:pass@..."
```

## Rollback Plan

If deployment fails:

### Option 1: Revert Code
```bash
git revert HEAD
git push origin main
```

### Option 2: Redeploy Previous Version
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### Option 3: Temporary Fix
Set environment variable:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```
⚠️ **WARNING: Only for emergency, not for production use**

## Success Indicators

✅ Login works without errors
✅ Sales API returns data
✅ No SSL errors in production logs
✅ MongoDB Atlas shows active connections
✅ Application loads and functions normally
✅ All API endpoints responding

## Support Resources

- MongoDB Atlas Status: https://status.mongodb.com/
- MongoDB Connection String Docs: https://docs.mongodb.com/manual/reference/connection-string/
- Mongoose SSL Docs: https://mongoosejs.com/docs/connections.html#ssl
- Vercel Logs: https://vercel.com/docs/observability/runtime-logs
- Netlify Logs: https://docs.netlify.com/monitor-sites/logs/

## Contact

If issues persist after following this guide:
1. Check MongoDB Atlas status page
2. Review production logs for specific errors
3. Verify all environment variables are set
4. Test connection string locally first
5. Contact MongoDB Atlas support if cluster issues

---

**Last Updated:** November 2, 2025
**Status:** All SSL/TLS configurations applied ✅
