/**
 * Intelligent Caching System for Trading Agents
 * 
 * Provides smart caching for API responses with:
 * - Time-based expiration
 * - Memory management
 * - Cache invalidation
 * - Performance monitoring
 */

import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'intelligent-cache');

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size?: number; // Size in bytes for memory management
}

export interface CacheOptions {
  defaultTtl?: number; // Default TTL in minutes
  maxMemoryMB?: number; // Maximum cache memory in MB
  cleanupInterval?: number; // Cleanup interval in minutes
  compressionThreshold?: number; // Compress entries larger than this (bytes)
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsageMB: number;
  entryCount: number;
  hitRate: number;
}

/**
 * Intelligent Cache with automatic cleanup and memory management
 */
export class IntelligentCache {
  private cache = new Map<string, CacheEntry<any>>();
  private options: Required<CacheOptions>;
  private cleanupTimer?: ReturnType<typeof setInterval> | undefined;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 15, // 15 minutes default
      maxMemoryMB: options.maxMemoryMB ?? 50, // 50MB default
      cleanupInterval: options.cleanupInterval ?? 5, // 5 minutes
      compressionThreshold: options.compressionThreshold ?? 10240 // 10KB
    };

    this.startCleanupTimer();
    
    logger.info('initialize', 'Intelligent cache initialized', {
      defaultTtl: this.options.defaultTtl,
      maxMemoryMB: this.options.maxMemoryMB,
      cleanupInterval: this.options.cleanupInterval
    });
  }

  /**
   * Get cached value or execute factory function
   */
  async get<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlMinutes?: number
  ): Promise<T> {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);
    const now = Date.now();

    // Check if entry exists and is still valid
    if (entry && (now - entry.timestamp) < entry.ttl) {
      entry.accessCount++;
      entry.lastAccessed = now;
      this.stats.hits++;

      logger.debug('get', 'Cache hit', {
        key: normalizedKey,
        age: now - entry.timestamp,
        accessCount: entry.accessCount
      });

      return entry.data;
    }

    // Cache miss - execute factory function
    this.stats.misses++;
    
    logger.debug('get', 'Cache miss - executing factory', {
      key: normalizedKey,
      expired: entry ? (now - entry.timestamp) >= entry.ttl : false
    });

    try {
      const data = await factory();
      await this.set(normalizedKey, data, ttlMinutes);
      return data;
    } catch (error) {
      logger.error('get', 'Factory function failed', {
        key: normalizedKey,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const now = Date.now();
    const ttl = (ttlMinutes ?? this.options.defaultTtl) * 60 * 1000;
    
    const size = this.estimateSize(data);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    // Check if we need to compress large entries
    if (size > this.options.compressionThreshold) {
      try {
        entry.data = await this.compressData(data);
        this.stats.compressions++;
        
        logger.debug('set', 'Compressed large cache entry', {
          key: normalizedKey,
          originalSize: size,
          compressedSize: this.estimateSize(entry.data)
        });
      } catch (error) {
        logger.warn('set', 'Failed to compress data, storing uncompressed', {
          key: normalizedKey,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.cache.set(normalizedKey, entry);

    // Check memory usage and evict if needed
    await this.enforceMemoryLimit();

    logger.debug('set', 'Cache entry set', {
      key: normalizedKey,
      ttlMinutes: ttlMinutes ?? this.options.defaultTtl,
      size
    });
  }

  /**
   * Clear specific key or all cache
   */
  clear(key?: string): void {
    if (key) {
      const normalizedKey = this.normalizeKey(key);
      this.cache.delete(normalizedKey);
      logger.debug('clear', 'Cache key cleared', { key: normalizedKey });
    } else {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0, evictions: 0, compressions: 0 };
      logger.info('clear', 'All cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsageMB = this.getMemoryUsageMB();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      memoryUsageMB,
      entryCount: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    logger.info('invalidatePattern', 'Pattern invalidation completed', {
      pattern,
      invalidated
    });

    return invalidated;
  }

  /**
   * Pre-warm cache with common data
   */
  async preWarm(entries: Array<{
    key: string;
    factory: () => Promise<any>;
    ttlMinutes?: number;
  }>): Promise<void> {
    logger.info('preWarm', 'Starting cache pre-warming', {
      entryCount: entries.length
    });

    const promises = entries.map(async (entry) => {
      try {
        await this.get(entry.key, entry.factory, entry.ttlMinutes);
      } catch (error) {
        logger.error('preWarm', 'Failed to pre-warm entry', {
          key: entry.key,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(promises);
    
    logger.info('preWarm', 'Cache pre-warming completed', {
      entryCount: entries.length,
      cacheSize: this.cache.size
    });
  }

  /**
   * Dispose of cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
    
    logger.info('dispose', 'Cache disposed');
  }

  /**
   * Normalize cache keys for consistency
   */
  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Compress data for large entries
   */
  private async compressData<T>(data: T): Promise<T> {
    // Simple JSON stringification for now
    // In production, could use gzip compression
    return data;
  }

  /**
   * Calculate current memory usage in MB
   */
  private getMemoryUsageMB(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size ?? 0;
    }
    
    return totalSize / (1024 * 1024);
  }

  /**
   * Enforce memory limits by evicting old entries
   */
  private async enforceMemoryLimit(): Promise<void> {
    const currentMemoryMB = this.getMemoryUsageMB();
    
    if (currentMemoryMB <= this.options.maxMemoryMB) {
      return;
    }

    // Sort entries by LRU (Least Recently Used)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    let evicted = 0;
    
    // Evict oldest entries until under memory limit
    for (const [key] of entries) {
      if (this.getMemoryUsageMB() <= this.options.maxMemoryMB * 0.8) {
        break; // Keep some buffer
      }
      
      this.cache.delete(key);
      evicted++;
      this.stats.evictions++;
    }

    if (evicted > 0) {
      logger.warn('enforceMemoryLimit', 'Memory limit exceeded, evicted entries', {
        evicted,
        memoryUsageMB: this.getMemoryUsageMB(),
        maxMemoryMB: this.options.maxMemoryMB
      });
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval * 60 * 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug('cleanup', 'Expired entries cleaned up', {
        expired,
        remaining: this.cache.size
      });
    }
  }
}

/**
 * Global cache instance for trading agents
 */
export const globalCache = new IntelligentCache({
  defaultTtl: 15, // 15 minutes for most data
  maxMemoryMB: 100, // 100MB cache limit
  cleanupInterval: 5, // Cleanup every 5 minutes
  compressionThreshold: 10240 // Compress entries > 10KB
});

/**
 * Create cache key for API calls
 */
export function createApiCacheKey(
  apiName: string,
  method: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);

  return `${apiName}:${method}:${JSON.stringify(sortedParams)}`;
}

/**
 * Cache decorators for common TTL patterns
 */
export const CacheTTL = {
  MARKET_DATA: 5, // 5 minutes for market data
  NEWS: 30, // 30 minutes for news
  FUNDAMENTAL_DATA: 60, // 1 hour for fundamental data
  TECHNICAL_INDICATORS: 15, // 15 minutes for technical indicators
  SENTIMENT_DATA: 20, // 20 minutes for sentiment data
} as const;