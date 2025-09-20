/**
 * Memory Optimization Engine
 *
 * Implements advanced caching, memoization, and computational optimization
 * strategies for real-time trading operations. Provides significant performance
 * improvements for large pattern datasets while maintaining accuracy.
 */

import { MemoryUtils } from './memory-utils';
import { MarketPattern } from './memory-consolidation-layer';

export class MemoryOptimizationEngine {
  private static readonly CACHE_CONFIG = {
    similarity_cache_size: 10000,      // Maximum cached similarity calculations
    pattern_cache_ttl: 300000,         // Pattern cache TTL (5 minutes)
    score_cache_size: 5000,            // Maximum cached pattern scores
    consolidation_cache_size: 1000,    // Maximum cached consolidations
    cleanup_interval: 60000            // Cache cleanup interval (1 minute)
  };

  private static readonly OPTIMIZATION_SETTINGS = {
    batch_size: 100,                   // Optimal batch size for processing
    parallel_threshold: 50,            // Minimum patterns for parallel processing
    similarity_precision: 0.001,      // Similarity calculation precision
    early_termination_threshold: 0.95, // Early termination for high similarity
    memory_limit_mb: 500              // Memory usage limit
  };

  // Performance caches with LRU eviction
  private static similarityCache = new Map<string, { similarity: number; timestamp: number }>();
  private static patternScoreCache = new Map<string, { score: any; timestamp: number }>();
  private static consolidationCache = new Map<string, { result: MarketPattern; timestamp: number }>();

  // Performance metrics
  private static performanceMetrics = {
    cache_hits: 0,
    cache_misses: 0,
    total_calculations: 0,
    avg_calculation_time: 0,
    memory_usage_mb: 0
  };

  // Periodic cleanup timer
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize optimization engine with periodic cleanup
   */
  static initializeOptimization(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, this.CACHE_CONFIG.cleanup_interval);
  }

  /**
   * Shutdown optimization engine
   */
  static shutdownOptimization(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clearAllCaches();
  }

  /**
   * Optimized pattern similarity calculation with caching
   */
  static calculateOptimizedSimilarity(pattern1: MarketPattern, pattern2: MarketPattern): number {
    const startTime = performance.now();

    // Create cache key (order-independent)
    const cacheKey = this.createSimilarityCacheKey(pattern1.pattern_id, pattern2.pattern_id);

    // Check cache first
    const cached = this.similarityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.similarity;
    }

    // Calculate similarity with optimizations
    const similarity = this.computeOptimizedSimilarity(pattern1, pattern2);

    // Cache result with LRU eviction
    this.cacheSimilarityResult(cacheKey, similarity);

    // Update performance metrics
    this.updatePerformanceMetrics(startTime);
    this.performanceMetrics.cache_misses++;

    return similarity;
  }

  /**
   * Batch process patterns with optimized performance
   */
  static batchProcessPatternsOptimized<T>(
    patterns: MarketPattern[],
    processor: (batch: MarketPattern[]) => T[],
    options?: {
      batch_size?: number;
      parallel?: boolean;
      progress_callback?: (processed: number, total: number) => void;
    }
  ): T[] {
    const batchSize = options?.batch_size || this.OPTIMIZATION_SETTINGS.batch_size;
    const useParallel = options?.parallel && patterns.length >= this.OPTIMIZATION_SETTINGS.parallel_threshold;

    const results: T[] = [];
    const batches: MarketPattern[][] = [];

    // Create batches
    for (let i = 0; i < patterns.length; i += batchSize) {
      batches.push(patterns.slice(i, i + batchSize));
    }

    if (useParallel) {
      // Parallel processing for large datasets
      // Note: In a real implementation, you'd use Worker threads or similar
      // For now, we'll process sequentially but with optimizations
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (batch) {
          const batchResults = processor(batch);
          results.push(...batchResults);
          options?.progress_callback?.((i + 1) * batchSize, patterns.length);
        }
      }
    } else {
      // Sequential processing with optimizations
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (batch) {
          const batchResults = processor(batch);
          results.push(...batchResults);
          options?.progress_callback?.((i + 1) * batchSize, patterns.length);
        }
      }
    }

    return results;
  }

  /**
   * Optimized pattern scoring with caching and early termination
   */
  static scorePatternOptimized(
    pattern: MarketPattern,
    context: any,
    criteria: any
  ): any {
    const cacheKey = this.createScoreCacheKey(pattern.pattern_id, context, criteria);

    // Check score cache
    const cached = this.patternScoreCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.score;
    }

    // Calculate score with optimizations
    const scoreResult = this.calculatePatternScore(pattern, context);

    // Apply early termination for obviously poor patterns
    if (scoreResult.overall_score < 0.1) {
      const earlyResult = {
        overall_score: scoreResult.overall_score,
        dimension_scores: { early_terminated: true },
        confidence_intervals: { lower: 0, upper: 0.2 },
        scoring_metadata: { early_termination: true }
      };

      this.cacheScoreResult(cacheKey, earlyResult);
      return earlyResult;
    }

    // Cache full result
    this.cacheScoreResult(cacheKey, scoreResult);
    this.performanceMetrics.cache_misses++;

    return scoreResult;
  }

  /**
   * Optimized pattern consolidation with intelligent caching
   */
  static consolidatePatternsOptimized(patterns: MarketPattern[]): MarketPattern {
    if (patterns.length === 0) {
      throw new Error('Cannot consolidate empty pattern array');
    }

    if (patterns.length === 1) {
      const firstPattern = patterns[0];
      if (!firstPattern) {
        throw new Error('Pattern array contains undefined values');
      }
      return firstPattern;
    }

    // Create consolidation cache key
    const cacheKey = this.createConsolidationCacheKey(patterns);

    // Check consolidation cache
    const cached = this.consolidationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_CONFIG.pattern_cache_ttl) {
      this.performanceMetrics.cache_hits++;
      return cached.result;
    }

    // Perform optimized consolidation
    const startTime = performance.now();

    // Pre-filter patterns for efficiency
    const filteredPatterns = patterns.filter(p =>
      p && p.learning_metrics.reliability_score >= 0.3 &&
      p.learning_metrics.observation_count >= 3
    );

    if (filteredPatterns.length === 0) {
      const firstPattern = patterns[0];
      if (!firstPattern) {
        throw new Error('No valid patterns for consolidation');
      }
      return firstPattern; // Fallback to first pattern
    }

    // Use optimized merging
    const consolidated = MemoryUtils.mergePatterns(filteredPatterns);

    // Cache result
    this.cacheConsolidationResult(cacheKey, consolidated);
    this.updatePerformanceMetrics(startTime);

    return consolidated;
  }

  /**
   * Memory-efficient similarity matrix calculation
   */
  static calculateSimilarityMatrixOptimized(
    patterns: MarketPattern[],
    options?: {
      symmetric?: boolean;
      sparse_threshold?: number;
      max_comparisons?: number;
    }
  ): Map<string, Map<string, number>> {
    const symmetric = options?.symmetric ?? true;
    const sparseThreshold = options?.sparse_threshold ?? 0.1;
    const maxComparisons = options?.max_comparisons ?? 50000;

    const matrix = new Map<string, Map<string, number>>();
    let comparisons = 0;

    for (let i = 0; i < patterns.length && comparisons < maxComparisons; i++) {
      const pattern1 = patterns[i];
      if (!pattern1) continue;

      const row = new Map<string, number>();
      matrix.set(pattern1.pattern_id, row);

      const startJ = symmetric ? i + 1 : 0;
      for (let j = startJ; j < patterns.length && comparisons < maxComparisons; j++) {
        const pattern2 = patterns[j];
        if (!pattern2 || i === j) continue;

        const similarity = this.calculateOptimizedSimilarity(pattern1, pattern2);
        comparisons++;

        // Only store if above sparse threshold
        if (similarity >= sparseThreshold) {
          row.set(pattern2.pattern_id, similarity);

          // Store symmetric entry if needed
          if (symmetric) {
            let symmetricRow = matrix.get(pattern2.pattern_id);
            if (!symmetricRow) {
              symmetricRow = new Map();
              matrix.set(pattern2.pattern_id, symmetricRow);
            }
            symmetricRow.set(pattern1.pattern_id, similarity);
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    cache_hit_ratio: number;
    total_calculations: number;
    avg_calculation_time_ms: number;
    memory_usage_mb: number;
    cache_sizes: Record<string, number>;
  } {
    const totalRequests = this.performanceMetrics.cache_hits + this.performanceMetrics.cache_misses;
    const hitRatio = totalRequests > 0 ? this.performanceMetrics.cache_hits / totalRequests : 0;

    return {
      cache_hit_ratio: hitRatio,
      total_calculations: this.performanceMetrics.total_calculations,
      avg_calculation_time_ms: this.performanceMetrics.avg_calculation_time,
      memory_usage_mb: this.estimateMemoryUsage(),
      cache_sizes: {
        similarity_cache: this.similarityCache.size,
        score_cache: this.patternScoreCache.size,
        consolidation_cache: this.consolidationCache.size
      }
    };
  }

  /**
   * Private helper methods
   */
  private static createSimilarityCacheKey(id1: string, id2: string): string {
    // Create order-independent cache key
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  private static createScoreCacheKey(patternId: string, context: any, criteria: any): string {
    const contextHash = this.hashObject(context);
    const criteriaHash = this.hashObject(criteria);
    return `score:${patternId}:${contextHash}:${criteriaHash}`;
  }

  private static createConsolidationCacheKey(patterns: MarketPattern[]): string {
    const sortedIds = patterns.map(p => p.pattern_id).sort();
    return `consolidation:${sortedIds.join(':')}`;
  }

  private static hashObject(obj: any): string {
    // Simple hash function for objects
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private static computeOptimizedSimilarity(pattern1: MarketPattern, pattern2: MarketPattern): number {
    // Use the existing similarity calculation but with optimizations
    try {
      // Fast pre-screening
      if (pattern1.pattern_type !== pattern2.pattern_type) {
        return 0.0; // Different types are automatically dissimilar
      }

      // Check for obvious high similarity cases
      if (pattern1.pattern_id === pattern2.pattern_id) {
        return 1.0;
      }

      // Use the standard calculation with precision limit
      const similarity = MemoryUtils.calculatePatternSimilarity(pattern1, pattern2);

      // Round to precision to improve cache efficiency
      return Math.round(similarity / this.OPTIMIZATION_SETTINGS.similarity_precision) * this.OPTIMIZATION_SETTINGS.similarity_precision;

    } catch (_error) {
      return 0.0;
    }
  }

  private static cacheSimilarityResult(cacheKey: string, similarity: number): void {
    // Implement LRU eviction
    if (this.similarityCache.size >= this.CACHE_CONFIG.similarity_cache_size) {
      this.evictOldestCacheEntry(this.similarityCache);
    }

    this.similarityCache.set(cacheKey, {
      similarity,
      timestamp: Date.now()
    });
  }

  private static cacheScoreResult(cacheKey: string, score: any): void {
    if (this.patternScoreCache.size >= this.CACHE_CONFIG.score_cache_size) {
      this.evictOldestCacheEntry(this.patternScoreCache);
    }

    this.patternScoreCache.set(cacheKey, {
      score,
      timestamp: Date.now()
    });
  }

  private static cacheConsolidationResult(cacheKey: string, result: MarketPattern): void {
    if (this.consolidationCache.size >= this.CACHE_CONFIG.consolidation_cache_size) {
      this.evictOldestCacheEntry(this.consolidationCache);
    }

    this.consolidationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private static evictOldestCacheEntry(cache: Map<string, { timestamp: number; [key: string]: any }>): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, value] of cache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private static performCacheCleanup(): void {
    const now = Date.now();
    const ttl = this.CACHE_CONFIG.pattern_cache_ttl;

    // Clean similarity cache
    for (const [key, value] of this.similarityCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.similarityCache.delete(key);
      }
    }

    // Clean score cache
    for (const [key, value] of this.patternScoreCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.patternScoreCache.delete(key);
      }
    }

    // Clean consolidation cache
    for (const [key, value] of this.consolidationCache.entries()) {
      if (now - value.timestamp > ttl) {
        this.consolidationCache.delete(key);
      }
    }
  }

  private static clearAllCaches(): void {
    this.similarityCache.clear();
    this.patternScoreCache.clear();
    this.consolidationCache.clear();

    // Reset performance metrics
    this.performanceMetrics = {
      cache_hits: 0,
      cache_misses: 0,
      total_calculations: 0,
      avg_calculation_time: 0,
      memory_usage_mb: 0
    };
  }

  private static updatePerformanceMetrics(startTime: number): void {
    const duration = performance.now() - startTime;
    this.performanceMetrics.total_calculations++;

    // Update rolling average
    const currentAvg = this.performanceMetrics.avg_calculation_time;
    const count = this.performanceMetrics.total_calculations;
    this.performanceMetrics.avg_calculation_time = ((currentAvg * (count - 1)) + duration) / count;
  }

  private static estimateMemoryUsage(): number {
    // Rough estimation of cache memory usage
    const similarityCacheSize = this.similarityCache.size * 100; // ~100 bytes per entry
    const scoreCacheSize = this.patternScoreCache.size * 500; // ~500 bytes per entry
    const consolidationCacheSize = this.consolidationCache.size * 2000; // ~2KB per entry

    return (similarityCacheSize + scoreCacheSize + consolidationCacheSize) / (1024 * 1024); // Convert to MB
  }

  /**
   * Calculate pattern score (placeholder - should be implemented or imported)
   */
  private static calculatePatternScore(pattern: MarketPattern, context: any): any {
    // This method references PatternScoringEngine.calculatePatternScore
    // For now, return a basic score - in production this should be properly implemented
    return {
      overall_score: pattern.learning_metrics.reliability_score,
      dimension_scores: {
        reliability: pattern.learning_metrics.reliability_score,
        performance: pattern.outcomes.success_rate,
        relevance: 0.5
      },
      confidence_intervals: {
        lower: Math.max(0, pattern.learning_metrics.reliability_score - 0.1),
        upper: Math.min(1, pattern.learning_metrics.reliability_score + 0.1)
      },
      scoring_metadata: {
        context_used: !!context,
        criteria_applied: true
      }
    };
  }
}