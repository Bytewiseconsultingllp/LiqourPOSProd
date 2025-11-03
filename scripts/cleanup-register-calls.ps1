# PowerShell script to remove redundant registerAllModels() calls from API routes
# These calls are now redundant since getTenantConnection() handles registration automatically

Write-Host "Cleaning up redundant registerAllModels() calls..." -ForegroundColor Cyan
Write-Host ""

$apiPath = "app\api"
$filesProcessed = 0
$linesRemoved = 0

# Get all TypeScript files in the API directory
$files = Get-ChildItem -Path $apiPath -Filter "*.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove import statement for registerAllModels
    $content = $content -replace "import \{ ([^}]*?)registerAllModels([^}]*?) \} from '@/lib/model-registry';\r?\n", {
        param($match)
        $imports = $match.Groups[1].Value + $match.Groups[2].Value
        $imports = $imports -replace ',\s*,', ','
        $imports = $imports.Trim(', ')
        
        if ($imports) {
            "import { $imports } from '@/lib/model-registry';`n"
        } else {
            ""
        }
    }
    
    # Remove standalone registerAllModels import
    $content = $content -replace "import \{ registerAllModels \} from '@/lib/model-registry';\r?\n", ""
    
    # Remove registerAllModels() calls with surrounding comments
    $content = $content -replace "\s*// Register all models first\r?\n\s*registerAllModels\(\);\r?\n", ""
    $content = $content -replace "\s*registerAllModels\(\);\r?\n", ""
    
    # Clean up multiple blank lines
    $content = $content -replace "(\r?\n){3,}", "`n`n"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesProcessed++
        $changes = ($originalContent.Length - $content.Length)
        $linesRemoved += [Math]::Max(0, [Math]::Floor($changes / 50))
        Write-Host "  Cleaned: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Files processed: $filesProcessed" -ForegroundColor Yellow
Write-Host "Approximate lines removed: $linesRemoved" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cleanup complete! All redundant calls removed." -ForegroundColor Green
