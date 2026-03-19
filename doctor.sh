#!/bin/bash

# Configuration and colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo -e "${CYAN}#############################################${RESET}"
echo -e "${CYAN}#  Browser Automation MCP Setup - Ruturaj   #${RESET}"
echo -e "${CYAN}#############################################${RESET}"
echo -e ""

# 1. Node & npm Check
if ! command -v npm &> /dev/null; then
  echo -e "${RED}[X] Error: npm is not installed. Please install Node.js first.${RESET}"
  exit 1
else
  echo -e "${GREEN}[OK] Node.js is installed. ($(node -v))${RESET}"
fi

# 2. Dependencies (node_modules)
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[!] node_modules missing. Installing dependencies...${RESET}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] npm install failed.${RESET}"
    exit 1
  fi
else
  echo -e "${GREEN}[OK] node_modules found. Skipping install.${RESET}"
fi

# 3. Playwright browser Check
echo -e "${CYAN}[!] Checking Playwright browsers...${RESET}"
if ! npx playwright install chromium --help &> /dev/null; then
  echo -e "${YELLOW}[!] Playwright Chromium is missing. Installing now...${RESET}"
  npx playwright install chromium
else
  echo -e "${GREEN}[OK] Chromium browser found. Skipping installation.${RESET}"
fi

# 4. Build Files (Always rebuild)
echo -e "${YELLOW}[!] Compiling project (always rebuilding to ensure fresh dist)...${RESET}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] npm run build failed.${RESET}"
  exit 1
fi

echo ""
echo -e "${GREEN}#############################################${RESET}"
echo -e "${GREEN}#           SETUP COMPLETE!                 #${RESET}"
echo -e "${GREEN}#############################################${RESET}"
echo ""
echo "Please update your Claude Desktop configuration as per README.md."
echo ""
