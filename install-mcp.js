import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const SERVER_NAME = 'browser-auto';
const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
const CLAUDE_CONFIG_DIR = path.join(APPDATA, 'Anthropic', 'Claude');
const CLAUDE_CONFIG_PATH = path.join(CLAUDE_CONFIG_DIR, 'claude_desktop_config.json');

console.log('#######################################################');
console.log('#  Installing BrowserAutoMCP for Claude Desktop       #');
console.log('#######################################################');
console.log('');

// 1. Build project
console.log('[1/3] Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('[OK] Build successful.');
} catch (error) {
  console.error('[X] ERROR: Build failed. Ensure Node.js is installed.');
  process.exit(1);
}

// 2. Playwright
console.log('[2/3] Installing Playwright Chromium...');
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('[OK] Playwright ready.');
} catch (error) {
  console.error('[X] WARNING: Playwright installation failed. You may need to run it manually.');
}

// 3. Update Claude Config
console.log('[3/3] Updating Claude Desktop configuration...');
const serverPath = path.resolve('dist', 'index.js').replace(/\\/g, '/');

if (!fs.existsSync(CLAUDE_CONFIG_DIR)) {
  fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
}

let config = { mcpServers: {} };
if (fs.existsSync(CLAUDE_CONFIG_PATH)) {
  try {
    const rawData = fs.readFileSync(CLAUDE_CONFIG_PATH, 'utf8');
    config = JSON.parse(rawData);
    if (!config.mcpServers) config.mcpServers = {};
  } catch (error) {
    console.warn('[!] Existing config is invalid. Creating new one.');
  }
}

config.mcpServers[SERVER_NAME] = {
  command: 'node',
  args: [serverPath]
};

fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
console.log(`[OK] Configuration updated at: ${CLAUDE_CONFIG_PATH}`);

console.log('');
console.log('-------------------------------------------------------');
console.log('INSTALLATION COMPLETE!');
console.log('IMPORTANT: Please RESTART Claude Desktop to apply changes.');
console.log('-------------------------------------------------------');
