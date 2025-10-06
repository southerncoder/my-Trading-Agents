### Builder stage: install dependencies and Playwright browsers ###
FROM node:18-bullseye AS builder
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libnss3 \
    libpango-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force


# Copy source code into builder
COPY src ./src
COPY healthcheck.cjs ./healthcheck.cjs


### Runtime stage: smaller image with only necessary files ###
FROM mcr.microsoft.com/playwright:latest AS runtime
WORKDIR /app

# Install minimal runtime dependencies required by Playwright (shared libs) and dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libnss3 \
    libpango-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (Debian-compatible)
RUN groupadd -g 1001 nodejs || true && \
    useradd -u 1001 -r -g nodejs -M -s /usr/sbin/nologin newsaggregator || true

# Copy runtime app and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/healthcheck.cjs ./healthcheck.cjs

# Make health check script executable
RUN chmod +x healthcheck.cjs

# Set permissions and switch to non-root user
RUN chown -R newsaggregator:nodejs /app
USER newsaggregator

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.cjs

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]