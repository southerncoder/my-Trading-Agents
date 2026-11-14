### Builder stage: install production dependencies ###
FROM node:24-bookworm-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app


# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force


# Copy source code into builder
COPY src ./src
COPY healthcheck.cjs ./healthcheck.cjs


### Runtime stage: smaller image with only necessary files ###
FROM mcr.microsoft.com/playwright:v1.65.0-noble AS runtime
WORKDIR /app

# The Playwright image already ships browsers and OS libraries; add only what the service needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (Debian-compatible)
RUN groupadd -g 10001 nodejs && \
    useradd -u 10001 -r -g nodejs -M -s /usr/sbin/nologin newsaggregator

# Copy runtime app and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
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