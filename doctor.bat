@echo off
setlocal enabledelayedexpansion

echo ##############################################
echo #  Browser Automation MCP Setup & Doctor  - Ruturaj   #
echo ##############################################
echo.

:: 1. Check for npm
where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [X] Error: npm is not installed. Please install Node.js first.
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed.
)

:: 2. Check for node_modules
if not exist "node_modules\" (
    echo [!] node_modules missing. Installing dependencies...
    call npm install
) else (
    echo [OK] node_modules found. Skipping npm install.
)

:: 3. Check for browsers
echo [!] Checking Playwright browsers...
call npx playwright install chromium

:: 4. Build Files (Always rebuild)
echo [!] Compiling project (always rebuilding to ensure fresh dist)...
call npm run build

echo.
echo ##############################################
echo # SETUP COMPLETE!                          #
echo ##############################################
echo.
pause
