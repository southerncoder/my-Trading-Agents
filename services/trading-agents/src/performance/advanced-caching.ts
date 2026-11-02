/**
 * Advanced Caching System for High-Frequency Data Access
 * 
 * Multi-tier caching strategy with intelligent cache management,
 * performance optimization, and comprehensive monitoring.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { CacheableMemory } from 'cacheable';
import { createLogger } from '../utils/enhanced-logger';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';

const logger = createLogger('system', 'advanced-caching');

export interface CacheConfig {
  l1: {
    ttl: number;
    maxSize: number;
    checkInterval: number;
  };
  l2?: {
    ttl: number;
    maxSize: number;
  };
  prefetch: {
    enabled: boolean;
    threshold: number;
    batchSize: number;
  };
  compression: {
    enabled: boolean;
    threshold: number; // bytes
  };
}

export interface CacheStats {
  l1: {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };
  l2?: {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  };
  prefetch: {
    requests: number;
    successes: number;
    failures: number;
  };
  performance: {
    averageGetTime: number;
    averageSetTime: number;
    totalOperations: number;
  };
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl?: number;
  compressed?: boolean;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

/**
 * Advanced multi-tier caching system with intelligent prefetching
 */
export class AdvancedCachingSystem {
  private l1Cache: CacheableMemory;
  private l2Cache?: CacheableMemory;
  private config: CacheConfig;
  private stats: CacheStats;
  private prefetchQueue: Set<string> = new Set();
  private accessPatterns: Map<string, number[]> = new Map();
  
  // OpenTelemetry metrics
  private cacheHitCounter?: any;
  private cacheMissCounter?: any;
  private cacheOperationDuration?: any;
  private cacheSizeGauge?: any;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      l1: {
        ttl: config.l1?.ttl || 5 * 60 * 1000, // 5 minutes
        maxSize: config.l1?.maxSize || 1000,
        checkInterval: config.l1?.checkInterval || 60 * 1000 // 1 minute
      },
      l2: config.l2 ? {
        ttl: config.l2.ttl || 30 * 60 * 1000, // 30 minutes
        maxSize: config.l2.maxSize || 5000
      } : undefined,
      prefetch: {
        enabled: config.prefetch?.enabled ?? true,
        threshold: config.prefetch?.threshold || 0.8, // 80% hit rate threshold
        batchSize: config.prefetch?.batchSize || 10
      },
      compression: {
        enabled: config.compression?.enabled ?? true,
        threshold: config.compression?.threshold || 1024 // 1KB
      }
    };

    this.initializeCaches();
    this.initializeStats();
    this.initializeMetrics();
    this.startMaintenanceTasks();

    logger.info('advanced-caching', 'Advanced caching system initialized', {
      l1Config: this.config.l1,
      l2Enabled: !!this.config.l2,
      prefetchEnabled: this.config.prefetch.enabled
    });
  }

  private initializeCaches(): void {
    // L1 Cache - High-speed in-memory cache
    this.l1Cache = new CacheableMemory({
      ttl: this.config.l1.ttl,
      lruSize: this.config.l1.maxSize,
      checkInterval: this.config.l1.checkInterval,
      useClones: true
    });

    // L2 Cache - Larger, longer-lived cache
    if (this.config.l2) {
      this.l2Cache = new CacheableMemory({
        ttl: this.config.l2.ttl,
        lruSize: this.config.l2.maxSize,
        useClones: true
      });
    }
  }

  private initializeStats(): void {
    this.stats = {
      l1: { hits: 0, misses: 0, size: 0, hitRate: 0 },
      l2: this.config.l2 ? { hits: 0, misses: 0, size: 0, hitRate: 0 } : undefined,
      prefetch: { requests: 0, successes: 0, failures: 0 },
      performance: { averageGetTime: 0, averageSetTime: 0, totalOperations: 0 }
    };
  }

  private initializeMetrics(): void {
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('trading-agents-cache');
        
        this.cacheHitCounter = meter.createCounter('cache_hits_total', {
          description: 'Total number of cache hits'
        });
        
        this.cacheMissCounter = meter.createCounter('cache_misses_total', {
          description: 'Total number of cache misses'
        });
        
        this.cacheOperationDuration = meter.createHistogram('cache_operation_duration_ms', {
          description: 'Duration of cache operations in milliseconds'
        });
        
        this.cacheSizeGauge = meter.createUpDownCounter('cache_size_items', {
          description: 'Current number of items in cache'
        });
      } catch (error) {
        logger.warn('advanced-caching', 'Failed to initialize OpenTelemetry metrics', { error });
      }
    }
  }

  /**
   * Get value from cache with intelligent fallback
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try L1 cache first
      let value = this.l1Cache.get(key) as T;
      if (value !== undefined) {
        this.recordHit('l1');
        this.recordAccess(key);
        this.recordOperationTime('get', Date.now() - startTime);
        return value;
      }

      // Try L2 cache if available
      if (this.l2Cache) {
        value = this.l2Cache.get(key) as T;
        if (value !== undefined) {
          this.recordHit('l2');
          // Promote to L1 cache
          this.l1Cache.set(key, value);
          this.recordAccess(key);
          this.recordOperationTime('get', Date.now() - startTime);
          return value;
        }
      }

      // Cache miss
      this.recordMiss();
      this.recordOperationTime('get', Date.now() - startTime);
      return null;
    } catch (error) {
      logger.error('advanced-caching', 'Cache get operation failed', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with intelligent storage
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      const serializedValue = this.serializeValue(value);
      const compressed = this.shouldCompress(serializedValue);
      const finalValue = compressed ? this.compress(serializedValue) : serializedValue;

      // Always store in L1
      this.l1Cache.set(key, finalValue, ttl || this.config.l1.ttl);

      // Store in L2 if available and value is significant
      if (this.l2Cache && this.shouldStoreInL2(key, finalValue)) {
        this.l2Cache.set(key, finalValue, ttl || this.config.l2!.ttl);
      }

      this.recordAccess(key);
      this.recordOperationTime('set', Date.now() - startTime);
      this.updateCacheSize();

      logger.debug('advanced-caching', 'Value cached successfully', {
        key,
        compressed,
        size: this.getValueSize(finalValue)
      });
    } catch (error) {
      logger.error('advanced-caching', 'Cache set operation failed', { key, error });
    }
  }

  /**
   * Get or set value with function
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFunction();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Batch get multiple keys
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async setMany<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const promises = items.map(({ key, value, ttl }) => this.set(key, value, ttl));
    await Promise.all(promises);
  }

  /**
   * Delete key from all cache levels
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.l2Cache) {
      this.l2Cache.delete(key);
    }
    this.accessPatterns.delete(key);
    this.updateCacheSize();
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    if (this.l2Cache) {
      this.l2Cache.clear();
    }
    this.accessPatterns.clear();
    this.prefetchQueue.clear();
    this.initializeStats();
    this.updateCacheSize();
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Prefetch data based on access patterns
   */
  async prefetch(keys: string[], fetchFunction: (key: string) => Promise<any>): Promise<void> {
    if (!this.config.prefetch.enabled) {
      return;
    }

    const batchSize = this.config.prefetch.batchSize;
    const batches = this.chunkArray(keys, batchSize);

    for (const batch of batches) {
      const promises = batch.map(async (key) => {
        if (!this.prefetchQueue.has(key)) {
          this.prefetchQueue.add(key);
          try {
            const value = await fetchFunction(key);
            await this.set(key, value);
            this.stats.prefetch.successes++;
          } catch (error) {
            this.stats.prefetch.failures++;
            logger.warn('advanced-caching', 'Prefetch failed', { key, error });
          } finally {
            this.prefetchQueue.delete(key);
          }
        }
      });

      await Promise.all(promises);
      this.stats.prefetch.requests += batch.length;
    }
  }

  /**
   * Optimize cache performance
   */
  async optimize(): Promise<void> {
    try {
      // Remove expired items
      this.l1Cache.checkExpired();
      if (this.l2Cache) {
        this.l2Cache.checkExpired();
      }

      // Analyze access patterns for intelligent prefetching
      this.analyzeAccessPatterns();

      // Update cache size metrics
      this.updateCacheSize();

      logger.debug('advanced-caching', 'Cache optimization completed');
    } catch (error) {
      logger.error('advanced-caching', 'Cache optimization failed', { error });
    }
  }

  private recordHit(level: 'l1' | 'l2'): void {
    this.stats[level]!.hits++;
    if (this.cacheHitCounter) {
      this.cacheHitCounter.add(1, { level });
    }
  }

  private recordMiss(): void {
    this.stats.l1.misses++;
    if (this.l2Cache) {
      this.stats.l2!.misses++;
    }
    if (this.cacheMissCounter) {
      this.cacheMissCounter.add(1);
    }
  }

  private recordAccess(key: string): void {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || [];
    pattern.push(now);
    
    // Keep only recent access times (last hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentAccesses = pattern.filter(time => time > oneHourAgo);
    this.accessPatterns.set(key, recentAccesses);
  }

  private recordOperationTime(operation: 'get' | 'set', duration: number): void {
    this.stats.performance.totalOperations++;
    const currentAvg = operation === 'get' 
      ? this.stats.performance.averageGetTime 
      : this.stats.performance.averageSetTime;
    
    const newAvg = (currentAvg + duration) / 2;
    
    if (operation === 'get') {
      this.stats.performance.averageGetTime = newAvg;
    } else {
      this.stats.performance.averageSetTime = newAvg;
    }

    if (this.cacheOperationDuration) {
      this.cacheOperationDuration.record(duration, { operation });
    }
  }

  private updateStats(): void {
    const l1Total = this.stats.l1.hits + this.stats.l1.misses;
    this.stats.l1.hitRate = l1Total > 0 ? this.stats.l1.hits / l1Total : 0;
    this.stats.l1.size = this.l1Cache.size;

    if (this.stats.l2) {
      const l2Total = this.stats.l2.hits + this.stats.l2.misses;
      this.stats.l2.hitRate = l2Total > 0 ? this.stats.l2.hits / l2Total : 0;
      this.stats.l2.size = this.l2Cache?.size || 0;
    }
  }

  private updateCacheSize(): void {
    if (this.cacheSizeGauge) {
      this.cacheSizeGauge.add(this.l1Cache.size, { level: 'l1' });
      if (this.l2Cache) {
        this.cacheSizeGauge.add(this.l2Cache.size, { level: 'l2' });
      }
    }
  }

  private serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private shouldCompress(value: string): boolean {
    return this.config.compression.enabled && 
           Buffer.byteLength(value, 'utf8') > this.config.compression.threshold;
  }

  private compress(value: string): string {
    // Simple compression placeholder - in production, use zlib
    return value;
  }

  private shouldStoreInL2(key: string, value: any): boolean {
    // Store in L2 if frequently accessed or large
    const accessCount = this.accessPatterns.get(key)?.length || 0;
    const size = this.getValueSize(value);
    return accessCount > 2 || size > 1024;
  }

  private getValueSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  private analyzeAccessPatterns(): void {
    // Identify frequently accessed keys for prefetching
    const now = Date.now();
    const frequentKeys: string[] = [];

    for (const [key, accesses] of this.accessPatterns.entries()) {
      if (accesses.length >= 3) { // Accessed 3+ times recently
        frequentKeys.push(key);
      }
    }

    logger.debug('advanced-caching', 'Access pattern analysis completed', {
      totalKeys: this.accessPatterns.size,
      frequentKeys: frequentKeys.length
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private startMaintenanceTasks(): void {
    // Periodic optimization
    setInterval(() => {
      this.optimize().catch(error => {
        logger.error('advanced-caching', 'Scheduled optimization failed', { error });
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    // Periodic stats update
    setInterval(() => {
      this.updateStats();
    }, 30 * 1000); // Every 30 seconds
  }
}

// Global cache instance
export const globalCache = new AdvancedCachingSystem({
  l1: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 2000,
    checkInterval: 60 * 1000
  },
  l2: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 10000
  },
  prefetch: {
    enabled: true,
    threshold: 0.8,
    batchSize: 20
  },
  compression: {
    enabled: true,
    threshold: 2048 // 2KB
  }
});