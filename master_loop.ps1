# ========================================
#  Master Orchestration Loop (v3)
#  Pre-flight -> Rotate -> Execute -> Synthesis
# ========================================

param(
    [Parameter(Mandatory = $true)]
    [string]$Task
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = "C:\Users\FREE\CascadeProjects\opencode-collab"
Set-Location $PROJECT_ROOT

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "  MASTER ORCHESTRATION LOOP V3" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

# Step 1: Pre-flight Verification (Identity & Skills) - MANDATORY
Write-Host "[STEP 1] Pre-flight Verification (Identity & Skills)..." -ForegroundColor Yellow

function Verify-OpenIdentity {
    $check = opencode run "Identify: Reply with exactly 'MODEL:[model_id] SKILLS:[count]'. Check your current model and count loaded skills." 2>&1
    Write-Host "  [DEBUG] Identity Check: $check" -ForegroundColor Gray
    
    if ($check -match "MODEL:" -and $check -match "SKILLS:") {
        Write-Host "  ✓ Model & Skills Verified." -ForegroundColor Green
        return $true
    }
    return $false
}

# 루프 실행 전 1회 강제 검증
if (-not (Verify-OpenIdentity)) {
    Write-Host "  ! Initial verification failed. Rotating account..." -ForegroundColor Yellow
    .\smart-rotate.ps1 account
    if (-not (Verify-OpenIdentity)) {
        Write-Host "  [CRITICAL] System verification failed after rotation." -ForegroundColor Red
        exit 1
    }
}

# Step 2: Main Task Execution with 3-Tier Intelligence Selection
Write-Host "`n[STEP 2] Analyzing Task Intelligence Tier..." -ForegroundColor Yellow

function Get-TargetModel {
    param($taskText)
    # Tier 1: Supreme Logic & Thinking (Opus 4.5)
    if ($taskText -match "verify|logic|think|complex|architecture|audit|검토|검증|논리|생각") {
        Write-Host "  🧠 Supreme Intelligence Mode. Selecting Claude Opus 4.5." -ForegroundColor Yellow
        return "anthropic/claude-4.5-opus"
    }
    # Tier 2: Visual & Design (Gemini 3 Pro)
    elseif ($taskText -match "design|ui|ux|layout|draw|image|css|styling|바나나|그림") {
        Write-Host "  🎨 Pro Design Mode. Forcing Gemini 3 Pro High." -ForegroundColor Magenta
        return "google/antigravity-gemini-3-pro-high"
    }
    # Tier 3: Standard Coding & Execution (Sonnet 4.5)
    else {
        Write-Host "  🚀 Standard Execution Mode. Using Claude Sonnet 4.5." -ForegroundColor Cyan
        return "anthropic/claude-4.5-sonnet"
    }
}

$targetModel = Get-TargetModel -taskText $Task
Write-Host "  🎯 Selected Intelligence Tier Model: $targetModel" -ForegroundColor Green

$maxRetries = 10 
$attempt = 1
$success = $false

while (-not $success -and $attempt -le $maxRetries) {
    Write-Host "`n[ATTEMPT $attempt] Delegating to OpenCode..." -ForegroundColor Cyan
    
    # 디자인 Task일 경우 '바나나' 퀄리티(최고 수준 비주얼) 프롬프트 강화
    $finalPrompt = $Task
    if ($targetModel -match "gemini") {
        $finalPrompt = "[DESIGN MODE: BANANA QUALITY] $Task. Focus on stunning aesthetics, modern typography, and vibrant HSL colors."
    }
    
    $enhancedPrompt = "[SKILLS: ALWAYS USE ALL] $finalPrompt"
    
    # 복잡도에 따른 실행 분기
    $needsParallel = ($Task -match "review|architecture|security|complex|cross-check")
    
    try {
        if ($needsParallel) {
            Write-Host "  🔥 Triggering Parallel Orchestrator with $targetModel..." -ForegroundColor Magenta
            $result = python .\smart_orchestrator.py "$enhancedPrompt" --model "$targetModel" 2>&1
        }
        else {
            Write-Host "  🚀 Triggering Single collab_loop with $targetModel..." -ForegroundColor Cyan
            # collab_loop.ps1 수정 없이 모델 전달 (파라미터 추가 고려 필요 시 수정)
            $result = .\collab_loop.ps1 -Prompt "$enhancedPrompt" -Model "$targetModel" 2>&1
        }
        
        # Rate Limit 또는 토큰 소모 감지 로직
        if ($result -match "rate limit|quota exceeded|too many requests|429") {
            Write-Host "  ⚠️ Token consumption limit reached. Rotating account..." -ForegroundColor Yellow
            .\smart-rotate.ps1 account
            $attempt++
            Start-Sleep -Seconds 5
        }
        else {
            $success = $true
            Write-Host "  ✓ Task executed successfully." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  ! Execution error: $($_.Exception.Message). Rotating..." -ForegroundColor Yellow
        .\smart-rotate.ps1 account
        $attempt++
    }
}

if (-not $success) {
    Write-Host "`n[CRITICAL] Failed to complete task after $maxRetries account rotations." -ForegroundColor Red
    exit 1
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "  ORCHESTRATION COMPLETE" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan
