# PowerShell script to check MongoDB connection health
# Usage: .\scripts\check-connections.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

function Get-ConnectionStatus {
    Write-Host "`n📊 Fetching Connection Statistics..." -ForegroundColor Cyan
    Write-Host "====================================`n" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/health/connections" -Method Get
        
        if ($response.success) {
            Write-Host "✅ Connection Health Check Successful" -ForegroundColor Green
            Write-Host "`nTimestamp: $($response.timestamp)" -ForegroundColor Gray
            
            # Main stats
            Write-Host "`n📈 Overall Statistics:" -ForegroundColor Yellow
            Write-Host "   Total Connections: $($response.stats.totalConnections)" -ForegroundColor White
            Write-Host "   Main DB State: $($response.stats.mainDb.readyState) (1=connected)" -ForegroundColor White
            Write-Host "   Main DB Name: $($response.stats.mainDb.name)" -ForegroundColor White
            
            # Tenant DB stats
            Write-Host "`n🏢 Tenant Database Statistics:" -ForegroundColor Yellow
            Write-Host "   Active Connections: $($response.stats.tenantDbs.activeConnections)" -ForegroundColor White
            Write-Host "   Registered Models: $($response.stats.tenantDbs.registeredModels)" -ForegroundColor White
            Write-Host "   Max Connections: $($response.stats.tenantDbs.maxConnections)" -ForegroundColor White
            
            # Individual connections
            if ($response.stats.tenantDbs.connections.Count -gt 0) {
                Write-Host "`n🔗 Active Tenant Connections:" -ForegroundColor Yellow
                $index = 1
                foreach ($conn in $response.stats.tenantDbs.connections) {
                    Write-Host "   $index. $($conn.name)" -ForegroundColor White
                    Write-Host "      Org ID: $($conn.organizationId)" -ForegroundColor Gray
                    Write-Host "      State: $($conn.readyState) (1=connected)" -ForegroundColor Gray
                    Write-Host "      Use Count: $($conn.useCount)" -ForegroundColor Gray
                    Write-Host "      Idle Time: $($conn.idleTime)s" -ForegroundColor Gray
                    Write-Host "      Last Used: $($conn.lastUsed)" -ForegroundColor Gray
                    $index++
                }
            } else {
                Write-Host "`n   No active tenant connections" -ForegroundColor Gray
            }
            
            # Warnings
            if ($response.warnings -and $response.warnings.Count -gt 0) {
                Write-Host "`n⚠️  Warnings:" -ForegroundColor Red
                foreach ($warning in $response.warnings) {
                    Write-Host "   - $warning" -ForegroundColor Yellow
                }
            }
            
            # Recent metrics
            if ($response.recentMetrics -and $response.recentMetrics.Count -gt 0) {
                Write-Host "`n📉 Recent Metrics (last 10):" -ForegroundColor Yellow
                foreach ($metric in $response.recentMetrics) {
                    Write-Host "   $($metric.timestamp): $($metric.totalConnections) connections" -ForegroundColor Gray
                }
            }
            
        } else {
            Write-Host "❌ Failed to fetch connection stats" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error fetching connection status: $_" -ForegroundColor Red
        Write-Host "   Make sure the server is running at $BaseUrl" -ForegroundColor Yellow
    }
}

function Invoke-ConnectionCleanup {
    Write-Host "`n🧹 Triggering Connection Cleanup..." -ForegroundColor Cyan
    Write-Host "====================================`n" -ForegroundColor Cyan
    
    try {
        $body = @{
            action = "cleanup"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/health/connections" -Method Post -Body $body -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✅ Cleanup Successful" -ForegroundColor Green
            Write-Host "   $($response.message)" -ForegroundColor White
            Write-Host "   Cleaned: $($response.cleaned) connections" -ForegroundColor White
        } else {
            Write-Host "❌ Cleanup failed" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error during cleanup: $_" -ForegroundColor Red
    }
}

function Show-ConnectionDetails {
    Write-Host "`n📋 Logging Connection Details to Server Console..." -ForegroundColor Cyan
    Write-Host "====================================`n" -ForegroundColor Cyan
    
    try {
        $body = @{
            action = "details"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/health/connections" -Method Post -Body $body -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "✅ Details logged to server console" -ForegroundColor Green
            Write-Host "   Check your server logs for detailed output" -ForegroundColor White
        } else {
            Write-Host "❌ Failed to log details" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error logging details: $_" -ForegroundColor Red
    }
}

function Show-Help {
    Write-Host "`n🔧 MongoDB Connection Health Checker" -ForegroundColor Cyan
    Write-Host "====================================`n" -ForegroundColor Cyan
    
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "   .\scripts\check-connections.ps1 [-BaseUrl <url>] [-Action <action>]`n" -ForegroundColor White
    
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "   -BaseUrl   : Base URL of the application (default: http://localhost:3000)" -ForegroundColor White
    Write-Host "   -Action    : Action to perform (status, cleanup, details, help)" -ForegroundColor White
    
    Write-Host "`nActions:" -ForegroundColor Yellow
    Write-Host "   status   : Show current connection statistics (default)" -ForegroundColor White
    Write-Host "   cleanup  : Trigger cleanup of idle connections" -ForegroundColor White
    Write-Host "   details  : Log detailed connection info to server console" -ForegroundColor White
    Write-Host "   help     : Show this help message" -ForegroundColor White
    
    Write-Host "`nExamples:" -ForegroundColor Yellow
    Write-Host "   .\scripts\check-connections.ps1" -ForegroundColor Gray
    Write-Host "   .\scripts\check-connections.ps1 -Action cleanup" -ForegroundColor Gray
    Write-Host "   .\scripts\check-connections.ps1 -BaseUrl http://localhost:3001 -Action status" -ForegroundColor Gray
}

# Main execution
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MongoDB Connection Health Checker    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

switch ($Action.ToLower()) {
    "status" {
        Get-ConnectionStatus
    }
    "cleanup" {
        Invoke-ConnectionCleanup
        Write-Host ""
        Get-ConnectionStatus
    }
    "details" {
        Show-ConnectionDetails
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "❌ Unknown action: $Action" -ForegroundColor Red
        Show-Help
    }
}

Write-Host "`n====================================`n" -ForegroundColor Cyan
