# 🐳 Docker Guide for Browser Automation MCP

This guide explains how to containerize and run the Browser Automation MCP server using Docker and Docker Compose.

## 📌 Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) installed on your host machine.
- [Docker Compose](https://docs.docker.com/compose/install/) (typically included with Docker Desktop on Windows/Mac).

## 🚀 Getting Started

To build and launch the server in a containerized environment, run:

```bash
docker compose up --build
```

This will:
1.  Build the Docker image using the provided `Dockerfile`.
2.  Install all required browser dependencies (Chromium, Firefox, WebKit).
3.  Start the automation server.

## 🔧 External Configuration

The `docker-compose.yml` file is configured to mount your local `config.yaml` file into the container. This means **you can edit settings on your computer, and they will apply to the Docker container in real-time.**

### Recommended for Docker:
In [config.yaml](file:///c:/Users/rutur/OneDrive/Desktop/AIAutomation/BrowserAutoMCP/config.yaml), verify these settings for optimal Docker performance:

```yaml
browserSettings:
  headless: true       # Required unless you setup a display server
  recordVideo: true    # Recommended for debugging in headless mode
```

## 📂 Persistent Storage & Outputs

All automation outputs are saved directly to your host machine's project folder using Docker volumes:

-   **Logs**: `logs/`
-   **Screenshots**: `screenshots/`
-   **Videos**: `videos/`
-   **Exports**: `exports/`

These folders are shared between your computer and the container. You can safely delete or inspect their contents without stopping the container.

## 🧹 Automatic Cleanup

You can enable automatic folder cleaning each time the container starts by setting the `cleanAtStartup` flag in your configuration:

```yaml
automationOptions:
  cleanAtStartup: true
```

When enabled, the server will empty the `logs`, `screenshots`, and `videos` directories at startup before beginning new automation sessions.

## 🛠️ Docker Commands Cheat Sheet

| Action | Command |
| :--- | :--- |
| Build and Start | `docker compose up --build` |
| Start in Background | `docker compose up -d` |
| Stop Container | `docker compose down` |
| View Logs | `docker compose logs -f` |
| Restart Server | `docker compose restart` |

## ⚠️ Notes 

- **Headless Mode**: Since Docker containers do not have a graphical desktop interface, you must use `headless: true` for browser automations.
- **Resource Limits**: Browser automation can be resource-intensive. Ensure Docker Desktop has at least 4GB of RAM allocated.
