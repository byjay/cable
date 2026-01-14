param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$PROJECT_ROOT = "C:\Users\FREE\CascadeProjects\opencode-collab"
$QUEUE_FILE = Join-Path $PROJECT_ROOT "COMMAND_QUEUE.md"

# 명령 작성
$content = @"
# COMMAND: $Message

(Sent by Antigravity at $(Get-Date))
"@

Set-Content -Path $QUEUE_FILE -Value $content -Encoding UTF8

Write-Host "🚀 Message sent to Terminal Leader via Hot-Link." -ForegroundColor Green
Write-Host "  Please check the active OpenCode terminal." -ForegroundColor Cyan
