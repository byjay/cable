# ========================================
#  Quick Install - 간단 버전
# ========================================

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\FREE\CascadeProjects\opencode-collab"

Write-Host "`n===========================================`n" -ForegroundColor Cyan
Write-Host "  Quick Install - OpenCode Collaboration`n" -ForegroundColor Cyan  
Write-Host "===========================================`n" -ForegroundColor Cyan

# 프로젝트 폴더로 이동
Set-Location $ProjectRoot
Write-Host "[INFO] Project: $ProjectRoot`n" -ForegroundColor Green

# 파일 체크
$files = @{
    "smart_orchestrator.py" = "Smart Orchestrator"
    "collab_loop.ps1"       = "Collaboration Loop"
    "smart-rotate.ps1"      = "Smart Rotation"
}

Write-Host "[CHECK] 파일 확인:`n" -ForegroundColor Yellow

foreach ($file in $files.Keys) {
    if (Test-Path $file) {
        Write-Host "  ✓ $($files[$file])" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ $($files[$file]) - 생성 필요!" -ForegroundColor Red
    }
}

# instructions.md 체크
$instrPath = ".antigravity\instructions.md"
Write-Host ""
if (Test-Path $instrPath) {
    Write-Host "  ✓ Instructions.md" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Instructions.md - 생성 필요!" -ForegroundColor Red
}

# Python 체크
Write-Host "`n[CHECK] Python:`n" -ForegroundColor Yellow
try {
    $pythonVer = python --version 2>&1
    Write-Host "  ✓ $pythonVer" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Python 미설치!" -ForegroundColor Red
    Write-Host "  → https://www.python.org/downloads/`n" -ForegroundColor Gray
    exit 1
}

# Docker 체크
Write-Host "`n[CHECK] Docker:`n" -ForegroundColor Yellow
try {
    docker ps | Out-Null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Docker 실행 중" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ Docker 정지됨" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  ✗ Docker 미설치" -ForegroundColor Yellow
}

# 간단 테스트
Write-Host "`n[TEST] Smart Orchestrator:`n" -ForegroundColor Yellow
if (Test-Path "smart_orchestrator.py") {
    Write-Host "  실행 방법:" -ForegroundColor Cyan
    Write-Host '  python smart_orchestrator.py "테스트"' -ForegroundColor White
    
    Write-Host "`n  테스트 실행 중..." -ForegroundColor Gray
    $testResult = python smart_orchestrator.py "hello" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ 정상 작동!" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠ 오류 발생 (Docker 필요)" -ForegroundColor Yellow
    }
}

# 사용 가이드
Write-Host "`n===========================================`n" -ForegroundColor Green
Write-Host "  다음 단계`n" -ForegroundColor Green
Write-Host "===========================================`n" -ForegroundColor Green

Write-Host "1. Docker 시작 (병렬 모드):" -ForegroundColor Cyan
Write-Host "   docker-compose up -d`n" -ForegroundColor White

Write-Host "2. 단순 작업 테스트:" -ForegroundColor Cyan
Write-Host '   python smart_orchestrator.py "간단한 함수 만들기"' -ForegroundColor White
Write-Host "`n3. 복잡한 작업 테스트:" -ForegroundColor Cyan
Write-Host '   python smart_orchestrator.py "프로젝트 전체 보안 검토"' -ForegroundColor White

Write-Host "`n4. Antigravity 통합:" -ForegroundColor Cyan
Write-Host "   - Antigravity 실행" -ForegroundColor White
Write-Host "   - 프로젝트 폴더 열기" -ForegroundColor White
Write-Host "   - 자동으로 instructions.md 인식!" -ForegroundColor White

Write-Host "`n===========================================`n" -ForegroundColor Green