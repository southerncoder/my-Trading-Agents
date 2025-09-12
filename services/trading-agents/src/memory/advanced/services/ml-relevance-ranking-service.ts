import { createLogger } from '../../../utils/enhanced-logger';

/**
 * MLRelevanceRankingService - ML-based relevance ranking and feature importance
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class MLRelevanceRankingService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'MLRelevanceRankingService');
  }

  /**
   * Calculate ML-based relevance score using feature importance
   */
  async calculateMLRelevanceScore(result: any, queryFeatures: any, featureWeights?: any): Promise<number> {
    try {
      if (!result || !queryFeatures) return 0.5;

      // Extract features from result
      const resultFeatures = this.extractFeaturesFromResult(result);

      // Calculate feature similarities
      const featureSimilarities = this.calculateFeatureSimilarities(resultFeatures, queryFeatures);

      // Apply feature weights (default weights if not provided)
      const weights = featureWeights || this.getDefaultFeatureWeights();

      // Calculate weighted relevance score
      const relevanceScore = this.calculateWeightedRelevance(featureSimilarities, weights);

      // Apply ML-based adjustments
      const adjustedScore = await this.applyMLAdjustments(relevanceScore, result, queryFeatures);

      return Math.max(0, Math.min(1, adjustedScore));
    } catch (error) {
      this.logger.warn('Error calculating ML relevance score', { error });
      return 0.5;
    }
  }

  /**
   * Extract features from result for ML ranking
   */
  extractFeaturesFromResult(result: any): any {
    try {
      if (!result) return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        trend_direction: 'unknown',
        rsi: 0.5,
        macd: 0,
        momentum: 0,
        success_rate: 0.5,
        profit_loss: 0,
        risk_level: 'medium',
        strategy_type: 'unknown',
        recency: 0,
        time_effectiveness: 0.5,
        confidence_score: 0.5,
        source_reliability: 0.5,
        content_length: 0,
        has_insights: false,
        has_recommendations: false
      };

      return {
        // Market condition features
        market_regime: this.normalizeMarketRegime(result.market_regime),
        volatility: this.normalizeVolatility(result.volatility),
        volume_ratio: this.normalizeVolumeRatio(result.volume_ratio),
        trend_direction: this.normalizeTrendDirection(result.trend_direction),

        // Technical indicator features
        rsi: this.normalizeRSI(result.rsi),
        macd: this.normalizeMACD(result.macd),
        momentum: this.normalizeMomentum(result.momentum),

        // Performance features
        success_rate: this.normalizeSuccessRate(result.success_rate),
        profit_loss: this.normalizeProfitLoss(result.profit_loss),
        risk_level: this.normalizeRiskLevel(result.risk_level),
        strategy_type: this.normalizeStrategyType(result.strategy_type),

        // Temporal features
        recency: this.calculateRecencyScore(result.created_at),
        time_effectiveness: this.normalizeTimeEffectiveness(result.time_effectiveness),

        // Confidence features
        confidence_score: this.normalizeConfidence(result.confidence_score),
        source_reliability: this.normalizeSourceReliability(result.source_reliability),

        // Content features
        content_length: this.normalizeContentLength(result.content),
        has_insights: this.hasInsights(result),
        has_recommendations: this.hasRecommendations(result)
      };
    } catch (error) {
      this.logger.warn('Error extracting features from result', { error });
      return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        trend_direction: 'unknown',
        rsi: 0.5,
        macd: 0,
        momentum: 0,
        success_rate: 0.5,
        profit_loss: 0,
        risk_level: 'medium',
        strategy_type: 'unknown',
        recency: 0,
        time_effectiveness: 0.5,
        confidence_score: 0.5,
        source_reliability: 0.5,
        content_length: 0,
        has_insights: false,
        has_recommendations: false
      };
    }
  }

  /**
   * Calculate similarities between result features and query features
   */
  calculateFeatureSimilarities(resultFeatures: any, queryFeatures: any): any {
    try {
      const similarities: any = {};

      // Categorical features (exact match)
      const categoricalFeatures = ['market_regime', 'trend_direction', 'strategy_type', 'risk_level'];
      for (const feature of categoricalFeatures) {
        similarities[feature] = resultFeatures[feature] === queryFeatures[feature] ? 1 : 0;
      }

      // Numerical features (distance-based similarity)
      const numericalFeatures = ['volatility', 'volume_ratio', 'rsi', 'macd', 'momentum', 'success_rate', 'profit_loss'];
      for (const feature of numericalFeatures) {
        const resultValue = resultFeatures[feature] || 0;
        const queryValue = queryFeatures[feature] || 0;
        similarities[feature] = this.calculateNumericalSimilarity(resultValue, queryValue);
      }

      // Temporal features
      similarities.recency = this.calculateTemporalSimilarityScore(resultFeatures.recency, queryFeatures.recency);
      similarities.time_effectiveness = this.calculateNumericalSimilarity(
        resultFeatures.time_effectiveness,
        queryFeatures.time_effectiveness
      );

      // Confidence features
      similarities.confidence_score = this.calculateNumericalSimilarity(
        resultFeatures.confidence_score,
        queryFeatures.confidence_score
      );
      similarities.source_reliability = this.calculateNumericalSimilarity(
        resultFeatures.source_reliability,
        queryFeatures.source_reliability
      );

      // Content features
      similarities.content_length = this.calculateContentSimilarity(
        resultFeatures.content_length,
        queryFeatures.content_length
      );
      similarities.has_insights = resultFeatures.has_insights === queryFeatures.has_insights ? 1 : 0;
      similarities.has_recommendations = resultFeatures.has_recommendations === queryFeatures.has_recommendations ? 1 : 0;

      return similarities;
    } catch (error) {
      this.logger.warn('Error calculating feature similarities', { error });
      return {
        market_regime: 0,
        trend_direction: 0,
        strategy_type: 0,
        risk_level: 0,
        volatility: 0.5,
        volume_ratio: 0.5,
        rsi: 0.5,
        macd: 0.5,
        momentum: 0.5,
        success_rate: 0.5,
        profit_loss: 0.5,
        recency: 0.5,
        time_effectiveness: 0.5,
        confidence_score: 0.5,
        source_reliability: 0.5,
        content_length: 0.5,
        has_insights: 0,
        has_recommendations: 0
      };
    }
  }

  /**
   * Get default feature weights for ML ranking
   */
  getDefaultFeatureWeights(): any {
    return {
      // Market condition weights (high importance)
      market_regime: 0.15,
      volatility: 0.12,
      volume_ratio: 0.10,
      trend_direction: 0.08,

      // Technical indicator weights
      rsi: 0.08,
      macd: 0.06,
      momentum: 0.06,

      // Performance weights (very high importance)
      success_rate: 0.15,
      profit_loss: 0.12,
      risk_level: 0.10,
      strategy_type: 0.08,

      // Temporal weights
      recency: 0.10,
      time_effectiveness: 0.06,

      // Confidence weights
      confidence_score: 0.12,
      source_reliability: 0.08,

      // Content weights
      content_length: 0.04,
      has_insights: 0.06,
      has_recommendations: 0.04
    };
  }

  /**
   * Calculate weighted relevance score
   */
  calculateWeightedRelevance(featureSimilarities: any, weights: any): number {
    try {
      let totalWeight = 0;
      let weightedSum = 0;

      for (const [feature, similarity] of Object.entries(featureSimilarities)) {
        const weight = weights[feature] || 0.05; // Default weight for unknown features
        weightedSum += (similarity as number) * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating weighted relevance', { error });
      return 0.5;
    }
  }

  /**
   * Apply ML-based adjustments to relevance score
   */
  async applyMLAdjustments(baseScore: number, result: any, queryFeatures: any): Promise<number> {
    try {
      let adjustedScore = baseScore;

      // Boost score for high-confidence results
      if (result.confidence_score > 0.8) {
        adjustedScore += 0.1;
      }

      // Boost score for recent results
      if (result.created_at) {
        const daysSince = this.getDaysSince(result.created_at);
        if (daysSince < 7) {
          adjustedScore += 0.05;
        } else if (daysSince < 30) {
          adjustedScore += 0.02;
        }
      }

      // Boost score for results with insights
      if (result.key_insights || result.insights) {
        adjustedScore += 0.03;
      }

      // Boost score for results with recommendations
      if (result.recommendations || result.suggestions) {
        adjustedScore += 0.03;
      }

      // Apply domain-specific adjustments
      adjustedScore = this.applyDomainAdjustments(adjustedScore, result, queryFeatures);

      // Ensure score stays within bounds
      return Math.max(0, Math.min(1, adjustedScore));
    } catch (error) {
      this.logger.warn('Error applying ML adjustments', { error });
      return baseScore;
    }
  }

  /**
   * Apply domain-specific adjustments
   */
  private applyDomainAdjustments(score: number, result: any, queryFeatures: any): number {
    try {
      let adjustedScore = score;

      // Market regime alignment bonus
      if (result.market_regime === queryFeatures.market_regime) {
        adjustedScore += 0.05;
      }

      // Strategy type alignment bonus
      if (result.strategy_type === queryFeatures.strategy_type) {
        adjustedScore += 0.04;
      }

      // Risk level alignment bonus
      if (result.risk_level === queryFeatures.risk_level) {
        adjustedScore += 0.03;
      }

      // Success rate bonus for high-performing results
      if (result.success_rate > 0.7) {
        adjustedScore += 0.02;
      }

      // Volatility alignment bonus
      if (Math.abs((result.volatility || 0) - (queryFeatures.volatility || 0)) < 0.1) {
        adjustedScore += 0.02;
      }

      return adjustedScore;
    } catch (error) {
      this.logger.warn('Error applying domain adjustments', { error });
      return score;
    }
  }

  /**
   * Calculate feature importance using information gain
   */
  calculateFeatureImportance(results: any[], targetFeature: string): any {
    try {
      if (!results || results.length === 0) return {
        market_regime: 0,
        volatility: 0,
        volume_ratio: 0,
        trend_direction: 0,
        rsi: 0,
        macd: 0,
        momentum: 0,
        success_rate: 0,
        profit_loss: 0,
        risk_level: 0,
        strategy_type: 0,
        recency: 0,
        time_effectiveness: 0,
        confidence_score: 0,
        source_reliability: 0,
        content_length: 0,
        has_insights: 0,
        has_recommendations: 0
      };

      const featureImportance: any = {};
      const _totalResults = results.length;

      // Calculate entropy of target feature
      const targetEntropy = this.calculateEntropy(results.map(r => r[targetFeature]));

      // Calculate information gain for each feature
      const features = Object.keys(results[0] || {});
      for (const feature of features) {
        if (feature === targetFeature) continue;

        const infoGain = this.calculateInformationGain(results, feature, targetFeature, targetEntropy);
        featureImportance[feature] = infoGain;
      }

      return featureImportance;
    } catch (error) {
      this.logger.warn('Error calculating feature importance', { error });
      return {
        market_regime: 0,
        volatility: 0,
        volume_ratio: 0,
        trend_direction: 0,
        rsi: 0,
        macd: 0,
        momentum: 0,
        success_rate: 0,
        profit_loss: 0,
        risk_level: 0,
        strategy_type: 0,
        recency: 0,
        time_effectiveness: 0,
        confidence_score: 0,
        source_reliability: 0,
        content_length: 0,
        has_insights: 0,
        has_recommendations: 0
      };
    }
  }

  /**
   * Calculate entropy of a feature
   */
  private calculateEntropy(values: any[]): number {
    try {
      const valueCounts: Record<string, number> = {};
      const total = values.length;

      // Count occurrences of each value
      for (const value of values) {
        const key = String(value || 'null');
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }

      // Calculate entropy
      let entropy = 0;
      for (const count of Object.values(valueCounts)) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }

      return entropy;
    } catch (error) {
      this.logger.warn('Error calculating entropy', { error });
      return 0;
    }
  }

  /**
   * Calculate information gain for a feature
   */
  private calculateInformationGain(results: any[], feature: string, targetFeature: string, targetEntropy: number): number {
    try {
      const featureValues = results.map(r => r[feature]);
      const targetValues = results.map(r => r[targetFeature]);

      // Group by feature value
      const groups: Record<string, any[]> = {};
      for (let i = 0; i < results.length; i++) {
        const featureValue = String(featureValues[i] || 'null');
        if (!groups[featureValue]) {
          groups[featureValue] = [];
        }
        groups[featureValue].push(targetValues[i]);
      }

      // Calculate weighted entropy of groups
      let weightedEntropy = 0;
      const total = results.length;

      for (const [_featureValue, groupTargets] of Object.entries(groups)) {
        const groupSize = groupTargets.length;
        const groupEntropy = this.calculateEntropy(groupTargets);
        weightedEntropy += (groupSize / total) * groupEntropy;
      }

      return targetEntropy - weightedEntropy;
    } catch (error) {
      this.logger.warn('Error calculating information gain', { error });
      return 0;
    }
  }

  /**
   * Rank results using ML-based approach
   */
  async rankResultsML(results: any[], queryFeatures: any): Promise<any[]> {
    try {
      if (!results || results.length === 0) return [];

      // Calculate relevance scores for all results
      const scoredResults = await Promise.all(
        results.map(async (result) => {
          const relevanceScore = await this.calculateMLRelevanceScore(result, queryFeatures);
          return {
            ...result,
            ml_relevance_score: relevanceScore
          };
        })
      );

      // Sort by ML relevance score (descending)
      scoredResults.sort((a, b) => (b.ml_relevance_score || 0) - (a.ml_relevance_score || 0));

      return scoredResults;
    } catch (error) {
      this.logger.warn('Error ranking results with ML', { error });
      return results;
    }
  }

  /**
   * Optimize feature weights using historical performance
   */
  optimizeFeatureWeights(historicalResults: any[], performanceMetric: string): any {
    try {
      if (!historicalResults || historicalResults.length === 0) {
        return this.getDefaultFeatureWeights();
      }

      // Calculate feature importance based on historical performance
      const featureImportance = this.calculateFeatureImportance(historicalResults, performanceMetric);

      // Convert importance to weights (normalize to sum to 1)
      const totalImportance = Object.values(featureImportance).reduce((sum: number, imp: any) => sum + imp, 0);
      const optimizedWeights: any = {};

      for (const [feature, importance] of Object.entries(featureImportance)) {
        optimizedWeights[feature] = totalImportance > 0 ? (importance as number) / totalImportance : 0.05;
      }

      // Ensure all features have weights
      const defaultWeights = this.getDefaultFeatureWeights();
      for (const feature of Object.keys(defaultWeights)) {
        if (!(feature in optimizedWeights)) {
          optimizedWeights[feature] = defaultWeights[feature];
        }
      }

      return optimizedWeights;
    } catch (error) {
      this.logger.warn('Error optimizing feature weights', { error });
      return this.getDefaultFeatureWeights();
    }
  }

  /**
   * Calculate numerical similarity (normalized distance)
   */
  private calculateNumericalSimilarity(value1: number, value2: number): number {
    try {
      if (value1 === value2) return 1;

      const diff = Math.abs(value1 - value2);
      const max = Math.max(Math.abs(value1), Math.abs(value2));

      if (max === 0) return 1;

      return Math.max(0, 1 - diff / max);
    } catch (error) {
      this.logger.warn('Error calculating numerical similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate temporal similarity score
   */
  private calculateTemporalSimilarityScore(recency1: number, recency2: number): number {
    try {
      // Both recent = high similarity
      if (recency1 > 0.8 && recency2 > 0.8) return 1;
      // Both old = medium similarity
      if (recency1 < 0.3 && recency2 < 0.3) return 0.7;
      // One recent, one old = low similarity
      if ((recency1 > 0.8 && recency2 < 0.3) || (recency1 < 0.3 && recency2 > 0.8)) return 0.2;

      // Gradual similarity based on difference
      return Math.max(0, 1 - Math.abs(recency1 - recency2));
    } catch (error) {
      this.logger.warn('Error calculating temporal similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate content similarity based on length
   */
  private calculateContentSimilarity(length1: number, length2: number): number {
    try {
      if (length1 === 0 && length2 === 0) return 1;
      if (length1 === 0 || length2 === 0) return 0;

      const ratio = Math.min(length1, length2) / Math.max(length1, length2);
      return Math.max(0, ratio);
    } catch (error) {
      this.logger.warn('Error calculating content similarity', { error });
      return 0.5;
    }
  }

  /**
   * Get days since a date
   */
  private getDaysSince(dateString: string): number {
    try {
      const date = new Date(dateString);
      const now = new Date();
      return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    } catch (error) {
      this.logger.warn('Error calculating days since', { error });
      return 365; // Default to 1 year ago
    }
  }

  // Normalization helper methods
  private normalizeMarketRegime(regime: string): string {
    if (!regime) return 'unknown';
    const normalized = regime.toLowerCase();
    if (['bull', 'bullish', 'uptrend'].includes(normalized)) return 'bull';
    if (['bear', 'bearish', 'downtrend'].includes(normalized)) return 'bear';
    if (['sideways', 'range', 'neutral'].includes(normalized)) return 'sideways';
    return normalized;
  }

  private normalizeVolatility(volatility: any): number {
    if (typeof volatility === 'number') return Math.max(0, Math.min(1, volatility));
    if (typeof volatility === 'string') {
      const parsed = parseFloat(volatility.replace('%', '')) / 100;
      return isNaN(parsed) ? 0.15 : Math.max(0, Math.min(1, parsed));
    }
    return 0.15;
  }

  private normalizeVolumeRatio(ratio: any): number {
    if (typeof ratio === 'number') return Math.max(0, ratio);
    if (typeof ratio === 'string') {
      const parsed = parseFloat(ratio);
      return isNaN(parsed) ? 1 : Math.max(0, parsed);
    }
    return 1;
  }

  private normalizeTrendDirection(direction: string): string {
    if (!direction) return 'unknown';
    const normalized = direction.toLowerCase();
    if (['up', 'upward', 'bullish', 'positive'].includes(normalized)) return 'up';
    if (['down', 'downward', 'bearish', 'negative'].includes(normalized)) return 'down';
    if (['sideways', 'flat', 'neutral'].includes(normalized)) return 'sideways';
    return normalized;
  }

  private normalizeRSI(rsi: any): number {
    if (typeof rsi === 'number') return Math.max(0, Math.min(100, rsi)) / 100;
    if (typeof rsi === 'string') {
      const parsed = parseFloat(rsi);
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(100, parsed)) / 100;
    }
    return 0.5;
  }

  private normalizeMACD(macd: any): number {
    if (typeof macd === 'number') return Math.max(-1, Math.min(1, macd));
    if (typeof macd === 'string') {
      const parsed = parseFloat(macd);
      return isNaN(parsed) ? 0 : Math.max(-1, Math.min(1, parsed));
    }
    return 0;
  }

  private normalizeMomentum(momentum: any): number {
    if (typeof momentum === 'number') return Math.max(-1, Math.min(1, momentum));
    if (typeof momentum === 'string') {
      const parsed = parseFloat(momentum);
      return isNaN(parsed) ? 0 : Math.max(-1, Math.min(1, parsed));
    }
    return 0;
  }

  private normalizeSuccessRate(rate: any): number {
    if (typeof rate === 'number') return Math.max(0, Math.min(1, rate));
    if (typeof rate === 'string') {
      const parsed = parseFloat(rate.replace('%', '')) / 100;
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return 0.5;
  }

  private normalizeProfitLoss(pl: any): number {
    if (typeof pl === 'number') return Math.max(-1, Math.min(1, pl));
    if (typeof pl === 'string') {
      const parsed = parseFloat(pl.replace(/[$,]/g, ''));
      return isNaN(parsed) ? 0 : Math.max(-1, Math.min(1, parsed));
    }
    return 0;
  }

  private normalizeRiskLevel(level: string): string {
    if (!level) return 'medium';
    const normalized = level.toLowerCase();
    if (['low', 'conservative', 'safe'].includes(normalized)) return 'low';
    if (['high', 'aggressive', 'risky'].includes(normalized)) return 'high';
    if (['medium', 'moderate', 'balanced'].includes(normalized)) return 'medium';
    return normalized;
  }

  private normalizeStrategyType(type: string): string {
    if (!type) return 'unknown';
    const normalized = type.toLowerCase();
    if (['momentum', 'trend'].includes(normalized)) return 'momentum';
    if (['mean_reversion', 'reversion'].includes(normalized)) return 'mean_reversion';
    if (['breakout', 'break'].includes(normalized)) return 'breakout';
    if (['scalping', 'scalp'].includes(normalized)) return 'scalping';
    return normalized;
  }

  private calculateRecencyScore(createdAt: string): number {
    if (!createdAt) return 0;
    const daysSince = this.getDaysSince(createdAt);
    return Math.max(0, 1 - daysSince / 365); // Decay over a year
  }

  private normalizeTimeEffectiveness(effectiveness: any): number {
    if (typeof effectiveness === 'number') return Math.max(0, Math.min(1, effectiveness));
    if (typeof effectiveness === 'string') {
      const parsed = parseFloat(effectiveness.replace('%', '')) / 100;
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return 0.5;
  }

  private normalizeConfidence(confidence: any): number {
    if (typeof confidence === 'number') return Math.max(0, Math.min(1, confidence));
    if (typeof confidence === 'string') {
      const parsed = parseFloat(confidence.replace('%', '')) / 100;
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return 0.5;
  }

  private normalizeSourceReliability(reliability: any): number {
    if (typeof reliability === 'number') return Math.max(0, Math.min(1, reliability));
    if (typeof reliability === 'string') {
      const parsed = parseFloat(reliability.replace('%', '')) / 100;
      return isNaN(parsed) ? 0.5 : Math.max(0, Math.min(1, parsed));
    }
    return 0.5;
  }

  private normalizeContentLength(content: any): number {
    if (!content) return 0;
    const text = typeof content === 'string' ? content : String(content);
    return Math.min(1, text.length / 10000); // Normalize to 0-1 based on 10k chars
  }

  private hasInsights(result: any): boolean {
    return !!(result.key_insights || result.insights || result.analysis);
  }

  private hasRecommendations(result: any): boolean {
    return !!(result.recommendations || result.suggestions || result.advice);
  }
}

/**
 * Factory function to create MLRelevanceRankingService
 */
export function createMLRelevanceRankingService(logger?: any): MLRelevanceRankingService {
  return new MLRelevanceRankingService(logger);
}