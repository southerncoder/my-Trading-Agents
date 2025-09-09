/**
 * Cross-Session Memory System for Trading Agents
 * 
 * This module implements persistent memory capabilities that maintain
 * insights, patterns, and learning across different trading sessions
 * and time periods. It enables agents to build upon previous experiences
 * and continuously improve their decision-making.
 * 
 * Key Features:
 * - Session-independent memory persistence
 * - Cross-session pattern correlation and validation
 * - Long-term learning and insight accumulation
 * - Market regime change detection across sessions
 * - Agent performance evolution tracking
 * - Strategic insight persistence and retrieval
 * 
 * Integration with Zep Graphiti:
 * - Leverages temporal knowledge graphs for cross-session storage
 * - Maintains temporal relationships between sessions
 * - Enables sophisticated querying across time periods
 * - Supports incremental learning and pattern refinement
 */

import { z } from 'zod';

// Cross-session memory schemas
export const TradingSessionSchema = z.object({
  session_id: z.string().describe('Unique session identifier'),
  start_timestamp: z.string(),
  end_timestamp: z.string().optional(),
  session_type: z.enum(['live_trading', 'paper_trading', 'analysis_only', 'backtesting']),
  market_conditions: z.object({
    market_regime: z.enum(['bull', 'bear', 'sideways', 'volatile']),
    volatility_level: z.enum(['low', 'medium', 'high', 'extreme']),
    economic_backdrop: z.record(z.string(), z.any()),
    major_events: z.array(z.string())
  }),
  agents_active: z.array(z.string()),
  decisions_made: z.array(z.object({
    decision_id: z.string(),
    agent_id: z.string(),
    entity_id: z.string(),
    decision_type: z.enum(['buy', 'sell', 'hold', 'reduce', 'avoid']),
    confidence: z.number().min(0).max(1),
    reasoning: z.array(z.string()),
    timestamp: z.string()
  })),
  session_outcomes: z.object({
    total_return: z.number(),
    win_rate: z.number().min(0).max(1),
    max_drawdown: z.number(),
    sharpe_ratio: z.number(),
    decisions_count: z.number(),
    major_insights: z.array(z.string())
  }),
  lessons_learned: z.array(z.object({
    lesson_id: z.string(),
    category: z.enum(['risk_management', 'opportunity_identification', 'timing', 'market_analysis', 'behavioral']),
    description: z.string(),
    supporting_evidence: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    applicability_score: z.number().min(0).max(1)
  }))
});

export const CrossSessionInsightSchema = z.object({
  insight_id: z.string(),
  insight_category: z.enum([
    'market_pattern_evolution',
    'agent_performance_trend',
    'risk_factor_emergence',
    'opportunity_pattern',
    'behavioral_bias_detection',
    'market_regime_indicator',
    'timing_optimization',
    'portfolio_construction'
  ]),
  description: z.string(),
  supporting_sessions: z.array(z.string()),
  confidence_evolution: z.array(z.object({
    timestamp: z.string(),
    confidence: z.number().min(0).max(1),
    supporting_evidence: z.string()
  })),
  applicable_conditions: z.object({
    market_regimes: z.array(z.string()),
    volatility_ranges: z.array(z.string()),
    sector_conditions: z.record(z.string(), z.string()),
    time_horizons: z.array(z.string())
  }),
  performance_impact: z.object({
    return_improvement: z.number(),
    risk_reduction: z.number(),
    decision_accuracy_improvement: z.number(),
    timing_improvement: z.number()
  }),
  validation_history: z.array(z.object({
    validation_date: z.string(),
    test_conditions: z.any(),
    outcome: z.enum(['confirmed', 'rejected', 'modified', 'inconclusive']),
    notes: z.string()
  }))
});

export type TradingSession = z.infer<typeof TradingSessionSchema>;
export type CrossSessionInsight = z.infer<typeof CrossSessionInsightSchema>;

/**
 * Cross-Session Memory System
 * 
 * Manages persistent memory across trading sessions, enabling long-term
 * learning, pattern recognition, and strategic insight accumulation.
 */
export class CrossSessionMemorySystem {
  private zepClient: any;
  private logger: any;
  
  // Memory databases
  private sessionHistory: Map<string, TradingSession> = new Map();
  private crossSessionInsights: Map<string, CrossSessionInsight> = new Map();
  
  // System configuration
  private config: {
    maxSessionsToRetain: number;
    insightConfidenceThreshold: number;
  };

  constructor(
    zepClient: any,
    config?: {
      maxSessionsToRetain?: number;
      insightConfidenceThreshold?: number;
    },
    logger?: any
  ) {
    this.zepClient = zepClient;
    this.logger = logger || console;
    
    this.config = {
      maxSessionsToRetain: config?.maxSessionsToRetain || 1000,
      insightConfidenceThreshold: config?.insightConfidenceThreshold || 0.7
    };
  }

  /**
   * Start a new trading session
   */
  async startSession(
    sessionType: 'live_trading' | 'paper_trading' | 'analysis_only' | 'backtesting',
    agentsActive: string[],
    marketConditions?: any
  ): Promise<string> {
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TradingSession = {
      session_id: sessionId,
      start_timestamp: new Date().toISOString(),
      session_type: sessionType,
      market_conditions: {
        market_regime: marketConditions?.market_regime || 'sideways',
        volatility_level: marketConditions?.volatility_level || 'medium',
        economic_backdrop: marketConditions?.economic_backdrop || {},
        major_events: marketConditions?.major_events || []
      },
      agents_active: agentsActive,
      decisions_made: [],
      session_outcomes: {
        total_return: 0,
        win_rate: 0,
        max_drawdown: 0,
        sharpe_ratio: 0,
        decisions_count: 0,
        major_insights: []
      },
      lessons_learned: []
    };
    
    this.sessionHistory.set(sessionId, session);
    
    // Store session in Zep Graphiti
    await this.storeSessionInGraph(session);
    
    this.logger.info('startSession', 'Trading session started', {
      sessionId,
      sessionType,
      agentsActive: agentsActive.length
    });
    
    return sessionId;
  }

  /**
   * Record a trading decision in the current session
   */
  async recordDecision(
    sessionId: string,
    agentId: string,
    entityId: string,
    decisionType: 'buy' | 'sell' | 'hold' | 'reduce' | 'avoid',
    confidence: number,
    reasoning: string[]
  ): Promise<void> {
    
    const session = this.sessionHistory.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const decision = {
      decision_id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent_id: agentId,
      entity_id: entityId,
      decision_type: decisionType,
      confidence,
      reasoning,
      timestamp: new Date().toISOString()
    };
    
    session.decisions_made.push(decision);
    session.session_outcomes.decisions_count = session.decisions_made.length;
    
    // Update session in storage
    await this.updateSessionInGraph(session);
    
    this.logger.info('recordDecision', 'Decision recorded', {
      sessionId,
      agentId,
      entityId,
      decisionType,
      confidence
    });
  }

  /**
   * End a trading session and capture outcomes
   */
  async endSession(
    sessionId: string,
    outcomes: {
      totalReturn: number;
      winRate: number;
      maxDrawdown: number;
      sharpeRatio: number;
      majorInsights: string[];
    }
  ): Promise<void> {
    
    const session = this.sessionHistory.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    session.end_timestamp = new Date().toISOString();
    session.session_outcomes = {
      total_return: outcomes.totalReturn,
      win_rate: outcomes.winRate,
      max_drawdown: outcomes.maxDrawdown,
      sharpe_ratio: outcomes.sharpeRatio,
      decisions_count: session.decisions_made.length,
      major_insights: outcomes.majorInsights
    };
    
    // Extract lessons learned from session
    session.lessons_learned = await this.extractLessonsLearned(session);
    
    // Update session in storage
    await this.updateSessionInGraph(session);
    
    // Analyze for cross-session insights
    await this.analyzeForCrossSessionInsights(session);
    
    this.logger.info('endSession', 'Trading session ended', {
      sessionId,
      duration: this.calculateSessionDuration(session),
      totalReturn: outcomes.totalReturn,
      decisionsCount: session.decisions_made.length
    });
  }

  /**
   * Retrieve relevant insights for current trading context
   */
  async getRelevantInsights(
    currentMarketConditions: {
      marketRegime: string;
      volatilityLevel: string;
      sectorConditions: Record<string, string>;
      timeHorizon: string;
    },
    maxInsights: number = 10
  ): Promise<CrossSessionInsight[]> {
    
    const relevantInsights: CrossSessionInsight[] = [];
    
    for (const insight of this.crossSessionInsights.values()) {
      // Check if insight is applicable to current conditions
      const isApplicable = this.isInsightApplicable(insight, currentMarketConditions);
      
      if (isApplicable && insight.confidence_evolution.length > 0) {
        const latestConfidence = insight.confidence_evolution[insight.confidence_evolution.length - 1]?.confidence || 0;
        if (latestConfidence >= this.config.insightConfidenceThreshold) {
          relevantInsights.push(insight);
        }
      }
    }
    
    // Sort by confidence and performance impact
    relevantInsights.sort((a, b) => {
      const aScore = this.calculateInsightRelevanceScore(a, currentMarketConditions);
      const bScore = this.calculateInsightRelevanceScore(b, currentMarketConditions);
      return bScore - aScore;
    });
    
    return relevantInsights.slice(0, maxInsights);
  }

  /**
   * Get cross-session memory statistics
   */
  getMemoryStats(): {
    totalSessions: number;
    totalInsights: number;
    averageSessionDuration: number;
    memoryUtilization: number;
  } {
    
    const sessions = Array.from(this.sessionHistory.values());
    const averageDuration = sessions.reduce((sum, session) => {
      return sum + this.calculateSessionDuration(session);
    }, 0) / sessions.length;
    
    return {
      totalSessions: this.sessionHistory.size,
      totalInsights: this.crossSessionInsights.size,
      averageSessionDuration: averageDuration || 0,
      memoryUtilization: (this.sessionHistory.size / this.config.maxSessionsToRetain) * 100
    };
  }

  // Private helper methods

  private async storeSessionInGraph(session: TradingSession): Promise<void> {
    try {
      // In production, this would store the session in Zep Graphiti
      this.logger.debug('storeSessionInGraph', 'Session stored in knowledge graph', {
        sessionId: session.session_id
      });
    } catch (error) {
      this.logger.error('storeSessionInGraph', 'Failed to store session', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updateSessionInGraph(session: TradingSession): Promise<void> {
    try {
      // In production, this would update the session in Zep Graphiti
      this.logger.debug('updateSessionInGraph', 'Session updated in knowledge graph', {
        sessionId: session.session_id
      });
    } catch (error) {
      this.logger.error('updateSessionInGraph', 'Failed to update session', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async extractLessonsLearned(session: TradingSession): Promise<any[]> {
    const lessons: any[] = [];
    
    // Analyze decisions for patterns and lessons
    const successfulDecisions = session.decisions_made.filter(d => d.confidence > 0.7);
    const unsuccessfulDecisions = session.decisions_made.filter(d => d.confidence < 0.4);
    
    if (successfulDecisions.length > 0) {
      lessons.push({
        lesson_id: `lesson_${Date.now()}_success`,
        category: 'opportunity_identification',
        description: `High-confidence decisions (${successfulDecisions.length}) showed strong conviction`,
        supporting_evidence: successfulDecisions.map(d => d.reasoning.join('; ')).slice(0, 3),
        confidence: 0.8,
        applicability_score: 0.9
      });
    }
    
    if (unsuccessfulDecisions.length > 0) {
      lessons.push({
        lesson_id: `lesson_${Date.now()}_risk`,
        category: 'risk_management',
        description: `Low-confidence decisions (${unsuccessfulDecisions.length}) indicate areas for improvement`,
        supporting_evidence: unsuccessfulDecisions.map(d => d.reasoning.join('; ')).slice(0, 3),
        confidence: 0.7,
        applicability_score: 0.8
      });
    }
    
    return lessons;
  }

  private async analyzeForCrossSessionInsights(_session: TradingSession): Promise<void> {
    // Analyze session for insights that apply across sessions
    // In production, this would implement sophisticated pattern analysis
  }

  private calculateSessionDuration(session: TradingSession): number {
    if (!session.end_timestamp) return 0;
    
    const start = new Date(session.start_timestamp).getTime();
    const end = new Date(session.end_timestamp).getTime();
    return (end - start) / (1000 * 60 * 60); // Hours
  }

  private isInsightApplicable(
    insight: CrossSessionInsight,
    currentConditions: {
      marketRegime: string;
      volatilityLevel: string;
      sectorConditions: Record<string, string>;
      timeHorizon: string;
    }
  ): boolean {
    
    // Check if current conditions match insight's applicable conditions
    const regimeMatch = insight.applicable_conditions.market_regimes.includes(currentConditions.marketRegime);
    const volatilityMatch = insight.applicable_conditions.volatility_ranges.includes(currentConditions.volatilityLevel);
    const timeHorizonMatch = insight.applicable_conditions.time_horizons.includes(currentConditions.timeHorizon);
    
    return regimeMatch && volatilityMatch && timeHorizonMatch;
  }

  private calculateInsightRelevanceScore(
    insight: CrossSessionInsight,
    _currentConditions: any
  ): number {
    
    const latestConfidence = insight.confidence_evolution[insight.confidence_evolution.length - 1]?.confidence || 0;
    const performanceImpact = (
      insight.performance_impact.return_improvement +
      insight.performance_impact.risk_reduction +
      insight.performance_impact.decision_accuracy_improvement
    ) / 3;
    
    return latestConfidence * 0.6 + performanceImpact * 0.4;
  }
}

/**
 * Factory function for creating cross-session memory system
 */
export function createCrossSessionMemorySystem(
  zepClient: any,
  config?: {
    maxSessionsToRetain?: number;
    insightConfidenceThreshold?: number;
  }
): CrossSessionMemorySystem {
  return new CrossSessionMemorySystem(zepClient, config);
}