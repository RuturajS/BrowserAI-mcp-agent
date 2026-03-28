# Use the official Playwright Jammy image (Node 20+ included)
FROM mcr.microsoft.com/playwright:v1.51.0-jammy

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the project
RUN npm run build

# Ensure config.yaml is in place (Docker Compose will overwrite it if mounted)
# But it's good to have a default in the image

# Expose no ports as MCP uses stdio but we might need more later
# For stdio, we just run the node process.

# Default command
CMD ["npm", "start"]
