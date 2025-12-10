@echo off
echo ==========================================
echo      Antigravity GitHub Setup
echo ==========================================

REM Try to find gh.exe in standard location or PATH
set "GH_PATH=C:\Program Files\GitHub CLI\gh.exe"
if not exist "%GH_PATH%" set GH_PATH=gh

REM Verify installation
"%GH_PATH%" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] GitHub CLI not found. 
    echo Please restart your terminal - close and reopen VS Code - to refresh your PATH, then run this script again.
    pause
    exit /b
)

echo.
echo [1/3] Authenticating with GitHub...
echo Please follow the prompts to login via browser.
"%GH_PATH%" auth login
if %errorlevel% neq 0 exit /b

echo.
echo [2/3] Creating repository 'arc-chat' on GitHub...
REM --source=. uses the current directory
REM --remote=origin adds the remote link automatically
"%GH_PATH%" repo create arc-chat --public --source=. --remote=origin --push

echo.
echo [3/3] Success!
echo Your code is live at: https://github.com/%USERNAME%/arc-chat
pause
