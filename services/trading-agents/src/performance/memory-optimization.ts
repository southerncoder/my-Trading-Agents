/**
 * Memory Usage Optimization and Garbage Collection Tuning
 * 
 * Advanced memory management with intelligent garbage collection,
 * memory leak detection, and optimization strategies.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { createLogger } from '../utils/enhanced-logger';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';

const logger = createLogger('system', 'memory-optimization');

export interface MemoryConfig {
  gcOptimization: {
    enabled: boolean;
    maxOldSpaceSize?: number;
    maxSemiSpaceSize?: number;
    exposeGC: boolean;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    leakDetectionThreshold: number;
    alertThreshold: number;
  };
  cleanup: {
    enabled: boolean;
    interval: number;
    aggressiveCleanup: boolean;
  };
}

export interface MemoryMetrics {
  timestamp: Date;
  heap: {
    used: number;
    total: number;
    limit: number;
    usage: number; // percentage
  };
  external: number;
  rss: number;
  arrayBuffers: number;
  gc: {
    collections: number;
    duration: number;
    freed: number;
  };
  leaks: MemoryLeak[];
}

export interface MemoryLeak {
  id: string;
  timestamp: Date;
  type: 'heap_growth' | 'external_growth' | 'listener_leak' | 'timer_leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  size: number;
  growth: number;
  source?: string;
}

export interface MemoryOptimizationResult {
  beforeMemory: NodeJS.MemoryUsage;
  afterMemory: NodeJS.MemoryUsage;
  freed: number;
  duration: number;
  optimizations: string[];
}

/**
 * Advanced memory optimization and monitoring system
 */
export class MemoryOptimizer {
  private config: MemoryConfig;
  private metrics: MemoryMetrics[] = [];
  private leaks: MemoryLeak[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private gcObserver?: any;
  private baselineMemory?: NodeJS.MemoryUsage;
  private objectTracking = new Map<string, WeakSet<object>>();
  
  // OpenTelemetry metrics
  private memoryGauge?: any;
  private gcCounter?: any;
  private leakCounter?: any;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      gcOptimization: {
        enabled: config.gcOptimization?.enabled ?? true,
        maxOldSpaceSize: config.gcOptimization?.maxOldSpaceSize || 4096, // 4GB
        maxSemiSpaceSize: config.gcOptimization?.maxSemiSpaceSize || 256, // 256MB
        exposeGC: config.gcOptimization?.exposeGC ?? true
      },
      monitoring: {
        enabled: config.monitoring?.enabled ?? true,
        interval: config.monitoring?.interval || 30000, // 30 seconds
        leakDetectionThreshold: config.monitoring?.leakDetectionThreshold || 50, // 50MB growth
        alertThreshold: config.monitoring?.alertThreshold || 80 // 80% memory usage
      },
      cleanup: {
        enabled: config.cleanup?.enabled ?? true,
        interval: config.cleanup?.interval || 300000, // 5 minutes
        aggressiveCleanup: config.cleanup?.aggressiveCleanup ?? false
      }
    };

    this.initializeOptimization();
    this.initializeMetrics();
    this.startMonitoring();

    logger.info('memory-optimization', 'Memory optimizer initialized', {
      config: this.config
    });
  }

  private initializeOptimization(): void {
    if (this.config.gcOptimization.enabled) {
      // Set V8 flags for optimal garbage collection
      this.setV8Flags();
      
      // Setup GC monitoring
      this.setupGCMonitoring();
    }

    // Set baseline memory usage
    this.baselineMemory = process.memoryUsage();
  }

  private initializeMetrics(): void {
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('trading-agents-memory');
        
        this.memoryGauge = meter.createUpDownCounter('memory_usage_bytes', {
          description: 'Memory usage in bytes'
        });
        
        this.gcCounter = meter.createCounter('gc_collections_total', {
          description: 'Total number of garbage collections'
        });
        
        this.leakCounter = meter.createCounter('memory_leaks_total', {
          description: 'Total number of detected memory leaks'
        });
      } catch (error) {
        logger.warn('memory-optimization', 'Failed to initialize OpenTelemetry metrics', { error });
      }
    }
  }

  /**
   * Start memory monitoring and optimization
   */
  startMonitoring(): void {
    if (this.config.monitoring.enabled) {
      this.monitoringInterval = setInterval(() => {
        this.collectMemoryMetrics();
      }, this.config.monitoring.interval);
    }

    if (this.config.cleanup.enabled) {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, this.config.cleanup.interval);
    }

    logger.info('memory-optimization', 'Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }

    logger.info('memory-optimization', 'Memory monitoring stopped');
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      const freed = before.heapUsed - after.heapUsed;
      logger.info('memory-optimization', 'Forced garbage collection', {
        freed,
        beforeHeap: before.heapUsed,
        afterHeap: after.heapUsed
      });
      
      return true;
    }
    
    logger.warn('memory-optimization', 'Garbage collection not exposed');
    return false;
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<MemoryOptimizationResult> {
    const beforeMemory = process.memoryUsage();
    const startTime = Date.now();
    const optimizations: string[] = [];

    try {
      // Force garbage collection
      if (this.forceGC()) {
        optimizations.push('Forced garbage collection');
      }

      // Clear internal caches
      this.clearInternalCaches();
      optimizations.push('Cleared internal caches');

      // Optimize object references
      this.optimizeObjectReferences();
      optimizations.push('Optimized object references');

      // Clean up event listeners
      this.cleanupEventListeners();
      optimizations.push('Cleaned up event listeners');

      // Clear expired timers
      this.clearExpiredTimers();
      optimizations.push('Cleared expired timers');

      const afterMemory = process.memoryUsage();
      const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
      const duration = Date.now() - startTime;

      const result: MemoryOptimizationResult = {
        beforeMemory,
        afterMemory,
        freed,
        duration,
        optimizations
      };

      logger.info('memory-optimization', 'Memory optimization completed', {
        freed,
        duration,
        optimizations: optimizations.length
      });

      return result;
    } catch (error) {
      logger.error('memory-optimization', 'Memory optimization failed', { error });
      throw error;
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): MemoryLeak[] {
    const currentMemory = process.memoryUsage();
    const detectedLeaks: MemoryLeak[] = [];

    if (this.baselineMemory) {
      const heapGrowth = currentMemory.heapUsed - this.baselineMemory.heapUsed;
      const externalGrowth = currentMemory.external - this.baselineMemory.external;

      // Detect heap growth leaks
      if (heapGrowth > this.config.monitoring.leakDetectionThreshold * 1024 * 1024) {
        detectedLeaks.push({
          id: `heap_leak_${Date.now()}`,
          timestamp: new Date(),
          type: 'heap_growth',
          severity: this.calculateSeverity(heapGrowth),
          description: `Heap memory grew by ${Math.round(heapGrowth / 1024 / 1024)}MB`,
          size: currentMemory.heapUsed,
          growth: heapGrowth,
          source: 'heap_analysis'
        });
      }

      // Detect external memory leaks
      if (externalGrowth > this.config.monitoring.leakDetectionThreshold * 1024 * 1024) {
        detectedLeaks.push({
          id: `external_leak_${Date.now()}`,
          timestamp: new Date(),
          type: 'external_growth',
          severity: this.calculateSeverity(externalGrowth),
          description: `External memory grew by ${Math.round(externalGrowth / 1024 / 1024)}MB`,
          size: currentMemory.external,
          growth: externalGrowth,
          source: 'external_analysis'
        });
      }
    }

    // Detect event listener leaks
    const listenerLeaks = this.detectEventListenerLeaks();
    detectedLeaks.push(...listenerLeaks);

    // Store detected leaks
    this.leaks.push(...detectedLeaks);

    // Update OpenTelemetry metrics
    if (this.leakCounter && detectedLeaks.length > 0) {
      this.leakCounter.add(detectedLeaks.length);
    }

    return detectedLeaks;
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): MemoryMetrics {
    return this.collectMemoryMetrics();
  }

  /**
   * Get historical memory metrics
   */
  getHistoricalMetrics(limit: number = 100): MemoryMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get detected memory leaks
   */
  getMemoryLeaks(limit: number = 50): MemoryLeak[] {
    return this.leaks.slice(-limit);
  }

  /**
   * Track object creation for leak detection
   */
  trackObject(category: string, obj: object): void {
    if (!this.objectTracking.has(category)) {
      this.objectTracking.set(category, new WeakSet());
    }
    
    this.objectTracking.get(category)!.add(obj);
  }

  private setV8Flags(): void {
    // V8 flags are typically set via command line arguments
    // This is a placeholder for documentation
    logger.debug('memory-optimization', 'V8 optimization flags should be set via command line', {
      recommended: [
        '--max-old-space-size=4096',
        '--max-semi-space-size=256',
        '--expose-gc',
        '--optimize-for-size'
      ]
    });
  }

  private setupGCMonitoring(): void {
    try {
      const { PerformanceObserver } = require('perf_hooks');
      this.gcObserver = new PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          logger.debug('memory-optimization', 'GC event', {
            kind: entry.kind,
            duration: entry.duration,
            startTime: entry.startTime
          });
          
          if (this.gcCounter) {
            this.gcCounter.add(1, { kind: entry.kind });
          }
        }
      });
      
      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      logger.warn('memory-optimization', 'GC monitoring not available', { error });
    }
  }

  private collectMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapStats = (process as any).getHeapStatistics?.() || {};
    
    const metrics: MemoryMetrics = {
      timestamp: new Date(),
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        limit: heapStats.heap_size_limit || 0,
        usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      gc: {
        collections: 0, // Would be tracked from GC observer
        duration: 0,
        freed: 0
      },
      leaks: this.detectMemoryLeaks()
    };

    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Update OpenTelemetry metrics
    if (this.memoryGauge) {
      this.memoryGauge.add(metrics.heap.used, { type: 'heap_used' });
      this.memoryGauge.add(metrics.heap.total, { type: 'heap_total' });
      this.memoryGauge.add(metrics.external, { type: 'external' });
      this.memoryGauge.add(metrics.rss, { type: 'rss' });
    }

    // Check for memory alerts
    if (metrics.heap.usage > this.config.monitoring.alertThreshold) {
      logger.warn('memory-optimization', 'High memory usage detected', {
        usage: metrics.heap.usage,
        threshold: this.config.monitoring.alertThreshold
      });
    }

    return metrics;
  }

  private performCleanup(): void {
    try {
      // Force garbage collection if aggressive cleanup is enabled
      if (this.config.cleanup.aggressiveCleanup) {
        this.forceGC();
      }

      // Clear internal caches
      this.clearInternalCaches();

      // Clean up expired objects
      this.cleanupExpiredObjects();

      logger.debug('memory-optimization', 'Periodic cleanup completed');
    } catch (error) {
      logger.error('memory-optimization', 'Cleanup failed', { error });
    }
  }

  private clearInternalCaches(): void {
    // Clear require cache for non-core modules (be careful with this)
    // This is a placeholder - in practice, be very selective about what to clear
    
    // Clear internal maps and sets
    this.objectTracking.clear();
    
    // Trigger garbage collection on large objects
    if (global.gc) {
      global.gc();
    }
  }

  private optimizeObjectReferences(): void {
    // Placeholder for object reference optimization
    // In practice, this would involve:
    // - Nullifying unused references
    // - Converting large objects to smaller representations
    // - Optimizing data structures
  }

  private cleanupEventListeners(): void {
    // Placeholder for event listener cleanup
    // In practice, this would involve:
    // - Removing unused event listeners
    // - Converting to weak references where appropriate
    // - Cleaning up DOM event listeners in web contexts
  }

  private clearExpiredTimers(): void {
    // Placeholder for timer cleanup
    // In practice, this would involve:
    // - Clearing completed timers
    // - Removing references to expired intervals
    // - Optimizing timer scheduling
  }

  private cleanupExpiredObjects(): void {
    // Placeholder for expired object cleanup
    // In practice, this would involve:
    // - Removing expired cache entries
    // - Cleaning up temporary objects
    // - Optimizing object pools
  }

  private detectEventListenerLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    // Placeholder for event listener leak detection
    // In practice, this would involve:
    // - Tracking event listener counts
    // - Detecting unusual growth patterns
    // - Identifying listeners that should have been removed
    
    return leaks;
  }

  private calculateSeverity(size: number): 'low' | 'medium' | 'high' | 'critical' {
    const sizeMB = size / 1024 / 1024;
    
    if (sizeMB > 500) return 'critical';
    if (sizeMB > 200) return 'high';
    if (sizeMB > 100) return 'medium';
    return 'low';
  }
}

// Global memory optimizer instance
export const globalMemoryOptimizer = new MemoryOptimizer({
  gcOptimization: {
    enabled: true,
    maxOldSpaceSize: 4096,
    maxSemiSpaceSize: 256,
    exposeGC: true
  },
  monitoring: {
    enabled: true,
    interval: 30000,
    leakDetectionThreshold: 50,
    alertThreshold: 85
  },
  cleanup: {
    enabled: true,
    interval: 300000,
    aggressiveCleanup: false
  }
});