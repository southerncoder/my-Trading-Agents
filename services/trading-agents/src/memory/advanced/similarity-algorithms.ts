import { createLogger } from '../utils/enhanced-logger';
import { EmbeddingService, SemanticSimilarityConfig } from './types';

/**
 * Similarity Algorithms Module
 *
 * This module contains all similarity calculation algorithms used by the context retrieval system.
 * It provides multi-dimensional similarity calculations, semantic similarity, ML-based ranking,
 * and ensemble similarity methods with confidence intervals.
 */

export class SimilarityAlgorithms {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('SimilarityAlgorithms', 'similarity-algorithms');
  }

  // Core similarity calculation methods

  /**
   * Calculate multi-dimensional similarity between current and historical results
   */
  calculateMultiDimensionalSimilarity(
    result: any,
    criteria: any,
    embeddingService?: EmbeddingService
  ): {
    market_conditions_similarity: number;
    technical_indicators_similarity: number;
    temporal_similarity: number;
    outcome_similarity: number;
    overall_similarity: number;
  } {
    try {
      const marketSimilarity = this.calculateMarketConditionsSimilarity(result, criteria);
      const technicalSimilarity = this.calculateTechnicalIndicatorsSimilarity(result, criteria);
      const temporalSimilarity = this.calculateTemporalSimilarity(result);
      const outcomeSimilarity = this.calculateOutcomeSimilarity(result, criteria);

      // Weighted combination for overall similarity
      const overallSimilarity = (
        marketSimilarity * 0.3 +
        technicalSimilarity * 0.3 +
        temporalSimilarity * 0.2 +
        outcomeSimilarity * 0.2
      );

      return {
        market_conditions_similarity: marketSimilarity,
        technical_indicators_similarity: technicalSimilarity,
        temporal_similarity: temporalSimilarity,
        outcome_similarity: outcomeSimilarity,
        overall_similarity: overallSimilarity
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
   * Calculate market conditions similarity
   */
  calculateMarketConditionsSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare market regime
      if (result.market_regime && criteria.market_regime) {
        const regimeSim = result.market_regime === criteria.market_regime ? 1.0 : 0.3;
        totalSimilarity += regimeSim;
        comparableFeatures++;
      }

      // Compare volatility
      if (result.volatility !== undefined && criteria.volatility !== undefined) {
        const volDiff = Math.abs(result.volatility - criteria.volatility);
        const volSim = Math.exp(-volDiff * 2); // Exponential decay
        totalSimilarity += volSim;
        comparableFeatures++;
      }

      // Compare trend direction
      if (result.trend_direction && criteria.trend_direction) {
        const trendSim = result.trend_direction === criteria.trend_direction ? 1.0 : 0.2;
        totalSimilarity += trendSim;
        comparableFeatures++;
      }

      // Compare volume ratio
      if (result.volume_ratio !== undefined && criteria.volume_ratio !== undefined) {
        const volumeDiff = Math.abs(result.volume_ratio - criteria.volume_ratio);
        const volumeSim = Math.exp(-volumeDiff);
        totalSimilarity += volumeSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating market conditions similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate technical indicators similarity
   */
  calculateTechnicalIndicatorsSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // RSI comparison
      if (result.rsi !== undefined && criteria.rsi !== undefined) {
        const rsiDiff = Math.abs(result.rsi - criteria.rsi);
        const rsiSim = Math.exp(-rsiDiff / 10); // Normalize by typical RSI range
        totalSimilarity += rsiSim;
        comparableFeatures++;
      }

      // MACD comparison
      if (result.macd !== undefined && criteria.macd !== undefined) {
        const macdDiff = Math.abs(result.macd - criteria.macd);
        const macdSim = Math.exp(-macdDiff);
        totalSimilarity += macdSim;
        comparableFeatures++;
      }

      // Bollinger Band position
      if (result.bollinger_position !== undefined && criteria.bollinger_position !== undefined) {
        const bbDiff = Math.abs(result.bollinger_position - criteria.bollinger_position);
        const bbSim = Math.exp(-bbDiff * 2);
        totalSimilarity += bbSim;
        comparableFeatures++;
      }

      // Momentum comparison
      if (result.momentum !== undefined && criteria.momentum !== undefined) {
        const momentumDiff = Math.abs(result.momentum - criteria.momentum);
        const momentumSim = Math.exp(-momentumDiff);
        totalSimilarity += momentumSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating technical indicators similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate temporal similarity with decay
   */
  calculateTemporalSimilarity(result: any): number {
    try {
      if (!result || !result.timestamp) return 0.5;

      const resultDate = new Date(result.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer = higher similarity
      // Half-life of 30 days
      const decayRate = Math.log(2) / 30;
      const temporalSimilarity = Math.exp(-decayRate * ageInDays);

      return Math.max(0.1, Math.min(1, temporalSimilarity));
    } catch (error) {
      this.logger.warn('Error calculating temporal similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate outcome similarity
   */
  calculateOutcomeSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare success rates
      if (result.success_rate !== undefined && criteria.success_rate !== undefined) {
        const successDiff = Math.abs(result.success_rate - criteria.success_rate);
        const successSim = Math.exp(-successDiff * 3);
        totalSimilarity += successSim;
        comparableFeatures++;
      }

      // Compare profit/loss outcomes
      if (result.profit_loss !== undefined && criteria.profit_loss !== undefined) {
        const plSim = (result.profit_loss > 0) === (criteria.profit_loss > 0) ? 1.0 : 0.2;
        totalSimilarity += plSim;
        comparableFeatures++;
      }

      // Compare risk levels
      if (result.risk_level && criteria.risk_level) {
        const riskSim = result.risk_level === criteria.risk_level ? 1.0 : 0.3;
        totalSimilarity += riskSim;
        comparableFeatures++;
      }

      // Apply temporal decay for older outcomes
      const temporalDecay = this.calculateTemporalDecay(result);
      const finalSimilarity = (comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5) * temporalDecay;

      return Math.max(0, Math.min(1, finalSimilarity));
    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate temporal decay factor
   */
  private calculateTemporalDecay(result: any): number {
    try {
      if (!result || !result.timestamp) return 1.0;

      const resultDate = new Date(result.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay with 60-day half-life for outcomes
      const decayRate = Math.log(2) / 60;
      return Math.exp(-decayRate * ageInDays);
    } catch (error) {
      this.logger.warn('Error calculating temporal decay', { error });
      return 1.0;
    }
  }

  // Advanced scenario search methods

  /**
   * Build scenario search query
   */
  buildScenarioSearchQuery(scenario: any): string {
    try {
      // Build a comprehensive search query from scenario components
      const queryParts: string[] = [];

      // Add core scenario description
      if (scenario.context_description) {
        queryParts.push(`scenario: ${scenario.context_description}`);
      }

      // Add market conditions
      if (scenario.market_conditions) {
        const conditions = scenario.market_conditions;
        if (conditions.market_regime) queryParts.push(`market_regime:${conditions.market_regime}`);
        if (conditions.volatility) queryParts.push(`volatility:${conditions.volatility}`);
        if (conditions.trend_direction) queryParts.push(`trend:${conditions.trend_direction}`);
      }

      // Add strategy context
      if (scenario.strategy_type) {
        queryParts.push(`strategy:${scenario.strategy_type}`);
      }

      // Add time context
      if (scenario.time_horizon) {
        queryParts.push(`timeframe:${scenario.time_horizon}`);
      }

      // Add risk context
      if (scenario.risk_level) {
        queryParts.push(`risk:${scenario.risk_level}`);
      }

      return queryParts.join(' AND ');
    } catch (error) {
      this.logger.warn('Error building scenario search query', { error, scenario });
      return `scenario ${scenario?.context_description || 'unknown'}`;
    }
  }

  /**
   * Calculate scenario similarity
   */
  calculateScenarioSimilarity(current: any, historical: any): number {
    try {
      if (!current || !historical) return 0.0;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare market conditions
      if (current.market_conditions && historical.market_conditions) {
        const marketSim = this.compareMarketConditions(current.market_conditions, historical.market_conditions);
        totalSimilarity += marketSim;
        comparableFeatures++;
      }

      // Compare strategy types
      if (current.strategy_type && historical.strategy_type) {
        const strategySim = current.strategy_type === historical.strategy_type ? 1.0 : 0.3;
        totalSimilarity += strategySim;
        comparableFeatures++;
      }

      // Compare time horizons
      if (current.time_horizon && historical.time_horizon) {
        const timeSim = this.compareTimeHorizons(current.time_horizon, historical.time_horizon);
        totalSimilarity += timeSim;
        comparableFeatures++;
      }

      // Compare risk profiles
      if (current.risk_level && historical.risk_level) {
        const riskSim = this.compareRiskLevels(current.risk_level, historical.risk_level);
        totalSimilarity += riskSim;
        comparableFeatures++;
      }

      // Compare outcomes if available
      if (current.outcomes && historical.outcomes) {
        const outcomeSim = this.compareOutcomes(current.outcomes, historical.outcomes);
        totalSimilarity += outcomeSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating scenario similarity', { error, current, historical });
      return 0.5;
    }
  }

  // Helper methods for scenario similarity calculations

  /**
   * Compare market conditions
   */
  private compareMarketConditions(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let similarity = 0;
    let features = 0;

    if (current.market_regime && historical.market_regime) {
      similarity += current.market_regime === historical.market_regime ? 1.0 : 0.2;
      features++;
    }

    if (current.volatility && historical.volatility) {
      const volDiff = Math.abs(current.volatility - historical.volatility);
      similarity += Math.exp(-volDiff * 2); // Exponential decay
      features++;
    }

    if (current.trend_direction && historical.trend_direction) {
      similarity += current.trend_direction === historical.trend_direction ? 1.0 : 0.1;
      features++;
    }

    return features > 0 ? similarity / features : 0.5;
  }

  /**
   * Compare time horizons
   */
  private compareTimeHorizons(current: string, historical: string): number {
    const timeMap: Record<string, number> = {
      'short': 1, 'medium': 2, 'long': 3, 'intraday': 0.5, 'weekly': 1.5, 'monthly': 2.5, 'yearly': 3.5
    };

    const currentVal = timeMap[current.toLowerCase()] || 2;
    const historicalVal = timeMap[historical.toLowerCase()] || 2;

    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 3); // Scale from 0 to 1
  }

  /**
   * Compare risk levels
   */
  private compareRiskLevels(current: string, historical: string): number {
    const riskMap: Record<string, number> = {
      'low': 1, 'conservative': 1, 'medium': 2, 'moderate': 2, 'high': 3, 'aggressive': 3
    };

    const currentVal = riskMap[current.toLowerCase()] || 2;
    const historicalVal = riskMap[historical.toLowerCase()] || 2;

    const diff = Math.abs(currentVal - historicalVal);
    return Math.max(0, 1 - diff / 2); // Scale from 0 to 1
  }

  /**
   * Compare outcomes
   */
  private compareOutcomes(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let similarity = 0;
    let features = 0;

    // Compare success rates
    if (current.success_rate && historical.success_rate) {
      const successDiff = Math.abs(current.success_rate - historical.success_rate);
      similarity += Math.exp(-successDiff * 3);
      features++;
    }

    // Compare profit/loss outcomes
    if (current.profit_loss && historical.profit_loss) {
      const plSimilarity = (current.profit_loss > 0) === (historical.profit_loss > 0) ? 1.0 : 0.2;
      similarity += plSimilarity;
      features++;
    }

    return features > 0 ? similarity / features : 0.5;
  }

  // ML-based similarity calculations

  /**
   * Normalize success rate to 0-1 range
   */
  normalizeSuccessRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Normalize profit/loss ratio using logarithmic scaling
   */
  normalizeProfitLossRatio(pl: number): number {
    if (pl === 0) return 0.5;
    // Logarithmic scaling to handle wide range of P/L values
    const sign = pl > 0 ? 1 : -1;
    const absPl = Math.abs(pl);
    const normalized = Math.min(Math.log(1 + absPl) / 5, 1); // Cap at 1
    return 0.5 + (sign * normalized * 0.5); // Center at 0.5
  }

  /**
   * Calculate volatility-adjusted return
   */
  calculateVolatilityAdjustedReturn(data: any): number {
    const return_val = data.return || data.profit_loss || data.pnl || 0;
    const volatility = data.volatility || data.std_dev || 0.15; // Default 15% volatility

    if (volatility === 0) return return_val;

    // Sharpe ratio approximation
    return return_val / volatility;
  }

  /**
   * Normalize win rate to 0-1 range
   */
  normalizeWinRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Extract market regime performance data
   */
  extractMarketRegimePerformance(data: any): Record<string, number> {
    const regimes: Record<string, number> = {};

    // Extract performance by market regime if available
    if (data.market_regime_performance) {
      Object.assign(regimes, data.market_regime_performance);
    }

    // Default regimes if no data available
    if (Object.keys(regimes).length === 0) {
      regimes['bull'] = 0.6;
      regimes['bear'] = 0.4;
      regimes['sideways'] = 0.5;
      regimes['high_volatility'] = 0.45;
    }

    return regimes;
  }

  /**
   * Get default outcome features for error cases
   */
  getDefaultOutcomeFeatures(): any {
    return {
      strategy_type: 'unknown',
      risk_profile: 'medium',
      time_horizon: 'medium',
      success_rate: 0.5,
      profit_loss_ratio: 0.5,
      volatility_adjusted_return: 0,
      max_drawdown: 0.1,
      sharpe_ratio: 0,
      win_rate: 0.5,
      avg_trade_duration: 1,
      market_regime_performance: {
        'bull': 0.5,
        'bear': 0.5,
        'sideways': 0.5,
        'high_volatility': 0.5
      }
    };
  }

  /**
   * Calculate Euclidean similarity between feature vectors
   */
  calculateEuclideanSimilarity(features1: any, features2: any): number {
    try {
      const numericalFeatures = [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let sumSquaredDiff = 0;
      let count = 0;

      for (const feature of numericalFeatures) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const diff = features1[feature] - features2[feature];
          sumSquaredDiff += diff * diff;
          count++;
        }
      }

      if (count === 0) return 0.5;

      const euclideanDistance = Math.sqrt(sumSquaredDiff / count);
      // Convert distance to similarity (0 = identical, higher = more different)
      return Math.exp(-euclideanDistance);

    } catch (error) {
      this.logger.warn('Error calculating Euclidean similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate cosine similarity between feature vectors
   */
  calculateCosineSimilarity(features1: any, features2: any): number {
    try {
      const numericalFeatures = [
        'success_rate', 'profit_loss_ratio', 'volatility_adjusted_return',
        'max_drawdown', 'sharpe_ratio', 'win_rate', 'avg_trade_duration'
      ];

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (const feature of numericalFeatures) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          dotProduct += features1[feature] * features2[feature];
          norm1 += features1[feature] * features1[feature];
          norm2 += features2[feature] * features2[feature];
        }
      }

      if (norm1 === 0 || norm2 === 0) return 0.5;

      const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      // Normalize to 0-1 range
      return (cosineSimilarity + 1) / 2;

    } catch (error) {
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate weighted similarity with feature importance
   */
  calculateWeightedSimilarity(features1: any, features2: any): number {
    try {
      // Define feature weights based on importance for trading outcomes
      const weights = {
        success_rate: 0.25,
        profit_loss_ratio: 0.20,
        volatility_adjusted_return: 0.15,
        max_drawdown: 0.15,
        sharpe_ratio: 0.10,
        win_rate: 0.10,
        avg_trade_duration: 0.05
      };

      let weightedSum = 0;
      let totalWeight = 0;

      for (const [feature, weight] of Object.entries(weights)) {
        if (features1[feature] !== undefined && features2[feature] !== undefined) {
          const similarity = 1 - Math.abs(features1[feature] - features2[feature]);
          weightedSum += similarity * weight;
          totalWeight += weight;
        }
      }

      // Add categorical feature similarities
      const categoricalWeights = {
        strategy_type: 0.15,
        risk_profile: 0.10,
        time_horizon: 0.10
      };

      for (const [feature, weight] of Object.entries(categoricalWeights)) {
        if (features1[feature] && features2[feature]) {
          const similarity = features1[feature] === features2[feature] ? 1 : 0.2;
          weightedSum += similarity * weight;
          totalWeight += weight;
        }
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating weighted similarity', { error });
      return 0.5;
    }
  }

  /**
   * Apply non-linear transformation to similarity score for better discrimination
   */
  applySimilarityTransformation(similarity: number): number {
    // Sigmoid transformation for better separation of similar vs dissimilar items
    // This helps distinguish between truly similar (high scores) and somewhat similar (medium scores)
    const transformed = 1 / (1 + Math.exp(-5 * (similarity - 0.5)));
    return Math.max(0, Math.min(1, transformed));
  }

  // Outcome clustering algorithms for pattern recognition

  /**
   * Cluster similar outcomes for pattern recognition
   */
  clusterOutcomes(outcomes: any[]): {
    clusters: Array<{
      centroid: any;
      members: any[];
      cluster_id: string;
      pattern_type: string;
      confidence: number;
    }>;
    clusterAssignments: Map<string, string>;
  } {
    try {
      if (outcomes.length < 3) {
        // Not enough data for meaningful clustering
        return {
          clusters: [{
            centroid: outcomes[0] || {},
            members: outcomes,
            cluster_id: 'single_cluster',
            pattern_type: 'insufficient_data',
            confidence: 0.5
          }],
          clusterAssignments: new Map(outcomes.map((_, i) => [`outcome_${i}`, 'single_cluster']))
        };
      }

      // Extract features for clustering
      const featureVectors = outcomes.map(outcome => this.extractClusteringFeatures(outcome));

      // Perform K-means clustering
      const numClusters = Math.min(Math.max(2, Math.floor(Math.sqrt(outcomes.length))), 5);
      const clusters = this.performKMeansClustering(featureVectors, numClusters);

      // Assign outcomes to clusters and calculate centroids
      const clusterAssignments = new Map<string, string>();
      const enrichedClusters = clusters.map((cluster, index) => {
        const clusterId = `cluster_${index}`;
        const members = cluster.members.map(memberIndex => outcomes[memberIndex]);
        const centroid = this.calculateClusterCentroid(members);
        const patternType = this.identifyClusterPattern(members);

        // Assign cluster membership
        cluster.members.forEach(memberIndex => {
          clusterAssignments.set(`outcome_${memberIndex}`, clusterId);
        });

        return {
          centroid,
          members,
          cluster_id: clusterId,
          pattern_type: patternType,
          confidence: this.calculateClusterConfidence(members)
        };
      });

      return {
        clusters: enrichedClusters,
        clusterAssignments
      };

    } catch (error) {
      this.logger.warn('Error clustering outcomes', { error });
      return {
        clusters: [],
        clusterAssignments: new Map()
      };
    }
  }

  /**
   * Extract features suitable for clustering analysis
   */
  private extractClusteringFeatures(outcome: any): number[] {
    try {
      return [
        this.normalizeSuccessRate(outcome.success_rate || outcome.win_rate || 0.5),
        this.normalizeProfitLossRatio(outcome.profit_loss || outcome.pnl || 0),
        outcome.volatility || outcome.std_dev || 0.15,
        outcome.max_drawdown || outcome.drawdown || 0.1,
        outcome.sharpe_ratio || outcome.risk_adjusted_return || 0,
        this.normalizeWinRate(outcome.win_rate || outcome.success_rate || 0.5),
        outcome.avg_trade_duration || outcome.holding_period || 1,
        // Categorical features encoded as numbers
        this.encodeStrategyType(outcome.strategy_type || 'unknown'),
        this.encodeRiskProfile(outcome.risk_profile || 'medium'),
        this.encodeTimeHorizon(outcome.time_horizon || 'medium')
      ];
    } catch (error) {
      this.logger.warn('Error extracting clustering features', { error, outcome });
      return [0.5, 0.5, 0.15, 0.1, 0, 0.5, 1, 0, 1, 1]; // Default feature vector
    }
  }

  /**
   * Perform K-means clustering on feature vectors
   */
  private performKMeansClustering(featureVectors: number[][], numClusters: number): Array<{
    members: number[];
    centroid: number[];
  }> {
    try {
      const maxIterations = 100;
      const tolerance = 0.001;

      // Initialize centroids randomly
      let centroids: number[][] = this.initializeCentroids(featureVectors, numClusters);

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        // Assign points to nearest centroid
        const assignments = this.assignToClusters(featureVectors, centroids);

        // Update centroids
        const newCentroids = this.updateCentroids(featureVectors, assignments, numClusters);

        // Check for convergence
        if (this.hasConverged(centroids, newCentroids, tolerance)) {
          break;
        }

        centroids = newCentroids;
      }

      // Final assignment
      const finalAssignments = this.assignToClusters(featureVectors, centroids);

      // Group by cluster
      const clusters: Array<{ members: number[]; centroid: number[] }> = [];
      for (let i = 0; i < numClusters; i++) {
        const clusterMembers = finalAssignments
          .map((assignment, index) => assignment === i ? index : -1)
          .filter(index => index !== -1);

        if (clusterMembers.length > 0) {
          const centroid = centroids[i];
          if (centroid) {
            clusters.push({
              members: clusterMembers,
              centroid: centroid
            });
          }
        }
      }

      return clusters;

    } catch (error) {
      this.logger.warn('Error performing K-means clustering', { error });
      return [];
    }
  }

  /**
   * Initialize centroids using K-means++ algorithm
   */
  private initializeCentroids(featureVectors: number[][], numClusters: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    // First centroid: random selection
    const firstIndex = Math.floor(Math.random() * featureVectors.length);
    const firstVector = featureVectors[firstIndex];
    if (firstVector) {
      centroids.push([...firstVector]);
      usedIndices.add(firstIndex);
    }

    // Subsequent centroids: probability proportional to squared distance
    for (let i = 1; i < numClusters; i++) {
      const distances = featureVectors.map((vector, index) => {
        if (usedIndices.has(index) || !vector) return 0;
        return Math.min(...centroids.map(centroid => this.euclideanDistance(vector, centroid)));
      });

      const totalDistance = distances.reduce((sum, dist) => sum + dist * dist, 0);
      let randomValue = Math.random() * totalDistance;

      let selectedIndex = 0;
      for (let j = 0; j < distances.length; j++) {
        if (!usedIndices.has(j)) {
          const distance = distances[j] || 0;
          randomValue -= distance * distance;
          if (randomValue <= 0) {
            selectedIndex = j;
            break;
          }
        }
      }

      const selectedVector = featureVectors[selectedIndex];
      if (selectedVector) {
        centroids.push([...selectedVector]);
        usedIndices.add(selectedIndex);
      }
    }

    return centroids;
  }

  /**
   * Assign each point to the nearest centroid
   */
  private assignToClusters(featureVectors: number[][], centroids: number[][]): number[] {
    return featureVectors.map(vector => {
      let minDistance = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, index) => {
        const distance = this.euclideanDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = index;
        }
      });

      return closestCentroid;
    });
  }

  /**
   * Update centroids based on current assignments
   */
  private updateCentroids(featureVectors: number[][], assignments: number[], numClusters: number): number[][] {
    const newCentroids = [];

    for (let i = 0; i < numClusters; i++) {
      const clusterPoints = assignments
        .map((assignment, index) => assignment === i ? featureVectors[index] : null)
        .filter(point => point !== null) as number[][];

      if (clusterPoints.length > 0) {
        const centroid = this.calculateCentroid(clusterPoints);
        newCentroids.push(centroid);
      } else {
        // Keep old centroid if no points assigned
        newCentroids.push([0.5, 0.5, 0.15, 0.1, 0, 0.5, 1, 0, 1, 1]);
      }
    }

    return newCentroids;
  }

  /**
   * Check if centroids have converged
   */
  private hasConverged(oldCentroids: number[][], newCentroids: number[][], tolerance: number): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      const oldCentroid = oldCentroids[i];
      const newCentroid = newCentroids[i];

      if (!oldCentroid || !newCentroid) continue;

      const distance = this.euclideanDistance(oldCentroid, newCentroid);
      if (distance > tolerance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(vector1: number[], vector2: number[]): number {
    if (!vector1 || !vector2) return Infinity;

    let sum = 0;
    const length = Math.min(vector1.length, vector2.length);

    for (let i = 0; i < length; i++) {
      const val1 = vector1[i] || 0;
      const val2 = vector2[i] || 0;
      const diff = val1 - val2;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate centroid of a set of points
   */
  private calculateCentroid(points: number[][]): number[] {
    if (points.length === 0 || !points[0]) return [];

    const dimensions = points[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const point of points) {
      if (!point) continue;

      for (let i = 0; i < Math.min(dimensions, point.length); i++) {
        centroid[i] += point[i] || 0;
      }
    }

    for (let i = 0; i < dimensions; i++) {
        centroid[i] /= points.length;
    }

    return centroid;
  }

  /**
   * Calculate cluster centroid from outcome objects
   */
  private calculateClusterCentroid(members: any[]): any {
    if (members.length === 0) return {
      success_rate: 0.5,
      profit_loss: 0,
      volatility: 0.15,
      max_drawdown: 0.1,
      sharpe_ratio: 0,
      win_rate: 0.5,
      strategy_type: 'unknown',
      risk_profile: 'medium',
      time_horizon: 'medium'
    };

    const centroid = {
      success_rate: members.reduce((sum, m) => sum + (m.success_rate || 0), 0) / members.length,
      profit_loss: members.reduce((sum, m) => sum + (m.profit_loss || 0), 0) / members.length,
      volatility: members.reduce((sum, m) => sum + (m.volatility || 0.15), 0) / members.length,
      max_drawdown: members.reduce((sum, m) => sum + (m.max_drawdown || 0.1), 0) / members.length,
      sharpe_ratio: members.reduce((sum, m) => sum + (m.sharpe_ratio || 0), 0) / members.length,
      win_rate: members.reduce((sum, m) => sum + (m.win_rate || 0.5), 0) / members.length,
      strategy_type: this.findMostCommonValue(members.map(m => m.strategy_type)),
      risk_profile: this.findMostCommonValue(members.map(m => m.risk_profile)),
      time_horizon: this.findMostCommonValue(members.map(m => m.time_horizon))
    };

    return centroid;
  }

  /**
   * Identify the pattern type of a cluster
   */
  private identifyClusterPattern(members: any[]): string {
    if (members.length === 0) return 'unknown';

    const avgSuccess = members.reduce((sum, m) => sum + (m.success_rate || 0), 0) / members.length;
    const avgProfit = members.reduce((sum, m) => sum + (m.profit_loss || 0), 0) / members.length;
    const avgVolatility = members.reduce((sum, m) => sum + (m.volatility || 0.15), 0) / members.length;

    if (avgSuccess > 0.7 && avgProfit > 0.05) {
      return 'high_performance';
    } else if (avgSuccess > 0.6 && avgVolatility < 0.1) {
      return 'stable_performance';
    } else if (avgProfit < -0.05) {
      return 'underperforming';
    } else if (avgVolatility > 0.25) {
      return 'high_risk';
    } else {
      return 'moderate_performance';
    }
  }

  /**
   * Calculate confidence score for a cluster
   */
  private calculateClusterConfidence(members: any[]): number {
    if (members.length < 2) return 0.5;

    // Calculate intra-cluster similarity
    const features = members.map(m => this.extractClusteringFeatures(m));
    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const feature1 = features[i];
        const feature2 = features[j];

        if (feature1 && feature2) {
          const similarity = 1 - (this.euclideanDistance(feature1, feature2) / 10); // Normalize
          totalSimilarity += Math.max(0, similarity);
          pairCount++;
        }
      }
    }

    const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0.5;
    return Math.max(0.3, Math.min(0.9, avgSimilarity));
  }

  /**
   * Encode categorical strategy type as number
   */
  private encodeStrategyType(strategy: string): number {
    const strategyMap: Record<string, number> = {
      'momentum': 0, 'mean_reversion': 1, 'breakout': 2, 'scalping': 3,
      'swing': 4, 'position': 5, 'arbitrage': 6, 'unknown': 7
    };
    return strategyMap[strategy.toLowerCase()] || 7;
  }

  /**
   * Encode categorical risk profile as number
   */
  private encodeRiskProfile(risk: string): number {
    const riskMap: Record<string, number> = {
      'low': 0, 'conservative': 0.3, 'medium': 1, 'moderate': 1.3,
      'high': 2, 'aggressive': 2.3, 'unknown': 1
    };
    return riskMap[risk.toLowerCase()] || 1;
  }

  /**
   * Encode categorical time horizon as number
   */
  private encodeTimeHorizon(horizon: string): number {
    const horizonMap: Record<string, number> = {
      'short': 0, 'intraday': 0.3, 'medium': 1, 'swing': 1.3,
      'long': 2, 'position': 2.3, 'unknown': 1
    };
    return horizonMap[horizon.toLowerCase()] || 1;
  }

  /**
   * Find most common value in an array
   */
  private findMostCommonValue(values: any[]): any {
    const frequency: Record<string, number> = {};
    let mostCommon = values[0];
    let maxCount = 0;

    for (const value of values) {
      const key = String(value || 'unknown');
      frequency[key] = (frequency[key] || 0) + 1;

      if (frequency[key] > maxCount) {
        maxCount = frequency[key];
        mostCommon = value;
      }
    }

    return mostCommon;
  }

  // Semantic embedding similarity methods

  /**
   * Calculate semantic similarity using embeddings for text content
   */
  async calculateSemanticSimilarity(
    currentText: string,
    historicalText: string,
    embeddingService?: EmbeddingService
  ): Promise<number> {
    try {
      if (!currentText || !historicalText) return 0.5;

      // If embedding service is available, use it for semantic similarity
      if (embeddingService && typeof embeddingService.generateEmbedding === 'function') {
        const currentEmbedding = await embeddingService.generateEmbedding(currentText);
        const historicalEmbedding = await embeddingService.generateEmbedding(historicalText);

        if (currentEmbedding && historicalEmbedding) {
          return this.calculateEmbeddingSimilarity(currentEmbedding, historicalEmbedding);
        }
      }

      // Fallback to text-based similarity if embeddings not available
      return this.calculateTextSimilarity(currentText, historicalText);

    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return this.calculateTextSimilarity(currentText, historicalText);
    }
  }

  /**
   * Calculate similarity between embeddings using cosine similarity
   */
  private calculateEmbeddingSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
        return 0.5;
      }

      // Calculate cosine similarity
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        const val1 = embedding1[i] || 0;
        const val2 = embedding2[i] || 0;
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
      }

      if (norm1 === 0 || norm2 === 0) return 0.5;

      const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

      // Normalize to 0-1 range and apply sigmoid for better discrimination
      const normalizedSimilarity = (cosineSimilarity + 1) / 2;
      return 1 / (1 + Math.exp(-3 * (normalizedSimilarity - 0.5))); // Sigmoid transformation

    } catch (error) {
      this.logger.warn('Error calculating embedding similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate text similarity using various text analysis methods
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    try {
      if (!text1 || !text2) return 0.5;

      // Normalize texts
      const normalizedText1 = this.normalizeText(text1);
      const normalizedText2 = this.normalizeText(text2);

      // Calculate multiple similarity metrics
      const jaccardSimilarity = this.calculateJaccardSimilarity(normalizedText1, normalizedText2);
      const levenshteinSimilarity = this.calculateLevenshteinSimilarity(normalizedText1, normalizedText2);
      const ngramSimilarity = this.calculateNGramSimilarity(normalizedText1, normalizedText2, 2);

      // Weighted combination of similarity metrics
      const weights = {
        jaccard: 0.4,
        levenshtein: 0.3,
        ngram: 0.3
      };

      const combinedSimilarity = (
        jaccardSimilarity * weights.jaccard +
        levenshteinSimilarity * weights.levenshtein +
        ngramSimilarity * weights.ngram
      );

      return Math.max(0, Math.min(1, combinedSimilarity));

    } catch (error) {
      this.logger.warn('Error calculating text similarity', { error });
      return 0.5;
    }
  }

  /**
   * Normalize text for similarity comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' ').filter(word => word.length > 0));
    const words2 = new Set(text2.split(' ').filter(word => word.length > 0));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate Levenshtein distance similarity
   */
  private calculateLevenshteinSimilarity(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    // Simple character-by-character comparison for similarity
    // This is a simplified version to avoid complex matrix operations
    const longer = str1.length > str2.length ? str1 : str2;

    if (longer.length === 0) return 0;

    // Count character differences
    let differences = 0;
    const minLength = Math.min(str1.length, str2.length);

    for (let i = 0; i < minLength; i++) {
      if (str1[i] !== str2[i]) {
        differences++;
      }
    }

    // Add penalty for length difference
    differences += Math.abs(str1.length - str2.length);

    return differences;
  }

  /**
   * Calculate N-gram similarity
   */
  private calculateNGramSimilarity(text1: string, text2: string, n: number): number {
    const ngrams1 = this.generateNGrams(text1, n);
    const ngrams2 = this.generateNGrams(text2, n);

    const intersection = new Set([...ngrams1].filter(ngram => ngrams2.has(ngram)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate N-grams from text
   */
  private generateNGrams(text: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    const words = text.split(' ').filter(word => word.length > 0);

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.add(ngram);
    }

    return ngrams;
  }

  // Ensemble similarity methods with confidence intervals

  /**
   * Calculate ensemble similarity using multiple algorithms with confidence intervals
   */
  calculateEnsembleSimilarity(
    currentFeatures: any,
    historicalFeatures: any,
    embeddingService?: EmbeddingService
  ): {
    similarity_score: number;
    confidence_interval: { lower: number; upper: number };
    algorithm_weights: Record<string, number>;
    individual_scores: Record<string, number>;
  } {
    try {
      // Define ensemble of similarity algorithms
      const algorithms = {
        euclidean: () => this.calculateEuclideanSimilarity(currentFeatures, historicalFeatures),
        cosine: () => this.calculateCosineSimilarity(currentFeatures, historicalFeatures),
        weighted: () => this.calculateWeightedSimilarity(currentFeatures, historicalFeatures),
        jaccard: () => this.calculateJaccardTextSimilarity(currentFeatures, historicalFeatures),
        semantic: () => this.calculateSemanticSimilarity(
          this.extractTextFromFeatures(currentFeatures),
          this.extractTextFromFeatures(historicalFeatures),
          embeddingService
        )
      };

      // Calculate individual algorithm scores
      const individualScores: Record<string, number> = {};

      // Calculate synchronous versions for immediate use
      individualScores.euclidean = this.calculateEuclideanSimilarity(currentFeatures, historicalFeatures);
      individualScores.cosine = this.calculateCosineSimilarity(currentFeatures, historicalFeatures);
      individualScores.weighted = this.calculateWeightedSimilarity(currentFeatures, historicalFeatures);
      individualScores.jaccard = this.calculateJaccardTextSimilarity(currentFeatures, historicalFeatures);
      individualScores.semantic = 0.5; // Placeholder for async semantic similarity

      // Calculate dynamic algorithm weights based on data characteristics
      const algorithmWeights = this.calculateDynamicAlgorithmWeights(currentFeatures, historicalFeatures, individualScores);

      // Calculate weighted ensemble score
      const ensembleScore = this.calculateWeightedEnsembleScore(individualScores, algorithmWeights);

      // Calculate confidence interval
      const confidenceInterval = this.calculateSimilarityConfidenceInterval(individualScores, algorithmWeights);

      return {
        similarity_score: ensembleScore,
        confidence_interval: confidenceInterval,
        algorithm_weights: algorithmWeights,
        individual_scores: individualScores
      };

    } catch (error) {
      this.logger.warn('Error calculating ensemble similarity', { error });
      return {
        similarity_score: 0.5,
        confidence_interval: { lower: 0.4, upper: 0.6 },
        algorithm_weights: { euclidean: 0.25, cosine: 0.25, weighted: 0.25, jaccard: 0.15, semantic: 0.1 },
        individual_scores: { euclidean: 0.5, cosine: 0.5, weighted: 0.5, jaccard: 0.5, semantic: 0.5 }
      };
    }
  }

  /**
   * Calculate dynamic algorithm weights based on data characteristics
   */
  private calculateDynamicAlgorithmWeights(
    currentFeatures: any,
    historicalFeatures: any,
    individualScores: Record<string, number>
  ): Record<string, number> {
    try {
      // Base weights
      const baseWeights: Record<string, number> = {
        euclidean: 0.25,
        cosine: 0.25,
        weighted: 0.25,
        jaccard: 0.15,
        semantic: 0.10
      };

      const dynamicWeights = { ...baseWeights };

      // Adjust weights based on data characteristics

      // Boost Euclidean for numerical data
      const numericalFeatures = ['success_rate', 'profit_loss_ratio', 'volatility_adjusted_return'];
      const hasNumericalData = numericalFeatures.some(feature =>
        (currentFeatures[feature] !== undefined && currentFeatures[feature] !== null) ||
        (historicalFeatures[feature] !== undefined && historicalFeatures[feature] !== null)
      );

      if (hasNumericalData) {
        dynamicWeights.euclidean = (dynamicWeights.euclidean || 0) + 0.1;
        dynamicWeights.cosine = (dynamicWeights.cosine || 0) + 0.05;
      }

      // Boost Jaccard for categorical data
      const categoricalFeatures = ['strategy_type', 'risk_profile', 'time_horizon'];
      const hasCategoricalData = categoricalFeatures.some(feature =>
        currentFeatures[feature] || historicalFeatures[feature]
      );

      if (hasCategoricalData) {
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) + 0.1;
        dynamicWeights.weighted = (dynamicWeights.weighted || 0) + 0.05;
      }

      // Boost semantic for text data
      const hasTextData = currentFeatures.description || historicalFeatures.description;
      if (hasTextData) {
        dynamicWeights.semantic = (dynamicWeights.semantic || 0) + 0.1;
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) + 0.05;
      }

      // Adjust based on algorithm performance variance
      const scoreVariance = this.calculateScoreVariance(Object.values(individualScores));
      if (scoreVariance > 0.1) {
        // High variance: trust consensus more
        dynamicWeights.euclidean = (dynamicWeights.euclidean || 0) * 0.9;
        dynamicWeights.cosine = (dynamicWeights.cosine || 0) * 0.9;
        dynamicWeights.weighted = (dynamicWeights.weighted || 0) * 1.1;
        dynamicWeights.jaccard = (dynamicWeights.jaccard || 0) * 1.1;
      }

      // Normalize weights
      const totalWeight = Object.values(dynamicWeights).reduce((sum, weight) => sum + weight, 0);
      const normalizedWeights: Record<string, number> = {};

      for (const [algorithm, weight] of Object.entries(dynamicWeights)) {
        normalizedWeights[algorithm] = weight / totalWeight;
      }

      return normalizedWeights;

    } catch (error) {
      this.logger.warn('Error calculating dynamic algorithm weights', { error });
      return {
        euclidean: 0.25,
        cosine: 0.25,
        weighted: 0.25,
        jaccard: 0.15,
        semantic: 0.10
      };
    }
  }

  /**
   * Calculate weighted ensemble score
   */
  private calculateWeightedEnsembleScore(
    individualScores: Record<string, number>,
    weights: Record<string, number>
  ): number {
    try {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const [algorithm, score] of Object.entries(individualScores)) {
        const weight = weights[algorithm] || 0;
        weightedSum += score * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? weightedSum / totalWeight : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating weighted ensemble score', { error });
      return 0.5;
    }
  }

  /**
   * Calculate confidence interval for similarity score
   */
  private calculateSimilarityConfidenceInterval(
    individualScores: Record<string, number>,
    weights: Record<string, number>
  ): { lower: number; upper: number } {
    try {
      const scores = Object.values(individualScores);
      const weightedScores = Object.entries(individualScores).map(([algorithm, score]) => ({
        score,
        weight: weights[algorithm] || 0
      }));

      // Calculate weighted mean
      const weightedMean = weightedScores.reduce((sum, item) => sum + item.score * item.weight, 0) /
                          weightedScores.reduce((sum, item) => sum + item.weight, 0);

      // Calculate weighted variance
      const weightedVariance = weightedScores.reduce((sum, item) => {
        const diff = item.score - weightedMean;
        return sum + item.weight * diff * diff;
      }, 0) / weightedScores.reduce((sum, item) => sum + item.weight, 0);

      const stdDev = Math.sqrt(weightedVariance);

      // 95% confidence interval (approximately 2 standard deviations)
      const margin = 1.96 * stdDev;
      const lower = Math.max(0, weightedMean - margin);
      const upper = Math.min(1, weightedMean + margin);

      return { lower, upper };

    } catch (error) {
      this.logger.warn('Error calculating confidence interval', { error });
      return { lower: 0.4, upper: 0.6 };
    }
  }

  /**
   * Calculate Jaccard similarity for text features
   */
  private calculateJaccardTextSimilarity(features1: any, features2: any): number {
    try {
      const text1 = this.extractTextFromFeatures(features1);
      const text2 = this.extractTextFromFeatures(features2);

      return this.calculateJaccardSimilarity(text1, text2);

    } catch (error) {
      this.logger.warn('Error calculating Jaccard text similarity', { error });
      return 0.5;
    }
  }

  /**
   * Extract text content from features for similarity calculation
   */
  private extractTextFromFeatures(features: any): string {
    try {
      const textComponents = [];

      // Add description
      if (features.description) {
        textComponents.push(features.description);
      }

      // Add categorical features
      if (features.strategy_type) {
        textComponents.push(`strategy:${features.strategy_type}`);
      }
      if (features.risk_profile) {
        textComponents.push(`risk:${features.risk_profile}`);
      }
      if (features.time_horizon) {
        textComponents.push(`time:${features.time_horizon}`);
      }

      // Add market conditions
      if (features.market_regime) {
        textComponents.push(`market:${features.market_regime}`);
      }

      return textComponents.join(' ');

    } catch (error) {
      this.logger.warn('Error extracting text from features', { error });
      return '';
    }
  }

  /**
   * Calculate variance of scores
   */
  private calculateScoreVariance(scores: number[]): number {
    try {
      if (scores.length < 2) return 0;

      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

      return variance;

    } catch (error) {
      this.logger.warn('Error calculating score variance', { error });
      return 0;
    }
  }
}

/**
 * Factory function to create SimilarityAlgorithms instance
 */
export function createSimilarityAlgorithms(logger?: any): SimilarityAlgorithms {
  return new SimilarityAlgorithms(logger);
}