# ========================================
#  Chat-Dedicated Google Accounts Setup
#  elecgisanim@gmail.com (Terminal 1)
#  elecgisanim1@gmail.com (Terminal 2)
# ========================================

$ErrorActionPreference = "Stop"

# Chat 전용 계정 정보
$chatAccounts = @(
    @{
        Email = "elecgisanim@gmail.com"
        Token = ""  # OpenCode에서 자동으로 토큰 사용
        Role = "Terminal Chat 1"
        Purpose = "Real-time feedback & discussion"
    },
    @{
        Email = "elecgisanim1@gmail.com"
        Token = ""  # OpenCode에서 자동으로 토큰 사용
        Role = "Terminal Chat 2"
        Purpose = "Cross-verification & review"
    }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setting Up Chat-Dedicated Accounts" -ForegroundColor Cyan
Write-Host "========================================`n"

# 1. Chat 전용 폴더 생성
$chatDir = "C:\Users\FREE\CascadeProjects\opencode-collab\chat-terminals"
if (-not (Test-Path $chatDir)) {
    New-Item -ItemType Directory -Path $chatDir -Force | Out-Null
    Write-Host "[✓] Chat terminals directory created" -ForegroundColor Green
}

# 2. 각 계정별 설정 파일 생성
foreach ($account in $chatAccounts) {
    $configPath = "$chatDir\$($account.Email -replace '@.*').json"
    
    $config = @{
        email = $account.Email
        token = $account.Token
        role = $account.Role
        purpose = $account.Purpose
        mode = "chat-only"
        autoStart = $true
    } | ConvertTo-Json -Depth 10
    
    $config | Out-File -FilePath $configPath -Encoding UTF8
    Write-Host "[✓] Config created: $($account.Email)" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Cyan
Write-Host "========================================`n"

Write-Host "📋 Chat Accounts:" -ForegroundColor Yellow
foreach ($account in $chatAccounts) {
    Write-Host "  • $($account.Email)" -ForegroundColor White
    Write-Host "    Role: $($account.Role)" -ForegroundColor Gray
    Write-Host "    Purpose: $($account.Purpose)`n" -ForegroundColor Gray
}

Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run Terminal 1: .\start-chat-terminal.ps1 1"
Write-Host "  2. Run Terminal 2: .\start-chat-terminal.ps1 2"
Write-Host "  3. Start conversation in both terminals simultaneously`n"