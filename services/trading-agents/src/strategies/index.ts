/**
 * Trading Strategies Module
 * 
 * This module exports all trading strategy implementations and provides a unified
 * interface for strategy management and execution.
 * 
 * Strategy Categories:
 * - Base Strategy: Core interfaces and abstract classes
 * - Momentum Strategies: Trend-following and momentum-based strategies
 * - Mean Reversion Strategies: Counter-trend and reversion strategies
 * - Breakout Strategies: Range and volatility breakout strategies
 * 
 * TODO: Add strategy backtesting framework
 * TODO: Implement strategy performance comparison tools
 * TODO: Add strategy ensemble and voting mechanisms
 */

// Import base strategy types first
import {
  ITradingStrategy,
  BaseTradingStrategy,
  StrategyFactory,
  SignalType,
  SignalStrength,
  RiskLevel,
  MarketData,
  TradingSignal,
  StrategyConfig,
  StrategyPerformance
} from './base-strategy';

// Base strategy exports
export {
  ITradingStrategy,
  BaseTradingStrategy,
  StrategyFactory,
  SignalType,
  SignalStrength,
  RiskLevel,
  MarketData,
  TradingSignal,
  StrategyConfig,
  StrategyPerformance
};

// Momentum strategy exports
export {
  MovingAverageCrossoverStrategy,
  MACDStrategy,
  RSIMomentumStrategy
} from './momentum-strategies';

// Mean reversion strategy exports  
export {
  BollingerBandsMeanReversionStrategy,
  PriceActionMeanReversionStrategy
} from './mean-reversion-strategies';

// Breakout strategy exports
export {
  RangeBreakoutStrategy,
  VolatilityBreakoutStrategy
} from './breakout-strategies';

// Strategy ensemble imports and exports
import {
  StrategyEnsemble,
  EnsembleSignal,
  ConflictResolution,
  StrategyWeight,
  SignalCorrelation,
  VotingConfig
} from './strategy-ensemble';

export {
  StrategyEnsemble,
  EnsembleSignal,
  ConflictResolution,
  StrategyWeight,
  SignalCorrelation,
  VotingConfig
};

/**
 * Strategy Registry for automatic registration with ensemble support
 * 
 * This function registers all available strategies with the StrategyFactory
 * for easy instantiation and management, including ensemble integration.
 * 
 * Requirements: 6.3 - Integrate with current StrategyFactory for strategy registration
 */
export function registerAllStrategies(): void {
  // Import strategy classes
  const {
    MovingAverageCrossoverStrategy,
    MACDStrategy, 
    RSIMomentumStrategy
  } = require('./momentum-strategies');
  
  const {
    BollingerBandsMeanReversionStrategy,
    PriceActionMeanReversionStrategy
  } = require('./mean-reversion-strategies');
  
  const {
    RangeBreakoutStrategy,
    VolatilityBreakoutStrategy
  } = require('./breakout-strategies');

  // Register momentum strategies
  StrategyFactory.register('MovingAverageCrossover', MovingAverageCrossoverStrategy);
  StrategyFactory.register('MACD', MACDStrategy);
  StrategyFactory.register('RSIMomentum', RSIMomentumStrategy);

  // Register mean reversion strategies
  StrategyFactory.register('BollingerBandsMeanReversion', BollingerBandsMeanReversionStrategy);
  StrategyFactory.register('PriceActionMeanReversion', PriceActionMeanReversionStrategy);

  // Register breakout strategies
  StrategyFactory.register('RangeBreakout', RangeBreakoutStrategy);
  StrategyFactory.register('VolatilityBreakout', VolatilityBreakoutStrategy);
}

/**
 * Create a pre-configured strategy manager with ensemble support
 * 
 * Requirements: 6.3 - Ensure compatibility with existing strategy configurations
 */
export function createEnhancedStrategyManager(tradingConfig?: any): StrategyManager {
  // Register all strategies first
  registerAllStrategies();
  
  // Create manager with ensemble support
  const manager = new StrategyManager(tradingConfig);
  
  return manager;
}

/**
 * Create strategy manager with default strategies loaded
 */
export function createDefaultStrategyManager(tradingConfig?: any): StrategyManager {
  const manager = createEnhancedStrategyManager(tradingConfig);
  
  // Add default strategies with balanced weights
  const defaultStrategies = [
    {
      name: 'MovingAverageCrossover',
      config: DefaultStrategyConfigs.conservativeMomentum,
      weight: 1.0
    },
    {
      name: 'BollingerBandsMeanReversion',
      config: DefaultStrategyConfigs.meanReversionScalp,
      weight: 1.0
    },
    {
      name: 'RangeBreakout',
      config: DefaultStrategyConfigs.rangeBreakout,
      weight: 0.8
    }
  ];
  
  manager.addStrategiesFromConfig(defaultStrategies);
  
  return manager;
}

/**
 * Default strategy configurations for common use cases
 * 
 * TODO: Add market condition-specific configurations
 * TODO: Implement adaptive parameter optimization
 */
export const DefaultStrategyConfigs = {
  // Conservative momentum following
  conservativeMomentum: {
    name: 'Conservative_Momentum',
    enabled: true,
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      maType: 'EMA',
      volumeConfirmation: true
    },
    riskTolerance: RiskLevel.LOW,
    maxPositionSize: 0.1,
    stopLossPercent: 2.0,
    takeProfitPercent: 4.0,
    lookbackPeriod: 50
  },

  // Aggressive momentum following
  aggressiveMomentum: {
    name: 'Aggressive_Momentum',
    enabled: true,
    parameters: {
      fastPeriod: 8,
      slowPeriod: 18,
      maType: 'EMA',
      volumeConfirmation: false
    },
    riskTolerance: RiskLevel.HIGH,
    maxPositionSize: 0.25,
    stopLossPercent: 3.0,
    takeProfitPercent: 6.0,
    lookbackPeriod: 30
  },

  // Mean reversion scalping
  meanReversionScalp: {
    name: 'MeanReversion_Scalp',
    enabled: true,
    parameters: {
      period: 14,
      standardDeviations: 2.0,
      bandTouchThreshold: 0.01,
      requireVolumeConfirmation: true
    },
    riskTolerance: RiskLevel.MODERATE,
    maxPositionSize: 0.15,
    stopLossPercent: 1.5,
    takeProfitPercent: 2.0,
    lookbackPeriod: 20
  },

  // Range breakout trading
  rangeBreakout: {
    name: 'Range_Breakout',
    enabled: true,
    parameters: {
      consolidationPeriod: 20,
      rangeThreshold: 0.025,
      breakoutThreshold: 0.005,
      volumeMultiplier: 1.8
    },
    riskTolerance: RiskLevel.MODERATE,
    maxPositionSize: 0.2,
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0,
    lookbackPeriod: 40
  },

  // Volatility expansion
  volatilityExpansion: {
    name: 'Volatility_Expansion',
    enabled: true,
    parameters: {
      atrPeriod: 14,
      lowVolatilityThreshold: 0.25,
      breakoutMultiplier: 2.5,
      lookbackPeriod: 60
    },
    riskTolerance: RiskLevel.HIGH,
    maxPositionSize: 0.3,
    stopLossPercent: 4.0,
    takeProfitPercent: 8.0,
    lookbackPeriod: 50
  }
};

/**
 * Strategy performance metrics aggregation
 * 
 * TODO: Implement comprehensive performance analytics
 * TODO: Add risk-adjusted return calculations
 */
export interface StrategyPortfolioMetrics {
  totalStrategies: number;
  activeStrategies: number;
  totalSignals: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestStrategy: string;
  worstStrategy: string;
  averageHoldingPeriod: number;
  lastUpdated: Date;
}

/**
 * Strategy manager for coordinating multiple strategies
 * 
 * Enhanced with ensemble support for intelligent signal aggregation,
 * conflict resolution, and dynamic weight management.
 * 
 * Requirements: 6.3 - Integrate ensemble with existing strategy system
 */
export class StrategyManager {
  private strategies: Map<string, ITradingStrategy> = new Map();
  private strategyWeights: Map<string, number> = new Map();
  private ensemble: StrategyEnsemble;

  /**
   * Initialize strategy manager with ensemble support
   */
  constructor(tradingConfig?: any) {
    // Initialize ensemble with default configuration
    this.ensemble = new StrategyEnsemble(tradingConfig || {}, {
      method: 'weighted_average',
      confidenceThreshold: 0.6,
      correlationThreshold: 0.7,
      maxSignalsPerSymbol: 3,
      enableConflictResolution: true
    });
  }

  /**
   * Add strategy to the manager and ensemble
   * 
   * Requirements: 6.3 - Connect ensemble to existing ITradingStrategy interface
   */
  addStrategy(strategy: ITradingStrategy, weight: number = 1.0): void {
    this.strategies.set(strategy.name, strategy);
    this.strategyWeights.set(strategy.name, weight);
    
    // Add strategy to ensemble for advanced signal processing
    this.ensemble.addStrategy(strategy, weight);
  }

  /**
   * Remove strategy from the manager and ensemble
   */
  removeStrategy(strategyName: string): boolean {
    const removed = this.strategies.delete(strategyName);
    this.strategyWeights.delete(strategyName);
    
    // Remove from ensemble as well
    this.ensemble.removeStrategy(strategyName);
    
    return removed;
  }

  /**
   * Get all active strategies
   */
  getActiveStrategies(): ITradingStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.config.enabled);
  }

  /**
   * Generate consolidated signals using ensemble system
   * 
   * Enhanced with ensemble-based signal aggregation, voting logic, and conflict resolution
   * Requirements: 6.3 - Integrate with current StrategyFactory for strategy registration
   */
  async generateConsolidatedSignals(
    symbol: string, 
    marketData: MarketData[], 
    currentPosition?: number
  ): Promise<TradingSignal[]> {
    try {
      // Use ensemble system for advanced signal processing
      const ensembleSignals = await this.ensemble.aggregateSignals(symbol, marketData, currentPosition);
      
      // Convert ensemble signals back to regular trading signals for compatibility
      const consolidatedSignals: TradingSignal[] = ensembleSignals.map((ensembleSignal: EnsembleSignal) => {
        const signal: TradingSignal = {
          symbol: ensembleSignal.symbol,
          signal: ensembleSignal.signal,
          strength: ensembleSignal.strength,
          confidence: ensembleSignal.confidence,
          timestamp: ensembleSignal.timestamp,
          price: ensembleSignal.price,
          reasoning: ensembleSignal.reasoning || `Ensemble signal from ${ensembleSignal.contributingStrategies.length} strategies`,
          riskLevel: ensembleSignal.riskLevel,
          metadata: {
            ...ensembleSignal.metadata,
            ensembleData: {
              contributingStrategies: ensembleSignal.contributingStrategies,
              confidenceWeights: ensembleSignal.confidenceWeights,
              consensusStrength: ensembleSignal.consensusStrength,
              conflictResolution: ensembleSignal.conflictResolution
            }
          }
        };
        
        // Add optional properties only if they exist
        if (ensembleSignal.stopLoss !== undefined) {
          signal.stopLoss = ensembleSignal.stopLoss;
        }
        if (ensembleSignal.takeProfit !== undefined) {
          signal.takeProfit = ensembleSignal.takeProfit;
        }
        if (ensembleSignal.positionSize !== undefined) {
          signal.positionSize = ensembleSignal.positionSize;
        }
        
        return signal;
      });

      return consolidatedSignals.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      // Fallback to legacy signal aggregation if ensemble fails
      console.warn('Ensemble signal aggregation failed, falling back to legacy method:', error);
      return this.generateLegacyConsolidatedSignals(symbol, marketData, currentPosition);
    }
  }

  /**
   * Legacy signal aggregation method as fallback
   */
  private async generateLegacyConsolidatedSignals(
    symbol: string, 
    marketData: MarketData[], 
    currentPosition?: number
  ): Promise<TradingSignal[]> {
    const allSignals: TradingSignal[] = [];
    const activeStrategies = this.getActiveStrategies();

    // Collect signals from all active strategies
    for (const strategy of activeStrategies) {
      try {
        const signals = await strategy.analyze(marketData, currentPosition);
        
        // Apply strategy weight to signals
        const weight = this.strategyWeights.get(strategy.name) || 1.0;
        const weightedSignals = signals.map(signal => ({
          ...signal,
          confidence: signal.confidence * weight,
          metadata: {
            ...signal.metadata,
            strategy: strategy.name,
            weight
          }
        }));
        
        allSignals.push(...weightedSignals);
      } catch (_error) {
        // Error generating signals from strategy - continue with other strategies
        // TODO: Implement proper error logging system
      }
    }

    // Simple signal aggregation logic
    const aggregatedSignals = this.performSignalAggregation(allSignals);
    
    return aggregatedSignals.sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Get portfolio-level performance metrics
   * 
   * TODO: Implement comprehensive metrics calculation
   */
  getPortfolioMetrics(): StrategyPortfolioMetrics {
    const activeStrategies = this.getActiveStrategies();
    
    // Basic metrics calculation
    const totalSignals = activeStrategies.reduce((sum, strategy) => {
      return sum + strategy.getPerformance().totalTrades;
    }, 0);

    const avgWinRate = activeStrategies.reduce((sum, strategy) => {
      return sum + strategy.getPerformance().winRate;
    }, 0) / Math.max(1, activeStrategies.length);

    // Calculate comprehensive portfolio metrics
    const portfolioMetrics = this.calculateComprehensivePortfolioMetrics(activeStrategies);

    return {
      totalStrategies: this.strategies.size,
      activeStrategies: activeStrategies.length,
      totalSignals,
      winRate: avgWinRate,
      totalReturn: portfolioMetrics.totalReturn,
      sharpeRatio: portfolioMetrics.sharpeRatio,
      maxDrawdown: portfolioMetrics.maxDrawdown,
      bestStrategy: portfolioMetrics.bestStrategy,
      worstStrategy: portfolioMetrics.worstStrategy,
      averageHoldingPeriod: portfolioMetrics.averageHoldingPeriod,
      lastUpdated: new Date()
    };
  }

  /**
   * Update strategy configurations with ensemble integration
   * 
   * Requirements: 6.3 - Ensure compatibility with existing strategy configurations
   */
  updateStrategyConfig(strategyName: string, newConfig: Partial<StrategyConfig>): boolean {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return false;
    }

    strategy.updateConfig(newConfig);
    const isValid = strategy.validate();
    
    // Update ensemble if strategy is still valid
    if (isValid) {
      // Update weight in ensemble if provided in config
      if (newConfig.parameters?.ensembleWeight) {
        this.updateStrategyWeight(strategyName, newConfig.parameters.ensembleWeight);
      }
    }
    
    return isValid;
  }

  /**
   * Update strategy weight in both manager and ensemble
   */
  updateStrategyWeight(strategyName: string, newWeight: number): boolean {
    if (!this.strategies.has(strategyName)) {
      return false;
    }

    // Update local weight
    this.strategyWeights.set(strategyName, newWeight);
    
    // Update ensemble weight
    const strategy = this.strategies.get(strategyName)!;
    this.ensemble.removeStrategy(strategyName);
    this.ensemble.addStrategy(strategy, newWeight);
    
    return true;
  }

  /**
   * Get ensemble-enhanced portfolio metrics
   */
  getEnhancedPortfolioMetrics(): StrategyPortfolioMetrics & {
    ensembleStats: {
      totalStrategies: number;
      activeStrategies: number;
      averageWeight: number;
      weightVariance: number;
      lastUpdated: Date;
    };
  } {
    const baseMetrics = this.getPortfolioMetrics();
    const ensembleStats = this.ensemble.getEnsembleStats();
    
    return {
      ...baseMetrics,
      ensembleStats
    };
  }

  /**
   * Update ensemble weights based on performance data
   */
  async updateEnsembleWeights(performanceData: StrategyPerformance[]): Promise<void> {
    await this.ensemble.updateWeights(performanceData);
    
    // Sync weights back to strategy manager
    const ensembleWeights = this.ensemble.getStrategyWeights();
    for (const [strategyName, weightInfo] of ensembleWeights) {
      this.strategyWeights.set(strategyName, weightInfo.weight);
    }
  }

  /**
   * Rebalance ensemble based on performance degradation
   */
  async rebalanceEnsemble(performanceThreshold: number = 0.5): Promise<void> {
    await this.ensemble.rebalanceWeights(performanceThreshold);
    
    // Sync weights back to strategy manager
    const ensembleWeights = this.ensemble.getStrategyWeights();
    for (const [strategyName, weightInfo] of ensembleWeights) {
      this.strategyWeights.set(strategyName, weightInfo.weight);
    }
  }

  /**
   * Integrate with learning system through ensemble
   */
  async integrateWithLearningSystem(learningData: {
    marketConditions: Record<string, any>;
    strategyPerformance: Map<string, number>;
    adaptationSignals: Array<{ strategy: string; adaptation: string; confidence: number }>;
  }): Promise<void> {
    await this.ensemble.integrateWithLearningSystem(learningData);
    
    // Sync updated weights
    const ensembleWeights = this.ensemble.getStrategyWeights();
    for (const [strategyName, weightInfo] of ensembleWeights) {
      this.strategyWeights.set(strategyName, weightInfo.weight);
    }
  }

  /**
   * Get ensemble instance for direct access
   */
  getEnsemble(): StrategyEnsemble {
    return this.ensemble;
  }

  /**
   * Create strategy using factory with ensemble integration
   * 
   * Requirements: 6.3 - Integrate with current StrategyFactory for strategy registration
   */
  createAndAddStrategy(
    strategyName: string, 
    config: StrategyConfig, 
    weight: number = 1.0,
    ...args: any[]
  ): ITradingStrategy | null {
    const strategy = StrategyFactory.create(strategyName, config, ...args);
    
    if (strategy) {
      this.addStrategy(strategy, weight);
      return strategy;
    }
    
    return null;
  }

  /**
   * Bulk add strategies from configuration
   */
  addStrategiesFromConfig(strategiesConfig: Array<{
    name: string;
    config: StrategyConfig;
    weight?: number;
    args?: any[];
  }>): ITradingStrategy[] {
    const addedStrategies: ITradingStrategy[] = [];
    
    for (const strategyConfig of strategiesConfig) {
      const strategy = this.createAndAddStrategy(
        strategyConfig.name,
        strategyConfig.config,
        strategyConfig.weight || 1.0,
        ...(strategyConfig.args || [])
      );
      
      if (strategy) {
        addedStrategies.push(strategy);
      }
    }
    
    return addedStrategies;
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): ITradingStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Calculate comprehensive portfolio metrics from active strategies
   * TODO: Implement risk-adjusted return calculations
   * TODO: Add benchmark comparison metrics
   * TODO: Implement rolling performance windows
   */
  private calculateComprehensivePortfolioMetrics(activeStrategies: ITradingStrategy[]): any {
    if (!activeStrategies || activeStrategies.length === 0) {
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        bestStrategy: '',
        worstStrategy: '',
        averageHoldingPeriod: 0
      };
    }

    try {
      // Calculate total return (weighted by strategy allocation)
      const totalReturn = this.calculatePortfolioTotalReturn(activeStrategies);
      
      // Calculate Sharpe ratio (risk-adjusted return)
      const sharpeRatio = this.calculatePortfolioSharpeRatio(activeStrategies);
      
      // Calculate maximum drawdown
      const maxDrawdown = this.calculatePortfolioMaxDrawdown(activeStrategies);
      
      // Identify best and worst performing strategies
      const { bestStrategy, worstStrategy } = this.identifyBestWorstStrategies(activeStrategies);
      
      // Calculate average holding period across strategies
      const averageHoldingPeriod = this.calculateAverageHoldingPeriod(activeStrategies);

      return {
        totalReturn,
        sharpeRatio,
        maxDrawdown,
        bestStrategy,
        worstStrategy,
        averageHoldingPeriod
      };
    } catch (_error) {
      // Return conservative metrics on calculation error
      return {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        bestStrategy: 'Error calculating',
        worstStrategy: 'Error calculating',
        averageHoldingPeriod: 0
      };
    }
  }

  /**
   * Calculate portfolio total return
   * TODO: Implement proper position sizing and allocation weights
   */
  private calculatePortfolioTotalReturn(strategies: ITradingStrategy[]): number {
    if (strategies.length === 0) return 0;

    // Equal weight allocation for now
    const weight = 1 / strategies.length;
    
    return strategies.reduce((totalReturn, strategy) => {
      const performance = strategy.getPerformance();
      const strategyReturn = performance.totalReturn || 0;
      return totalReturn + (strategyReturn * weight);
    }, 0);
  }

  /**
   * Calculate portfolio Sharpe ratio
   * TODO: Implement proper risk-free rate integration
   */
  private calculatePortfolioSharpeRatio(strategies: ITradingStrategy[]): number {
    if (strategies.length === 0) return 0;

    const returns = strategies.map(s => s.getPerformance().totalReturn || 0);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    
    // Calculate standard deviation of returns
    const variance = returns.reduce((sum, ret) => {
      return sum + Math.pow(ret - avgReturn, 2);
    }, 0) / Math.max(1, returns.length - 1);
    
    const stdDev = Math.sqrt(variance);
    
    // Assume 2% risk-free rate for now
    const riskFreeRate = 0.02;
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  /**
   * Calculate portfolio maximum drawdown
   * TODO: Implement time-series based drawdown calculation
   */
  private calculatePortfolioMaxDrawdown(strategies: ITradingStrategy[]): number {
    if (strategies.length === 0) return 0;

    // Simplified calculation - take worst strategy's max drawdown
    return Math.min(0, ...strategies.map(strategy => {
      const performance = strategy.getPerformance();
      return performance.maxDrawdown || 0;
    }));
  }

  /**
   * Identify best and worst performing strategies
   * TODO: Implement multi-criteria performance ranking
   */
  private identifyBestWorstStrategies(strategies: ITradingStrategy[]): { bestStrategy: string; worstStrategy: string } {
    if (strategies.length === 0) {
      return { bestStrategy: '', worstStrategy: '' };
    }

    if (strategies.length === 1) {
      const strategyName = strategies[0]?.name || 'Unknown';
      return { bestStrategy: strategyName, worstStrategy: strategyName };
    }

    // Score strategies based on risk-adjusted return
    const scoredStrategies = strategies.map(strategy => {
      const performance = strategy.getPerformance();
      const totalReturn = performance.totalReturn || 0;
      const winRate = performance.winRate || 0;
      const maxDrawdown = Math.abs(performance.maxDrawdown || 0);
      
      // Composite score: return * win rate / (1 + max drawdown)
      const score = (totalReturn * winRate) / (1 + maxDrawdown);
      
      return {
        name: strategy.name || 'Unknown',
        score,
        totalReturn
      };
    });

    // Sort by score
    scoredStrategies.sort((a, b) => b.score - a.score);

    return {
      bestStrategy: scoredStrategies[0]?.name || 'Unknown',
      worstStrategy: scoredStrategies[scoredStrategies.length - 1]?.name || 'Unknown'
    };
  }

  /**
   * Calculate average holding period across strategies
   * TODO: Implement weighted average by trade frequency
   */
  private calculateAverageHoldingPeriod(strategies: ITradingStrategy[]): number {
    if (strategies.length === 0) return 0;

    const holdingPeriods = strategies.map(strategy => {
      const performance = strategy.getPerformance();
      // Use a default holding period since averageHoldingPeriod doesn't exist in StrategyPerformance
      return 1; // Default to 1 day holding period
    });

    return holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length;
  }

  /**
   * Perform intelligent signal aggregation with filtering and deduplication
   * TODO: Implement machine learning-based signal correlation analysis
   * TODO: Add dynamic confidence adjustment based on strategy performance
   * TODO: Implement signal clustering for redundancy detection
   */
  private performSignalAggregation(signals: any[]): any[] {
    if (!signals || signals.length === 0) {
      return [];
    }

    try {
      // Group signals by symbol and time proximity
      const signalGroups = this.groupSignalsBySymbolAndTime(signals);
      
      // Apply aggregation logic to each group
      const aggregatedSignals: any[] = [];
      
      for (const [_groupKey, groupSignals] of signalGroups.entries()) {
        if (groupSignals.length === 1) {
          // Single signal - pass through with confidence boost for isolation
          const signal = { ...groupSignals[0] };
          signal.confidence = Math.min(1.0, (signal.confidence || 0.5) * 1.1);
          signal.aggregation_type = 'single';
          aggregatedSignals.push(signal);
        } else {
          // Multiple signals - apply intelligent aggregation
          const mergedSignal = this.mergeConflictingSignals(groupSignals);
          mergedSignal.aggregation_type = 'merged';
          mergedSignal.signal_count = groupSignals.length;
          aggregatedSignals.push(mergedSignal);
        }
      }

      // Apply portfolio-level filters
      return this.applyPortfolioFilters(aggregatedSignals);
    } catch (_error) {
      // Fallback to simple deduplication on error
      return this.performSimpleDeduplication(signals);
    }
  }

  /**
   * Group signals by symbol and time proximity for aggregation
   * TODO: Implement configurable time windows for grouping
   */
  private groupSignalsBySymbolAndTime(signals: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    const timeWindow = 300000; // 5 minutes in milliseconds

    for (const signal of signals) {
      if (!signal || !signal.symbol) continue;

      const timestamp = signal.timestamp ? new Date(signal.timestamp).getTime() : Date.now();
      const timeSlot = Math.floor(timestamp / timeWindow) * timeWindow;
      const groupKey = `${signal.symbol}_${timeSlot}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(signal);
    }

    return groups;
  }

  /**
   * Merge conflicting signals using sophisticated conflict resolution algorithms
   * 
   * Requirements: 3.2 - Implement conflict detection between contradictory signals
   * Requirements: 3.2 - Add resolution strategies (correlation analysis, performance weighting)
   * Requirements: 3.2 - Create confidence-based voting for signal conflicts
   * Requirements: 3.2 - Log conflict resolution reasoning for transparency
   */
  private mergeConflictingSignals(signals: any[]): any {
    if (signals.length === 0) {
      throw new Error('Cannot merge empty signal array');
    }

    if (signals.length === 1) {
      return { ...signals[0] };
    }

    // Step 1: Detect conflicts between contradictory signals
    const conflicts = this.detectSignalConflicts(signals);
    
    // Step 2: Resolve conflicts if any exist
    let resolvedSignals = signals;
    if (conflicts.length > 0) {
      resolvedSignals = this.resolveSignalConflicts(signals, conflicts);
    }

    // Step 3: Aggregate remaining signals using weighted voting
    return this.aggregateResolvedSignals(resolvedSignals);
  }

  /**
   * Detect conflicts between contradictory signals
   * Requirements: 3.2 - Implement conflict detection between contradictory signals
   */
  private detectSignalConflicts(signals: any[]): Array<{ signal1: any; signal2: any; conflictType: string }> {
    const conflicts: Array<{ signal1: any; signal2: any; conflictType: string }> = [];

    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const signal1 = signals[i];
        const signal2 = signals[j];
        
        if (this.areOppositeActions(signal1.signal || signal1.action, signal2.signal || signal2.action)) {
          conflicts.push({
            signal1,
            signal2,
            conflictType: 'opposite_actions'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two signal actions are opposite (BUY vs SELL)
   */
  private areOppositeActions(action1: string, action2: string): boolean {
    const buyActions = ['BUY', 'STRONG_BUY', 'buy', 'strong_buy'];
    const sellActions = ['SELL', 'STRONG_SELL', 'sell', 'strong_sell'];
    
    return (buyActions.includes(action1) && sellActions.includes(action2)) ||
           (sellActions.includes(action1) && buyActions.includes(action2));
  }

  /**
   * Resolve signal conflicts using multiple strategies
   * Requirements: 3.2 - Add resolution strategies (correlation analysis, performance weighting)
   * Requirements: 3.2 - Create confidence-based voting for signal conflicts
   * Requirements: 3.2 - Log conflict resolution reasoning for transparency
   */
  private resolveSignalConflicts(signals: any[], conflicts: Array<{ signal1: any; signal2: any; conflictType: string }>): any[] {
    const resolvedSignals: any[] = [];
    const processedSignals = new Set<any>();

    for (const conflict of conflicts) {
      if (processedSignals.has(conflict.signal1) || processedSignals.has(conflict.signal2)) {
        continue;
      }

      const resolution = this.resolveConflictPair(conflict.signal1, conflict.signal2);
      
      if (resolution) {
        resolvedSignals.push(resolution.resolvedSignal);
        processedSignals.add(conflict.signal1);
        processedSignals.add(conflict.signal2);

        // Log conflict resolution reasoning for transparency
        console.log(`Conflict resolved: ${resolution.reasoning}`);
      }
    }

    // Add non-conflicting signals
    const nonConflictingSignals = signals.filter(signal => !processedSignals.has(signal));
    resolvedSignals.push(...nonConflictingSignals);

    return resolvedSignals;
  }

  /**
   * Resolve conflict between two specific signals
   * Requirements: 3.2 - Add resolution strategies (performance weighting, confidence voting)
   */
  private resolveConflictPair(signal1: any, signal2: any): { resolvedSignal: any; reasoning: string } | null {
    // Strategy 1: Performance weighting - choose signal from better performing strategy
    const strategy1Performance = this.getStrategyPerformance(signal1.metadata?.strategy || signal1.strategy);
    const strategy2Performance = this.getStrategyPerformance(signal2.metadata?.strategy || signal2.strategy);

    if (strategy1Performance && strategy2Performance) {
      const performanceDiff = Math.abs(strategy1Performance - strategy2Performance);
      
      if (performanceDiff > 0.1) { // Significant performance difference
        const winningSignal = strategy1Performance > strategy2Performance ? signal1 : signal2;
        const winningPerformance = Math.max(strategy1Performance, strategy2Performance);
        
        return {
          resolvedSignal: {
            ...winningSignal,
            confidence: Math.min(1.0, (winningSignal.confidence || 0.5) * 1.1),
            conflictResolution: {
              method: 'performance_weighting',
              winningStrategy: winningSignal.metadata?.strategy || winningSignal.strategy,
              performanceScore: winningPerformance
            }
          },
          reasoning: `Performance weighting: Selected ${winningSignal.signal || winningSignal.action} from ${winningSignal.metadata?.strategy || winningSignal.strategy} (performance: ${winningPerformance.toFixed(2)})`
        };
      }
    }

    // Strategy 2: Confidence-based voting - choose higher confidence signal
    const confidence1 = signal1.confidence || 0.5;
    const confidence2 = signal2.confidence || 0.5;
    const confidenceDiff = Math.abs(confidence1 - confidence2);

    if (confidenceDiff > 0.15) { // Significant confidence difference
      const winningSignal = confidence1 > confidence2 ? signal1 : signal2;
      const winningConfidence = Math.max(confidence1, confidence2);
      
      return {
        resolvedSignal: {
          ...winningSignal,
          confidence: Math.min(1.0, winningConfidence * 1.05),
          conflictResolution: {
            method: 'confidence_voting',
            winningConfidence
          }
        },
        reasoning: `Confidence voting: Selected ${winningSignal.signal || winningSignal.action} with ${(winningConfidence * 100).toFixed(1)}% confidence`
      };
    }

    // Strategy 3: Conservative fallback - default to HOLD when uncertain
    return {
      resolvedSignal: {
        ...signal1,
        signal: 'HOLD',
        action: 'HOLD',
        confidence: Math.min(confidence1, confidence2) * 0.8,
        conflictResolution: {
          method: 'conservative_fallback',
          originalSignals: [signal1.signal || signal1.action, signal2.signal || signal2.action]
        }
      },
      reasoning: `Conservative fallback: Conflicting signals with similar confidence resolved to HOLD`
    };
  }

  /**
   * Get performance score for a strategy
   */
  private getStrategyPerformance(strategyName: string): number | null {
    if (!strategyName || !this.strategies.has(strategyName)) {
      return null;
    }

    try {
      const strategy = this.strategies.get(strategyName);
      const performance = strategy?.getPerformance();
      
      if (!performance) return null;

      // Calculate composite performance score
      const winRateScore = (performance.winRate - 0.5) * 2; // Normalize around 50%
      const returnScore = Math.min(2, Math.max(-2, performance.totalReturn * 2));
      const sharpeScore = Math.min(1, Math.max(-1, performance.sharpeRatio / 2));
      
      return (winRateScore * 0.4 + returnScore * 0.4 + sharpeScore * 0.2);
    } catch {
      return null;
    }
  }

  /**
   * Aggregate resolved signals using weighted voting
   */
  private aggregateResolvedSignals(signals: any[]): any {
    const baseSignal = signals[0];
    const symbol = baseSignal.symbol;
    const timestamp = new Date().toISOString();

    // Calculate weighted averages for numerical properties
    const totalWeight = signals.reduce((sum, signal) => sum + (signal.confidence || 0.5), 0);
    
    let weightedPrice = 0;
    let weightedConfidence = 0;
    const actionCounts = new Map<string, number>();
    const strategyCounts = new Map<string, number>();

    for (const signal of signals) {
      const weight = signal.confidence || 0.5;
      
      // Weighted price calculation
      if (signal.price && typeof signal.price === 'number') {
        weightedPrice += signal.price * weight;
      }
      
      // Weighted confidence calculation
      weightedConfidence += weight * weight; // Square weighting for confidence
      
      // Count actions and strategies
      const action = signal.signal || signal.action || 'HOLD';
      actionCounts.set(action, (actionCounts.get(action) || 0) + weight);
      
      const strategy = signal.metadata?.strategy || signal.strategy || 'unknown';
      strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
    }

    // Determine consensus action (highest weighted vote)
    const consensusAction = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'HOLD';

    // Calculate final confidence based on consensus strength
    const actionConsensus = (actionCounts.get(consensusAction) || 0) / totalWeight;
    const finalConfidence = Math.min(0.95, (weightedConfidence / totalWeight) * actionConsensus);

    return {
      symbol,
      signal: consensusAction,
      action: consensusAction,
      confidence: finalConfidence,
      price: totalWeight > 0 ? weightedPrice / totalWeight : baseSignal.price,
      timestamp,
      source_signals: signals.length,
      consensus_strength: actionConsensus,
      contributing_strategies: Array.from(strategyCounts.keys()),
      reasoning: `Aggregated from ${signals.length} signals with ${(actionConsensus * 100).toFixed(1)}% consensus`,
      conflictResolutions: signals.filter(s => s.conflictResolution).map(s => s.conflictResolution)
    };
  }

  /**
   * Apply portfolio-level filters to reduce noise and improve signal quality
   * TODO: Implement position sizing constraints
   * TODO: Add risk-based filtering
   */
  private applyPortfolioFilters(signals: any[]): any[] {
    if (!signals || signals.length === 0) {
      return [];
    }

    // Filter 1: Remove low confidence signals
    const minConfidence = 0.3;
    let filteredSignals = signals.filter(signal => 
      (signal.confidence || 0) >= minConfidence
    );

    // Filter 2: Limit signals per symbol (prevent overconcentration)
    const maxSignalsPerSymbol = 3;
    const symbolCounts = new Map<string, number>();
    filteredSignals = filteredSignals.filter(signal => {
      const symbol = signal.symbol || 'unknown';
      const currentCount = symbolCounts.get(symbol) || 0;
      
      if (currentCount < maxSignalsPerSymbol) {
        symbolCounts.set(symbol, currentCount + 1);
        return true;
      }
      return false;
    });

    // Filter 3: Apply diversity filter (prefer signals from different strategies)
    filteredSignals = this.applyDiversityFilter(filteredSignals);

    // Filter 4: Boost high-consensus signals
    filteredSignals.forEach(signal => {
      if (signal.aggregation_type === 'merged' && signal.consensus_strength > 0.8) {
        signal.confidence = Math.min(0.95, (signal.confidence || 0.5) * 1.15);
        signal.boosted = true;
      }
    });

    return filteredSignals;
  }

  /**
   * Apply diversity filter to prefer signals from different strategies
   * TODO: Implement dynamic diversity weights based on strategy performance
   */
  private applyDiversityFilter(signals: any[]): any[] {
    const maxSignalsPerStrategy = 5;
    const strategyCounts = new Map<string, number>();
    
    // Sort by confidence first to prioritize best signals
    const sortedSignals = [...signals].sort((a, b) => 
      (b.confidence || 0) - (a.confidence || 0)
    );

    return sortedSignals.filter(signal => {
      const strategy = signal.strategy || 'unknown';
      const currentCount = strategyCounts.get(strategy) || 0;
      
      if (currentCount < maxSignalsPerStrategy) {
        strategyCounts.set(strategy, currentCount + 1);
        return true;
      }
      return false;
    });
  }

  /**
   * Perform simple deduplication as fallback when advanced aggregation fails
   * TODO: Implement more sophisticated fallback logic
   */
  private performSimpleDeduplication(signals: any[]): any[] {
    if (!signals || signals.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const deduplicatedSignals: any[] = [];

    for (const signal of signals) {
      if (!signal || !signal.symbol) continue;

      // Create simple deduplication key
      const key = `${signal.symbol}_${signal.action || 'HOLD'}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedSignals.push({
          ...signal,
          deduplication_applied: true
        });
      }
    }

    return deduplicatedSignals.slice(0, 50); // Limit to top 50 signals
  }
}

// Auto-register all strategies when module is imported
registerAllStrategies();