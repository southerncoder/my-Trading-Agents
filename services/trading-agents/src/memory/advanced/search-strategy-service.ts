import { createLogger } from '../../../utils/enhanced-logger';
import { ContextRetrievalCriteria } from '../context-retrieval/types';

/**
 * SearchStrategyService - Handles search strategy determination and execution
 *
 * This service provides intelligent search strategy selection based on context criteria,
 * including multi-dimensional search execution, query building, and strategy optimization.
 */
export class SearchStrategyService {
  private logger = createLogger('system', 'SearchStrategyService');

  /**
   * Determine optimal search strategy based on criteria
   */
  determineSearchStrategy(criteria: ContextRetrievalCriteria): {
    name: string;
    filters: string[];
    similarity_methods: string[];
    ranking_criteria: string[];
  } {
    // Determine optimal search strategy based on criteria
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

  /**
   * Build search query from criteria
   */
  buildSearchQuery(criteria: ContextRetrievalCriteria): string {
    const queryParts = [];

    if (criteria.current_market_conditions?.market_regime) {
      queryParts.push(`market_regime:${criteria.current_market_conditions.market_regime}`);
    }

    if (criteria.strategy_type) {
      queryParts.push(`strategy:${criteria.strategy_type}`);
    }

    if (criteria.time_horizon) {
      queryParts.push(`timeframe:${criteria.time_horizon}`);
    }

    return queryParts.length > 0 ? queryParts.join(' ') : 'trading pattern market';
  }

  /**
   * Execute multi-dimensional search with given strategy
   */
  async executeMultiDimensionalSearch(
    criteria: ContextRetrievalCriteria,
    strategy: any,
    zepClient: any,
    maxSearchResults: number
  ): Promise<any[]> {
    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(criteria);

      // Execute search in Zep
      const searchResults = await zepClient.memory.searchSessions?.({
        query: searchQuery,
        limit: maxSearchResults * 2 // Get more results for better filtering
      }) || { results: [] };

      this.logger.info('Executed multi-dimensional search', {
        component: 'SearchStrategyService',
        strategy: strategy.name,
        query: searchQuery,
        results_count: searchResults.facts?.length || 0
      });

      return searchResults.facts || [];
    } catch (error) {
      this.logger.warn('Error executing multi-dimensional search', { error, strategy: strategy?.name });
      return [];
    }
  }

  /**
   * Calculate multi-dimensional similarity for search results
   */
  async calculateMultiDimensionalSimilarity(
    result: any,
    criteria: ContextRetrievalCriteria,
    similarityAlgorithms: any,
    semanticWeight: number = 0.1
  ): Promise<{
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  }> {
    try {
      // Extract features from result
      const resultConditions = this.extractConditions(result);
      const resultTechnicals = this.extractTechnicalIndicators(result);

      // Calculate market conditions similarity
      const marketSimilarity = similarityAlgorithms.calculateMarketConditionsSimilarity(
        criteria.current_market_conditions || {},
        resultConditions
      );

      // Calculate technical indicators similarity
      const technicalSimilarity = similarityAlgorithms.calculateTechnicalIndicatorsSimilarity(
        criteria.technical_indicators || {},
        resultTechnicals
      );

      // Calculate temporal similarity (more recent = higher score)
      const temporalSimilarity = similarityAlgorithms.calculateTemporalSimilarity(result);

      // Calculate outcome similarity using ML-based approach with accuracy scoring
      const outcomeSimilarity = this.calculateOutcomeSimilarityWithAccuracyScoring(result, criteria);

      // Calculate semantic similarity using embeddings if available
      const semanticSimilarity = await this.calculateSemanticSimilarityForResult(
        result,
        criteria,
        null, // embeddingService - would be passed from orchestrator
        null, // textPreprocessing - would be passed from orchestrator
        semanticWeight
      );

      // Weighted overall similarity with semantic component
      const overall = (
        marketSimilarity * 0.3 +
        technicalSimilarity * 0.25 +
        temporalSimilarity * 0.2 +
        outcomeSimilarity * 0.15 +
        semanticSimilarity * semanticWeight
      );

      return {
        market_conditions_similarity: marketSimilarity,
        technical_indicators_similarity: technicalSimilarity,
        temporal_similarity: temporalSimilarity,
        outcome_similarity: outcomeSimilarity,
        overall_similarity: overall
      };
    } catch (error) {
      this.logger.warn('Error calculating multi-dimensional similarity', { error });
      return {
        market_conditions_similarity: 0.5,
        technical_indicators_similarity: 0.5,
        temporal_similarity: 0.5,
        outcome_similarity: 0.5,
        overall_similarity: 0.5
      };
    }
  }

  /**
   * Calculate outcome similarity with accuracy scoring
   */
  private calculateOutcomeSimilarityWithAccuracyScoring(result: any, criteria: ContextRetrievalCriteria): number {
    try {
      // Extract outcomes from result
      const outcomes = this.extractOutcomes(result);

      if (!outcomes || Object.keys(outcomes).length === 0) {
        return 0.5; // Neutral similarity for missing outcomes
      }

      // Calculate similarity based on strategy type alignment
      let strategySimilarity = 0.5;
      if (criteria.strategy_type && outcomes.strategy_type) {
        strategySimilarity = criteria.strategy_type.toLowerCase() === outcomes.strategy_type.toLowerCase() ? 1.0 : 0.3;
      }

      // Calculate similarity based on success rate alignment
      let successSimilarity = 0.5;
      if (outcomes.success_rate !== undefined) {
        // Higher success rates are more similar to criteria expectations
        successSimilarity = Math.min(outcomes.success_rate * 1.2, 1.0);
      }

      // Calculate risk profile alignment
      let riskSimilarity = 0.5;
      if (criteria.risk_tolerance && outcomes.risk_outcome) {
        const riskMatch = criteria.risk_tolerance.toLowerCase() === outcomes.risk_outcome.toLowerCase();
        riskSimilarity = riskMatch ? 0.9 : 0.4;
      }

      // Weighted outcome similarity
      const outcomeSimilarity = (
        strategySimilarity * 0.4 +
        successSimilarity * 0.4 +
        riskSimilarity * 0.2
      );

      return Math.max(0, Math.min(1, outcomeSimilarity));

    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate semantic similarity for a search result
   */
  private async calculateSemanticSimilarityForResult(
    result: any,
    criteria: ContextRetrievalCriteria,
    embeddingService: any,
    textPreprocessing: any,
    _semanticWeight: number
  ): Promise<number> {
    try {
      if (!embeddingService && !textPreprocessing) {
        return 0.5; // Neutral similarity when no semantic processing available
      }

      // Extract text content from result and criteria
      const resultText = this.extractTextFromResult(result);
      const criteriaText = this.extractTextFromCriteria(criteria);

      if (!resultText || !criteriaText) {
        return 0.5;
      }

      // Apply text preprocessing if enabled
      const processedResultText = textPreprocessing ? this.preprocessText(resultText) : resultText;
      const processedCriteriaText = textPreprocessing ? this.preprocessText(criteriaText) : criteriaText;

      // Calculate semantic similarity
      const semanticSimilarity = await this.calculateSemanticSimilarity(
        processedResultText,
        processedCriteriaText,
        embeddingService
      );

      return semanticSimilarity;

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity for result', { error });
      return 0.5;
    }
  }

  /**
   * Extract text content from search result for semantic analysis
   */
  private extractTextFromResult(result: any): string {
    try {
      const textComponents = [];

      // Add main fact/content
      if (result.fact) {
        textComponents.push(result.fact);
      }

      // Add metadata descriptions
      if (result.metadata?.description) {
        textComponents.push(result.metadata.description);
      }

      // Add context information
      if (result.context) {
        textComponents.push(result.context);
      }

      // Add market conditions as text
      const marketConditions = this.extractMarketConditionsFromFact(result);
      if (marketConditions.market_regime) {
        textComponents.push(`Market regime: ${marketConditions.market_regime}`);
      }
      if (marketConditions.trend_direction) {
        textComponents.push(`Trend: ${marketConditions.trend_direction}`);
      }

      return textComponents.join(' ');

    } catch (error) {
      this.logger.warn('Error extracting text from result', { error });
      return result.fact || '';
    }
  }

  /**
   * Extract text content from criteria for semantic analysis
   */
  private extractTextFromCriteria(criteria: ContextRetrievalCriteria): string {
    try {
      const textComponents = [];

      // Add market conditions
      if (criteria.current_market_conditions) {
        const conditions = criteria.current_market_conditions;
        if (conditions.market_regime) {
          textComponents.push(`Market regime: ${conditions.market_regime}`);
        }
        if (conditions.trend_direction) {
          textComponents.push(`Trend: ${conditions.trend_direction}`);
        }
        if (conditions.volatility !== undefined) {
          textComponents.push(`Volatility: ${conditions.volatility}`);
        }
      }

      // Add technical indicators
      if (criteria.technical_indicators) {
        const technicals = criteria.technical_indicators;
        if (technicals.rsi !== undefined) {
          textComponents.push(`RSI: ${technicals.rsi}`);
        }
        if (technicals.macd !== undefined) {
          textComponents.push(`MACD: ${technicals.macd}`);
        }
      }

      // Add strategy and risk information
      if (criteria.strategy_type) {
        textComponents.push(`Strategy: ${criteria.strategy_type}`);
      }
      if (criteria.risk_tolerance) {
        textComponents.push(`Risk tolerance: ${criteria.risk_tolerance}`);
      }
      if (criteria.time_horizon) {
        textComponents.push(`Time horizon: ${criteria.time_horizon}`);
      }

      return textComponents.join(' ');

    } catch (error) {
      this.logger.warn('Error extracting text from criteria', { error });
      return '';
    }
  }

  /**
   * Preprocess text for better semantic analysis
   */
  private preprocessText(text: string): string {
    try {
      if (!text) return '';

      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .replace(/\d+/g, 'NUM') // Replace numbers with NUM token
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    } catch (error) {
      this.logger.warn('Error preprocessing text', { error });
      return text;
    }
  }

  /**
   * Calculate semantic similarity between two texts
   */
  private async calculateSemanticSimilarity(
    text1: string,
    text2: string,
    embeddingService: any
  ): Promise<number> {
    try {
      if (!embeddingService) {
        return 0.5; // Neutral similarity when no embedding service
      }

      // Generate embeddings for both texts
      const [embedding1, embedding2] = await Promise.all([
        embeddingService.generateEmbedding(text1),
        embeddingService.generateEmbedding(text2)
      ]);

      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(embedding1, embedding2);

      return Math.max(0, Math.min(1, similarity));

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    try {
      if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
        return 0.5;
      }

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vec1.length; i++) {
        const v1 = vec1[i] || 0;
        const v2 = vec2[i] || 0;
        dotProduct += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
      }

      if (norm1 === 0 || norm2 === 0) {
        return 0.5;
      }

      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

    } catch (error) {
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0.5;
    }
  }

  /**
   * Extract market conditions from fact
   */
  private extractMarketConditionsFromFact(fact: any): any {
    try {
      return {
        market_regime: fact.market_regime || fact.market_conditions?.regime,
        trend_direction: fact.trend_direction || fact.market_conditions?.trend,
        volatility: fact.volatility || fact.market_conditions?.volatility
      };
    } catch (error) {
      this.logger.warn('Error extracting market conditions from fact', { error });
      return {};
    }
  }

  /**
   * Extract conditions from result
   */
  private extractConditions(result: any): any {
    try {
      if (!result) return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        price_level: 0,
        trend_direction: 'unknown',
        momentum: 0
      };

      // Extract market conditions from various Zep fact structures
      const conditions = {
        market_regime: result.market_regime || result.market_conditions?.regime,
        volatility: result.volatility || result.market_conditions?.volatility,
        volume_ratio: result.volume_ratio || result.market_data?.volume_ratio,
        price_level: result.price_level || result.market_data?.price,
        trend_direction: result.trend_direction || result.market_conditions?.trend,
        momentum: result.momentum || result.market_conditions?.momentum
      };

      // Remove undefined values
      return Object.fromEntries(
        Object.entries(conditions).filter(([_, value]) => value !== undefined)
      );
    } catch (error) {
      this.logger.warn('Error extracting conditions from result', { error, result });
      return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        price_level: 0,
        trend_direction: 'unknown',
        momentum: 0
      };
    }
  }

  /**
   * Extract technical indicators from result
   */
  private extractTechnicalIndicators(result: any): any {
    try {
      if (!result) return {
        rsi: 50,
        macd: 0,
        bollinger_upper: 0,
        bollinger_lower: 0,
        sma_20: 0,
        sma_50: 0
      };

      return {
        rsi: result.rsi || result.technical_indicators?.rsi,
        macd: result.macd || result.technical_indicators?.macd,
        bollinger_upper: result.bollinger_upper || result.technical_indicators?.bollinger?.upper,
        bollinger_lower: result.bollinger_lower || result.technical_indicators?.bollinger?.lower,
        sma_20: result.sma_20 || result.technical_indicators?.sma?.['20'],
        sma_50: result.sma_50 || result.technical_indicators?.sma?.['50']
      };
    } catch (error) {
      this.logger.warn('Error extracting technical indicators', { error });
      return {
        rsi: 50,
        macd: 0,
        bollinger_upper: 0,
        bollinger_lower: 0,
        sma_20: 0,
        sma_50: 0
      };
    }
  }

  /**
   * Extract outcomes from result
   */
  private extractOutcomes(result: any): any {
    try {
      if (!result) return {
        strategy_type: 'unknown',
        success_rate: 0.5,
        profit_loss: 0,
        risk_outcome: 'medium',
        confidence_score: 0.5
      };

      // Extract outcomes from various Zep fact structures
      const outcomes = {
        strategy_type: result.strategy_type || result.trading_strategy,
        success_rate: result.success_rate || result.win_rate,
        profit_loss: result.profit_loss || result.pnl,
        risk_outcome: result.risk_outcome || result.risk_level,
        confidence_score: result.confidence_score || result.confidence
      };

      // Remove undefined values
      return Object.fromEntries(
        Object.entries(outcomes).filter(([_, value]) => value !== undefined)
      );
    } catch (error) {
      this.logger.warn('Error extracting outcomes from result', { error, result });
      return {
        strategy_type: 'unknown',
        success_rate: 0.5,
        profit_loss: 0,
        risk_outcome: 'medium',
        confidence_score: 0.5
      };
    }
  }

  /**
   * Classify memory type from result
   */
  classifyMemoryType(result: any): 'pattern' | 'performance' | 'institutional' {
    if (result.fact?.includes('pattern')) return 'pattern';
    if (result.fact?.includes('performance')) return 'performance';
    return 'institutional';
  }
}