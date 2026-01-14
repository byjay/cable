# ========================================
#  Auto Ping-Pong Review Loop
#  Antigravity <-> OpenCode
# ========================================

$ErrorActionPreference = "Stop"

# Task from parameter
$task = $args[0]
if (-not $task) {
    Write-Host "Usage: .\auto-review-loop.ps1 `"task description`"" -ForegroundColor Yellow
    exit 1
}

# 3-Agent trigger keywords
$trigger3Agent = @(
    "cross check", "cross-check", "crosscheck",
    "error review", "security review", "full review",
    "final review", "quality review", "code review"
)

# Check if task contains trigger keywords
$use3Agent = $false
foreach ($keyword in $trigger3Agent) {
    if ($task -match $keyword) {
        $use3Agent = $true
        break
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Auto Review Loop" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Task: $task`n" -ForegroundColor White

if ($use3Agent) {
    Write-Host "[MODE] 3-Agent Parallel (Keyword detected)`n" -ForegroundColor Magenta
    Write-Host "Triggering 3-Agent cross review...`n" -ForegroundColor Yellow
    
    # Execute 3-Agent parallel mode
    & python "$env:OPENCODE_HOME\smart_orchestrator.py" $task
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  3-Agent Review Complete" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    exit 0
}

Write-Host "[MODE] Standard Auto-Loop (Single -> 3-Agent)`n" -ForegroundColor Cyan

# Maximum rounds
$maxRounds = 3

for ($round = 1; $round -le $maxRounds; $round++) {
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "  Round $round / $maxRounds" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Yellow
    
    if ($round -lt 3) {
        # Round 1-2: Single agent review
        Write-Host "[Single Agent] Running OpenCode review...`n" -ForegroundColor Cyan
        
        # Execute single agent review
        & "$env:OPENCODE_HOME\collab_loop.ps1" $task
        
        if (-not (Test-Path "REVIEW_REPORT.md")) {
            Write-Host "`nNo review report generated. Skipping to next round.`n" -ForegroundColor Yellow
            continue
        }
        
        # Read review report
        $review = Get-Content "REVIEW_REPORT.md" -Raw -Encoding UTF8
        
        Write-Host "`n----------------------------------------" -ForegroundColor Gray
        Write-Host "[OpenCode Feedback]" -ForegroundColor Cyan
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Write-Host $review -ForegroundColor White
        Write-Host "----------------------------------------`n" -ForegroundColor Gray
        
        # Antigravity response simulation
        Write-Host "[Antigravity] Feedback received. Applying fixes...`n" -ForegroundColor Green
        
        # In real usage, Antigravity would read this output and apply fixes
        # For now, we just continue to next round
        
        Start-Sleep -Seconds 2
    }
    else {
        # Round 3: 3-Agent parallel cross review
        Write-Host "[3-Agent Parallel] Final cross review...`n" -ForegroundColor Magenta
        Write-Host "  Agent1: Backend/Security" -ForegroundColor Cyan
        Write-Host "  Agent2: Frontend/UX" -ForegroundColor Cyan
        Write-Host "  Agent3: Architecture/Integration`n" -ForegroundColor Cyan
        
        # Execute 3-Agent parallel mode
        & python "$env:OPENCODE_HOME\smart_orchestrator.py" "Final cross review: $task"
        
        if (Test-Path "CONSENSUS_RESULT.md") {
            $consensus = Get-Content "CONSENSUS_RESULT.md" -Raw -Encoding UTF8
            
            Write-Host "`n----------------------------------------" -ForegroundColor Gray
            Write-Host "[3-Agent Consensus]" -ForegroundColor Magenta
            Write-Host "----------------------------------------" -ForegroundColor Gray
            Write-Host $consensus -ForegroundColor White
            Write-Host "----------------------------------------`n" -ForegroundColor Gray
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Auto Review Loop Complete" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Total rounds: $maxRounds" -ForegroundColor White
Write-Host "  Single agent: 2 rounds" -ForegroundColor White
Write-Host "  3-Agent final: 1 round`n" -ForegroundColor White

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review REVIEW_REPORT.md" -ForegroundColor White
Write-Host "  2. Review CONSENSUS_RESULT.md" -ForegroundColor White
Write-Host "  3. Apply final improvements`n" -ForegroundColor White