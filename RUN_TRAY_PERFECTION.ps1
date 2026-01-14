
# RUN_TRAY_PERFECTION.ps1
$ErrorActionPreference = 'Stop'
$Root = "F:\genmini\CABLE MANEGE1\seastar-cable-manager"
$ReportDir = "$Root\test_reports\tray_perfection"

if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force }

function Run-Verification {
    param($Name, $Script)
    Write-Host "?? [Agent $Name] Analyzing..." -ForegroundColor Cyan
    $cmd = "npx tsx scripts/$Script"
    $output = Invoke-Expression "cmd /c $cmd 2>&1"
    
    $output | Out-File "$ReportDir\Agent_${Name}_Log.txt"
    
    if ($output -match "SUCCESS") {
        Write-Host "  ? PASSED" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "  ? FAILED" -ForegroundColor Red
        $output | Write-Host
        return $false
    }
}

Write-Host "=== TRAY LOGIC PERFECTION PROTOCOL ===" -ForegroundColor Yellow

$p1 = Run-Verification "Physics" "verify_tray_physics.ts"
$p2 = Run-Verification "Compliance" "verify_tray_compliance.ts"
$p3 = Run-Verification "Geometry" "verify_tray_geometry.ts"

if ($p1 -and $p2 -and $p3) {
    Write-Host "`n? ALL AGENTS CONFIRM: LOGIC IS PERFECT." -ForegroundColor Green
}
else {
    Write-Host "`n? LOGIC FLAWS DETECTED. REPEATING LOOP." -ForegroundColor Red
}
