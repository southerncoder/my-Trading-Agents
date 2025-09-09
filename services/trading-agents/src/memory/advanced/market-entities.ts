/**
 * Enhanced Market Entity Modeling for Zep Graphiti
 * 
 * This module defines sophisticated financial entity schemas and relationships
 * that leverage Zep Graphiti's temporal knowledge graph capabilities for
 * institutional trading memory and pattern recognition.
 */

import { z } from 'zod';

// ============================================================================
// CORE MARKET ENTITY TYPES
// ============================================================================

/**
 * Stock Entity - Core company/ticker information with temporal tracking
 */
export const StockEntitySchema = z.object({
  ticker: z.string().describe("Primary ticker symbol (e.g., AAPL)"),
  companyName: z.string().describe("Full company name"),
  sector: z.string().describe("Primary sector classification"),
  industry: z.string().describe("Specific industry within sector"),
  marketCap: z.number().optional().describe("Market capitalization in USD"),
  
  // Temporal attributes for tracking changes over time
  fundamentals: z.object({
    pe_ratio: z.number().optional(),
    revenue_growth: z.number().optional(),
    profit_margin: z.number().optional(),
    debt_to_equity: z.number().optional(),
    timestamp: z.string().describe("When these fundamentals were recorded")
  }).optional(),
  
  // Market performance tracking
  performance: z.object({
    price: z.number(),
    volume: z.number(),
    volatility: z.number().optional(),
    beta: z.number().optional(),
    timestamp: z.string().describe("Performance data timestamp")
  }).optional(),
  
  // Entity metadata for Zep Graphiti
  entity_id: z.string().describe("Unique entity identifier for Zep"),
  created_at: z.string().describe("Entity creation timestamp"),
  updated_at: z.string().describe("Last update timestamp")
});

/**
 * Sector Entity - Industry sector with rotation patterns
 */
export const SectorEntitySchema = z.object({
  name: z.string().describe("Sector name (e.g., Technology, Healthcare)"),
  classification: z.enum(["GICS", "ICB", "Custom"]).describe("Classification system used"),
  
  // Sector rotation characteristics
  cyclical_type: z.enum(["Cyclical", "Defensive", "Growth", "Value"]).optional(),
  interest_rate_sensitivity: z.enum(["High", "Medium", "Low"]).optional(),
  
  // Performance tracking over time
  rotation_patterns: z.array(z.object({
    period: z.string().describe("Time period (e.g., Q1-2024)"),
    relative_performance: z.number().describe("Performance vs market"),
    market_regime: z.string().describe("Market conditions during period"),
    timestamp: z.string()
  })).optional(),
  
  entity_id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * Economic Indicator Entity - Macro economic data points
 */
export const EconomicIndicatorSchema = z.object({
  name: z.string().describe("Indicator name (e.g., Fed Funds Rate, CPI)"),
  source: z.string().describe("Data source (e.g., Federal Reserve, BLS)"),
  frequency: z.enum(["Daily", "Weekly", "Monthly", "Quarterly", "Annual"]),
  category: z.enum(["Interest_Rate", "Inflation", "Employment", "GDP", "Sentiment", "Other"]),
  
  // Historical values with market impact tracking
  values: z.array(z.object({
    value: z.number(),
    timestamp: z.string(),
    market_impact: z.object({
      immediate_reaction: z.number().optional().describe("Market reaction within 24h"),
      sustained_impact: z.number().optional().describe("Impact over following week"),
      affected_sectors: z.array(z.string()).optional()
    }).optional()
  })).optional(),
  
  // Predictive characteristics
  leading_indicator: z.boolean().describe("Whether this tends to predict market moves"),
  volatility_driver: z.boolean().describe("Whether this causes market volatility"),
  
  entity_id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * Market Regime Entity - Overall market condition periods
 */
export const MarketRegimeSchema = z.object({
  name: z.string().describe("Regime name (e.g., Bull Market Q2-2024)"),
  type: z.enum(["Bull", "Bear", "Sideways", "Volatile", "Crisis"]),
  
  // Time boundaries
  start_date: z.string().describe("Regime start date"),
  end_date: z.string().optional().describe("Regime end date (null if current)"),
  
  // Characteristics
  characteristics: z.object({
    avg_volatility: z.number().optional(),
    dominant_sectors: z.array(z.string()).optional(),
    key_drivers: z.array(z.string()).optional(),
    typical_correlations: z.record(z.number()).optional()
  }).optional(),
  
  // Agent performance during this regime
  agent_performance: z.record(z.object({
    accuracy: z.number(),
    confidence_adjustment: z.number(),
    best_strategies: z.array(z.string())
  })).optional(),
  
  entity_id: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// ============================================================================
// RELATIONSHIP TYPES FOR TEMPORAL KNOWLEDGE GRAPH
// ============================================================================

/**
 * Temporal relationships between market entities
 */
export const MarketRelationshipSchema = z.object({
  source_entity_id: z.string(),
  target_entity_id: z.string(),
  relationship_type: z.enum([
    // Stock relationships
    "COMPETES_WITH",
    "SUPPLIES_TO", 
    "CUSTOMER_OF",
    "SAME_SECTOR",
    "CORRELATED_WITH",
    
    // Economic relationships  
    "AFFECTED_BY_INDICATOR",
    "DRIVES_SECTOR",
    "CORRELATES_IN_REGIME",
    
    // Temporal relationships
    "LEADS_PERFORMANCE",
    "FOLLOWS_PATTERN",
    "INVERSE_CORRELATION"
  ]),
  
  // Relationship strength and temporal characteristics
  strength: z.number().min(0).max(1).describe("Relationship strength (0-1)"),
  confidence: z.number().min(0).max(1).describe("Confidence in relationship"),
  
  // Time-based characteristics
  temporal_pattern: z.object({
    lag_days: z.number().optional().describe("Typical lag in days"),
    duration_days: z.number().optional().describe("How long relationship persists"),
    seasonal: z.boolean().describe("Whether relationship is seasonal"),
    regime_dependent: z.boolean().describe("Whether depends on market regime")
  }).optional(),
  
  // Historical evidence
  evidence: z.array(z.object({
    date: z.string(),
    correlation: z.number(),
    market_regime: z.string().optional(),
    notes: z.string().optional()
  })).optional(),
  
  created_at: z.string(),
  updated_at: z.string(),
  valid_from: z.string().describe("When this relationship became valid"),
  valid_until: z.string().optional().describe("When relationship ended (if applicable)")
});

// ============================================================================
// ANALYSIS OUTCOME TRACKING
// ============================================================================

/**
 * Track agent analysis outcomes for learning
 */
export const AnalysisOutcomeSchema = z.object({
  analysis_id: z.string().describe("Unique analysis session ID"),
  
  // Analysis context
  target_entity_id: z.string().describe("Primary entity analyzed (stock/sector)"),
  analysis_type: z.enum(["Fundamental", "Technical", "News", "Social", "Consensus"]),
  agent_type: z.string().describe("Agent that performed analysis"),
  
  // Market context at time of analysis
  market_context: z.object({
    regime_id: z.string().optional(),
    volatility_percentile: z.number().optional(),
    sector_rotation_phase: z.string().optional(),
    key_economic_events: z.array(z.string()).optional()
  }),
  
  // Analysis details
  prediction: z.object({
    direction: z.enum(["BUY", "SELL", "HOLD"]),
    confidence: z.number().min(0).max(1),
    target_price: z.number().optional(),
    time_horizon: z.string().describe("Expected time to target (e.g., '30 days')"),
    key_factors: z.array(z.string()).describe("Main factors supporting prediction")
  }),
  
  // Actual outcome (filled in later)
  outcome: z.object({
    actual_direction: z.enum(["UP", "DOWN", "FLAT"]).optional(),
    actual_return: z.number().optional().describe("Actual return percentage"),
    prediction_accuracy: z.number().optional().describe("How accurate prediction was"),
    key_factors_relevance: z.record(z.number()).optional().describe("How relevant each factor was")
  }).optional(),
  
  // Timestamps
  analysis_timestamp: z.string(),
  outcome_timestamp: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

// ============================================================================
// EXPORT TYPES FOR TYPE SAFETY
// ============================================================================

export type StockEntity = z.infer<typeof StockEntitySchema>;
export type SectorEntity = z.infer<typeof SectorEntitySchema>;
export type EconomicIndicator = z.infer<typeof EconomicIndicatorSchema>;
export type MarketRegime = z.infer<typeof MarketRegimeSchema>;
export type MarketRelationship = z.infer<typeof MarketRelationshipSchema>;
export type AnalysisOutcome = z.infer<typeof AnalysisOutcomeSchema>;

// ============================================================================
// ZEP GRAPHITI SCHEMA CONFIGURATION
// ============================================================================

/**
 * Configuration for Zep Graphiti entity types and relationships
 * This maps our financial entities to Zep's knowledge graph structure
 */
export const ZepGraphitiSchemaConfig = {
  entities: {
    Stock: {
      schema: StockEntitySchema,
      temporal_fields: ['fundamentals.timestamp', 'performance.timestamp'],
      key_field: 'ticker',
      search_fields: ['ticker', 'companyName', 'sector']
    },
    
    Sector: {
      schema: SectorEntitySchema,
      temporal_fields: ['rotation_patterns.timestamp'],
      key_field: 'name',
      search_fields: ['name', 'classification']
    },
    
    EconomicIndicator: {
      schema: EconomicIndicatorSchema,
      temporal_fields: ['values.timestamp'],
      key_field: 'name',
      search_fields: ['name', 'category', 'source']
    },
    
    MarketRegime: {
      schema: MarketRegimeSchema,
      temporal_fields: ['start_date', 'end_date'],
      key_field: 'name',
      search_fields: ['name', 'type']
    },
    
    AnalysisOutcome: {
      schema: AnalysisOutcomeSchema,
      temporal_fields: ['analysis_timestamp', 'outcome_timestamp'],
      key_field: 'analysis_id',
      search_fields: ['agent_type', 'analysis_type', 'target_entity_id']
    }
  },
  
  relationships: {
    MarketRelationship: {
      schema: MarketRelationshipSchema,
      temporal_fields: ['valid_from', 'valid_until'],
      strength_field: 'strength'
    }
  },
  
  // Configuration for Zep's memory consolidation
  consolidation_config: {
    similarity_threshold: 0.8,
    temporal_window_days: 30,
    relationship_decay_rate: 0.1,
    min_evidence_count: 3
  }
};

export default {
  StockEntitySchema,
  SectorEntitySchema,
  EconomicIndicatorSchema,
  MarketRegimeSchema,
  MarketRelationshipSchema,
  AnalysisOutcomeSchema,
  ZepGraphitiSchemaConfig
};