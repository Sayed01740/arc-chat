@echo off
echo ==========================================
echo      Antigravity Vercel Deployment
echo ==========================================

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI not found. Installing...
    call npm install -g vercel
)

echo.
echo [1/3] Logging in to Vercel...
echo Please follow the browser prompts to log in.
call vercel login

echo.
echo [2/3] Setting up project...
echo Press ENTER to accept default settings (Project Name, Scope, etc.)
call vercel link

echo.
echo [3/3] Deploying to Production...
call vercel deploy --prod

echo.
echo ==========================================
echo           DEPLOYMENT COMPLETE
echo ==========================================
pause
