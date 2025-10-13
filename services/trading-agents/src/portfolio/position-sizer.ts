/**
 * Position Sizing System
 * 
 * This module implements advanced position sizing algorithms including:
 * - Kelly Criterion for optimal position sizing
 * - Risk parity allocation for portfolio balance
 * - Volatility-adjusted position sizing
 * - Confidence-based sizing adjustments
 * - Portfolio-level risk constraints and correlation adjustments
 * 
 * Requirements: 3.3
 */

import { z } from 'zod';
import { TradingSignal, SignalStrength, RiskLevel } from '../strategies/base-strategy';
import { PortfolioHolding, Asset } from './modern-portfolio-theory';
import { createLogger } from '../utils/enhanced-logger.js';

// Helper function for logging with metadata
function logWithMetadata(logger: any, level: string, operation: string, message: string, metadata?: any) {
  if (metadata) {
    const metadataStr = Object.entries(metadata).map(([k, v]) => `${k}=${v}`).join(', ');
    logger[level]('agent', 'position-sizer', operation, `${message} (${metadataStr})`);
  } else {
    logger[level]('agent', 'position-sizer', operation, message);
  }
}

// Position sizing schemas
export const PositionSizeSchema = z.object({
  shares: z.number().min(0),
  dollarAmount: z.number().min(0),
  portfolioPercentage: z.number().min(0).max(1),
  riskAdjustment: z.number().min(0).max(2),
  reasoning: z.string(),
  algorithm: z.enum(['kelly', 'risk_parity', 'volatility_adjusted', 'confidence_based']),
  confidence: z.number().min(0).max(1)
});

export const PortfolioRiskMetricsSchema = z.object({
  totalValue: z.number().min(0),
  totalRisk: z.number().min(0),
  concentration: z.record(z.string(), z.number()),
  correlationRisk: z.number().min(0).max(1),
  diversificationRatio: z.number().min(0),
  maxDrawdown: z.number().min(0).max(1),
  volatility: z.number().min(0)
});

export const PositionSizingConfigSchema = z.object({
  maxPositionSize: z.number().min(0).max(1).default(0.1), // 10% max position
  maxPortfolioRisk: z.number().min(0).max(1).default(0.02), // 2% max portfolio risk
  kellyFraction: z.number().min(0).max(1).default(0.25), // 25% of Kelly
  riskFreeRate: z.number().min(0).default(0.02), // 2% risk-free rate
  correlationThreshold: z.number().min(0).max(1).default(0.7), // 70% correlation threshold
  volatilityLookback: z.number().min(1).default(252), // 252 trading days
  confidenceThreshold: z.number().min(0).max(1).default(0.6), // 60% confidence threshold
  rebalanceThreshold: z.number().min(0).max(1).default(0.05) // 5% rebalance threshold
});

export type PositionSize = z.infer<typeof PositionSizeSchema>;
export type PortfolioRiskMetrics = z.infer<typeof PortfolioRiskMetricsSchema>;
export type PositionSizingConfig = z.infer<typeof PositionSizingConfigSchema>;

/**
 * Portfolio interface for position sizing
 */
export interface Portfolio {
  holdings: PortfolioHolding[];
  totalValue: number;
  availableCash: number;
  riskMetrics: PortfolioRiskMetrics;
}

/**
 * Kelly Criterion calculation parameters
 */
export interface KellyParameters {
  winRate: number; // Probability of winning trade
  averageWin: number; // Average winning trade return
  averageLoss: number; // Average losing trade return
  confidence: number; // Confidence in the signal
}

/**
 * Risk parity allocation parameters
 */
export interface RiskParityParameters {
  targetRisk: number; // Target risk contribution
  currentRisk: number; // Current portfolio risk
  assetVolatility: number; // Individual asset volatility
  correlationAdjustment: number; // Correlation-based adjustment
}

/**
 * Position Sizer Class
 * 
 * Implements multiple position sizing algorithms with portfolio-level
 * risk management and correlation adjustments.
 */
export class PositionSizer {
  protected logger = createLogger('agent', 'position-sizer');
  protected config: PositionSizingConfig;

  constructor(config?: Partial<PositionSizingConfig>) {
    this.config = PositionSizingConfigSchema.parse(config || {});
    
    logWithMetadata(this.logger, 'info', 'constructor', 'PositionSizer initialized', {
      maxPositionSize: this.config.maxPositionSize,
      maxPortfolioRisk: this.config.maxPortfolioRisk,
      kellyFraction: this.config.kellyFraction
    });
  }

  /**
   * Calculate Kelly Criterion position size
   */
  async calculateKellySize(
    signal: TradingSignal,
    portfolio: Portfolio,
    kellyParams: KellyParameters
  ): Promise<PositionSize> {
    
    this.logger.info('Calculating Kelly Criterion position size', {
      symbol: signal.symbol,
      signalType: signal.signal,
      confidence: signal.confidence,
      winRate: kellyParams.winRate
    });

    try {
      // Kelly formula: f = (bp - q) / b
      // where f = fraction to bet, b = odds, p = win probability, q = loss probability
      const { winRate, averageWin, averageLoss, confidence } = kellyParams;
      
      // Calculate Kelly fraction
      const b = Math.abs(averageWin / averageLoss); // Odds ratio
      const p = winRate; // Win probability
      const q = 1 - p; // Loss probability
      
      let kellyFraction = (b * p - q) / b;
      
      // Apply confidence adjustment
      kellyFraction *= confidence;
      
      // Apply Kelly fraction limit (typically 25% of full Kelly)
      kellyFraction *= this.config.kellyFraction;
      
      // Ensure positive and within limits
      kellyFraction = Math.max(0, Math.min(kellyFraction, this.config.maxPositionSize));
      
      // Calculate position size
      const dollarAmount = portfolio.totalValue * kellyFraction;
      const shares = Math.floor(dollarAmount / signal.price);
      const actualDollarAmount = shares * signal.price;
      const actualPercentage = actualDollarAmount / portfolio.totalValue;
      
      // Risk adjustment based on signal strength and market conditions
      const riskAdjustment = this.calculateRiskAdjustment(signal, portfolio);
      
      const positionSize: PositionSize = {
        shares,
        dollarAmount: actualDollarAmount,
        portfolioPercentage: actualPercentage,
        riskAdjustment,
        reasoning: `Kelly Criterion: ${(kellyFraction * 100).toFixed(2)}% allocation based on ${(winRate * 100).toFixed(1)}% win rate and ${confidence.toFixed(2)} confidence`,
        algorithm: 'kelly',
        confidence: confidence
      };

      this.logger.info('Kelly position size calculated', {
        symbol: signal.symbol,
        kellyFraction: kellyFraction.toFixed(4),
        shares,
        dollarAmount: actualDollarAmount.toFixed(2),
        portfolioPercentage: (actualPercentage * 100).toFixed(2) + '%'
      });

      return positionSize;

    } catch (error) {
      this.logger.error('Kelly position size calculation failed', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return conservative fallback position
      return this.getConservativeFallback(signal, portfolio);
    }
  }

  /**
   * Calculate risk parity position size
   */
  async calculateRiskParitySize(
    portfolio: Portfolio,
    newAsset: Asset,
    riskParityParams: RiskParityParameters
  ): Promise<PositionSize> {
    
    this.logger.info('Calculating risk parity position size', {
      symbol: newAsset.symbol,
      targetRisk: riskParityParams.targetRisk,
      assetVolatility: riskParityParams.assetVolatility
    });

    try {
      const { targetRisk, currentRisk, assetVolatility, correlationAdjustment } = riskParityParams;
      
      // Calculate target risk contribution for this asset
      const numAssets = portfolio.holdings.length + 1; // Including new asset
      const targetRiskContribution = targetRisk / numAssets;
      
      // Adjust for correlation with existing holdings
      const adjustedTargetRisk = targetRiskContribution * (1 - correlationAdjustment);
      
      // Calculate position size based on risk parity
      // Position size = Target Risk / (Asset Volatility * Price)
      const riskBudget = adjustedTargetRisk * portfolio.totalValue;
      const positionVolatility = assetVolatility * newAsset.current_price;
      
      let shares = Math.floor(riskBudget / positionVolatility);
      
      // Apply maximum position size constraint
      const maxShares = Math.floor((portfolio.totalValue * this.config.maxPositionSize) / newAsset.current_price);
      shares = Math.min(shares, maxShares);
      
      const dollarAmount = shares * newAsset.current_price;
      const portfolioPercentage = dollarAmount / portfolio.totalValue;
      
      // Risk adjustment
      const riskAdjustment = correlationAdjustment + (assetVolatility / 0.3); // Normalize to 30% volatility
      
      const positionSize: PositionSize = {
        shares,
        dollarAmount,
        portfolioPercentage,
        riskAdjustment,
        reasoning: `Risk Parity: ${(portfolioPercentage * 100).toFixed(2)}% allocation for equal risk contribution (${(adjustedTargetRisk * 100).toFixed(2)}% target risk)`,
        algorithm: 'risk_parity',
        confidence: 1 - correlationAdjustment // Higher confidence with lower correlation
      };

      this.logger.info('Risk parity position size calculated', {
        symbol: newAsset.symbol,
        targetRiskContribution: (targetRiskContribution * 100).toFixed(2) + '%',
        shares,
        dollarAmount: dollarAmount.toFixed(2),
        portfolioPercentage: (portfolioPercentage * 100).toFixed(2) + '%'
      });

      return positionSize;

    } catch (error) {
      this.logger.error('Risk parity position size calculation failed', {
        symbol: newAsset.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return equal weight fallback
      return this.getEqualWeightFallback(newAsset, portfolio);
    }
  }

  /**
   * Calculate volatility-adjusted position size
   */
  async calculateVolatilityAdjustedSize(
    signal: TradingSignal,
    volatility: number,
    portfolio: Portfolio
  ): Promise<PositionSize> {
    
    this.logger.info('Calculating volatility-adjusted position size', {
      symbol: signal.symbol,
      volatility: volatility.toFixed(4),
      signalStrength: signal.strength
    });

    try {
      // Base position size (e.g., 5% of portfolio)
      const baseAllocation = 0.05;
      
      // Adjust for volatility (inverse relationship)
      // Higher volatility = smaller position
      const volatilityAdjustment = Math.min(1, 0.2 / volatility); // Normalize to 20% volatility
      
      // Adjust for signal strength
      const strengthMultiplier = this.getSignalStrengthMultiplier(signal.strength);
      
      // Adjust for confidence
      const confidenceMultiplier = signal.confidence / 100;
      
      // Calculate adjusted allocation
      let adjustedAllocation = baseAllocation * volatilityAdjustment * strengthMultiplier * confidenceMultiplier;
      
      // Apply maximum position size constraint
      adjustedAllocation = Math.min(adjustedAllocation, this.config.maxPositionSize);
      
      const dollarAmount = portfolio.totalValue * adjustedAllocation;
      const shares = Math.floor(dollarAmount / signal.price);
      const actualDollarAmount = shares * signal.price;
      const actualPercentage = actualDollarAmount / portfolio.totalValue;
      
      // Risk adjustment based on volatility
      const riskAdjustment = volatility / 0.3; // Normalize to 30% volatility
      
      const positionSize: PositionSize = {
        shares,
        dollarAmount: actualDollarAmount,
        portfolioPercentage: actualPercentage,
        riskAdjustment,
        reasoning: `Volatility-Adjusted: ${(actualPercentage * 100).toFixed(2)}% allocation (${(volatility * 100).toFixed(1)}% volatility, ${signal.strength} strength)`,
        algorithm: 'volatility_adjusted',
        confidence: confidenceMultiplier
      };

      this.logger.info('Volatility-adjusted position size calculated', {
        symbol: signal.symbol,
        volatilityAdjustment: volatilityAdjustment.toFixed(4),
        strengthMultiplier: strengthMultiplier.toFixed(2),
        shares,
        dollarAmount: actualDollarAmount.toFixed(2),
        portfolioPercentage: (actualPercentage * 100).toFixed(2) + '%'
      });

      return positionSize;

    } catch (error) {
      this.logger.error('Volatility-adjusted position size calculation failed', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.getConservativeFallback(signal, portfolio);
    }
  }

  /**
   * Calculate confidence-based position size
   */
  async calculateConfidenceBasedSize(
    signal: TradingSignal,
    portfolio: Portfolio,
    historicalAccuracy?: number
  ): Promise<PositionSize> {
    
    this.logger.info('Calculating confidence-based position size', {
      symbol: signal.symbol,
      signalConfidence: signal.confidence,
      historicalAccuracy: historicalAccuracy || 'N/A'
    });

    try {
      // Base allocation
      const baseAllocation = 0.08; // 8% base allocation
      
      // Signal confidence adjustment (0-100 scale)
      const signalConfidenceMultiplier = signal.confidence / 100;
      
      // Historical accuracy adjustment (if available)
      const accuracyMultiplier = historicalAccuracy ? historicalAccuracy : 0.7; // Default 70%
      
      // Risk level adjustment
      const riskMultiplier = this.getRiskLevelMultiplier(signal.riskLevel);
      
      // Signal strength adjustment
      const strengthMultiplier = this.getSignalStrengthMultiplier(signal.strength);
      
      // Combined confidence score
      const combinedConfidence = signalConfidenceMultiplier * accuracyMultiplier * riskMultiplier * strengthMultiplier;
      
      // Only proceed if confidence meets threshold
      if (combinedConfidence < this.config.confidenceThreshold) {
        this.logger.warn('Signal confidence below threshold', {
          symbol: signal.symbol,
          combinedConfidence: combinedConfidence.toFixed(3),
          threshold: this.config.confidenceThreshold
        });
        
        return this.getMinimalPosition(signal, portfolio);
      }
      
      // Calculate position size
      let allocation = baseAllocation * combinedConfidence;
      allocation = Math.min(allocation, this.config.maxPositionSize);
      
      const dollarAmount = portfolio.totalValue * allocation;
      const shares = Math.floor(dollarAmount / signal.price);
      const actualDollarAmount = shares * signal.price;
      const actualPercentage = actualDollarAmount / portfolio.totalValue;
      
      // Risk adjustment
      const riskAdjustment = 1 / riskMultiplier; // Inverse of risk multiplier
      
      const positionSize: PositionSize = {
        shares,
        dollarAmount: actualDollarAmount,
        portfolioPercentage: actualPercentage,
        riskAdjustment,
        reasoning: `Confidence-Based: ${(actualPercentage * 100).toFixed(2)}% allocation (${(combinedConfidence * 100).toFixed(1)}% combined confidence)`,
        algorithm: 'confidence_based',
        confidence: combinedConfidence
      };

      this.logger.info('Confidence-based position size calculated', {
        symbol: signal.symbol,
        combinedConfidence: (combinedConfidence * 100).toFixed(1) + '%',
        shares,
        dollarAmount: actualDollarAmount.toFixed(2),
        portfolioPercentage: (actualPercentage * 100).toFixed(2) + '%'
      });

      return positionSize;

    } catch (error) {
      this.logger.error('Confidence-based position size calculation failed', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.getConservativeFallback(signal, portfolio);
    }
  }

  // Private helper methods

  private calculateRiskAdjustment(signal: TradingSignal, portfolio: Portfolio): number {
    // Base risk adjustment
    let adjustment = 1.0;
    
    // Adjust for signal risk level
    switch (signal.riskLevel) {
      case RiskLevel.VERY_LOW:
        adjustment *= 0.8;
        break;
      case RiskLevel.LOW:
        adjustment *= 0.9;
        break;
      case RiskLevel.MODERATE:
        adjustment *= 1.0;
        break;
      case RiskLevel.HIGH:
        adjustment *= 1.2;
        break;
      case RiskLevel.VERY_HIGH:
        adjustment *= 1.5;
        break;
    }
    
    // Adjust for portfolio concentration
    const concentration = this.calculateConcentration(portfolio);
    if (concentration > 0.3) { // If portfolio is more than 30% concentrated
      adjustment *= 1.2; // Increase risk adjustment
    }
    
    return adjustment;
  }

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

  private calculateConcentration(portfolio: Portfolio): number {
    if (portfolio.holdings.length === 0) return 0;
    
    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = portfolio.holdings.reduce((sum, holding) => {
      return sum + Math.pow(holding.weight, 2);
    }, 0);
    
    return hhi;
  }

  private getConservativeFallback(signal: TradingSignal, portfolio: Portfolio): PositionSize {
    const conservativeAllocation = 0.02; // 2% conservative allocation
    const dollarAmount = portfolio.totalValue * conservativeAllocation;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      riskAdjustment: 1.5, // Higher risk adjustment for fallback
      reasoning: 'Conservative fallback due to calculation error or high uncertainty',
      algorithm: 'kelly', // Default algorithm
      confidence: 0.3 // Low confidence
    };
  }

  private getEqualWeightFallback(asset: Asset, portfolio: Portfolio): PositionSize {
    const numAssets = portfolio.holdings.length + 1;
    const equalWeight = 1 / numAssets;
    const dollarAmount = portfolio.totalValue * equalWeight;
    const shares = Math.floor(dollarAmount / asset.current_price);
    const actualDollarAmount = shares * asset.current_price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      riskAdjustment: 1.0,
      reasoning: `Equal weight fallback: ${(actualPercentage * 100).toFixed(2)}% allocation`,
      algorithm: 'risk_parity',
      confidence: 0.5
    };
  }

  private getMinimalPosition(signal: TradingSignal, portfolio: Portfolio): PositionSize {
    const minimalAllocation = 0.01; // 1% minimal allocation
    const dollarAmount = portfolio.totalValue * minimalAllocation;
    const shares = Math.floor(dollarAmount / signal.price);
    const actualDollarAmount = shares * signal.price;
    const actualPercentage = actualDollarAmount / portfolio.totalValue;
    
    return {
      shares,
      dollarAmount: actualDollarAmount,
      portfolioPercentage: actualPercentage,
      riskAdjustment: 2.0, // High risk adjustment for minimal position
      reasoning: 'Minimal position due to low confidence',
      algorithm: 'confidence_based',
      confidence: 0.2 // Very low confidence
    };
  }
}

/**
 * Factory function for creating PositionSizer
 */
export function createPositionSizer(config?: Partial<PositionSizingConfig>): PositionSizer {
  return new PositionSizer(config);
}
/**
 * 
Portfolio Risk Manager
 * 
 * Implements portfolio-level risk management including:
 * - Portfolio risk limit enforcement
 * - Correlation-based position adjustments
 * - Portfolio rebalancing algorithms
 * - Position concentration limits and diversification rules
 */

// Additional schemas for portfolio risk management
export const PortfolioRiskLimitsSchema = z.object({
  maxPortfolioVolatility: z.number().min(0).max(1).default(0.15), // 15% max volatility
  maxConcentration: z.number().min(0).max(1).default(0.2), // 20% max single position
  maxSectorConcentration: z.number().min(0).max(1).default(0.3), // 30% max sector
  maxCorrelation: z.number().min(0).max(1).default(0.7), // 70% max correlation
  minDiversification: z.number().min(0).default(5), // Minimum 5 positions
  maxDrawdown: z.number().min(0).max(1).default(0.1), // 10% max drawdown
  varLimit: z.number().min(0).max(1).default(0.05) // 5% VaR limit
});

export const RebalanceSignalSchema = z.object({
  symbol: z.string(),
  currentWeight: z.number(),
  targetWeight: z.number(),
  adjustment: z.number(),
  reason: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  urgency: z.enum(['normal', 'urgent']),
  estimatedCost: z.number().optional()
});

export const CorrelationAdjustmentSchema = z.object({
  symbol: z.string(),
  correlationScore: z.number().min(-1).max(1),
  adjustmentFactor: z.number().min(0).max(2),
  correlatedAssets: z.array(z.string()),
  diversificationBenefit: z.number().min(0).max(1)
});

export type PortfolioRiskLimits = z.infer<typeof PortfolioRiskLimitsSchema>;
export type RebalanceSignal = z.infer<typeof RebalanceSignalSchema>;
export type CorrelationAdjustment = z.infer<typeof CorrelationAdjustmentSchema>;

/**
 * Portfolio Risk Manager Class
 * 
 * Extends PositionSizer with comprehensive portfolio-level risk management
 */
export class PortfolioRiskManager extends PositionSizer {
  private riskLimits: PortfolioRiskLimits;
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private sectorAllocations: Map<string, number> = new Map();

  constructor(
    config?: Partial<PositionSizingConfig>,
    riskLimits?: Partial<PortfolioRiskLimits>
  ) {
    super(config);
    this.riskLimits = PortfolioRiskLimitsSchema.parse(riskLimits || {});
    
    this.logger.info('PortfolioRiskManager initialized', {
      maxPortfolioVolatility: this.riskLimits.maxPortfolioVolatility,
      maxConcentration: this.riskLimits.maxConcentration,
      maxSectorConcentration: this.riskLimits.maxSectorConcentration
    });
  }

  /**
   * Enforce portfolio risk limits on proposed position
   */
  async enforceRiskLimits(
    proposedPosition: PositionSize & { symbol: string; sector?: string },
    portfolio: Portfolio
  ): Promise<PositionSize> {
    
    this.logger.info('Enforcing portfolio risk limits', {
      symbol: proposedPosition.symbol,
      proposedPercentage: (proposedPosition.portfolioPercentage * 100).toFixed(2) + '%'
    });

    try {
      let adjustedPosition = { ...proposedPosition };
      const adjustments: string[] = [];

      // 1. Check position concentration limit
      if (proposedPosition.portfolioPercentage > this.riskLimits.maxConcentration) {
        const oldPercentage = proposedPosition.portfolioPercentage;
        adjustedPosition.portfolioPercentage = this.riskLimits.maxConcentration;
        adjustedPosition.dollarAmount = portfolio.totalValue * adjustedPosition.portfolioPercentage;
        adjustedPosition.shares = Math.floor(adjustedPosition.dollarAmount / (adjustedPosition.dollarAmount / proposedPosition.shares));
        
        adjustments.push(`Reduced from ${(oldPercentage * 100).toFixed(2)}% to ${(adjustedPosition.portfolioPercentage * 100).toFixed(2)}% due to concentration limit`);
      }

      // 2. Check sector concentration limit
      if (proposedPosition.sector) {
        const currentSectorAllocation = this.calculateSectorAllocation(portfolio, proposedPosition.sector);
        const newSectorAllocation = currentSectorAllocation + adjustedPosition.portfolioPercentage;
        
        if (newSectorAllocation > this.riskLimits.maxSectorConcentration) {
          const maxAllowableIncrease = this.riskLimits.maxSectorConcentration - currentSectorAllocation;
          if (maxAllowableIncrease > 0) {
            const oldPercentage = adjustedPosition.portfolioPercentage;
            adjustedPosition.portfolioPercentage = maxAllowableIncrease;
            adjustedPosition.dollarAmount = portfolio.totalValue * adjustedPosition.portfolioPercentage;
            adjustedPosition.shares = Math.floor(adjustedPosition.dollarAmount / (adjustedPosition.dollarAmount / proposedPosition.shares));
            
            adjustments.push(`Reduced from ${(oldPercentage * 100).toFixed(2)}% to ${(adjustedPosition.portfolioPercentage * 100).toFixed(2)}% due to sector concentration limit`);
          } else {
            // Cannot add any more to this sector
            adjustedPosition.portfolioPercentage = 0;
            adjustedPosition.dollarAmount = 0;
            adjustedPosition.shares = 0;
            adjustments.push(`Position rejected due to sector concentration limit`);
          }
        }
      }

      // 3. Check portfolio volatility limit
      const projectedVolatility = await this.calculateProjectedVolatility(portfolio, adjustedPosition);
      if (projectedVolatility > this.riskLimits.maxPortfolioVolatility) {
        const volatilityReduction = this.calculateVolatilityReductionFactor(projectedVolatility);
        const oldPercentage = adjustedPosition.portfolioPercentage;
        adjustedPosition.portfolioPercentage *= volatilityReduction;
        adjustedPosition.dollarAmount = portfolio.totalValue * adjustedPosition.portfolioPercentage;
        adjustedPosition.shares = Math.floor(adjustedPosition.dollarAmount / (adjustedPosition.dollarAmount / proposedPosition.shares));
        
        adjustments.push(`Reduced from ${(oldPercentage * 100).toFixed(2)}% to ${(adjustedPosition.portfolioPercentage * 100).toFixed(2)}% due to volatility limit`);
      }

      // 4. Check minimum diversification
      const totalPositions = portfolio.holdings.length + (adjustedPosition.shares > 0 ? 1 : 0);
      if (totalPositions < this.riskLimits.minDiversification && adjustedPosition.portfolioPercentage > (1 / this.riskLimits.minDiversification)) {
        const maxAllowable = 1 / this.riskLimits.minDiversification;
        const oldPercentage = adjustedPosition.portfolioPercentage;
        adjustedPosition.portfolioPercentage = maxAllowable;
        adjustedPosition.dollarAmount = portfolio.totalValue * adjustedPosition.portfolioPercentage;
        adjustedPosition.shares = Math.floor(adjustedPosition.dollarAmount / (adjustedPosition.dollarAmount / proposedPosition.shares));
        
        adjustments.push(`Reduced from ${(oldPercentage * 100).toFixed(2)}% to ${(adjustedPosition.portfolioPercentage * 100).toFixed(2)}% to maintain diversification`);
      }

      // Update reasoning with adjustments
      if (adjustments.length > 0) {
        adjustedPosition.reasoning = `${proposedPosition.reasoning}. Risk adjustments: ${adjustments.join('; ')}`;
        adjustedPosition.riskAdjustment *= 1.2; // Increase risk adjustment for constrained positions
      }

      this.logger.info('Risk limits enforced', {
        symbol: proposedPosition.symbol,
        originalPercentage: (proposedPosition.portfolioPercentage * 100).toFixed(2) + '%',
        adjustedPercentage: (adjustedPosition.portfolioPercentage * 100).toFixed(2) + '%',
        adjustments: adjustments.length
      });

      return adjustedPosition;

    } catch (error) {
      this.logger.error('Risk limit enforcement failed', {
        symbol: proposedPosition.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return minimal position as fallback
      return {
        ...proposedPosition,
        portfolioPercentage: 0.01, // 1% minimal
        dollarAmount: portfolio.totalValue * 0.01,
        shares: Math.floor((portfolio.totalValue * 0.01) / (proposedPosition.dollarAmount / proposedPosition.shares)),
        reasoning: 'Minimal position due to risk enforcement error',
        riskAdjustment: 2.0
      };
    }
  }

  /**
   * Calculate correlation-based position adjustment
   */
  async calculateCorrelationAdjustment(
    newPosition: PositionSize & { symbol: string },
    portfolio: Portfolio
  ): Promise<CorrelationAdjustment> {
    
    this.logger.info('Calculating correlation adjustment', {
      symbol: newPosition.symbol,
      portfolioSize: portfolio.holdings.length
    });

    try {
      const correlatedAssets: string[] = [];
      let totalCorrelation = 0;
      let maxCorrelation = 0;

      // Calculate correlations with existing holdings
      for (const holding of portfolio.holdings) {
        const correlation = this.getCorrelation(newPosition.symbol, holding.symbol);
        if (Math.abs(correlation) > this.riskLimits.maxCorrelation) {
          correlatedAssets.push(holding.symbol);
        }
        totalCorrelation += Math.abs(correlation) * holding.weight;
        maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
      }

      // Calculate adjustment factor based on correlation
      let adjustmentFactor = 1.0;
      if (maxCorrelation > this.riskLimits.maxCorrelation) {
        // Reduce position size for highly correlated assets
        adjustmentFactor = 1 - (maxCorrelation - this.riskLimits.maxCorrelation);
      }

      // Calculate diversification benefit (lower correlation = higher benefit)
      const diversificationBenefit = Math.max(0, 1 - totalCorrelation);

      const correlationAdjustment: CorrelationAdjustment = {
        symbol: newPosition.symbol,
        correlationScore: totalCorrelation,
        adjustmentFactor,
        correlatedAssets,
        diversificationBenefit
      };

      this.logger.info('Correlation adjustment calculated', {
        symbol: newPosition.symbol,
        correlationScore: totalCorrelation.toFixed(3),
        adjustmentFactor: adjustmentFactor.toFixed(3),
        correlatedAssets: correlatedAssets.length,
        diversificationBenefit: (diversificationBenefit * 100).toFixed(1) + '%'
      });

      return correlationAdjustment;

    } catch (error) {
      this.logger.error('Correlation adjustment calculation failed', {
        symbol: newPosition.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return neutral adjustment
      return {
        symbol: newPosition.symbol,
        correlationScore: 0.5,
        adjustmentFactor: 1.0,
        correlatedAssets: [],
        diversificationBenefit: 0.5
      };
    }
  }

  /**
   * Generate portfolio rebalancing signals
   */
  async generateRebalancingSignals(
    portfolio: Portfolio,
    targetWeights: Record<string, number>
  ): Promise<RebalanceSignal[]> {
    
    this.logger.info('Generating rebalancing signals', {
      portfolioSize: portfolio.holdings.length,
      targetAssets: Object.keys(targetWeights).length
    });

    try {
      const rebalanceSignals: RebalanceSignal[] = [];

      // Check existing holdings for rebalancing needs
      for (const holding of portfolio.holdings) {
        const targetWeight = targetWeights[holding.symbol] || 0;
        const currentWeight = holding.weight;
        const adjustment = targetWeight - currentWeight;

        // Only create signal if adjustment is significant
        if (Math.abs(adjustment) > this.config.rebalanceThreshold) {
          const priority = this.calculateRebalancePriority(Math.abs(adjustment));
          const urgency = Math.abs(adjustment) > 0.1 ? 'urgent' : 'normal';

          rebalanceSignals.push({
            symbol: holding.symbol,
            currentWeight,
            targetWeight,
            adjustment,
            reason: this.getRebalanceReason(adjustment, currentWeight, targetWeight),
            priority,
            urgency,
            estimatedCost: this.estimateRebalanceCost(holding, adjustment)
          });
        }
      }

      // Check for new positions to add
      for (const [symbol, targetWeight] of Object.entries(targetWeights)) {
        const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
        if (!existingHolding && targetWeight > this.config.rebalanceThreshold) {
          rebalanceSignals.push({
            symbol,
            currentWeight: 0,
            targetWeight,
            adjustment: targetWeight,
            reason: `New position: Add ${(targetWeight * 100).toFixed(2)}% allocation`,
            priority: 'medium',
            urgency: 'normal'
          });
        }
      }

      // Sort by priority and urgency
      rebalanceSignals.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const urgencyOrder = { urgent: 2, normal: 1 };
        
        const aPriority = priorityOrder[a.priority] * urgencyOrder[a.urgency];
        const bPriority = priorityOrder[b.priority] * urgencyOrder[b.urgency];
        
        return bPriority - aPriority;
      });

      this.logger.info('Rebalancing signals generated', {
        totalSignals: rebalanceSignals.length,
        highPriority: rebalanceSignals.filter(s => s.priority === 'high').length,
        urgent: rebalanceSignals.filter(s => s.urgency === 'urgent').length
      });

      return rebalanceSignals;

    } catch (error) {
      this.logger.error('Rebalancing signal generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return [];
    }
  }

  /**
   * Check portfolio diversification rules
   */
  async checkDiversificationRules(portfolio: Portfolio): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    
    this.logger.info('Checking diversification rules', {
      portfolioSize: portfolio.holdings.length
    });

    const violations: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Check minimum number of positions
      if (portfolio.holdings.length < this.riskLimits.minDiversification) {
        violations.push(`Portfolio has ${portfolio.holdings.length} positions, minimum required: ${this.riskLimits.minDiversification}`);
        recommendations.push(`Add ${this.riskLimits.minDiversification - portfolio.holdings.length} more positions to improve diversification`);
      }

      // 2. Check position concentration
      for (const holding of portfolio.holdings) {
        if (holding.weight > this.riskLimits.maxConcentration) {
          violations.push(`${holding.symbol} weight ${(holding.weight * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxConcentration * 100).toFixed(2)}%`);
          recommendations.push(`Reduce ${holding.symbol} position to below ${(this.riskLimits.maxConcentration * 100).toFixed(2)}%`);
        }
      }

      // 3. Check sector concentration
      const sectorAllocations = this.calculateSectorAllocations(portfolio);
      for (const [sector, allocation] of sectorAllocations.entries()) {
        if (allocation > this.riskLimits.maxSectorConcentration) {
          violations.push(`${sector} sector allocation ${(allocation * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxSectorConcentration * 100).toFixed(2)}%`);
          recommendations.push(`Reduce ${sector} sector exposure or diversify into other sectors`);
        }
      }

      // 4. Check correlation concentration
      const highCorrelationPairs = this.findHighCorrelationPairs(portfolio);
      if (highCorrelationPairs.length > 0) {
        violations.push(`Found ${highCorrelationPairs.length} highly correlated position pairs`);
        recommendations.push('Consider reducing positions in highly correlated assets');
      }

      const compliant = violations.length === 0;

      this.logger.info('Diversification rules checked', {
        compliant,
        violations: violations.length,
        recommendations: recommendations.length
      });

      return {
        compliant,
        violations,
        recommendations
      };

    } catch (error) {
      this.logger.error('Diversification rule check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        compliant: false,
        violations: ['Error checking diversification rules'],
        recommendations: ['Review portfolio manually']
      };
    }
  }

  // Private helper methods for portfolio risk management

  private calculateSectorAllocation(portfolio: Portfolio, sector: string): number {
    return portfolio.holdings
      .filter(holding => holding.sector === sector)
      .reduce((sum, holding) => sum + holding.weight, 0);
  }

  private calculateSectorAllocations(portfolio: Portfolio): Map<string, number> {
    const sectorAllocations = new Map<string, number>();
    
    for (const holding of portfolio.holdings) {
      if (holding.sector) {
        const currentAllocation = sectorAllocations.get(holding.sector) || 0;
        sectorAllocations.set(holding.sector, currentAllocation + holding.weight);
      }
    }
    
    return sectorAllocations;
  }

  private async calculateProjectedVolatility(
    portfolio: Portfolio,
    newPosition: PositionSize & { symbol: string }
  ): Promise<number> {
    // Simplified portfolio volatility calculation
    // In practice, this would use covariance matrix and historical data
    
    let portfolioVariance = 0;
    const totalWeight = portfolio.holdings.reduce((sum, h) => sum + h.weight, 0) + newPosition.portfolioPercentage;
    
    // Add variance from existing holdings
    for (const holding of portfolio.holdings) {
      const weight = holding.weight / totalWeight;
      const volatility = 0.2; // Placeholder - would use actual volatility data
      portfolioVariance += Math.pow(weight * volatility, 2);
    }
    
    // Add variance from new position
    const newWeight = newPosition.portfolioPercentage / totalWeight;
    const newVolatility = 0.25; // Placeholder - would use actual volatility data
    portfolioVariance += Math.pow(newWeight * newVolatility, 2);
    
    // Add covariance terms (simplified)
    const avgCorrelation = 0.3; // Placeholder
    for (const holding of portfolio.holdings) {
      const weight1 = holding.weight / totalWeight;
      const weight2 = newWeight;
      const vol1 = 0.2;
      const vol2 = newVolatility;
      portfolioVariance += 2 * weight1 * weight2 * vol1 * vol2 * avgCorrelation;
    }
    
    return Math.sqrt(portfolioVariance);
  }

  private calculateVolatilityReductionFactor(projectedVolatility: number): number {
    return this.riskLimits.maxPortfolioVolatility / projectedVolatility;
  }

  private getCorrelation(symbol1: string, symbol2: string): number {
    // Placeholder correlation calculation
    // In practice, this would use historical price data
    const correlations = this.correlationMatrix.get(symbol1);
    if (correlations) {
      return correlations.get(symbol2) || 0;
    }
    
    // Return random correlation for demonstration
    return Math.random() * 0.8 - 0.4; // Range: -0.4 to 0.4
  }

  private calculateRebalancePriority(adjustmentMagnitude: number): 'low' | 'medium' | 'high' {
    if (adjustmentMagnitude > 0.15) return 'high';
    if (adjustmentMagnitude > 0.08) return 'medium';
    return 'low';
  }

  private getRebalanceReason(adjustment: number, currentWeight: number, targetWeight: number): string {
    if (adjustment > 0) {
      return `Increase position from ${(currentWeight * 100).toFixed(2)}% to ${(targetWeight * 100).toFixed(2)}%`;
    } else {
      return `Reduce position from ${(currentWeight * 100).toFixed(2)}% to ${(targetWeight * 100).toFixed(2)}%`;
    }
  }

  private estimateRebalanceCost(holding: PortfolioHolding, adjustment: number): number {
    // Simplified cost estimation
    const tradingCost = 0.001; // 0.1% trading cost
    const adjustmentValue = Math.abs(adjustment) * holding.current_price * holding.quantity;
    return adjustmentValue * tradingCost;
  }

  private findHighCorrelationPairs(portfolio: Portfolio): Array<{ symbol1: string; symbol2: string; correlation: number }> {
    const pairs: Array<{ symbol1: string; symbol2: string; correlation: number }> = [];
    
    for (let i = 0; i < portfolio.holdings.length; i++) {
      for (let j = i + 1; j < portfolio.holdings.length; j++) {
        const symbol1 = portfolio.holdings[i].symbol;
        const symbol2 = portfolio.holdings[j].symbol;
        const correlation = Math.abs(this.getCorrelation(symbol1, symbol2));
        
        if (correlation > this.riskLimits.maxCorrelation) {
          pairs.push({ symbol1, symbol2, correlation });
        }
      }
    }
    
    return pairs;
  }
}

/**
 * Factory function for creating PortfolioRiskManager
 */
export function createPortfolioRiskManager(
  config?: Partial<PositionSizingConfig>,
  riskLimits?: Partial<PortfolioRiskLimits>
): PortfolioRiskManager {
  return new PortfolioRiskManager(config, riskLimits);
}