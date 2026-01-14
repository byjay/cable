# ========================================
#  OpenCode Skills Configuration Setup
#  Ensures skills are ALWAYS loaded automatically
# ========================================

$ErrorActionPreference = "Stop"

$GLOBAL_CONFIG_DIR = "C:\Users\FREE\.opencode"
$GLOBAL_CONFIG_PATH = "$GLOBAL_CONFIG_DIR\config.json"
$SKILLS_DIR = "$GLOBAL_CONFIG_DIR\skills"
$PROJECT_ROOT = "C:\Users\FREE\CascadeProjects\opencode-collab"
$PROJECT_CONFIG_PATH = "$PROJECT_ROOT\.opencode\config.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenCode Skills Configuration" -ForegroundColor Cyan
Write-Host "========================================`n"

# 1. 스킬 디렉토리 확인
Write-Host "[1/5] Checking skills directory..." -ForegroundColor Yellow
if (-not (Test-Path $SKILLS_DIR)) {
    New-Item -ItemType Directory -Path $SKILLS_DIR -Force | Out-Null
    Write-Host "  ✓ Created skills directory: $SKILLS_DIR" -ForegroundColor Green
}
else {
    $skillCount = (Get-ChildItem $SKILLS_DIR).Count
    Write-Host "  ✓ Skills directory: $SKILLS_DIR ($skillCount skills found)" -ForegroundColor Green
}

# 2. 전역 설정 파일 생성 (config.json)
Write-Host "`n[2/5] Configuring OpenCode global settings..." -ForegroundColor Yellow
$globalConfig = @{
    skills = @{
        autoLoad      = $true
        paths         = @(
            $SKILLS_DIR
        )
        alwaysUse     = $true
        scanOnStartup = $true
    }
    agents = @{
        default = @{
            model = "claude-3-5-sonnet-latest"
        }
    }
} | ConvertTo-Json -Depth 10

if (-not (Test-Path $GLOBAL_CONFIG_DIR)) {
    New-Item -ItemType Directory -Path $GLOBAL_CONFIG_DIR -Force | Out-Null
}

$globalConfig | Out-File -FilePath $GLOBAL_CONFIG_PATH -Encoding UTF8 -Force
Write-Host "  ✓ Global config saved: $GLOBAL_CONFIG_PATH" -ForegroundColor Green

# 3. 프로젝트별 설정 파일 생성
Write-Host "`n[3/5] Configuring project-specific settings..." -ForegroundColor Yellow
$projectOpencodeDir = Join-Path $PROJECT_ROOT ".opencode"
if (-not (Test-Path $projectOpencodeDir)) {
    New-Item -ItemType Directory -Path $projectOpencodeDir -Force | Out-Null
}

$projectConfig = @{
    skills = @{
        required = @(
            "error-handling",
            "systematic-debugging",
            "test-driven-development",
            "code-review-checklist"
        )
    }
} | ConvertTo-Json -Depth 10

$projectConfig | Out-File -FilePath $PROJECT_CONFIG_PATH -Encoding UTF8 -Force
Write-Host "  ✓ Project config saved: $PROJECT_CONFIG_PATH" -ForegroundColor Green

# 4. 필수 스킬 목록 나열
Write-Host "`n[4/5] Listing installed skills..." -ForegroundColor Yellow
$skills = Get-ChildItem $SKILLS_DIR
if ($skills) {
    foreach ($skill in $skills) {
        Write-Host "    • $($skill.Name)" -ForegroundColor White
    }
}
else {
    Write-Host "    (No skills found in $SKILLS_DIR)" -ForegroundColor Gray
}

# 5. 설정 완료 및 테스트 안내
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Cyan
Write-Host "========================================`n"

Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test OpenCode with skills: opencode run --prompt 'Test with skills'"
Write-Host "  2. Check if skills are loaded in the output."
Write-Host "  3. Use the updated collab_loop.ps1 for enhanced reviews.`n"
