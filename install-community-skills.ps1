# ========================================
#  Community Skills Auto Installer
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installing Community Skills" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 스킬 설치 경로
$skillsPath = "$env:USERPROFILE\.opencode\skills"

# 임시 다운로드 폴더
$tempPath = "$env:TEMP\awesome-claude-skills"

Write-Host "[1/5] Creating skills directory...`n" -ForegroundColor Yellow
if (-not (Test-Path $skillsPath)) {
    New-Item -ItemType Directory -Path $skillsPath -Force | Out-Null
}
Write-Host "  ✓ Skills directory ready: $skillsPath`n" -ForegroundColor Green

Write-Host "[2/5] Downloading community skills...`n" -ForegroundColor Yellow
if (Test-Path $tempPath) {
    Remove-Item -Recurse -Force $tempPath
}

try {
    git clone https://github.com/VoltAgent/awesome-claude-skills.git $tempPath
    Write-Host "  ✓ Downloaded successfully`n" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Git clone failed`n" -ForegroundColor Red
    Write-Host "  Error: $_`n" -ForegroundColor Red
    Write-Host "  Please check if Git is installed: git --version`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "[3/5] Installing essential skills...`n" -ForegroundColor Yellow

# 필수 스킬 목록 (개발 중심)
$essentialSkills = @(
    "test-driven-development",
    "systematic-debugging", 
    "code-review",
    "git-commit-helper",
    "markdown-writer",
    "api-docs-generator",
    "readme-creator"
)

$installed = 0
$skipped = 0

# Development 스킬 복사
if (Test-Path "$tempPath\skills\development") {
    Write-Host "  → Copying development skills..." -ForegroundColor Gray
    $devSkills = Get-ChildItem "$tempPath\skills\development" -Directory
    
    foreach ($skill in $devSkills) {
        $destPath = Join-Path $skillsPath $skill.Name
        
        if (Test-Path $destPath) {
            Write-Host "    ⊘ $($skill.Name) (already exists)" -ForegroundColor Yellow
            $skipped++
        }
        else {
            Copy-Item -Recurse $skill.FullName $destPath
            Write-Host "    ✓ $($skill.Name)" -ForegroundColor Green
            $installed++
        }
    }
}

# Document 스킬 복사
if (Test-Path "$tempPath\skills\document-creation") {
    Write-Host "`n  → Copying document skills..." -ForegroundColor Gray
    $docSkills = Get-ChildItem "$tempPath\skills\document-creation" -Directory
    
    foreach ($skill in $docSkills) {
        $destPath = Join-Path $skillsPath $skill.Name
        
        if (Test-Path $destPath) {
            Write-Host "    ⊘ $($skill.Name) (already exists)" -ForegroundColor Yellow
            $skipped++
        }
        else {
            Copy-Item -Recurse $skill.FullName $destPath
            Write-Host "    ✓ $($skill.Name)" -ForegroundColor Green
            $installed++
        }
    }
}

Write-Host ""

Write-Host "[4/5] Cleaning up...`n" -ForegroundColor Yellow
Remove-Item -Recurse -Force $tempPath
Write-Host "  ✓ Temporary files removed`n" -ForegroundColor Green

Write-Host "[5/5] Verifying installation...`n" -ForegroundColor Yellow
$allSkills = Get-ChildItem $skillsPath -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }

Write-Host "  Installed skills:" -ForegroundColor Cyan
foreach ($skill in $allSkills) {
    Write-Host "    - $($skill.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  New skills: $installed" -ForegroundColor Green
Write-Host "  Skipped (existing): $skipped" -ForegroundColor Yellow
Write-Host "  Total skills: $($allSkills.Count)" -ForegroundColor Cyan
Write-Host ""

Write-Host "Usage:" -ForegroundColor Yellow
Write-Host '  Ask Antigravity: "@test-driven-development 로그인 함수 만들어줘"' -ForegroundColor White
Write-Host '  Or: "code-review 스킬을 사용해서 현재 코드 검토해줘"' -ForegroundColor White
Write-Host ""