# Quick Start Guide - MongoDB Connection Fix

## ⚡ 5-Minute Quick Start

### 1. Test Locally (2 minutes)
```bash
# Start your application
npm run dev

# In another terminal, check connections
# Option A: Using PowerShell script
.\scripts\check-connections.ps1

# Option B: Using API directly
curl http://localhost:3000/api/health/connections
```

**Expected Output:**
- Total connections: 1-5 (low traffic)
- All connection states should be 1 (connected)
- No warnings

### 2. Run Tests (1 minute)
```bash
npx ts-node scripts/test-connection-management.ts
```

**Expected Output:**
- All tests should pass (✅)
- Connection reuse verified
- Statistics working

### 3. Monitor During Use (2 minutes)
```bash
# Make some API calls (login, fetch data, etc.)
# Then check connections again
.\scripts\check-connections.ps1

# You should see:
# - Use count increased
# - Same connections reused (not creating new ones)
# - Connection count stays low
```

---

## 🎯 What Was Fixed

### Problem
```
❌ MongoDB connection limit reached
❌ "Too many connections" errors
❌ Slow API performance
❌ Connection count: 50-200+
```

### Solution
```
✅ Connection pooling enabled
✅ Automatic connection reuse
✅ Idle connection cleanup
✅ Connection count: 5-20
```

---

## 📊 How to Monitor

### Quick Check
```bash
curl http://localhost:3000/api/health/connections | jq '.stats.totalConnections'
```

### Detailed Check
```powershell
.\scripts\check-connections.ps1
```

### Continuous Monitoring
```powershell
while ($true) {
  .\scripts\check-connections.ps1
  Start-Sleep -Seconds 30
}
```

---

## 🔧 Key Settings

All settings are configured automatically. Default values:

```typescript
maxPoolSize: 10              // Max connections per database
minPoolSize: 2               // Min connections to maintain
maxIdleTimeMS: 60000         // Close after 60s idle
CONNECTION_IDLE_TIMEOUT: 5min // Cleanup after 5 min
MAX_TENANT_CONNECTIONS: 50   // Maximum tenant DBs
```

---

## ✅ Success Checklist

- [ ] Application starts without errors
- [ ] `/api/health/connections` endpoint works
- [ ] Connection count is low (< 20)
- [ ] API routes work correctly
- [ ] Connections are being reused (check logs)
- [ ] No "too many connections" errors

---

## 🚨 If Something Goes Wrong

### Issue: High connection count (> 30)
```bash
# Trigger manual cleanup
curl -X POST http://localhost:3000/api/health/connections \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup"}'
```

### Issue: API not responding
```bash
# Check logs for errors
npm run dev

# Rebuild if needed
rm -rf .next
npm run build
npm run dev
```

### Issue: "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## 📚 Full Documentation

For detailed information, see:

1. **MONGODB_CONNECTION_FIX_COMPLETE.md** - Full overview
2. **CONNECTION_MANAGEMENT_GUIDE.md** - Technical details
3. **IMPLEMENTATION_CHECKLIST.md** - Deployment guide
4. **CONNECTION_FIX_SUMMARY.md** - Quick reference

---

## 🎉 That's It!

Your MongoDB connection management is now optimized!

**What happens automatically:**
- ✅ Connections are pooled and reused
- ✅ Idle connections cleaned up every 2-5 minutes
- ✅ Connection limits enforced
- ✅ Monitoring available via API

**What you need to do:**
- 👀 Monitor occasionally (especially after deployment)
- 📊 Check `/api/health/connections` if issues occur
- 🧹 Trigger manual cleanup if connection count is high

---

## 💡 Pro Tips

1. **Bookmark this endpoint:** `http://localhost:3000/api/health/connections`
2. **Check logs regularly:** Look for connection-related messages
3. **Set up alerts:** If connection count > 30, investigate
4. **Test thoroughly:** Before deploying to production

---

## 🆘 Need Help?

1. Check logs: `npm run dev`
2. Run health check: `.\scripts\check-connections.ps1`
3. Review documentation in this folder
4. Look for error messages in console

---

**Status:** ✅ Ready to Use
**Last Updated:** November 20, 2025
