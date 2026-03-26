# Browser and Spreadsheet Automation MCP Server

This Mode Context Protocol (MCP) server provides tools for browser automation and spreadsheet data processing. It is designed to work with Claude Desktop to automate tasks such as filling forms from Excel data, taking screenshots, and recording video logs of automation flows.

## Prerequisites

- Node.js (v18 or higher)
- npm (installed with Node.js)

## Quick Setup (Recommended)

Run the **doctor** script for your operating system to automatically install dependencies, download browsers, and build the project in one click.

- **Windows Batch:** Double-click `doctor.bat`
- **Windows PowerShell:** Right-click `doctor.ps1` and select "Run with PowerShell"
- **Linux/macOS:** Run `bash doctor.sh`

## Manual Installation

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

## Claude Desktop Configuration

To use this server with Claude Desktop, you must update your configuration file.

1. Open the following directory:
   `%APPDATA%\Claude`

2. Open `claude_desktop_config.json` and add the following configuration:

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

3. Restart Claude Desktop.

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