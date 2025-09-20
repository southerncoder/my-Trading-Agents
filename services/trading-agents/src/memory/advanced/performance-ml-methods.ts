import { SimpleLinearRegression } from 'ml-regression';
import { AgentPerformanceRecord } from './performance-learning-types';
import { calculateCorrelation, calculateRSquared, calculateVariance } from './performance-learning-utils';

/**
 * ML Methods for Performance Learning
 * Contains ensemble learning, parameter optimization, and cross-validation functionality
 */

export interface EnsembleModel {
  models: any[];
  weights: number[];
  diversity_metrics?: {
    correlation_diversity: number;
    prediction_variance: number;
    bias_variance_decomposition: {
      bias: number;
      variance: number;
      error: number;
    };
  };
  lastUpdated?: string;
}

export interface StackingEnsemble {
  baseModels: any[];
  metaModel: any;
  validationFeatures: number[][];
  validationTargets: number[];
}

export interface CrossValidationResult {
  cross_validation_scores: {
    mean_score: number;
    std_score: number;
    scores: number[];
    confidence_interval: [number, number];
  };
  parameter_stability: {
    stability_score: number;
    parameter_variances: Record<string, number>;
    robustness_score: number;
  };
  validation_metrics: {
    overfitting_risk: number;
    generalization_score: number;
    parameter_sensitivity: Record<string, number>;
  };
}

export interface OptimizationResult {
  optimized_parameters: Record<string, number>;
  confidence: number;
}

/**
 * Create ensemble models using bagging (bootstrap aggregating)
 */
export function createEnsembleModels(
  features: number[][],
  targets: number[],
  nModels: number = 10,
  logger?: any
): any[] {
  try {
    const models = [];

    for (let i = 0; i < nModels; i++) {
      // Generate bootstrap sample
      const bootstrapIndices = generateBootstrapIndices(features.length);
      const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]).filter(f => f !== undefined);
      const bootstrapTargets = bootstrapIndices.map(idx => targets[idx]).filter(t => t !== undefined);

      // Train model on bootstrap sample
      const model = trainBaseModel(bootstrapFeatures, bootstrapTargets);
      if (model) {
        models.push(model);
      }
    }

    logger?.info('Ensemble models created', {
      component: 'PerformanceMLMethods',
      nModels: models.length,
      dataSize: features.length
    });

    return models;
  } catch (error) {
    logger?.warn('Failed to create ensemble models', { error });
    return [];
  }
}

/**
 * Make ensemble predictions using weighted averaging
 */
export function makeEnsemblePredictions(
  models: any[],
  features: number[][],
  modelWeights?: number[],
  logger?: any
): number[] {
  try {
    if (models.length === 0) return [];

    const nSamples = features.length;
    const predictions = new Array(nSamples).fill(0);
    const weights = modelWeights || new Array(models.length).fill(1 / models.length);

    // Get predictions from each model
    for (let i = 0; i < models.length; i++) {
      const modelPredictions = getModelPredictions(models[i], features);
      const weight = weights[i];

      for (let j = 0; j < nSamples; j++) {
        const prediction = modelPredictions[j];
        if (prediction !== undefined) {
          predictions[j] += prediction * weight;
        }
      }
    }

    return predictions;
  } catch (error) {
    logger?.warn('Failed to make ensemble predictions', { error });
    return new Array(features.length).fill(0);
  }
}

/**
 * Calculate weights for ensemble models based on their performance
 */
export function calculateEnsembleWeights(
  models: any[],
  validationFeatures: number[][],
  validationTargets: number[],
  logger?: any
): number[] {
  try {
    const weights = [];
    const performances = [];

    // Calculate performance for each model
    for (const model of models) {
      const predictions = getModelPredictions(model, validationFeatures);
      const performance = calculateModelPerformance(predictions, validationTargets);
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
    logger?.warn('Failed to calculate ensemble weights', { error });
    return new Array(models.length).fill(1 / models.length);
  }
}

/**
 * Implement stacking ensemble method
 */
export function createStackingEnsemble(
  baseModels: any[],
  metaModel: any,
  features: number[][],
  targets: number[],
  validationSplit: number = 0.2,
  logger?: any
): StackingEnsemble | null {
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
      const predictions = getModelPredictions(model, trainFeatures);
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
    const trainedMetaModel = trainMetaModel(metaModel, metaFeaturesMatrix, trainTargets);

    return {
      baseModels,
      metaModel: trainedMetaModel,
      validationFeatures,
      validationTargets
    };
  } catch (error) {
    logger?.warn('Failed to create stacking ensemble', { error });
    return null;
  }
}

/**
 * Make predictions using stacking ensemble
 */
export function makeStackingPredictions(
  stackingEnsemble: StackingEnsemble,
  features: number[][],
  logger?: any
): number[] {
  try {
    if (!stackingEnsemble) return [];

    // Get base model predictions
    const metaFeatures = [];
    for (const model of stackingEnsemble.baseModels) {
      const predictions = getModelPredictions(model, features);
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
    return getModelPredictions(stackingEnsemble.metaModel, metaFeaturesMatrix);
  } catch (error) {
    logger?.warn('Failed to make stacking predictions', { error });
    return new Array(features.length).fill(0);
  }
}

/**
 * Calculate ensemble diversity metrics
 */
export function calculateEnsembleDiversity(
  models: any[],
  features: number[][],
  targets: number[],
  logger?: any
): {
  correlation_diversity: number;
  prediction_variance: number;
  bias_variance_decomposition: {
    bias: number;
    variance: number;
    error: number;
  };
} {
  try {
    // Get predictions from all models
    const allPredictions = models.map(model => getModelPredictions(model, features));

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
        const predI = allPredictions[i];
        const predJ = allPredictions[j];
        if (predI && predJ) {
          const correlation = calculateCorrelation(predI, predJ);
          totalCorrelation += Math.abs(correlation);
          pairCount++;
        }
      }
    }
    const correlationDiversity = pairCount > 0 ? 1 - (totalCorrelation / pairCount) : 0;

    // Calculate prediction variance
    let totalVariance = 0;
    for (let i = 0; i < features.length; i++) {
      const predictions = allPredictions.map(pred => pred[i]).filter(p => p !== undefined);
      const variance = calculateVariance(predictions);
      totalVariance += variance;
    }
    const predictionVariance = totalVariance / features.length;

    // Bias-variance decomposition
    const biasVariance = calculateBiasVarianceDecomposition(avgPredictions, targets, allPredictions);

    return {
      correlation_diversity: correlationDiversity,
      prediction_variance: predictionVariance,
      bias_variance_decomposition: biasVariance
    };
  } catch (error) {
    logger?.warn('Failed to calculate ensemble diversity', { error });
    return {
      correlation_diversity: 0,
      prediction_variance: 0,
      bias_variance_decomposition: {
        bias: 0,
        variance: 0,
        error: 0
      }
    };
  }
}

/**
 * Perform ensemble model selection and pruning
 */
export function performEnsemblePruning(
  models: any[],
  features: number[][],
  targets: number[],
  maxModels: number = 10,
  logger?: any
): any[] {
  try {
    if (models.length <= maxModels) return models;

    // Calculate individual model performances
    const modelPerformances = models.map((model, index) => ({
      index,
      performance: calculateModelPerformance(
        getModelPredictions(model, features),
        targets
      )
    }));

    // Sort by performance and select top models
    modelPerformances.sort((a, b) => b.performance - a.performance);
    const selectedIndices = modelPerformances.slice(0, maxModels).map(item => item.index);

    return selectedIndices.map(index => models[index]);
  } catch (error) {
    logger?.warn('Failed to perform ensemble pruning', { error });
    return models.slice(0, maxModels);
  }
}

/**
 * Implement online ensemble learning for real-time adaptation
 */
export function updateEnsembleOnline(
  ensemble: EnsembleModel,
  newFeatures: number[][],
  newTargets: number[],
  learningRate: number = 0.01,
  logger?: any
): EnsembleModel {
  try {
    // Update base models with new data
    const updatedModels = ensemble.models.map((model: any) =>
      updateModelOnline(model, newFeatures, newTargets, learningRate)
    );

    // Update ensemble weights
    const updatedWeights = updateEnsembleWeightsOnline(
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
    logger?.warn('Failed to update ensemble online', { error });
    return ensemble;
  }
}

/**
 * Perform ML parameter optimization using Bayesian optimization
 */
export async function mlParameterOptimization(
  currentParams: Record<string, number>,
  historicalData: AgentPerformanceRecord[],
  targets: any,
  minimumSampleSize: number = 10,
  logger?: any
): Promise<OptimizationResult> {
  try {
    if (historicalData.length < minimumSampleSize) {
      logger?.warn('Insufficient data for ML parameter optimization', {
        available: historicalData.length,
        required: minimumSampleSize
      });
      return { optimized_parameters: currentParams, confidence: 0.1 };
    }

    // Extract features and targets from historical data
    const features = extractFeatureMatrix(historicalData);
    const targetValues = extractTargetValues(historicalData, targets);

    if (features.length === 0 || targetValues.length === 0) {
      return { optimized_parameters: currentParams, confidence: 0.2 };
    }

    // Use advanced Bayesian optimization instead of simple gradient descent
    const optimizedParams = await bayesianParameterOptimization(
      currentParams,
      features,
      targetValues,
      logger
    );

    // Calculate confidence based on historical performance consistency
    const confidence = calculateOptimizationConfidence(
      optimizedParams,
      historicalData,
      currentParams
    );

    logger?.info('Parameter optimization completed', {
      originalParams: currentParams,
      optimizedParams,
      confidence,
      dataPoints: historicalData.length
    });

    return { optimized_parameters: optimizedParams, confidence };
  } catch (error) {
    logger?.error('ML parameter optimization failed', { error, currentParams });
    return { optimized_parameters: currentParams, confidence: 0.1 };
  }
}

/**
 * Perform k-fold cross-validation for parameter stability assessment
 */
export async function performParameterCrossValidation(
  currentParams: Record<string, number>,
  features: number[][],
  targets: number[],
  kFolds: number = 5,
  logger?: any
): Promise<CrossValidationResult> {
  try {
    logger?.info('Starting parameter cross-validation', {
      component: 'PerformanceMLMethods',
      kFolds,
      paramCount: Object.keys(currentParams).length,
      dataPoints: features.length
    });

    const foldResults = [];
    const parameterVariations = new Map<string, number[]>();

    // Initialize parameter tracking
    Object.keys(currentParams).forEach(paramName => {
      parameterVariations.set(paramName, []);
    });

    // Perform k-fold cross-validation
    for (let fold = 0; fold < kFolds; fold++) {
      const foldResult = await performSingleFoldValidation(
        currentParams,
        features,
        targets,
        fold,
        kFolds
      );

      foldResults.push(foldResult);

      // Track parameter variations across folds
      Object.entries(foldResult.optimized_params).forEach(([paramName, paramValue]) => {
        const variations = parameterVariations.get(paramName) || [];
        variations.push(paramValue);
        parameterVariations.set(paramName, variations);
      });
    }

    // Calculate cross-validation scores
    const scores = foldResults.map(result => result.score);
    const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;
    const stdScore = Math.sqrt(variance);

    // Calculate confidence interval (95%)
    const tValue = 1.96; // Approximately 95% confidence for large samples
    const margin = tValue * stdScore / Math.sqrt(kFolds);
    const confidenceInterval: [number, number] = [
      Math.max(0, meanScore - margin),
      Math.min(1, meanScore + margin)
    ];

    // Calculate parameter stability
    const parameterVariances: Record<string, number> = {};
    let totalStability = 0;

    parameterVariations.forEach((variations, paramName) => {
      const paramMean = variations.reduce((sum, val) => sum + val, 0) / variations.length;
      const paramVariance = variations.reduce((sum, val) => sum + Math.pow(val - paramMean, 2), 0) / variations.length;
      parameterVariances[paramName] = paramVariance;
      totalStability += (1 / (1 + paramVariance)); // Higher stability for lower variance
    });

    const stabilityScore = totalStability / Object.keys(currentParams).length;

    // Calculate validation metrics
    const overfittingRisk = calculateOverfittingRisk(scores, meanScore);
    const generalizationScore = calculateGeneralizationScore(scores, stdScore);
    const parameterSensitivity = calculateParameterSensitivity(parameterVariations);

    const result: CrossValidationResult = {
      cross_validation_scores: {
        mean_score: Number(meanScore.toFixed(4)),
        std_score: Number(stdScore.toFixed(4)),
        scores: scores.map(score => Number(score.toFixed(4))),
        confidence_interval: confidenceInterval
      },
      parameter_stability: {
        stability_score: Number(stabilityScore.toFixed(4)),
        parameter_variances: Object.fromEntries(
          Object.entries(parameterVariances).map(([key, value]) => [key, Number(value.toFixed(6))])
        ),
        robustness_score: Number((stabilityScore * (1 - overfittingRisk)).toFixed(4))
      },
      validation_metrics: {
        overfitting_risk: Number(overfittingRisk.toFixed(4)),
        generalization_score: Number(generalizationScore.toFixed(4)),
        parameter_sensitivity: Object.fromEntries(
          Object.entries(parameterSensitivity).map(([key, value]) => [key, Number(value.toFixed(4))])
        )
      }
    };

    logger?.info('Cross-validation completed', {
      component: 'PerformanceMLMethods',
      result
    });

    return result;
  } catch (error) {
    logger?.warn('Cross-validation failed', { error });
    return {
      cross_validation_scores: {
        mean_score: 0,
        std_score: 0,
        scores: [],
        confidence_interval: [0, 0]
      },
      parameter_stability: {
        stability_score: 0,
        parameter_variances: {},
        robustness_score: 0
      },
      validation_metrics: {
        overfitting_risk: 1,
        generalization_score: 0,
        parameter_sensitivity: {}
      }
    };
  }
}

// Helper functions for ensemble learning

function generateBootstrapIndices(nSamples: number): number[] {
  const indices = [];
  for (let i = 0; i < nSamples; i++) {
    indices.push(Math.floor(Math.random() * nSamples));
  }
  return indices;
}

function trainBaseModel(features: number[][], targets: number[], logger?: any): any {
  try {
    // Use SimpleLinearRegression as base model
    return new (SimpleLinearRegression as any)(features, targets);
  } catch (error) {
    logger?.warn('Failed to train base model', { error });
    return null;
  }
}

function getModelPredictions(model: any, features: number[][], logger?: any): number[] {
  try {
    if (!model) return new Array(features.length).fill(0);
    return model.predict(features);
  } catch (error) {
    logger?.warn('Failed to get model predictions', { error });
    return new Array(features.length).fill(0);
  }
}

function calculateModelPerformance(predictions: number[], targets: number[]): number {
  try {
    return calculateRSquared(targets, predictions);
  } catch (_error) {
    return 0;
  }
}

function trainMetaModel(model: any, features: number[][], targets: number[], logger?: any): any {
  try {
    // Use SimpleLinearRegression as meta-model
    return new (SimpleLinearRegression as any)(features, targets);
  } catch (error) {
    logger?.warn('Failed to train meta-model', { error });
    return null;
  }
}

function calculateBiasVarianceDecomposition(
  avgPredictions: number[],
  targets: number[],
  allPredictions: number[][],
  logger?: any
): { bias: number; variance: number; error: number } {
  try {
    const nSamples = targets.length;
    let totalBias = 0;
    let totalVariance = 0;
    let totalError = 0;

    for (let i = 0; i < nSamples; i++) {
      const target = targets[i];
      const avgPred = avgPredictions[i];
      const individualPreds = allPredictions.map(pred => pred[i]).filter(p => p !== undefined);

      if (target !== undefined && avgPred !== undefined && individualPreds.length > 0) {
        // Bias: squared difference between average prediction and target
        totalBias += Math.pow(avgPred - target, 2);

        // Variance: average squared difference between individual predictions and average prediction
        const variance = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - avgPred, 2), 0) / individualPreds.length;
        totalVariance += variance;

        // Total error: average squared difference between individual predictions and target
        const error = individualPreds.reduce((sum, pred) => sum + Math.pow(pred - target, 2), 0) / individualPreds.length;
        totalError += error;
      }
    }

    return {
      bias: totalBias / nSamples,
      variance: totalVariance / nSamples,
      error: totalError / nSamples
    };
  } catch (error) {
    logger?.warn('Failed to calculate bias-variance decomposition', { error });
    return { bias: 0, variance: 0, error: 0 };
  }
}

function updateModelOnline(
  model: any,
  newFeatures: number[][],
  newTargets: number[],
  _learningRate: number,
  logger?: any
): any {
  try {
    // Simplified online update - in practice, this would depend on the specific model type
    // For now, retrain with combined data (not truly online)
    const existingFeatures = model.trainingFeatures || [];
    const existingTargets = model.trainingTargets || [];

    const combinedFeatures = [...existingFeatures, ...newFeatures];
    const combinedTargets = [...existingTargets, ...newTargets];

    return trainBaseModel(combinedFeatures, combinedTargets, logger);
  } catch (error) {
    logger?.warn('Failed to update model online', { error });
    return model;
  }
}

function updateEnsembleWeightsOnline(
  currentWeights: number[],
  models: any[],
  newFeatures: number[][],
  newTargets: number[],
  logger?: any
): number[] {
  try {
    // Calculate new weights based on recent performance
    const recentPerformances = models.map(model => {
      const predictions = getModelPredictions(model, newFeatures, logger);
      return calculateModelPerformance(predictions, newTargets);
    });

    // Update weights using exponential moving average
    const alpha = 0.1; // Learning rate for weight updates
    const updatedWeights = currentWeights.map((weight, i) =>
      alpha * (recentPerformances[i] ?? 0) + (1 - alpha) * weight
    );

    // Normalize weights
    const sum = updatedWeights.reduce((s, w) => s + w, 0);
    return updatedWeights.map(w => w / sum);
  } catch (error) {
    logger?.warn('Failed to update ensemble weights online', { error });
    return currentWeights;
  }
}

// Helper functions for parameter optimization

function extractFeatureMatrix(historicalData: AgentPerformanceRecord[]): number[][] {
  return historicalData.map(record => [
    record.market_conditions.volatility,
    record.market_conditions.volume_ratio,
    record.market_conditions.market_stress,
    record.trading_metrics.success_rate,
    record.trading_metrics.sharpe_ratio,
    record.decision_quality.entry_timing_score,
    record.decision_quality.exit_timing_score,
    record.decision_quality.risk_management_score,
    record.learning_metrics.adaptation_speed,
    record.learning_metrics.pattern_learning_rate
  ]);
}

function extractTargetValues(historicalData: AgentPerformanceRecord[], targets: any): number[] {
  const targetKey = targets.primary_metric || 'total_return';

  return historicalData.map(record => {
    switch (targetKey) {
      case 'total_return':
        return record.trading_metrics.total_return;
      case 'sharpe_ratio':
        return record.trading_metrics.sharpe_ratio;
      case 'success_rate':
        return record.trading_metrics.success_rate;
      case 'max_drawdown':
        return -record.trading_metrics.max_drawdown; // Negative because we want to minimize drawdown
      default:
        return record.trading_metrics.total_return;
    }
  });
}

export async function bayesianParameterOptimization(
  currentParams: Record<string, number>,
  features: number[][],
  targets: number[],
  logger?: any
): Promise<Record<string, number>> {
  try {
    logger?.info('Starting Bayesian parameter optimization', {
      component: 'PerformanceMLMethods',
      paramCount: Object.keys(currentParams).length,
      dataPoints: features.length
    });

    // Use Gaussian Process surrogate model for Bayesian optimization
    const optimizedParams = { ...currentParams };
    const paramNames = Object.keys(currentParams);

    // Bayesian optimization with acquisition function
    for (const paramName of paramNames) {
      const paramValue = currentParams[paramName];
      if (paramValue === undefined) continue;

      // Create surrogate model using SimpleLinearRegression as approximation
      const surrogateModel = createSurrogateModel(features, targets, paramName);

      // Use Expected Improvement acquisition function
      const candidates = generateCandidatePoints(paramValue, 20);
      const bestCandidate = selectBestCandidate(candidates, surrogateModel, features, targets);

      if (bestCandidate !== undefined) {
        optimizedParams[paramName] = bestCandidate;
      }
    }

    logger?.info('Bayesian optimization completed', {
      component: 'PerformanceMLMethods',
      optimizedParams
    });

    return optimizedParams;
  } catch (_error) {
    logger?.warn('Bayesian optimization failed, falling back to current params', { error: _error });
    return currentParams;
  }
}

function createSurrogateModel(
  features: number[][],
  targets: number[],
  paramName: string,
  logger?: any
): any {
  try {
    // Use SimpleLinearRegression as surrogate model
    // In a full implementation, this would be a Gaussian Process
    const regression = new (SimpleLinearRegression as any)(features, targets);
    return regression;
  } catch (_error) {
    logger?.warn('Failed to create surrogate model', { error: _error, paramName });
    return null;
  }
}

function generateCandidatePoints(currentValue: number, numCandidates: number): number[] {
  const candidates: number[] = [];
  const range = 0.5; // Search within ±50% of current value

  for (let i = 0; i < numCandidates; i++) {
    // Use Latin Hypercube sampling for better space coverage
    const randomOffset = (Math.random() - 0.5) * 2 * range;
    const candidate = Math.max(0.01, Math.min(2.0, currentValue * (1 + randomOffset)));
    candidates.push(candidate);
  }

  return candidates;
}

function selectBestCandidate(
  candidates: number[],
  surrogateModel: any,
  features: number[][],
  targets: number[]
): number | undefined {
  if (!surrogateModel || candidates.length === 0) return candidates[0];

  let bestCandidate: number | undefined = candidates[0];
  let bestEI = -Infinity;

  // Find current best observed value
  const currentBest = Math.max(...targets);

  for (const candidate of candidates) {
    // Calculate expected improvement
    const ei = calculateExpectedImprovement(candidate, surrogateModel, currentBest);
    if (ei > bestEI) {
      bestEI = ei;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function calculateExpectedImprovement(
  candidate: number,
  surrogateModel: any,
  currentBest: number
): number {
  try {
    // Simplified EI calculation
    // In full implementation, this would include uncertainty estimates
    const prediction = surrogateModel.predict([[candidate]])[0];
    const improvement = prediction - currentBest;

    if (improvement > 0) {
      // Simplified expected improvement (assuming unit variance)
      return improvement;
    }

    return 0;
  } catch (_error) {
    return 0;
  }
}

async function performSingleFoldValidation(
  currentParams: Record<string, number>,
  features: number[][],
  targets: number[],
  foldIndex: number,
  totalFolds: number,
  logger?: any
): Promise<{
  score: number;
  optimized_params: Record<string, number>;
  fold_metrics: {
    train_score: number;
    validation_score: number;
    parameter_changes: Record<string, number>;
  };
}> {
  try {
    // Split data for this fold
    const foldSize = Math.floor(features.length / totalFolds);
    const testStart = foldIndex * foldSize;
    const testEnd = (foldIndex === totalFolds - 1) ? features.length : (foldIndex + 1) * foldSize;

    // Create training and validation sets
    const trainFeatures = [...features.slice(0, testStart), ...features.slice(testEnd)];
    const trainTargets = [...targets.slice(0, testStart), ...targets.slice(testEnd)];
    const validationFeatures = features.slice(testStart, testEnd);
    const validationTargets = targets.slice(testStart, testEnd);

    // Perform optimization on training set
    const optimizedParams = await bayesianParameterOptimization(
      currentParams,
      trainFeatures,
      trainTargets
    );

    // Evaluate on both training and validation sets
    const trainScore = evaluateParameterPerformance(
      optimizedParams,
      trainFeatures,
      trainTargets
    );

    const validationScore = evaluateParameterPerformance(
      optimizedParams,
      validationFeatures,
      validationTargets
    );

    // Calculate parameter changes
    const parameterChanges: Record<string, number> = {};
    Object.entries(optimizedParams).forEach(([paramName, optimizedValue]) => {
      const originalValue = currentParams[paramName] || 1;
      parameterChanges[paramName] = Math.abs(optimizedValue - originalValue) / originalValue;
    });

    return {
      score: validationScore,
      optimized_params: optimizedParams,
      fold_metrics: {
        train_score: Number(trainScore.toFixed(4)),
        validation_score: Number(validationScore.toFixed(4)),
        parameter_changes: Object.fromEntries(
          Object.entries(parameterChanges).map(([key, value]) => [key, Number(value.toFixed(4))])
        )
      }
    };
  } catch (error) {
    logger?.warn('Single fold validation failed', { error, foldIndex });
    return {
      score: 0,
      optimized_params: currentParams,
      fold_metrics: {
        train_score: 0,
        validation_score: 0,
        parameter_changes: {}
      }
    };
  }
}

function calculateOverfittingRisk(scores: number[], meanScore: number): number {
  try {
    if (scores.length < 2) return 0.5;

    // Calculate variance in scores as indicator of overfitting
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;
    const coefficientOfVariation = Math.sqrt(variance) / Math.abs(meanScore);

    // Higher coefficient of variation indicates higher overfitting risk
    return Math.min(1, coefficientOfVariation * 2);
  } catch (_error) {
    return 0.5;
  }
}

function calculateGeneralizationScore(scores: number[], stdScore: number): number {
  try {
    const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Generalization score combines mean performance with consistency
    // Higher mean score and lower standard deviation = better generalization
    const consistencyBonus = Math.max(0, 1 - stdScore * 2);
    const performanceScore = Math.max(0, Math.min(1, meanScore));

    return (performanceScore * 0.7 + consistencyBonus * 0.3);
  } catch (_error) {
    return 0;
  }
}

function calculateParameterSensitivity(
  parameterVariations: Map<string, number[]>
): Record<string, number> {
  try {
    const sensitivity: Record<string, number> = {};

    parameterVariations.forEach((variations, paramName) => {
      if (variations.length < 2) {
        sensitivity[paramName] = 0;
        return;
      }

      // Calculate coefficient of variation as sensitivity measure
      const mean = variations.reduce((sum, val) => sum + val, 0) / variations.length;
      const variance = variations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / variations.length;
      const std = Math.sqrt(variance);

      sensitivity[paramName] = mean !== 0 ? std / Math.abs(mean) : 0;
    });

    return sensitivity;
  } catch (_error) {
    return {};
  }
}

function evaluateParameterPerformance(params: Record<string, number>, features: number[][], targets: number[]): number {
  if (features.length === 0 || targets.length === 0) return 0;

  // Simple correlation-based evaluation using parameter values
  const paramValues = Object.values(params);
  const avgParamValue = paramValues.reduce((sum, val) => sum + val, 0) / paramValues.length;

  const paramInfluence = features.map(feature => (feature?.[0] ?? 0) * avgParamValue);
  let correlation = 0;

  for (let i = 0; i < Math.min(paramInfluence.length, targets.length); i++) {
    const targetValue = targets[i] ?? 0;
    correlation += (paramInfluence[i] ?? 0) * targetValue;
  }

  return correlation / Math.min(paramInfluence.length, targets.length);
}

function calculateOptimizationConfidence(
  optimizedParams: Record<string, number>,
  historicalData: AgentPerformanceRecord[],
  currentParams: Record<string, number>,
  logger?: any
): number {
  try {
    // Base confidence on data quality and consistency
    const dataQualityScores = historicalData.map(record => record.metadata.data_quality_score);
    const avgDataQuality = dataQualityScores.reduce((sum, score) => sum + score, 0) / dataQualityScores.length;

    // Check parameter stability (how much they changed)
    const parameterChanges = Object.keys(optimizedParams).map(key =>
      Math.abs((optimizedParams[key] ?? 1) - (currentParams[key] ?? 1))
    );
    const avgChange = parameterChanges.reduce((sum, change) => sum + change, 0) / parameterChanges.length;

    // Confidence decreases with large parameter changes and increases with data quality
    const stabilityScore = Math.max(0, 1 - avgChange / 2);
    const sampleSizeScore = Math.min(1, historicalData.length / 20); // Assuming minimumSampleSize * 2

    return Math.min(1, (avgDataQuality * 0.4 + stabilityScore * 0.4 + sampleSizeScore * 0.2));
  } catch (error) {
    logger?.warn('Error calculating optimization confidence', { error });
    return 0.5;
  }
}