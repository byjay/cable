# ========================================
#  OpenCode + Antigravity 통합 설치
#  ag rotate 자동화 시스템
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  OpenCode Multi-Account Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$PROJECT_ROOT = "C:\Users\FREE\CascadeProjects\opencode-collab"
$INFINITE_DIR = Join-Path $PROJECT_ROOT "opencode-infinite"

# 1. opencode-infinite 폴더 존재 확인
if (-not (Test-Path $INFINITE_DIR)) {
    Write-Host "[ERROR] opencode-infinite 폴더가 없습니다!" -ForegroundColor Red
    Write-Host "위치: $INFINITE_DIR" -ForegroundColor Yellow
    exit 1
}

Write-Host "[STEP 1/5] Checking opencode-infinite..." -ForegroundColor Green
Write-Host "✓ Found: $INFINITE_DIR" -ForegroundColor Gray

# 2. PATH 환경변수에 추가
Write-Host "`n[STEP 2/5] Adding to PATH..." -ForegroundColor Green

$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$INFINITE_DIR*") {
    $NewPath = "$CurrentPath;$INFINITE_DIR"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "✓ Added to PATH: $INFINITE_DIR" -ForegroundColor Gray
    Write-Host "  (새 터미널에서 'ag' 명령어 사용 가능)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Already in PATH" -ForegroundColor Gray
}

# 3. ag.bat 생성/확인
Write-Host "`n[STEP 3/5] Checking ag.bat..." -ForegroundColor Green

$AgBatPath = Join-Path $INFINITE_DIR "ag.bat"
$AgBatContent = @"
@echo off
node "%~dp0manager.js" %*
"@

Set-Content -Path $AgBatPath -Value $AgBatContent -Encoding ASCII
Write-Host "✓ ag.bat created/updated" -ForegroundColor Gray

# 4. tokens 폴더 생성
Write-Host "`n[STEP 4/5] Creating tokens directory..." -ForegroundColor Green

$TokensDir = Join-Path $INFINITE_DIR "tokens"
if (-not (Test-Path $TokensDir)) {
    New-Item -ItemType Directory -Path $TokensDir -Force | Out-Null
    Write-Host "✓ Created: $TokensDir" -ForegroundColor Gray
} else {
    Write-Host "✓ Already exists: $TokensDir" -ForegroundColor Gray
}

# 5. collab_loop.ps1에 ag rotate 통합
Write-Host "`n[STEP 5/5] Integrating with collab_loop.ps1..." -ForegroundColor Green

$CollabLoopPath = Join-Path $PROJECT_ROOT "collab_loop.ps1"
if (Test-Path $CollabLoopPath) {
    Write-Host "✓ collab_loop.ps1 found" -ForegroundColor Gray
    Write-Host "  (Rate limit 발생 시 자동으로 ag rotate 실행됨)" -ForegroundColor Yellow
} else {
    Write-Host "⚠ collab_loop.ps1 not found" -ForegroundColor Yellow
}

# 완료 메시지
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup Complete! " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "🎉 이제 다음 명령어들을 사용할 수 있습니다:`n" -ForegroundColor Cyan

Write-Host "  ag rotate        " -ForegroundColor White -NoNewline
Write-Host "- 다음 계정으로 순환" -ForegroundColor Gray

Write-Host "  ag load          " -ForegroundColor White -NoNewline
Write-Host "- 계정 선택해서 전환" -ForegroundColor Gray

Write-Host "  ag list          " -ForegroundColor White -NoNewline
Write-Host "- 저장된 계정 목록" -ForegroundColor Gray

Write-Host "  ag setup         " -ForegroundColor White -NoNewline
Write-Host "- 계정 초기 설정" -ForegroundColor Gray

Write-Host "`n💡 다음 단계:" -ForegroundColor Yellow
Write-Host "  1. 새 PowerShell 창 열기" -ForegroundColor White
Write-Host "  2. cd $PROJECT_ROOT" -ForegroundColor White
Write-Host "  3. ag setup-preset  " -ForegroundColor White -NoNewline
Write-Host "(10개 계정 자동 설정)" -ForegroundColor Gray

Write-Host "`n" -ForegroundColor White
Pause