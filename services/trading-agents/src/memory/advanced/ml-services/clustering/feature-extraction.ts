import { createLogger } from '../../../../utils/enhanced-logger';
import { TradingOutcome, FeatureVector } from '../types';

/**
 * Feature Extraction Service
 * Converts trading outcomes into numerical feature vectors for ML algorithms
 */
export class FeatureExtractionService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'feature-extraction');
  }

  /**
   * Extract features suitable for clustering analysis from trading outcomes
   */
  extractClusteringFeatures(outcome: TradingOutcome): number[] {
    try {
      return [
        this.normalizeSuccessRate(outcome.success_rate || outcome.win_rate || 0.5),
        this.normalizeProfitLossRatio(outcome.profit_loss || outcome.pnl || 0),
        outcome.volatility || outcome.std_dev || 0.15,
        outcome.max_drawdown || outcome.drawdown || 0.1,
        outcome.sharpe_ratio || outcome.risk_adjusted_return || 0,
        this.normalizeWinRate(outcome.win_rate || outcome.success_rate || 0.5),
        outcome.avg_trade_duration || outcome.holding_period || 1,
        // Categorical features encoded as numbers
        this.encodeStrategyType(outcome.strategy_type || 'unknown'),
        this.encodeRiskProfile(outcome.risk_profile || 'medium'),
        this.encodeTimeHorizon(outcome.time_horizon || 'medium')
      ];
    } catch (error) {
      this.logger.warn('feature-extraction-failed', 'Feature extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown',
        outcome
      });
      return [0.5, 0.5, 0.15, 0.1, 0, 0.5, 1, 0, 1, 1]; // Default feature vector
    }
  }

  /**
   * Extract features for similarity calculations
   */
  extractSimilarityFeatures(outcome: TradingOutcome): FeatureVector {
    return {
      success_rate: outcome.success_rate || outcome.win_rate || 0.5,
      profit_loss_ratio: outcome.profit_loss || outcome.pnl || 0,
      volatility_adjusted_return: outcome.sharpe_ratio || outcome.risk_adjusted_return || 0,
      max_drawdown: outcome.max_drawdown || outcome.drawdown || 0.1,
      sharpe_ratio: outcome.sharpe_ratio || outcome.risk_adjusted_return || 0,
      win_rate: outcome.win_rate || outcome.success_rate || 0.5,
      avg_trade_duration: outcome.avg_trade_duration || outcome.holding_period || 1,
      strategy_type: outcome.strategy_type || 'unknown',
      risk_profile: outcome.risk_profile || 'medium',
      time_horizon: outcome.time_horizon || 'medium'
    };
  }

  /**
   * Normalize success rate to 0-1 range
   */
  private normalizeSuccessRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Normalize profit/loss ratio using logarithmic scaling
   */
  private normalizeProfitLossRatio(pl: number): number {
    if (pl === 0) return 0.5;
    // Logarithmic scaling to handle wide range of P/L values
    const sign = pl > 0 ? 1 : -1;
    const absPl = Math.abs(pl);
    const normalized = Math.min(Math.log(1 + absPl) / 5, 1); // Cap at 1
    return 0.5 + (sign * normalized * 0.5); // Center at 0.5
  }

  /**
   * Normalize win rate to 0-1 range
   */
  private normalizeWinRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Encode categorical strategy type as number
   */
  private encodeStrategyType(strategy: string): number {
    const strategyMap: Record<string, number> = {
      'momentum': 0, 'mean_reversion': 1, 'breakout': 2, 'scalping': 3,
      'swing': 4, 'position': 5, 'arbitrage': 6, 'unknown': 7
    };
    return strategyMap[strategy.toLowerCase()] || 7;
  }

  /**
   * Encode categorical risk profile as number
   */
  private encodeRiskProfile(risk: string): number {
    const riskMap: Record<string, number> = {
      'low': 0, 'conservative': 0.3, 'medium': 1, 'moderate': 1.3,
      'high': 2, 'aggressive': 2.3, 'unknown': 1
    };
    return riskMap[risk.toLowerCase()] || 1;
  }

  /**
   * Encode categorical time horizon as number
   */
  private encodeTimeHorizon(horizon: string): number {
    const horizonMap: Record<string, number> = {
      'short': 0, 'intraday': 0.3, 'medium': 1, 'swing': 1.3,
      'long': 2, 'position': 2.3, 'unknown': 1
    };
    return horizonMap[horizon.toLowerCase()] || 1;
  }
}