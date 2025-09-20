/**
 * Context Retrieval Schemas and Types
 *
 * Zod schemas and TypeScript types for the advanced context retrieval system.
 * These schemas define the structure for market context queries, similar scenarios,
 * and retrieval results used by the trading agents.
 */

import { z } from 'zod';

// Context query schemas
export const MarketContextQuerySchema = z.object({
  entity_id: z.string().describe('Target stock/sector/entity ID'),
  current_conditions: z.object({
    price_level: z.number().describe('Current price relative to historical range (0-1)'),
    volatility: z.number().describe('Current volatility percentile'),
    volume: z.number().describe('Current volume relative to average'),
    market_regime: z.enum(['bull', 'bear', 'sideways', 'volatile']),
    sector_momentum: z.record(z.string(), z.number()).describe('Sector rotation signals'),
    economic_indicators: z.record(z.string(), z.number()).describe('Key economic metrics'),
    sentiment_scores: z.record(z.string(), z.number()).describe('Market sentiment indicators'),
    technical_indicators: z.record(z.string(), z.number()).describe('Technical analysis signals'),
    news_sentiment: z.number().min(-1).max(1).describe('Recent news sentiment score'),
    options_flow: z.object({
      put_call_ratio: z.number(),
      implied_volatility: z.number(),
      unusual_activity: z.boolean()
    }).optional()
  }),
  query_parameters: z.object({
    lookback_days: z.number().default(1095).describe('How far back to search'),
    max_results: z.number().default(10).describe('Maximum similar scenarios to return'),
    min_similarity: z.number().default(0.7).describe('Minimum similarity threshold'),
    time_decay_factor: z.number().default(0.95).describe('Exponential decay for older data'),
    outcome_horizons: z.array(z.number()).default([1, 5, 21, 63]).describe('Days ahead to analyze outcomes'),
    regime_strict: z.boolean().default(false).describe('Must match exact market regime'),
    sector_weight: z.number().default(0.3).describe('Weight for sector-based similarity'),
    macro_weight: z.number().default(0.4).describe('Weight for macro economic similarity'),
    technical_weight: z.number().default(0.3).describe('Weight for technical similarity')
  })
});

export const SimilarScenarioSchema = z.object({
  scenario_id: z.string().describe('Unique identifier for historical scenario'),
  match_date: z.string().describe('Date of the similar historical condition'),
  similarity_score: z.number().min(0).max(1).describe('Overall similarity score'),
  similarity_breakdown: z.object({
    technical_similarity: z.number().min(0).max(1),
    macro_similarity: z.number().min(0).max(1),
    sector_similarity: z.number().min(0).max(1),
    sentiment_similarity: z.number().min(0).max(1),
    volatility_similarity: z.number().min(0).max(1)
  }),
  historical_conditions: z.object({
    price_level: z.number(),
    volatility: z.number(),
    volume: z.number(),
    market_regime: z.string(),
    sector_momentum: z.record(z.string(), z.number()),
    economic_indicators: z.record(z.string(), z.number()),
    sentiment_scores: z.record(z.string(), z.number()),
    technical_indicators: z.record(z.string(), z.number())
  }),
  outcomes: z.record(z.string(), z.object({
    price_change: z.number().describe('Price change percentage'),
    volatility_change: z.number().describe('Change in volatility'),
    volume_change: z.number().describe('Change in volume'),
    max_drawdown: z.number().describe('Maximum drawdown during period'),
    sharpe_ratio: z.number().describe('Risk-adjusted return'),
    success_probability: z.number().min(0).max(1).describe('Probability of positive outcome')
  })),
  contextual_events: z.array(z.object({
    event_type: z.enum(['earnings', 'fed_decision', 'geopolitical', 'sector_news', 'technical_breakout']),
    event_date: z.string(),
    impact_magnitude: z.number().min(0).max(1),
    description: z.string()
  })),
  confidence_score: z.number().min(0).max(1).describe('Confidence in this scenario relevance'),
  recency_weight: z.number().min(0).max(1).describe('Weight based on recency'),
  uniqueness_score: z.number().min(0).max(1).describe('How unique/rare this scenario was')
});

export const ContextRetrievalResultSchema = z.object({
  query_summary: z.object({
    entity_id: z.string(),
    query_timestamp: z.string(),
    conditions_fingerprint: z.string().describe('Hash of current conditions'),
    total_scenarios_analyzed: z.number(),
    search_time_ms: z.number()
  }),
  similar_scenarios: z.array(SimilarScenarioSchema),
  pattern_insights: z.object({
    dominant_patterns: z.array(z.object({
      pattern_type: z.string(),
      frequency: z.number(),
      avg_outcome: z.number(),
      confidence: z.number()
    })),
    risk_factors: z.array(z.object({
      factor_name: z.string(),
      risk_level: z.enum(['low', 'medium', 'high']),
      historical_impact: z.number(),
      mitigation_strategies: z.array(z.string())
    })),
    opportunity_indicators: z.array(z.object({
      indicator_name: z.string(),
      signal_strength: z.number().min(0).max(1),
      success_rate: z.number().min(0).max(1),
      typical_timeline: z.string()
    }))
  }),
  regime_analysis: z.object({
    current_regime_stability: z.number().min(0).max(1),
    regime_transition_probability: z.record(z.string(), z.number()),
    regime_specific_outcomes: z.record(z.string(), z.object({
      avg_return: z.number(),
      volatility: z.number(),
      max_drawdown: z.number(),
      duration_days: z.number()
    }))
  }),
  recommendation_context: z.object({
    base_case_scenario: z.object({
      probability: z.number().min(0).max(1),
      expected_return: z.number(),
      risk_metrics: z.record(z.string(), z.number())
    }),
    alternative_scenarios: z.array(z.object({
      scenario_name: z.string(),
      probability: z.number().min(0).max(1),
      expected_return: z.number(),
      key_triggers: z.array(z.string())
    })),
    stress_test_results: z.array(z.object({
      stress_scenario: z.string(),
      probability: z.number().min(0).max(1),
      impact_severity: z.number(),
      recovery_timeline: z.string()
    }))
  })
});

// Type exports
export type MarketContextQuery = z.infer<typeof MarketContextQuerySchema>;
export type SimilarScenario = z.infer<typeof SimilarScenarioSchema>;
export type ContextRetrievalResult = z.infer<typeof ContextRetrievalResultSchema>;