# Claude Desktop MCP Installer - BrowserAutoMCP
# This script automates the installation and configuration of the MCP server.

$ErrorActionPreference = "Stop"

Write-Host "#######################################################" -ForegroundColor Cyan
Write-Host "#  Installing BrowserAutoMCP for Claude Desktop -Ruturaj     #" -ForegroundColor Cyan
Write-Host "#######################################################" -ForegroundColor Cyan
Write-Host ""

# 1. Environment Check & Build
Write-Host "[1/3] Building project and installing dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    npm install
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] ERROR: Build failed. Please ensure Node.js is installed." -ForegroundColor Red
    pause
    exit
}
npx playwright install chromium
Write-Host "[OK] Project built and Playwright installed." -ForegroundColor Green

# 2. Configure Claude Desktop
Write-Host "`n[2/3] Configuring Claude Desktop..." -ForegroundColor Yellow

$configPath = "$env:APPDATA\Anthropic\Claude\claude_desktop_config.json"
$configDir = Split-Path $configPath -Parent

if (!(Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configObj = @{ mcpServers = @{} }
if (Test-Path $configPath) {
    try {
        $configJson = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($configJson.mcpServers -eq $null) {
            $configJson | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
        }
        $configObj = $configJson
    } catch {
        Write-Host "[!] Warning: Existing config is invalid JSON. Creating a fresh one." -ForegroundColor Yellow
    }
}

# Define the server configuration
$serverName = "browser-auto"
$indexPath = (Get-Item "dist/index.js").FullName.Replace('\', '/')

$serverConfig = @{
    command = "node"
    args = @($indexPath)
}

# Update or Add the server entry
if ($configObj.mcpServers.PSObject.Properties[$serverName]) {
    Write-Host "[i] Updating existing '$serverName' entry." -ForegroundColor Cyan
} else {
    Write-Host "[i] Adding new '$serverName' entry." -ForegroundColor Cyan
}

$configObj.mcpServers | Add-Member -MemberType NoteProperty -Name $serverName -Value $serverConfig -Force

# Save back to file
$configObj | ConvertTo-Json -Depth 10 | Set-Content $configPath
Write-Host "[OK] Claude Desktop configuration updated at: $configPath" -ForegroundColor Green

# 3. Finalize
Write-Host "`n[3/3] Installation Complete!" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------"
Write-Host "IMPORTANT: Please RESTART Claude Desktop to apply changes." -ForegroundColor Yellow
Write-Host "-------------------------------------------------------"
Write-Host ""
pause
