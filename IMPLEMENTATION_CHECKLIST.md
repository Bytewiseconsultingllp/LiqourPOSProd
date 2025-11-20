# MongoDB Connection Management - Implementation Checklist

## ✅ Changes Summary

### Files Modified (4)
- [x] `lib/mongodb.ts` - Fixed production connection reuse, added pooling
- [x] `lib/mongoose.ts` - Enabled pool settings, added maxIdleTimeMS
- [x] `lib/tenant-db.ts` - Added connection tracking, auto-cleanup, limits
- [x] `lib/connection-manager.ts` - NEW: Monitoring and management utility

### Files Created (7)
- [x] `lib/connection-manager.ts` - Connection monitoring utility
- [x] `app/api/health/connections/route.ts` - Health check API endpoint
- [x] `CONNECTION_MANAGEMENT_GUIDE.md` - Comprehensive documentation
- [x] `CONNECTION_FIX_SUMMARY.md` - Quick reference summary
- [x] `scripts/test-connection-management.ts` - Test suite
- [x] `scripts/check-connections.ps1` - PowerShell monitoring script
- [x] `scripts/CONNECTION_SCRIPTS_README.md` - Scripts documentation

## 🔍 Pre-Deployment Checklist

### Testing
- [ ] Run the application locally: `npm run dev`
- [ ] Test the health endpoint: `GET http://localhost:3000/api/health/connections`
- [ ] Run test suite: `npx ts-node scripts/test-connection-management.ts`
- [ ] Monitor connections: `.\scripts\check-connections.ps1`
- [ ] Test API routes work correctly (login, customers, products, etc.)
- [ ] Verify connections are being reused (check logs for "Tenant database connected")
- [ ] Confirm idle cleanup works (wait 5+ minutes, check connection count)

### Code Review
- [ ] Review changes in `lib/mongodb.ts`
- [ ] Review changes in `lib/mongoose.ts`
- [ ] Review changes in `lib/tenant-db.ts`
- [ ] Verify no breaking changes to existing APIs
- [ ] Check error handling is proper
- [ ] Ensure TypeScript compilation succeeds: `npm run build`

### Configuration
- [ ] Verify `MONGODB_URI` environment variable is set
- [ ] Check MongoDB Atlas connection string format
- [ ] Confirm pool settings are appropriate for your workload
- [ ] Adjust `MAX_TENANT_CONNECTIONS` if needed (default: 50)
- [ ] Adjust `CONNECTION_IDLE_TIMEOUT` if needed (default: 5 minutes)

### Documentation
- [ ] Read `CONNECTION_MANAGEMENT_GUIDE.md`
- [ ] Read `CONNECTION_FIX_SUMMARY.md`
- [ ] Understand the monitoring scripts
- [ ] Share documentation with team

## 🚀 Deployment Steps

### 1. Backup
```bash
# Backup current code
git stash
# Or create a branch
git checkout -b backup-before-connection-fix
```

### 2. Deploy to Staging
```bash
# Build the application
npm run build

# Deploy to staging environment
# (Use your deployment process)

# Monitor logs
tail -f logs/application.log | grep "connection"
```

### 3. Staging Verification
- [ ] Check health endpoint works: `GET https://staging.yourdomain.com/api/health/connections`
- [ ] Monitor connection count for 30 minutes
- [ ] Test all critical user flows
- [ ] Check for errors in logs
- [ ] Verify connection count stays under 20
- [ ] Test cleanup is triggered (look for log messages)

### 4. Production Deployment
```bash
# Build for production
npm run build

# Deploy to production
# (Use your deployment process)
```

### 5. Post-Deployment Monitoring
- [ ] Monitor connection count every 5 minutes for first hour
- [ ] Check `/api/health/connections` endpoint
- [ ] Review application logs for errors
- [ ] Monitor MongoDB Atlas connection metrics
- [ ] Verify no increase in error rates
- [ ] Check response times are improved

## 📊 Success Metrics

### Before Fix (Expected Issues)
- ❌ 50-200+ active connections
- ❌ Frequent "too many connections" errors
- ❌ Slow API response times (200-500ms)
- ❌ MongoDB connection limit reached
- ❌ No visibility into connection usage

### After Fix (Expected Results)
- ✅ 5-20 active connections
- ✅ No connection limit errors
- ✅ Faster API response times (50-150ms)
- ✅ Connection count stays stable
- ✅ Full monitoring capability

### Key Metrics to Track
| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Active Connections | 50-200+ | 5-20 | ___ |
| Connection Errors | 5-10% | <0.1% | ___ |
| API Response Time | 200-500ms | 50-150ms | ___ |
| Idle Connections | Not tracked | 0 (auto-cleanup) | ___ |

## 🔧 Rollback Plan

If issues occur, follow these steps:

### Quick Fix (Increase Limits)
```typescript
// In lib/tenant-db.ts
const MAX_TENANT_CONNECTIONS = 100; // Increase temporarily
const CONNECTION_IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
```

### Disable Auto-Cleanup
```typescript
// In lib/tenant-db.ts
// Comment out:
// startPeriodicCleanup(interval);
```

### Full Rollback
```bash
# Revert all changes
git revert <commit-hash>

# Or restore from backup
git checkout backup-before-connection-fix

# Rebuild and redeploy
npm run build
```

## 🐛 Troubleshooting

### Issue: Connections still growing
**Check:**
- [ ] Are you using `getTenantConnection()` correctly?
- [ ] Is periodic cleanup running? (check logs)
- [ ] Are there errors preventing cleanup?
- [ ] Is `organizationId` consistent across requests?

**Fix:**
```powershell
# Trigger manual cleanup
.\scripts\check-connections.ps1 -Action cleanup
```

### Issue: API routes failing
**Check:**
- [ ] Are models registered correctly?
- [ ] Is MongoDB URI correct?
- [ ] Check error logs for specific errors
- [ ] Verify TypeScript compilation succeeded

**Fix:**
```bash
# Check logs
npm run dev
# Look for error messages in console
```

### Issue: Health endpoint not working
**Check:**
- [ ] Is the route file created correctly?
- [ ] Is the import path correct?
- [ ] Check Next.js build output

**Fix:**
```bash
# Rebuild
rm -rf .next
npm run build
npm run dev
```

## 📞 Support

### Log Files to Check
1. Application console output
2. MongoDB Atlas logs
3. Next.js build logs
4. Browser console (for client-side errors)

### Information to Gather
- Connection statistics from `/api/health/connections`
- Recent log messages (last 100 lines)
- MongoDB Atlas metrics
- Current configuration values

### Commands to Run
```bash
# Check current connections
curl http://localhost:3000/api/health/connections

# Check logs
npm run dev 2>&1 | grep "connection"

# Run tests
npx ts-node scripts/test-connection-management.ts
```

## ✅ Final Checks

Before marking as complete:
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Team briefed on changes
- [ ] Monitoring in place
- [ ] Rollback plan ready
- [ ] Connection count verified (<20)
- [ ] No errors in logs
- [ ] API performance improved
- [ ] Production deployment successful
- [ ] 24-hour monitoring completed

## 📝 Notes

**Date Implemented:** ___________
**Deployed By:** ___________
**Issues Encountered:** ___________
**Resolution Time:** ___________
**Final Connection Count:** ___________

---

**Status:** 🟢 Ready for Deployment
**Priority:** 🔴 Critical (Fixes production issue)
**Impact:** High (Resolves MongoDB connection limits)
