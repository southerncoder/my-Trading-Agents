import { createLogger } from '../../utils/enhanced-logger';
import { RetrievedMemoryContext, ContextRetrievalCriteria, ContextRelevanceMetrics } from './context-retrieval/types';

/**
 * Performance optimization service for context retrieval operations
 * Handles caching, lazy loading, and performance monitoring
 */
export class PerformanceOptimizationService {
  private logger: any;
  private cacheEnabled: boolean;
  private contextCache: Map<string, RetrievedMemoryContext[]>;
  private embeddingCache: Map<string, number[]>;
  private maxCacheSize: number;
  private cacheTTL: number; // Time to live in milliseconds
  private cacheStats: {
    hits: number;
    misses: number;
    evictions: number;
    lastCleanup: number;
  };

  constructor(options: {
    cacheEnabled?: boolean;
    maxCacheSize?: number;
    cacheTTL?: number;
    logger?: any;
  } = {}) {
    this.logger = options.logger || createLogger('system', 'PerformanceOptimizationService');
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.maxCacheSize = options.maxCacheSize ?? 1000;
    this.cacheTTL = options.cacheTTL ?? 30 * 60 * 1000; // 30 minutes default

    this.contextCache = new Map();
    this.embeddingCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastCleanup: Date.now()
    };

    this.logger.info('PerformanceOptimizationService initialized', {
      cacheEnabled: this.cacheEnabled,
      maxCacheSize: this.maxCacheSize,
      cacheTTL: this.cacheTTL
    });
  }

  /**
   * Generate cache key for context retrieval criteria
   */
  generateCacheKey(criteria: ContextRetrievalCriteria): string {
    try {
      // Create a normalized cache key from criteria
      const keyComponents = {
        market_conditions: criteria.current_market_conditions,
        technical_indicators: criteria.technical_indicators,
        strategy_type: criteria.strategy_type,
        time_horizon: criteria.time_horizon,
        risk_tolerance: criteria.risk_tolerance,
        max_results: criteria.max_results,
        relevance_threshold: criteria.relevance_threshold
      };

      // Sort object keys for consistent hashing
      const sortedKey = JSON.stringify(keyComponents, Object.keys(keyComponents).sort());
      return this.simpleHash(sortedKey).toString();
    } catch (error) {
      this.logger.warn('Error generating cache key', { error });
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Generate cache key for embedding
   */
  generateEmbeddingCacheKey(text: string): string {
    try {
      return this.simpleHash(text).toString();
    } catch (error) {
      this.logger.warn('Error generating embedding cache key', { error });
      return `embedding_fallback_${Date.now()}`;
    }
  }

  /**
   * Get cached context results
   */
  getCachedResults(cacheKey: string): RetrievedMemoryContext[] | null {
    try {
      if (!this.cacheEnabled) return null;

      const cached = this.contextCache.get(cacheKey);
      if (!cached) {
        this.cacheStats.misses++;
        return null;
      }

      // Check if cache entry is expired
      const isExpired = this.isCacheEntryExpired(cacheKey);
      if (isExpired) {
        this.contextCache.delete(cacheKey);
        this.cacheStats.evictions++;
        this.cacheStats.misses++;
        return null;
      }

      this.cacheStats.hits++;
      this.logger.debug('Cache hit for context retrieval', { cacheKey });
      return cached;
    } catch (error) {
      this.logger.warn('Error retrieving cached results', { error, cacheKey });
      return null;
    }
  }

  /**
   * Cache context results
   */
  cacheResults(cacheKey: string, results: RetrievedMemoryContext[]): void {
    try {
      if (!this.cacheEnabled) return;

      // Check cache size limits
      if (this.contextCache.size >= this.maxCacheSize) {
        this.performCacheCleanup();
      }

      // Store results in cache
      this.contextCache.set(cacheKey, results);
      this.logger.debug('Cached context results', { cacheKey, resultCount: results.length });
    } catch (error) {
      this.logger.warn('Error caching results', { error, cacheKey });
    }
  }

  /**
   * Get cached embedding
   */
  getCachedEmbedding(cacheKey: string): number[] | null {
    try {
      if (!this.cacheEnabled) return null;

      const cached = this.embeddingCache.get(cacheKey);
      if (!cached) return null;

      this.logger.debug('Embedding cache hit', { cacheKey });
      return cached;
    } catch (error) {
      this.logger.warn('Error retrieving cached embedding', { error, cacheKey });
      return null;
    }
  }

  /**
   * Cache embedding
   */
  cacheEmbedding(cacheKey: string, embedding: number[]): void {
    try {
      if (!this.cacheEnabled) return;

      // Check cache size limits for embeddings
      if (this.embeddingCache.size >= this.maxCacheSize) {
        this.performEmbeddingCacheCleanup();
      }

      this.embeddingCache.set(cacheKey, embedding);
      this.logger.debug('Cached embedding', { cacheKey, embeddingSize: embedding.length });
    } catch (error) {
      this.logger.warn('Error caching embedding', { error, cacheKey });
    }
  }

  /**
   * Calculate performance metrics for retrieval operation
   */
  calculatePerformanceMetrics(
    startTime: number,
    searchResults: any[],
    criteria: ContextRetrievalCriteria,
    searchCoverage: any = {}
  ): ContextRelevanceMetrics {
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    try {
      // Calculate relevance scores
      const relevanceScores = searchResults.map(result => {
        if (result.metadata?.relevance_score) {
          return result.metadata.relevance_score;
        }
        return this.calculateFallbackRelevanceScore(result, criteria);
      });

      const avgScore = relevanceScores.length > 0
        ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
        : 0;

      const topScore = relevanceScores.length > 0
        ? Math.max(...relevanceScores)
        : 0;

      // Estimate timing breakdown
      const searchDuration = Math.floor(totalTime * 0.6);
      const similarityCalcTime = Math.floor(totalTime * 0.25);
      const rankingTime = Math.floor(totalTime * 0.1);
      const totalRetrievalTime = totalTime;

      return {
        total_memories_searched: searchResults.length,
        relevant_memories_found: relevanceScores.filter(score => score > 0.5).length,
        avg_relevance_score: Number(avgScore.toFixed(3)),
        top_relevance_score: Number(topScore.toFixed(3)),
        search_coverage: {
          market_regime_matches: searchCoverage.market_regime_matches || 0,
          technical_pattern_matches: searchCoverage.technical_pattern_matches || 0,
          outcome_pattern_matches: searchCoverage.outcome_pattern_matches || 0,
          temporal_pattern_matches: searchCoverage.temporal_pattern_matches || 0
        },
        retrieval_performance: {
          search_duration_ms: searchDuration,
          similarity_calculation_time_ms: similarityCalcTime,
          ranking_time_ms: rankingTime,
          total_retrieval_time_ms: totalRetrievalTime
        }
      };
    } catch (error) {
      this.logger.warn('Error calculating performance metrics', { error });
      return {
        total_memories_searched: searchResults.length,
        relevant_memories_found: 0,
        avg_relevance_score: 0,
        top_relevance_score: 0,
        search_coverage: {
          market_regime_matches: 0,
          technical_pattern_matches: 0,
          outcome_pattern_matches: 0,
          temporal_pattern_matches: 0
        },
        retrieval_performance: {
          search_duration_ms: 0,
          similarity_calculation_time_ms: 0,
          ranking_time_ms: 0,
          total_retrieval_time_ms: totalTime
        }
      };
    }
  }

  /**
   * Calculate fallback relevance score
   */
  private calculateFallbackRelevanceScore(result: any, criteria: ContextRetrievalCriteria): number {
    try {
      let score = 0.5; // Base score

      // Score based on content length and structure
      if (result.content && typeof result.content === 'string') {
        const contentLength = result.content.length;
        if (contentLength > 100) score += 0.1;
        if (contentLength > 500) score += 0.1;
      }

      // Score based on metadata availability
      if (result.metadata) {
        const metadataKeys = Object.keys(result.metadata);
        score += Math.min(metadataKeys.length * 0.05, 0.2);
      }

      // Score based on timestamp relevance (prefer recent data)
      if (result.timestamp) {
        const age = Date.now() - new Date(result.timestamp).getTime();
        const daysOld = age / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 0.1;
        else if (daysOld < 30) score += 0.05;
      }

      // Score based on criteria matching
      if (criteria.strategy_type && result.strategy_type) {
        if (criteria.strategy_type.toLowerCase() === result.strategy_type.toLowerCase()) {
          score += 0.1;
        }
      }

      return Math.min(score, 1.0);
    } catch (error) {
      this.logger.warn('Error calculating fallback relevance score', { error });
      return 0.3;
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheEntryExpired(cacheKey: string): boolean {
    try {
      // For now, implement simple TTL check
      // In a more sophisticated implementation, we could store timestamps
      const now = Date.now();
      const timeSinceLastCleanup = now - this.cacheStats.lastCleanup;

      // Consider entries "expired" if it's been more than TTL since last cleanup
      return timeSinceLastCleanup > this.cacheTTL;
    } catch (error) {
      this.logger.warn('Error checking cache expiration', { error, cacheKey });
      return false;
    }
  }

  /**
   * Perform cache cleanup to maintain size limits
   */
  private performCacheCleanup(): void {
    try {
      if (this.contextCache.size < this.maxCacheSize * 0.8) return; // Only cleanup when 80% full

      const entriesToRemove = Math.floor(this.contextCache.size * 0.2); // Remove 20%
      const keys = Array.from(this.contextCache.keys());

      for (let i = 0; i < entriesToRemove; i++) {
        const keyToRemove = keys[i];
        if (keyToRemove) {
          this.contextCache.delete(keyToRemove);
          this.cacheStats.evictions++;
        }
      }

      this.cacheStats.lastCleanup = Date.now();
      this.logger.debug('Performed cache cleanup', {
        removedEntries: entriesToRemove,
        newSize: this.contextCache.size
      });
    } catch (error) {
      this.logger.warn('Error performing cache cleanup', { error });
    }
  }

  /**
   * Perform embedding cache cleanup
   */
  private performEmbeddingCacheCleanup(): void {
    try {
      if (this.embeddingCache.size < this.maxCacheSize * 0.8) return;

      const entriesToRemove = Math.floor(this.embeddingCache.size * 0.2);
      const keys = Array.from(this.embeddingCache.keys());

      for (let i = 0; i < entriesToRemove; i++) {
        const keyToRemove = keys[i];
        if (keyToRemove) {
          this.embeddingCache.delete(keyToRemove);
        }
      }

      this.logger.debug('Performed embedding cache cleanup', {
        removedEntries: entriesToRemove,
        newSize: this.embeddingCache.size
      });
    } catch (error) {
      this.logger.warn('Error performing embedding cache cleanup', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    contextCache: { size: number; maxSize: number };
    embeddingCache: { size: number; maxSize: number };
    performance: { hits: number; misses: number; evictions: number; hitRate: number };
  } {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;

    return {
      contextCache: {
        size: this.contextCache.size,
        maxSize: this.maxCacheSize
      },
      embeddingCache: {
        size: this.embeddingCache.size,
        maxSize: this.maxCacheSize
      },
      performance: {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        evictions: this.cacheStats.evictions,
        hitRate: Number(hitRate.toFixed(3))
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    try {
      const contextCacheSize = this.contextCache.size;
      const embeddingCacheSize = this.embeddingCache.size;

      this.contextCache.clear();
      this.embeddingCache.clear();

      this.cacheStats.evictions += contextCacheSize + embeddingCacheSize;
      this.cacheStats.lastCleanup = Date.now();

      this.logger.info('Cleared all caches', {
        contextCacheCleared: contextCacheSize,
        embeddingCacheCleared: embeddingCacheSize
      });
    } catch (error) {
      this.logger.warn('Error clearing caches', { error });
    }
  }

  /**
   * Optimize cache settings based on usage patterns
   */
  optimizeCacheSettings(): void {
    try {
      const stats = this.getCacheStats();

      // Adjust cache size based on hit rate
      if (stats.performance.hitRate > 0.8) {
        // High hit rate - can reduce cache size to save memory
        this.maxCacheSize = Math.max(100, Math.floor(this.maxCacheSize * 0.8));
      } else if (stats.performance.hitRate < 0.3) {
        // Low hit rate - increase cache size or TTL
        this.maxCacheSize = Math.min(5000, Math.floor(this.maxCacheSize * 1.2));
        this.cacheTTL = Math.min(60 * 60 * 1000, this.cacheTTL * 1.1); // Max 1 hour
      }

      this.logger.info('Optimized cache settings', {
        newMaxCacheSize: this.maxCacheSize,
        newCacheTTL: this.cacheTTL,
        hitRate: stats.performance.hitRate
      });
    } catch (error) {
      this.logger.warn('Error optimizing cache settings', { error });
    }
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    this.logger.info('Cache enabled status changed', { enabled });

    if (!enabled) {
      this.clearCaches();
    }
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.cacheEnabled;
  }
}

/**
 * Factory function to create PerformanceOptimizationService
 */
export function createPerformanceOptimizationService(options: {
  cacheEnabled?: boolean;
  maxCacheSize?: number;
  cacheTTL?: number;
  logger?: any;
} = {}): PerformanceOptimizationService {
  return new PerformanceOptimizationService(options);
}