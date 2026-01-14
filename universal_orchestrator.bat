@echo off
echo ============================================
echo    🧠  UNIVERSAL PROJECT ORCHESTRATOR  🧠   
echo    >>    Any Project Support           
echo ============================================
echo.

set TARGET_PROJECT=%1
set TASK=%2

if "%TARGET_PROJECT%"=="" (
    echo Usage: universal_orchestrator.bat [project_path] [task_description]
    echo.
    echo Examples:
    echo   universal_orchestrator.bat "C:\project\path" "Analyze and optimize"
    echo   universal_orchestrator.bat "" "Simple task in current dir"
    goto :eof
)

if "%TASK%"=="" (
    echo Error: Task description is required
    goto :eof
)

echo Target Project: %TARGET_PROJECT%
echo Task: %TASK%
echo.

set TARGET_PROJECT=%TARGET_PROJECT%
set CWD=%TARGET_PROJECT%

python smart_orchestrator.py "%TASK%"
