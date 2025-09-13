import { AgentState } from '../../../types/agent-states';
import { LearningExample } from '../../../learning/learning-types';
import { createLogger } from '../../../utils/enhanced-logger';

/**
 * Learning Insights Service
 * Handles learning-related operations for fundamentals analysis
 */
export class LearningInsightsService {
  private logger = createLogger('agent', 'learning-insights-service');

  /**
   * Apply learned adaptations to fundamentals analysis strategy
   */
  async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    this.logger.info('applyLearnedAdaptations', 'Applying learned adaptations to fundamentals analysis', {
      insightsCount: insights.length,
      company: state.company_of_interest
    });

    // Adapt analysis based on learned patterns
    for (const insight of insights) {
      if (insight.source === 'supervised' && insight.confidence_score > 0.8) {
        // Apply supervised learning insights (valuation patterns)
        await this.applySupervisedInsight(insight, state);
      } else if (insight.source === 'unsupervised') {
        // Apply unsupervised learning insights (financial health patterns)
        await this.applyUnsupervisedInsight(insight, state);
      }
    }
  }

  /**
   * Create experience from processing for learning
   */
  createExperienceFromProcessing(
    state: AgentState,
    result: Partial<AgentState>,
    analystName: string
  ): LearningExample {
    // Extract features from fundamentals analysis
    const features = this.extractFeaturesFromFundamentals(result.fundamentals_report || '');

    // Calculate target based on fundamentals assessment
    const target = this.extractTargetFromFundamentals(result.fundamentals_report || '');

    return {
      id: `fundamentals-analysis-${state.company_of_interest}-${Date.now()}`,
      features,
      target,
      timestamp: new Date().toISOString(),
      market_conditions: {
        company: state.company_of_interest,
        analysis_date: state.trade_date,
        analyst_type: analystName.toLowerCase().replace(' ', '_')
      },
      outcome: {
        realized_return: 0, // Will be updated when actual results are known
        risk_adjusted_return: 0,
        holding_period: 1,
        confidence_score: this.extractConfidenceFromFundamentals(result.fundamentals_report || '')
      }
    };
  }

  /**
   * Extract features from fundamentals analysis report
   */
  private extractFeaturesFromFundamentals(report: string): Record<string, number> {
    const features: Record<string, number> = {};

    // Extract financial ratios
    const peMatch = report.match(/P\/E[:\s]+(\d+\.?\d*)/i);
    if (peMatch && peMatch[1]) features.pe_ratio = parseFloat(peMatch[1]);

    const pbMatch = report.match(/P\/B[:\s]+(\d+\.?\d*)/i);
    if (pbMatch && pbMatch[1]) features.pb_ratio = parseFloat(pbMatch[1]);

    const roeMatch = report.match(/ROE[:\s]+(\d+\.?\d*)/i);
    if (roeMatch && roeMatch[1]) features.roe = parseFloat(roeMatch[1]);

    const debtEquityMatch = report.match(/debt.equity[:\s]+(\d+\.?\d*)/i);
    if (debtEquityMatch && debtEquityMatch[1]) features.debt_to_equity = parseFloat(debtEquityMatch[1]);

    // Extract growth rates
    const revenueGrowthMatch = report.match(/revenue.growth[:\s]+(\d+\.?\d*)/i);
    if (revenueGrowthMatch && revenueGrowthMatch[1]) features.revenue_growth = parseFloat(revenueGrowthMatch[1]);

    // Default features if none extracted
    if (Object.keys(features).length === 0) {
      features.financial_strength = 0.5;
      features.growth_potential = 0.5;
      features.valuation_attractiveness = 0.5;
    }

    return features;
  }

  /**
   * Extract target value from fundamentals assessment
   */
  private extractTargetFromFundamentals(report: string): number {
    if (report.toLowerCase().includes('undervalued') || report.toLowerCase().includes('attractive valuation')) {
      return 1.0; // Positive fundamental assessment
    } else if (report.toLowerCase().includes('overvalued') || report.toLowerCase().includes('expensive')) {
      return -1.0; // Negative fundamental assessment
    } else {
      return 0.0; // Neutral assessment
    }
  }

  /**
   * Extract confidence score from fundamentals analysis
   */
  private extractConfidenceFromFundamentals(report: string): number {
    if (report.toLowerCase().includes('high confidence') || report.toLowerCase().includes('very confident')) {
      return 0.9;
    } else if (report.toLowerCase().includes('moderate confidence') || report.toLowerCase().includes('reasonable confidence')) {
      return 0.7;
    } else if (report.toLowerCase().includes('low confidence') || report.toLowerCase().includes('uncertain')) {
      return 0.3;
    } else {
      return 0.6; // Default confidence for fundamentals
    }
  }

  /**
   * Apply supervised learning insight
   */
  private async applySupervisedInsight(insight: any, state: AgentState): Promise<void> {
    try {
      this.logger.info('applySupervisedInsight', 'Applying supervised learning insight for fundamentals analysis', {
        insightType: insight.insight_type,
        confidence: insight.confidence_score,
        company: state.company_of_interest
      });

      // Apply pattern recognition for valuation assessment
      const valuationAdjustment = await this.applyValuationPatternRecognition(insight, state);

      // Adapt analysis strategy based on learned patterns
      const strategyAdaptation = await this.adaptFundamentalsStrategy(insight, state);

      // Update confidence scoring based on historical accuracy
      const confidenceUpdate = await this.updateConfidenceScoring(insight, state);

      this.logger.info('applySupervisedInsight', 'Successfully applied supervised learning insight', {
        valuationAdjustment,
        strategyAdaptation,
        confidenceUpdate,
        insightId: insight.insight_id
      });

    } catch (error) {
      this.logger.error('applySupervisedInsight', 'Failed to apply supervised learning insight', {
        error: error instanceof Error ? error.message : String(error),
        insightType: insight.insight_type,
        company: state.company_of_interest
      });
    }
  }

  /**
   * Apply valuation pattern recognition from supervised learning
   */
  private async applyValuationPatternRecognition(insight: any, _state: AgentState): Promise<number> {
    // Extract valuation patterns from insight
    const patterns = insight.supporting_evidence || [];
    let adjustment = 0;

    // Apply pattern-based adjustments
    for (const pattern of patterns) {
      if (pattern.toLowerCase().includes('undervalued') && pattern.toLowerCase().includes('pe')) {
        adjustment += 0.1; // Increase attractiveness for undervalued PE
      } else if (pattern.toLowerCase().includes('overvalued') && pattern.toLowerCase().includes('pe')) {
        adjustment -= 0.1; // Decrease attractiveness for overvalued PE
      } else if (pattern.toLowerCase().includes('strong roe') && pattern.toLowerCase().includes('growth')) {
        adjustment += 0.15; // Increase for strong ROE + growth combination
      } else if (pattern.toLowerCase().includes('high debt') && pattern.toLowerCase().includes('low growth')) {
        adjustment -= 0.2; // Decrease for risky debt + low growth combination
      }
    }

    // Apply insight confidence as weighting factor
    adjustment *= insight.confidence_score;

    this.logger.debug('applyValuationPatternRecognition', 'Applied valuation pattern recognition', {
      patternsFound: patterns.length,
      adjustment,
      confidence: insight.confidence_score
    });

    return adjustment;
  }

  /**
   * Adapt fundamentals analysis strategy based on learned patterns
   */
  private async adaptFundamentalsStrategy(insight: any, _state: AgentState): Promise<string> {
    const recommendations = insight.actionable_recommendations || [];
    let strategyChange = 'no_change';

    // Analyze recommendations for strategy adaptation
    if (recommendations.some((rec: string) => rec.toLowerCase().includes('focus on growth'))) {
      strategyChange = 'emphasize_growth_metrics';
    } else if (recommendations.some((rec: string) => rec.toLowerCase().includes('focus on value'))) {
      strategyChange = 'emphasize_value_metrics';
    } else if (recommendations.some((rec: string) => rec.toLowerCase().includes('increase scrutiny'))) {
      strategyChange = 'increase_risk_analysis';
    } else if (recommendations.some((rec: string) => rec.toLowerCase().includes('reduce analysis'))) {
      strategyChange = 'streamline_analysis';
    }

    this.logger.debug('adaptFundamentalsStrategy', 'Adapted fundamentals analysis strategy', {
      strategyChange,
      recommendationsCount: recommendations.length
    });

    return strategyChange;
  }

  /**
   * Update confidence scoring based on historical insight accuracy
   */
  private async updateConfidenceScoring(insight: any, _state: AgentState): Promise<number> {
    // Calculate confidence adjustment based on insight type and historical patterns
    let confidenceAdjustment = 0;

    if (insight.insight_type === 'pattern') {
      confidenceAdjustment = insight.confidence_score > 0.8 ? 0.1 : -0.05;
    } else if (insight.insight_type === 'strategy') {
      confidenceAdjustment = insight.confidence_score > 0.7 ? 0.08 : -0.03;
    } else if (insight.insight_type === 'warning') {
      confidenceAdjustment = -0.1; // Reduce confidence for warnings
    }

    this.logger.debug('updateConfidenceScoring', 'Updated confidence scoring', {
      insightType: insight.insight_type,
      originalConfidence: insight.confidence_score,
      adjustment: confidenceAdjustment
    });

    return confidenceAdjustment;
  }

  /**
   * Apply unsupervised learning insight
   */
  private async applyUnsupervisedInsight(insight: any, state: AgentState): Promise<void> {
    try {
      this.logger.info('applyUnsupervisedInsight', 'Applying unsupervised learning insight for fundamentals analysis', {
        insightType: insight.insight_type,
        confidence: insight.confidence_score,
        company: state.company_of_interest
      });

      // Apply clustering analysis for financial health patterns
      const clusterAnalysis = await this.applyClusteringAnalysis(insight, state);

      // Detect anomalies in financial metrics
      const anomalyDetection = await this.detectFinancialAnomalies(insight, state);

      // Identify peer group comparisons
      const peerComparison = await this.identifyPeerGroupPatterns(insight, state);

      this.logger.info('applyUnsupervisedInsight', 'Successfully applied unsupervised learning insight', {
        clusterAnalysis,
        anomalyDetection,
        peerComparison,
        insightId: insight.insight_id
      });

    } catch (error) {
      this.logger.error('applyUnsupervisedInsight', 'Failed to apply unsupervised learning insight', {
        error: error instanceof Error ? error.message : String(error),
        insightType: insight.insight_type,
        company: state.company_of_interest
      });
    }
  }

  /**
   * Apply clustering analysis for financial health patterns
   */
  private async applyClusteringAnalysis(insight: any, _state: AgentState): Promise<string> {
    const evidence = insight.supporting_evidence || [];
    let clusterResult = 'no_pattern_detected';

    // Analyze clustering patterns in evidence
    if (evidence.some((ev: string) => ev.toLowerCase().includes('cluster') && ev.toLowerCase().includes('healthy'))) {
      clusterResult = 'healthy_financial_cluster';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('cluster') && ev.toLowerCase().includes('risky'))) {
      clusterResult = 'risky_financial_cluster';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('outlier') && ev.toLowerCase().includes('positive'))) {
      clusterResult = 'positive_outlier_pattern';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('outlier') && ev.toLowerCase().includes('negative'))) {
      clusterResult = 'negative_outlier_pattern';
    }

    this.logger.debug('applyClusteringAnalysis', 'Applied clustering analysis', {
      clusterResult,
      evidenceCount: evidence.length,
      confidence: insight.confidence_score
    });

    return clusterResult;
  }

  /**
   * Detect anomalies in financial metrics using unsupervised learning
   */
  private async detectFinancialAnomalies(insight: any, _state: AgentState): Promise<string[]> {
    const recommendations = insight.actionable_recommendations || [];
    const anomalies: string[] = [];

    // Identify anomaly patterns in recommendations
    if (recommendations.some((rec: string) => rec.toLowerCase().includes('unusual') && rec.toLowerCase().includes('debt'))) {
      anomalies.push('unusual_debt_pattern');
    }
    if (recommendations.some((rec: string) => rec.toLowerCase().includes('anomalous') && rec.toLowerCase().includes('growth'))) {
      anomalies.push('anomalous_growth_pattern');
    }
    if (recommendations.some((rec: string) => rec.toLowerCase().includes('outlier') && rec.toLowerCase().includes('margin'))) {
      anomalies.push('outlier_margin_pattern');
    }
    if (recommendations.some((rec: string) => rec.toLowerCase().includes('deviation') && rec.toLowerCase().includes('industry'))) {
      anomalies.push('industry_deviation_detected');
    }

    this.logger.debug('detectFinancialAnomalies', 'Detected financial anomalies', {
      anomaliesFound: anomalies.length,
      anomalies,
      confidence: insight.confidence_score
    });

    return anomalies;
  }

  /**
   * Identify peer group comparison patterns
   */
  private async identifyPeerGroupPatterns(insight: any, _state: AgentState): Promise<string> {
    const evidence = insight.supporting_evidence || [];
    let peerPattern = 'no_peer_comparison';

    // Analyze peer group patterns
    if (evidence.some((ev: string) => ev.toLowerCase().includes('peer') && ev.toLowerCase().includes('above average'))) {
      peerPattern = 'above_peer_average';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('peer') && ev.toLowerCase().includes('below average'))) {
      peerPattern = 'below_peer_average';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('peer') && ev.toLowerCase().includes('leader'))) {
      peerPattern = 'peer_group_leader';
    } else if (evidence.some((ev: string) => ev.toLowerCase().includes('peer') && ev.toLowerCase().includes('laggard'))) {
      peerPattern = 'peer_group_laggard';
    }

    this.logger.debug('identifyPeerGroupPatterns', 'Identified peer group pattern', {
      peerPattern,
      evidenceCount: evidence.length
    });

    return peerPattern;
  }
}

/**
 * Factory function to create LearningInsightsService instance
 */
export function createLearningInsightsService(): LearningInsightsService {
  return new LearningInsightsService();
}