/**
 * Simple Position Sizing System
 * 
 * A simplified implementation of position sizing algorithms that integrates
 * cleanly with the existing trading workflow without complex dependencies.
 * 
 * Requirements: 3.3
 */

import { TradingSignal, SignalStrength, RiskLevel } from '../strategies/base-strategy';
import { PortfolioHolding } from './modern-portfolio-theory';

/**
 * Simple position size result
 */
export interface SimplePositionSize {
  shares: number;
  dollarAmount: number;
  portfolioPercentage: number;
  algorithm: string;
  reasoning: string;
}

/**
 * Simple portfolio for position sizing
 */
export interface SimplePortfolio {
  totalValue: number;
  availableCash: number;
  holdings: PortfolioHolding[];
}

/**
 * Position sizing configuration
 */
export interface SimplePositionSizingConfig {
  maxPositionSize: number;        // Maximum position as % of portfolio (default: 0.1 = 10%)
  maxPortfolioRisk: number;       // Maximum portfolio risk (default: 0.02 = 2%)
  kellyFraction: number;          // Kelly fraction multiplier (default: 0.25 = 25%)
  riskFreeRate: number;           // Risk-free rate (default: 0.02 = 2%)
  confidenceThreshold: number;    // Minimum confidence threshold (default: 0.6 = 60%)
}

/**
 * Simple Position Sizer
 * 
 * Implements basic position sizing algorithms without complex dependencies
 */
export class SimplePositionSizer {
  private config: SimplePositionSizingConfig;

  constructor(config?: Partial<SimplePositionSizingConfig>) {
    this.config = {
      maxPositionSize: config?.maxPositionSize ?? 0.1,
      maxPortfolioRisk: config?.maxPortfolioRisk ?? 0.02,
      kellyFraction: config?.kellyFraction ?? 0.25,
      riskFreeRate: config?.riskFreeRate ?? 0.02,
      confidenceThreshold: config?.confidenceThreshold ?? 0.6
    };
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculateKellySize(
    signal: TradingSignal,
    portfolio: SimplePortfolio,
    winRate: number = 0.6,
    averageWin: number = 0.1,
    averageLoss: number = 0.05
  ): SimplePositionSize {
    
    // Kelly formula: f = (bp - q) / b
    const b = averageWin / averageLoss; // Odds ratio
    const p = winRate; // Win probability
    const q = 1 - p; // Loss probability
    
    let kellyFraction = (b * p - q) / b;
    
    // Apply confidence and Kelly fraction limits
    kellyFraction *= (signal.confidence / 100) * this.config.kellyFraction;
    
    // Ensure within limits
    kellyFraction = Math.max(0, Math.min(kellyFraction, this.config.maxPositionSize));
    
    const dollarAmount = portfolio.totalValue * kellyFraction;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      algorithm: 'kelly',
      reasoning: `Kelly Criterion: ${(actualPercentage * 100).toFixed(2)}% allocation based on ${(winRate * 100).toFixed(1)}% win rate`
    };
  }

  /**
   * Calculate position size using risk parity
   */
  calculateRiskParitySize(
    signal: TradingSignal,
    portfolio: SimplePortfolio,
    targetRisk: number = 0.15
  ): SimplePositionSize {
    
    const numAssets = portfolio.holdings.length + 1;
    const equalRiskAllocation = targetRisk / numAssets;
    
    // Simplified volatility assumption
    const assetVolatility = 0.25; // 25% volatility assumption
    
    // Position size = Risk Budget / (Volatility * Price)
    const riskBudget = equalRiskAllocation * portfolio.totalValue;
    let shares = Math.floor(riskBudget / (assetVolatility * signal.price));
    
    // Apply maximum position constraint
    const maxShares = Math.floor((portfolio.totalValue * this.config.maxPositionSize) / signal.price);
    shares = Math.min(shares, maxShares);
    
    const dollarAmount = shares * signal.price;
    const portfolioPercentage = dollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount,
      portfolioPercentage,
      algorithm: 'risk_parity',
      reasoning: `Risk Parity: ${(portfolioPercentage * 100).toFixed(2)}% allocation for equal risk contribution`
    };
  }

  /**
   * Calculate volatility-adjusted position size
   */
  calculateVolatilityAdjustedSize(
    signal: TradingSignal,
    portfolio: SimplePortfolio,
    volatility: number = 0.2
  ): SimplePositionSize {
    
    const baseAllocation = 0.05; // 5% base allocation
    
    // Adjust for volatility (inverse relationship)
    const volatilityAdjustment = Math.min(1, 0.2 / volatility);
    
    // Adjust for signal strength
    const strengthMultiplier = this.getSignalStrengthMultiplier(signal.strength);
    
    // Adjust for confidence
    const confidenceMultiplier = signal.confidence / 100;
    
    let adjustedAllocation = baseAllocation * volatilityAdjustment * strengthMultiplier * confidenceMultiplier;
    adjustedAllocation = Math.min(adjustedAllocation, this.config.maxPositionSize);
    
    const dollarAmount = portfolio.totalValue * adjustedAllocation;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      algorithm: 'volatility_adjusted',
      reasoning: `Volatility-Adjusted: ${(actualPercentage * 100).toFixed(2)}% allocation (${(volatility * 100).toFixed(1)}% volatility)`
    };
  }

  /**
   * Calculate confidence-based position size
   */
  calculateConfidenceBasedSize(
    signal: TradingSignal,
    portfolio: SimplePortfolio,
    historicalAccuracy: number = 0.7
  ): SimplePositionSize {
    
    const baseAllocation = 0.08; // 8% base allocation
    
    // Signal confidence adjustment
    const signalConfidenceMultiplier = signal.confidence / 100;
    
    // Risk level adjustment
    const riskMultiplier = this.getRiskLevelMultiplier(signal.riskLevel);
    
    // Signal strength adjustment
    const strengthMultiplier = this.getSignalStrengthMultiplier(signal.strength);
    
    // Combined confidence score
    const combinedConfidence = signalConfidenceMultiplier * historicalAccuracy * riskMultiplier * strengthMultiplier;
    
    // Check confidence threshold
    if (combinedConfidence < this.config.confidenceThreshold) {
      return this.getMinimalPosition(signal, portfolio);
    }
    
    let allocation = baseAllocation * combinedConfidence;
    allocation = Math.min(allocation, this.config.maxPositionSize);
    
    const dollarAmount = portfolio.totalValue * allocation;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      algorithm: 'confidence_based',
      reasoning: `Confidence-Based: ${(actualPercentage * 100).toFixed(2)}% allocation (${(combinedConfidence * 100).toFixed(1)}% combined confidence)`
    };
  }

  /**
   * Enforce portfolio risk limits
   */
  enforceRiskLimits(
    positionSize: SimplePositionSize,
    portfolio: SimplePortfolio,
    maxConcentration: number = 0.2
  ): SimplePositionSize {
    
    let adjustedSize = { ...positionSize };
    const adjustments: string[] = [];

    // Check position concentration limit
    if (positionSize.portfolioPercentage > maxConcentration) {
      const oldPercentage = positionSize.portfolioPercentage;
      adjustedSize.portfolioPercentage = maxConcentration;
      adjustedSize.dollarAmount = portfolio.totalValue * adjustedSize.portfolioPercentage;
      adjustedSize.shares = Math.floor(adjustedSize.dollarAmount / (positionSize.dollarAmount / positionSize.shares));
      
      adjustments.push(`Reduced from ${(oldPercentage * 100).toFixed(2)}% to ${(adjustedSize.portfolioPercentage * 100).toFixed(2)}% due to concentration limit`);
    }

    // Update reasoning with adjustments
    if (adjustments.length > 0) {
      adjustedSize.reasoning = `${positionSize.reasoning}. Risk adjustments: ${adjustments.join('; ')}`;
    }

    return adjustedSize;
  }

  /**
   * Generate rebalancing recommendations
   */
  generateRebalancingSignals(
    portfolio: SimplePortfolio,
    targetWeights: Record<string, number>,
    rebalanceThreshold: number = 0.05
  ): Array<{
    symbol: string;
    currentWeight: number;
    targetWeight: number;
    adjustment: number;
    reason: string;
  }> {
    
    const signals: Array<{
      symbol: string;
      currentWeight: number;
      targetWeight: number;
      adjustment: number;
      reason: string;
    }> = [];

    // Check existing holdings for rebalancing needs
    for (const holding of portfolio.holdings) {
      const targetWeight = targetWeights[holding.symbol] || 0;
      const currentWeight = holding.weight;
      const adjustment = targetWeight - currentWeight;

      // Only create signal if adjustment is significant
      if (Math.abs(adjustment) > rebalanceThreshold) {
        signals.push({
          symbol: holding.symbol,
          currentWeight,
          targetWeight,
          adjustment,
          reason: adjustment > 0 
            ? `Increase position from ${(currentWeight * 100).toFixed(2)}% to ${(targetWeight * 100).toFixed(2)}%`
            : `Reduce position from ${(currentWeight * 100).toFixed(2)}% to ${(targetWeight * 100).toFixed(2)}%`
        });
      }
    }

    return signals;
  }

  // Private helper methods

  private getSignalStrengthMultiplier(strength: SignalStrength): number {
    switch (strength) {
      case SignalStrength.VERY_WEAK:
        return 0.5;
      case SignalStrength.WEAK:
        return 0.7;
      case SignalStrength.MODERATE:
        return 1.0;
      case SignalStrength.STRONG:
        return 1.3;
      case SignalStrength.VERY_STRONG:
        return 1.5;
      default:
        return 1.0;
    }
  }

  private getRiskLevelMultiplier(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW:
        return 1.2;
      case RiskLevel.LOW:
        return 1.1;
      case RiskLevel.MODERATE:
        return 1.0;
      case RiskLevel.HIGH:
        return 0.8;
      case RiskLevel.VERY_HIGH:
        return 0.6;
      default:
        return 1.0;
    }
  }

  private getMinimalPosition(signal: TradingSignal, portfolio: SimplePortfolio): SimplePositionSize {
    const minimalAllocation = 0.01; // 1% minimal allocation
    const dollarAmount = portfolio.totalValue * minimalAllocation;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      algorithm: 'minimal',
      reasoning: 'Minimal position due to low confidence'
    };
  }
}

/**
 * Enhanced trading signal with position sizing
 */
export interface EnhancedTradingSignal extends Omit<TradingSignal, 'positionSize'> {
  positionSizeRecommendation?: SimplePositionSize;
  portfolioImpact?: {
    riskIncrease: number;
    concentrationRisk: number;
  };
}

/**
 * Simple integration helper for adding position sizing to trading signals
 */
export class PositionSizingIntegration {
  private positionSizer: SimplePositionSizer;

  constructor(config?: Partial<SimplePositionSizingConfig>) {
    this.positionSizer = new SimplePositionSizer(config);
  }

  /**
   * Enhance trading signal with position sizing recommendation
   */
  enhanceSignal(
    signal: TradingSignal,
    portfolio: SimplePortfolio,
    algorithm: 'kelly' | 'risk_parity' | 'volatility_adjusted' | 'confidence_based' = 'confidence_based',
    options?: {
      winRate?: number;
      averageWin?: number;
      averageLoss?: number;
      volatility?: number;
      historicalAccuracy?: number;
    }
  ): EnhancedTradingSignal {
    
    let positionSize: SimplePositionSize;

    switch (algorithm) {
      case 'kelly':
        positionSize = this.positionSizer.calculateKellySize(
          signal,
          portfolio,
          options?.winRate,
          options?.averageWin,
          options?.averageLoss
        );
        break;
      case 'risk_parity':
        positionSize = this.positionSizer.calculateRiskParitySize(signal, portfolio);
        break;
      case 'volatility_adjusted':
        positionSize = this.positionSizer.calculateVolatilityAdjustedSize(
          signal,
          portfolio,
          options?.volatility
        );
        break;
      case 'confidence_based':
      default:
        positionSize = this.positionSizer.calculateConfidenceBasedSize(
          signal,
          portfolio,
          options?.historicalAccuracy
        );
        break;
    }

    // Apply risk limits
    positionSize = this.positionSizer.enforceRiskLimits(positionSize, portfolio);

    // Calculate portfolio impact
    const portfolioImpact = {
      riskIncrease: positionSize.portfolioPercentage * 0.2, // Simplified risk calculation
      concentrationRisk: positionSize.portfolioPercentage
    };

    return {
      ...signal,
      positionSizeRecommendation: positionSize,
      portfolioImpact
    };
  }

  /**
   * Generate position sizing recommendations for multiple signals
   */
  generateRecommendations(
    signals: TradingSignal[],
    portfolio: SimplePortfolio
  ): EnhancedTradingSignal[] {
    
    return signals.map(signal => this.enhanceSignal(signal, portfolio));
  }
}

/**
 * Factory functions
 */
export function createSimplePositionSizer(config?: Partial<SimplePositionSizingConfig>): SimplePositionSizer {
  return new SimplePositionSizer(config);
}

export function createPositionSizingIntegration(config?: Partial<SimplePositionSizingConfig>): PositionSizingIntegration {
  return new PositionSizingIntegration(config);
}