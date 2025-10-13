/**
 * Position Sizing Integration with Trading Workflow
 * 
 * This module integrates the position sizing system with the existing
 * 4-phase trading workflow (Intelligence → Research → Risk → Trading).
 * 
 * Integration points:
 * - Phase 3 (Risk Management): Portfolio risk assessment and constraints
 * - Phase 4 (Trading): Position sizing recommendations for trading signals
 * - Portfolio Manager: Position approval and portfolio-level risk management
 * 
 * Requirements: 6.3
 */

import { TradingSignal, StrategyPerformance } from '../strategies/base-strategy';
import { AgentState } from '../types/agent-states';
import { 
  PositionSizer, 
  PortfolioRiskManager, 
  PositionSize, 
  Portfolio, 
  KellyParameters, 
  RiskParityParameters,
  PositionSizingConfig,
  PortfolioRiskLimits,
  RebalanceSignal,
  CorrelationAdjustment
} from './position-sizer';
import { Asset, PortfolioHolding } from './modern-portfolio-theory';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Enhanced trading signal with position sizing recommendations
 */
export interface EnhancedTradingSignal extends TradingSignal {
  positionSizeRecommendation?: PositionSize;
  riskAdjustment?: number;
  portfolioImpact?: {
    projectedVolatility: number;
    correlationRisk: number;
    concentrationRisk: number;
  };
}

/**
 * Position sizing context for workflow integration
 */
export interface PositionSizingContext {
  portfolio: Portfolio;
  availableCash: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: 'short' | 'medium' | 'long';
  marketConditions: 'bull' | 'bear' | 'sideways' | 'volatile';
}

/**
 * Position sizing recommendation with workflow context
 */
export interface PositionSizingRecommendation {
  signal: EnhancedTradingSignal;
  positionSize: PositionSize;
  riskAssessment: {
    portfolioRisk: number;
    concentrationRisk: number;
    correlationRisk: number;
    liquidityRisk: number;
  };
  approvalRequired: boolean;
  reasoning: string;
  alternatives?: PositionSize[];
}

/**
 * Portfolio update result from position sizing
 */
export interface PortfolioUpdateResult {
  success: boolean;
  updatedPortfolio: Portfolio;
  rebalanceSignals: RebalanceSignal[];
  riskMetrics: {
    totalRisk: number;
    diversificationRatio: number;
    maxDrawdown: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Position Sizing Workflow Integration
 * 
 * Integrates position sizing algorithms with the existing trading workflow
 */
export class PositionSizingWorkflowIntegration {
  private positionSizer: PositionSizer;
  private riskManager: PortfolioRiskManager;
  private logger = createLogger('agent', 'position-sizing-integration');

  constructor(
    config?: Partial<PositionSizingConfig>,
    riskLimits?: Partial<PortfolioRiskLimits>
  ) {
    this.positionSizer = new PositionSizer(config);
    this.riskManager = new PortfolioRiskManager(config, riskLimits);
    
    this.logger.info('PositionSizingWorkflowIntegration initialized', {
      hasPositionSizer: !!this.positionSizer,
      hasRiskManager: !!this.riskManager
    });
  }

  /**
   * Enhance trading signal with position sizing recommendation
   * Called during Phase 4 (Trading) to add position sizing to signals
   */
  async enhanceTradingSignal(
    signal: TradingSignal,
    context: PositionSizingContext,
    historicalPerformance?: StrategyPerformance
  ): Promise<EnhancedTradingSignal> {
    
    this.logger.info('Enhancing trading signal with position sizing', {
      symbol: signal.symbol,
      signalType: signal.signal,
      confidence: signal.confidence,
      riskTolerance: context.riskTolerance
    });

    try {
      // Calculate position size using appropriate algorithm based on context
      const positionSize = await this.calculateOptimalPositionSize(
        signal,
        context,
        historicalPerformance
      );

      // Calculate portfolio impact
      const portfolioImpact = await this.calculatePortfolioImpact(signal, context.portfolio, positionSize);

      // Create enhanced signal
      const enhancedSignal: EnhancedTradingSignal = {
        ...signal,
        positionSizeRecommendation: positionSize,
        riskAdjustment: positionSize.riskAdjustment,
        portfolioImpact
      };

      this.logger.info('Trading signal enhanced successfully', {
        symbol: signal.symbol,
        recommendedSize: positionSize.portfolioPercentage,
        algorithm: positionSize.algorithm,
        confidence: positionSize.confidence
      });

      return enhancedSignal;

    } catch (error) {
      this.logger.error('Failed to enhance trading signal', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return original signal with minimal enhancement
      return {
        ...signal,
        positionSizeRecommendation: {
          shares: 0,
          dollarAmount: 0,
          portfolioPercentage: 0.01, // 1% fallback
          riskAdjustment: 2.0,
          reasoning: 'Fallback due to position sizing error',
          algorithm: 'kelly',
          confidence: 0.3
        }
      };
    }
  }

  /**
   * Generate position sizing recommendation for Portfolio Manager approval
   * Called during Phase 3 (Risk Management) for portfolio-level decisions
   */
  async generatePositionRecommendation(
    signal: TradingSignal,
    context: PositionSizingContext,
    historicalPerformance?: StrategyPerformance
  ): Promise<PositionSizingRecommendation> {
    
    this.logger.info('Generating position sizing recommendation', {
      symbol: signal.symbol,
      portfolioValue: context.portfolio.totalValue,
      availableCash: context.availableCash
    });

    try {
      // Enhance the signal first
      const enhancedSignal = await this.enhanceTradingSignal(signal, context, historicalPerformance);
      
      if (!enhancedSignal.positionSizeRecommendation) {
        throw new Error('Failed to generate position size recommendation');
      }

      // Apply portfolio-level risk constraints
      const constrainedPosition = await this.riskManager.enforceRiskLimits(
        { ...enhancedSignal.positionSizeRecommendation, symbol: signal.symbol },
        context.portfolio
      );

      // Calculate risk assessment
      const riskAssessment = await this.calculateRiskAssessment(
        signal,
        constrainedPosition,
        context.portfolio
      );

      // Determine if approval is required
      const approvalRequired = this.requiresApproval(constrainedPosition, riskAssessment, context);

      // Generate alternative position sizes
      const alternatives = await this.generateAlternatives(signal, context, historicalPerformance);

      const recommendation: PositionSizingRecommendation = {
        signal: enhancedSignal,
        positionSize: constrainedPosition,
        riskAssessment,
        approvalRequired,
        reasoning: this.generateRecommendationReasoning(constrainedPosition, riskAssessment, context),
        alternatives
      };

      this.logger.info('Position sizing recommendation generated', {
        symbol: signal.symbol,
        recommendedPercentage: (constrainedPosition.portfolioPercentage * 100).toFixed(2) + '%',
        approvalRequired,
        alternativesCount: alternatives.length
      });

      return recommendation;

    } catch (error) {
      this.logger.error('Failed to generate position recommendation', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Update portfolio with new position and generate rebalancing signals
   * Called after position approval to update portfolio state
   */
  async updatePortfolioWithPosition(
    recommendation: PositionSizingRecommendation,
    currentPortfolio: Portfolio
  ): Promise<PortfolioUpdateResult> {
    
    this.logger.info('Updating portfolio with new position', {
      symbol: recommendation.signal.symbol,
      positionSize: recommendation.positionSize.portfolioPercentage,
      currentHoldings: currentPortfolio.holdings.length
    });

    try {
      const warnings: string[] = [];
      const errors: string[] = [];

      // Create new holding
      const newHolding: PortfolioHolding = {
        symbol: recommendation.signal.symbol,
        quantity: recommendation.positionSize.shares,
        average_cost: recommendation.signal.price,
        current_price: recommendation.signal.price,
        weight: recommendation.positionSize.portfolioPercentage,
        sector: (recommendation.signal.metadata as any)?.sector,
        country: (recommendation.signal.metadata as any)?.country
      };

      // Update portfolio
      const updatedHoldings = [...currentPortfolio.holdings, newHolding];
      
      // Recalculate weights to ensure they sum to 1
      const totalValue = updatedHoldings.reduce((sum, holding) => 
        sum + (holding.quantity * holding.current_price), 0
      );
      
      updatedHoldings.forEach(holding => {
        holding.weight = (holding.quantity * holding.current_price) / totalValue;
      });

      const updatedPortfolio: Portfolio = {
        ...currentPortfolio,
        holdings: updatedHoldings,
        totalValue: totalValue,
        availableCash: currentPortfolio.availableCash - recommendation.positionSize.dollarAmount
      };

      // Check if rebalancing is needed
      const targetWeights = this.calculateTargetWeights(updatedPortfolio);
      const rebalanceSignals = await this.riskManager.generateRebalancingSignals(
        updatedPortfolio,
        targetWeights
      );

      // Calculate updated risk metrics
      const riskMetrics = await this.calculatePortfolioRiskMetrics(updatedPortfolio);

      // Check for warnings
      if (rebalanceSignals.length > 0) {
        warnings.push(`${rebalanceSignals.length} rebalancing signals generated`);
      }

      if (riskMetrics.totalRisk > 0.15) {
        warnings.push('Portfolio risk exceeds 15% threshold');
      }

      const result: PortfolioUpdateResult = {
        success: true,
        updatedPortfolio,
        rebalanceSignals,
        riskMetrics,
        warnings,
        errors
      };

      this.logger.info('Portfolio updated successfully', {
        symbol: recommendation.signal.symbol,
        newTotalValue: totalValue.toFixed(2),
        newHoldingsCount: updatedHoldings.length,
        rebalanceSignals: rebalanceSignals.length,
        warnings: warnings.length
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to update portfolio', {
        symbol: recommendation.signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        updatedPortfolio: currentPortfolio,
        rebalanceSignals: [],
        riskMetrics: {
          totalRisk: 0,
          diversificationRatio: 0,
          maxDrawdown: 0
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Integration with Agent State for workflow compatibility
   */
  async integrateWithAgentState(
    state: AgentState,
    signals: TradingSignal[]
  ): Promise<Partial<AgentState>> {
    
    this.logger.info('Integrating position sizing with agent state', {
      company: state.company_of_interest,
      signalsCount: signals.length
    });

    try {
      // Extract portfolio context from state
      const context = this.extractPortfolioContext(state);
      
      // Enhance all signals with position sizing
      const enhancedSignals: EnhancedTradingSignal[] = [];
      const recommendations: PositionSizingRecommendation[] = [];

      for (const signal of signals) {
        const enhancedSignal = await this.enhanceTradingSignal(signal, context);
        const recommendation = await this.generatePositionRecommendation(signal, context);
        
        enhancedSignals.push(enhancedSignal);
        recommendations.push(recommendation);
      }

      // Update state with position sizing information
      const positionSizingData = {
        enhancedSignals,
        recommendations,
        portfolioContext: context,
        riskAssessment: await this.generatePortfolioRiskAssessment(context.portfolio)
      };

      this.logger.info('Position sizing integrated with agent state', {
        enhancedSignals: enhancedSignals.length,
        recommendations: recommendations.length,
        approvalRequired: recommendations.filter(r => r.approvalRequired).length
      });

      return {
        // Add position sizing data to state metadata
        metadata: {
          ...state.metadata,
          positionSizing: positionSizingData
        }
      };

    } catch (error) {
      this.logger.error('Failed to integrate with agent state', {
        company: state.company_of_interest,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {};
    }
  }

  // Private helper methods

  private async calculateOptimalPositionSize(
    signal: TradingSignal,
    context: PositionSizingContext,
    historicalPerformance?: StrategyPerformance
  ): Promise<PositionSize> {
    
    // Choose algorithm based on context and available data
    if (historicalPerformance && historicalPerformance.totalTrades > 20) {
      // Use Kelly Criterion if we have sufficient historical data
      const kellyParams: KellyParameters = {
        winRate: historicalPerformance.winRate,
        averageWin: historicalPerformance.averageWin,
        averageLoss: Math.abs(historicalPerformance.averageLoss),
        confidence: signal.confidence / 100
      };
      
      return await this.positionSizer.calculateKellySize(signal, context.portfolio, kellyParams);
    } else if (context.riskTolerance === 'conservative') {
      // Use risk parity for conservative approach
      const asset: Asset = {
        symbol: signal.symbol,
        name: signal.symbol,
        expected_return: 0.08, // Placeholder
        volatility: 0.2, // Placeholder
        current_price: signal.price
      };
      
      const riskParityParams: RiskParityParameters = {
        targetRisk: 0.15,
        currentRisk: context.portfolio.riskMetrics.totalRisk,
        assetVolatility: 0.2, // Placeholder
        correlationAdjustment: 0.3 // Placeholder
      };
      
      return await this.positionSizer.calculateRiskParitySize(context.portfolio, asset, riskParityParams);
    } else {
      // Use confidence-based sizing as default
      return await this.positionSizer.calculateConfidenceBasedSize(
        signal,
        context.portfolio,
        historicalPerformance?.winRate
      );
    }
  }

  private async calculatePortfolioImpact(
    signal: TradingSignal,
    portfolio: Portfolio,
    positionSize: PositionSize
  ): Promise<{ projectedVolatility: number; correlationRisk: number; concentrationRisk: number }> {
    
    // Simplified portfolio impact calculation
    const projectedVolatility = portfolio.riskMetrics.volatility * (1 + positionSize.portfolioPercentage * 0.1);
    const correlationRisk = 0.3; // Placeholder - would calculate actual correlations
    const concentrationRisk = Math.max(...portfolio.holdings.map(h => h.weight)) + positionSize.portfolioPercentage;
    
    return {
      projectedVolatility,
      correlationRisk,
      concentrationRisk
    };
  }

  private async calculateRiskAssessment(
    signal: TradingSignal,
    positionSize: PositionSize,
    portfolio: Portfolio
  ): Promise<{
    portfolioRisk: number;
    concentrationRisk: number;
    correlationRisk: number;
    liquidityRisk: number;
  }> {
    
    return {
      portfolioRisk: portfolio.riskMetrics.totalRisk + (positionSize.portfolioPercentage * 0.2),
      concentrationRisk: positionSize.portfolioPercentage,
      correlationRisk: 0.3, // Placeholder
      liquidityRisk: 0.1 // Placeholder
    };
  }

  private requiresApproval(
    positionSize: PositionSize,
    riskAssessment: any,
    context: PositionSizingContext
  ): boolean {
    
    // Require approval for large positions or high risk
    return positionSize.portfolioPercentage > 0.1 || // > 10%
           riskAssessment.portfolioRisk > 0.15 || // > 15% portfolio risk
           riskAssessment.concentrationRisk > 0.2; // > 20% concentration
  }

  private async generateAlternatives(
    signal: TradingSignal,
    context: PositionSizingContext,
    historicalPerformance?: StrategyPerformance
  ): Promise<PositionSize[]> {
    
    const alternatives: PositionSize[] = [];
    
    try {
      // Conservative alternative (50% of recommended)
      const conservativeSize = await this.positionSizer.calculateConfidenceBasedSize(
        { ...signal, confidence: signal.confidence * 0.5 },
        context.portfolio,
        historicalPerformance?.winRate
      );
      alternatives.push(conservativeSize);
      
      // Aggressive alternative (if appropriate)
      if (context.riskTolerance === 'aggressive') {
        const aggressiveSize = await this.positionSizer.calculateConfidenceBasedSize(
          { ...signal, confidence: Math.min(100, signal.confidence * 1.2) },
          context.portfolio,
          historicalPerformance?.winRate
        );
        alternatives.push(aggressiveSize);
      }
    } catch (error) {
      this.logger.warn('Failed to generate alternatives', {
        symbol: signal.symbol,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return alternatives;
  }

  private generateRecommendationReasoning(
    positionSize: PositionSize,
    riskAssessment: any,
    context: PositionSizingContext
  ): string {
    
    const reasons: string[] = [];
    
    reasons.push(`${positionSize.algorithm} algorithm selected based on ${context.riskTolerance} risk tolerance`);
    reasons.push(`Position size: ${(positionSize.portfolioPercentage * 100).toFixed(2)}% of portfolio`);
    reasons.push(`Projected portfolio risk: ${(riskAssessment.portfolioRisk * 100).toFixed(2)}%`);
    
    if (riskAssessment.concentrationRisk > 0.15) {
      reasons.push('High concentration risk - consider reducing position size');
    }
    
    return reasons.join('. ');
  }

  private calculateTargetWeights(portfolio: Portfolio): Record<string, number> {
    // Simplified equal weight target
    const numHoldings = portfolio.holdings.length;
    const targetWeight = 1 / numHoldings;
    
    const targetWeights: Record<string, number> = {};
    for (const holding of portfolio.holdings) {
      targetWeights[holding.symbol] = targetWeight;
    }
    
    return targetWeights;
  }

  private async calculatePortfolioRiskMetrics(portfolio: Portfolio): Promise<{
    totalRisk: number;
    diversificationRatio: number;
    maxDrawdown: number;
  }> {
    
    // Simplified risk metrics calculation
    const weights = portfolio.holdings.map(h => h.weight);
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    
    return {
      totalRisk: Math.sqrt(hhi) * 0.2, // Simplified
      diversificationRatio: 1 / Math.sqrt(hhi),
      maxDrawdown: 0.1 // Placeholder
    };
  }

  private extractPortfolioContext(state: AgentState): PositionSizingContext {
    // Extract portfolio context from agent state
    // This would be enhanced with actual portfolio data from state
    
    return {
      portfolio: {
        holdings: [], // Would extract from state
        totalValue: 100000, // Placeholder
        availableCash: 20000, // Placeholder
        riskMetrics: {
          totalValue: 100000,
          totalRisk: 0.12,
          concentration: {},
          correlationRisk: 0.3,
          diversificationRatio: 2.5,
          maxDrawdown: 0.08,
          volatility: 0.15
        }
      },
      availableCash: 20000,
      riskTolerance: 'moderate', // Would extract from state/config
      investmentHorizon: 'medium',
      marketConditions: 'sideways' // Would extract from market analysis
    };
  }

  private async generatePortfolioRiskAssessment(portfolio: Portfolio): Promise<any> {
    // Generate comprehensive portfolio risk assessment
    return await this.riskManager.checkDiversificationRules(portfolio);
  }
}

/**
 * Factory function for creating PositionSizingWorkflowIntegration
 */
export function createPositionSizingIntegration(
  config?: Partial<PositionSizingConfig>,
  riskLimits?: Partial<PortfolioRiskLimits>
): PositionSizingWorkflowIntegration {
  return new PositionSizingWorkflowIntegration(config, riskLimits);
}