# URGENT: MongoDB Atlas Connection Fix

## Critical Issue
Production login failing with: `ReplicaSetNoPrimary` - MongoDB Atlas cannot find primary server.

## Root Causes
1. ❌ Missing SSL/TLS configuration in connection options
2. ❌ Connection timeout too short (5-10 seconds)
3. ❌ Missing `authSource=admin` parameter
4. ❌ Missing `readPreference` setting

## Fixes Applied

### All 3 MongoDB Connection Files Updated:

#### 1. `lib/mongoose.ts` (Login Route)
```typescript
// Auto-append SSL parameters to URI
connectionUri = `${connectionUri}?ssl=true&authSource=admin`;

// Connection options
{
  ssl: true,
  serverSelectionTimeoutMS: 30000,  // 30 seconds (was 10)
  connectTimeoutMS: 30000,
  w: 'majority',
  readPreference: 'primaryPreferred',  // NEW - helps with replica sets
  retryWrites: true,
  retryReads: true,
}
```

#### 2. `lib/tenant-db.ts` (Tenant Connections)
Same configuration applied.

#### 3. `lib/mongodb.ts` (MongoClient)
Already has SSL configuration.

## IMMEDIATE ACTIONS REQUIRED

### Step 1: Check MongoDB Atlas Cluster

**CRITICAL - Do this FIRST:**

1. Go to https://cloud.mongodb.com/
2. Login to your account
3. Navigate to **Database** → **Clusters**
4. **Check cluster status:**
   - ✅ Should show "RUNNING" (green)
   - ❌ If "PAUSED" → Click "Resume" button
   - ❌ If "DEGRADED" → Check MongoDB Atlas status page

### Step 2: Verify Network Access

1. In MongoDB Atlas, go to **Network Access**
2. Check IP Whitelist:
   - For testing: Add `0.0.0.0/0` (allow all)
   - For production: Add your deployment platform IPs

**Vercel IPs (if using Vercel):**
```
76.76.21.0/24
76.76.19.0/24
```

**Or use:** `0.0.0.0/0` temporarily to test

### Step 3: Verify Connection String

Your `.env` should have:

**Correct Format:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.fr9zrj9.mongodb.net/?retryWrites=true&w=majority
```

**Check:**
- ✅ Starts with `mongodb+srv://` (for Atlas)
- ✅ Username and password are correct
- ✅ Cluster address matches your Atlas cluster
- ✅ No spaces or special characters (URL encode if needed)

**Special Characters in Password:**
If your password has special characters, URL encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`

### Step 4: Deploy Changes

```bash
# Commit all changes
git add .
git commit -m "fix: MongoDB connection with increased timeouts and SSL config"
git push origin main

# Wait for auto-deploy OR manually deploy
vercel --prod
```

### Step 5: Verify Environment Variables in Production

**Vercel:**
1. Go to project settings
2. Click "Environment Variables"
3. Verify `MONGODB_URI` is set correctly
4. Click "Redeploy" if you changed it

**Netlify:**
1. Go to Site settings
2. Click "Environment variables"
3. Verify `MONGODB_URI` is set correctly
4. Click "Trigger deploy"

## Testing After Deployment

### Test 1: Check Cluster Connection
```bash
# Use MongoDB Compass or mongosh
mongosh "mongodb+srv://cluster.fr9zrj9.mongodb.net/" --username YOUR_USERNAME
```

Should connect successfully.

### Test 2: Test Login API
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Expected: `{"success":true,"accessToken":"..."}`

### Test 3: Check Production Logs
Look for:
- ✅ "✅ All 9 model schemas registered"
- ✅ "✅ Tenant database connected"
- ❌ NO "ReplicaSetNoPrimary" errors
- ❌ NO "SSL routines" errors

## If Still Failing

### Option 1: Check MongoDB Atlas Status
Visit: https://status.mongodb.com/
- Check if there are any ongoing incidents
- Verify your cluster region is operational

### Option 2: Increase Timeouts Further
Edit `lib/mongoose.ts`:
```typescript
serverSelectionTimeoutMS: 60000,  // 60 seconds
connectTimeoutMS: 60000,
```

### Option 3: Check MongoDB Atlas Logs
1. Go to MongoDB Atlas
2. Click on your cluster
3. Click "Metrics" tab
4. Check for connection errors or issues

### Option 4: Verify Database User
1. MongoDB Atlas → Database Access
2. Check user exists
3. Verify password is correct
4. Ensure user has "Read and write to any database" role

### Option 5: Test with MongoDB Compass
1. Download MongoDB Compass
2. Use your connection string
3. Try to connect
4. If it fails, the issue is with MongoDB Atlas, not your code

## Common Issues & Solutions

### Issue: "ReplicaSetNoPrimary"
**Cause:** Cannot connect to MongoDB replica set
**Solutions:**
1. Check cluster is not paused
2. Verify network access (IP whitelist)
3. Increase connection timeout
4. Check MongoDB Atlas status

### Issue: "SSL routines error"
**Cause:** SSL/TLS handshake failing
**Solutions:**
1. Ensure `ssl=true` in connection string
2. Check SSL options in code (already fixed)
3. Verify MongoDB Atlas SSL certificate is valid

### Issue: "Authentication failed"
**Cause:** Wrong username/password or authSource
**Solutions:**
1. Verify credentials in MongoDB Atlas
2. Ensure `authSource=admin` is in connection string
3. Check for special characters in password (URL encode)

### Issue: "Connection timeout"
**Cause:** Cannot reach MongoDB servers
**Solutions:**
1. Check network/firewall
2. Verify IP is whitelisted
3. Increase timeout values
4. Check MongoDB Atlas cluster region

## Emergency Workaround (TEMPORARY ONLY)

If you need to get production working immediately while debugging:

### Option A: Use MongoDB Connection String with All Parameters
```env
MONGODB_URI=mongodb+srv://username:password@cluster.fr9zrj9.mongodb.net/?retryWrites=true&w=majority&ssl=true&authSource=admin&serverSelectionTimeoutMS=30000
```

### Option B: Temporarily Allow All IPs
MongoDB Atlas → Network Access → Add `0.0.0.0/0`

⚠️ **WARNING:** Remove this after fixing the issue!

## Monitoring

### Check Connection Health
Add to your code:
```typescript
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});
```

### Production Logs
Monitor for:
- Connection success messages
- SSL errors
- Timeout errors
- Authentication errors

## Success Checklist

After deployment, verify:
- ✅ MongoDB Atlas cluster is RUNNING
- ✅ IP address is whitelisted
- ✅ Connection string is correct
- ✅ Environment variables are set in production
- ✅ Login API works without errors
- ✅ No "ReplicaSetNoPrimary" in logs
- ✅ No SSL errors in logs
- ✅ Application functions normally

## Support

If none of these solutions work:
1. Check MongoDB Atlas status page
2. Contact MongoDB Atlas support
3. Verify your cluster tier and limits
4. Check for any billing/payment issues
5. Review MongoDB Atlas audit logs

---

**CRITICAL:** The main issue is likely:
1. MongoDB Atlas cluster is paused
2. IP not whitelisted
3. Connection timeout too short

**Fix these FIRST before deploying code changes!**
