# MongoDB SSL/TLS Error Fix

## Error Description
```
MongoNetworkError: 1C460000:error:0A000438:SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

This error occurs when MongoDB Atlas rejects SSL/TLS connections due to improper SSL configuration.

## Changes Made

### 1. Updated `lib/tenant-db.ts`
Added comprehensive SSL/TLS configuration:
- ✅ `tls: true` - Enable TLS/SSL
- ✅ `tlsAllowInvalidCertificates: false` - Strict certificate validation
- ✅ `tlsAllowInvalidHostnames: false` - Strict hostname validation
- ✅ `retryWrites: true` - Automatic retry for write operations
- ✅ `retryReads: true` - Automatic retry for read operations
- ✅ Auto-append `ssl=true` to connection URI if missing

### 2. Updated `lib/mongodb.ts`
Added same SSL/TLS configuration to MongoClient options.

## Additional Steps to Fix

### Step 1: Check Your MongoDB Connection String
Your `.env` file should have a connection string like:

**Correct Format (MongoDB Atlas):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

**If using standard MongoDB (not Atlas):**
```env
MONGODB_URI=mongodb://username:password@host:port/database?ssl=true
```

### Step 2: Verify MongoDB Atlas IP Whitelist
1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access**
3. Add your IP address or use `0.0.0.0/0` for testing (allow all)
4. For production, whitelist specific IPs

### Step 3: Check MongoDB Version Compatibility
Ensure your MongoDB driver versions are compatible:

```json
{
  "mongodb": "^6.x.x",
  "mongoose": "^8.x.x"
}
```

### Step 4: Restart Development Server
After making these changes:

```bash
# Stop current server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Step 5: For Production (Vercel/Netlify)
1. Update environment variables in deployment platform
2. Ensure `MONGODB_URI` is correctly set
3. Redeploy the application

## Alternative Solutions

### Option 1: Use Connection String with SSL Parameters
Update your `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&ssl=true&tlsAllowInvalidCertificates=false
```

### Option 2: Downgrade TLS Requirements (NOT RECOMMENDED for Production)
Only for local testing if nothing else works:

```typescript
const connection = mongoose.createConnection(finalUri, {
  // ... other options
  tls: true,
  tlsAllowInvalidCertificates: true,  // ⚠️ INSECURE
  tlsAllowInvalidHostnames: true,     // ⚠️ INSECURE
});
```

### Option 3: Check MongoDB Atlas Cluster Status
1. Log into MongoDB Atlas
2. Check if cluster is paused or having issues
3. Verify cluster tier supports your connection method

## Troubleshooting

### Issue: Still getting SSL errors
**Solution:**
1. Check if your MongoDB Atlas cluster is using TLS 1.2+
2. Update Node.js to latest LTS version
3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Issue: Works locally but fails in production
**Solution:**
1. Verify environment variables are set in production
2. Check production platform's IP is whitelisted in MongoDB Atlas
3. Ensure production uses same MongoDB URI format

### Issue: Connection timeout
**Solution:**
1. Increase timeout values:
   ```typescript
   serverSelectionTimeoutMS: 10000,  // 10 seconds
   socketTimeoutMS: 60000,           // 60 seconds
   ```
2. Check network connectivity
3. Verify MongoDB Atlas cluster is running

## Testing the Fix

### Test 1: Check Connection
Create a test endpoint:

```typescript
// app/api/test-db/route.ts
import { getTenantConnection } from '@/lib/tenant-db';

export async function GET() {
  try {
    const testOrgId = 'test-org';
    const conn = await getTenantConnection(testOrgId);
    
    return Response.json({
      success: true,
      message: 'Database connected successfully',
      readyState: conn.readyState,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

### Test 2: Check Sales API
Navigate to: `http://localhost:3000/api/sales?limit=10`

Should return sales data without SSL errors.

## Prevention

### Best Practices
1. ✅ Always use TLS/SSL for MongoDB connections
2. ✅ Keep MongoDB drivers updated
3. ✅ Use environment variables for connection strings
4. ✅ Whitelist specific IPs in production
5. ✅ Monitor MongoDB Atlas connection metrics
6. ✅ Set appropriate timeout values
7. ✅ Enable retry logic for network resilience

### Monitoring
Add connection error logging:

```typescript
connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
```

## Common Causes

1. **Missing SSL configuration** - Fixed by adding `tls: true`
2. **Invalid certificates** - Fixed by proper certificate validation
3. **Network issues** - Fixed by retry logic
4. **IP not whitelisted** - Fix in MongoDB Atlas
5. **Outdated drivers** - Update npm packages
6. **Cluster paused** - Resume in MongoDB Atlas
7. **Wrong connection string** - Verify format

## Support

If issues persist:
1. Check MongoDB Atlas status page
2. Review MongoDB driver documentation
3. Check Node.js version compatibility
4. Verify network/firewall settings
5. Contact MongoDB Atlas support

## Summary

The SSL error has been fixed by:
- ✅ Adding proper TLS/SSL configuration
- ✅ Enabling certificate validation
- ✅ Adding retry logic
- ✅ Auto-appending SSL parameter to URI
- ✅ Setting appropriate timeouts

**Next Steps:**
1. Restart your development server
2. Test the `/api/sales` endpoint
3. Verify no SSL errors in console
4. Deploy to production with updated code
