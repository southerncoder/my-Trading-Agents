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
    const silhouette_score = await this.calculateSilhouetteScore(clusters);

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
    const threshold = llmAnalysis.threshold || 0.8;

    for (const [index, example] of examples.entries()) {
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
    const threshold = threshold_index < sorted_scores.length ? sorted_scores[threshold_index] : 0.8;

    // Identify anomalies
    for (const [index, score] of anomaly_scores.entries()) {
      if (score >= threshold) {
        const example = examples[index];
        if (example) {
          anomalies.push(example);
        }
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
    for (const [index, example] of examples.entries()) {
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

  private async calculateSilhouetteScore(_clusters: Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }>): Promise<number> {
    // Placeholder for silhouette score calculation
    return 0.5;
  }

  private async calculateElbowScore(_clusters: Array<{
    cluster_id: string;
    centroid: number[];
    members: LearningExample[];
    size: number;
    characteristics: Record<string, number>;
  }>): Promise<number> {
    // Placeholder for elbow score calculation
    return 0.5;
  }

  private findElbowPoint(scores: number[]): number {
    // Simplified elbow point detection (to be enhanced)
    return scores.findIndex((score, index) =>
      index > 0 && score < (scores[index - 1] || 0) * 0.9
    );
  }
}
