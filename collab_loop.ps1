# ========================================
#  Smart Code Review Loop
#  Auto Model & Account Rotation
# ========================================

param(
    [string]$Prompt = "Review the code changes and provide improvement suggestions in REVIEW_REPORT.md",
    [string]$Model = "anthropic/claude-4.5-sonnet"
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PROJECT_ROOT

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  Smart Code Review System" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Load smart rotation system
if (-not (Test-Path ".\smart-rotate.ps1")) {
    Write-Host "[ERROR] smart-rotate.ps1 not found!" -ForegroundColor Red
    Write-Host "Please create smart-rotate.ps1 first." -ForegroundColor Yellow
    exit 1
}

# Get current account and model
Write-Host "`n[STEP 1] Getting current account..." -ForegroundColor Yellow
$rotateScript = ".\smart-rotate.ps1"
$statusOutput = & $rotateScript status

# Extract current info
if ($Model) {
    $currentModel = $Model
}
else {
    $statusOutput = & $rotateScript status
    $currentModel = ($statusOutput | Select-String "Current Model:").Line -replace "Current Model:\s*", ""
}
$currentAccount = ($statusOutput | Select-String "Current Account:").Line -replace "Current Account:\s*", ""

Write-Host "Account: $currentAccount" -ForegroundColor Green
Write-Host "Model: $currentModel" -ForegroundColor Green

# Execute review with smart rotation
$maxRetries = 3
$retryCount = 0
$success = $false

Write-Host "`n[STEP 2] Executing OpenCode review..." -ForegroundColor Yellow

while (-not $success -and $retryCount -lt $maxRetries) {
    try {
        # Execute OpenCode with current model
        Write-Host "`n[EXECUTING] Running review with model: $currentModel" -ForegroundColor Cyan
        
        # 스킬 사용을 강제하는 프롬프트 강화
        $enhancedPrompt = "[SKILLS: ALWAYS USE ALL AVAILABLE SKILLS] $Prompt"
        
        $output = opencode run --model $currentModel --prompt $enhancedPrompt 2>&1
        
        # Check for rate limit
        if ($output -match "rate limit|quota exceeded|429|too many requests") {
            Write-Host "[RATE LIMIT] Detected on current model" -ForegroundColor Yellow
            
            # Use ag rotate (opencode-infinite integration)
            Write-Host "[ROTATING] Using ag rotate..." -ForegroundColor Cyan
            $agCommand = Get-Command "ag" -ErrorAction SilentlyContinue
            if ($agCommand) {
                ag rotate
                Write-Host "✓ Account rotated successfully" -ForegroundColor Green
                Start-Sleep -Seconds 3
            }
            else {
                Write-Host "[WARNING] 'ag' command not found. Using fallback..." -ForegroundColor Yellow
                & $rotateScript rotate-account
                Start-Sleep -Seconds 3
            }
        }
        else {
            $success = $true
        }
        
        $retryCount++
        
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "[RETRY] Attempt $retryCount/$maxRetries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
}

if (-not $success) {
    Write-Host "`n[FAILED] Review failed after $maxRetries attempts" -ForegroundColor Red
    exit 1
}

# Check for review report
Write-Host "`n[STEP 3] Checking for REVIEW_REPORT.md..." -ForegroundColor Yellow

if (Test-Path "REVIEW_REPORT.md") {
    Write-Host "`n==================================" -ForegroundColor Green
    Write-Host "  Review Report Generated" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    
    # Display report content
    Get-Content "REVIEW_REPORT.md" | Write-Host
    
    Write-Host "`n[SUCCESS] Review completed!" -ForegroundColor Green
    Write-Host "Report saved to: REVIEW_REPORT.md" -ForegroundColor Cyan
}
else {
    Write-Host "`n[WARNING] REVIEW_REPORT.md not found" -ForegroundColor Yellow
    Write-Host "Review output:" -ForegroundColor Cyan
    Write-Host $output
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  Review Complete" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan