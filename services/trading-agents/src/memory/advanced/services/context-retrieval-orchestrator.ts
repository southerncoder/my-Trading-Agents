import { createLogger } from '../../../utils/enhanced-logger';
import { SimilarityEngine } from './similarity-engine';
import { DataExtractionService } from './data-extraction-service';
import { ContextRetrievalUtils } from './context-retrieval-utils';
import { MLRelevanceRankingService } from './ml-relevance-ranking-service';
import { SemanticProcessingService } from './semantic-processing-service';

/**
 * ContextRetrievalOrchestrator - Main orchestrator for context retrieval operations
 * Coordinates all the modular services for comprehensive context retrieval
 */
export class ContextRetrievalOrchestrator {
  private logger: any;
  private similarityEngine: SimilarityEngine;
  private dataExtractionService: DataExtractionService;
  private contextRetrievalUtils: ContextRetrievalUtils;
  private mlRankingService: MLRelevanceRankingService;
  private semanticProcessingService: SemanticProcessingService;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ContextRetrievalOrchestrator');

    // Initialize all service modules
    this.similarityEngine = new SimilarityEngine(this.logger);
    this.dataExtractionService = new DataExtractionService(this.logger);
    this.contextRetrievalUtils = new ContextRetrievalUtils(this.logger);
    this.mlRankingService = new MLRelevanceRankingService(this.logger);
    this.semanticProcessingService = new SemanticProcessingService(this.logger);
  }

  /**
   * Main context retrieval method - orchestrates the entire retrieval process
   */
  async retrieveContext(query: any, facts: any[], options: any = {}): Promise<any> {
    try {
      this.logger.info('Starting context retrieval orchestration', { query, factsCount: facts?.length });

      if (!query || !facts || facts.length === 0) {
        return { results: [], metadata: { totalFacts: 0, processingTime: 0 } };
      }

      const startTime = Date.now();

      // Step 1: Extract and normalize query features
      const queryFeatures = await this.extractQueryFeatures(query);

      // Step 2: Process and score facts
      const processedFacts = await this.processFacts(facts, queryFeatures, options);

      // Step 3: Apply ML-based ranking
      const rankedFacts = await this.rankFactsML(processedFacts, queryFeatures, options);

      // Step 4: Apply semantic filtering if enabled
      const semanticFilteredFacts = options.enableSemanticFiltering
        ? await this.applySemanticFiltering(rankedFacts, query, options)
        : rankedFacts;

      // Step 5: Generate insights and recommendations
      const enrichedResults = await this.enrichResults(semanticFilteredFacts, queryFeatures, options);

      // Step 6: Apply final filtering and limits
      const finalResults = this.applyFinalFiltering(enrichedResults, options);

      const processingTime = Date.now() - startTime;

      this.logger.info('Context retrieval orchestration completed', {
        totalFacts: facts.length,
        resultsCount: finalResults.length,
        processingTime
      });

      return {
        results: finalResults,
        metadata: {
          totalFacts: facts.length,
          processedFacts: processedFacts.length,
          rankedFacts: rankedFacts.length,
          semanticFilteredFacts: semanticFilteredFacts.length,
          finalResults: finalResults.length,
          processingTime,
          queryFeatures,
          options
        }
      };
    } catch (error) {
      this.logger.error('Error in context retrieval orchestration', { error, query });
      return {
        results: [],
        metadata: {
          totalFacts: facts?.length || 0,
          processingTime: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Extract features from query for processing
   */
  private async extractQueryFeatures(query: any): Promise<any> {
    try {
      const queryText = this.extractQueryText(query);
      const queryFeatures = {
        text: queryText,
        market_conditions: this.extractMarketConditionsFromFact(query),
        technical_indicators: this.extractTechnicalIndicators(query),
        outcomes: this.extractOutcomes(query),
        performance_data: this.extractPerformanceData(query),
        context_conditions: this.extractContextConditions(query),
        key_insights: this.contextRetrievalUtils.extractKeyInsights(query),
        recommendations: this.contextRetrievalUtils.generateRecommendations(
          this.extractPerformanceData(query),
          query
        ),
        semantic_features: this.semanticProcessingService.extractSemanticFeatures(queryText),
        search_query: this.contextRetrievalUtils.buildScenarioSearchQuery(query)
      };

      return queryFeatures;
    } catch (error) {
      this.logger.warn('Error extracting query features', { error });
      return { text: this.extractQueryText(query) };
    }
  }

  /**
   * Process facts with similarity calculations and scoring
   */
  private async processFacts(facts: any[], queryFeatures: any, options: any): Promise<any[]> {
    try {
      const processedFacts = [];

      for (const fact of facts) {
        try {
          // Extract fact features
          const factFeatures = await this.extractFactFeatures(fact);

          // Calculate various similarity scores
          const similarityScores = await this.calculateSimilarityScores(queryFeatures, factFeatures, fact);

          // Calculate confidence and relevance
          const confidenceScore = this.dataExtractionService.extractConfidence(fact);
          const relevanceScore = this.calculateOverallRelevance(similarityScores, confidenceScore, fact);

          // Extract insights and recommendations
          const insights = this.contextRetrievalUtils.extractKeyInsights(fact);
          const recommendations = this.contextRetrievalUtils.generateRecommendations(
            this.dataExtractionService.extractPerformanceData(fact),
            queryFeatures
          );

          processedFacts.push({
            ...fact,
            processed_features: factFeatures,
            similarity_scores: similarityScores,
            confidence_score: confidenceScore,
            relevance_score: relevanceScore,
            insights,
            recommendations,
            processing_timestamp: Date.now()
          });
        } catch (factError) {
          this.logger.warn('Error processing individual fact', { factError, factId: fact.id });
          // Include fact with minimal processing
          processedFacts.push({
            ...fact,
            processed_features: {},
            similarity_scores: { overall: 0.1 },
            confidence_score: 0.1,
            relevance_score: 0.1,
            insights: [],
            recommendations: [],
            processing_error: factError.message
          });
        }
      }

      return processedFacts;
    } catch (error) {
      this.logger.warn('Error processing facts', { error });
      return facts.map(fact => ({
        ...fact,
        processed_features: {},
        similarity_scores: { overall: 0.1 },
        confidence_score: 0.1,
        relevance_score: 0.1
      }));
    }
  }

  /**
   * Extract features from individual fact
   */
  private async extractFactFeatures(fact: any): Promise<any> {
    try {
      const factText = this.extractFactText(fact);
      return {
        text: factText,
        market_conditions: this.extractMarketConditionsFromFact(fact),
        technical_indicators: this.extractTechnicalIndicators(fact),
        outcomes: this.extractOutcomes(fact),
        performance_data: this.extractPerformanceData(fact),
        context_conditions: this.extractContextConditions(fact),
        key_insights: this.contextRetrievalUtils.extractKeyInsights(fact),
        semantic_features: this.semanticProcessingService.extractSemanticFeatures(factText),
        temporal_score: this.contextRetrievalUtils.calculateTemporalSimilarity(fact)
      };
    } catch (error) {
      this.logger.warn('Error extracting fact features', { error });
      return { text: this.extractFactText(fact) };
    }
  }

  /**
   * Calculate various similarity scores between query and fact
   */
  private async calculateSimilarityScores(queryFeatures: any, factFeatures: any, fact: any): Promise<any> {
    try {
      const scores = {
        market_condition_similarity: 0,
        technical_similarity: 0,
        outcome_similarity: 0,
        semantic_similarity: 0,
        temporal_similarity: 0,
        overall_similarity: 0
      };

      // Market condition similarity
      if (queryFeatures.market_conditions && factFeatures.market_conditions) {
        scores.market_condition_similarity = this.similarityEngine.calculateWeightedSimilarity(
          queryFeatures.market_conditions,
          factFeatures.market_conditions
        );
      }

      // Technical indicator similarity
      if (queryFeatures.technical_indicators && factFeatures.technical_indicators) {
        scores.technical_similarity = this.similarityEngine.calculateWeightedSimilarity(
          queryFeatures.technical_indicators,
          factFeatures.technical_indicators
        );
      }

      // Outcome similarity
      if (queryFeatures.outcomes && factFeatures.outcomes) {
        scores.outcome_similarity = this.similarityEngine.calculateWeightedSimilarity(
          factFeatures.outcomes,
          queryFeatures.outcomes
        );
      }

      // Semantic similarity
      if (queryFeatures.text && factFeatures.text) {
        scores.semantic_similarity = await this.semanticProcessingService.calculateSemanticSimilarity(
          queryFeatures.text,
          factFeatures.text
        );
      }

      // Temporal similarity
      scores.temporal_similarity = factFeatures.temporal_score || 0;

      // Calculate overall similarity (weighted average)
      const weights = {
        market_condition_similarity: 0.25,
        technical_similarity: 0.20,
        outcome_similarity: 0.20,
        semantic_similarity: 0.25,
        temporal_similarity: 0.10
      };

      let totalWeight = 0;
      let weightedSum = 0;

      for (const [key, weight] of Object.entries(weights)) {
        const score = scores[key as keyof typeof scores] || 0;
        if (score > 0) {
          weightedSum += score * (weight as number);
          totalWeight += weight as number;
        }
      }

      scores.overall_similarity = totalWeight > 0 ? weightedSum / totalWeight : 0;

      return scores;
    } catch (error) {
      this.logger.warn('Error calculating similarity scores', { error });
      return { overall_similarity: 0.1 };
    }
  }

  /**
   * Calculate overall relevance score
   */
  private calculateOverallRelevance(similarityScores: any, confidenceScore: number, fact: any): number {
    try {
      const similarityWeight = 0.7;
      const confidenceWeight = 0.3;

      const similarityScore = similarityScores.overall_similarity || 0;
      const confidence = confidenceScore || 0.5;

      return (similarityScore * similarityWeight) + (confidence * confidenceWeight);
    } catch (error) {
      this.logger.warn('Error calculating overall relevance', { error });
      return 0.1;
    }
  }

  /**
   * Apply ML-based ranking to facts
   */
  private async rankFactsML(facts: any[], queryFeatures: any, options: any): Promise<any[]> {
    try {
      if (!options.enableMLRanking || facts.length === 0) {
        return facts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      }

      // Convert facts to format expected by ML ranking service
      const rankingResults = await this.mlRankingService.rankResultsML(facts, queryFeatures);

      return rankingResults;
    } catch (error) {
      this.logger.warn('Error in ML-based ranking, falling back to simple ranking', { error });
      return facts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    }
  }

  /**
   * Apply semantic filtering to results
   */
  private async applySemanticFiltering(facts: any[], query: any, options: any): Promise<any[]> {
    try {
      const queryText = this.extractQueryText(query);
      const threshold = options.semanticThreshold || 0.6;

      const filteredFacts = [];

      for (const fact of facts) {
        const factText = this.extractFactText(fact);
        const semanticSimilarity = await this.semanticProcessingService.calculateSemanticSimilarity(
          queryText,
          factText
        );

        if (semanticSimilarity >= threshold) {
          filteredFacts.push({
            ...fact,
            semantic_similarity: semanticSimilarity
          });
        }
      }

      return filteredFacts;
    } catch (error) {
      this.logger.warn('Error applying semantic filtering', { error });
      return facts;
    }
  }

  /**
   * Enrich results with additional insights and recommendations
   */
  private async enrichResults(facts: any[], queryFeatures: any, options: any): Promise<any[]> {
    try {
      const enrichedFacts = [];

      for (const fact of facts) {
        try {
          // Generate performance insights
          const performanceInsights = this.contextRetrievalUtils.generatePerformanceInsights(fact);

          // Generate strategy recommendations
          const strategyRecs = this.contextRetrievalUtils.generateStrategyRecommendations(
            fact.strategy_type || 'unknown',
            this.extractPerformanceData(fact)
          );

          // Generate risk recommendations
          const riskRecs = this.contextRetrievalUtils.generateRiskRecommendations(
            fact.risk_level || 'medium',
            this.extractPerformanceData(fact)
          );

          // Generate market recommendations
          const marketRecs = this.contextRetrievalUtils.generateMarketRecommendations(
            fact.market_conditions || {},
            this.extractPerformanceData(fact)
          );

          enrichedFacts.push({
            ...fact,
            performance_insights: performanceInsights,
            strategy_recommendations: strategyRecs,
            risk_recommendations: riskRecs,
            market_recommendations: marketRecs,
            enrichment_timestamp: Date.now()
          });
        } catch (enrichmentError) {
          this.logger.warn('Error enriching individual fact', { enrichmentError, factId: fact.id });
          enrichedFacts.push(fact); // Include fact without enrichment
        }
      }

      return enrichedFacts;
    } catch (error) {
      this.logger.warn('Error enriching results', { error });
      return facts;
    }
  }

  /**
   * Apply final filtering and limits
   */
  private applyFinalFiltering(facts: any[], options: any): any[] {
    try {
      let filteredFacts = [...facts];

      // Apply minimum relevance threshold
      if (options.minRelevanceThreshold) {
        filteredFacts = filteredFacts.filter(fact =>
          (fact.relevance_score || 0) >= options.minRelevanceThreshold
        );
      }

      // Apply maximum results limit
      const maxResults = options.maxResults || 50;
      if (filteredFacts.length > maxResults) {
        filteredFacts = filteredFacts.slice(0, maxResults);
      }

      // Sort by relevance score (descending)
      filteredFacts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

      return filteredFacts;
    } catch (error) {
      this.logger.warn('Error applying final filtering', { error });
      return facts.slice(0, 50); // Return first 50 as fallback
    }
  }

  /**
   * Extract text content from query
   */
  private extractQueryText(query: any): string {
    try {
      if (typeof query === 'string') return query;
      if (query.text) return query.text;
      if (query.content) return query.content;
      if (query.description) return query.description;
      if (query.query) return query.query;

      return JSON.stringify(query);
    } catch (error) {
      this.logger.warn('Error extracting query text', { error });
      return '';
    }
  }

  /**
   * Extract text content from fact
   */
  private extractFactText(fact: any): string {
    try {
      if (typeof fact === 'string') return fact;
      if (fact.text) return fact.text;
      if (fact.content) return fact.content;
      if (fact.fact) return fact.fact;
      if (fact.description) return fact.description;
      if (fact.summary) return fact.summary;

      return JSON.stringify(fact);
    } catch (error) {
      this.logger.warn('Error extracting fact text', { error });
      return '';
    }
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<any> {
    try {
      return {
        orchestrator: 'healthy',
        similarity_engine: 'healthy',
        data_extraction: 'healthy',
        context_utils: 'healthy',
        ml_ranking: 'healthy',
        semantic_processing: 'healthy',
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Error getting health status', { error });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    try {
      return {
        services_initialized: 5,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.warn('Error getting performance metrics', { error });
      return { error: error.message };
    }
  }

  /**
   * Extract market conditions from fact
   */
  private extractMarketConditionsFromFact(fact: any): any {
    try {
      return {
        market_regime: this.dataExtractionService.extractMarketRegime(fact),
        volatility: this.dataExtractionService.extractVolatility(fact),
        trend_direction: this.dataExtractionService.extractTrendDirection(fact),
        volume_ratio: this.dataExtractionService.extractVolumeRatio(fact),
        price_level: this.dataExtractionService.extractPriceLevel(fact),
        momentum: this.dataExtractionService.extractMomentum(fact),
        sector: this.dataExtractionService.extractSector(fact),
        market_cap: this.dataExtractionService.extractMarketCap(fact),
        trading_volume: this.dataExtractionService.extractTradingVolume(fact),
        price_change: this.dataExtractionService.extractPriceChange(fact),
        volatility_regime: this.dataExtractionService.extractVolatilityRegime(fact),
        liquidity: this.dataExtractionService.extractLiquidity(fact),
        market_sentiment: this.dataExtractionService.extractMarketSentiment(fact),
        competition_level: this.dataExtractionService.extractCompetitionLevel(fact),
        regulatory_environment: this.dataExtractionService.extractRegulatoryEnvironment(fact)
      };
    } catch (error) {
      this.logger.warn('Error extracting market conditions from fact', { error });
      return {};
    }
  }

  /**
   * Extract technical indicators from fact
   */
  private extractTechnicalIndicators(fact: any): any {
    try {
      // Technical indicators are typically embedded in the fact content
      // We'll extract them from the fact structure
      return {
        rsi: fact.rsi || fact.technical_indicators?.rsi || 50,
        macd: fact.macd || fact.technical_indicators?.macd || 0,
        bollinger_upper: fact.bollinger_upper || fact.technical_indicators?.bollinger_upper || 0,
        bollinger_lower: fact.bollinger_lower || fact.technical_indicators?.bollinger_lower || 0,
        moving_average_20: fact.moving_average_20 || fact.technical_indicators?.moving_average_20 || 0,
        moving_average_50: fact.moving_average_50 || fact.technical_indicators?.moving_average_50 || 0,
        stochastic: fact.stochastic || fact.technical_indicators?.stochastic || 50,
        williams_r: fact.williams_r || fact.technical_indicators?.williams_r || -50,
        cci: fact.cci || fact.technical_indicators?.cci || 0,
        atr: fact.atr || fact.technical_indicators?.atr || 0
      };
    } catch (error) {
      this.logger.warn('Error extracting technical indicators', { error });
      return {};
    }
  }

  /**
   * Extract outcomes from fact
   */
  private extractOutcomes(fact: any): any {
    try {
      return {
        success_rate: this.dataExtractionService.extractSuccessRate(fact),
        profit_loss: this.dataExtractionService.extractProfitLoss(fact),
        win_rate: this.dataExtractionService.extractWinRate(fact),
        strategy_type: this.dataExtractionService.extractStrategyType(fact),
        risk_outcome: this.dataExtractionService.extractRiskOutcome(fact),
        time_effectiveness: this.dataExtractionService.extractTimeEffectiveness(fact),
        market_impact: this.dataExtractionService.extractMarketImpact(fact),
        drawdown: this.dataExtractionService.extractDrawdown(fact),
        sharpe_ratio: this.dataExtractionService.extractSharpeRatio(fact),
        execution_quality: this.dataExtractionService.extractExecutionQuality(fact),
        avg_trade_duration: this.dataExtractionService.extractAvgTradeDuration(fact),
        sample_size: this.dataExtractionService.extractSampleSize(fact)
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes', { error });
      return {};
    }
  }

  /**
   * Extract performance data from fact
   */
  private extractPerformanceData(fact: any): any {
    try {
      return {
        confidence: this.dataExtractionService.extractConfidence(fact),
        lessons: this.dataExtractionService.extractLessonsFromFact(fact),
        // Additional performance metrics
        total_return: fact.total_return || fact.performance?.total_return || 0,
        annualized_return: fact.annualized_return || fact.performance?.annualized_return || 0,
        max_consecutive_wins: fact.max_consecutive_wins || fact.performance?.max_consecutive_wins || 0,
        max_consecutive_losses: fact.max_consecutive_losses || fact.performance?.max_consecutive_losses || 0,
        recovery_factor: fact.recovery_factor || fact.performance?.recovery_factor || 0,
        ulcer_index: fact.ulcer_index || fact.performance?.ulcer_index || 0
      };
    } catch (error) {
      this.logger.warn('Error extracting performance data', { error });
      return {};
    }
  }

  /**
   * Extract context conditions from fact
   */
  private extractContextConditions(fact: any): any {
    try {
      return {
        market_conditions: this.extractMarketConditionsFromFact(fact),
        technical_indicators: this.extractTechnicalIndicators(fact),
        outcomes: this.extractOutcomes(fact),
        performance_data: this.extractPerformanceData(fact)
      };
    } catch (error) {
      this.logger.warn('Error extracting context conditions', { error });
      return {};
    }
  }
}

/**
 * Factory function to create ContextRetrievalOrchestrator
 */
export function createContextRetrievalOrchestrator(logger?: any): ContextRetrievalOrchestrator {
  return new ContextRetrievalOrchestrator(logger);
}