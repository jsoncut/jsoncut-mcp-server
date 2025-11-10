# Multi-stage build for Jsoncut MCP Server

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code and schemas (needed before npm ci because of prepare script)
COPY src/ ./src/
COPY schemas/ ./schemas/

# Install dependencies (this will also run prepare -> build)
RUN npm ci

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip prepare script)
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY schemas/ ./schemas/

# Copy documentation files (optional but included in npm package)
COPY README.md LICENSE CHANGELOG.md ./

# Set environment variables
ENV NODE_ENV=production

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the HTTP server
CMD ["node", "dist/http-server.js"]
