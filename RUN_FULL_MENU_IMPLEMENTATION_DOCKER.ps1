# Docker 6-10 Full Menu Implementation Orchestrator

$ErrorActionPreference = "Continue"
$RootHost = "F:\genmini\CABLE MANEGE1\seastar-cable-manager"
$LogDir = Join-Path $RootHost "implementation_logs\docker_6-10"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

Write-Host "Starting Parallel Menu Implementation on Docker Agents 6-10..." -ForegroundColor Cyan

# Define Prompts for each Agent
$prompts = @{
    "agent6"  = "Refactor `services/excelService.ts` to implement robust parsing for Cables, Nodes, and CableTypes (detectType, mapRawToCable, etc). Ensure `App.tsx` data loading uses this robust service. Handle large dataset exports efficiently. Focus ONLY on data logic."
    "agent7"  = "Create or update `components/InstallationStatusView.tsx` to display real-time project metrics (Total Routed, Progress). Enhance `components/TrayAnalysis.tsx` with visual fill-ratio bars. Use Glassmorphism UI styles (backdrop-blur, translucent panels)."
    "agent8"  = "Update `components/CableRequirementReport.tsx` to implement POS Logic: Calculate Total Length, Total Weight, and Drum Count per Cable Type. Update `components/CableList.tsx` to add robust filtering for 'Unrouted' and 'Missing Length' items."
    "agent9"  = "Implement `components/DrumScheduleReport.tsx` with an algorithm to assign cables to drums minimizing waste. Implement `components/TrayFill.tsx` with logic to simulate cable stacking in trays. Verify `components/WDExtractionView.tsx`."
    "agent10" = "Refine `components/admin/CableUserManagement.tsx` and `services/AuthService.ts` to enforce strict Role-Based Access Control (RBAC). Verify that ordinary users cannot access Admin menus. Audit the `Master Data` editing safety."
}

$jobs = @()

foreach ($msg in $prompts.GetEnumerator()) {
    $agentName = $msg.Key
    $promptText = $msg.Value
    
    $scriptBlock = {
        param($name, $prompt, $logDir)
        $logFile = Join-Path $logDir "${name}_Impl_Log.txt"
        "[$name] Starting Implementation Task" | Out-File $logFile
        "Prompt: $prompt" | Out-File $logFile -Append
        
        try {
            # Execute opencode run
            # We use 'sh -c' to wrap the command
            "Running OpenCode..." | Out-File $logFile -Append
            # Escape inner quotes for PowerShell string and sh command. using Gemini 3 Pro as fallback.
            $cmd = "opencode run -m google/gemini-3-pro-preview ""$prompt"""
            $output = docker exec -w /target $name sh -c $cmd 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                "✅ SUCCESS: OpenCode Task Completed" | Out-File $logFile -Append
                $output | Out-File $logFile -Append
            }
            else {
                "❌ FAIL: OpenCode Task Failed (Exit Code: $LASTEXITCODE)" | Out-File $logFile -Append
                $output | Out-File $logFile -Append
            }
        }
        catch {
            "❌ ERROR: Execution Exception" | Out-File $logFile -Append
            $_.Exception.Message | Out-File $logFile -Append
        }
        "[$name] Finished" | Out-File $logFile -Append
    }

    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $agentName, $promptText, $LogDir
    Write-Host "Launched $agentName implementation task..." -ForegroundColor Green
}

Write-Host "All agent implementation tasks launched. Waiting for completion..."
Wait-Job $jobs | Out-Null
Write-Host "All implementation tasks completed. Checking logs..." -ForegroundColor Cyan

Get-ChildItem $LogDir -Filter "*_Impl_Log.txt" | ForEach-Object {
    $content = Get-Content $_.FullName
    if ($content -match "FAIL") {
        Write-Host "[-] $($_.Name): ISSUES FOUND" -ForegroundColor Red
    }
    else {
        Write-Host "[+] $($_.Name): COMPLETED" -ForegroundColor Green
    }
}
