$ErrorActionPreference = 'Stop'

$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')

$currentProjectDir = "c:\Users\FREE\CascadeProjects\opencode-collab"
$env:Path = "$currentProjectDir;$machinePath;$userPath"

# OpenCode Default Environment Variables (Premium Tier)
$env:OPENCODE_MODEL = "anthropic/claude-4.5-sonnet"
$env:OPENCODE_ACCOUNT = "designsir101@gmail.com" 

Write-Host "PATH and OpenCode environment refreshed for current session." -ForegroundColor Green
Write-Host "Default Model: $env:OPENCODE_MODEL" -ForegroundColor Gray

Write-Host "opencode:" -ForegroundColor Cyan
try { opencode --version } catch { Write-Host "opencode not found" -ForegroundColor Yellow }

Write-Host "bun:" -ForegroundColor Cyan
try { bun --version } catch { Write-Host "bun not found" -ForegroundColor Yellow }
