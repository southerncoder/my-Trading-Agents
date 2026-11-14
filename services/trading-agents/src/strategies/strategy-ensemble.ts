/**
 * Strategy Ensemble System
 * 
 * This module implements advanced strategy ensemble capabilities including:
 * - Multi-strategy signal aggregation with confidence weighting
 * - Correlation analysis to remove redundant signals
 * - Machine learning-based signal fusion algorithms
 * - Consensus strength calculation for aggregated signals
 * - Conflict resolution between contradictory signals
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import {
  ITradingStrategy,
  TradingSignal,
  SignalType,
  SignalStrength,
  RiskLevel,
  MarketData,
  StrategyPerformance
} from './base-strategy';
import { TradingAgentsConfig } from '../config';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Enhanced trading signal with ensemble metadata
 */
export interface EnsembleSignal extends TradingSignal {
  contributingStrategies: string[];
  confidenceWeights: Record<string, number>;
  consensusStrength: number;
  conflictResolution?: ConflictResolution;
  correlationScore?: number;
  ensembleWeight?: number;
}

/**
 * Conflict resolution information
 */
export interface ConflictResolution {
  method: 'correlation_analysis' | 'performance_weighting' | 'confidence_voting' | 'ml_fusion';
  originalSignals: TradingSignal[];
  resolution: TradingSignal;
  reasoning: string;
  confidenceAdjustment: number;
}

/**
 * Strategy weight information for ensemble management
 */
export interface StrategyWeight {
  strategyId: string;
  weight: number;
  performanceScore: number;
  correlationPenalty: number;
  lastUpdated: Date;
  rollingPerformance: number[];
}

/**
 * Signal correlation analysis result
 */
export interface SignalCorrelation {
  signal1: TradingSignal;
  signal2: TradingSignal;
  correlationScore: number;
  redundancyLevel: 'low' | 'medium' | 'high';
  shouldMerge: boolean;
}

/**
 * Ensemble voting configuration
 */
export interface VotingConfig {
  method: 'weighted_average' | 'majority_vote' | 'confidence_threshold' | 'ml_fusion';
  confidenceThreshold: number;
  correlationThreshold: number;
  maxSignalsPerSymbol: number;
  enableConflictResolution: boolean;
}

/**
 * Strategy Ensemble Class
 * 
 * Manages multiple trading strategies and provides intelligent signal aggregation,
 * conflict resolution, and dynamic weight management.
 */
export class StrategyEnsemble {
  private strategies: Map<string, ITradingStrategy> = new Map();
  private strategyWeights: Map<string, StrategyWeight> = new Map();
  private performanceHistory: Map<string, StrategyPerformance[]> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private votingConfig: VotingConfig;
  private logger = createLogger('agent', 'strategy-ensemble');

  constructor(
    private tradingConfig: TradingAgentsConfig,
    votingConfig?: Partial<VotingConfig>
  ) {
    this.votingConfig = {
      method: 'weighted_average',
      confidenceThreshold: 0.6,
      correlationThreshold: 0.7,
      maxSignalsPerSymbol: 3,
      enableConflictResolution: true,
      ...votingConfig
    };

    this.logger.info('ensemble-initialized', 'Strategy ensemble initialized', {
      votingMethod: this.votingConfig.method,
      confidenceThreshold: this.votingConfig.confidenceThreshold,
      correlationThreshold: this.votingConfig.correlationThreshold
    });
  }

  /**
   * Add strategy to the ensemble with initial weight
   */
  addStrategy(strategy: ITradingStrategy, initialWeight: number = 1.0): void {
    const strategyId = strategy.name;
    
    if (this.strategies.has(strategyId)) {
      this.logger.warn('strategy-exists', 'Strategy already exists in ensemble', {
        strategyId,
        existingWeight: this.strategyWeights.get(strategyId)?.weight
      });
      return;
    }

    this.strategies.set(strategyId, strategy);
    
    const strategyWeight: StrategyWeight = {
      strategyId,
      weight: Math.max(0.1, Math.min(2.0, initialWeight)), // Clamp between 0.1 and 2.0
      performanceScore: 1.0,
      correlationPenalty: 0.0,
      lastUpdated: new Date(),
      rollingPerformance: []
    };
    
    this.strategyWeights.set(strategyId, strategyWeight);
    this.performanceHistory.set(strategyId, []);

    this.logger.info('strategy-added', 'Strategy added to ensemble', {
      strategyId,
      initialWeight,
      totalStrategies: this.strategies.size
    });
  }

  /**
   * Remove strategy from the ensemble
   */
  removeStrategy(strategyId: string): boolean {
    const removed = this.strategies.delete(strategyId);
    this.strategyWeights.delete(strategyId);
    this.performanceHistory.delete(strategyId);
    
    // Remove from correlation matrix
    this.correlationMatrix.delete(strategyId);
    for (const [_, correlations] of this.correlationMatrix) {
      correlations.delete(strategyId);
    }

    if (removed) {
      this.logger.info('strategy-removed', 'Strategy removed from ensemble', {
        strategyId,
        remainingStrategies: this.strategies.size
      });
    }

    return removed;
  }

  /**
   * Get all active strategies in the ensemble
   */
  getActiveStrategies(): ITradingStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy => 
      strategy.config.enabled && this.strategyWeights.get(strategy.name)!.weight > 0.1
    );
  }

  /**
   * Aggregate signals from all active strategies using ensemble voting
   * 
   * Requirements: 3.1 - Implement signal aggregation and voting
   */
  async aggregateSignals(
    symbol: string,
    marketData: MarketData[],
    currentPosition?: number
  ): Promise<EnsembleSignal[]> {
    const activeStrategies = this.getActiveStrategies();
    
    if (activeStrategies.length === 0) {
      this.logger.warn('no-active-strategies', 'No active strategies for signal aggregation', {
        symbol,
        totalStrategies: this.strategies.size
      });
      return [];
    }

    try {
      // Collect signals from all active strategies
      const allSignals = await this.collectSignalsFromStrategies(
        activeStrategies,
        marketData,
        currentPosition
      );

      if (allSignals.length === 0) {
        return [];
      }

      // Filter signals by symbol
      const symbolSignals = allSignals.filter(signal => signal.symbol === symbol);
      
      if (symbolSignals.length === 0) {
        return [];
      }

      // Perform correlation analysis to identify redundant signals
      const correlationAnalysis = this.analyzeSignalCorrelations(symbolSignals);
      
      // Remove redundant signals based on correlation
      const filteredSignals = this.removeRedundantSignals(symbolSignals, correlationAnalysis);

      // Apply ensemble voting mechanism
      const aggregatedSignals = await this.performEnsembleVoting(filteredSignals);

      // Apply consensus strength calculation
      const finalSignals = this.calculateConsensusStrength(aggregatedSignals);

      this.logger.info('signals-aggregated', 'Successfully aggregated ensemble signals', {
        symbol,
        originalSignals: symbolSignals.length,
        filteredSignals: filteredSignals.length,
        finalSignals: finalSignals.length,
        votingMethod: this.votingConfig.method
      });

      return finalSignals.slice(0, this.votingConfig.maxSignalsPerSymbol);

    } catch (error) {
      this.logger.error('aggregation-error', 'Error during signal aggregation', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
        activeStrategies: activeStrategies.length
      });
      return [];
    }
  }

  /**
   * Collect signals from all active strategies
   */
  private async collectSignalsFromStrategies(
    strategies: ITradingStrategy[],
    marketData: MarketData[],
    currentPosition?: number
  ): Promise<TradingSignal[]> {
    const allSignals: TradingSignal[] = [];
    const signalPromises = strategies.map(async (strategy) => {
      try {
        const signals = await strategy.analyze(marketData, currentPosition);
        const weight = this.strategyWeights.get(strategy.name)?.weight || 1.0;
        
        // Apply strategy weight to signal confidence
        return signals.map(signal => ({
          ...signal,
          confidence: Math.min(100, signal.confidence * weight),
          metadata: {
            ...signal.metadata,
            strategy: strategy.name,
            strategyWeight: weight,
            originalConfidence: signal.confidence
          }
        }));
      } catch (error) {
        this.logger.error('strategy-signal-error', 'Error collecting signals from strategy', {
          strategy: strategy.name,
          error: error instanceof Error ? error.message : String(error)
        });
        return [];
      }
    });

    const signalResults = await Promise.all(signalPromises);
    signalResults.forEach(signals => allSignals.push(...signals));

    return allSignals;
  }

  /**
   * Analyze correlations between signals to identify redundancy
   * 
   * Requirements: 3.1 - Implement correlation analysis to remove redundant signals
   */
  private analyzeSignalCorrelations(signals: TradingSignal[]): SignalCorrelation[] {
    const correlations: SignalCorrelation[] = [];

    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const signal1 = signals[i]!;
        const signal2 = signals[j]!;
        
        const correlationScore = this.calculateSignalCorrelation(signal1, signal2);
        
        let redundancyLevel: 'low' | 'medium' | 'high' = 'low';
        if (correlationScore >= 0.8) redundancyLevel = 'high';
        else if (correlationScore >= 0.6) redundancyLevel = 'medium';
        
        const shouldMerge = correlationScore >= this.votingConfig.correlationThreshold;

        correlations.push({
          signal1,
          signal2,
          correlationScore,
          redundancyLevel,
          shouldMerge
        });
      }
    }

    return correlations.sort((a, b) => b.correlationScore - a.correlationScore);
  }

  /**
   * Calculate correlation score between two signals
   */
  private calculateSignalCorrelation(signal1: TradingSignal, signal2: TradingSignal): number {
    let correlation = 0;

    // Signal type correlation (40% weight)
    if (signal1.signal === signal2.signal) {
      correlation += 0.4;
    } else if (this.areOppositeSignals(signal1.signal, signal2.signal)) {
      correlation -= 0.4; // Negative correlation for opposite signals
    }

    // Price correlation (20% weight)
    const priceDiff = Math.abs(signal1.price - signal2.price) / Math.max(signal1.price, signal2.price);
    correlation += (1 - Math.min(1, priceDiff * 10)) * 0.2;

    // Confidence correlation (20% weight)
    const confidenceDiff = Math.abs(signal1.confidence - signal2.confidence) / 100;
    correlation += (1 - confidenceDiff) * 0.2;

    // Timing correlation (20% weight)
    const timeDiff = Math.abs(signal1.timestamp.getTime() - signal2.timestamp.getTime());
    const maxTimeDiff = 5 * 60 * 1000; // 5 minutes
    correlation += Math.max(0, (1 - timeDiff / maxTimeDiff)) * 0.2;

    return Math.max(-1, Math.min(1, correlation));
  }

  /**
   * Check if two signals are opposite (BUY vs SELL)
   */
  private areOppositeSignals(signal1: SignalType, signal2: SignalType): boolean {
    const buySignals = [SignalType.BUY, SignalType.STRONG_BUY];
    const sellSignals = [SignalType.SELL, SignalType.STRONG_SELL];
    
    return (buySignals.includes(signal1) && sellSignals.includes(signal2)) ||
           (sellSignals.includes(signal1) && buySignals.includes(signal2));
  }

  /**
   * Remove redundant signals based on correlation analysis
   */
  private removeRedundantSignals(
    signals: TradingSignal[],
    correlations: SignalCorrelation[]
  ): TradingSignal[] {
    const signalsToRemove = new Set<TradingSignal>();
    
    for (const correlation of correlations) {
      if (correlation.shouldMerge && !signalsToRemove.has(correlation.signal1) && !signalsToRemove.has(correlation.signal2)) {
        // Keep the signal with higher confidence, remove the other
        if (correlation.signal1.confidence >= correlation.signal2.confidence) {
          signalsToRemove.add(correlation.signal2);
        } else {
          signalsToRemove.add(correlation.signal1);
        }
      }
    }

    const filteredSignals = signals.filter(signal => !signalsToRemove.has(signal));
    
    this.logger.debug('redundancy-removal', 'Removed redundant signals', {
      originalCount: signals.length,
      removedCount: signalsToRemove.size,
      finalCount: filteredSignals.length,
      correlationThreshold: this.votingConfig.correlationThreshold
    });

    return filteredSignals;
  }

  /**
   * Perform ensemble voting to aggregate signals
   * 
   * Requirements: 3.1 - Create ensemble voting mechanism with confidence weighting
   */
  private async performEnsembleVoting(signals: TradingSignal[]): Promise<EnsembleSignal[]> {
    if (signals.length === 0) return [];

    switch (this.votingConfig.method) {
      case 'weighted_average':
        return this.performWeightedAverageVoting(signals);
      case 'majority_vote':
        return this.performMajorityVoting(signals);
      case 'confidence_threshold':
        return this.performConfidenceThresholdVoting(signals);
      case 'ml_fusion':
        return this.performMLFusionVoting(signals);
      default:
        return this.performWeightedAverageVoting(signals);
    }
  }

  /**
   * Weighted average voting implementation
   */
  private performWeightedAverageVoting(signals: TradingSignal[]): EnsembleSignal[] {
    const signalGroups = this.groupSignalsByType(signals);
    const ensembleSignals: EnsembleSignal[] = [];

    for (const [signalType, groupSignals] of signalGroups.entries()) {
      if (groupSignals.length === 0) continue;

      const totalWeight = groupSignals.reduce((sum, signal) => {
        const strategyWeight = this.strategyWeights.get(signal.metadata?.strategy || '')?.weight || 1.0;
        return sum + (signal.confidence / 100) * strategyWeight;
      }, 0);

      let weightedPrice = 0;
      let weightedConfidence = 0;
      const contributingStrategies: string[] = [];
      const confidenceWeights: Record<string, number> = {};

      for (const signal of groupSignals) {
        const strategyName = signal.metadata?.strategy || 'unknown';
        const strategyWeight = this.strategyWeights.get(strategyName)?.weight || 1.0;
        const signalWeight = (signal.confidence / 100) * strategyWeight;
        
        weightedPrice += signal.price * signalWeight;
        weightedConfidence += signal.confidence * signalWeight;
        
        if (!contributingStrategies.includes(strategyName)) {
          contributingStrategies.push(strategyName);
        }
        confidenceWeights[strategyName] = signalWeight;
      }

      if (totalWeight > 0) {
        const ensembleSignal: EnsembleSignal = {
          ...groupSignals[0]!, // Use first signal as template
          signal: signalType,
          price: weightedPrice / totalWeight,
          confidence: Math.min(100, weightedConfidence / totalWeight),
          contributingStrategies,
          confidenceWeights,
          consensusStrength: 0, // Will be calculated later
          timestamp: new Date(),
          reasoning: `Ensemble weighted average from ${contributingStrategies.length} strategies: ${contributingStrategies.join(', ')}`,
          metadata: {
            ensembleMethod: 'weighted_average',
            totalWeight,
            signalCount: groupSignals.length,
            originalSignals: groupSignals.map(s => ({
              strategy: s.metadata?.strategy,
              confidence: s.confidence,
              price: s.price
            }))
          }
        };

        ensembleSignals.push(ensembleSignal);
      }
    }

    return ensembleSignals;
  }

  /**
   * Majority voting implementation
   */
  private performMajorityVoting(signals: TradingSignal[]): EnsembleSignal[] {
    const signalGroups = this.groupSignalsByType(signals);
    const ensembleSignals: EnsembleSignal[] = [];

    // Find the signal type with the most votes
    let maxVotes = 0;
    let majoritySignalType: SignalType | null = null;
    
    for (const [signalType, groupSignals] of signalGroups.entries()) {
      if (groupSignals.length > maxVotes) {
        maxVotes = groupSignals.length;
        majoritySignalType = signalType;
      }
    }

    if (majoritySignalType && maxVotes > 0) {
      const majoritySignals = signalGroups.get(majoritySignalType)!;
      
      // Calculate average price and confidence
      const avgPrice = majoritySignals.reduce((sum, s) => sum + s.price, 0) / majoritySignals.length;
      const avgConfidence = majoritySignals.reduce((sum, s) => sum + s.confidence, 0) / majoritySignals.length;
      
      const contributingStrategies = majoritySignals.map(s => s.metadata?.strategy || 'unknown');
      const confidenceWeights: Record<string, number> = {};
      
      majoritySignals.forEach(signal => {
        const strategyName = signal.metadata?.strategy || 'unknown';
        confidenceWeights[strategyName] = signal.confidence / 100;
      });

      const ensembleSignal: EnsembleSignal = {
        ...majoritySignals[0]!,
        signal: majoritySignalType,
        price: avgPrice,
        confidence: avgConfidence,
        contributingStrategies,
        confidenceWeights,
        consensusStrength: maxVotes / signals.length,
        timestamp: new Date(),
        reasoning: `Majority vote: ${maxVotes}/${signals.length} strategies agree on ${majoritySignalType}`,
        metadata: {
          ensembleMethod: 'majority_vote',
          totalVotes: signals.length,
          majorityVotes: maxVotes,
          consensusRatio: maxVotes / signals.length
        }
      };

      ensembleSignals.push(ensembleSignal);
    }

    return ensembleSignals;
  }

  /**
   * Confidence threshold voting implementation
   */
  private performConfidenceThresholdVoting(signals: TradingSignal[]): EnsembleSignal[] {
    const highConfidenceSignals = signals.filter(
      signal => signal.confidence >= this.votingConfig.confidenceThreshold * 100
    );

    if (highConfidenceSignals.length === 0) {
      return [];
    }

    return this.performWeightedAverageVoting(highConfidenceSignals);
  }

  /**
   * Machine learning fusion voting implementation
   * 
   * Requirements: 3.1 - Add machine learning-based signal fusion algorithms
   */
  private performMLFusionVoting(signals: TradingSignal[]): EnsembleSignal[] {
    // Simplified ML fusion using feature-based weighting
    // In a full implementation, this would use trained ML models
    
    const features = signals.map(signal => this.extractSignalFeatures(signal));
    const weights = this.calculateMLWeights(features);
    
    // Apply ML weights to signals
    const weightedSignals = signals.map((signal, index) => ({
      ...signal,
      confidence: signal.confidence * weights[index]!
    }));

    return this.performWeightedAverageVoting(weightedSignals);
  }

  /**
   * Extract features from signal for ML processing
   */
  private extractSignalFeatures(signal: TradingSignal): number[] {
    return [
      signal.confidence / 100,
      signal.strength / 5, // Normalize strength to 0-1
      signal.price,
      this.strategyWeights.get(signal.metadata?.strategy || '')?.performanceScore || 1.0,
      signal.timestamp.getTime() / 1000000000 // Normalize timestamp
    ];
  }

  /**
   * Calculate ML-based weights for signals
   */
  private calculateMLWeights(features: number[][]): number[] {
    // Simplified ML weighting based on feature analysis
    // In production, this would use a trained model
    
    return features.map(feature => {
      const confidence = feature[0] || 0.5;
      const strength = feature[1] || 0.5;
      const performance = feature[3] || 1.0;
      
      // Simple weighted combination
      return (confidence * 0.4 + strength * 0.3 + performance * 0.3);
    });
  }

  /**
   * Group signals by signal type
   */
  private groupSignalsByType(signals: TradingSignal[]): Map<SignalType, TradingSignal[]> {
    const groups = new Map<SignalType, TradingSignal[]>();
    
    for (const signal of signals) {
      if (!groups.has(signal.signal)) {
        groups.set(signal.signal, []);
      }
      groups.get(signal.signal)!.push(signal);
    }
    
    return groups;
  }

  /**
   * Calculate consensus strength for aggregated signals
   * 
   * Requirements: 3.1 - Build consensus strength calculation for aggregated signals
   */
  private calculateConsensusStrength(signals: EnsembleSignal[]): EnsembleSignal[] {
    return signals.map(signal => {
      const totalStrategies = this.getActiveStrategies().length;
      const contributingCount = signal.contributingStrategies.length;
      
      // Base consensus from strategy participation
      let consensusStrength = contributingCount / Math.max(1, totalStrategies);
      
      // Adjust for confidence alignment
      const confidenceValues = Object.values(signal.confidenceWeights);
      const avgConfidence = confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
      const confidenceVariance = confidenceValues.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidenceValues.length;
      
      // Lower variance = higher consensus
      const confidenceConsensus = Math.max(0, 1 - confidenceVariance);
      
      // Combine consensus measures
      consensusStrength = (consensusStrength * 0.7) + (confidenceConsensus * 0.3);
      
      // Boost consensus for high-confidence unanimous signals
      if (contributingCount === totalStrategies && signal.confidence >= 80) {
        consensusStrength = Math.min(1.0, consensusStrength * 1.2);
      }

      return {
        ...signal,
        consensusStrength: Math.max(0, Math.min(1, consensusStrength))
      };
    });
  }

  /**
   * Resolve conflicts between contradictory signals
   * 
   * Requirements: 3.2 - Implement conflict detection between contradictory signals
   */
  async resolveConflicts(signals: TradingSignal[]): Promise<TradingSignal[]> {
    if (!this.votingConfig.enableConflictResolution || signals.length <= 1) {
      return signals;
    }

    const conflicts = this.detectConflicts(signals);
    
    if (conflicts.length === 0) {
      return signals;
    }

    const resolvedSignals: TradingSignal[] = [];
    const processedSignals = new Set<TradingSignal>();

    for (const conflict of conflicts) {
      if (processedSignals.has(conflict.signal1) || processedSignals.has(conflict.signal2)) {
        continue;
      }

      const resolution = await this.resolveConflict(conflict.signal1, conflict.signal2);
      
      if (resolution) {
        resolvedSignals.push(resolution.resolution);
        processedSignals.add(conflict.signal1);
        processedSignals.add(conflict.signal2);

        this.logger.info('conflict-resolved', 'Signal conflict resolved', {
          method: resolution.method,
          signal1Type: conflict.signal1.signal,
          signal2Type: conflict.signal2.signal,
          resolutionType: resolution.resolution.signal,
          reasoning: resolution.reasoning
        });
      }
    }

    // Add non-conflicting signals
    const nonConflictingSignals = signals.filter(signal => !processedSignals.has(signal));
    resolvedSignals.push(...nonConflictingSignals);

    return resolvedSignals;
  }

  /**
   * Detect conflicts between signals
   */
  private detectConflicts(signals: TradingSignal[]): Array<{ signal1: TradingSignal; signal2: TradingSignal }> {
    const conflicts: Array<{ signal1: TradingSignal; signal2: TradingSignal }> = [];

    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const signal1 = signals[i]!;
        const signal2 = signals[j]!;
        
        if (this.areOppositeSignals(signal1.signal, signal2.signal)) {
          conflicts.push({ signal1, signal2 });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflict between two contradictory signals
   * 
   * Requirements: 3.2 - Add resolution strategies (correlation analysis, performance weighting)
   */
  private async resolveConflict(
    signal1: TradingSignal,
    signal2: TradingSignal
  ): Promise<ConflictResolution | null> {
    try {
      // Try performance weighting first
      const performanceResolution = this.resolveByPerformanceWeighting(signal1, signal2);
      if (performanceResolution) {
        return performanceResolution;
      }

      // Fall back to confidence voting
      const confidenceResolution = this.resolveByConfidenceVoting(signal1, signal2);
      if (confidenceResolution) {
        return confidenceResolution;
      }

      // Final fallback to correlation analysis
      return this.resolveByCorrelationAnalysis(signal1, signal2);

    } catch (error) {
      this.logger.error('conflict-resolution-error', 'Error resolving signal conflict', {
        signal1Type: signal1.signal,
        signal2Type: signal2.signal,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Resolve conflict using performance weighting
   * 
   * Requirements: 3.2 - Add resolution strategies (performance weighting)
   */
  private resolveByPerformanceWeighting(
    signal1: TradingSignal,
    signal2: TradingSignal
  ): ConflictResolution | null {
    const strategy1 = signal1.metadata?.strategy;
    const strategy2 = signal2.metadata?.strategy;

    if (!strategy1 || !strategy2) {
      return null;
    }

    const weight1 = this.strategyWeights.get(strategy1);
    const weight2 = this.strategyWeights.get(strategy2);

    if (!weight1 || !weight2) {
      return null;
    }

    const performance1 = weight1.performanceScore;
    const performance2 = weight2.performanceScore;

    // Choose signal from better performing strategy
    const winningSignal = performance1 >= performance2 ? signal1 : signal2;
    const losingSignal = performance1 >= performance2 ? signal2 : signal1;
    const winningPerformance = Math.max(performance1, performance2);
    const losingPerformance = Math.min(performance1, performance2);

    // Adjust confidence based on performance difference
    const performanceDiff = winningPerformance - losingPerformance;
    const confidenceAdjustment = Math.min(20, performanceDiff * 10);

    const resolvedSignal: TradingSignal = {
      ...winningSignal,
      confidence: Math.min(100, winningSignal.confidence + confidenceAdjustment),
      reasoning: `Conflict resolved by performance weighting: ${winningSignal.metadata?.strategy} (performance: ${winningPerformance.toFixed(2)}) vs ${losingSignal.metadata?.strategy} (performance: ${losingPerformance.toFixed(2)})`
    };

    return {
      method: 'performance_weighting',
      originalSignals: [signal1, signal2],
      resolution: resolvedSignal,
      reasoning: `Selected ${winningSignal.signal} from ${winningSignal.metadata?.strategy} based on superior performance (${winningPerformance.toFixed(2)} vs ${losingPerformance.toFixed(2)})`,
      confidenceAdjustment
    };
  }

  /**
   * Resolve conflict using confidence voting
   * 
   * Requirements: 3.2 - Create confidence-based voting for signal conflicts
   */
  private resolveByConfidenceVoting(
    signal1: TradingSignal,
    signal2: TradingSignal
  ): ConflictResolution | null {
    const confidenceDiff = Math.abs(signal1.confidence - signal2.confidence);
    
    // Only resolve if there's a significant confidence difference
    if (confidenceDiff < 10) {
      return null;
    }

    const winningSignal = signal1.confidence >= signal2.confidence ? signal1 : signal2;
    const losingSignal = signal1.confidence >= signal2.confidence ? signal2 : signal1;

    // Boost confidence slightly for winning the conflict
    const confidenceBoost = Math.min(10, confidenceDiff * 0.2);

    const resolvedSignal: TradingSignal = {
      ...winningSignal,
      confidence: Math.min(100, winningSignal.confidence + confidenceBoost),
      reasoning: `Conflict resolved by confidence voting: ${winningSignal.confidence}% vs ${losingSignal.confidence}%`
    };

    return {
      method: 'confidence_voting',
      originalSignals: [signal1, signal2],
      resolution: resolvedSignal,
      reasoning: `Selected ${winningSignal.signal} based on higher confidence (${winningSignal.confidence}% vs ${losingSignal.confidence}%)`,
      confidenceAdjustment: confidenceBoost
    };
  }

  /**
   * Resolve conflict using correlation analysis
   * 
   * Requirements: 3.2 - Add resolution strategies (correlation analysis)
   */
  private resolveByCorrelationAnalysis(
    signal1: TradingSignal,
    signal2: TradingSignal
  ): ConflictResolution | null {
    const strategy1 = signal1.metadata?.strategy;
    const strategy2 = signal2.metadata?.strategy;

    if (!strategy1 || !strategy2) {
      return null;
    }

    // Get historical correlation between strategies
    const correlation = this.getStrategyCorrelation(strategy1, strategy2);
    
    if (correlation === null || Math.abs(correlation) < 0.3) {
      // Low correlation - use conservative approach (HOLD)
      const resolvedSignal: TradingSignal = {
        ...signal1,
        signal: SignalType.HOLD,
        confidence: Math.min(signal1.confidence, signal2.confidence) * 0.8,
        reasoning: `Conflict resolved by correlation analysis: Low correlation (${correlation?.toFixed(2) || 'unknown'}) between strategies, defaulting to HOLD`
      };

      return {
        method: 'correlation_analysis',
        originalSignals: [signal1, signal2],
        resolution: resolvedSignal,
        reasoning: `Low correlation between strategies (${correlation?.toFixed(2) || 'unknown'}), resolved to conservative HOLD position`,
        confidenceAdjustment: -20
      };
    }

    // High correlation - choose signal from more recent strategy
    const weight1 = this.strategyWeights.get(strategy1);
    const weight2 = this.strategyWeights.get(strategy2);
    
    if (!weight1 || !weight2) {
      return null;
    }

    const winningSignal = weight1.lastUpdated >= weight2.lastUpdated ? signal1 : signal2;
    const correlationBoost = Math.abs(correlation) * 10; // Boost confidence based on correlation strength

    const resolvedSignal: TradingSignal = {
      ...winningSignal,
      confidence: Math.min(100, winningSignal.confidence + correlationBoost),
      reasoning: `Conflict resolved by correlation analysis: High correlation (${correlation.toFixed(2)}) between strategies`
    };

    return {
      method: 'correlation_analysis',
      originalSignals: [signal1, signal2],
      resolution: resolvedSignal,
      reasoning: `High correlation (${correlation.toFixed(2)}) between strategies, selected more recent signal from ${winningSignal.metadata?.strategy}`,
      confidenceAdjustment: correlationBoost
    };
  }

  /**
   * Get correlation between two strategies
   */
  private getStrategyCorrelation(strategy1: string, strategy2: string): number | null {
    const correlations1 = this.correlationMatrix.get(strategy1);
    if (!correlations1) {
      return null;
    }
    return correlations1.get(strategy2) || null;
  }

  /**
   * Update strategy weights based on performance data
   * 
   * Requirements: 3.5 - Implement performance-based weight adjustment algorithms
   */
  async updateWeights(performanceData: StrategyPerformance[]): Promise<void> {
    if (performanceData.length === 0) {
      this.logger.warn('no-performance-data', 'No performance data provided for weight update');
      return;
    }

    try {
      // Update performance history for each strategy
      for (const performance of performanceData) {
        const strategyName = this.findStrategyNameByPerformance(performance);
        if (strategyName && this.performanceHistory.has(strategyName)) {
          const history = this.performanceHistory.get(strategyName)!;
          history.push(performance);
          
          // Keep only last 50 performance records for rolling analysis
          if (history.length > 50) {
            history.splice(0, history.length - 50);
          }
        }
      }

      // Recalculate weights for all strategies
      await this.recalculateAllWeights();

      this.logger.info('weights-updated', 'Strategy weights updated based on performance', {
        strategiesUpdated: performanceData.length,
        totalStrategies: this.strategies.size
      });

    } catch (error) {
      this.logger.error('weight-update-error', 'Error updating strategy weights', {
        error: error instanceof Error ? error.message : String(error),
        performanceDataCount: performanceData.length
      });
    }
  }

  /**
   * Find strategy name by matching performance data
   */
  private findStrategyNameByPerformance(performance: StrategyPerformance): string | null {
    // In a real implementation, this would match based on strategy ID or other identifier
    // For now, we'll use the first strategy that matches the performance timestamp
    for (const [strategyName, strategy] of this.strategies) {
      const strategyPerformance = strategy.getPerformance();
      if (Math.abs(strategyPerformance.lastUpdated.getTime() - performance.lastUpdated.getTime()) < 60000) {
        return strategyName;
      }
    }
    return null;
  }

  /**
   * Recalculate weights for all strategies based on performance
   * 
   * Requirements: 3.5 - Add rolling performance window analysis for strategy evaluation
   */
  private async recalculateAllWeights(): Promise<void> {
    const activeStrategies = Array.from(this.strategies.keys());
    
    for (const strategyName of activeStrategies) {
      const newWeight = await this.calculateDynamicWeight(strategyName);
      const strategyWeight = this.strategyWeights.get(strategyName);
      
      if (strategyWeight && newWeight !== null) {
        // Update weight with smoothing to prevent dramatic changes
        const smoothingFactor = 0.3;
        const smoothedWeight = (strategyWeight.weight * (1 - smoothingFactor)) + (newWeight * smoothingFactor);
        
        strategyWeight.weight = Math.max(0.1, Math.min(2.0, smoothedWeight));
        strategyWeight.lastUpdated = new Date();
        
        this.logger.debug('weight-recalculated', 'Strategy weight recalculated', {
          strategy: strategyName,
          oldWeight: strategyWeight.weight,
          newWeight: smoothedWeight,
          performanceScore: strategyWeight.performanceScore
        });
      }
    }
  }

  /**
   * Calculate dynamic weight for a strategy based on multiple factors
   * 
   * Requirements: 3.5 - Create automatic rebalancing based on strategy performance degradation
   */
  private async calculateDynamicWeight(strategyName: string): Promise<number | null> {
    const strategy = this.strategies.get(strategyName);
    const strategyWeight = this.strategyWeights.get(strategyName);
    const performanceHistory = this.performanceHistory.get(strategyName);

    if (!strategy || !strategyWeight || !performanceHistory || performanceHistory.length === 0) {
      return null;
    }

    try {
      // Factor 1: Recent performance (40% weight)
      const recentPerformanceScore = this.calculateRecentPerformanceScore(performanceHistory);
      
      // Factor 2: Performance consistency (30% weight)
      const consistencyScore = this.calculateConsistencyScore(performanceHistory);
      
      // Factor 3: Risk-adjusted returns (20% weight)
      const riskAdjustedScore = this.calculateRiskAdjustedScore(performanceHistory);
      
      // Factor 4: Correlation penalty (10% weight)
      const correlationPenalty = await this.calculateCorrelationPenalty(strategyName);

      // Combine factors into final weight
      const baseWeight = (
        recentPerformanceScore * 0.4 +
        consistencyScore * 0.3 +
        riskAdjustedScore * 0.2
      );

      const finalWeight = Math.max(0.1, baseWeight * (1 - correlationPenalty * 0.1));

      // Update performance score in strategy weight
      strategyWeight.performanceScore = baseWeight;
      strategyWeight.correlationPenalty = correlationPenalty;

      return finalWeight;

    } catch (error) {
      this.logger.error('weight-calculation-error', 'Error calculating dynamic weight', {
        strategy: strategyName,
        error: error instanceof Error ? error.message : String(error)
      });
      return 1.0; // Default weight on error
    }
  }

  /**
   * Calculate recent performance score using rolling windows
   * 
   * Requirements: 3.5 - Add rolling performance window analysis for strategy evaluation
   */
  private calculateRecentPerformanceScore(performanceHistory: StrategyPerformance[]): number {
    if (performanceHistory.length === 0) return 1.0;

    // Use different rolling windows for analysis
    const windows = [5, 10, 20]; // Last 5, 10, 20 performance records
    let weightedScore = 0;
    let totalWeight = 0;

    for (const windowSize of windows) {
      const windowData = performanceHistory.slice(-windowSize);
      if (windowData.length === 0) continue;

      // Calculate average metrics for this window
      const avgReturn = windowData.reduce((sum, p) => sum + p.totalReturn, 0) / windowData.length;
      const avgWinRate = windowData.reduce((sum, p) => sum + p.winRate, 0) / windowData.length;
      const avgSharpe = windowData.reduce((sum, p) => sum + (p.sharpeRatio || 0), 0) / windowData.length;

      // Combine metrics into window score
      const returnScore = Math.max(0, Math.min(2, avgReturn * 5 + 1)); // Normalize around 1
      const winRateScore = avgWinRate * 2; // 0-2 scale
      const sharpeScore = Math.max(0, Math.min(2, avgSharpe + 1)); // Normalize around 1

      const windowScore = (returnScore * 0.4 + winRateScore * 0.4 + sharpeScore * 0.2);
      
      // Weight recent windows more heavily
      const weight = windowSize === 5 ? 0.5 : windowSize === 10 ? 0.3 : 0.2;
      weightedScore += windowScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 1.0;
  }

  /**
   * Calculate performance consistency score
   */
  private calculateConsistencyScore(performanceHistory: StrategyPerformance[]): number {
    if (performanceHistory.length < 3) return 1.0;

    // Calculate variance in returns and win rates
    const returns = performanceHistory.map(p => p.totalReturn);
    const winRates = performanceHistory.map(p => p.winRate);

    const returnVariance = this.calculateVariance(returns);
    const winRateVariance = this.calculateVariance(winRates);

    // Lower variance = higher consistency = higher score
    const returnConsistency = Math.max(0, 1 - returnVariance * 10);
    const winRateConsistency = Math.max(0, 1 - winRateVariance * 10);

    return (returnConsistency * 0.6 + winRateConsistency * 0.4);
  }

  /**
   * Calculate risk-adjusted performance score
   */
  private calculateRiskAdjustedScore(performanceHistory: StrategyPerformance[]): number {
    if (performanceHistory.length === 0) return 1.0;

    const latest = performanceHistory[performanceHistory.length - 1]!;
    
    // Use Sharpe ratio as primary risk-adjusted metric
    const sharpeScore = Math.max(0, Math.min(2, (latest.sharpeRatio || 0) + 1));
    
    // Penalize high drawdowns
    const drawdownPenalty = Math.max(0, Math.abs(latest.maxDrawdown || 0) * 5);
    
    // Reward high profit factors
    const profitFactorBonus = Math.min(0.5, (latest.profitFactor || 1) - 1);

    return Math.max(0.1, sharpeScore - drawdownPenalty + profitFactorBonus);
  }

  /**
   * Calculate correlation penalty for strategy
   */
  private async calculateCorrelationPenalty(strategyName: string): Promise<number> {
    const correlations = this.correlationMatrix.get(strategyName);
    if (!correlations || correlations.size === 0) {
      return 0; // No penalty if no correlations available
    }

    // Calculate average correlation with other strategies
    const correlationValues = Array.from(correlations.values());
    const avgCorrelation = correlationValues.reduce((sum, corr) => sum + Math.abs(corr), 0) / correlationValues.length;

    // Higher correlation = higher penalty
    return Math.min(1.0, avgCorrelation);
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Rebalance ensemble weights based on performance degradation
   * 
   * Requirements: 3.5 - Create automatic rebalancing based on strategy performance degradation
   */
  async rebalanceWeights(performanceThreshold: number = 0.5): Promise<void> {
    const activeStrategies = this.getActiveStrategies();
    const rebalanceActions: Array<{ strategy: string; oldWeight: number; newWeight: number; reason: string }> = [];

    try {
      for (const strategy of activeStrategies) {
        const strategyWeight = this.strategyWeights.get(strategy.name);
        if (!strategyWeight) continue;

        const performanceHistory = this.performanceHistory.get(strategy.name);
        if (!performanceHistory || performanceHistory.length < 5) continue;

        // Check for performance degradation
        const recentPerformance = this.calculateRecentPerformanceScore(performanceHistory);
        
        if (recentPerformance < performanceThreshold) {
          // Performance degradation detected - reduce weight
          const oldWeight = strategyWeight.weight;
          const degradationFactor = recentPerformance / performanceThreshold;
          const newWeight = Math.max(0.1, oldWeight * degradationFactor);
          
          strategyWeight.weight = newWeight;
          strategyWeight.lastUpdated = new Date();

          rebalanceActions.push({
            strategy: strategy.name,
            oldWeight,
            newWeight,
            reason: `Performance degradation: ${(recentPerformance * 100).toFixed(1)}% < ${(performanceThreshold * 100).toFixed(1)}%`
          });

        } else if (recentPerformance > 1.2 && strategyWeight.weight < 1.5) {
          // Strong performance - increase weight
          const oldWeight = strategyWeight.weight;
          const performanceBoost = Math.min(1.2, recentPerformance);
          const newWeight = Math.min(2.0, oldWeight * performanceBoost);
          
          strategyWeight.weight = newWeight;
          strategyWeight.lastUpdated = new Date();

          rebalanceActions.push({
            strategy: strategy.name,
            oldWeight,
            newWeight,
            reason: `Strong performance: ${(recentPerformance * 100).toFixed(1)}% > 120%`
          });
        }
      }

      // Normalize weights to ensure they sum to reasonable total
      await this.normalizeWeights();

      if (rebalanceActions.length > 0) {
        this.logger.info('weights-rebalanced', 'Ensemble weights rebalanced', {
          rebalanceActions,
          performanceThreshold,
          totalStrategies: activeStrategies.length
        });
      }

    } catch (error) {
      this.logger.error('rebalance-error', 'Error during weight rebalancing', {
        error: error instanceof Error ? error.message : String(error),
        performanceThreshold
      });
    }
  }

  /**
   * Normalize weights to ensure reasonable distribution
   */
  private async normalizeWeights(): Promise<void> {
    const weights = Array.from(this.strategyWeights.values());
    if (weights.length === 0) return;

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const targetTotal = weights.length; // Target average weight of 1.0

    if (Math.abs(totalWeight - targetTotal) > 0.5) {
      const normalizationFactor = targetTotal / totalWeight;
      
      for (const weight of weights) {
        weight.weight = Math.max(0.1, Math.min(2.0, weight.weight * normalizationFactor));
        weight.lastUpdated = new Date();
      }

      this.logger.debug('weights-normalized', 'Strategy weights normalized', {
        oldTotal: totalWeight,
        newTotal: targetTotal,
        normalizationFactor
      });
    }
  }

  /**
   * Get strategy weights for external access
   */
  getStrategyWeights(): Map<string, StrategyWeight> {
    return new Map(this.strategyWeights);
  }

  /**
   * Get ensemble statistics
   */
  getEnsembleStats(): {
    totalStrategies: number;
    activeStrategies: number;
    averageWeight: number;
    weightVariance: number;
    lastUpdated: Date;
  } {
    const activeStrategies = this.getActiveStrategies();
    const weights = Array.from(this.strategyWeights.values()).map(w => w.weight);
    
    const averageWeight = weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 0;
    const weightVariance = this.calculateVariance(weights);
    
    const lastUpdated = Array.from(this.strategyWeights.values())
      .reduce((latest, w) => w.lastUpdated > latest ? w.lastUpdated : latest, new Date(0));

    return {
      totalStrategies: this.strategies.size,
      activeStrategies: activeStrategies.length,
      averageWeight,
      weightVariance,
      lastUpdated
    };
  }

  /**
   * Integrate with existing learning system for adaptive weighting
   * 
   * Requirements: 3.5 - Integrate with existing learning system for adaptive weighting
   */
  async integrateWithLearningSystem(learningData: {
    marketConditions: Record<string, any>;
    strategyPerformance: Map<string, number>;
    adaptationSignals: Array<{ strategy: string; adaptation: string; confidence: number }>;
  }): Promise<void> {
    try {
      // Update correlation matrix based on learning data
      await this.updateCorrelationMatrix(learningData.strategyPerformance);
      
      // Apply adaptive weight adjustments based on market conditions
      await this.applyAdaptiveWeightAdjustments(learningData.marketConditions, learningData.strategyPerformance);
      
      // Process adaptation signals from learning system
      await this.processAdaptationSignals(learningData.adaptationSignals);

      this.logger.info('learning-integration', 'Successfully integrated with learning system', {
        marketConditions: Object.keys(learningData.marketConditions).length,
        strategyPerformanceCount: learningData.strategyPerformance.size,
        adaptationSignalsCount: learningData.adaptationSignals.length
      });

    } catch (error) {
      this.logger.error('learning-integration-error', 'Error integrating with learning system', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update correlation matrix based on strategy performance
   */
  private async updateCorrelationMatrix(strategyPerformance: Map<string, number>): Promise<void> {
    const strategies = Array.from(strategyPerformance.keys());
    
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const strategy1 = strategies[i]!;
        const strategy2 = strategies[j]!;
        
        const performance1 = strategyPerformance.get(strategy1) || 0;
        const performance2 = strategyPerformance.get(strategy2) || 0;
        
        // Calculate correlation based on performance similarity
        const performanceDiff = Math.abs(performance1 - performance2);
        const correlation = Math.max(-1, Math.min(1, 1 - performanceDiff * 2));
        
        // Update correlation matrix
        if (!this.correlationMatrix.has(strategy1)) {
          this.correlationMatrix.set(strategy1, new Map());
        }
        if (!this.correlationMatrix.has(strategy2)) {
          this.correlationMatrix.set(strategy2, new Map());
        }
        
        this.correlationMatrix.get(strategy1)!.set(strategy2, correlation);
        this.correlationMatrix.get(strategy2)!.set(strategy1, correlation);
      }
    }
  }

  /**
   * Apply adaptive weight adjustments based on market conditions
   */
  private async applyAdaptiveWeightAdjustments(
    marketConditions: Record<string, any>,
    strategyPerformance: Map<string, number>
  ): Promise<void> {
    // Analyze market regime and adjust weights accordingly
    const marketVolatility = marketConditions.volatility || 0.5;
    const marketTrend = marketConditions.trend || 'neutral';
    
    for (const [strategyName, performance] of strategyPerformance) {
      const strategyWeight = this.strategyWeights.get(strategyName);
      if (!strategyWeight) continue;

      let adjustment = 1.0;

      // Adjust based on market volatility
      if (marketVolatility > 0.7) {
        // High volatility - favor momentum strategies
        if (strategyName.includes('momentum') || strategyName.includes('breakout')) {
          adjustment *= 1.2;
        } else if (strategyName.includes('mean_reversion')) {
          adjustment *= 0.8;
        }
      } else if (marketVolatility < 0.3) {
        // Low volatility - favor mean reversion strategies
        if (strategyName.includes('mean_reversion')) {
          adjustment *= 1.2;
        } else if (strategyName.includes('momentum')) {
          adjustment *= 0.8;
        }
      }

      // Adjust based on market trend
      if (marketTrend === 'bullish' && strategyName.includes('momentum')) {
        adjustment *= 1.1;
      } else if (marketTrend === 'bearish' && strategyName.includes('defensive')) {
        adjustment *= 1.1;
      }

      // Apply performance-based adjustment
      adjustment *= (1 + performance * 0.2);

      // Update weight with adjustment
      const newWeight = Math.max(0.1, Math.min(2.0, strategyWeight.weight * adjustment));
      strategyWeight.weight = newWeight;
      strategyWeight.lastUpdated = new Date();
    }
  }

  /**
   * Process adaptation signals from learning system
   */
  private async processAdaptationSignals(
    adaptationSignals: Array<{ strategy: string; adaptation: string; confidence: number }>
  ): Promise<void> {
    for (const signal of adaptationSignals) {
      const strategyWeight = this.strategyWeights.get(signal.strategy);
      if (!strategyWeight) continue;

      let adjustment = 1.0;

      switch (signal.adaptation) {
        case 'increase_weight':
          adjustment = 1 + (signal.confidence * 0.3);
          break;
        case 'decrease_weight':
          adjustment = 1 - (signal.confidence * 0.3);
          break;
        case 'pause_strategy':
          adjustment = 0.1; // Minimum weight
          break;
        case 'boost_strategy':
          adjustment = 1 + (signal.confidence * 0.5);
          break;
        default:
          continue;
      }

      const newWeight = Math.max(0.1, Math.min(2.0, strategyWeight.weight * adjustment));
      strategyWeight.weight = newWeight;
      strategyWeight.lastUpdated = new Date();

      this.logger.debug('adaptation-signal-processed', 'Processed adaptation signal', {
        strategy: signal.strategy,
        adaptation: signal.adaptation,
        confidence: signal.confidence,
        oldWeight: strategyWeight.weight,
        newWeight,
        adjustment
      });
    }
  }
}
