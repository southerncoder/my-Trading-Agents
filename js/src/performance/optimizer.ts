import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';

interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  updateAgeOnGet?: boolean;
}

interface RequestBatch {
  id: string;
  requests: Array<{
    id: string;
    provider: string;
    model: string;
    messages: any[];
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
  }>;
  timer?: NodeJS.Timeout;
}

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  batchEfficiency: number;
  memoryUsage: number;
}

class PerformanceOptimizer {
  private cache: LRUCache<string, any>;
  private requestBatches: Map<string, RequestBatch>;
  private batchTimeout: number = 100; // 100ms batch window
  private maxBatchSize: number = 5;
  private metrics: PerformanceMetrics;
  private requestQueue: Array<any> = [];
  private concurrentLimit: number = 5;
  private activeRequests: number = 0;

  constructor(
    cacheConfig: CacheConfig = { maxSize: 1000, ttl: 5 * 60 * 1000 }, // 5 minutes default
    concurrentLimit: number = 5
  ) {
    this.cache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
      updateAgeOnGet: cacheConfig.updateAgeOnGet ?? true
    });

    this.requestBatches = new Map();
    this.concurrentLimit = concurrentLimit;
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      batchEfficiency: 0,
      memoryUsage: 0
    };

    // Start processing queue
    this.processQueue();
  }

  /**
   * Cache management
   */
  public async getCached<T>(key: string): Promise<T | undefined> {
    const result = this.cache.get(key);
    if (result) {
      this.updateCacheHitRate(true);
      return result as T;
    }
    this.updateCacheHitRate(false);
    return undefined;
  }

  public setCache<T>(key: string, value: T, customTTL?: number): void {
    if (customTTL) {
      this.cache.set(key, value, { ttl: customTTL });
    } else {
      this.cache.set(key, value);
    }
  }

  public generateCacheKey(provider: string, model: string, messages: any[]): string {
    // Create a deterministic cache key
    const messageHash = this.hashMessages(messages);
    return `${provider}:${model}:${messageHash}`;
  }

  private hashMessages(messages: any[]): string {
    // Simple hash function for messages
    const str = JSON.stringify(messages);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Request batching
   */
  public async batchLLMRequest(
    provider: string,
    model: string,
    messages: any[],
    executor: (batch: any[]) => Promise<any[]>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const batchKey = `${provider}:${model}`;
      
      // Check cache first
      const cacheKey = this.generateCacheKey(provider, model, messages);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.updateCacheHitRate(true);
        resolve(cached);
        return;
      }
      this.updateCacheHitRate(false);

      // Add to batch
      let batch = this.requestBatches.get(batchKey);
      if (!batch) {
        batch = {
          id: batchKey,
          requests: []
        };
        this.requestBatches.set(batchKey, batch);
      }

      batch.requests.push({
        id: requestId,
        provider,
        model,
        messages,
        resolve,
        reject,
        timestamp: performance.now()
      });

      // Clear existing timer and set new one
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // Process batch when it's full or after timeout
      if (batch.requests.length >= this.maxBatchSize) {
        this.processBatch(batchKey, executor);
      } else {
        batch.timer = setTimeout(() => {
          this.processBatch(batchKey, executor);
        }, this.batchTimeout);
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processBatch(batchKey: string, executor: (batch: any[]) => Promise<any[]>): Promise<void> {
    const batch = this.requestBatches.get(batchKey);
    if (!batch || batch.requests.length === 0) return;

    // Remove batch from map
    this.requestBatches.delete(batchKey);

    // Clear timer
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    try {
      const startTime = performance.now();
      const results = await executor(batch.requests.map(req => req.messages));
      const duration = performance.now() - startTime;

      // Update metrics
      this.updatePerformanceMetrics(batch.requests.length, duration);

      // Resolve all requests with their results
      batch.requests.forEach((request, index) => {
        const result = results[index];
        
        // Cache the result
        const cacheKey = this.generateCacheKey(request.provider, request.model, request.messages);
        this.setCache(cacheKey, result);
        
        // Resolve the promise
        request.resolve(result);
      });

    } catch (error) {
      // Reject all requests in the batch
      batch.requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Concurrent request management
   */
  public async executeWithConcurrencyLimit<T>(
    asyncFunction: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: asyncFunction,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.concurrentLimit || this.requestQueue.length === 0) {
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      // Process next item in queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Memory management
   */
  public optimizeMemory(): void {
    // Clear cache if memory usage is high
    const memUsage = process.memoryUsage();
    const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (memoryPercentage > 80) {
      // Clear 50% of cache entries (LRU will handle this)
      const currentSize = this.cache.size;
      const targetSize = Math.floor(currentSize * 0.5);
      
      while (this.cache.size > targetSize) {
        // LRU cache will automatically remove oldest entries
        const keys = [...this.cache.keys()];
        if (keys.length > 0 && keys[0] !== undefined) {
          this.cache.delete(keys[0]);
        } else {
          break;
        }
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Metrics and monitoring
   */
  private updatePerformanceMetrics(batchSize: number, duration: number): void {
    this.metrics.requestCount += batchSize;
    
    // Update average response time
    const totalRequests = this.metrics.requestCount;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - batchSize)) + duration) / totalRequests;

    // Update batch efficiency (larger batches are more efficient)
    this.metrics.batchEfficiency = 
      ((this.metrics.batchEfficiency * (totalRequests - batchSize)) + batchSize) / totalRequests;

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private updateCacheHitRate(hit: boolean): void {
    const totalCacheChecks = this.metrics.requestCount;
    const currentHits = this.metrics.cacheHitRate * totalCacheChecks;
    
    this.metrics.cacheHitRate = hit 
      ? (currentHits + 1) / (totalCacheChecks + 1)
      : currentHits / (totalCacheChecks + 1);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Response time optimization
   */
  public async optimizeResponseTime<T>(
    primaryFunction: () => Promise<T>,
    fallbackFunction?: () => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    try {
      return await Promise.race([primaryFunction(), timeoutPromise]);
    } catch (error) {
      if (fallbackFunction && error instanceof Error && error.message === 'Request timeout') {
        console.warn('Primary function timed out, using fallback');
        return await fallbackFunction();
      }
      throw error;
    }
  }

  /**
   * Preload frequently used data
   */
  public async preloadCache(
    preloadFunctions: Array<{
      key: string;
      loader: () => Promise<any>;
      priority: number;
    }>
  ): Promise<void> {
    // Sort by priority (higher number = higher priority)
    const sortedFunctions = preloadFunctions.sort((a, b) => b.priority - a.priority);

    for (const { key, loader } of sortedFunctions) {
      try {
        if (!this.cache.has(key)) {
          const data = await loader();
          this.setCache(key, data);
        }
      } catch (error) {
        console.warn(`Failed to preload cache for key ${key}:`, error);
      }
    }
  }

  /**
   * Cleanup and resource management
   */
  public cleanup(): void {
    // Clear all batches
    for (const [key, batch] of this.requestBatches) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      // Reject pending requests
      batch.requests.forEach(request => {
        request.reject(new Error('Performance optimizer is shutting down'));
      });
    }
    this.requestBatches.clear();

    // Clear cache
    this.cache.clear();

    // Clear request queue
    this.requestQueue.forEach(request => {
      request.reject(new Error('Performance optimizer is shutting down'));
    });
    this.requestQueue = [];
  }
}

// Singleton instance for global use
const performanceOptimizer = new PerformanceOptimizer();

export { PerformanceOptimizer, performanceOptimizer, PerformanceMetrics, CacheConfig };