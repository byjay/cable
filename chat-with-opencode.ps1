# ========================================
#  Chat with OpenCode (단일 세팅)
# ========================================

param(
    [string]$Prompt = ""
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  OpenCode 대화 모드" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 프로젝트 루트로 이동
$ProjectRoot = "C:\Users\FREE\CascadeProjects\opencode-collab"
Set-Location $ProjectRoot

# 계정 상태 확인
Write-Host "[INFO] 현재 계정 상태:" -ForegroundColor Yellow
.\smart-rotate.ps1 status

Write-Host "`n[INFO] OpenCode 시작 중...`n" -ForegroundColor Yellow

# 프롬프트가 제공된 경우 직접 실행
if ($Prompt) {
    Write-Host "[EXECUTE] '$Prompt'`n" -ForegroundColor Cyan
    opencode $Prompt
}
else {
    # 대화형 모드
    Write-Host "대화형 모드 시작. 종료하려면 'exit' 입력`n" -ForegroundColor Gray
    
    while ($true) {
        Write-Host "You: " -ForegroundColor Green -NoNewline
        $userInput = Read-Host
        
        if ($userInput -eq "exit" -or $userInput -eq "quit") {
            Write-Host "`n종료합니다.`n" -ForegroundColor Yellow
            break
        }
        
        if ($userInput) {
            Write-Host "`nOpenCode: " -ForegroundColor Cyan
            opencode $userInput
            Write-Host ""
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  대화 완료" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green