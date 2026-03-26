# Browser Automation MCP Setup - Ruturaj Sharbidre

Write-Host "#############################################" -ForegroundColor Cyan
Write-Host "#  Browser Automation MCP Setup & Doctor - Ruturaj    #" -ForegroundColor Cyan
Write-Host "#############################################" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Node & npm Check
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[X] Error: npm is not installed. Please install Node.js." -ForegroundColor Red
    $allGood = $false
    pause
    exit
} else {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js is installed ($nodeVersion)." -ForegroundColor Green
}

# 2. Dependencies (node_modules)
if (!(Test-Path "node_modules")) {
    Write-Host "[!] node_modules missing. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { $allGood = $false }
} else {
    Write-Host "[OK] node_modules found. Skipping npm install." -ForegroundColor Green
}

# 3. Playwright Browser
Write-Host "Checking Playwright browsers..." -ForegroundColor Cyan
$null = npx playwright install chromium --help
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Playwright Chromium is missing. Installing now..." -ForegroundColor Yellow
    npx playwright install chromium
} else {
    Write-Host "[OK] chromium browser found. Skipping installation." -ForegroundColor Green
}

# 4. Build Files (Always rebuild)
Write-Host "Compiling project (always rebuilding to ensure fresh dist)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { $allGood = $false }

Write-Host "`nSetup Summary:" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "The project is fully configured and ready for Claude Desktop!" -ForegroundColor Green
} else {
    Write-Host "Some steps failed. Please check the logs above." -ForegroundColor Red
}

Write-Host ""
pause
