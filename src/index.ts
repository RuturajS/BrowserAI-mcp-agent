import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from "playwright";
import * as xlsx from "xlsx";
import { z } from "zod";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { fileURLToPath } from "url";

// Determine project root (works for both src/ and dist/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load configuration
interface Config {
  browserSettings: {
    browsers: string[];
    headless: boolean;
    parallel: boolean;
    viewport?: { width: number; height: number };
    recordVideo?: boolean;
    slowMo?: number;
    screenshotInterval?: number;
  };
  efficiency?: {
    minimizeDom: boolean;
    useElementMap: boolean;
    targetedScreenshots: boolean;
    reductionTarget: number;
  };
  tokenUsage?: {
    enabled: boolean;
    limit: number;
    stopOnLimit: boolean;
    logLevel: string;
    directories: {
      tokenLogs: string;
    };
  };
  directories: {
    logs: string;
    screenshots: string;
    videos: string;
    exports: string;
  };
  automationOptions?: {
    cleanAtStartup?: boolean;
  };
}

const configPath = path.join(projectRoot, "config.yaml");
let config: Config;

try {
  let configData = fs.readFileSync(configPath, "utf-8");
  config = yaml.load(configData) as Config;
} catch (error) {
  console.error(`Config not found at ${configPath}, using defaults.`);
  config = {
    browserSettings: {
      browsers: ["chrome"],
      headless: false,
      parallel: false,
      viewport: { width: 1280, height: 720 },
      recordVideo: true
    },
    directories: {
      logs: "logs",
      screenshots: "screenshots",
      videos: "videos",
      exports: "exports"
    }
  };
}

// Ensure directories are absolute relative to project root
const logDir = path.resolve(projectRoot, config.directories.logs);
const screenshotDir = path.resolve(projectRoot, config.directories.screenshots);
const videoDir = path.resolve(projectRoot, config.directories.videos);
const exportDir = path.resolve(projectRoot, config.directories.exports);

// Ensure token log directory exists
const tokenLogDir = config.tokenUsage?.enabled 
  ? path.resolve(projectRoot, config.tokenUsage.directories.tokenLogs)
  : null;

const automationDirs = [logDir, screenshotDir, videoDir, exportDir];
if (tokenLogDir) automationDirs.push(tokenLogDir);

automationDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFilePath = path.join(logDir, `execution-${timestamp}.txt`);

function writeLog(level: "INFO" | "ERROR", message: string) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${time}] [${level}] ${message}\n`, "utf8");
}

// Implement Token Tracking
class TokenTracker {
  private totalTokensUsed: number = 0;
  private logFilePath: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFilePath = tokenLogDir ? path.join(tokenLogDir, `token-usage-${timestamp}.json`) : "";
  }

  trackTokens(request: any, response: any) {
    if (!config.tokenUsage?.enabled) return;

    const requestStr = JSON.stringify(request);
    const responseStr = JSON.stringify(response);
    
    // Rough estimate: 1 token per 4 characters
    const reqTokens = Math.ceil(requestStr.length / 4);
    const respTokens = Math.ceil(responseStr.length / 4);
    const used = reqTokens + respTokens;

    this.totalTokensUsed += used;

    const usageData = {
      timestamp: new Date().toISOString(),
      requestTokens: reqTokens,
      responseTokens: respTokens,
      totalThisCall: used,
      cumulativeTotal: this.totalTokensUsed,
      limit: config.tokenUsage.limit
    };

    if (this.logFilePath) {
      try {
        let logs = [];
        if (fs.existsSync(this.logFilePath)) {
          logs = JSON.parse(fs.readFileSync(this.logFilePath, "utf8"));
        }
        logs.push(usageData);
        fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2), "utf8");
      } catch (err) {
        console.error("Failed to log token usage:", err);
      }
    }

    if (config.tokenUsage.stopOnLimit && this.totalTokensUsed >= config.tokenUsage.limit) {
      writeLog("ERROR", `TOKEN LIMIT REACHED: ${this.totalTokensUsed} tokens used. Execution halted.`);
      throw new Error(`Token limit exceeded (${config.tokenUsage.limit}). Total used: ${this.totalTokensUsed}`);
    }
  }

  getTotalTokens() {
    return this.totalTokensUsed;
  }
}

const tokenTracker = new TokenTracker();

// Local Element Map for Efficiency
const elementMap: Map<string, string> = new Map();

// Implement directory cleanup if flag is set
if (config.automationOptions?.cleanAtStartup) {
  console.error("Cleanup at startup is enabled. Removing old logs, screenshots, and videos...");
  [logDir, screenshotDir, videoDir, tokenLogDir].filter(Boolean).forEach(dir => {
    try {
      if (!dir) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() || stats.isSymbolicLink()) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.error(`Failed to clean directory ${dir}: ${err}`);
    }
  });
}

// Report the log location to stderr so Claude/User can see it in logs
console.error(`Starting Browser Automation MCP Server`);
console.error(`Logs will be stored in: ${logFilePath}`);

const server = new Server(
  {
    name: "browser-auto-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let browsers: { name: string; instance: Browser }[] = [];
let pages: { browserName: string; page: Page; context: BrowserContext; screenshotTimer?: NodeJS.Timeout }[] = [];

writeLog("INFO", "Server starting up...");

async function launchBrowser(browserName: string) {
  const launchOptions = {
    headless: config.browserSettings.headless,
    slowMo: config.browserSettings.slowMo || 0
  };

  let instance: Browser;
  switch (browserName.toLowerCase()) {
    case "firefox":
      instance = await firefox.launch(launchOptions);
      break;
    case "webkit":
      instance = await webkit.launch(launchOptions);
      break;
    case "edge":
      instance = await chromium.launch({ ...launchOptions, channel: "msedge" });
      break;
    case "chrome":
    case "chromium":
    default:
      instance = await chromium.launch({ ...launchOptions, channel: browserName === "chrome" ? "chrome" : undefined });
      break;
  }
  return instance;
}

async function getBrowsers() {
  browsers = browsers.filter(b => b.instance.isConnected());

  if (browsers.length === 0) {
    const requestedBrowsers = config.browserSettings.browsers.includes("all") 
      ? ["chrome", "firefox", "edge"] 
      : config.browserSettings.browsers;

    if (config.browserSettings.parallel) {
      const launchPromises = requestedBrowsers.map(async (name) => {
        const instance = await launchBrowser(name);
        return { name, instance };
      });
      browsers = await Promise.all(launchPromises);
    } else {
      for (const name of requestedBrowsers) {
        const instance = await launchBrowser(name);
        browsers.push({ name, instance });
      }
    }
  }
  return browsers;
}

async function getPages() {
  const browserList = await getBrowsers();
  pages = pages.filter(p => !p.page.isClosed());
  
  if (pages.length === 0) {
    for (const b of browserList) {
      const context = await b.instance.newContext({
        viewport: config.browserSettings.viewport,
        recordVideo: config.browserSettings.recordVideo ? {
          dir: videoDir,
          size: config.browserSettings.viewport || { width: 1280, height: 720 },
        } : undefined,
      });

      const p = await context.newPage();
      const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const browserInfo = `${b.name}-${sessionTimestamp}`;
      writeLog("INFO", `New browser session started for ${b.name}: ${browserInfo}`);

      const pageData: any = { browserName: b.name, page: p, context };

      const intervalS = config.browserSettings.screenshotInterval;
      if (intervalS && intervalS > 0) {
        const intervalMs = intervalS * 1000;
        pageData.screenshotTimer = setInterval(async () => {
          try {
            if (!p.isClosed()) {
              const ts = new Date().toISOString().replace(/[:.]/g, "-");
              const fileName = `auto-${b.name}-${ts}.png`;
              const filePath = path.join(screenshotDir, fileName);
              await p.screenshot({ path: filePath });
              writeLog("INFO", `Auto-interval screenshot for ${b.name} saved to ${filePath}`);
            }
          } catch (err) {
            writeLog("ERROR", `Failed auto-screenshot for ${b.name}: ${err}`);
            if (pageData.screenshotTimer) {
               clearInterval(pageData.screenshotTimer);
            }
          }
        }, intervalMs);
      }

      pages.push(pageData);

      context.once("close", async () => {
        if (pageData.screenshotTimer) {
          clearInterval(pageData.screenshotTimer);
        }
        const video = p.video();
        if (video) {
          try {
            const videoPath = await video.path();
            if (videoPath && fs.existsSync(videoPath)) {
              const finalName = `automation-${b.name}-${sessionTimestamp}.webm`;
              const finalPath = path.join(videoDir, finalName);
              setTimeout(() => {
                if (fs.existsSync(videoPath)) {
                  fs.renameSync(videoPath, finalPath);
                  writeLog("INFO", `Video for ${b.name} auto-saved to ${finalPath}`);
                }
              }, 1000);
            }
          } catch (err) {
            writeLog("ERROR", `Failed to auto-rename video for ${b.name}: ${err}`);
          }
        }
      });
    }
  }
  return pages;
}

async function closeAllSessions() {
  for (const p of pages) {
    if (p.screenshotTimer) {
      clearInterval(p.screenshotTimer);
    }
    try {
      await p.context.close();
    } catch (err) {
      writeLog("ERROR", `Failed to close context: ${err}`);
    }
  }
  pages = [];
  for (const b of browsers) {
    try {
      await b.instance.close();
    } catch (err) {
      writeLog("ERROR", `Failed to close browser: ${err}`);
    }
  }
  browsers = [];
}

async function shutdown() {
  writeLog("INFO", "Shutting down server...");
  await closeAllSessions();
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "navigate",
        description: "Navigate to a URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
          },
          required: ["url"],
        },
      },
      {
        name: "get_page_elements",
        description: "Get only minimal structured data from the page (visible buttons, inputs, links). Highly token efficient.",
        inputSchema: {
          type: "object",
          properties: {
            cacheKey: { type: "string", description: "Optional key to store found elements for reuse" },
          },
        },
      },
      {
        name: "click",
        description: "Click an element. Supports cached keys from get_page_elements.",
        inputSchema: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS selector or cached element key" },
          },
          required: ["selector"],
        },
      },
      {
        name: "type",
        description: "Type text into an input. Supports cached keys from get_page_elements.",
        inputSchema: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS selector or cached element key" },
            text: { type: "string", description: "Text to type" },
          },
          required: ["selector", "text"],
        },
      },
      {
        name: "screenshot",
        description: "Take a screenshot",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      {
        name: "read_excel",
        description: "Read data from an Excel or CSV file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },
      {
        name: "scrape_data",
        description: "Extract data from the current page using selectors",
        inputSchema: {
          type: "object",
          properties: {
            selector: { type: "string", description: "CSS selector to scrape" },
          },
          required: ["selector"],
        },
      },
      {
        name: "save_to_excel",
        description: "Save JSON data to an Excel file in the exports folder",
        inputSchema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" }, description: "Array of objects to save" },
            fileName: { type: "string", description: "Name of the file (e.g. data.xlsx)" },
          },
          required: ["data", "fileName"],
        },
      },
      {
        name: "export_pdf",
        description: "Export the current page as a PDF (Note: only works if browser is headless)",
        inputSchema: {
          type: "object",
          properties: {
            fileName: { type: "string", description: "Name of the PDF file" },
          },
          required: ["fileName"],
        },
      },
      {
        name: "get_token_usage",
        description: "Get current token usage statistics",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "stop_automation",
        description: "Stop current automation flow and save video",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name for the saved video (optional)" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  writeLog("INFO", `Executing tool: ${name} with arguments: ${JSON.stringify(args)}`);

  let response: any;
  try {
    switch (name) {
      case "get_token_usage": {
        response = { content: [{ type: "text", text: `Total tokens used: ${tokenTracker.getTotalTokens()}\nLimit: ${config.tokenUsage?.limit || "Unlimited"}` }] };
        break;
      }
      case "get_page_elements": {
        const pList = await getPages();
        const results: any[] = [];
        
        for (const { page: p, browserName } of pList) {
          const elements = await p.evaluate(() => {
            const getVisible = (selector: string) => {
              return Array.from(document.querySelectorAll(selector))
                .filter(el => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                })
                .map(el => ({
                  tag: el.tagName.toLowerCase(),
                  text: (el as HTMLElement).innerText?.trim().substring(0, 50) || (el as HTMLInputElement).value?.substring(0, 50),
                  id: el.id,
                  class: el.className,
                  placeholder: (el as HTMLInputElement).placeholder,
                  type: (el as HTMLInputElement).type,
                }));
            };

            return {
              buttons: getVisible('button, input[type="button"], input[type="submit"], [role="button"]'),
              inputs: getVisible('input:not([type="button"]):not([type="submit"]), textarea, select'),
              links: getVisible('a').slice(0, 20),
            };
          });

          if (args?.cacheKey) {
            elementMap.set(args.cacheKey as string, JSON.stringify(elements));
          }
          results.push({ browser: browserName, elements });
        }
        
        response = { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        break;
      }
      case "navigate": {
        const pList = await getPages();
        const results: string[] = [];
        
        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            await p.goto(args?.url as string);
            results.push(`${browserName}: Navigated to ${args?.url}`);
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            await p.goto(args?.url as string);
            results.push(`${browserName}: Navigated to ${args?.url}`);
          }
        }
        writeLog("INFO", `Successfully navigated to ${args?.url} across ${pList.length} browsers`);
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "click": {
        const pList = await getPages();
        const results: string[] = [];
        let selector = args?.selector as string;

        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            await p.click(selector);
            results.push(`${browserName}: Clicked ${selector}`);
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            await p.click(selector);
            results.push(`${browserName}: Clicked ${selector}`);
          }
        }
        writeLog("INFO", `Successfully clicked selector: ${selector} across ${pList.length} browsers`);
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "type": {
        const pList = await getPages();
        const results: string[] = [];
        const selector = args?.selector as string;
        const text = args?.text as string;
        
        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            await p.fill(selector, text);
            results.push(`${browserName}: Typed into ${selector}`);
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            await p.fill(selector, text);
            results.push(`${browserName}: Typed into ${selector}`);
          }
        }
        writeLog("INFO", `Successfully typed into selector: ${selector} across ${pList.length} browsers`);
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "screenshot": {
        const pList = await getPages();
        const results: string[] = [];
        const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
        
        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            const fileName = args?.name ? `${args.name}-${browserName}-${timeStamp}.png` : `screenshot-${browserName}-${timeStamp}.png`;
            const filePath = path.join(screenshotDir, fileName);
            await p.screenshot({ path: filePath });
            results.push(`${browserName}: Screenshot saved to ${filePath}`);
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            const fileName = args?.name ? `${args.name}-${browserName}-${timeStamp}.png` : `screenshot-${browserName}-${timeStamp}.png`;
            const filePath = path.join(screenshotDir, fileName);
            await p.screenshot({ path: filePath });
            results.push(`${browserName}: Screenshot saved to ${filePath}`);
          }
        }
        writeLog("INFO", `Screenshot successfully saved across ${pList.length} browsers`);
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "read_excel": {
        const workbook = xlsx.readFile(args?.path as string);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        writeLog("INFO", `Successfully read excel file from ${args?.path}`);
        response = { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        break;
      }
      case "scrape_data": {
        const pList = await getPages();
        const results: string[] = [];
        
        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            let data;
            if (config.efficiency?.minimizeDom) {
               data = await p.$$eval(args?.selector as string, (els) => els.map(e => (e as HTMLElement).innerText.trim().substring(0, 500)));
            } else {
               data = await p.$$eval(args?.selector as string, (els) => els.map(e => (e as HTMLElement).innerText.trim()));
            }
            results.push(`${browserName}: Scraped ${data.length} items: ${JSON.stringify(data)}`);
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            let data;
            if (config.efficiency?.minimizeDom) {
               data = await p.$$eval(args?.selector as string, (els) => els.map(e => (e as HTMLElement).innerText.trim().substring(0, 500)));
            } else {
               data = await p.$$eval(args?.selector as string, (els) => els.map(e => (e as HTMLElement).innerText.trim()));
            }
            results.push(`${browserName}: Scraped ${data.length} items: ${JSON.stringify(data)}`);
          }
        }
        writeLog("INFO", `Scraped data across ${pList.length} browsers using selector: ${args?.selector}`);
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "save_to_excel": {
        const data = args?.data as any[];
        const fileName = args?.fileName as string;
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Scraped Data");
        const filePath = path.join(exportDir, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
        xlsx.writeFile(wb, filePath);
        writeLog("INFO", `Data saved to excel: ${filePath}`);
        response = { content: [{ type: "text", text: `Data successfully exported to ${filePath}` }] };
        break;
      }
      case "export_pdf": {
        const pList = await getPages();
        const results: string[] = [];
        const fileName = args?.fileName as string;

        if (config.browserSettings.parallel) {
          await Promise.all(pList.map(async ({ page: p, browserName }) => {
            const filePath = path.join(exportDir, `${browserName}-${fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`}`);
            try {
              await p.pdf({ path: filePath, format: "A4", printBackground: true });
              results.push(`${browserName}: Page exported to PDF: ${filePath}`);
            } catch (err: any) {
              results.push(`${browserName}: PDF export failed (requires headless mode): ${err.message}`);
            }
          }));
        } else {
          for (const { page: p, browserName } of pList) {
            const filePath = path.join(exportDir, `${browserName}-${fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`}`);
            try {
              await p.pdf({ path: filePath, format: "A4", printBackground: true });
              results.push(`${browserName}: Page exported to PDF: ${filePath}`);
            } catch (err: any) {
              results.push(`${browserName}: PDF export failed (requires headless mode): ${err.message}`);
            }
          }
        }
        response = { content: [{ type: "text", text: results.join("\n") }] };
        break;
      }
      case "stop_automation": {
        pages = pages.filter(p => !p.page.isClosed());
        const pList = [...pages];
        
        if (pList.length === 0 && browsers.length === 0) {
          writeLog("INFO", "No active automation flow or browser instances to stop");
          response = { content: [{ type: "text", text: "No active automation flow or browser instances to stop." }] };
          break;
        }

        const stopResults = [];
        for (const item of pList) {
          const { page: p, browserName, context } = item;
          const video = p.video();
          let videoPath = "";

          if (video) {
            videoPath = await video.path();
          }

          if (videoPath && fs.existsSync(videoPath)) {
            const finalTimeStamp = new Date().toISOString().replace(/[:.]/g, "-");
            const finalName = args?.name ? `${args.name}-${browserName}-${finalTimeStamp}.webm` : `automation-${browserName}-${finalTimeStamp}.webm`;
            const finalPath = path.join(videoDir, finalName);
            
            try {
              await context.close();
            } catch (err) {
              writeLog("ERROR", `Failed to close context during stop_automation: ${err}`);
            }
            
            if (fs.existsSync(videoPath)) {
               fs.renameSync(videoPath, finalPath);
               stopResults.push(`${browserName}: Stopped. Video: ${finalPath}`);
            } else {
               stopResults.push(`${browserName}: Stopped.`);
            }
          } else {
            try {
              await context.close();
            } catch (err) {
              writeLog("ERROR", `Failed to close context during stop_automation: ${err}`);
            }
            stopResults.push(`${browserName}: Stopped.`);
          }
        }

        await closeAllSessions();
        writeLog("INFO", "All automation flows stopped and browser instances closed.");
        response = { content: [{ type: "text", text: stopResults.length > 0 ? stopResults.join("\n") : "Browser sessions closed properly." }] };
        break;
      }
      default:
        throw new Error(`Tool not found: ${name}`);
    }

    tokenTracker.trackTokens(request.params, response);
    return response;
  } catch (error: any) {
    writeLog("ERROR", `Failed to execute tool ${name}. Error: ${error.message}`);
    const errorResponse = {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
    try {
      tokenTracker.trackTokens(request.params, errorResponse);
    } catch (e) {}
    return errorResponse;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Browser Automation MCP server running on stdio");
