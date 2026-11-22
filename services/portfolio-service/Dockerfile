FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
# SQL migrations and the screen universe are read at runtime next to the compiled code.
RUN mkdir -p dist/db/migrations dist/sources && cp src/db/migrations/*.sql dist/db/migrations/ && \
    (cp src/sources/*.json dist/sources/ 2>/dev/null || true)
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3008
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3008/api/portfolio/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
