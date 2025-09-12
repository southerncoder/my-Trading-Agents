import { ExtendedZepClient, ContextRetrievalCriteria } from './types';
import { SearchStrategy } from './types';
import { ContextRetrievalError } from './error';

/**
 * Service handling search orchestration and caching
 */
export class SearchService {
  constructor(
    private zepClient: ExtendedZepClient,
    private logger: any,
    private maxSearchResults: number = 20,
    private cacheEnabled: boolean = true,
    private contextCache: Map<string, any[]> = new Map()
  ) {}

  async search(
    criteria: ContextRetrievalCriteria
  ): Promise<{ fromCache: boolean; results: any[]; strategy: SearchStrategy }> {
    const cacheKey = JSON.stringify(criteria);
    try {
      if (this.cacheEnabled && this.contextCache.has(cacheKey)) {
        this.logger.info('Context retrieval from cache', { cacheKey });
        return {
          fromCache: true,
          results: this.contextCache.get(cacheKey)!,
          strategy: {
            name: 'cache_retrieval',
            filters: ['cache_lookup'],
            similarity_methods: ['cached'],
            ranking_criteria: ['pre_ranked']
          }
        };
      }
      const strategy = this.determineSearchStrategy(criteria);
      const results = await this.executeMultiDimensionalSearch(criteria);
      if (this.cacheEnabled) {
        this.contextCache.set(cacheKey, results);
      }
      return { fromCache: false, results, strategy };
    } catch (error) {
      throw new ContextRetrievalError(
        'SearchService.search failed',
        'SearchService',
        error instanceof Error ? error : undefined,
        { criteria }
      );
    }
  }

  private determineSearchStrategy(
    criteria: ContextRetrievalCriteria
  ): SearchStrategy {
    // ...use original determineSearchStrategy logic...
    if (criteria.current_market_conditions && criteria.technical_indicators) {
      return {
        name: 'multi_dimensional_hybrid',
        filters: ['market_regime', 'volatility_range', 'technical_patterns'],
        similarity_methods: ['cosine_similarity', 'euclidean_distance', 'correlation_analysis'],
        ranking_criteria: ['relevance_score', 'temporal_proximity', 'outcome_quality']
      };
    } else if (criteria.current_market_conditions) {
      return {
        name: 'market_conditions_focused',
        filters: ['market_regime', 'volatility_range'],
        similarity_methods: ['cosine_similarity', 'manhattan_distance'],
        ranking_criteria: ['market_similarity', 'temporal_proximity']
      };
    } else {
      return {
        name: 'general_pattern_matching',
        filters: ['basic_filters'],
        similarity_methods: ['cosine_similarity'],
        ranking_criteria: ['relevance_score']
      };
    }
  }

  private async executeMultiDimensionalSearch(
    criteria: ContextRetrievalCriteria
  ): Promise<any[]> {
    const searchQuery = this.buildSearchQuery(criteria);
    const maxAttempts = 3;
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug('Executing Zep search', { searchQuery, attempt });
        const response =
          (await this.zepClient.searchMemory?.(searchQuery, {
            maxResults: this.maxSearchResults * 2
          })) || { facts: [] };
        return response.facts || [];
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn('Zep search failed, retrying', { attempt, error: lastError });
        // exponential backoff
        await new Promise(res => setTimeout(res, 100 * Math.pow(2, attempt - 1)));
      }
    }
    // All retries failed
    throw new ContextRetrievalError(
      'executeMultiDimensionalSearch failed after retries',
      'SearchService',
      lastError,
      { searchQuery }
    );
  }

  private buildSearchQuery(criteria: ContextRetrievalCriteria): string {
    const parts: string[] = [];
    if (criteria.current_market_conditions?.market_regime) {
      parts.push(`market_regime:${criteria.current_market_conditions.market_regime}`);
    }
    if (criteria.strategy_type) {
      parts.push(`strategy:${criteria.strategy_type}`);
    }
    if (criteria.time_horizon) {
      parts.push(`timeframe:${criteria.time_horizon}`);
    }
    return parts.length > 0 ? parts.join(' ') : 'trading pattern market';
  }
}