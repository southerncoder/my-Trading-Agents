# Yahoo Finance Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    (id -u yahooapp 2>/dev/null || adduser -S yahooapp -u 1001 -G nodejs)

# Copy source code
COPY src/ ./src/

# Change ownership
RUN chown -R yahooapp:nodejs /app
USER yahooapp

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the service
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]