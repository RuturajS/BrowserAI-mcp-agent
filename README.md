# Browser and Spreadsheet Automation MCP Server

This Mode Context Protocol (MCP) server provides tools for browser automation and spreadsheet data processing. It is designed to work with Claude Desktop to automate tasks such as filling forms from Excel data, taking screenshots, and recording video logs of automation flows.

## Prerequisites

- Node.js (v18 or higher)
- npm (installed with Node.js)

## Quick Installation

For a single-click experience that configures your Claude Desktop automatically:

- **Windows One-Click:** Right-click `install-claude.ps1` and select "Run with PowerShell".
- **Cross-platform:** Run `npm run browserAutoMCP` in your terminal.

This will build your project, install Playwright (Chromium), and automatically update your `claude_desktop_config.json` file.

## Manual Installation (Optional)

If you prefer to install manually:

1. Navigate to the project directory:
   ```powershell
   cd C:/path/to/your/project/BrowserAutoMCP
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Install Playwright browsers:
   ```powershell
   npx playwright install chromium
   ```

4. Build the project:
   ```powershell
   npm run build
   ```

## Security Warning

**Important:** This server allows automated control of your web browser and access to your local file system. 

- Only use this server with websites and files you trust.
- Be aware that the browser will be visible (unless headless mode is changed in code) and will perform actions on your behalf.
- Review the `/logs` and `/videos` folders to audit the actions taken by the AI.

## Configuration Guide

To use this server with Claude Desktop, you need to configure both the **Claude Desktop App** and the **Project Settings**.

### 1. Claude Desktop Configuration
Add the following to your `claude_desktop_config.json` (located in `%APPDATA%\Claude\`).

#### Option A: Development Mode (Run with TypeScript)
Best for making changes to the code without building every time.
```json
{
  "mcpServers": {
    "browser-auto": {
      "command": "npx",
      "args": [
        "-y",
        "ts-node",
        "C:/path/to/your/project/BrowserAutoMCP/src/index.ts"
      ],
      "env": {
        "NODE_PATH": "C:/path/to/your/project/BrowserAutoMCP/node_modules"
      }
    }
  }
}
```

#### Option B: Production Mode (Run Compiled JS)
Recommended for stable use after running `npm run build`.
```json
{
  "mcpServers": {
    "browser-auto": {
      "command": "node",
      "args": [
        "C:/path/to/your/project/BrowserAutoMCP/dist/index.js"
      ]
    }
  }
}
```
*Note: Replace `C:/path/to/your/project/` with your actual installation directory.*

### 2. Project Configuration (config.yaml)
Customize the browser behavior in the `config.yaml` file located in the project root.

```yaml
browserSettings:
  browsers: ["chrome"]  # Options: "chrome", "firefox", "edge", "webkit", "all"
  headless: false        # Set to true for background execution
  parallel: false        # Set to true to run multiple browsers at once
  viewport:
    width: 1380
    height: 820
  recordVideo: true      # Enable/disable session recording
  slowMo: 0              # Add delay (ms) between actions for visibility
  screenshotInterval: 5  # Auto-screenshot every X seconds (0 to disable)

directories:
  logs: "logs"           # Folder for execution logs
  screenshots: "screenshots"
  videos: "videos"
  exports: "exports"

automationOptions:
  cleanAtStartup: false  # Auto-empty folders on every server start
```

3. **Restart Claude Desktop** after making these changes.


## Usage & Test Case Examples

Once the server is configured, you can interact with it using natural language in Claude Desktop.

### Case 1: Verifying Browser Navigation
**Prompt:** "Navigate to https://www.github.com and take a screenshot called 'github-main'."
**Expected Result:** The browser opens GitHub, and a file named `github-main-[timestamp].png` appears in your `/screenshots` folder.

### Case 2: Automated Data Entry
**Prompt:** "Read 'C:/path/to/your/data.xlsx'. For every row, go to 'https://example.com/form' and type the 'Name' column into the '#name-input' field."
**Expected Result:** Claude reads the Excel rows, navigates to the URL, and loops through the data to fill the form automatically.

### Case 3: Capturing a Video Log
**Prompt:** "Perform a search for 'MCP protocols' on Google, then stop the automation and name the video 'SearchFlow'."
**Expected Result:** The recording of the search is finalized and saved as `SearchFlow-[timestamp].webm` in the `/videos` folder.

### Case 4: Data Scraping & Export
**Prompt:** "Go to https://news.ycombinator.com, scrape the titles of all stories using the '.titleline' selector, and save them to an Excel file called 'hn-news.xlsx'."
**Expected Result:** Claude extracts the news titles and creates a formatted Excel file in the `/exports` directory.

## Available Tools

- **navigate**: Opens a URL in the browser.
- **click**: Clicks on a specific CSS selector.
- **type**: Fills an input field with text using a CSS selector.
- **scrape_data**: Extracts text content from elements matching a CSS selector.
- **save_to_excel**: Converts JSON data (like results from a scrape) into a downloadable `.xlsx` file.
- **export_pdf**: Saves the current page view as a PDF document (requires Chromium headless).
- **screenshot**: Takes a visual snapshot and saves it in the `screenshots` folder with a timestamp.
- **read_excel**: Reads data from `.xlsx`, `.xls`, or `.csv` files and returns JSON format.
- **stop_automation**: Gracefully closes the browser session and finalizes video recording.

## Output Directories

The server automatically creates the following directories to store execution data:

- **/logs**: Continuous execution logs with timestamps (execution-YYYY-MM-DD.txt).
- **/screenshots**: Visual captures from the `screenshot` tool.
- **/videos**: Full screen recordings of automation sessions (automation-flow-YYYY-MM-DD.webm).
- **/exports**: Generated Excel sheets (`.xlsx`) and PDF reports.

## Project Structure

- `src/index.ts`: Source code for the MCP server.
- `dist/index.js`: Compiled JavaScript for execution.
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript compiler settings.

Author: Ruturaj Sharbidre