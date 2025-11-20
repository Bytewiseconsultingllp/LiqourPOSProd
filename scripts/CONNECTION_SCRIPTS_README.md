# Connection Management Scripts

This directory contains utility scripts for managing and monitoring MongoDB connections.

## Scripts Overview

### check-connections.ps1
PowerShell script for monitoring MongoDB connection health.

**Usage:**
```powershell
# Check connection status
.\scripts\check-connections.ps1

# Trigger cleanup of idle connections
.\scripts\check-connections.ps1 -Action cleanup

# Log detailed connection info to server console
.\scripts\check-connections.ps1 -Action details

# Use custom base URL
.\scripts\check-connections.ps1 -BaseUrl http://localhost:3001

# Show help
.\scripts\check-connections.ps1 -Action help
```

**Output includes:**
- Total connection count
- Main database status
- Tenant database statistics
- Individual connection details (org ID, state, use count, idle time)
- Warnings (if any)
- Recent metrics

### test-connection-management.ts
TypeScript test script for verifying connection management functionality.

**Usage:**
```bash
# Run tests
npx ts-node scripts/test-connection-management.ts

# Or if ts-node is installed globally
ts-node scripts/test-connection-management.ts
```

**Tests include:**
1. Connection reuse verification
2. Multiple tenant connections
3. Connection statistics
4. Connection manager functionality
5. Idle connection detection
6. Main database connection
7. Connection pool settings

## Quick Start

### Monitor Connections During Development

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **In another terminal, check connections:**
   ```powershell
   .\scripts\check-connections.ps1
   ```

3. **Set up periodic monitoring:**
   ```powershell
   # Run every 30 seconds
   while ($true) {
     .\scripts\check-connections.ps1
     Start-Sleep -Seconds 30
   }
   ```

### Troubleshooting High Connection Count

```powershell
# 1. Check current status
.\scripts\check-connections.ps1

# 2. If connection count is high, trigger cleanup
.\scripts\check-connections.ps1 -Action cleanup

# 3. Check status again to verify
.\scripts\check-connections.ps1
```

## Tips

### Best Times to Check Connections
- After deployment
- During peak usage hours
- After running batch jobs
- Before scheduled maintenance

### What to Look For
- ✅ **Good:** 5-20 active connections
- ⚠️ **Warning:** 20-40 connections (monitor closely)
- 🚨 **Alert:** 40+ connections (investigate and cleanup)

### Common Issues

**Issue: Script can't connect to server**
```
Solution: Verify server is running
- Check if process is running
- Verify port number (default: 3000)
- Check firewall settings
```

**Issue: High idle times but connections not cleaned up**
```
Solution: Check cleanup is running
- Verify periodic cleanup is enabled
- Check logs for cleanup messages
- Manually trigger cleanup
```

## Related Documentation

- [CONNECTION_MANAGEMENT_GUIDE.md](../CONNECTION_MANAGEMENT_GUIDE.md) - Comprehensive guide
- [CONNECTION_FIX_SUMMARY.md](../CONNECTION_FIX_SUMMARY.md) - Implementation summary
