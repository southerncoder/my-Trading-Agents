# Multi-stage build for Trading Agents CLI
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and configs
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite*.config.ts ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trading -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=trading:nodejs /app/dist ./dist
COPY --from=builder --chown=trading:nodejs /app/package.json ./

# Copy CLI entry point
COPY --chown=trading:nodejs cli.js ./

# Create data directories with proper permissions
RUN mkdir -p /app/.tradingagents /app/data /app/logs /app/exports && \
    chown -R trading:nodejs /app/.tradingagents /app/data /app/logs /app/exports

# Switch to non-root user
USER trading

# Expose port (if needed for web interface in future)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command - run interactive menu
CMD ["node", "cli.js", "menu"]