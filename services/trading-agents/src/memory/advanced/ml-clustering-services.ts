import { createLogger } from '../../utils/enhanced-logger';

/**
 * ML-Based Similarity Service
 * Handles Euclidean, cosine, and weighted similarity calculations
 */
export class MLBasedSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ml-similarity');
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
}

/**
 * Clustering Algorithms Service
 * Handles K-means clustering and pattern recognition for trading outcomes
 */
export class ClusteringAlgorithmsService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'clustering-algorithms');
  }

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

  /**
   * Normalize success rate to 0-1 range
   */
  private normalizeSuccessRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Normalize profit/loss ratio using logarithmic scaling
   */
  private normalizeProfitLossRatio(pl: number): number {
    if (pl === 0) return 0.5;
    // Logarithmic scaling to handle wide range of P/L values
    const sign = pl > 0 ? 1 : -1;
    const absPl = Math.abs(pl);
    const normalized = Math.min(Math.log(1 + absPl) / 5, 1); // Cap at 1
    return 0.5 + (sign * normalized * 0.5); // Center at 0.5
  }

  /**
   * Normalize win rate to 0-1 range
   */
  private normalizeWinRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }
}