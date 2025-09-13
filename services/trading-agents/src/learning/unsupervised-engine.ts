import { LearningExample } from './learning-types';
import { LLMProviderFactory } from '../providers/llm-factory';
import { AgentLLMConfig } from '../types/agent-config';

/**
 * Unsupervised Learning Engine
 *
 * Implements clustering and anomaly detection for market analysis using
 * unsupervised learning algorithms.
 */
export class UnsupervisedLearningEngine {
  private clusters: Map<string, { centroid: number[]; members: LearningExample[] }> = new Map();
  private anomalies: LearningExample[] = [];
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
  }

  /**
   * Perform clustering on market data
   */
  async performClustering(
    examples: LearningExample[],
    numClusters: number = 3,
    algorithm: string = 'kmeans'
  ): Promise<{
    clusters: Array<{
      cluster_id: string;
      centroid: number[];
      members: LearningExample[];
      size: number;
      characteristics: Record<string, number>;
    }>;
    silhouette_score: number;
  }> {

    this.logger.info('performClustering', 'Starting clustering', {
      numExamples: examples.length,
      numClusters,
      algorithm
    });

    // Perform LLM-powered clustering analysis
    const clusters = await this.performLLMClustering(examples, numClusters);

    // Calculate silhouette score
    const silhouette_score = await this.calculateOverallSilhouetteScore(clusters);

    // Store clusters
    for (const cluster of clusters) {
      this.clusters.set(cluster.cluster_id, {
        centroid: cluster.centroid,
        members: cluster.members
      });
    }

    this.logger.info('performClustering', 'Clustering completed', {
      numClusters: clusters.length,
      silhouetteScore: silhouette_score
    });

    return {
      clusters,
      silhouette_score
    };
  }

  /**
   * Detect anomalies in market data
   */
  async detectAnomalies(
    examples: LearningExample[],
    contamination: number = 0.1,
    algorithm: string = 'isolation_forest'
  ): Promise<{
    anomalies: LearningExample[];
    anomaly_scores: number[];
    threshold: number;
  }> {

    this.logger.info('detectAnomalies', 'Starting anomaly detection', {
      numExamples: examples.length,
      contamination,
      algorithm
    });

    // Perform LLM-powered anomaly detection
    const result = await this.performLLMAnomalyDetection(examples, contamination);

    // Store anomalies
    this.anomalies = result.anomalies;

    this.logger.info('detectAnomalies', 'Anomaly detection completed', {
      numAnomalies: result.anomalies.length,
      threshold: result.threshold
    });

    return result;
  }

  /**
   * Find optimal number of clusters using elbow method
   */
  async findOptimalClusters(
    examples: LearningExample[],
    maxClusters: number = 10
  ): Promise<{
    optimal_clusters: number;
    elbow_scores: number[];
    recommended_clusters: number;
  }> {

    const elbow_scores: number[] = [];

    for (let k = 2; k <= maxClusters; k++) {
      const clusters = await this.performLLMClustering(examples, k);
      const score = await this.calculateElbowScore(clusters);
      elbow_scores.push(score);
    }

    // Find elbow point (simplified)
    const optimal_clusters = this.findElbowPoint(elbow_scores) + 2; // +2 because we start from k=2

    this.logger.info('findOptimalClusters', 'Optimal cluster analysis completed', {
      maxClusters,
      optimalClusters: optimal_clusters
    });

    return {
      optimal_clusters,
      elbow_scores,
      recommended_clusters: optimal_clusters
    };
  }

  /**
   * Get health status of the unsupervised learning engine
   */
  getHealth(): boolean {
    try {
      // Check if clusters map is accessible
      const clustersAccessible = this.clusters !== undefined && this.clusters instanceof Map;

      // Check if anomalies array is accessible
      const anomaliesAccessible = Array.isArray(this.anomalies);

      // Check if logger is available
      const loggerAvailable = this.logger !== undefined;

      return clustersAccessible && anomaliesAccessible && loggerAvailable;
    } catch (error) {
      this.logger?.error('getHealth', 'Health check failed', { error });
      return false;
    }
  }

  private async performLLMClustering(
    examples: LearningExample[],
    numClusters: number
  ): Promise<Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }>> {

    try {
      // Create LM Studio model for clustering analysis
      const modelConfig: AgentLLMConfig = {
        provider: 'lm_studio',
        model: 'mistralai/devstral-small-2507', // Use actual model from LM Studio
        baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
        temperature: 0.2, // Low temperature for consistent clustering
        maxTokens: 1500
      };

      const llm = LLMProviderFactory.createLLM(modelConfig);

      // Prepare market data summary for LLM analysis
      const marketDataSummary = this.prepareMarketDataForClustering(examples);

      // Create comprehensive clustering prompt
      const clusteringPrompt = `You are an expert financial analyst and data scientist specializing in market regime analysis and clustering.

Analyze this market data and identify ${numClusters} distinct market regimes or clusters based on patterns in the data:

MARKET DATA SUMMARY:
${marketDataSummary}

Please perform intelligent clustering analysis:

1. **Identify Market Regimes**: Based on the data patterns, identify ${numClusters} distinct market regimes (e.g., "Bull Market", "Bear Market", "High Volatility", "Low Volatility", "Sideways", etc.)

2. **Define Cluster Characteristics**: For each regime, define the key characteristics that distinguish it from others

3. **Assign Examples**: Analyze each market condition and assign it to the most appropriate cluster

4. **Calculate Centroids**: For each cluster, calculate representative feature values (centroids)

5. **Assess Cluster Quality**: Evaluate how well the clusters are separated and meaningful

Provide your analysis as JSON:
{
  "clusters": [
    {
      "regime_name": "Bull Market",
      "description": "Strong upward trending market with positive momentum",
      "key_characteristics": ["high_returns", "low_volatility", "positive_sentiment"],
      "expected_features": {
        "rsi": [60, 80],
        "volume": [1.2, 2.0],
        "sentiment": [0.6, 1.0]
      },
      "confidence": 0.85
    }
  ],
  "clustering_quality": {
    "separation_score": 0.8,
    "cluster_coherence": 0.75,
    "market_regime_coverage": 0.9
  },
  "assignment_rules": [
    "Assign to Bull Market if: RSI > 60 AND returns > 2% AND volatility < 15%",
    "Assign to Bear Market if: RSI < 40 AND returns < -2% AND volatility > 20%"
  ]
}`;

      // Get LLM clustering analysis
      const response = await llm.invoke([{
        role: 'user',
        content: clusteringPrompt
      }]);

      const clusteringText = response.content as string;
      const llmAnalysis = this.parseLLMClusteringAnalysis(clusteringText);

      // Apply LLM-guided clustering to actual data
      const clusters = this.applyLLMClusteringToData(examples, llmAnalysis, numClusters);

      this.logger.debug('performLLMClustering', 'LLM-guided clustering completed', {
        numClusters: clusters.length,
        totalExamples: examples.length,
        clusterSizes: clusters.map(c => c.size)
      });

      return clusters;

    } catch (error) {
      this.logger.error('performLLMClustering', 'LLM clustering failed', { error });
      throw error;
    }
  }

  private async performLLMAnomalyDetection(
    examples: LearningExample[],
    contamination: number
  ): Promise<{
    anomalies: LearningExample[];
    anomaly_scores: number[];
    threshold: number;
  }> {
    try {
      // Create LM Studio model for anomaly detection
      const modelConfig: AgentLLMConfig = {
        provider: 'lm_studio',
        model: 'mistralai/devstral-small-2507', // Use actual model from LM Studio
        baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
        temperature: 0.1, // Low temperature for consistent anomaly detection
        maxTokens: 1000
      };

      const llm = LLMProviderFactory.createLLM(modelConfig);

      // Prepare data summary for anomaly detection
      const dataSummary = this.prepareDataForAnomalyDetection(examples);

      // Create anomaly detection prompt
      const anomalyPrompt = `You are an expert financial analyst specializing in anomaly detection and market outlier identification.

Analyze this market data to identify anomalies and unusual patterns:

DATA SUMMARY:
${dataSummary}

Please perform anomaly detection analysis:

1. **Identify Anomalous Patterns**: Look for unusual market conditions, extreme returns, or outlier feature combinations
2. **Calculate Anomaly Scores**: Assign scores from 0-1 indicating how anomalous each example is
3. **Determine Threshold**: Set a contamination-based threshold (${(contamination * 100).toFixed(1)}% expected anomalies)
4. **Classify Anomalies**: Flag examples above the threshold as anomalies

Consider:
- Statistical outliers in returns, volatility, or feature values
- Unusual combinations of market conditions
- Extreme values that deviate from normal market behavior
- Patterns that don't fit typical market regimes

Provide your analysis as JSON:
{
  "anomalies_analysis": [
    {
      "example_index": 0,
      "anomaly_score": 0.95,
      "reason": "Extreme negative return of -15% with high volatility",
      "anomaly_type": "return_outlier"
    }
  ],
  "threshold": 0.85,
  "contamination_rate": ${contamination},
  "total_anomalies": 3
}`;

      // Get LLM anomaly analysis
      const response = await llm.invoke([{
        role: 'user',
        content: anomalyPrompt
      }]);

      const anomalyText = response.content as string;
      const llmAnalysis = this.parseLLMAnomalyAnalysis(anomalyText);

      // Apply anomaly detection to data
      const result = this.applyAnomalyDetection(examples, llmAnalysis, contamination);

      this.logger.debug('performLLMAnomalyDetection', 'LLM-guided anomaly detection completed', {
        numExamples: examples.length,
        numAnomalies: result.anomalies.length,
        threshold: result.threshold
      });

      return result;

    } catch (error) {
      this.logger.error('performLLMAnomalyDetection', 'LLM anomaly detection failed', { error });
      throw error;
    }
  }

  private prepareMarketDataForClustering(examples: LearningExample[]): string {
    const numExamples = examples.length;

    // Analyze feature distributions
    const featureStats: Record<string, {
      mean: number;
      std: number;
      min: number;
      max: number;
      distribution: string;
    }> = {};

    if (examples.length > 0 && examples[0]?.features) {
      const featureKeys = Object.keys(examples[0].features);

      for (const key of featureKeys) {
        const values = examples.map(ex => ex.features[key]).filter((v): v is number => v !== undefined && !isNaN(v));
        if (values.length === 0) continue;

        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Determine distribution type
        let distribution = 'normal';
        if (Math.abs(mean) > std * 2) distribution = 'skewed';
        if (max - min > mean * 4) distribution = 'wide_range';
        if (std / Math.abs(mean) < 0.1) distribution = 'low_variance';

        featureStats[key] = { mean, std, min, max, distribution };
      }
    }

    // Analyze market conditions
    const conditions = examples.map(ex => ex.market_conditions);
    const conditionPatterns: Record<string, number> = {};

    for (const condition of conditions) {
      for (const [key, value] of Object.entries(condition)) {
        const conditionKey = `${key}:${value}`;
        conditionPatterns[conditionKey] = (conditionPatterns[conditionKey] || 0) + 1;
      }
    }

    // Analyze return patterns
    const returns = examples.map(ex => ex.outcome.realized_return);
    const positiveReturns = returns.filter(r => r > 0).length;
    const negativeReturns = returns.filter(r => r <= 0).length;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnVolatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

    return `
Dataset Overview:
- Total examples: ${numExamples}
- Time period: ${examples.length > 0 && examples[0] && examples[examples.length - 1] ? `${examples[0]?.timestamp} to ${examples[examples.length - 1]?.timestamp}` : 'N/A'}

Return Analysis:
- Average return: ${(avgReturn * 100).toFixed(2)}%
- Return volatility: ${(returnVolatility * 100).toFixed(2)}%
- Positive returns: ${positiveReturns} (${((positiveReturns / numExamples) * 100).toFixed(1)}%)
- Negative returns: ${negativeReturns} (${((negativeReturns / numExamples) * 100).toFixed(1)}%)
- Best return: ${(Math.max(...returns) * 100).toFixed(2)}%
- Worst return: ${(Math.min(...returns) * 100).toFixed(2)}%

Feature Statistics:
${Object.entries(featureStats).map(([key, stats]) =>
  `- ${key}: mean=${stats.mean.toFixed(3)}, std=${stats.std.toFixed(3)}, range=[${stats.min.toFixed(3)}, ${stats.max.toFixed(3)}], distribution=${stats.distribution}`
).join('\n')}

Market Condition Patterns:
${Object.entries(conditionPatterns).sort(([,a], [,b]) => b - a).slice(0, 10).map(([pattern, count]) =>
  `- ${pattern}: ${count} occurrences (${((count / numExamples) * 100).toFixed(1)}%)
`).join('\n')}
    `.trim();
  }

  private prepareDataForAnomalyDetection(examples: LearningExample[]): string {
    const numExamples = examples.length;
    const returns = examples.map(ex => ex.outcome.realized_return);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnVolatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

    // Find potential outliers
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const q1 = sortedReturns[Math.floor(numExamples * 0.25)] ?? 0;
    const q3 = sortedReturns[Math.floor(numExamples * 0.75)] ?? 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = returns.filter(r => r < lowerBound || r > upperBound);

    return `
Dataset Overview:
- Total examples: ${numExamples}
- Average return: ${(avgReturn * 100).toFixed(2)}%
- Return volatility: ${(returnVolatility * 100).toFixed(2)}%

Statistical Outliers (IQR method):
- Q1 (25th percentile): ${(q1 * 100).toFixed(2)}%
- Q3 (75th percentile): ${(q3 * 100).toFixed(2)}%
- IQR: ${(iqr * 100).toFixed(2)}%
- Lower bound: ${(lowerBound * 100).toFixed(2)}%
- Upper bound: ${(upperBound * 100).toFixed(2)}%
- Potential outliers: ${outliers.length} (${((outliers.length / numExamples) * 100).toFixed(1)}%)

Extreme Values:
- Best return: ${(Math.max(...returns) * 100).toFixed(2)}%
- Worst return: ${(Math.min(...returns) * 100).toFixed(2)}%
- Return range: ${((Math.max(...returns) - Math.min(...returns)) * 100).toFixed(2)}%

Feature Analysis:
${this.analyzeFeaturesForAnomalies(examples)}
    `.trim();
  }

  private analyzeFeaturesForAnomalies(examples: LearningExample[]): string {
    if (examples.length === 0 || !examples[0]?.features) return 'No feature data available';

    const featureKeys = Object.keys(examples[0].features);
    let analysis = '';

    for (const key of featureKeys) {
      const values = examples.map(ex => ex.features[key]).filter((v): v is number => v !== undefined && !isNaN(v));
      if (values.length < 3) continue;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

      // Find extreme values (more than 3 standard deviations from mean)
      const extremeValues = values.filter(v => Math.abs(v - mean) > 3 * std);

      if (extremeValues.length > 0) {
        analysis += `- ${key}: ${extremeValues.length} extreme values (>${(3 * std).toFixed(2)} from mean ${mean.toFixed(3)})\n`;
      }
    }

    return analysis || 'No significant feature anomalies detected';
  }

  private parseLLMClusteringAnalysis(clusteringText: string): any {
    try {
      const jsonMatch = clusteringText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in clustering response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return parsed;
    } catch (error) {
      this.logger.warn('parseLLMClusteringAnalysis', 'Failed to parse LLM clustering analysis', { error });
      return null;
    }
  }

  private parseLLMAnomalyAnalysis(anomalyText: string): any {
    try {
      const jsonMatch = anomalyText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in anomaly response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return parsed;
    } catch (error) {
      this.logger.warn('parseLLMAnomalyAnalysis', 'Failed to parse LLM anomaly analysis', { error });
      return null;
    }
  }

  private applyLLMClusteringToData(
    examples: LearningExample[],
    llmAnalysis: any,
    numClusters: number
  ): Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }> {
    const clusters: Array<{
      cluster_id: string;
      centroid: number[];
      members: LearningExample[];
      size: number;
      characteristics: Record<string, number>;
    }> = [];

    if (!llmAnalysis || !Array.isArray(llmAnalysis.clusters)) {
      this.logger.warn('applyLLMClusteringToData', 'Invalid LLM clustering analysis, falling back to default clustering');
      return this.defaultClustering(examples, numClusters);
    }

    // Create clusters based on LLM analysis
    for (const [index, clusterData] of llmAnalysis.clusters.entries()) {
      const clusterId = `cluster_${index + 1}`;
      const centroid = Object.values(clusterData.expected_features || {}).flat().filter((v): v is number => typeof v === 'number');
      const members = examples.filter(ex =>
        this.isExampleInCluster(ex, clusterData.assignment_rules || [])
      );

      clusters.push({
        cluster_id: clusterId,
        centroid,
        members,
        size: members.length,
        characteristics: {
          ...clusterData,
          confidence: clusterData.confidence || 0.5
        }
      });
    }

    return clusters;
  }

  private applyAnomalyDetection(
    examples: LearningExample[],
    llmAnalysis: any,
    contamination: number
  ): {
    anomalies: LearningExample[];
    anomaly_scores: number[];
    threshold: number;
  } {
    const anomalies: LearningExample[] = [];
    const anomaly_scores: number[] = [];

    if (!llmAnalysis || !Array.isArray(llmAnalysis.anomalies_analysis)) {
      // Fallback to statistical anomaly detection
      return this.statisticalAnomalyDetection(examples, contamination);
    }

    // Apply LLM-based anomaly detection
    const threshold: number = llmAnalysis.threshold || 0.8;

    for (let index = 0; index < examples.length; index++) {
      const example = examples[index];
      if (!example) continue;

      const analysis = llmAnalysis.anomalies_analysis.find((a: any) => a.example_index === index);
      const score = analysis ? analysis.anomaly_score : 0;

      anomaly_scores.push(score);

      if (score >= threshold) {
        anomalies.push(example);
      }
    }

    return {
      anomalies,
      anomaly_scores,
      threshold
    };
  }

  private statisticalAnomalyDetection(
    examples: LearningExample[],
    contamination: number
  ): {
    anomalies: LearningExample[];
    anomaly_scores: number[];
    threshold: number;
  } {
    const returns = examples.map(ex => ex.outcome.realized_return);
    const anomaly_scores: number[] = [];
    const anomalies: LearningExample[] = [];

    // Calculate z-scores for returns
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);

    for (const return_val of returns) {
      const z_score = Math.abs((return_val - mean) / std);
      // Convert z-score to anomaly score (0-1)
      const anomaly_score = Math.min(1, z_score / 3);
      anomaly_scores.push(anomaly_score);
    }

    // Set threshold based on contamination rate
    const sorted_scores = [...anomaly_scores].sort((a, b) => b - a);
    const threshold_index = Math.floor(contamination * examples.length);
    const threshold: number = threshold_index < sorted_scores.length && sorted_scores[threshold_index] !== undefined
      ? sorted_scores[threshold_index]
      : 0.8;

    // Identify anomalies
    for (let index = 0; index < examples.length; index++) {
      const example = examples[index];
      if (!example) continue;

      const score = anomaly_scores[index];
      if (score !== undefined && score >= threshold) {
        anomalies.push(example);
      }
    }

    return {
      anomalies,
      anomaly_scores,
      threshold
    };
  }

  private defaultClustering(
    examples: LearningExample[],
    numClusters: number
  ): Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }> {
    // Simple k-means-like clustering fallback
    const clusters: Array<{
      cluster_id: string;
      centroid: number[];
      members: LearningExample[];
      size: number;
      characteristics: Record<string, number>;
    }> = [];

    // Initialize centroids randomly
    for (let i = 0; i < numClusters; i++) {
      const centroid = examples[0]?.features ? Object.values(examples[0].features) : [];
      clusters.push({
        cluster_id: `cluster_${i + 1}`,
        centroid,
        members: [],
        size: 0,
        characteristics: { confidence: 0.3 }
      });
    }

    // Simple assignment: distribute examples evenly
    for (let index = 0; index < examples.length; index++) {
      const example = examples[index];
      if (!example) continue;

      const clusterIndex = index % numClusters;
      const cluster = clusters[clusterIndex];
      if (cluster) {
        cluster.members.push(example);
        cluster.size++;
      }
    }

    return clusters;
  }

  private isExampleInCluster(example: LearningExample, rules: string[]): boolean {
    // Simple rule-based assignment (to be enhanced)
    for (const rule of rules) {
      const [_, logic] = rule.split(' if ');
      if (logic && this.evaluateRuleLogic(example, logic)) {
        return true;
      }
    }
    return false;
  }

  private evaluateRuleLogic(example: LearningExample, logic: string): boolean {
    // Basic logic evaluator (to be enhanced)
    try {
      const func = new Function('ex', `return ${logic.replace(/([a-zA-Z_][a-zA-Z0-9_]*)/g, 'ex.$1')}`);
      return func(example);
    } catch {
      return false;
    }
  }

  private calculateExampleSilhouetteScore(
    example: LearningExample,
    cluster: {
      cluster_id: string;
      centroid: number[];
      members: LearningExample[];
      size: number;
      characteristics: Record<string, number>;
    },
    allClusters: Array<{
      cluster_id: string;
      centroid: number[];
      members: LearningExample[];
      size: number;
      characteristics: Record<string, number>;
    }>
  ): number {
    // Calculate average distance to other members in the same cluster (a)
    const sameClusterMembers = cluster.members.filter(member => member.id !== example.id);
    const a = sameClusterMembers.length > 0 ?
      sameClusterMembers.reduce((sum, member) =>
        sum + this.calculateDistance(example, member), 0
      ) / sameClusterMembers.length : 0;

    // Find the nearest neighboring cluster
    let minDistance = Infinity;
    for (const otherCluster of allClusters) {
      if (otherCluster.cluster_id === cluster.cluster_id) continue;

      const distance = this.calculateDistanceToCentroid(example, otherCluster.centroid);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    const b = minDistance === Infinity ? 0 : minDistance;

    // Calculate silhouette score: (b - a) / max(a, b)
    const denominator = Math.max(a, b);
    const silhouetteScore = denominator === 0 ? 0 : (b - a) / denominator;

    return silhouetteScore;
  }

  private async calculateOverallSilhouetteScore(clusters: Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }>): Promise<number> {
    if (clusters.length === 0) {
      return 0.0;
    }

    try {
      let totalSilhouetteScore = 0;
      let totalExamples = 0;

      // Calculate silhouette score for each example
      for (const cluster of clusters) {
        for (const member of cluster.members) {
          const silhouetteScore = this.calculateExampleSilhouetteScore(member, cluster, clusters);
          totalSilhouetteScore += silhouetteScore;
          totalExamples++;
        }
      }

      // Return average silhouette score
      const averageSilhouetteScore = totalExamples > 0 ? totalSilhouetteScore / totalExamples : 0;

      this.logger.debug('calculateOverallSilhouetteScore', 'Overall silhouette score calculated', {
        numClusters: clusters.length,
        totalExamples,
        averageSilhouetteScore: averageSilhouetteScore.toFixed(3)
      });

      return averageSilhouetteScore;

    } catch (error) {
      this.logger.warn('calculateOverallSilhouetteScore', 'Silhouette score calculation failed', { error });
      return 0.0;
    }
  }

  private calculateDistance(example1: LearningExample, example2: LearningExample): number {
    // Calculate Euclidean distance between feature vectors
    const features1 = example1.features;
    const features2 = example2.features;

    const featureKeys = Object.keys(features1);
    let sumSquaredDifferences = 0;

    for (const key of featureKeys) {
      const val1 = features1[key] || 0;
      const val2 = features2[key] || 0;
      sumSquaredDifferences += Math.pow(val1 - val2, 2);
    }

    return Math.sqrt(sumSquaredDifferences);
  }

  private calculateDistanceToCentroid(example: LearningExample, centroid: number[]): number {
    // Calculate distance from example to cluster centroid
    const features = example.features;
    const featureKeys = Object.keys(features);

    let sumSquaredDifferences = 0;
    for (let i = 0; i < Math.min(featureKeys.length, centroid.length); i++) {
      const key = featureKeys[i];
      if (key !== undefined) {
        const featureValue = features[key] || 0;
        const centroidValue = centroid[i] || 0;
        sumSquaredDifferences += Math.pow(featureValue - centroidValue, 2);
      }
    }

    return Math.sqrt(sumSquaredDifferences);
  }

  private async calculateElbowScore(clusters: Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }>): Promise<number> {
    if (clusters.length === 0) {
      return 0.0;
    }

    try {
      // Calculate within-cluster sum of squares (WCSS)
      let wcss = 0;

      for (const cluster of clusters) {
        if (cluster.members.length === 0) continue;

        // Calculate sum of squared distances from members to centroid
        for (const member of cluster.members) {
          const distance = this.calculateDistanceToCentroid(member, cluster.centroid);
          wcss += Math.pow(distance, 2);
        }
      }

      // Normalize WCSS by the number of examples (to make it comparable across different dataset sizes)
      const totalExamples = clusters.reduce((sum, cluster) => sum + cluster.members.length, 0);
      const normalizedWcss = totalExamples > 0 ? wcss / totalExamples : 0;

      // Convert to a score where higher values indicate better clustering (less WCSS is better)
      // Use exponential decay to map WCSS to a score between 0 and 1
      const elbowScore = Math.exp(-normalizedWcss);

      this.logger.debug('calculateElbowScore', 'Elbow score calculated', {
        numClusters: clusters.length,
        totalExamples,
        wcss: wcss.toFixed(3),
        normalizedWcss: normalizedWcss.toFixed(3),
        elbowScore: elbowScore.toFixed(3)
      });

      return elbowScore;

    } catch (error) {
      this.logger.warn('calculateElbowScore', 'Elbow score calculation failed', { error });
      return 0.0;
    }
  }

  private findElbowPoint(scores: number[]): number {
    if (scores.length < 3) {
      // Not enough points to determine elbow, return middle point
      return Math.floor(scores.length / 2);
    }

    try {
      // Method 1: Find point with maximum distance from line connecting first and last points
      const firstPoint = scores[0]!;
      const lastPoint = scores[scores.length - 1]!;
      const lineLength = scores.length - 1;

      let maxDistance = 0;
      let elbowIndex = 0;

      for (let i = 1; i < scores.length - 1; i++) {
        const currentScore = scores[i];
        if (currentScore === undefined) continue;

        // Calculate perpendicular distance from point to line
        const distance = this.calculatePerpendicularDistance(
          i, currentScore, 0, firstPoint, lineLength, lastPoint
        );

        if (distance > maxDistance) {
          maxDistance = distance;
          elbowIndex = i;
        }
      }

      // Method 2: Find point where second derivative changes sign (acceleration point)
      const secondDerivativeElbow = this.findSecondDerivativeElbow(scores);

      // Use the more conservative estimate (smaller number of clusters)
      const finalElbow = Math.min(elbowIndex, secondDerivativeElbow);

      this.logger.debug('findElbowPoint', 'Elbow point detected', {
        totalScores: scores.length,
        perpendicularDistanceElbow: elbowIndex,
        secondDerivativeElbow,
        finalElbow,
        maxDistance: maxDistance.toFixed(3)
      });

      return finalElbow;

    } catch (error) {
      this.logger.warn('findElbowPoint', 'Elbow point detection failed, using fallback', { error });
      // Fallback: return the point where improvement starts to diminish
      return scores.findIndex((score, index) =>
        index > 0 && score !== undefined && score < (scores[index - 1] || 0) * 0.9
      );
    }
  }

  private calculatePerpendicularDistance(
    x: number, y: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    // Calculate perpendicular distance from point (x,y) to line from (x1,y1) to (x2,y2)
    const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

    return denominator > 0 ? numerator / denominator : 0;
  }

  private findSecondDerivativeElbow(scores: number[]): number {
    if (scores.length < 4) {
      return Math.floor(scores.length / 2);
    }

    // Calculate first derivatives (rate of change)
    const firstDerivatives: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      const currentScore = scores[i];
      const previousScore = scores[i - 1];
      if (currentScore !== undefined && previousScore !== undefined) {
        firstDerivatives.push(currentScore - previousScore);
      }
    }

    if (firstDerivatives.length < 2) {
      return Math.floor(scores.length / 2);
    }

    // Calculate second derivatives (rate of change of rate of change)
    const secondDerivatives: number[] = [];
    for (let i = 1; i < firstDerivatives.length; i++) {
      const currentFirst = firstDerivatives[i];
      const previousFirst = firstDerivatives[i - 1];
      if (currentFirst !== undefined && previousFirst !== undefined) {
        secondDerivatives.push(currentFirst - previousFirst);
      }
    }

    // Find where second derivative becomes positive (concavity changes)
    // This indicates the "elbow" where the curve starts flattening
    let elbowIndex = Math.floor(scores.length / 2); // Default to middle

    for (let i = 1; i < secondDerivatives.length; i++) {
      const currentSecond = secondDerivatives[i];
      const previousSecond = secondDerivatives[i - 1];
      if (currentSecond !== undefined && previousSecond !== undefined) {
        if (currentSecond > 0 && previousSecond <= 0) {
          elbowIndex = i + 1; // +1 because second derivatives are offset by 2
          break;
        }
      }
    }

    return Math.max(1, Math.min(elbowIndex, scores.length - 2)); // Ensure valid index
  }
}
