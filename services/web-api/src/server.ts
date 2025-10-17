import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { readFileSync } from 'fs'
import { join } from 'path'
import { analysisRoutes } from './routes/analysis.js'
import { symbolRoutes } from './routes/symbols.js'
import { healthRoutes } from './routes/health.js'
import { setupWebSocket } from './websocket/index.js'
import {
  apiRateLimit,
  analysisRateLimit,
  validateInput,
  validateRequestSize,
  sensitiveEndpointHeaders,
  validateOrigin,
  securityLogger
} from './middleware/security.js'
import { securityConfig, securityHeaders } from './config/security.js'
import { performanceMiddleware, responseCache } from './middleware/performance.js'

const app = express()
const PORT = process.env.PORT || 3001
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true'

// Enhanced Security Middleware
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: securityConfig.csp.directives,
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false,

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "same-origin" },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frame Options
  frameguard: { action: "deny" },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS (when using HTTPS)
  hsts: securityConfig.hsts,

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Note: Permissions Policy is handled via nginx headers

  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-XSS-Protection
  xssFilter: true,
}))

app.use(cors({
  origin: securityConfig.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}))

app.use(express.json({
  limit: '10mb',
  strict: true,
  type: 'application/json'
}))
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 100
}))

// Additional security middleware
app.use((_req, res, next) => {
  // Remove sensitive headers that might leak information
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')

  // Add standard security headers
  Object.entries(securityHeaders.standard).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  // Add API-specific headers
  Object.entries(securityHeaders.api).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  // Add custom headers
  res.setHeader('X-API-Version', '1.0.0')
  res.setHeader('X-Service', 'TradingAgents-API')

  next()
})

// Security middleware
app.use(securityLogger)
app.use(validateRequestSize)
app.use(validateInput)
app.use(validateOrigin)
app.use(apiRateLimit)

// Performance middleware
app.use(performanceMiddleware({
  enableCaching: true,
  cacheHeaders: true,
  compressionThreshold: 1024,
  slowRequestThreshold: 1000,
  enableMetrics: true
}))

// Response caching for GET requests
app.use(responseCache(300000)) // 5 minutes cache

// Routes with security middleware
app.use('/api/health', healthRoutes)
app.use('/api/symbols', sensitiveEndpointHeaders, symbolRoutes)
app.use('/api/analysis', sensitiveEndpointHeaders, analysisRateLimit, analysisRoutes)

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  })
})

// Create HTTP or HTTPS server
let server: ReturnType<typeof createServer> | ReturnType<typeof createHttpsServer>

if (HTTPS_ENABLED) {
  try {
    const certsDir = join(process.cwd(), 'certs')
    const httpsOptions = {
      key: readFileSync(join(certsDir, 'api-key.pem')),
      cert: readFileSync(join(certsDir, 'api-cert.pem'))
    }
    server = createHttpsServer(httpsOptions, app)
    console.log('🔒 HTTPS enabled for secure local development')
  } catch (error) {
    console.warn('⚠️  HTTPS certificates not found, falling back to HTTP')
    console.warn('   Run: npm run generate-certs to create certificates')
    server = createServer(app)
  }
} else {
  server = createServer(app)
}

// Setup WebSocket
const wss = new WebSocketServer({ server, path: '/ws' })
setupWebSocket(wss)

// Start server
server.listen(PORT, () => {
  const protocol = HTTPS_ENABLED ? 'https' : 'http'
  const wsProtocol = HTTPS_ENABLED ? 'wss' : 'ws'
  
  console.log(`🚀 TradingAgents Web API server running on ${protocol}://localhost:${PORT}`)
  console.log(`📡 WebSocket server available at ${wsProtocol}://localhost:${PORT}/ws`)
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  
  if (HTTPS_ENABLED) {
    console.log('🔒 HTTPS is enabled for secure local development')
  } else {
    console.log('🔓 HTTP mode - set HTTPS_ENABLED=true for secure development')
  }
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})