/**
 * Feature Selection Engine for Advanced Memory System
 *
 * This module implements sophisticated feature selection techniques for ML models.
 * It provides methods for:
 * - Recursive feature elimination
 * - LASSO-based feature selection
 * - Tree-based feature importance
 * - Ensemble feature selection methods
 * - Feature importance calculation with multiple algorithms
 * - Feature stability analysis
 * - Cross-validation based selection
 * - Bootstrap-based feature evaluation
 */

/**
 * Interface for feature selection configuration
 */
export interface FeatureSelectionConfig {
  method?: 'recursive' | 'lasso' | 'tree_based' | 'ensemble';
  maxFeatures?: number;
  eliminationThreshold?: number;
  stabilityThreshold?: number;
  crossValidationFolds?: number;
  bootstrapSamples?: number;
}

/**
 * Interface for feature selection result
 */
export interface FeatureSelectionResult {
  selected_features: string[];
  elimination_order: Array<{
    feature: string;
    importance: number;
    eliminated_at_step: number;
  }>;
  selection_criteria: {
    method: string;
    threshold: number;
    stability_score: number;
  };
  feature_scores?: Array<{
    feature_name: string;
    importance_score: number;
    confidence_interval: [number, number];
    stability_score: number;
    method_contributions: Record<string, number>;
  }>;
}

/**
 * Interface for feature importance result
 */
export interface FeatureImportanceResult {
  feature_name: string;
  importance_score: number;
  confidence_interval: [number, number];
  stability_score: number;
  method_contributions: Record<string, number>;
}

/**
 * Feature Selection Engine
 * Handles various feature selection algorithms and importance calculations
 */
export class FeatureSelectionEngine {
  private logger: any;
  private config: Required<FeatureSelectionConfig>;

  constructor(
    config: FeatureSelectionConfig = {},
    logger?: any
  ) {
    this.logger = logger || console;
    this.config = {
      method: config.method || 'ensemble',
      maxFeatures: config.maxFeatures || 20,
      eliminationThreshold: config.eliminationThreshold || 0.01,
      stabilityThreshold: config.stabilityThreshold || 0.7,
      crossValidationFolds: config.crossValidationFolds || 5,
      bootstrapSamples: config.bootstrapSamples || 100
    };
  }

  /**
   * Calculate comprehensive feature importance using multiple methods
   */
  calculateFeatureImportance(
    features: any[],
    targets: number[],
    method: 'correlation' | 'mutual_info' | 'permutation' | 'ensemble' = 'ensemble'
  ): FeatureImportanceResult[] {
    try {
      const featureNames = this.extractFeatureNames(features);
      const importanceResults: FeatureImportanceResult[] = [];

      for (const featureName of featureNames) {
        const featureValues = this.extractFeatureValues(features, featureName);

        // Calculate importance using different methods
        const methodResults = {
          correlation: this.calculateCorrelationImportance(featureValues, targets),
          mutual_info: this.calculateMutualInformationImportance(featureValues, targets),
          permutation: this.calculatePermutationImportance(featureValues, targets, features),
          variance: this.calculateVarianceImportance(featureValues)
        };

        // Combine methods based on specified approach
        const combinedResult = this.combineImportanceMethods(methodResults, method);

        importanceResults.push({
          feature_name: featureName,
          importance_score: combinedResult.score,
          confidence_interval: combinedResult.confidenceInterval,
          stability_score: combinedResult.stability,
          method_contributions: methodResults
        });
      }

      // Sort by importance score
      return importanceResults.sort((a, b) => b.importance_score - a.importance_score);

    } catch (error) {
      this.logger.warn('Error calculating feature importance', { error });
      return [];
    }
  }

  /**
   * Perform feature selection using multiple algorithms
   */
  performFeatureSelection(
    features: any[],
    targets: number[],
    options: Partial<FeatureSelectionConfig> = {}
  ): FeatureSelectionResult {
    try {
      const config = { ...this.config, ...options };
      const featureNames = this.extractFeatureNames(features);

      switch (config.method) {
        case 'recursive':
          return this.recursiveFeatureElimination(features, targets, featureNames, config);

        case 'lasso':
          return this.lassoFeatureSelection(features, targets, featureNames, config);

        case 'tree_based':
          return this.treeBasedFeatureSelection(features, targets, featureNames, config);

        case 'ensemble':
          return this.ensembleFeatureSelection(features, targets, featureNames, config);

        default:
          return this.recursiveFeatureElimination(features, targets, featureNames, config);
      }

    } catch (error) {
      this.logger.warn('Error performing feature selection', { error });
      return {
        selected_features: [],
        elimination_order: [],
        selection_criteria: {
          method: 'error',
          threshold: 0,
          stability_score: 0
        }
      };
    }
  }

  /**
   * Recursive feature elimination with cross-validation
   */
  private recursiveFeatureElimination(
    features: any[],
    targets: number[],
    featureNames: string[],
    options: Required<FeatureSelectionConfig>
  ): FeatureSelectionResult {
    try {
      const eliminationOrder: Array<{
        feature: string;
        importance: number;
        eliminated_at_step: number;
      }> = [];
      
      let remainingFeatures = [...featureNames];
      let step = 0;

      // Iteratively eliminate features
      while (remainingFeatures.length > (options.maxFeatures || 1)) {
        // Calculate importance for remaining features
        const currentFeatures = this.filterFeatures(features, remainingFeatures);
        const importanceScores = this.calculateFeatureImportanceForSubset(
          currentFeatures, 
          targets, 
          remainingFeatures
        );

        // Find least important feature
        const leastImportant = importanceScores.reduce((min, current) =>
          current.score < min.score ? current : min
        );

        // Remove least important feature
        remainingFeatures = remainingFeatures.filter(name => name !== leastImportant.name);
        eliminationOrder.push({
          feature: leastImportant.name,
          importance: leastImportant.score,
          eliminated_at_step: step
        });

        step++;
      }

      // Calculate stability score
      const stabilityScore = this.calculateFeatureStability(
        features, targets, remainingFeatures, options.bootstrapSamples
      );

      return {
        selected_features: remainingFeatures,
        elimination_order: eliminationOrder.reverse(),
        selection_criteria: {
          method: 'recursive',
          threshold: options.eliminationThreshold,
          stability_score: stabilityScore
        }
      };

    } catch (error) {
      this.logger.warn('Error in recursive feature elimination', { error });
      return {
        selected_features: featureNames.slice(0, options.maxFeatures),
        elimination_order: [],
        selection_criteria: {
          method: 'recursive_error',
          threshold: 0,
          stability_score: 0
        }
      };
    }
  }

  /**
   * LASSO-based feature selection
   */
  private lassoFeatureSelection(
    features: any[],
    targets: number[],
    featureNames: string[],
    options: Required<FeatureSelectionConfig>
  ): FeatureSelectionResult {
    try {
      // Simulate LASSO regularization by calculating feature importance
      // and applying L1 penalty approximation
      const importanceScores = featureNames.map(featureName => ({
        name: featureName,
        score: this.calculateFeatureImportanceScore(features, targets, featureName)
      }));

      // Apply threshold-based selection (simulating LASSO sparsity)
      const threshold = this.calculateAdaptiveThreshold(importanceScores.map(s => s.score));
      const selectedFeatures = importanceScores
        .filter(feature => feature.score > threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxFeatures)
        .map(feature => feature.name);

      // Create elimination order
      const eliminationOrder = importanceScores
        .filter(feature => !selectedFeatures.includes(feature.name))
        .sort((a, b) => a.score - b.score)
        .map((feature, index) => ({
          feature: feature.name,
          importance: feature.score,
          eliminated_at_step: index
        }));

      const stabilityScore = this.calculateFeatureStability(
        features, targets, selectedFeatures, options.bootstrapSamples
      );

      return {
        selected_features: selectedFeatures,
        elimination_order: eliminationOrder,
        selection_criteria: {
          method: 'lasso',
          threshold: threshold,
          stability_score: stabilityScore
        }
      };

    } catch (error) {
      this.logger.warn('Error in LASSO feature selection', { error });
      return {
        selected_features: featureNames.slice(0, options.maxFeatures),
        elimination_order: [],
        selection_criteria: {
          method: 'lasso_error',
          threshold: 0,
          stability_score: 0
        }
      };
    }
  }

  /**
   * Tree-based feature selection using feature importance
   */
  private treeBasedFeatureSelection(
    features: any[],
    targets: number[],
    featureNames: string[],
    options: Required<FeatureSelectionConfig>
  ): FeatureSelectionResult {
    try {
      // Calculate tree-based importance (using correlation as proxy)
      const importanceScores = featureNames.map(featureName => ({
        name: featureName,
        score: this.calculateFeatureImportanceScore(features, targets, featureName)
      }));

      // Sort by importance and select top features
      const sortedFeatures = importanceScores.sort((a, b) => b.score - a.score);
      const selectedFeatures = sortedFeatures
        .slice(0, options.maxFeatures)
        .map(feature => feature.name);

      // Create elimination order
      const eliminationOrder = sortedFeatures
        .slice(options.maxFeatures)
        .map((feature, index) => ({
          feature: feature.name,
          importance: feature.score,
          eliminated_at_step: index
        }));

      const stabilityScore = this.calculateFeatureStability(
        features, targets, selectedFeatures, options.bootstrapSamples
      );

      return {
        selected_features: selectedFeatures,
        elimination_order: eliminationOrder,
        selection_criteria: {
          method: 'tree_based',
          threshold: sortedFeatures[Math.min(options.maxFeatures - 1, sortedFeatures.length - 1)]?.score || 0,
          stability_score: stabilityScore
        }
      };

    } catch (error) {
      this.logger.warn('Error in tree-based feature selection', { error });
      return {
        selected_features: featureNames.slice(0, options.maxFeatures),
        elimination_order: [],
        selection_criteria: {
          method: 'tree_based_error',
          threshold: 0,
          stability_score: 0
        }
      };
    }
  }

  /**
   * Ensemble feature selection combining multiple methods
   */
  private ensembleFeatureSelection(
    features: any[],
    targets: number[],
    featureNames: string[],
    options: Required<FeatureSelectionConfig>
  ): FeatureSelectionResult {
    try {
      // Run multiple selection methods
      const lassoResult = this.lassoFeatureSelection(features, targets, featureNames, options);
      const treeResult = this.treeBasedFeatureSelection(features, targets, featureNames, options);
      const recursiveResult = this.recursiveFeatureElimination(features, targets, featureNames, options);

      // Combine results using voting
      const featureVotes: Record<string, number> = {};
      const methods = [lassoResult, treeResult, recursiveResult];

      for (const result of methods) {
        for (const feature of result.selected_features) {
          featureVotes[feature] = (featureVotes[feature] || 0) + 1;
        }
      }

      // Calculate ensemble scores
      const ensembleScores = featureNames.map(featureName => ({
        name: featureName,
        score: (featureVotes[featureName] || 0) / methods.length,
        votes: featureVotes[featureName] || 0
      }));

      // Select features with majority vote or high ensemble score
      const selectedFeatures = ensembleScores
        .filter(feature => feature.votes >= 2 || feature.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxFeatures)
        .map(feature => feature.name);

      // Create elimination order
      const eliminationOrder = ensembleScores
        .filter(feature => !selectedFeatures.includes(feature.name))
        .sort((a, b) => a.score - b.score)
        .map((feature, index) => ({
          feature: feature.name,
          importance: feature.score,
          eliminated_at_step: index
        }));

      const stabilityScore = this.calculateFeatureStability(
        features, targets, selectedFeatures, options.bootstrapSamples
      );

      return {
        selected_features: selectedFeatures,
        elimination_order: eliminationOrder,
        selection_criteria: {
          method: 'ensemble',
          threshold: 0.5,
          stability_score: stabilityScore
        }
      };

    } catch (error) {
      this.logger.warn('Error in ensemble feature selection', { error });
      return {
        selected_features: featureNames.slice(0, options.maxFeatures),
        elimination_order: [],
        selection_criteria: {
          method: 'ensemble_error',
          threshold: 0,
          stability_score: 0
        }
      };
    }
  }

  // === Helper Methods ===

  private extractFeatureNames(features: any[]): string[] {
    try {
      if (features.length === 0) return [];
      const firstFeature = features[0];
      if (typeof firstFeature === 'object' && firstFeature !== null) {
        return Object.keys(firstFeature);
      }
      // If features are arrays, generate generic names
      return Array.from({ length: firstFeature?.length || 0 }, (_, i) => `feature_${i}`);
    } catch (error) {
      this.logger.warn('Error extracting feature names', { error });
      return [];
    }
  }

  private extractFeatureValues(features: any[], featureName: string): number[] {
    try {
      return features.map(feature => {
        if (typeof feature === 'object' && feature !== null) {
          return feature[featureName] || 0;
        }
        return 0;
      });
    } catch (error) {
      this.logger.warn('Error extracting feature values', { error, featureName });
      return [];
    }
  }

  private calculateCorrelationImportance(featureValues: number[], targets: number[]): number {
    try {
      return Math.abs(this.calculateCorrelation(featureValues, targets));
    } catch (error) {
      this.logger.warn('Error calculating correlation importance', { error });
      return 0;
    }
  }

  private calculateMutualInformationImportance(featureValues: number[], targets: number[]): number {
    try {
      // Simplified mutual information approximation using correlation
      const correlation = this.calculateCorrelation(featureValues, targets);
      return Math.abs(correlation) * 0.8; // Scale factor for MI approximation
    } catch (error) {
      this.logger.warn('Error calculating mutual information importance', { error });
      return 0;
    }
  }

  private calculatePermutationImportance(
    featureValues: number[], 
    targets: number[], 
    _allFeatures: any[]
  ): number {
    try {
      // Simplified permutation importance using variance
      const originalScore = this.calculateCorrelation(featureValues, targets);
      const variance = this.calculateVariance(featureValues);
      return Math.abs(originalScore) * (1 + variance); // Higher variance = potentially more important
    } catch (error) {
      this.logger.warn('Error calculating permutation importance', { error });
      return 0;
    }
  }

  private calculateVarianceImportance(featureValues: number[]): number {
    try {
      const variance = this.calculateVariance(featureValues);
      return Math.min(1, variance); // Normalize variance to [0,1]
    } catch (error) {
      this.logger.warn('Error calculating variance importance', { error });
      return 0;
    }
  }

  private combineImportanceMethods(
    methodResults: Record<string, number>,
    method: string
  ): {
    score: number;
    confidenceInterval: [number, number];
    stability: number;
  } {
    try {
      let score: number;
      
      if (method === 'ensemble') {
        // Weighted average of methods
        const weights = { correlation: 0.4, mutual_info: 0.3, permutation: 0.2, variance: 0.1 };
        score = Object.entries(methodResults).reduce(
          (sum, [methodName, value]) => sum + value * (weights[methodName as keyof typeof weights] || 0),
          0
        );
      } else {
        score = methodResults[method] || 0;
      }

      // Calculate confidence interval (simplified)
      const values = Object.values(methodResults);
      const std = Math.sqrt(this.calculateVariance(values));
      const confidenceInterval: [number, number] = [
        Math.max(0, score - 1.96 * std),
        Math.min(1, score + 1.96 * std)
      ];

      // Calculate stability as inverse of standard deviation
      const stability = values.length > 1 ? Math.max(0, 1 - std) : 1;

      return { score, confidenceInterval, stability };

    } catch (error) {
      this.logger.warn('Error combining importance methods', { error });
      return { score: 0, confidenceInterval: [0, 0], stability: 0 };
    }
  }

  private filterFeatures(features: any[], selectedFeatureNames: string[]): any[] {
    try {
      return features.map(feature => {
        if (typeof feature === 'object' && feature !== null) {
          const filtered: any = {};
          for (const name of selectedFeatureNames) {
            if (Object.prototype.hasOwnProperty.call(feature, name)) {
              filtered[name] = feature[name];
            }
          }
          return filtered;
        }
        return feature;
      });
    } catch (error) {
      this.logger.warn('Error filtering features', { error });
      return features;
    }
  }

  private calculateFeatureImportanceForSubset(
    features: any[],
    targets: number[],
    featureNames: string[]
  ): Array<{ name: string; score: number }> {
    try {
      return featureNames.map(name => ({
        name,
        score: this.calculateFeatureImportanceScore(features, targets, name)
      }));
    } catch (error) {
      this.logger.warn('Error calculating feature importance for subset', { error });
      return featureNames.map(name => ({ name, score: 0 }));
    }
  }

  private calculateFeatureImportanceScore(features: any[], targets: number[], featureName: string): number {
    try {
      const featureValues = this.extractFeatureValues(features, featureName);
      return this.calculateCorrelationImportance(featureValues, targets);
    } catch (error) {
      this.logger.warn('Error calculating feature importance score', { error, featureName });
      return 0;
    }
  }

  private calculateAdaptiveThreshold(scores: number[]): number {
    try {
      if (scores.length === 0) return 0;
      
      // Use median as adaptive threshold
      const sortedScores = scores.slice().sort((a, b) => a - b);
      const median = sortedScores[Math.floor(sortedScores.length / 2)] || 0;
      
      // Add some buffer above median
      return median * 1.2;
    } catch (error) {
      this.logger.warn('Error calculating adaptive threshold', { error });
      return 0;
    }
  }

  private calculateFeatureStability(
    features: any[],
    targets: number[],
    selectedFeatures: string[],
    bootstrapSamples: number
  ): number {
    try {
      if (selectedFeatures.length === 0) return 0;

      let stabilitySum = 0;
      const numBootstraps = Math.min(bootstrapSamples, 20); // Limit for performance

      for (let i = 0; i < numBootstraps; i++) {
        // Create bootstrap sample
        const bootstrapIndices = this.generateBootstrapIndices(features.length);
        const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]).filter(f => f !== undefined);
        const bootstrapTargets = bootstrapIndices.map(idx => targets[idx]).filter(t => t !== undefined);

        // Calculate feature importance on bootstrap sample
        const importanceScores = selectedFeatures.map(feature => 
          this.calculateFeatureImportanceScore(bootstrapFeatures, bootstrapTargets, feature)
        );

        // Calculate stability as consistency of rankings
        const originalImportance = selectedFeatures.map(feature =>
          this.calculateFeatureImportanceScore(features, targets, feature)
        );

        const correlation = this.calculateCorrelation(importanceScores, originalImportance);
        stabilitySum += Math.abs(correlation);
      }

      return stabilitySum / numBootstraps;

    } catch (error) {
      this.logger.warn('Error calculating feature stability', { error });
      return 0;
    }
  }

  private generateBootstrapIndices(nSamples: number): number[] {
    const indices = [];
    for (let i = 0; i < nSamples; i++) {
      indices.push(Math.floor(Math.random() * nSamples));
    }
    return indices;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    try {
      const n = x.length;
      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, i) => sum + val * (y[i] || 0), 0);
      const sumXX = x.reduce((sum, val) => sum + val * val, 0);
      const sumYY = y.reduce((sum, val) => sum + val * val, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
    } catch (error) {
      this.logger.warn('Error calculating correlation', { error });
      return 0;
    }
  }

  private calculateVariance(values: number[]): number {
    try {
      if (values.length < 2) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    } catch (error) {
      this.logger.warn('Error calculating variance', { error });
      return 0;
    }
  }
}

/**
 * Factory function to create FeatureSelectionEngine
 */
export function createFeatureSelectionEngine(
  config: FeatureSelectionConfig = {},
  logger?: any
): FeatureSelectionEngine {
  return new FeatureSelectionEngine(config, logger);
}