# Docker 6-10 Verification Orchestrator

$ErrorActionPreference = "Continue"
$RootHost = "F:\genmini\CABLE MANEGE1\seastar-cable-manager"
$ReportDir = Join-Path $RootHost "test_reports\docker_6-10"

if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null }

Write-Host "Starting Parallel Verification on Docker Agents 6-10..." -ForegroundColor Cyan

$agentTasks = @(
    @{ Name = "agent6"; Role = "Leader"; Cmds = @("python3 /target/scripts/verify_project_health.py", "npx tsx /target/scripts/agent_consensus.ts") },
    @{ Name = "agent7"; Role = "Designer"; Cmds = @("npx tsx /target/scripts/verify_3d_state.ts", "npx tsx /target/scripts/verify_ui_style.ts") },
    @{ Name = "agent8"; Role = "Engineer"; Cmds = @("npx tsx /target/scripts/verify_routing_logic.ts", "npx tsx /target/scripts/verify_physics_cog.ts", "npx tsx /target/scripts/verify_gravity.ts", "npx tsx /target/scripts/verify_solver.ts") },
    @{ Name = "agent9"; Role = "Speed"; Cmds = @("npx tsx /target/scripts/verify_build_size.ts", "npx tsx /target/scripts/verify_kpi_accuracy.ts") },
    @{ Name = "agent10"; Role = "QA"; Cmds = @("npx tsx /target/scripts/agent_compliance.ts", "npx tsx /target/scripts/agent_stress.ts") }
)

$jobs = @()

foreach ($task in $agentTasks) {
    $scriptBlock = {
        param($name, $role, $cmds, $reportDir)
        $logFile = Join-Path $reportDir "${name}_${role}_Log.txt"
        "[$name] Role: $role - Start" | Out-File $logFile
        
        foreach ($cmd in $cmds) {
            "Running: $cmd" | Out-File $logFile -Append
            try {
                # Run command inside docker container
                # We assume the container is named exactly as $name (agent6, etc.)
                # Working directory /target is mounted to project root
                $output = docker exec -w /target $name sh -c "$cmd" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    "✅ PASS: $cmd" | Out-File $logFile -Append
                    $output | Out-File $logFile -Append
                }
                else {
                    "❌ FAIL: $cmd (Exit Code: $LASTEXITCODE)" | Out-File $logFile -Append
                    $output | Out-File $logFile -Append
                }
            }
            catch {
                "❌ ERROR: Execution failed for $cmd" | Out-File $logFile -Append
                $_.Exception.Message | Out-File $logFile -Append
            }
            "--------------------------------" | Out-File $logFile -Append
        }
        "[$name] Complete" | Out-File $logFile -Append
    }

    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $task.Name, $task.Role, $task.Cmds, $ReportDir
    Write-Host "Launched $($task.Name) ($($task.Role))" -ForegroundColor Green
}

Write-Host "All agents running. Waiting for completion..."
Wait-Job $jobs | Out-Null
Write-Host "All jobs completed. Checking reports..." -ForegroundColor Cyan

Get-ChildItem $ReportDir -Filter "*_Log.txt" | ForEach-Object {
    $content = Get-Content $_.FullName
    if ($content -match "FAIL") {
        Write-Host "[-] $($_.Name): ISSUES FOUND" -ForegroundColor Red
    }
    else {
        Write-Host "[+] $($_.Name): ALL PASS" -ForegroundColor Green
    }
}
