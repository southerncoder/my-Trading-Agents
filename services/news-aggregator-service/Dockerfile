# News Aggregator Service Dockerfile
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
    adduser -S newsaggregator -u 1001

# Copy source code and health check script
COPY src/ ./src/
COPY healthcheck.js ./healthcheck.js

# Make health check script executable
RUN chmod +x healthcheck.js

# Change ownership of the app directory
RUN chown -R newsaggregator:nodejs /app
USER newsaggregator

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]