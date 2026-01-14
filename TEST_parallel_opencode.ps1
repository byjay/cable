param(
  [string]$TargetRoot = 'F:\genmini\japness\JAP_BONG_fam',
  [string]$OutDir = (Join-Path (Get-Location) 'TEST_reports'),
  [string]$AgentExplore = 'plan',
  [string]$AgentReviewer = 'summary',
  [string]$AgentTester = 'compaction'
)

$ErrorActionPreference = 'Stop'

$utf8 = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = $utf8
[Console]::OutputEncoding = $utf8

if (-not (Test-Path $TargetRoot)) {
  throw "TargetRoot not found: $TargetRoot"
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir $timestamp
New-Item -ItemType Directory -Path $runDir -Force | Out-Null

$exploreOut = Join-Path $runDir '01_explore.md'
$reviewOut  = Join-Path $runDir '02_reviewer.md'
$testOut    = Join-Path $runDir '03_tester.md'

$commonContext = @(
  "Target project root: '$TargetRoot'.",
  "Search for error evidence: ERROR_REPORT.md, logs, .env/.toml/.yml/.yaml/.json config files, and run scripts (.bat/.ps1).",
  "Write output in this exact order: (1) observed symptom (2) evidence (file/path) (3) likely cause (4) reproduction steps (5) fix steps."
) -join "\n"

$promptExplore = @(
  $commonContext,
  "Role: explorer. Quickly scan the folder structure and identify top error-related files.",
  "Focus on: ERROR_REPORT.md, FINAL_REPORT.md, logs, run_test.bat, start_app.bat, docker-compose.yml, Dockerfile, requirements.txt/pyproject.toml/package.json.",
  "Summarize in Markdown."
) -join "\n"

$promptReviewer = @(
  $commonContext,
  "Role: senior reviewer. Categorize failure causes across code/config/deploy (Netlify/Docker/etc).",
  "Prioritize: missing env vars, path issues (Windows/WSL), encoding (UTF-8), dependency version mismatches, build/bundle failures, runtime exceptions.",
  "Classify as High/Medium/Low and propose actionable fixes."
) -join "\n"

$promptTester = @(
  $commonContext,
  "Role: tester. Design a reproduction plan.",
  "Find run scripts/tests and propose an execution order that reproduces the error.",
  "List likely failing commands (python -m ..., pip install, npm install/build, docker compose up/build) and explain expected failure points."
) -join "\n"

function Invoke-OpenCodeWithRetry {
  param(
    [string]$Root,
    [string]$Agent,
    [string]$Prompt,
    [string]$OutFile,
    [int]$MaxAttempts = 3,
    [int]$SleepSeconds = 3
  )

  Set-Location $Root

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $output = & opencode run --agent $Agent $Prompt 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      $output | Out-File -FilePath $OutFile -Encoding utf8
      return
    }

    $text = ($output | Out-String)
    $isRetryable = ($text -match 'EBUSY') -or ($text -match 'Unexpected error')

    if ($isRetryable -and ($attempt -lt $MaxAttempts)) {
      Start-Sleep -Seconds $SleepSeconds
      continue
    }

    "# OpenCode run failed" | Out-File -FilePath $OutFile -Encoding utf8
    "- agent: $Agent" | Out-File -FilePath $OutFile -Encoding utf8 -Append
    "- attempt: $attempt / $MaxAttempts" | Out-File -FilePath $OutFile -Encoding utf8 -Append
    "- exitCode: $exitCode" | Out-File -FilePath $OutFile -Encoding utf8 -Append
    "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
    '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
    $text | Out-File -FilePath $OutFile -Encoding utf8 -Append
    '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
    return
  }
}

Write-Host "[TEST] Parallel OpenCode analysis start" -ForegroundColor Green
Write-Host "  TargetRoot: $TargetRoot" -ForegroundColor Cyan
Write-Host "  OutputDir : $runDir" -ForegroundColor Cyan
Write-Host "  Agents   : explore=$AgentExplore reviewer=$AgentReviewer tester=$AgentTester" -ForegroundColor Cyan

# Warm-up (single run) to avoid concurrent Bun installs causing EBUSY
Write-Host "[WARMUP] Running a single OpenCode command to pre-install plugins..." -ForegroundColor Green
Invoke-OpenCodeWithRetry -Root $TargetRoot -Agent $AgentReviewer -Prompt 'Warm-up. Reply with OK.' -OutFile (Join-Path $runDir '_warmup.md') -MaxAttempts 3 -SleepSeconds 3

$jobs = @()

$jobs += Start-Job -Name 'explore' -ArgumentList $TargetRoot, $promptExplore, $exploreOut, $AgentExplore -ScriptBlock {
  param($root, $prompt, $out, $agent)
  function Invoke-OpenCodeWithRetry {
    param([string]$Root,[string]$Agent,[string]$Prompt,[string]$OutFile,[int]$MaxAttempts = 3,[int]$SleepSeconds = 3)
    Set-Location $Root
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
      $output = & opencode run --agent $Agent $Prompt 2>&1
      $exitCode = $LASTEXITCODE
      if ($exitCode -eq 0) { $output | Out-File -FilePath $OutFile -Encoding utf8; return }
      $text = ($output | Out-String)
      $isRetryable = ($text -match 'EBUSY') -or ($text -match 'Unexpected error')
      if ($isRetryable -and ($attempt -lt $MaxAttempts)) { Start-Sleep -Seconds $SleepSeconds; continue }
      "# OpenCode run failed" | Out-File -FilePath $OutFile -Encoding utf8
      "- agent: $Agent" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- attempt: $attempt / $MaxAttempts" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- exitCode: $exitCode" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      $text | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      return
    }
  }
  Invoke-OpenCodeWithRetry -Root $root -Agent $agent -Prompt $prompt -OutFile $out -MaxAttempts 3 -SleepSeconds 3
}

$jobs += Start-Job -Name 'reviewer' -ArgumentList $TargetRoot, $promptReviewer, $reviewOut, $AgentReviewer -ScriptBlock {
  param($root, $prompt, $out, $agent)
  function Invoke-OpenCodeWithRetry {
    param([string]$Root,[string]$Agent,[string]$Prompt,[string]$OutFile,[int]$MaxAttempts = 3,[int]$SleepSeconds = 3)
    Set-Location $Root
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
      $output = & opencode run --agent $Agent $Prompt 2>&1
      $exitCode = $LASTEXITCODE
      if ($exitCode -eq 0) { $output | Out-File -FilePath $OutFile -Encoding utf8; return }
      $text = ($output | Out-String)
      $isRetryable = ($text -match 'EBUSY') -or ($text -match 'Unexpected error')
      if ($isRetryable -and ($attempt -lt $MaxAttempts)) { Start-Sleep -Seconds $SleepSeconds; continue }
      "# OpenCode run failed" | Out-File -FilePath $OutFile -Encoding utf8
      "- agent: $Agent" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- attempt: $attempt / $MaxAttempts" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- exitCode: $exitCode" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      $text | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      return
    }
  }
  Invoke-OpenCodeWithRetry -Root $root -Agent $agent -Prompt $prompt -OutFile $out -MaxAttempts 3 -SleepSeconds 3
}

$jobs += Start-Job -Name 'tester' -ArgumentList $TargetRoot, $promptTester, $testOut, $AgentTester -ScriptBlock {
  param($root, $prompt, $out, $agent)
  function Invoke-OpenCodeWithRetry {
    param([string]$Root,[string]$Agent,[string]$Prompt,[string]$OutFile,[int]$MaxAttempts = 3,[int]$SleepSeconds = 3)
    Set-Location $Root
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
      $output = & opencode run --agent $Agent $Prompt 2>&1
      $exitCode = $LASTEXITCODE
      if ($exitCode -eq 0) { $output | Out-File -FilePath $OutFile -Encoding utf8; return }
      $text = ($output | Out-String)
      $isRetryable = ($text -match 'EBUSY') -or ($text -match 'Unexpected error')
      if ($isRetryable -and ($attempt -lt $MaxAttempts)) { Start-Sleep -Seconds $SleepSeconds; continue }
      "# OpenCode run failed" | Out-File -FilePath $OutFile -Encoding utf8
      "- agent: $Agent" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- attempt: $attempt / $MaxAttempts" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "- exitCode: $exitCode" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      "" | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      $text | Out-File -FilePath $OutFile -Encoding utf8 -Append
      '```' | Out-File -FilePath $OutFile -Encoding utf8 -Append
      return
    }
  }
  Invoke-OpenCodeWithRetry -Root $root -Agent $agent -Prompt $prompt -OutFile $out -MaxAttempts 3 -SleepSeconds 3
}

Wait-Job -Job $jobs | Out-Null

$failed = $jobs | Where-Object { $_.State -ne 'Completed' }
if ($failed) {
  Write-Host "[WARN] Some jobs did not complete." -ForegroundColor Yellow
  $failed | ForEach-Object { Write-Host (" - " + $_.Name + " : " + $_.State) -ForegroundColor Yellow }
}

foreach ($j in $jobs) {
  Receive-Job -Job $j -ErrorAction SilentlyContinue | Out-Null
}
Remove-Job -Job $jobs | Out-Null

Write-Host "[DONE] Reports generated:" -ForegroundColor Green
Write-Host " - $exploreOut"
Write-Host " - $reviewOut"
Write-Host " - $testOut"
