/**
 * Ensemble Learning Engine for Advanced Memory System
 *
 * This module implements sophisticated ensemble learning techniques for robust
 * performance prediction and model combination. It provides methods for:
 * - Creating and managing ensemble models
 * - Weighted ensemble predictions
 * - Ensemble weight optimization
 * - Stacking ensemble methods
 * - Ensemble diversity analysis
 * - Online ensemble learning
 * - Ensemble model pruning and selection
 */

import { SimpleLinearRegression } from 'ml-regression';

/**
 * Interface for ensemble model configuration
 */
export interface EnsembleConfig {
  nModels?: number;
  modelWeights?: number[];
  diversityThreshold?: number;
  pruningThreshold?: number;
  onlineLearningRate?: number;
  stackingMetaModel?: 'linear' | 'ridge' | 'lasso';
}

/**
 * Interface for ensemble prediction result
 */
export interface EnsemblePrediction {
  prediction: number;
  confidence: number;
  modelContributions: Array<{
    modelIndex: number;
    prediction: number;
    weight: number;
    contribution: number;
  }>;
  ensembleMetrics: {
    diversity: number;
    stability: number;
    uncertainty: number;
  };
}

/**
 * Interface for ensemble diversity metrics
 */
export interface EnsembleDiversityMetrics {
  correlation_diversity: number;
  prediction_variance: number;
  bias_variance_decomposition: {
    bias: number;
    variance: number;
    error: number;
  };
  model_agreement: number;
  prediction_range: number;
}

/**
 * Ensemble Learning Engine
 * Handles creation, training, and prediction using ensemble methods
 */
export class EnsembleLearningEngine {
  private logger: any;
  private config: Required<EnsembleConfig>;

  constructor(
    config: EnsembleConfig = {},
    logger?: any
  ) {
    this.logger = logger || console;
    this.config = {
      nModels: config.nModels || 5,
      modelWeights: config.modelWeights || [],
      diversityThreshold: config.diversityThreshold || 0.1,
      pruningThreshold: config.pruningThreshold || 0.05,
      onlineLearningRate: config.onlineLearningRate || 0.01,
      stackingMetaModel: config.stackingMetaModel || 'linear'
    };
  }

  /**
   * Create an ensemble of regression models for robust performance prediction
   */
  createEnsembleModels(
    features: number[][],
    targets: number[],
    nModels?: number
  ): any[] {
    try {
      const numModels = nModels || this.config.nModels;
      const models = [];

      for (let i = 0; i < numModels; i++) {
        // Create bootstrap sample
        const bootstrapIndices = this.generateBootstrapIndices(features.length);
        const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]).filter(f => f !== undefined) as number[][];
        const bootstrapTargets = bootstrapIndices.map(idx => targets[idx]).filter(t => t !== undefined);

        // Train model on bootstrap sample
        const model = this.trainBaseModel(bootstrapFeatures, bootstrapTargets);
        if (model) {
          models.push(model);
        }
      }

      this.logger.info('Ensemble models created', {
        component: 'EnsembleLearningEngine',
        nModels: models.length,
        dataSize: features.length
      });

      return models;
    } catch (error) {
      this.logger.warn('Failed to create ensemble models', { error });
      return [];
    }
  }

  /**
   * Make ensemble predictions using weighted averaging
   */
  makeEnsemblePredictions(
    models: any[],
    features: number[][],
    modelWeights?: number[]
  ): EnsemblePrediction[] {
    try {
      if (models.length === 0) {
        return features.map(() => ({
          prediction: 0,
          confidence: 0,
          modelContributions: [],
          ensembleMetrics: {
            diversity: 0,
            stability: 0,
            uncertainty: 0
          }
        }));
      }

      const nSamples = features.length;
      const predictions: EnsemblePrediction[] = [];
      const weights = modelWeights || this.config.modelWeights;

      // Get predictions from each model
      const allModelPredictions = models.map(model =>
        this.getModelPredictions(model, features)
      );

      for (let i = 0; i < nSamples; i++) {
        const samplePredictions = allModelPredictions.map(modelPreds => modelPreds[i]).filter(p => p !== undefined);
        const sampleWeights = weights.length > 0 ? weights.slice(0, samplePredictions.length) :
                             new Array(samplePredictions.length).fill(1 / samplePredictions.length);

        // Calculate weighted average prediction
        let weightedSum = 0;
        let totalWeight = 0;
        const contributions: Array<{
          modelIndex: number;
          prediction: number;
          weight: number;
          contribution: number;
        }> = [];

        for (let j = 0; j < samplePredictions.length; j++) {
          const prediction = samplePredictions[j];
          const weight = sampleWeights[j];
          const contribution = prediction * weight;

          weightedSum += contribution;
          totalWeight += weight;

          contributions.push({
            modelIndex: j,
            prediction,
            weight,
            contribution
          });
        }

        const finalPrediction = totalWeight > 0 ? weightedSum / totalWeight : 0;

        // Calculate confidence and metrics
        const confidence = this.calculatePredictionConfidence(samplePredictions, finalPrediction);
        const diversity = this.calculateSampleDiversity(samplePredictions);
        const stability = this.calculateSampleStability(samplePredictions);
        const uncertainty = this.calculatePredictionUncertainty(samplePredictions);

        predictions.push({
          prediction: finalPrediction,
          confidence,
          modelContributions: contributions,
          ensembleMetrics: {
            diversity,
            stability,
            uncertainty
          }
        });
      }

      return predictions;
    } catch (error) {
      this.logger.warn('Failed to make ensemble predictions', { error });
      return features.map(() => ({
        prediction: 0,
        confidence: 0,
        modelContributions: [],
        ensembleMetrics: {
          diversity: 0,
          stability: 0,
          uncertainty: 0
        }
      }));
    }
  }

  /**
   * Calculate weights for ensemble models based on their performance
   */
  calculateEnsembleWeights(
    models: any[],
    validationFeatures: number[][],
    validationTargets: number[]
  ): number[] {
    try {
      const weights = [];
      const performances = [];

      // Calculate performance for each model
      for (const model of models) {
        const predictions = this.getModelPredictions(model, validationFeatures);
        const performance = this.calculateModelPerformance(predictions, validationTargets);
        performances.push(performance);
      }

      // Convert performances to weights using softmax
      const maxPerformance = Math.max(...performances);
      const expPerformances = performances.map(p => Math.exp(p - maxPerformance));
      const sumExp = expPerformances.reduce((sum, val) => sum + val, 0);

      for (const expPerf of expPerformances) {
        weights.push(expPerf / sumExp);
      }

      return weights;
    } catch (error) {
      this.logger.warn('Failed to calculate ensemble weights', { error });
      return new Array(models.length).fill(1 / models.length);
    }
  }

  /**
   * Implement stacking ensemble method
   */
  createStackingEnsemble(
    baseModels: any[],
    features: number[][],
    targets: number[],
    validationSplit: number = 0.2
  ): {
    baseModels: any[];
    metaModel: any;
    validationFeatures: number[][];
    validationTargets: number[];
  } {
    try {
      const nSamples = features.length;
      const validationSize = Math.floor(nSamples * validationSplit);
      const trainSize = nSamples - validationSize;

      // Split data
      const trainFeatures = features.slice(0, trainSize);
      const trainTargets = targets.slice(0, trainSize);
      const validationFeatures = features.slice(trainSize);
      const validationTargets = targets.slice(trainSize);

      // Get base model predictions for training meta-model
      const metaFeatures = [];
      for (const model of baseModels) {
        const predictions = this.getModelPredictions(model, trainFeatures);
        metaFeatures.push(predictions);
      }

      // Transpose to get meta-features matrix and filter out undefined values
      const metaFeaturesMatrix: number[][] = [];
      for (let i = 0; i < trainSize; i++) {
        const row: number[] = [];
        for (const predictions of metaFeatures) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            row.push(prediction);
          }
        }
        if (row.length > 0) {
          metaFeaturesMatrix.push(row);
        }
      }

      // Train meta-model
      const trainedMetaModel = this.trainMetaModel(metaFeaturesMatrix, trainTargets);

      return {
        baseModels,
        metaModel: trainedMetaModel,
        validationFeatures,
        validationTargets
      };
    } catch (error) {
      this.logger.warn('Failed to create stacking ensemble', { error });
      return {
        baseModels: [],
        metaModel: null,
        validationFeatures: [],
        validationTargets: []
      };
    }
  }

  /**
   * Make predictions using stacking ensemble
   */
  makeStackingPredictions(
    stackingEnsemble: any,
    features: number[][]
  ): number[] {
    try {
      if (!stackingEnsemble || !stackingEnsemble.metaModel) {
        return new Array(features.length).fill(0);
      }

      // Get base model predictions
      const metaFeatures = [];
      for (const model of stackingEnsemble.baseModels) {
        const predictions = this.getModelPredictions(model, features);
        metaFeatures.push(predictions);
      }

      // Transpose to get meta-features matrix and filter out undefined values
      const metaFeaturesMatrix: number[][] = [];
      for (let i = 0; i < features.length; i++) {
        const row: number[] = [];
        for (const predictions of metaFeatures) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            row.push(prediction);
          }
        }
        if (row.length > 0) {
          metaFeaturesMatrix.push(row);
        }
      }

      // Make final predictions using meta-model
      return this.getModelPredictions(stackingEnsemble.metaModel, metaFeaturesMatrix);
    } catch (error) {
      this.logger.warn('Failed to make stacking predictions', { error });
      return new Array(features.length).fill(0);
    }
  }

  /**
   * Calculate ensemble diversity metrics
   */
  calculateEnsembleDiversity(
    models: any[],
    features: number[][],
    targets: number[]
  ): EnsembleDiversityMetrics {
    try {
      // Get predictions from all models
      const allPredictions = models.map(model => this.getModelPredictions(model, features));

      // Calculate average predictions
      const avgPredictions = new Array(features.length).fill(0);
      for (let i = 0; i < features.length; i++) {
        let sum = 0;
        let count = 0;
        for (const predictions of allPredictions) {
          const prediction = predictions[i];
          if (prediction !== undefined) {
            sum += prediction;
            count++;
          }
        }
        avgPredictions[i] = count > 0 ? sum / count : 0;
      }

      // Calculate correlation diversity
      let totalCorrelation = 0;
      let pairCount = 0;
      for (let i = 0; i < allPredictions.length; i++) {
        for (let j = i + 1; j < allPredictions.length; j++) {
          const correlation = this.calculateCorrelation(allPredictions[i], allPredictions[j]);
          totalCorrelation += Math.abs(correlation);
          pairCount++;
        }
      }
      const correlationDiversity = pairCount > 0 ? 1 - (totalCorrelation / pairCount) : 0;

      // Calculate prediction variance
      let totalVariance = 0;
      for (let i = 0; i < features.length; i++) {
        const predictions = allPredictions.map(pred => pred[i]).filter(p => p !== undefined);
        const variance = this.calculateVariance(predictions);
        totalVariance += variance;
      }
      const predictionVariance = totalVariance / features.length;

      // Bias-variance decomposition
      const biasVariance = this.calculateBiasVarianceDecomposition(avgPredictions, targets, allPredictions);

      // Model agreement (percentage of predictions within 10% of each other)
      const modelAgreement = this.calculateModelAgreement(allPredictions);

      // Prediction range (standard deviation of predictions)
      const predictionRange = Math.sqrt(predictionVariance);

      return {
        correlation_diversity: correlationDiversity,
        prediction_variance: predictionVariance,
        bias_variance_decomposition: biasVariance,
        model_agreement: modelAgreement,
        prediction_range: predictionRange
      };
    } catch (error) {
      this.logger.warn('Failed to calculate ensemble diversity', { error });
      return {
        correlation_diversity: 0,
        prediction_variance: 0,
        bias_variance_decomposition: {
          bias: 0,
          variance: 0,
          error: 0
        },
        model_agreement: 0,
        prediction_range: 0
      };
    }
  }

  /**
   * Perform ensemble model selection and pruning
   */
  performEnsemblePruning(
    models: any[],
    features: number[][],
    targets: number[],
    maxModels: number = 10
  ): any[] {
    try {
      if (models.length <= maxModels) return models;

      // Calculate individual model performances
      const modelPerformances = models.map((model, index) => ({
        index,
        performance: this.calculateModelPerformance(
          this.getModelPredictions(model, features),
          targets
        )
      }));

      // Sort by performance and select top models
      modelPerformances.sort((a, b) => b.performance - a.performance);
      const selectedIndices = modelPerformances.slice(0, maxModels).map(item => item.index);

      return selectedIndices.map(index => models[index]);
    } catch (error) {
      this.logger.warn('Failed to perform ensemble pruning', { error });
      return models.slice(0, maxModels);
    }
  }

  /**
   * Implement online ensemble learning for real-time adaptation
   */
  updateEnsembleOnline(
    ensemble: any,
    newFeatures: number[][],
    newTargets: number[],
    learningRate?: number
  ): any {
    try {
      const rate = learningRate || this.config.onlineLearningRate;

      // Update base models with new data
      const updatedModels = ensemble.models.map((model: any) =>
        this.updateModelOnline(model, newFeatures, newTargets, rate)
      );

      // Update ensemble weights
      const updatedWeights = this.updateEnsembleWeightsOnline(
        ensemble.weights,
        updatedModels,
        newFeatures,
        newTargets
      );

      return {
        models: updatedModels,
        weights: updatedWeights,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.warn('Failed to update ensemble online', { error });
      return ensemble;
    }
  }

  // Private helper methods

  private generateBootstrapIndices(nSamples: number): number[] {
    const indices = [];
    for (let i = 0; i < nSamples; i++) {
      indices.push(Math.floor(Math.random() * nSamples));
    }
    return indices;
  }

  private trainBaseModel(features: number[][], targets: number[]): any {
    try {
      // Use SimpleLinearRegression as base model
      return new (SimpleLinearRegression as any)(features, targets);
    } catch (error) {
      this.logger.warn('Failed to train base model', { error });
      return null;
    }
  }

  private getModelPredictions(model: any, features: number[][]): number[] {
    try {
      if (!model) return new Array(features.length).fill(0);
      return model.predict(features);
    } catch (error) {
      this.logger.warn('Failed to get model predictions', { error });
      return new Array(features.length).fill(0);
    }
  }

  private calculateModelPerformance(predictions: number[], targets: number[]): number {
    try {
      return this.calculateRSquared(targets, predictions);
    } catch (_error) {
      return 0;
    }
  }

  private trainMetaModel(features: number[][], targets: number[]): any {
    try {
      // Use SimpleLinearRegression as meta-model
      return new (SimpleLinearRegression as any)(features, targets);
    } catch (error) {
      this.logger.warn('Failed to train meta-model', { error });
      return null;
    }
  }

  private calculateBiasVarianceDecomposition(
    avgPredictions: number[],
    targets: number[],
    allPredictions: number[][]
  ): { bias: number; variance: number; error: number } {
    try {
      const nSamples = targets.length;
      let totalBias = 0;
      let totalVariance = 0;
      let totalError = 0;

      for (let i = 0; i < nSamples; i++) {
        const target = targets[i];
        const avgPred = avgPredictions[i];
        const individualPreds = allPredictions.map(pred => pred[i]);

        // Bias: squared difference between average prediction and target
        totalBias += Math.pow(avgPred - target, 2);

        // Variance: average squared difference between individual predictions and average prediction
        const variance = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - avgPred, 2), 0) / individualPreds.length;
        totalVariance += variance;

        // Total error: average squared difference between individual predictions and target
        const error = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - target, 2), 0) / individualPreds.length;
        totalError += error;
      }

      return {
        bias: totalBias / nSamples,
        variance: totalVariance / nSamples,
        error: totalError / nSamples
      };
    } catch (error) {
      this.logger.warn('Failed to calculate bias-variance decomposition', { error });
      return { bias: 0, variance: 0, error: 0 };
    }
  }

  private updateModelOnline(
    model: any,
    newFeatures: number[][],
    newTargets: number[],
    _learningRate: number
  ): any {
    try {
      // Simplified online update - in practice, this would depend on the specific model type
      // For now, retrain with combined data (not truly online)
      const existingFeatures = model.trainingFeatures || [];
      const existingTargets = model.trainingTargets || [];

      const combinedFeatures = [...existingFeatures, ...newFeatures];
      const combinedTargets = [...existingTargets, ...newTargets];

      return this.trainBaseModel(combinedFeatures, combinedTargets);
    } catch (error) {
      this.logger.warn('Failed to update model online', { error });
      return model;
    }
  }

  private updateEnsembleWeightsOnline(
    currentWeights: number[],
    models: any[],
    newFeatures: number[][],
    newTargets: number[]
  ): number[] {
    try {
      // Calculate new weights based on recent performance
      const recentPerformances = models.map(model => {
        const predictions = this.getModelPredictions(model, newFeatures);
        return this.calculateModelPerformance(predictions, newTargets);
      });

      // Update weights using exponential moving average
      const alpha = this.config.onlineLearningRate;
      const updatedWeights = currentWeights.map((weight, i) =>
        alpha * recentPerformances[i] + (1 - alpha) * weight
      );

      // Normalize weights
      const sum = updatedWeights.reduce((s, w) => s + w, 0);
      return updatedWeights.map(w => w / sum);
    } catch (error) {
      this.logger.warn('Failed to update ensemble weights online', { error });
      return currentWeights;
    }
  }

  private calculatePredictionConfidence(predictions: number[], ensemblePrediction: number): number {
    try {
      if (predictions.length === 0) return 0;

      // Calculate standard deviation of predictions
      const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
      const std = Math.sqrt(variance);

      // Confidence based on agreement (lower std = higher confidence)
      const agreement = Math.max(0, 1 - std / Math.abs(ensemblePrediction + 1));

      return Math.min(1, agreement);
    } catch (_error) {
      return 0;
    }
  }

  private calculateSampleDiversity(predictions: number[]): number {
    try {
      if (predictions.length < 2) return 0;

      // Calculate coefficient of variation as diversity measure
      const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
      const std = Math.sqrt(variance);

      return mean !== 0 ? std / Math.abs(mean) : 0;
    } catch (_error) {
      return 0;
    }
  }

  private calculateSampleStability(predictions: number[]): number {
    try {
      if (predictions.length < 2) return 0;

      // Stability as inverse of variance
      const variance = this.calculateVariance(predictions);
      return Math.max(0, 1 / (1 + variance));
    } catch (_error) {
      return 0;
    }
  }

  private calculatePredictionUncertainty(predictions: number[]): number {
    try {
      if (predictions.length < 2) return 1;

      // Uncertainty as coefficient of variation
      const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
      const std = Math.sqrt(variance);

      return mean !== 0 ? std / Math.abs(mean) : 1;
    } catch (_error) {
      return 1;
    }
  }

  private calculateModelAgreement(allPredictions: number[][]): number {
    try {
      if (allPredictions.length < 2) return 1;

      let totalAgreement = 0;
      let totalComparisons = 0;

      for (let i = 0; i < allPredictions.length; i++) {
        for (let j = i + 1; j < allPredictions.length; j++) {
          for (let k = 0; k < allPredictions[i].length; k++) {
            const pred1 = allPredictions[i][k];
            const pred2 = allPredictions[j][k];

            if (pred1 !== undefined && pred2 !== undefined) {
              const diff = Math.abs(pred1 - pred2);
              const avg = (Math.abs(pred1) + Math.abs(pred2)) / 2;

              // Agreement if predictions are within 10% of each other
              const agreement = avg > 0 ? (diff / avg <= 0.1 ? 1 : 0) : 1;
              totalAgreement += agreement;
              totalComparisons++;
            }
          }
        }
      }

      return totalComparisons > 0 ? totalAgreement / totalComparisons : 1;
    } catch (_error) {
      return 0;
    }
  }

  private calculateRSquared(targets: number[], predictions: number[]): number {
    try {
      const n = targets.length;
      if (n === 0) return 0;

      const targetMean = targets.reduce((sum, val) => sum + val, 0) / n;
      const totalSumSquares = targets.reduce((sum, val) => sum + Math.pow(val - targetMean, 2), 0);
      const residuals = targets.map((target, i) => target - (predictions[i] || 0));
      const residualSumSquares = residuals.reduce((sum, residual) => sum + residual * residual, 0);

      return totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    } catch (_error) {
      return 0;
    }
  }

  private calculateVariance(values: number[]): number {
    try {
      if (values.length < 2) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    } catch (_error) {
      return 0;
    }
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
    } catch (_error) {
      return 0;
    }
  }
}

/**
 * Factory function to create EnsembleLearningEngine
 */
export function createEnsembleLearningEngine(
  config: EnsembleConfig = {},
  logger?: any
): EnsembleLearningEngine {
  return new EnsembleLearningEngine(config, logger);
}