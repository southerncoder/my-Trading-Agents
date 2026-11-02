export interface SecurityConfig {
  rateLimit: {
    windowMs: number
    max: number
  }
  analysisRateLimit: {
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

export const securityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
    max: isDevelopment ? 1000 : 100 // More lenient in development
  },
  
  analysisRateLimit: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min in dev, 5 min in prod
    max: isDevelopment ? 100 : 10 // More lenient in development
  },
  
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'https://localhost:3000',
      ...(httpsEnabled ? ['https://localhost:3000', 'https://127.0.0.1:3000'] : []),
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
        "ws://localhost:3001", 
        "wss://localhost:3001",
        ...(httpsEnabled ? ["wss://localhost:3001", "https://localhost:3001"] : []),
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
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi
  ],
  
  sqlInjection: [
    /union.*select/gi,
    /insert.*into/gi,
    /delete.*from/gi,
    /update.*set/gi,
    /drop.*table/gi,
    /alter.*table/gi
  ],
  
  pathTraversal: [
    /\.\./g,
    /\/etc\/passwd/gi,
    /\/proc\/self\/environ/gi,
    /\/windows\/system32/gi
  ],
  
  codeInjection: [
    /eval\(/gi,
    /function\s*\(/gi,
    /setTimeout\(/gi,
    /setInterval\(/gi,
    /document\.cookie/gi,
    /window\.location/gi
  ]
}

// Trusted domains for external resources
export const trustedDomains = {
  fonts: ['fonts.googleapis.com', 'fonts.gstatic.com'],
  apis: ['api.tradingagents.local'], // Add your trusted API domains here
  websockets: ['ws://localhost:3001', 'wss://localhost:3001']
}