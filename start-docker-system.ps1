# ========================================
#  Docker Auto Start & 5-Agent System
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Docker 5-Agent System Start" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Docker status
Write-Host "[1/3] Checking Docker...`n" -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "  ✓ Docker running`n" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Docker not running`n" -ForegroundColor Yellow
    
    # Start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Write-Host "  → Starting Docker Desktop...`n" -ForegroundColor Gray
        Start-Process $dockerPath
        
        # Wait for Docker engine
        Write-Host "  ⏳ Waiting for Docker (max 60s)...`n" -ForegroundColor Yellow
        
        $maxRetries = 12
        $ready = $false
        
        for ($i = 0; $i -lt $maxRetries; $i++) {
            Start-Sleep -Seconds 5
            try {
                docker ps | Out-Null
                Write-Host "  ✓ Docker ready!`n" -ForegroundColor Green
                $ready = $true
                break
            }
            catch {
                Write-Host "  ⏳ Waiting... ($($i * 5)s)" -ForegroundColor Gray
            }
        }
        
        if (-not $ready) {
            Write-Host "  ✗ Docker start failed`n" -ForegroundColor Red
            Write-Host "  Please start Docker Desktop manually`n" -ForegroundColor Yellow
            exit 1
        }
    }
    else {
        Write-Host "  ✗ Docker Desktop not found`n" -ForegroundColor Red
        exit 1
    }
}

# Check docker-compose.yml
Write-Host "[2/3] Checking docker-compose.yml...`n" -ForegroundColor Yellow
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "  ✗ docker-compose.yml not found`n" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ docker-compose.yml exists`n" -ForegroundColor Green

# Start containers
Write-Host "[3/3] Starting 3-Agent containers...`n" -ForegroundColor Yellow

# Clean up
docker-compose down 2>&1 | Out-Null

# Start
Write-Host "  → docker-compose up -d`n" -ForegroundColor Gray
docker-compose up -d

Start-Sleep -Seconds 5

# Verify
$containers = docker ps --filter "name=opencode-collab" --format "{{.Names}}"
if ($containers) {
    Write-Host "  ✓ Containers running:" -ForegroundColor Green
    foreach ($c in $containers) {
        Write-Host "    - $c" -ForegroundColor White
    }
    Write-Host ""
}
else {
    Write-Host "  ✗ Containers failed to start`n" -ForegroundColor Red
    Write-Host "  Logs:" -ForegroundColor Yellow
    docker-compose logs --tail=20
    exit 1
}

# Done
Write-Host "========================================" -ForegroundColor Green
Write-Host "  System Ready!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  1. Single agent:" -ForegroundColor Cyan
Write-Host '     .\collab_loop.ps1 "task"' -ForegroundColor White
Write-Host ""
Write-Host "  2. 3-Agent parallel:" -ForegroundColor Cyan
Write-Host '     python smart_orchestrator.py "full review"' -ForegroundColor White
Write-Host ""
Write-Host "  3. Auto ping-pong:" -ForegroundColor Cyan
Write-Host '     .\auto-review-loop.ps1 "task"' -ForegroundColor White
Write-Host ""