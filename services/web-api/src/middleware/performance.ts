/**
 * Performance Middleware for Web API
 * 
 * Express middleware for API response time optimization,
 * request monitoring, and performance tracking.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { Request, Response, NextFunction } from 'express';
import { globalPerformanceMonitor } from '../../../trading-agents/src/performance/performance-monitor';
import { globalCache } from '../../../trading-agents/src/performance/advanced-caching';

export interface PerformanceMiddlewareConfig {
  enableCaching: boolean;
  cacheHeaders: boolean;
  compressionThreshold: number;
  slowRequestThreshold: number;
  enableMetrics: boolean;
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoring(config: Partial<PerformanceMiddlewareConfig> = {}) {
  const settings: PerformanceMiddlewareConfig = {
    enableCaching: config.enableCaching ?? true,
    cacheHeaders: config.cacheHeaders ?? true,
    compressionThreshold: config.compressionThreshold ?? 1024,
    slowRequestThreshold: config.slowRequestThreshold ?? 1000,
    enableMetrics: config.enableMetrics ?? true,
    ...config
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Add performance headers
    if (settings.cacheHeaders) {
      res.setHeader('X-Performance-Start', startTime.toString());
    }

    // Override res.json to add performance tracking
    const originalJson = res.json;
    res.json = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Record performance metrics
      if (settings.enableMetrics) {
        const success = res.statusCode < 400;
        globalPerformanceMonitor.recordRequest(duration, success);
      }
      
      // Add performance headers
      if (settings.cacheHeaders) {
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Performance-End', endTime.toString());
      }
      
      // Log slow requests
      if (duration > settings.slowRequestThreshold) {
        console.warn(`Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Response caching middleware
 */
export function responseCache(ttl: number = 300000) { // 5 minutes default
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `api_response:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get cached response
      const cached = await globalCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body: any) {
        // Cache successful responses
        if (res.statusCode < 400) {
          globalCache.set(cacheKey, body, ttl).catch(error => {
            console.warn('Failed to cache response:', error);
          });
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Request compression middleware
 */
export function requestCompression(threshold: number = 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add compression headers for responses above threshold
    const originalJson = res.json;
    res.json = function(body: any) {
      const bodySize = Buffer.byteLength(JSON.stringify(body), 'utf8');
      
      if (bodySize > threshold) {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('X-Original-Size', bodySize.toString());
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Memory usage monitoring middleware
 */
export function memoryMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const memBefore = process.memoryUsage();
    
    res.on('finish', () => {
      const memAfter = process.memoryUsage();
      const memDiff = {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        external: memAfter.external - memBefore.external
      };
      
      // Log significant memory increases
      if (memDiff.heapUsed > 10 * 1024 * 1024) { // 10MB
        console.warn(`High memory usage for request: ${req.method} ${req.path}`, {
          memoryIncrease: memDiff.heapUsed,
          totalHeap: memAfter.heapUsed
        });
      }
    });

    next();
  };
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeout: number = 30000) { // 30 seconds default
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: `Request exceeded ${timeout}ms timeout`
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
}

/**
 * API metrics collection middleware
 */
export function apiMetrics() {
  const requestCounts = new Map<string, number>();
  const responseTimes = new Map<string, number[]>();
  const errorCounts = new Map<string, number>();

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Increment request count
    requestCounts.set(endpoint, (requestCounts.get(endpoint) || 0) + 1);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Track response times
      const times = responseTimes.get(endpoint) || [];
      times.push(duration);
      responseTimes.set(endpoint, times.slice(-100)); // Keep last 100 requests
      
      // Track errors
      if (res.statusCode >= 400) {
        errorCounts.set(endpoint, (errorCounts.get(endpoint) || 0) + 1);
      }
      
      // Add metrics to response headers
      res.setHeader('X-Request-Count', requestCounts.get(endpoint)?.toString() || '0');
      res.setHeader('X-Average-Response-Time', 
        times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : '0'
      );
    });

    // Expose metrics endpoint
    if (req.path === '/api/metrics' && req.method === 'GET') {
      const metrics = {
        requests: Object.fromEntries(requestCounts),
        averageResponseTimes: Object.fromEntries(
          Array.from(responseTimes.entries()).map(([endpoint, times]) => [
            endpoint,
            times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
          ])
        ),
        errors: Object.fromEntries(errorCounts),
        cache: globalCache.getStats(),
        performance: globalPerformanceMonitor.getCurrentMetrics()
      };
      
      return res.json(metrics);
    }

    next();
  };
}

/**
 * Health check middleware with performance data
 */
export function healthCheck() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/health' && req.method === 'GET') {
      const metrics = globalPerformanceMonitor.getCurrentMetrics();
      const cacheStats = globalCache.getStats();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: metrics.memory.heapUsed,
          total: metrics.memory.heapTotal,
          usage: (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100
        },
        cpu: {
          usage: metrics.cpu.usage
        },
        cache: {
          hitRate: cacheStats.l1.hitRate,
          size: cacheStats.l1.size
        },
        api: {
          averageResponseTime: metrics.api.averageResponseTime,
          errorRate: metrics.api.errorRate
        }
      };
      
      return res.json(health);
    }

    next();
  };
}

/**
 * Combined performance middleware
 */
export function performanceMiddleware(config: Partial<PerformanceMiddlewareConfig> = {}) {
  return [
    performanceMonitoring(config),
    memoryMonitoring(),
    requestTimeout(30000),
    apiMetrics(),
    healthCheck()
  ];
}