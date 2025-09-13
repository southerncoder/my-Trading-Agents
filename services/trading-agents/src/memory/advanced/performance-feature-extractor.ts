/**
 * Performance Feature Extractor
 *
 * Specialized class for extracting and processing performance-related features
 * from agent trading records for machine learning models.
 */

import { AgentPerformanceRecord } from './performance-learning-layer';

/**
 * Interface for extracted performance features
 */
export interface PerformanceFeatures {
  // Market context features
  market_regime: number;
  volatility: number;
  volume_ratio: number;

  // Performance features
  success_rate: number;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;

  // Decision quality features
  entry_timing: number;
  exit_timing: number;
  risk_management: number;
  pattern_recognition: number;

  // Learning features
  adaptation_speed: number;
  error_correction: number;
}

/**
 * Performance Feature Extractor for Advanced Memory System
 *
 * Extracts and processes performance-related features from agent trading records
 * for use in machine learning models and performance analysis.
 */
export class PerformanceFeatureExtractor {

  /**
   * Extract features from performance records
   */
  extractFeatures(records: AgentPerformanceRecord[]): PerformanceFeatures[] {
    const features: PerformanceFeatures[] = [];

    for (const record of records) {
      const feature: PerformanceFeatures = {
        // Market context features
        market_regime: this.encodeMarketRegime(record.market_conditions.market_regime),
        volatility: record.market_conditions.volatility,
        volume_ratio: record.market_conditions.volume_ratio,

        // Performance features
        success_rate: record.trading_metrics.success_rate,
        total_return: record.trading_metrics.total_return,
        sharpe_ratio: record.trading_metrics.sharpe_ratio,
        max_drawdown: record.trading_metrics.max_drawdown,

        // Decision quality features
        entry_timing: record.decision_quality.entry_timing_score,
        exit_timing: record.decision_quality.exit_timing_score,
        risk_management: record.decision_quality.risk_management_score,
        pattern_recognition: record.decision_quality.pattern_recognition_accuracy,

        // Learning features
        adaptation_speed: record.learning_metrics.adaptation_speed,
        error_correction: record.learning_metrics.error_correction_rate
      };

      features.push(feature);
    }

    return features;
  }

  /**
   * Extract numerical feature arrays for ML models
   */
  extractFeatureArrays(records: AgentPerformanceRecord[]): {
    features: number[][];
    featureNames: string[];
  } {
    const features = this.extractFeatures(records);
    const featureNames = [
      'market_regime',
      'volatility',
      'volume_ratio',
      'success_rate',
      'total_return',
      'sharpe_ratio',
      'max_drawdown',
      'entry_timing',
      'exit_timing',
      'risk_management',
      'pattern_recognition',
      'adaptation_speed',
      'error_correction'
    ];

    const featureArrays = features.map(feature =>
      featureNames.map(name => (feature as any)[name] || 0)
    );

    return {
      features: featureArrays,
      featureNames
    };
  }

  /**
   * Extract target values for supervised learning
   */
  extractTargetValues(records: AgentPerformanceRecord[], targetMetric: string = 'total_return'): number[] {
    return records.map(record => {
      switch (targetMetric) {
        case 'total_return':
          return record.trading_metrics.total_return;
        case 'success_rate':
          return record.trading_metrics.success_rate;
        case 'sharpe_ratio':
          return record.trading_metrics.sharpe_ratio;
        case 'max_drawdown':
          return -record.trading_metrics.max_drawdown; // Negative for minimization
        case 'win_loss_ratio':
          return record.trading_metrics.win_loss_ratio;
        default:
          return record.trading_metrics.total_return;
      }
    });
  }

  /**
   * Normalize features for ML models
   */
  normalizeFeatures(features: PerformanceFeatures[]): PerformanceFeatures[] {
    const normalized: PerformanceFeatures[] = [];

    // Calculate statistics for each feature
    const stats = this.calculateFeatureStatistics(features);

    for (const feature of features) {
      const normalizedFeature: PerformanceFeatures = { ...feature };

      // Normalize each numerical feature
      for (const [key, value] of Object.entries(feature)) {
        if (typeof value === 'number' && key !== 'market_regime') {
          const featureStats = stats[key as keyof typeof stats];
          if (featureStats && featureStats.std > 0) {
            (normalizedFeature as any)[key] = (value - featureStats.mean) / featureStats.std;
          }
        }
      }

      normalized.push(normalizedFeature);
    }

    return normalized;
  }

  /**
   * Calculate feature importance scores
   */
  calculateFeatureImportance(
    features: PerformanceFeatures[],
    targets: number[]
  ): Array<{ feature: string; importance: number }> {
    const importance: Array<{ feature: string; importance: number }> = [];
    const featureNames = Object.keys(features[0] || {});

    for (const featureName of featureNames) {
      const featureValues = features.map(f => (f as any)[featureName]).filter(v => typeof v === 'number');
      const correlation = this.calculateCorrelation(featureValues, targets);
      importance.push({
        feature: featureName,
        importance: Math.abs(correlation)
      });
    }

    return importance.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Select most important features
   */
  selectImportantFeatures(
    features: PerformanceFeatures[],
    targets: number[],
    maxFeatures: number = 10
  ): {
    selectedFeatures: PerformanceFeatures[];
    selectedFeatureNames: string[];
    importanceScores: Array<{ feature: string; importance: number }>;
  } {
    const importance = this.calculateFeatureImportance(features, targets);
    const selectedFeatureNames = importance.slice(0, maxFeatures).map(item => item.feature);

    const selectedFeatures = features.map(feature => {
      const selected: any = {};
      for (const name of selectedFeatureNames) {
        selected[name] = (feature as any)[name];
      }
      return selected as PerformanceFeatures;
    });

    return {
      selectedFeatures,
      selectedFeatureNames,
      importanceScores: importance
    };
  }

  /**
   * Encode market regime to numerical value
   */
  private encodeMarketRegime(regime: string): number {
    const encoding: Record<string, number> = {
      'bull': 1.0,
      'bear': -1.0,
      'sideways': 0.0,
      'volatile': 0.5,
      'unknown': 0.0
    };
    return encoding[regime.toLowerCase()] || 0.0;
  }

  /**
   * Calculate feature statistics for normalization
   */
  private calculateFeatureStatistics(features: PerformanceFeatures[]): Record<string, { mean: number; std: number }> {
    const stats: Record<string, { mean: number; std: number }> = {};
    const featureNames = Object.keys(features[0] || {});

    for (const featureName of featureNames) {
      if (featureName === 'market_regime') continue; // Skip categorical features

      const values = features.map(f => (f as any)[featureName]).filter(v => typeof v === 'number' && !isNaN(v));

      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);

        stats[featureName] = { mean, std };
      }
    }

    return stats;
  }

  /**
   * Calculate correlation between two arrays
   */
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
    } catch (_error) {
      // Log error without using console
      // Error will be handled by calling code
      return 0;
    }
  }

  /**
   * Validate feature extraction results
   */
  validateFeatures(features: PerformanceFeatures[]): {
    isValid: boolean;
    issues: string[];
    statistics: Record<string, { min: number; max: number; mean: number; missing: number }>;
  } {
    const issues: string[] = [];
    const statistics: Record<string, { min: number; max: number; mean: number; missing: number }> = {};

    if (features.length === 0) {
      issues.push('No features provided');
      return { isValid: false, issues, statistics };
    }

    const firstFeature = features[0];
    if (!firstFeature) {
      issues.push('First feature is undefined');
      return { isValid: false, issues, statistics };
    }

    const featureNames = Object.keys(firstFeature);

    for (const featureName of featureNames) {
      const values = features.map(f => (f as any)[featureName]);
      const numericalValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      const missing = values.length - numericalValues.length;

      if (numericalValues.length === 0) {
        issues.push(`Feature '${featureName}' has no valid numerical values`);
        continue;
      }

      const min = Math.min(...numericalValues);
      const max = Math.max(...numericalValues);
      const mean = numericalValues.reduce((sum, val) => sum + val, 0) / numericalValues.length;

      statistics[featureName] = { min, max, mean, missing };

      // Check for potential issues
      if (missing > 0) {
        issues.push(`Feature '${featureName}' has ${missing} missing values`);
      }

      if (min === max) {
        issues.push(`Feature '${featureName}' has no variance (constant value: ${min})`);
      }

      if (isNaN(mean)) {
        issues.push(`Feature '${featureName}' contains invalid values`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      statistics
    };
  }
}

/**
 * Factory function for creating PerformanceFeatureExtractor
 */
export function createPerformanceFeatureExtractor(): PerformanceFeatureExtractor {
  return new PerformanceFeatureExtractor();
}