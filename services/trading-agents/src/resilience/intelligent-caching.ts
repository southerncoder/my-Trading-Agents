/**
 * Intelligent Caching System
 * 
 * Implements multi-level caching strategy:
 * - L1: In-memory LRU cache for fastest access
 * - L2: Redis cache for distributed caching
 * - L3: Database cache for persistent storage
 * 
 * Features:
 * - Smart prefetching for frequently requested data
 * - Cache invalidation strategies (time-based, event-based)
 * - Cache optimization and memory management
 * - Performance metrics and monitoring
 * - Automatic cache warming and eviction
 */

import { LRUCache } from 'lru-cache';
import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/enhanced-logger.js';
import { TradingAgentError, ErrorType, ErrorSeverity, ErrorContext } from '../utils/trading-agent-error.js';
import { EventEmitter } from 'events';

const logger = createLogger('system', 'intelligent-caching');

// ========================================
// Cache Configuration Types
// ========================================

export interface CacheConfig {
  // L1 Cache (Memory) Configuration
  l1: {
    enabled: boolean;
    maxSize: number;
    maxAge: number; // TTL in milliseconds
    updateAgeOnGet: boolean;
    updateAgeOnHas: boolean;
  };
  
  // L2 Cache (Redis) Configuration
  l2: {
    enabled: boolean;
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    database?: number;
    keyPrefix: string;
    defaultTTL: number; // TTL in seconds
    maxRetries: number;
    retryDelay: number;
  };
  
  // L3 Cache (Database) Configuration
  l3: {
    enabled: boolean;
    tableName: string;
    defaultTTL: number; // TTL in seconds
    cleanupInterval: number; // Cleanup interval in milliseconds
  };
  
  // Prefetching Configuration
  prefetch: {
    enabled: boolean;
    threshold: number; // Access count threshold for prefetching
    batchSize: number;
    maxConcurrent: number;
  };
  
  // Performance Configuration
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
    compressionEnabled: boolean;
    compressionThreshold: number; // Size threshold for compression
  };
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  l1: {
    enabled: true,
    maxSize: 1000,
    maxAge: 5 * 60 * 1000, // 5 minutes
    updateAgeOnGet: true,
    updateAgeOnHas: true
  },
  l2: {
    enabled: process.env.REDIS_HOST ? true : false, // Auto-enable if Redis is configured
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'trading-agents:cache:',
    defaultTTL: 15 * 60, // 15 minutes
    maxRetries: 3,
    retryDelay: 1000
  },
  l3: {
    enabled: false, // Disabled by default, requires database setup
    tableName: 'cache_entries',
    defaultTTL: 60 * 60, // 1 hour
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },
  prefetch: {
    enabled: true,
    threshold: 3, // Prefetch after 3 accesses
    batchSize: 10,
    maxConcurrent: 5
  },
  performance: {
    enableMetrics: true,
    metricsInterval: 60 * 1000, // 1 minute
    compressionEnabled: true,
    compressionThreshold: 1024 // 1KB
  }
};

// ========================================
// Cache Entry Types
// ========================================

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
  size: number;
  compressed: boolean;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  l1: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    size: number;
    hitRate: number;
  };
  l2: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    hitRate: number;
  };
  l3: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
  };
  overall: {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    averageResponseTime: number;
    prefetchHits: number;
    compressionRatio: number;
  };
}

export interface PrefetchRequest {
  keys: string[];
  priority: 'high' | 'medium' | 'low';
  generator: (key: string) => Promise<any>;
  ttl?: number;
}

// ========================================
// Intelligent Cache Implementation
// ========================================

export class IntelligentCache extends EventEmitter {
  private config: CacheConfig;
  private l1Cache: LRUCache<string, CacheEntry>;
  private l2Client?: RedisClientType;
  private metrics: CacheMetrics;
  private accessPatterns: Map<string, { count: number; lastAccess: Date }> = new Map();
  private prefetchQueue: PrefetchRequest[] = [];
  private prefetchInProgress: Set<string> = new Set();
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = this.mergeConfig(config);
    
    // Initialize L1 cache (LRU)
    this.l1Cache = new LRUCache<string, CacheEntry>({
      max: this.config.l1.maxSize,
      ttl: this.config.l1.maxAge,
      updateAgeOnGet: this.config.l1.updateAgeOnGet,
      updateAgeOnHas: this.config.l1.updateAgeOnHas,
      dispose: (value, key) => {
        this.metrics.l1.evictions++;
        this.emit('evicted', { level: 'l1', key, value });
      }
    });
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    
    // Initialize L2 cache (Redis) if enabled
    if (this.config.l2.enabled) {
      this.initializeRedisCache();
    }
    
    // Start performance monitoring
    if (this.config.performance.enableMetrics) {
      this.startMetricsCollection();
    }
    
    // Start cleanup tasks
    if (this.config.l3.enabled) {
      this.startCleanupTasks();
    }
    
    logger.info('intelligent-cache-initialized', 'Intelligent caching system initialized', {
      l1Enabled: this.config.l1.enabled,
      l2Enabled: this.config.l2.enabled,
      l3Enabled: this.config.l3.enabled,
      prefetchEnabled: this.config.prefetch.enabled
    });
  }

  /**
   * Get value from cache with multi-level fallback
   */
  public async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Update access patterns
      this.updateAccessPattern(key);
      
      // Try L1 cache first
      if (this.config.l1.enabled) {
        const l1Entry = this.l1Cache.get(key);
        if (l1Entry && !this.isExpired(l1Entry)) {
          this.metrics.l1.hits++;
          this.updateEntryAccess(l1Entry);
          
          logger.debug('cache-hit-l1', `L1 cache hit for key: ${key}`, {
            key,
            responseTime: Date.now() - startTime
          });
          
          return l1Entry.value as T;
        } else {
          this.metrics.l1.misses++;
        }
      }
      
      // Try L2 cache (Redis)
      if (this.config.l2.enabled && this.l2Client) {
        try {
          const l2Value = await this.getFromRedis<T>(key);
          if (l2Value !== null) {
            this.metrics.l2.hits++;
            
            // Promote to L1 cache
            if (this.config.l1.enabled) {
              await this.setToL1(key, l2Value);
            }
            
            logger.debug('cache-hit-l2', `L2 cache hit for key: ${key}`, {
              key,
              responseTime: Date.now() - startTime
            });
            
            return l2Value;
          } else {
            this.metrics.l2.misses++;
          }
        } catch (error) {
          this.metrics.l2.errors++;
          logger.warn('cache-l2-error', `L2 cache error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Try L3 cache (Database) if enabled
      if (this.config.l3.enabled) {
        try {
          const l3Value = await this.getFromDatabase<T>(key);
          if (l3Value !== null) {
            this.metrics.l3.hits++;
            
            // Promote to higher levels
            if (this.config.l2.enabled) {
              await this.setToRedis(key, l3Value);
            }
            if (this.config.l1.enabled) {
              await this.setToL1(key, l3Value);
            }
            
            logger.debug('cache-hit-l3', `L3 cache hit for key: ${key}`, {
              key,
              responseTime: Date.now() - startTime
            });
            
            return l3Value;
          } else {
            this.metrics.l3.misses++;
          }
        } catch (error) {
          this.metrics.l3.errors++;
          logger.warn('cache-l3-error', `L3 cache error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Cache miss at all levels
      logger.debug('cache-miss-all', `Cache miss for key: ${key}`, {
        key,
        responseTime: Date.now() - startTime
      });
      
      // Check if we should prefetch this key
      this.considerPrefetch(key);
      
      return null;
      
    } catch (error) {
      logger.error('cache-get-error', `Cache get error for key: ${key}`, {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new TradingAgentError(
        `Cache get error: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        {
          component: 'IntelligentCache',
          operation: 'get',
          timestamp: new Date(),
          key
        }
      );
    }
  }

  /**
   * Set value in cache with multi-level storage
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const effectiveTTL = ttl || this.config.l2.defaultTTL;
      
      // Set in L1 cache
      if (this.config.l1.enabled) {
        await this.setToL1(key, value, effectiveTTL);
        this.metrics.l1.sets++;
      }
      
      // Set in L2 cache (Redis)
      if (this.config.l2.enabled && this.l2Client) {
        try {
          await this.setToRedis(key, value, effectiveTTL);
          this.metrics.l2.sets++;
        } catch (error) {
          this.metrics.l2.errors++;
          logger.warn('cache-l2-set-error', `L2 cache set error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Set in L3 cache (Database)
      if (this.config.l3.enabled) {
        try {
          await this.setToDatabase(key, value, effectiveTTL);
          this.metrics.l3.sets++;
        } catch (error) {
          this.metrics.l3.errors++;
          logger.warn('cache-l3-set-error', `L3 cache set error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      logger.debug('cache-set-success', `Cache set success for key: ${key}`, {
        key,
        ttl: effectiveTTL,
        responseTime: Date.now() - startTime
      });
      
      this.emit('set', { key, value, ttl: effectiveTTL });
      
    } catch (error) {
      logger.error('cache-set-error', `Cache set error for key: ${key}`, {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new TradingAgentError(
        `Cache set error: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        {
          component: 'IntelligentCache',
          operation: 'set',
          timestamp: new Date(),
          key
        }
      );
    }
  }

  /**
   * Delete value from all cache levels
   */
  public async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    try {
      // Delete from L1 cache
      if (this.config.l1.enabled) {
        const l1Deleted = this.l1Cache.delete(key);
        if (l1Deleted) {
          this.metrics.l1.deletes++;
          deleted = true;
        }
      }
      
      // Delete from L2 cache (Redis)
      if (this.config.l2.enabled && this.l2Client) {
        try {
          const redisKey = this.config.l2.keyPrefix + key;
          const l2Deleted = await this.l2Client.del(redisKey);
          if (l2Deleted > 0) {
            this.metrics.l2.deletes++;
            deleted = true;
          }
        } catch (error) {
          this.metrics.l2.errors++;
          logger.warn('cache-l2-delete-error', `L2 cache delete error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Delete from L3 cache (Database)
      if (this.config.l3.enabled) {
        try {
          const l3Deleted = await this.deleteFromDatabase(key);
          if (l3Deleted) {
            this.metrics.l3.deletes++;
            deleted = true;
          }
        } catch (error) {
          this.metrics.l3.errors++;
          logger.warn('cache-l3-delete-error', `L3 cache delete error for key: ${key}`, {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Remove from access patterns
      this.accessPatterns.delete(key);
      
      if (deleted) {
        this.emit('deleted', { key });
      }
      
      return deleted;
      
    } catch (error) {
      logger.error('cache-delete-error', `Cache delete error for key: ${key}`, {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }

  /**
   * Clear all cache levels
   */
  public async clear(): Promise<void> {
    try {
      // Clear L1 cache
      if (this.config.l1.enabled) {
        this.l1Cache.clear();
      }
      
      // Clear L2 cache (Redis)
      if (this.config.l2.enabled && this.l2Client) {
        try {
          const pattern = this.config.l2.keyPrefix + '*';
          const keys = await this.l2Client.keys(pattern);
          if (keys.length > 0) {
            await this.l2Client.del(keys);
          }
        } catch (error) {
          logger.warn('cache-l2-clear-error', 'L2 cache clear error', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Clear L3 cache (Database)
      if (this.config.l3.enabled) {
        try {
          await this.clearDatabase();
        } catch (error) {
          logger.warn('cache-l3-clear-error', 'L3 cache clear error', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Clear access patterns
      this.accessPatterns.clear();
      
      // Reset metrics
      this.metrics = this.initializeMetrics();
      
      logger.info('cache-cleared', 'All cache levels cleared');
      this.emit('cleared');
      
    } catch (error) {
      logger.error('cache-clear-error', 'Cache clear error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new TradingAgentError(
        `Cache clear error: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.MEDIUM,
        {
          component: 'IntelligentCache',
          operation: 'clear',
          timestamp: new Date()
        }
      );
    }
  }

  /**
   * Prefetch data for multiple keys
   */
  public async prefetch(request: PrefetchRequest): Promise<void> {
    if (!this.config.prefetch.enabled) {
      return;
    }
    
    this.prefetchQueue.push(request);
    await this.processPrefetchQueue();
  }

  /**
   * Get cache statistics
   */
  public getMetrics(): CacheMetrics {
    // Update hit rates
    this.updateHitRates();
    
    return { ...this.metrics };
  }

  /**
   * Get cache size information
   */
  public getSizeInfo() {
    return {
      l1: {
        size: this.l1Cache.size,
        maxSize: this.config.l1.maxSize,
        utilizationPercent: (this.l1Cache.size / this.config.l1.maxSize) * 100
      },
      accessPatterns: this.accessPatterns.size,
      prefetchQueue: this.prefetchQueue.length,
      prefetchInProgress: this.prefetchInProgress.size
    };
  }

  /**
   * Optimize cache performance
   */
  public async optimize(): Promise<void> {
    try {
      // Clean expired entries from L1
      this.cleanExpiredL1Entries();
      
      // Optimize access patterns
      this.optimizeAccessPatterns();
      
      // Process prefetch queue
      await this.processPrefetchQueue();
      
      logger.info('cache-optimized', 'Cache optimization completed', {
        l1Size: this.l1Cache.size,
        accessPatterns: this.accessPatterns.size,
        prefetchQueue: this.prefetchQueue.length
      });
      
      this.emit('optimized');
      
    } catch (error) {
      logger.error('cache-optimize-error', 'Cache optimization error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  public async destroy(): Promise<void> {
    try {
      // Stop intervals
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // Close Redis connection
      if (this.l2Client) {
        await this.l2Client.quit();
      }
      
      // Clear all caches
      await this.clear();
      
      // Remove all listeners
      this.removeAllListeners();
      
      logger.info('cache-destroyed', 'Intelligent cache destroyed');
      
    } catch (error) {
      logger.error('cache-destroy-error', 'Cache destroy error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<CacheConfig>): CacheConfig {
    return {
      l1: { ...DEFAULT_CACHE_CONFIG.l1, ...config.l1 },
      l2: { ...DEFAULT_CACHE_CONFIG.l2, ...config.l2 },
      l3: { ...DEFAULT_CACHE_CONFIG.l3, ...config.l3 },
      prefetch: { ...DEFAULT_CACHE_CONFIG.prefetch, ...config.prefetch },
      performance: { ...DEFAULT_CACHE_CONFIG.performance, ...config.performance }
    };
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): CacheMetrics {
    return {
      l1: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        size: 0,
        hitRate: 0
      },
      l2: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        connectionStatus: 'disconnected',
        hitRate: 0
      },
      l3: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0
      },
      overall: {
        totalHits: 0,
        totalMisses: 0,
        overallHitRate: 0,
        averageResponseTime: 0,
        prefetchHits: 0,
        compressionRatio: 0
      }
    };
  }

  /**
   * Initialize Redis cache connection
   */
  private async initializeRedisCache(): Promise<void> {
    try {
      const redisConfig: any = {
        socket: {
          host: this.config.l2.host,
          port: this.config.l2.port
        },
        database: this.config.l2.database
      };
      
      if (this.config.l2.password) {
        redisConfig.password = this.config.l2.password;
      }
      
      if (this.config.l2.url) {
        redisConfig.url = this.config.l2.url;
      }
      
      this.l2Client = createClient(redisConfig);
      
      this.l2Client.on('error', (error) => {
        this.metrics.l2.connectionStatus = 'error';
        logger.error('redis-connection-error', 'Redis connection error', {
          error: error.message
        });
      });
      
      this.l2Client.on('connect', () => {
        this.metrics.l2.connectionStatus = 'connected';
        logger.info('redis-connected', 'Redis cache connected');
      });
      
      this.l2Client.on('end', () => {
        this.metrics.l2.connectionStatus = 'disconnected';
        logger.info('redis-disconnected', 'Redis cache disconnected');
      });
      
      await this.l2Client.connect();
      
    } catch (error) {
      logger.error('redis-init-error', 'Redis initialization error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Disable L2 cache if Redis fails to initialize
      this.config.l2.enabled = false;
    }
  }

  /**
   * Set value to L1 cache
   */
  private async setToL1<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: new Date(),
      ttl: ttl || this.config.l1.maxAge / 1000,
      accessCount: 1,
      lastAccessed: new Date(),
      size: this.calculateSize(value),
      compressed: false
    };
    
    this.l1Cache.set(key, entry, { ttl: ttl ? ttl * 1000 : undefined });
  }

  /**
   * Get value from Redis
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.l2Client) return null;
    
    const redisKey = this.config.l2.keyPrefix + key;
    const value = await this.l2Client.get(redisKey);
    
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        logger.warn('redis-parse-error', `Redis parse error for key: ${key}`, {
          key,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    }
    
    return null;
  }

  /**
   * Set value to Redis
   */
  private async setToRedis<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.l2Client) return;
    
    const redisKey = this.config.l2.keyPrefix + key;
    const serializedValue = JSON.stringify(value);
    const effectiveTTL = ttl || this.config.l2.defaultTTL;
    
    await this.l2Client.setEx(redisKey, effectiveTTL, serializedValue);
  }

  /**
   * Get value from database (placeholder - requires database implementation)
   */
  private async getFromDatabase<T>(key: string): Promise<T | null> {
    // This would be implemented with actual database queries
    // For now, return null as L3 cache is disabled by default
    return null;
  }

  /**
   * Set value to database (placeholder - requires database implementation)
   */
  private async setToDatabase<T>(key: string, value: T, ttl?: number): Promise<void> {
    // This would be implemented with actual database queries
    // For now, do nothing as L3 cache is disabled by default
  }

  /**
   * Delete value from database (placeholder - requires database implementation)
   */
  private async deleteFromDatabase(key: string): Promise<boolean> {
    // This would be implemented with actual database queries
    // For now, return false as L3 cache is disabled by default
    return false;
  }

  /**
   * Clear database cache (placeholder - requires database implementation)
   */
  private async clearDatabase(): Promise<void> {
    // This would be implemented with actual database queries
    // For now, do nothing as L3 cache is disabled by default
  }

  /**
   * Update access pattern for a key
   */
  private updateAccessPattern(key: string): void {
    const pattern = this.accessPatterns.get(key) || { count: 0, lastAccess: new Date() };
    pattern.count++;
    pattern.lastAccess = new Date();
    this.accessPatterns.set(key, pattern);
  }

  /**
   * Update entry access information
   */
  private updateEntryAccess(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = new Date();
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    const ttlMs = entry.ttl * 1000;
    
    return (now - entryTime) > ttlMs;
  }

  /**
   * Consider prefetching for a key
   */
  private considerPrefetch(key: string): void {
    if (!this.config.prefetch.enabled) return;
    
    const pattern = this.accessPatterns.get(key);
    if (pattern && pattern.count >= this.config.prefetch.threshold) {
      // This key is accessed frequently, consider it for prefetching
      // Implementation would depend on specific use case
      logger.debug('prefetch-candidate', `Key ${key} is a prefetch candidate`, {
        key,
        accessCount: pattern.count
      });
    }
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) return;
    
    const batch = this.prefetchQueue.splice(0, this.config.prefetch.batchSize);
    const concurrentPromises: Promise<void>[] = [];
    
    for (const request of batch) {
      if (concurrentPromises.length >= this.config.prefetch.maxConcurrent) {
        await Promise.race(concurrentPromises);
      }
      
      const promise = this.processPrefetchRequest(request);
      concurrentPromises.push(promise);
    }
    
    await Promise.allSettled(concurrentPromises);
  }

  /**
   * Process individual prefetch request
   */
  private async processPrefetchRequest(request: PrefetchRequest): Promise<void> {
    for (const key of request.keys) {
      if (this.prefetchInProgress.has(key)) continue;
      
      this.prefetchInProgress.add(key);
      
      try {
        // Check if key is already cached
        const cached = await this.get(key);
        if (cached !== null) {
          this.metrics.overall.prefetchHits++;
          continue;
        }
        
        // Generate and cache the value
        const value = await request.generator(key);
        await this.set(key, value, request.ttl);
        
        logger.debug('prefetch-success', `Prefetched key: ${key}`, { key });
        
      } catch (error) {
        logger.warn('prefetch-error', `Prefetch error for key: ${key}`, {
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.prefetchInProgress.delete(key);
      }
    }
  }

  /**
   * Calculate size of value for metrics
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  /**
   * Clean expired entries from L1 cache
   */
  private cleanExpiredL1Entries(): void {
    // LRU cache handles this automatically, but we can force cleanup
    const sizeBefore = this.l1Cache.size;
    
    // Iterate through entries and check expiration
    for (const [key, entry] of this.l1Cache.entries()) {
      if (this.isExpired(entry)) {
        this.l1Cache.delete(key);
      }
    }
    
    const sizeAfter = this.l1Cache.size;
    const cleaned = sizeBefore - sizeAfter;
    
    if (cleaned > 0) {
      logger.debug('l1-cleanup', `Cleaned ${cleaned} expired entries from L1 cache`, {
        cleaned,
        sizeBefore,
        sizeAfter
      });
    }
  }

  /**
   * Optimize access patterns by removing old entries
   */
  private optimizeAccessPatterns(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const sizeBefore = this.accessPatterns.size;
    
    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.lastAccess.getTime() < cutoffTime) {
        this.accessPatterns.delete(key);
      }
    }
    
    const sizeAfter = this.accessPatterns.size;
    const cleaned = sizeBefore - sizeAfter;
    
    if (cleaned > 0) {
      logger.debug('access-patterns-cleanup', `Cleaned ${cleaned} old access patterns`, {
        cleaned,
        sizeBefore,
        sizeAfter
      });
    }
  }

  /**
   * Update hit rates in metrics
   */
  private updateHitRates(): void {
    // L1 hit rate
    const l1Total = this.metrics.l1.hits + this.metrics.l1.misses;
    this.metrics.l1.hitRate = l1Total > 0 ? this.metrics.l1.hits / l1Total : 0;
    
    // L2 hit rate
    const l2Total = this.metrics.l2.hits + this.metrics.l2.misses;
    this.metrics.l2.hitRate = l2Total > 0 ? this.metrics.l2.hits / l2Total : 0;
    
    // L3 hit rate
    const l3Total = this.metrics.l3.hits + this.metrics.l3.misses;
    this.metrics.l3.hitRate = l3Total > 0 ? this.metrics.l3.hits / l3Total : 0;
    
    // Overall hit rate
    this.metrics.overall.totalHits = this.metrics.l1.hits + this.metrics.l2.hits + this.metrics.l3.hits;
    this.metrics.overall.totalMisses = this.metrics.l1.misses + this.metrics.l2.misses + this.metrics.l3.misses;
    const overallTotal = this.metrics.overall.totalHits + this.metrics.overall.totalMisses;
    this.metrics.overall.overallHitRate = overallTotal > 0 ? this.metrics.overall.totalHits / overallTotal : 0;
    
    // Update L1 size
    this.metrics.l1.size = this.l1Cache.size;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateHitRates();
      
      this.emit('metricsUpdated', this.getMetrics());
      
      logger.debug('cache-metrics', 'Cache metrics updated', {
        l1HitRate: this.metrics.l1.hitRate,
        l2HitRate: this.metrics.l2.hitRate,
        overallHitRate: this.metrics.overall.overallHitRate,
        l1Size: this.metrics.l1.size
      });
    }, this.config.performance.metricsInterval);
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.optimize();
    }, this.config.l3.cleanupInterval);
  }
}

// ========================================
// Factory Functions
// ========================================

/**
 * Create intelligent cache with provider-specific configuration
 */
export function createIntelligentCache(
  providerType: 'news' | 'social' | 'fundamentals' | 'market_data',
  customConfig?: Partial<CacheConfig>
): IntelligentCache {
  const providerConfigs = {
    news: {
      l1: { maxSize: 500, maxAge: 3 * 60 * 1000 }, // 3 minutes
      l2: { keyPrefix: 'trading-agents:news:', defaultTTL: 10 * 60 } // 10 minutes
    },
    social: {
      l1: { maxSize: 300, maxAge: 5 * 60 * 1000 }, // 5 minutes
      l2: { keyPrefix: 'trading-agents:social:', defaultTTL: 15 * 60 } // 15 minutes
    },
    fundamentals: {
      l1: { maxSize: 1000, maxAge: 10 * 60 * 1000 }, // 10 minutes
      l2: { keyPrefix: 'trading-agents:fundamentals:', defaultTTL: 30 * 60 } // 30 minutes
    },
    market_data: {
      l1: { maxSize: 2000, maxAge: 1 * 60 * 1000 }, // 1 minute
      l2: { keyPrefix: 'trading-agents:market:', defaultTTL: 5 * 60 } // 5 minutes
    }
  };
  
  const config = {
    ...providerConfigs[providerType],
    ...customConfig
  };
  
  return new IntelligentCache(config);
}

/**
 * Global cache manager for multiple cache instances
 */
export class CacheManager {
  private caches: Map<string, IntelligentCache> = new Map();

  /**
   * Register a cache instance
   */
  public register(name: string, cache: IntelligentCache): void {
    this.caches.set(name, cache);
  }

  /**
   * Get cache instance by name
   */
  public get(name: string): IntelligentCache | undefined {
    return this.caches.get(name);
  }

  /**
   * Get all cache metrics
   */
  public getAllMetrics(): Record<string, CacheMetrics> {
    const metrics: Record<string, CacheMetrics> = {};
    
    for (const [name, cache] of this.caches) {
      metrics[name] = cache.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Optimize all caches
   */
  public async optimizeAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.optimize());
    await Promise.allSettled(promises);
  }

  /**
   * Clear all caches
   */
  public async clearAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.clear());
    await Promise.allSettled(promises);
  }

  /**
   * Destroy all caches
   */
  public async destroyAll(): Promise<void> {
    const promises = Array.from(this.caches.values()).map(cache => cache.destroy());
    await Promise.allSettled(promises);
    this.caches.clear();
  }
}