/**
 * Performance Optimization Module Index
 * 
 * Centralized exports for all performance optimization components
 * including caching, database optimization, monitoring, and CI/CD integration.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

// Advanced Caching System
export {
  AdvancedCachingSystem,
  globalCache,
  type CacheConfig,
  type CacheStats,
  type CacheItem
} from './advanced-caching';

// Database Optimization
export {
  DatabaseOptimizer,
  OptimizedQueryBuilder,
  initializeDatabaseOptimizer,
  getDatabaseOptimizer,
  type DatabaseConfig,
  type ConnectionStats,
  type QueryMetrics
} from './database-optimization';

// Performance Monitoring
export {
  PerformanceMonitor,
  globalPerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceThresholds,
  type PerformanceAlert,
  type PerformanceBenchmark
} from './performance-monitor';

// Memory Optimization
export {
  MemoryOptimizer,
  globalMemoryOptimizer,
  type MemoryConfig,
  type MemoryMetrics,
  type MemoryLeak,
  type MemoryOptimizationResult
} from './memory-optimization';

// CI/CD Integration
export {
  CICDPerformanceTester,
  createDefaultTestSuite,
  type PerformanceTestSuite,
  type PerformanceTest,
  type PerformanceReport,
  type TestResult,
  type RegressionResult,
  type PerformanceBaseline
} from './ci-cd-integration';

/**
 * Initialize all performance optimization systems
 */
export async function initializePerformanceOptimization(config: {
  database?: any;
  cache?: any;
  monitoring?: any;
  memory?: any;
} = {}): Promise<void> {
  try {
    // Initialize database optimization if config provided
    if (config.database) {
      initializeDatabaseOptimizer(config.database);
    }

    // Performance monitoring is initialized globally
    // Memory optimization is initialized globally
    // Cache is initialized globally

    console.log('✅ Performance optimization systems initialized');
  } catch (error) {
    console.error('❌ Failed to initialize performance optimization:', error);
    throw error;
  }
}

/**
 * Get comprehensive performance status
 */
export function getPerformanceStatus(): {
  cache: any;
  memory: any;
  performance: any;
  database?: any;
} {
  const status = {
    cache: globalCache.getStats(),
    memory: globalMemoryOptimizer.getCurrentMetrics(),
    performance: globalPerformanceMonitor.getCurrentMetrics()
  };

  try {
    const dbOptimizer = getDatabaseOptimizer();
    (status as any).database = dbOptimizer.getStats();
  } catch (error) {
    // Database optimizer not initialized
  }

  return status;
}

/**
 * Optimize all performance systems
 */
export async function optimizeAllSystems(): Promise<{
  cache: boolean;
  memory: any;
  database?: boolean;
}> {
  const results = {
    cache: false,
    memory: null as any,
    database: undefined as boolean | undefined
  };

  try {
    // Optimize cache
    await globalCache.optimize();
    results.cache = true;

    // Optimize memory
    results.memory = await globalMemoryOptimizer.optimizeMemory();

    // Optimize database if available
    try {
      const dbOptimizer = getDatabaseOptimizer();
      await dbOptimizer.optimize();
      results.database = true;
    } catch (error) {
      // Database optimizer not initialized
    }

    return results;
  } catch (error) {
    console.error('Performance optimization failed:', error);
    throw error;
  }
}