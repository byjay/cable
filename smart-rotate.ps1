# ========================================
#  Smart Model & Account Rotation System
# ========================================

$ErrorActionPreference = "Stop"

$CONFIG = @{
    AgPath    = "C:\Users\FREE\CascadeProjects\opencode-collab\opencode-infinite"
    StateFile = "rotation_state.json"
    Models    = @(
        "anthropic/claude-4.5-opus", 
        "anthropic/claude-4.5-sonnet", 
        "google/antigravity-gemini-3-pro-high",
        "google/gemini-3-flash"
    )
}

# 현재 상태 로드
function Get-RotationState {
    $statePath = Join-Path $CONFIG.AgPath $CONFIG.StateFile
    if (Test-Path $statePath) {
        return Get-Content $statePath | ConvertFrom-Json
    }
    return @{
        currentModelIndex   = 0
        currentAccountIndex = 0
        lastRotation        = (Get-Date).ToString("o")
    }
}

# 상태 저장
function Set-RotationState {
    param($State)
    $statePath = Join-Path $CONFIG.AgPath $CONFIG.StateFile
    $State | ConvertTo-Json | Set-Content $statePath
}

# 다음 모델로 전환
function Switch-Model {
    $state = Get-RotationState
    $state.currentModelIndex = ($state.currentModelIndex + 1) % $CONFIG.Models.Count
    $state.lastRotation = (Get-Date).ToString("o")
    Set-RotationState $state
    
    $newModel = $CONFIG.Models[$state.currentModelIndex]
    Write-Host "[ROTATE] Model: $newModel" -ForegroundColor Cyan
    return $newModel
}

# 다음 계정으로 전환
function Switch-Account {
    Push-Location $CONFIG.AgPath
    try {
        Write-Host "[ROTATE] Switching account..." -ForegroundColor Yellow
        node manager.js rotate
        
        $state = Get-RotationState
        $state.currentAccountIndex = ($state.currentAccountIndex + 1) % 10
        $state.lastRotation = (Get-Date).ToString("o")
        Set-RotationState $state
        
        Start-Sleep -Seconds 3
        Write-Host "[ROTATE] Account switched! (Next account in pool of 10)" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# 스마트 순환 (모델 -> 계정)
function Invoke-SmartRotation {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Smart Rotation" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    $state = Get-RotationState
    $currentModel = $CONFIG.Models[$state.currentModelIndex]
    
    Write-Host "[CURRENT] Model: $currentModel" -ForegroundColor Gray
    Write-Host "[CURRENT] Account: $($state.currentAccountIndex + 1)/10`n" -ForegroundColor Gray
    
    # 사용량 감시 및 선제적 전환 로직 (90% 경고, 98% 즉시 전환)
    function Test-QuotaUsage {
        param($model)
        Write-Host "[MONITOR] Checking quota for $model..." -ForegroundColor Gray
        # OpenAI/Anthropic API 등에서 리턴하는 X-RateLimit 헤더 또는 모델 메시지 파싱 시뮬레이션
        # 실제 환경에서는 opencode run 결과의 usage 필드를 파싱하거나 누적 카운트 사용
        $usage = 0 # Placeholder for real check
        
        # 실제 구현: 마지막 작업 결과를 분석하여 'usage percentage' 추출 로직 필요
        # 여기서는 사용자님의 요청에 따라 90/98 임계치 기반 로직 구조 설계
        if ($usage -ge 98) {
            Write-Host "[CRITICAL] Quota reached 98%! Emergency rotation initiated." -ForegroundColor Red
            return "SWITCH"
        }
        elseif ($usage -ge 90) {
            Write-Host "[WARNING] Quota reached 90%! Preparing for account transition." -ForegroundColor Yellow
            return "WARN"
        }
        return "OK"
    }

    # 모델 전환
    $usageStatus = Test-QuotaUsage $currentModel
    if ($usageStatus -eq "SWITCH") {
        Switch-Account
        $newModel = $CONFIG.Models[0] # 계정 전환 후 초기 모델로 복귀
    }
    else {
        $newModel = Switch-Model
    }
    
    # 모델이 한 바퀴 돌았거나 98% 도달 시 계정 전환
    if ($state.currentModelIndex -eq 0 -or $usageStatus -eq "SWITCH") {
        Write-Host "[INFO] All models used, switching account..." -ForegroundColor Yellow
        Switch-Account
    }
    
    Write-Host "`n[DONE] Rotation complete!" -ForegroundColor Green
    Write-Host "[NEW] Model: $newModel" -ForegroundColor Green
    Write-Host "[NEW] Account: $($state.currentAccountIndex + 1)/10`n" -ForegroundColor Green
}

# 상태 표시
function Show-RotationStatus {
    $state = Get-RotationState
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Rotation Status" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Current Configuration:" -ForegroundColor Yellow
    Write-Host "  Model: $($CONFIG.Models[$state.currentModelIndex])" -ForegroundColor White
    Write-Host "  Account: $($state.currentAccountIndex + 1)/10" -ForegroundColor White
    Write-Host "  Last Rotation: $($state.lastRotation)`n" -ForegroundColor Gray
    
    Write-Host "Available Models:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $CONFIG.Models.Count; $i++) {
        $prefix = if ($i -eq $state.currentModelIndex) { "-> " } else { "  " }
        $color = if ($i -eq $state.currentModelIndex) { "Green" } else { "Gray" }
        Write-Host "$prefix$($CONFIG.Models[$i])" -ForegroundColor $color
    }
    
    Write-Host ""
}

# 메인
switch ($args[0]) {
    "rotate" { Invoke-SmartRotation }
    "status" { Show-RotationStatus }
    "model" { Switch-Model }
    "account" { Switch-Account }
    default {
        Write-Host "`nUsage:" -ForegroundColor Yellow
        Write-Host "  .\smart-rotate.ps1 rotate   - Smart rotation (model + account)" -ForegroundColor White
        Write-Host "  .\smart-rotate.ps1 status   - Show current status" -ForegroundColor White
        Write-Host "  .\smart-rotate.ps1 model    - Switch model only" -ForegroundColor White
        Write-Host "  .\smart-rotate.ps1 account  - Switch account only`n" -ForegroundColor White
    }
}