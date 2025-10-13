/**
 * Walk-Forward Analysis System for Overfitting Detection
 * 
 * This module provides comprehensive walk-forward analysis including:
 * - In-sample vs out-of-sample performance comparison
 * - Parameter optimization with look-ahead bias prevention
 * - Parameter stability analysis across time periods
 * - Overfitting detection and prevention
 */

import { createLogger } from '../utils/enhanced-logger';
import { ITradingStrategy, MarketData } from '../strategies/base-strategy';
import { BacktestEngine } from './backtest-engine';
import {
  WalkForwardConfig,
  WalkForwardResult,
  WalkForwardPeriod,
  OptimizedParameters,
  OverfittingAnalysis,
  ParameterStabilityReport,
  BacktestConfig,
  PerformanceMetrics
} from './types';

/**
 * Walk-forward analyzer for robust strategy validation
 */
export class WalkForwardAnalyzer {
  private readonly logger = createLogger('system', 'walk-forward-analyzer');
  private readonly backtestEngine: BacktestEngine;

  constructor() {
    this.backtestEngine = new BacktestEngine();
  }

  /**
   * Perform comprehensive walk-forward analysis
   */
  async performWalkForward(config: WalkForwardConfig): Promise<WalkForwardResult> {
    try {
      this.logger.info('walk-forward-started', 'Starting walk-forward analysis', {
        strategy: config.strategy.name,
        inSamplePeriod: config.inSamplePeriod,
        outOfSamplePeriod: config.outOfSamplePeriod,
        stepSize: config.stepSize,
        optimizationMetric: config.optimizationMetric
      });

      // Split data into walk-forward periods
      const periods = this.createWalkForwardPeriods(config);
      
      this.logger.info('walk-forward-periods-created', 'Walk-forward periods created', {
        totalPeriods: periods.length,
        dataPoints: config.data.length
      });

      const walkForwardPeriods: WalkForwardPeriod[] = [];
      const allOptimizedParameters: OptimizedParameters[] = [];

      // Process each walk-forward period
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        if (!period) continue;
        
        try {
          this.logger.debug('processing-period', `Processing walk-forward period ${i + 1}/${periods.length}`, {
            periodIndex: i,
            inSampleStart: period.inSampleStart.toISOString(),
            inSampleEnd: period.inSampleEnd.toISOString(),
            outOfSampleStart: period.outOfSampleStart.toISOString(),
            outOfSampleEnd: period.outOfSampleEnd.toISOString()
          });

          // Get data for this period
          const inSampleData = this.getDataForPeriod(config.data, period.inSampleStart, period.inSampleEnd);
          const outOfSampleData = this.getDataForPeriod(config.data, period.outOfSampleStart, period.outOfSampleEnd);

          // Optimize parameters on in-sample data
          const optimizedParams = await this.optimizeParameters(
            config.strategy,
            inSampleData,
            config.parameterRanges,
            config.optimizationMetric
          );

          // Test optimized parameters on out-of-sample data
          const outOfSampleResult = await this.testParameters(
            config.strategy,
            outOfSampleData,
            optimizedParams?.parameters || {}
          );

          const walkForwardPeriod: WalkForwardPeriod = {
            periodIndex: i,
            inSampleStart: period.inSampleStart,
            inSampleEnd: period.inSampleEnd,
            outOfSampleStart: period.outOfSampleStart,
            outOfSampleEnd: period.outOfSampleEnd,
            optimizedParameters: optimizedParams,
            inSamplePerformance: optimizedParams.performance,
            outOfSamplePerformance: outOfSampleResult
          };

          walkForwardPeriods.push(walkForwardPeriod);
          allOptimizedParameters.push(optimizedParams);

        } catch (periodError) {
          this.logger.error('walk-forward-period-error', `Error processing period ${i + 1}`, {
            periodIndex: i,
            error: periodError instanceof Error ? periodError.message : String(periodError)
          });
          
          // Continue with next period rather than failing entire analysis
          continue;
        }
      }

      if (walkForwardPeriods.length === 0) {
        throw new Error('No walk-forward periods could be processed successfully');
      }

      // Calculate aggregated performance
      const aggregatedPerformance = this.calculateAggregatedPerformance(walkForwardPeriods);

      // Perform overfitting analysis
      const overfittingAnalysis = this.detectOverfitting(walkForwardPeriods);

      // Analyze parameter stability
      const parameterStability = this.analyzeParameterStability(allOptimizedParameters, config.parameterRanges);

      // Find best parameters across all periods
      const bestParameters = this.findBestParameters(allOptimizedParameters, config.optimizationMetric);

      const result: WalkForwardResult = {
        config,
        periods: walkForwardPeriods,
        aggregatedPerformance,
        overfittingAnalysis,
        parameterStability,
        bestParameters
      };

      this.logger.info('walk-forward-completed', 'Walk-forward analysis completed successfully', {
        strategy: config.strategy.name,
        processedPeriods: walkForwardPeriods.length,
        totalPeriods: periods.length,
        isOverfitted: overfittingAnalysis.isOverfitted,
        stabilityScore: parameterStability.stabilityScore,
        bestScore: bestParameters.optimizationScore
      });

      return result;

    } catch (error) {
      this.logger.error('walk-forward-error', 'Walk-forward analysis failed', {
        strategy: config.strategy.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Optimize strategy parameters for given data
   */
  async optimizeParameters(
    strategy: ITradingStrategy,
    data: MarketData[],
    parameterRanges: Record<string, { min: number; max: number; step: number }>,
    optimizationMetric: 'sharpe' | 'return' | 'calmar' | 'sortino'
  ): Promise<OptimizedParameters> {
    try {
      this.logger.debug('parameter-optimization-started', 'Starting parameter optimization', {
        strategy: strategy.name,
        dataPoints: data.length,
        parameterCount: Object.keys(parameterRanges).length,
        optimizationMetric
      });

      let bestParameters: Record<string, any> = {};
      let bestScore = -Infinity;
      let bestPerformance: PerformanceMetrics | null = null;
      let bestBacktestResult = null;

      // Generate parameter combinations
      const parameterCombinations = this.generateParameterCombinations(parameterRanges);
      
      this.logger.debug('parameter-combinations-generated', 'Parameter combinations generated', {
        totalCombinations: parameterCombinations.length
      });

      // Test each parameter combination
      for (let i = 0; i < parameterCombinations.length; i++) {
        const params = parameterCombinations[i];
        
        try {
          // Update strategy with new parameters
          const originalConfig = { ...strategy.config };
          strategy.updateConfig({ parameters: { ...originalConfig.parameters, ...params } });

          // Run backtest with these parameters
          const backtestConfig: BacktestConfig = {
            strategy,
            symbols: [...new Set(data.map(d => d.symbol))],
            startDate: data[0].timestamp,
            endDate: data[data.length - 1].timestamp,
            initialCapital: 100000,
            commission: 0.001,
            slippage: 0.0005,
            marketImpact: false
          };

          const backtestResult = await this.backtestEngine.runBacktest(backtestConfig);
          const score = this.calculateOptimizationScore(backtestResult.performance, optimizationMetric);

          if (score > bestScore) {
            bestScore = score;
            bestParameters = { ...params };
            bestPerformance = backtestResult.performance;
            bestBacktestResult = backtestResult;
          }

          // Restore original configuration
          strategy.updateConfig(originalConfig);

        } catch (paramError) {
          this.logger.warn('parameter-test-error', 'Error testing parameter combination', {
            parameters: JSON.stringify(params),
            error: paramError instanceof Error ? paramError.message : String(paramError)
          });
          
          // Restore original configuration on error
          const originalConfig = { ...strategy.config };
          strategy.updateConfig(originalConfig);
        }
      }

      if (!bestPerformance || !bestBacktestResult) {
        throw new Error('No valid parameter combinations found');
      }

      const optimizedParameters: OptimizedParameters = {
        parameters: bestParameters,
        performance: bestPerformance,
        inSampleResult: bestBacktestResult,
        optimizationScore: bestScore
      };

      this.logger.debug('parameter-optimization-completed', 'Parameter optimization completed', {
        bestScore,
        bestParameters: JSON.stringify(bestParameters),
        testedCombinations: parameterCombinations.length
      });

      return optimizedParameters;

    } catch (error) {
      this.logger.error('parameter-optimization-error', 'Parameter optimization failed', {
        strategy: strategy.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Detect overfitting by comparing in-sample vs out-of-sample performance
   */
  detectOverfitting(periods: WalkForwardPeriod[]): OverfittingAnalysis {
    try {
      const inSampleReturns = periods.map(p => p.inSamplePerformance.totalReturn);
      const outOfSampleReturns = periods.map(p => p.outOfSamplePerformance.totalReturn);
      
      const inSampleSharpe = periods.map(p => p.inSamplePerformance.sharpeRatio);
      const outOfSampleSharpe = periods.map(p => p.outOfSamplePerformance.sharpeRatio);
      
      const inSampleWinRate = periods.map(p => p.inSamplePerformance.winRate);
      const outOfSampleWinRate = periods.map(p => p.outOfSamplePerformance.winRate);

      // Calculate degradation metrics
      const returnDegradation = this.calculateMean(inSampleReturns) - this.calculateMean(outOfSampleReturns);
      const sharpeRatioDegradation = this.calculateMean(inSampleSharpe) - this.calculateMean(outOfSampleSharpe);
      const winRateDegradation = this.calculateMean(inSampleWinRate) - this.calculateMean(outOfSampleWinRate);

      // Calculate consistency metrics (lower is better)
      const returnConsistency = this.calculateStandardDeviation(outOfSampleReturns);
      const sharpeConsistency = this.calculateStandardDeviation(outOfSampleSharpe);
      const drawdownConsistency = this.calculateStandardDeviation(periods.map(p => p.outOfSamplePerformance.maxDrawdown));

      // Calculate overfitting score (0-1, higher means more overfitted)
      const degradationScore = Math.max(0, (returnDegradation * 2 + sharpeRatioDegradation + winRateDegradation) / 4);
      const consistencyScore = (returnConsistency + sharpeConsistency + drawdownConsistency) / 3;
      const overfittingScore = Math.min(1, (degradationScore + consistencyScore) / 2);

      // Determine if overfitted (threshold can be adjusted)
      const isOverfitted = overfittingScore > 0.3 || returnDegradation > 0.1 || sharpeRatioDegradation > 0.5;

      // Generate recommendations
      const recommendations: string[] = [];
      if (isOverfitted) {
        recommendations.push('Strategy shows signs of overfitting');
        if (returnDegradation > 0.05) {
          recommendations.push('Consider reducing parameter complexity');
        }
        if (sharpeRatioDegradation > 0.3) {
          recommendations.push('Risk-adjusted returns degrade significantly out-of-sample');
        }
        if (consistencyScore > 0.2) {
          recommendations.push('Out-of-sample performance is inconsistent across periods');
        }
      } else {
        recommendations.push('Strategy shows good generalization to out-of-sample data');
      }

      return {
        isOverfitted,
        overfittingScore,
        inSampleVsOutOfSample: {
          returnDegradation,
          sharpeRatioDegradation,
          winRateDegradation
        },
        consistencyMetrics: {
          returnConsistency,
          sharpeConsistency,
          drawdownConsistency
        },
        recommendations
      };

    } catch (error) {
      this.logger.error('overfitting-analysis-error', 'Overfitting analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return conservative result on error
      return {
        isOverfitted: true,
        overfittingScore: 1.0,
        inSampleVsOutOfSample: {
          returnDegradation: 0,
          sharpeRatioDegradation: 0,
          winRateDegradation: 0
        },
        consistencyMetrics: {
          returnConsistency: 0,
          sharpeConsistency: 0,
          drawdownConsistency: 0
        },
        recommendations: ['Error in overfitting analysis - assume overfitted for safety']
      };
    }
  }

  /**
   * Analyze parameter stability across time periods
   */
  analyzeParameterStability(
    optimizedParameters: OptimizedParameters[],
    parameterRanges: Record<string, { min: number; max: number; step: number }>
  ): ParameterStabilityReport {
    try {
      const parameterNames = Object.keys(parameterRanges);
      const stableParameters: string[] = [];
      const unstableParameters: string[] = [];
      const parameterVariability: Record<string, any> = {};

      for (const paramName of parameterNames) {
        const values = optimizedParameters.map(opt => opt?.parameters?.[paramName]).filter(v => v !== undefined);
        
        if (values.length === 0) continue;

        const mean = this.calculateMean(values);
        const standardDeviation = this.calculateStandardDeviation(values);
        const coefficientOfVariation = mean !== 0 ? standardDeviation / Math.abs(mean) : 0;
        
        // Determine trend
        let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
        if (values.length > 2) {
          const firstHalf = values.slice(0, Math.floor(values.length / 2));
          const secondHalf = values.slice(Math.floor(values.length / 2));
          const firstMean = this.calculateMean(firstHalf);
          const secondMean = this.calculateMean(secondHalf);
          
          const changePercent = Math.abs(secondMean - firstMean) / Math.abs(firstMean);
          if (changePercent > 0.2) {
            trend = secondMean > firstMean ? 'INCREASING' : 'DECREASING';
          }
        }

        parameterVariability[paramName] = {
          mean,
          standardDeviation,
          coefficientOfVariation,
          trend
        };

        // Classify stability (coefficient of variation < 0.3 is considered stable)
        if (coefficientOfVariation < 0.3) {
          stableParameters.push(paramName);
        } else {
          unstableParameters.push(paramName);
        }
      }

      // Calculate overall stability score (0-1, higher is more stable)
      const stabilityScores = Object.values(parameterVariability).map((v: any) => 
        Math.max(0, 1 - v.coefficientOfVariation)
      );
      const stabilityScore = stabilityScores.length > 0 ? this.calculateMean(stabilityScores) : 0;

      // Generate recommendations
      const recommendations: string[] = [];
      if (stabilityScore > 0.7) {
        recommendations.push('Parameters show good stability across time periods');
      } else if (stabilityScore > 0.4) {
        recommendations.push('Parameters show moderate stability - monitor for regime changes');
      } else {
        recommendations.push('Parameters are highly unstable - consider simplifying strategy');
      }

      if (unstableParameters.length > 0) {
        recommendations.push(`Unstable parameters: ${unstableParameters.join(', ')}`);
      }

      return {
        stableParameters,
        unstableParameters,
        parameterVariability,
        stabilityScore,
        recommendations
      };

    } catch (error) {
      this.logger.error('parameter-stability-error', 'Parameter stability analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        stableParameters: [],
        unstableParameters: Object.keys(parameterRanges),
        parameterVariability: {},
        stabilityScore: 0,
        recommendations: ['Error in parameter stability analysis']
      };
    }
  }

  // Private helper methods

  private createWalkForwardPeriods(config: WalkForwardConfig): Array<{
    inSampleStart: Date;
    inSampleEnd: Date;
    outOfSampleStart: Date;
    outOfSampleEnd: Date;
  }> {
    const periods = [];
    const data = config.data;
    const totalDays = data.length;
    
    let currentIndex = 0;
    
    while (currentIndex + config.inSamplePeriod + config.outOfSamplePeriod <= totalDays) {
      const inSampleStartData = data[currentIndex];
      const inSampleEndData = data[currentIndex + config.inSamplePeriod - 1];
      const outOfSampleStartData = data[currentIndex + config.inSamplePeriod];
      const outOfSampleEndData = data[Math.min(currentIndex + config.inSamplePeriod + config.outOfSamplePeriod - 1, totalDays - 1)];
      
      if (!inSampleStartData || !inSampleEndData || !outOfSampleStartData || !outOfSampleEndData) {
        currentIndex += config.stepSize;
        continue;
      }
      
      const inSampleStart = inSampleStartData.timestamp;
      const inSampleEnd = inSampleEndData.timestamp;
      const outOfSampleStart = outOfSampleStartData.timestamp;
      const outOfSampleEnd = outOfSampleEndData.timestamp;
      
      periods.push({
        inSampleStart,
        inSampleEnd,
        outOfSampleStart,
        outOfSampleEnd
      });
      
      currentIndex += config.stepSize;
    }
    
    return periods;
  }

  private getDataForPeriod(data: MarketData[], startDate: Date, endDate: Date): MarketData[] {
    return data.filter(d => d.timestamp >= startDate && d.timestamp <= endDate);
  }

  private generateParameterCombinations(
    parameterRanges: Record<string, { min: number; max: number; step: number }>
  ): Record<string, any>[] {
    const paramNames = Object.keys(parameterRanges);
    const combinations: Record<string, any>[] = [];
    
    // Generate all combinations recursively
    const generateCombos = (index: number, current: Record<string, any>) => {
      if (index === paramNames.length) {
        combinations.push({ ...current });
        return;
      }
      
      const paramName = paramNames[index];
      const range = parameterRanges[paramName];
      
      for (let value = range.min; value <= range.max; value += range.step) {
        current[paramName] = value;
        generateCombos(index + 1, current);
      }
    };
    
    generateCombos(0, {});
    return combinations;
  }

  private calculateOptimizationScore(performance: PerformanceMetrics, metric: string): number {
    switch (metric) {
      case 'sharpe':
        return performance.sharpeRatio;
      case 'return':
        return performance.totalReturn;
      case 'calmar':
        return performance.calmarRatio;
      case 'sortino':
        return performance.sortinoRatio;
      default:
        return performance.sharpeRatio;
    }
  }

  private async testParameters(
    strategy: ITradingStrategy,
    data: MarketData[],
    parameters: Record<string, any>
  ): Promise<PerformanceMetrics> {
    // Update strategy with parameters
    const originalConfig = { ...strategy.config };
    strategy.updateConfig({ parameters: { ...originalConfig.parameters, ...parameters } });

    try {
      // Run backtest
      const backtestConfig: BacktestConfig = {
        strategy,
        symbols: [...new Set(data.map(d => d.symbol))],
        startDate: data[0].timestamp,
        endDate: data[data.length - 1].timestamp,
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: false
      };

      const result = await this.backtestEngine.runBacktest(backtestConfig);
      return result.performance;

    } finally {
      // Restore original configuration
      strategy.updateConfig(originalConfig);
    }
  }

  private calculateAggregatedPerformance(periods: WalkForwardPeriod[]): PerformanceMetrics {
    const outOfSamplePerformances = periods.map(p => p.outOfSamplePerformance);
    
    return {
      totalReturn: this.calculateMean(outOfSamplePerformances.map(p => p.totalReturn)),
      annualizedReturn: this.calculateMean(outOfSamplePerformances.map(p => p.annualizedReturn)),
      cumulativeReturn: this.calculateMean(outOfSamplePerformances.map(p => p.cumulativeReturn)),
      volatility: this.calculateMean(outOfSamplePerformances.map(p => p.volatility)),
      sharpeRatio: this.calculateMean(outOfSamplePerformances.map(p => p.sharpeRatio)),
      sortinoRatio: this.calculateMean(outOfSamplePerformances.map(p => p.sortinoRatio)),
      calmarRatio: this.calculateMean(outOfSamplePerformances.map(p => p.calmarRatio)),
      maxDrawdown: this.calculateMean(outOfSamplePerformances.map(p => p.maxDrawdown)),
      maxDrawdownDuration: this.calculateMean(outOfSamplePerformances.map(p => p.maxDrawdownDuration)),
      currentDrawdown: this.calculateMean(outOfSamplePerformances.map(p => p.currentDrawdown)),
      totalTrades: Math.round(this.calculateMean(outOfSamplePerformances.map(p => p.totalTrades))),
      winningTrades: Math.round(this.calculateMean(outOfSamplePerformances.map(p => p.winningTrades))),
      losingTrades: Math.round(this.calculateMean(outOfSamplePerformances.map(p => p.losingTrades))),
      winRate: this.calculateMean(outOfSamplePerformances.map(p => p.winRate)),
      profitFactor: this.calculateMean(outOfSamplePerformances.map(p => p.profitFactor)),
      averageWin: this.calculateMean(outOfSamplePerformances.map(p => p.averageWin)),
      averageLoss: this.calculateMean(outOfSamplePerformances.map(p => p.averageLoss)),
      largestWin: this.calculateMean(outOfSamplePerformances.map(p => p.largestWin)),
      largestLoss: this.calculateMean(outOfSamplePerformances.map(p => p.largestLoss))
    };
  }

  private findBestParameters(
    optimizedParameters: OptimizedParameters[],
    metric: string
  ): OptimizedParameters {
    return optimizedParameters.reduce((best, current) => {
      const currentScore = this.calculateOptimizationScore(current.performance, metric);
      const bestScore = this.calculateOptimizationScore(best.performance, metric);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    
    return Math.sqrt(variance);
  }
}