import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { securityConfig, securityHeaders, securityPatterns } from '../config/security.js'

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health'
})

// Stricter rate limiting for analysis endpoints
export const analysisRateLimit = rateLimit({
  windowMs: securityConfig.analysisRateLimit.windowMs,
  max: securityConfig.analysisRateLimit.max,
  message: {
    success: false,
    error: 'Too many analysis requests. Please wait before starting another analysis.',
    code: 'ANALYSIS_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const allPatterns = [
    ...securityPatterns.xss,
    ...securityPatterns.sqlInjection,
    ...securityPatterns.pathTraversal,
    ...securityPatterns.codeInjection
  ]

  const checkForMaliciousContent = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return allPatterns.some(pattern => pattern.test(obj))
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForMaliciousContent(value))
    }
    return false
  }

  if (req.body && checkForMaliciousContent(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected. Request blocked for security reasons.',
      code: 'INVALID_INPUT'
    })
  }

  // Check query parameters as well
  if (req.query && checkForMaliciousContent(req.query)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters detected. Request blocked for security reasons.',
      code: 'INVALID_QUERY'
    })
  }

  // Check URL path for malicious patterns
  if (allPatterns.some(pattern => pattern.test(req.url))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL detected. Request blocked for security reasons.',
      code: 'INVALID_URL'
    })
  }

  next()
}

// Request size validation
export const validateRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      success: false,
      error: 'Request payload too large',
      code: 'PAYLOAD_TOO_LARGE'
    })
  }
  next()
}

// Security headers middleware for sensitive endpoints
export const sensitiveEndpointHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Apply standard security headers
  Object.entries(securityHeaders.standard).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  
  // Apply sensitive data headers
  Object.entries(securityHeaders.sensitive).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  
  next()
}

// CORS validation middleware
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin')
  
  if (origin && !securityConfig.cors.allowedOrigins.includes(origin)) {
    console.warn(`🚨 SECURITY WARNING: Blocked request from unauthorized origin: ${origin}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    })
    
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed',
      code: 'ORIGIN_NOT_ALLOWED'
    })
  }

  next()
}

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./g, // Directory traversal
    /union.*select/gi, // SQL injection
    /<script/gi, // XSS attempts
    /eval\(/gi, // Code injection
    /document\.cookie/gi, // Cookie theft attempts
  ]

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  })

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestData) || pattern.test(req.url)
  )

  if (isSuspicious) {
    console.warn(`🚨 SECURITY WARNING: Suspicious request detected`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      body: req.body,
      query: req.query
    })
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`)
  })

  next()
}