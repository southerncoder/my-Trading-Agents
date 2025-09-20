import { createLogger } from '../../../../utils/enhanced-logger';
import { KMeansAlgorithm } from './k-means-algorithm';
import { FeatureExtractionService } from './feature-extraction';
import { ClusterAnalysisService } from './cluster-analysis';
import { ClusteringResult, TradingOutcome, ClusterConfig } from '../types';

/**
 * Clustering Algorithms Service
 * Main orchestrator for clustering operations on trading outcomes
 */
export class ClusteringAlgorithmsService {
  private logger: any;
  private kMeansAlgorithm: KMeansAlgorithm;
  private featureExtraction: FeatureExtractionService;
  private clusterAnalysis: ClusterAnalysisService;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'clustering-algorithms');
    this.kMeansAlgorithm = new KMeansAlgorithm(this.logger);
    this.featureExtraction = new FeatureExtractionService(this.logger);
    this.clusterAnalysis = new ClusterAnalysisService(this.logger);
  }

  /**
   * Cluster similar outcomes for pattern recognition
   */
  clusterOutcomes(outcomes: TradingOutcome[], config?: ClusterConfig): ClusteringResult {
    try {
      if (outcomes.length < 3) {
        // Not enough data for meaningful clustering
        return {
          clusters: [{
            centroid: this.clusterAnalysis.calculateClusterCentroid(outcomes),
            members: outcomes,
            cluster_id: 'single_cluster',
            pattern_type: 'insufficient_data',
            confidence: 0.5
          }],
          clusterAssignments: new Map(outcomes.map((_, i) => [`outcome_${i}`, 'single_cluster']))
        };
      }

      // Extract features for clustering
      const featureVectors = outcomes.map(outcome => this.featureExtraction.extractClusteringFeatures(outcome));

      // Perform K-means clustering
      const numClusters = Math.min(
        Math.max(2, Math.floor(Math.sqrt(outcomes.length))),
        config?.maxClusters || 5
      );

      const clusterConfig = {
        maxIterations: config?.maxIterations || 100,
        tolerance: 0.001
      };

      const clusters = this.kMeansAlgorithm.cluster(featureVectors, numClusters, clusterConfig);

      // Assign outcomes to clusters and calculate centroids
      const clusterAssignments = new Map<string, string>();
      const enrichedClusters = clusters.map((cluster, index) => {
        const clusterId = `cluster_${index}`;
        const members = cluster.members
          .map(memberIndex => outcomes[memberIndex])
          .filter(member => member !== undefined) as TradingOutcome[];
        const centroid = this.clusterAnalysis.calculateClusterCentroid(members);
        const patternType = this.clusterAnalysis.identifyClusterPattern(members);

        // Assign cluster membership
        cluster.members.forEach(memberIndex => {
          clusterAssignments.set(`outcome_${memberIndex}`, clusterId);
        });

        return {
          centroid,
          members,
          cluster_id: clusterId,
          pattern_type: patternType,
          confidence: this.clusterAnalysis.calculateClusterConfidence(members)
        };
      });

      return {
        clusters: enrichedClusters,
        clusterAssignments
      };

    } catch (error) {
      this.logger.warn('clustering-outcomes-failed', 'Clustering outcomes failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return {
        clusters: [],
        clusterAssignments: new Map()
      };
    }
  }

  /**
   * Analyze cluster characteristics and provide insights
   */
  analyzeClusters(clusters: ClusteringResult['clusters']): Array<{
    cluster_id: string;
    analysis: {
      stability_score: number;
      risk_profile: string;
      performance_characteristics: string[];
      member_count: number;
      avg_performance: number;
    };
  }> {
    return clusters.map(cluster => ({
      cluster_id: cluster.cluster_id,
      analysis: {
        ...this.clusterAnalysis.analyzeClusterStability(cluster),
        member_count: cluster.members.length,
        avg_performance: cluster.members.reduce((sum, m) =>
          sum + (m.success_rate || m.win_rate || 0.5), 0) / cluster.members.length
      }
    }));
  }

  /**
   * Find optimal number of clusters using elbow method approximation
   */
  findOptimalClusters(outcomes: TradingOutcome[], maxClusters: number = 10): {
    optimal_clusters: number;
    wcss_values: number[];
    recommended_clusters: number;
  } {
    try {
      const featureVectors = outcomes.map(outcome => this.featureExtraction.extractClusteringFeatures(outcome));
      const wcssValues: number[] = [];

      // Calculate WCSS (Within-Cluster Sum of Squares) for different k values
      for (let k = 2; k <= Math.min(maxClusters, outcomes.length); k++) {
        const clusters = this.kMeansAlgorithm.cluster(featureVectors, k);
        const wcss = this.calculateWCSS(featureVectors, clusters);
        wcssValues.push(wcss);
      }

      // Simple elbow detection: look for the point where WCSS reduction slows significantly
      const optimalClusters = this.detectElbow(wcssValues);

      return {
        optimal_clusters: optimalClusters,
        wcss_values: wcssValues,
        recommended_clusters: Math.max(2, Math.min(optimalClusters, 5)) // Reasonable bounds
      };

    } catch (error) {
      this.logger.warn('optimal-clusters-failed', 'Finding optimal clusters failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return {
        optimal_clusters: 3,
        wcss_values: [],
        recommended_clusters: 3
      };
    }
  }

  /**
   * Calculate WCSS (Within-Cluster Sum of Squares)
   */
  private calculateWCSS(featureVectors: number[][], clusters: Array<{ members: number[]; centroid: number[] }>): number {
    let totalWCSS = 0;

    for (const cluster of clusters) {
      for (const memberIndex of cluster.members) {
        const vector = featureVectors[memberIndex];
        if (vector && cluster.centroid) {
          const distance = this.calculateEuclideanDistance(vector, cluster.centroid);
          totalWCSS += distance * distance;
        }
      }
    }

    return totalWCSS;
  }

  /**
   * Simple elbow detection algorithm
   */
  private detectElbow(wcssValues: number[]): number {
    if (wcssValues.length < 3) return 3;

    // Calculate the rate of change (second derivative approximation)
    const ratesOfChange: number[] = [];
    for (let i = 1; i < wcssValues.length - 1; i++) {
      const prev = wcssValues[i - 1];
      const curr = wcssValues[i];
      const next = wcssValues[i + 1];
      if (prev !== undefined && curr !== undefined && next !== undefined) {
        const rate = prev - 2 * curr + next;
        ratesOfChange.push(Math.abs(rate));
      }
    }

    // Find the index with maximum rate of change (elbow point)
    let maxRateIndex = 0;
    let maxRate = 0;

    ratesOfChange.forEach((rate, index) => {
      if (rate > maxRate) {
        maxRate = rate;
        maxRateIndex = index;
      }
    });

    return maxRateIndex + 2; // +2 because we start from k=2 and ratesOfChange is offset by 1
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private calculateEuclideanDistance(vector1: number[], vector2: number[]): number {
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
}