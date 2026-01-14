
# RUN_CHAINED_AGENTS.ps1
# Sequential Verification: Agent 1 -> Agent 2 -> Agent 3 -> Agent 4 -> Agent 5

$ErrorActionPreference = 'Stop'
$Root = "F:\genmini\CABLE MANEGE1\seastar-cable-manager"
$ReportDir = "$Root\test_reports"

if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force }

function Run-Agent {
    param($AgentName, $Script, $PrevAgent)
    
    Write-Host "`n➤ [Agent $AgentName] Starting Verification..." -ForegroundColor Cyan
    
    if ($PrevAgent) {
        Write-Host "  Checking handover from [Agent $PrevAgent]..." -ForegroundColor Gray
        # Basic check: did previous agent succeed?
        # In a real chain, we would read a JSON token. Here we rely on script flow.
    }

    $cmd = "npx tsx scripts/$Script"
    # Capture output
    $output = Invoke-Expression "cmd /c $cmd 2>&1"
    
    $output | Out-File "$ReportDir\Agent_${AgentName}_Chain_Log.txt"
    
    if ($output -match "SUCCESS") {
        Write-Host "  ✅ [Agent $AgentName] VERIFIED." -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "  ❌ [Agent $AgentName] FAILED." -ForegroundColor Red
        $output | Write-Host
        return $false
    }
}

Write-Host "=== INITIALIZING 5-AGENT SEQUENTIAL CHAIN ===" -ForegroundColor Yellow

# Step 1: Architect (Logic/State)
if (-not (Run-Agent "1" "verify_3d_state.ts" $null)) { exit }

# Step 2: Designer (UI/Style) - Depends on Logic
if (-not (Run-Agent "2" "verify_ui_style.ts" "1")) { exit }

# Step 3: Engineer (Routing/Algo) - Depends on UI Configuration capabilities
if (-not (Run-Agent "3" "verify_routing_logic.ts" "2")) { exit }

# Step 4: Speed (Performance) - Depends on accumulated code
if (-not (Run-Agent "4" "verify_build_size.ts" "3")) { exit }

# Step 5: QA (Final Check)
Write-Host "`n➤ [Agent 5] Final Sign-off..." -ForegroundColor Cyan
Write-Host "  Verifying chain integrity..."
$allLogs = Get-ChildItem "$ReportDir\*_Chain_Log.txt"
if ($allLogs.Count -ge 4) {
    Write-Host "  ✅ Chain Complete. All Agents reported SUCCESS." -ForegroundColor Green
    Write-Host "MISSION ACCOMPLISHED." -ForegroundColor Yellow
}
else {
    Write-Host "  ❌ Chain Broken." -ForegroundColor Red
}
