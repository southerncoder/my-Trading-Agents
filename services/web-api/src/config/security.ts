export interface SecurityConfig {
  rateLimit: {
    windowMs: number
    max: number
  }
  cors: {
    allowedOrigins: string[]
  }
  csp: {
    directives: Record<string, string[]>
  }
  hsts: {
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'
const httpsEnabled = process.env.HTTPS_ENABLED === 'true'
// Host-published ports (custom, non-default); override via FRONTEND_PORT / WEB_API_PORT
const FRONTEND_PORT = process.env.FRONTEND_PORT || '38400'
const PUBLIC_API_PORT = process.env.WEB_API_PORT || '38401'

export const securityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
    max: isDevelopment ? 1000 : 100 // More lenient in development
  },
  
  
  cors: {
    allowedOrigins: [
      `http://localhost:${FRONTEND_PORT}`,
      `http://127.0.0.1:${FRONTEND_PORT}`,
      'https://localhost:' + FRONTEND_PORT,
      ...(httpsEnabled ? ['https://localhost:' + FRONTEND_PORT, 'https://127.0.0.1:' + FRONTEND_PORT] : []),
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ].filter(Boolean)
  },
  
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'", 
        `ws://localhost:${PUBLIC_API_PORT}`, 
        `wss://localhost:${PUBLIC_API_PORT}`,
        ...(httpsEnabled ? [`wss://localhost:${PUBLIC_API_PORT}`, `https://localhost:${PUBLIC_API_PORT}`] : []),
        ...(isDevelopment ? ["ws://localhost:*", "http://localhost:*", "https://localhost:*"] : [])
      ],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(isProduction ? { upgradeInsecureRequests: [] } : {})
    }
  },
  
  hsts: {
    maxAge: (isProduction || httpsEnabled) ? 31536000 : 0, // 1 year when using HTTPS
    includeSubDomains: true,
    preload: isProduction
  }
}

// Security headers for different endpoint types
export const securityHeaders = {
  // Standard headers for all responses
  standard: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none'
  },
  
  // Additional headers for API responses
  api: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  },
  
  // Headers for sensitive trading data
  sensitive: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Referrer-Policy': 'no-referrer'
  }
}

// Input validation patterns
export const securityPatterns = {
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /\bon[a-z]+\s*=/i, // an event handler attribute (onclick=), not words like confidence=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i
  ],
  
  sqlInjection: [
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i,
    /drop.*table/i,
    /alter.*table/i
  ],
  
  pathTraversal: [
    /\.\./,
    /\/etc\/passwd/i,
    /\/proc\/self\/environ/i,
    /\/windows\/system32/i
  ],
  
  codeInjection: [
    /eval\(/i,
    /function\s*\(/i,
    /setTimeout\(/i,
    /setInterval\(/i,
    /document\.cookie/i,
    /window\.location/i
  ]
}

// Trusted domains for external resources
export const trustedDomains = {
  fonts: ['fonts.googleapis.com', 'fonts.gstatic.com'],
  apis: ['api.tradingagents.local'], // Add your trusted API domains here
  websockets: [`ws://localhost:${PUBLIC_API_PORT}`, `wss://localhost:${PUBLIC_API_PORT}`]
}