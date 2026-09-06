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
	&& rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source into builder (no browser install required - runtime uses Playwright official image)
COPY . .


### Runtime stage: smaller image with only necessary files ###
FROM mcr.microsoft.com/playwright:latest AS runtime
WORKDIR /app

# Install minimal runtime dependencies required by Playwright (shared libs)
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
	&& rm -rf /var/lib/apt/lists/*

# Copy app code and node_modules from builder (production deps)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Playwright official runtime includes browsers and OS deps; no browser cache copy required

EXPOSE 3010
CMD ["node","src/index.js"]
