# URGENT: Reduce 252 MongoDB Connections Now

## Current Situation
**252 active connections** = Excessive RAM usage on MongoDB server
- Each connection allocates a stack
- High connection count impacts performance
- Risk of reaching MongoDB Atlas connection limits

## Immediate Actions (Do Now)

### Step 1: Restart Application (Most Effective)
```bash
# Stop the application
# Windows (if running as service)
Stop-Service YourAppService

# Or if running in terminal
Ctrl+C

# Clear build cache
Remove-Item -Recurse -Force .next

# Rebuild
npm run build

# Start fresh
npm start
```

**Expected Result:** Connections drop to 5-15 immediately

---

### Step 2: Use New Monitoring Dashboard
1. Go to **Dashboard → System → Connections**
2. Check current connection count
3. Click **"Cleanup Idle"** button
4. Wait 30 seconds
5. Click **"Refresh"** to verify reduction

---

### Step 3: Check MongoDB Atlas Dashboard
1. Log into MongoDB Atlas
2. Go to your cluster
3. Navigate to **Metrics** tab
4. Check **Connections** graph
5. Should see drop after restart

---

## Why You Have 252 Connections

### Root Causes (Already Fixed in Code):
1. ✅ Production was creating new connections per request (FIXED)
2. ✅ No connection pooling enabled (FIXED)
3. ✅ No automatic cleanup (FIXED)
4. ✅ No connection limits enforced (FIXED)

### But Existing Connections Are Still Open:
- Old connections from before fixes
- These won't close automatically
- Need application restart to clear

---

## Connection Reduction Strategy

### Immediate (Right Now):
```bash
# 1. Restart application
pm2 restart your-app  # if using PM2
# OR
npm run build && npm start

# 2. Verify in new dashboard
# Navigate to: http://localhost:3000/dashboard/system/connections
# Expected: 5-15 connections
```

### Short-term (Next Hour):
1. Monitor the new dashboard every 5 minutes
2. Enable auto-refresh in dashboard
3. Watch for connection growth
4. Use cleanup button if count > 20

### Long-term (Ongoing):
1. Check dashboard daily
2. Set up alerts (MongoDB Atlas) for connections > 30
3. Investigate if count grows unexpectedly
4. Review application logs for connection errors

---

## Configuration Adjustments for Aggressive Cleanup

If you want even more aggressive connection management, update these settings:

### File: `lib/tenant-db.ts`

```typescript
// Line 18-19: More aggressive settings
const CONNECTION_IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes (was 5)
const MAX_TENANT_CONNECTIONS = 30; // 30 max (was 50)
```

### File: `lib/mongodb.ts`

```typescript
// Line 27-32: Reduce pool sizes
{
  maxPoolSize: 5,        // Reduce from 10
  minPoolSize: 1,        // Reduce from 2
  maxIdleTimeMS: 30000,  // 30 seconds (was 60)
  // ... other settings
}
```

### File: `lib/mongoose.ts`

```typescript
// Apply same reductions to all connection calls
maxPoolSize: 5,
minPoolSize: 1,
maxIdleTimeMS: 30000,
```

---

## Expected Connection Counts

### After Restart:
- **Immediately:** 1-5 connections
- **During use:** 5-15 connections
- **Peak traffic:** 15-25 connections
- **Maximum ever:** 30-40 connections

### Warning Signs:
- ⚠️ If count > 30: Investigate immediately
- 🚨 If count > 50: Urgent action needed
- 🔴 If count growing steadily: Connection leak

---

## Monitoring Commands

### Check from Command Line:
```bash
# If you have MongoDB shell access
mongo "mongodb+srv://your-cluster" --eval "db.serverStatus().connections"

# Output will show:
# {
#   "current" : 252,      # Current connections
#   "available" : 248,    # Available slots
#   "totalCreated" : 1234 # Total created since start
# }
```

### Check via Application:
```bash
# Hit the health endpoint
curl http://localhost:3000/api/health/connections | jq '.stats.totalConnections'
```

---

## Troubleshooting

### Issue: Connections Not Decreasing After Restart
**Possible Causes:**
1. Multiple instances running
2. Load balancer keeping old instances alive
3. Background jobs still using old connections

**Fix:**
```bash
# Check for multiple processes
Get-Process node

# Kill all node processes
Get-Process node | Stop-Process -Force

# Restart single instance
npm start
```

---

### Issue: Connections Growing Again
**Check:**
1. Is periodic cleanup running? (check logs)
2. Are connections being reused? (check dashboard table - use count should increase)
3. Any errors in application logs?

**Debug:**
```bash
# Enable connection debugging
# Add to .env
DEBUG_CONNECTIONS=true

# Check logs for:
# ✅ "Cleaned up X idle connections"
# ✅ "Reusing existing connection"
# ❌ "Creating new connection" (should be rare)
```

---

### Issue: Dashboard Shows High Idle Times
**Meaning:** Connections not being used but still open

**Fix:**
1. Click "Cleanup Idle" in dashboard
2. Wait 30 seconds
3. Check if count drops
4. If not, check cleanup is enabled:

```typescript
// In lib/tenant-db.ts
// Verify this line is NOT commented:
startPeriodicCleanup(interval);
```

---

## MongoDB Atlas Alerts Setup

To prevent future issues, set up alerts:

1. **Go to:** MongoDB Atlas → Your Cluster → Alerts
2. **Create Alert:**
   - Metric: Connections
   - Threshold: > 30
   - Action: Email notification

3. **Create Critical Alert:**
   - Metric: Connections
   - Threshold: > 50
   - Action: Email + SMS

---

## Performance Impact of 252 Connections

### RAM Usage:
- Each connection: ~1-2 MB stack
- 252 connections: **~250-500 MB RAM just for connections**
- Plus connection overhead: ~50-100 MB
- **Total waste: ~300-600 MB**

### Performance Impact:
- Slower query execution
- Higher latency
- Resource contention
- Risk of hitting connection limit (500 default)

### Cost Impact:
- Higher tier MongoDB Atlas needed
- More RAM required
- Potential for connection limit errors
- Customer experience degradation

---

## Success Criteria

### After Restart + 1 Hour:
- [ ] Connection count: 5-20
- [ ] No error logs about connections
- [ ] Dashboard shows healthy status
- [ ] Idle times under 5 minutes
- [ ] Use counts increasing (reuse working)

### After Restart + 24 Hours:
- [ ] Connection count stable
- [ ] No unexpected growth
- [ ] Periodic cleanup running
- [ ] MongoDB Atlas metrics normal
- [ ] Application performance improved

### After Restart + 1 Week:
- [ ] Connection count consistently low
- [ ] No manual intervention needed
- [ ] Automatic cleanup working
- [ ] No connection errors
- [ ] System running smoothly

---

## Quick Reference

### Normal Connection Counts:
```
Idle/Low Traffic:     5-10 connections
Normal Operations:    10-20 connections
Peak Hours:           20-30 connections
Maximum Allowed:      50 connections (configurable)
```

### Action Thresholds:
```
0-20:   🟢 Healthy - No action needed
21-30:  🟡 Monitor - Check dashboard regularly
31-40:  ⚠️  Warning - Investigate and cleanup
41+:    🔴 Critical - Immediate action required
```

### Cleanup Schedule:
```
Automatic:            Every 2-5 minutes
Idle Timeout:         5 minutes
Max Connections:      50 (enforced)
Manual:               Use dashboard button anytime
```

---

## Summary

**Your 252 connections issue is resolved in code, but old connections remain.**

**Immediate Action Required:**
1. ✅ Restart application
2. ✅ Verify count drops to 5-20
3. ✅ Monitor using new dashboard
4. ✅ Use cleanup button if needed

**All connection management fixes are in place:**
- ✅ Connection pooling enabled
- ✅ Automatic cleanup running
- ✅ Connection limits enforced
- ✅ Monitoring dashboard available

**Expected Result:**
- Connections drop from 252 to 5-20
- RAM usage reduced by 300-500 MB
- Performance improved
- No more connection limit issues

---

**Status:** 🚨 Action Required - Restart Application Now

Once restarted, monitor the new dashboard at:
**Dashboard → System → Connections**
