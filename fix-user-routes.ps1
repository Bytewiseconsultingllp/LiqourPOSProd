# PowerShell script to fix user routes
Write-Host "Fixing user routes..." -ForegroundColor Green

# Navigate to the correct directory
$idDir = "app\api\users\[id]"

# Check if dual-db file exists
if (Test-Path "$idDir\route.dual-db.ts") {
    Write-Host "Found dual-db file, replacing route.ts..." -ForegroundColor Yellow
    
    # Remove old route.ts
    if (Test-Path "$idDir\route.ts") {
        Remove-Item "$idDir\route.ts" -Force
        Write-Host "Removed old route.ts" -ForegroundColor Gray
    }
    
    # Copy dual-db to route.ts
    Copy-Item "$idDir\route.dual-db.ts" "$idDir\route.ts" -Force
    Write-Host "✅ Successfully replaced route.ts with dual-database version" -ForegroundColor Green
} else {
    Write-Host "❌ dual-db file not found!" -ForegroundColor Red
}

Write-Host "`nDone! Restart your dev server." -ForegroundColor Cyan
