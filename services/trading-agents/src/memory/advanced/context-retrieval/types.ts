/**
 * Context Retrieval Layer - Types and Interfaces
 *
 * This file contains all the TypeScript interfaces and types used by the
 * context retrieval system for intelligent memory search and ranking.
 */

import { ZepClient } from '@getzep/zep-cloud';

/**
 * Extended ZepClient interface to include search methods
 */
export interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
}

/**
 * Interface for embedding service
 */
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  calculateSimilarity(embedding1: number[], embedding2: number[]): number;
  getEmbeddingDimensions(): number;
}

/**
 * Interface for semantic similarity configuration
 */
export interface SemanticSimilarityConfig {
  embeddingService?: EmbeddingService;
  semanticWeight?: number;
  textPreprocessing?: boolean;
  cacheEmbeddings?: boolean;
  similarityThreshold?: number;
}

/**
 * Interface for ML-based relevance ranking configuration
 */
export interface MLRelevanceRankingConfig {
  enableMLRanking?: boolean;
  featureWeights?: Record<string, number>;
  rankingAlgorithm?: 'weighted_sum' | 'gradient_boosting' | 'neural_network';
  confidenceThreshold?: number;
  maxRankingIterations?: number;
  adaptiveWeighting?: boolean;
}

/**
 * Interface for context retrieval criteria
 */
export interface ContextRetrievalCriteria {
  current_market_conditions: {
    market_regime?: string;
    volatility?: number;
    volume_ratio?: number;
    price_level?: number;
    trend_direction?: string;
    momentum?: number;
  };
  technical_indicators?: {
    rsi?: number;
    macd?: number;
    bollinger_position?: number;
    momentum?: number;
  };
  time_horizon?: string;
  risk_tolerance?: string;
  strategy_type?: string;
  max_results?: number;
  relevance_threshold?: number;
}

/**
 * Interface for retrieved memory context
 */
export interface RetrievedMemoryContext {
  memory_id: string;
  memory_type: 'pattern' | 'performance' | 'institutional';
  relevance_score: number;
  similarity_breakdown: {
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  };
  memory_content: {
    description: string;
    conditions: any;
    outcomes: any;
    timestamp: string;
    confidence: number;
  };
  contextual_insights: {
    key_factors: string[];
    success_indicators: string[];
    risk_warnings: string[];
    recommended_actions: string[];
  };
  meta_information: {
    retrieval_timestamp: string;
    retrieval_method: string;
    source_reliability: number;
    last_validation: string;
  };
}

/**
 * Interface for context relevance metrics
 */
export interface ContextRelevanceMetrics {
  total_memories_searched: number;
  relevant_memories_found: number;
  avg_relevance_score: number;
  top_relevance_score: number;
  search_coverage: {
    market_regime_matches: number;
    technical_pattern_matches: number;
    outcome_pattern_matches: number;
    temporal_pattern_matches: number;
  };
  retrieval_performance: {
    search_duration_ms: number;
    similarity_calculation_time_ms: number;
    ranking_time_ms: number;
    total_retrieval_time_ms: number;
  };
  // ML-based relevance ranking metrics
  ml_ranking_enabled?: boolean;
  ranking_algorithm?: string;
  adaptive_weighting_applied?: boolean;
  feature_weights_used?: Record<string, number>;
}

/**
 * Interface for search strategy configuration
 */
export interface SearchStrategy {
  name: string;
  filters: string[];
  similarity_methods: string[];
  ranking_criteria: string[];
}

/**
 * Interface for scenario search options
 */
export interface ScenarioSearchOptions {
  lookback_days?: number;
  min_similarity?: number;
  max_results?: number;
}

/**
 * Interface for performance context criteria
 */
export interface PerformanceContextCriteria {
  strategy_type?: string;
  market_conditions?: any;
  time_period?: string;
  performance_threshold?: number;
}

/**
 * Interface for similar scenario result
 */
export interface SimilarScenarioResult {
  scenario_id: string;
  similarity_score: number;
  historical_date: string;
  market_conditions: any;
  outcomes: any;
  lessons_learned: string[];
}

/**
 * Interface for performance context result
 */
export interface PerformanceContextResult {
  performance_id: string;
  agent_id: string;
  strategy_performance: {
    success_rate: number;
    avg_return: number;
    volatility: number;
    max_drawdown: number;
  };
  context_conditions: any;
  key_insights: string[];
  recommended_adjustments: string[];
}

/**
 * Interface for multi-dimensional similarity result
 */
export interface MultiDimensionalSimilarity {
  market_conditions_similarity: number;
  technical_indicators_similarity: number;
  temporal_similarity: number;
  outcome_similarity: number;
  overall_similarity: number;
}

/**
 * Interface for technical indicators data
 */
export interface TechnicalIndicatorsData {
  rsi?: number;
  rsi_signal?: string;
  macd?: {
    value?: number;
    signal?: number;
    histogram?: number;
  };
  macd_signal?: string;
  bollinger_bands?: {
    upper?: number;
    middle?: number;
    lower?: number;
    bandwidth?: number;
  };
  bollinger_signal?: string;
  moving_averages?: {
    sma_20?: number;
    sma_50?: number;
    sma_200?: number;
    ema_12?: number;
    ema_26?: number;
  };
  ma_signal?: string;
  stochastic?: {
    k?: number;
    d?: number;
  };
  stochastic_signal?: string;
  volume_indicators?: {
    volume?: number;
    volume_sma?: number;
    obv?: number;
    volume_ratio?: number;
  };
  volume_signal?: string;
  momentum_indicators?: {
    momentum?: number;
    roc?: number;
    williams_r?: number;
  };
  momentum_signal?: string;
  volatility_indicators?: {
    atr?: number;
    standard_deviation?: number;
    volatility_ratio?: number;
  };
  volatility_signal?: string;
  trend_indicators?: {
    adx?: number;
    di_plus?: number;
    di_minus?: number;
    trend_strength?: number;
  };
  trend_signal?: string;
  support_resistance?: {
    support_levels?: number[];
    resistance_levels?: number[];
    pivot_point?: number;
    pivot_support?: number;
    pivot_resistance?: number;
  };
  sr_signal?: string;
  overall_technical_signal?: string;
  technical_confidence?: number;
}

/**
 * Interface for market conditions data
 */
export interface MarketConditionsData {
  market_regime?: string;
  volatility?: number;
  volume_ratio?: number;
  price_level?: number;
  trend_direction?: string;
  momentum?: number;
  sector?: string;
  market_cap?: number;
  trading_volume?: number;
  price_change?: number;
  volatility_regime?: string;
  liquidity?: number;
  market_sentiment?: string;
}

/**
 * Interface for outcomes data
 */
export interface OutcomesData {
  strategy_type?: string;
  success_rate?: number;
  profit_loss?: number;
  risk_outcome?: string;
  time_effectiveness?: string;
  confidence_score?: number;
  market_impact?: number;
  drawdown?: number;
  sharpe_ratio?: number;
  execution_quality?: number;
  outcome_category?: string;
  lessons_learned?: string;
  win_rate?: number;
  avg_trade_duration?: number;
  sample_size?: number;
}

/**
 * Interface for context retrieval options
 */
export interface ContextRetrievalOptions {
  maxSearchResults?: number;
  relevanceThreshold?: number;
  cacheEnabled?: boolean;
  logger?: any;
  semanticConfig?: SemanticSimilarityConfig;
  mlRankingConfig?: MLRelevanceRankingConfig;
}

/**
 * Interface for search insights
 */
export interface SearchInsights {
  search_strategy: string;
  filters_applied: string[];
  similarity_methods: string[];
  ranking_criteria: string[];
}

/**
 * Interface for context retrieval result
 */
export interface ContextRetrievalResult {
  retrieved_memories: RetrievedMemoryContext[];
  relevance_metrics: ContextRelevanceMetrics;
  search_insights: SearchInsights;
}