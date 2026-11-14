### Builder stage: install production dependencies ###
FROM node:24-bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app


# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source into builder (no browser install required - runtime uses Playwright official image)
COPY . .


### Runtime stage: smaller image with only necessary files ###
FROM mcr.microsoft.com/playwright:v1.65.0-noble AS runtime
WORKDIR /app

# The Playwright image already ships browsers and OS libraries; add only what the service needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy app code and node_modules from builder (production deps)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Playwright official runtime includes browsers and OS deps; no browser cache copy required

EXPOSE 3010
CMD ["node","src/index.js"]
