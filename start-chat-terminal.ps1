# ========================================
#  Chat Terminal Starter
#  Usage: .\start-chat-terminal.ps1 [1|2]
# ========================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("1", "2")]
    [string]$TerminalNumber
)

$ErrorActionPreference = "Stop"

# 계정 매핑
$accounts = @{
    "1" = @{
        Email = "elecgisanim@gmail.com"
        Role  = "Terminal Chat 1"
        Color = "Cyan"
    }
    "2" = @{
        Email = "elecgisanim1@gmail.com"
        Role  = "Terminal Chat 2"
        Color = "Yellow"
    }
}

$account = $accounts[$TerminalNumber]
$configPath = "C:\Users\FREE\CascadeProjects\opencode-collab\chat-terminals\$($account.Email -replace '@.*').json"

# 설정 파일 로드
if (-not (Test-Path $configPath)) {
    Write-Host "[ERROR] Config not found: $configPath" -ForegroundColor Red
    Write-Host "Run .\chat-dedicated-accounts.ps1 first!" -ForegroundColor Yellow
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json

# 터미널 타이틀 설정
$host.UI.RawUI.WindowTitle = "Chat Terminal $TerminalNumber - $($account.Email)"

# UTF-8 설정
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n========================================" -ForegroundColor $account.Color
Write-Host "  Chat Terminal $TerminalNumber Activated" -ForegroundColor $account.Color
Write-Host "========================================`n" -ForegroundColor $account.Color

Write-Host "📧 Account: $($config.email)" -ForegroundColor White
Write-Host "🎯 Role: $($config.role)" -ForegroundColor White
Write-Host "💬 Purpose: $($config.purpose)`n" -ForegroundColor White

Write-Host "🔹 Commands:" -ForegroundColor $account.Color
Write-Host "  chat ""message""         - Send message to OpenCode"
Write-Host "  review ""task""          - Request review from OpenCode"
Write-Host "  status                  - Check current status"
Write-Host "  feedback ""comment""     - Log feedback"
Write-Host "  clear                   - Clear screen"
Write-Host "  help                    - Show commands"
Write-Host "  exit                    - Close terminal`n"

# OpenCode 환경 변수 설정
$env:OPENCODE_ACCOUNT = $config.email
$env:OPENCODE_MODE = "chat"

# 프로젝트 루트로 이동
Set-Location "C:\Users\FREE\CascadeProjects\opencode-collab"

Write-Host "✅ Ready for conversation!" -ForegroundColor Green
Write-Host "Type your message or 'help' for commands`n" -ForegroundColor Gray

# 피드백 로그 파일
$feedbackFile = "C:\Users\FREE\CascadeProjects\opencode-collab\chat-terminals\feedback-$TerminalNumber.log"

# Chat 함수 정의
function Send-ChatMessage {
    param([string]$message)
    
    if (-not $message) {
        Write-Host "[ERROR] Message cannot be empty" -ForegroundColor Red
        return
    }
    
    Write-Host "`n[YOU → OpenCode] $message" -ForegroundColor $account.Color
    Write-Host "Waiting for response...`n" -ForegroundColor Gray
    
    try {
        # OpenCode 실행 (모델 지정)
        $currentModel = $env:OPENCODE_MODEL
        Write-Host "Using model: $currentModel" -ForegroundColor Gray
        $result = opencode run --model $currentModel --prompt $message 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OpenCode → YOU]`n" -ForegroundColor Green
            Write-Host $result -ForegroundColor White
        }
        else {
            Write-Host "[OpenCode Error]" -ForegroundColor Red
            Write-Host $result -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Request-Review {
    param([string]$task)
    
    if (-not $task) {
        Write-Host "[ERROR] Task cannot be empty" -ForegroundColor Red
        return
    }
    
    Write-Host "`n[Review Request] $task" -ForegroundColor $account.Color
    Write-Host "Analyzing...`n" -ForegroundColor Gray
    
    try {
        $currentModel = $env:OPENCODE_MODEL
        $reviewPrompt = "Please review: $task. Provide detailed analysis with strengths and areas for improvement."
        Write-Host "Using model: $currentModel" -ForegroundColor Gray
        $result = opencode run --model $currentModel --prompt $reviewPrompt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[Review Result]`n" -ForegroundColor Magenta
            Write-Host $result -ForegroundColor White
        }
        else {
            Write-Host "[Review Error]" -ForegroundColor Red
            Write-Host $result -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Write-Feedback {
    param([string]$comment)
    
    if (-not $comment) {
        Write-Host "[ERROR] Comment cannot be empty" -ForegroundColor Red
        return
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [Terminal $TerminalNumber] $comment"
    
    try {
        $logEntry | Out-File -Append -FilePath $feedbackFile -Encoding UTF8
        Write-Host "`n✓ Feedback logged to: $feedbackFile" -ForegroundColor Green
    }
    catch {
        Write-Host "`n[ERROR] Failed to log feedback: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Show-Status {
    Write-Host "`n========================================" -ForegroundColor $account.Color
    Write-Host "  Terminal $TerminalNumber Status" -ForegroundColor $account.Color
    Write-Host "========================================" -ForegroundColor $account.Color
    Write-Host "Account: $($config.email)" -ForegroundColor White
    Write-Host "Role: $($config.role)" -ForegroundColor White
    Write-Host "Mode: CHAT-ONLY" -ForegroundColor White
    Write-Host "Location: $(Get-Location)`n" -ForegroundColor White
    
    # OpenCode 연결 확인
    Write-Host "Checking OpenCode connection..." -ForegroundColor Gray
    try {
        $version = opencode --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ OpenCode Connected (v$version)" -ForegroundColor Green
        }
        else {
            Write-Host "❌ OpenCode Not Connected" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ OpenCode Not Available" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Show-Help {
    Write-Host "`n========================================" -ForegroundColor $account.Color
    Write-Host "  Available Commands" -ForegroundColor $account.Color
    Write-Host "========================================`n" -ForegroundColor $account.Color
    
    Write-Host "Basic Commands:" -ForegroundColor Cyan
    Write-Host '  chat "message"           ' -NoNewline; Write-Host "- Send message to OpenCode" -ForegroundColor Gray
    Write-Host '  review "task"            ' -NoNewline; Write-Host "- Request detailed review" -ForegroundColor Gray
    Write-Host '  feedback "comment"       ' -NoNewline; Write-Host "- Log feedback to file" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Quick Commands:" -ForegroundColor Cyan
    Write-Host "  status                   " -NoNewline; Write-Host "- Check terminal status" -ForegroundColor Gray
    Write-Host "  help                     " -NoNewline; Write-Host "- Show this help" -ForegroundColor Gray
    Write-Host "  clear                    " -NoNewline; Write-Host "- Clear screen" -ForegroundColor Gray
    Write-Host "  exit                     " -NoNewline; Write-Host "- Close terminal" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host '  chat "Analyze SDMS login function"' -ForegroundColor White
    Write-Host '  review "Check security of authentication"' -ForegroundColor White
    Write-Host '  feedback "Recommend JWT implementation"' -ForegroundColor White
    Write-Host ""
    
    Write-Host "Shortcuts:" -ForegroundColor Yellow
    Write-Host "  Just type your message (no quotes needed)" -ForegroundColor White
    Write-Host '  Example: > Analyze this code' -ForegroundColor White
    Write-Host ""
}

# Interactive mode
Write-Host "Interactive mode started.`n" -ForegroundColor Gray

while ($true) {
    Write-Host "Terminal-$TerminalNumber" -ForegroundColor $account.Color -NoNewline
    Write-Host "> " -NoNewline
    $prompt = Read-Host
    
    # 빈 입력 무시
    if (-not $prompt) {
        continue
    }
    
    # 종료
    if ($prompt -eq "exit" -or $prompt -eq "quit") {
        Write-Host "`nClosing Terminal $TerminalNumber...`n" -ForegroundColor Yellow
        break
    }
    
    # 도움말
    if ($prompt -eq "help" -or $prompt -eq "?") {
        Show-Help
        continue
    }
    
    # 화면 지우기
    if ($prompt -eq "clear" -or $prompt -eq "cls") {
        Clear-Host
        Write-Host "`n========================================" -ForegroundColor $account.Color
        Write-Host "  Chat Terminal $TerminalNumber" -ForegroundColor $account.Color
        Write-Host "========================================`n" -ForegroundColor $account.Color
        continue
    }
    
    # 상태 확인
    if ($prompt -eq "status") {
        Show-Status
        continue
    }
    
    # 명령어 파싱
    if ($prompt -match '^chat\s+"?(.+)"?$' -or $prompt -match '^chat\s+(.+)$') {
        Send-ChatMessage $Matches[1]
    }
    elseif ($prompt -match '^review\s+"?(.+)"?$' -or $prompt -match '^review\s+(.+)$') {
        Request-Review $Matches[1]
    }
    elseif ($prompt -match '^feedback\s+"?(.+)"?$' -or $prompt -match '^feedback\s+(.+)$') {
        Write-Feedback $Matches[1]
    }
    else {
        # 기본: chat 명령어로 처리
        Send-ChatMessage $prompt
    }
}

Write-Host "Thank you for using Terminal $TerminalNumber!`n" -ForegroundColor Green