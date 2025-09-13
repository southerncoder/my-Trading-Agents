import { createLogger } from '../../utils/enhanced-logger';

/**
 * Market Conditions Similarity Service
 * Handles similarity calculations for market conditions, volatility, trends, etc.
 */
export class MarketConditionsSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'market-conditions-similarity');
  }

  /**
   * Calculate market conditions similarity
   */
  calculateMarketConditionsSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare market regime
      if (result.market_regime && criteria.market_regime) {
        const regimeSim = result.market_regime === criteria.market_regime ? 1.0 : 0.3;
        totalSimilarity += regimeSim;
        comparableFeatures++;
      }

      // Compare volatility
      if (result.volatility !== undefined && criteria.volatility !== undefined) {
        const volDiff = Math.abs(result.volatility - criteria.volatility);
        const volSim = Math.exp(-volDiff * 2); // Exponential decay
        totalSimilarity += volSim;
        comparableFeatures++;
      }

      // Compare trend direction
      if (result.trend_direction && criteria.trend_direction) {
        const trendSim = result.trend_direction === criteria.trend_direction ? 1.0 : 0.2;
        totalSimilarity += trendSim;
        comparableFeatures++;
      }

      // Compare volume ratio
      if (result.volume_ratio !== undefined && criteria.volume_ratio !== undefined) {
        const volumeDiff = Math.abs(result.volume_ratio - criteria.volume_ratio);
        const volumeSim = Math.exp(-volumeDiff);
        totalSimilarity += volumeSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating market conditions similarity', { error });
      return 0.5;
    }
  }

  /**
   * Extract market regime performance data
   */
  extractMarketRegimePerformance(data: any): Record<string, number> {
    const regimes: Record<string, number> = {};

    // Extract performance by market regime if available
    if (data.market_regime_performance) {
      Object.assign(regimes, data.market_regime_performance);
    }

    // Default regimes if no data available
    if (Object.keys(regimes).length === 0) {
      regimes['bull'] = 0.6;
      regimes['bear'] = 0.4;
      regimes['sideways'] = 0.5;
      regimes['high_volatility'] = 0.45;
    }

    return regimes;
  }
}

/**
 * Technical Indicators Similarity Service
 * Handles similarity calculations for technical indicators like RSI, MACD, Bollinger Bands
 */
export class TechnicalIndicatorsSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'technical-indicators-similarity');
  }

  /**
   * Calculate technical indicators similarity
   */
  calculateTechnicalIndicatorsSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // RSI comparison
      if (result.rsi !== undefined && criteria.rsi !== undefined) {
        const rsiDiff = Math.abs(result.rsi - criteria.rsi);
        const rsiSim = Math.exp(-rsiDiff / 10); // Normalize by typical RSI range
        totalSimilarity += rsiSim;
        comparableFeatures++;
      }

      // MACD comparison
      if (result.macd !== undefined && criteria.macd !== undefined) {
        const macdDiff = Math.abs(result.macd - criteria.macd);
        const macdSim = Math.exp(-macdDiff);
        totalSimilarity += macdSim;
        comparableFeatures++;
      }

      // Bollinger Band position
      if (result.bollinger_position !== undefined && criteria.bollinger_position !== undefined) {
        const bbDiff = Math.abs(result.bollinger_position - criteria.bollinger_position);
        const bbSim = Math.exp(-bbDiff * 2);
        totalSimilarity += bbSim;
        comparableFeatures++;
      }

      // Momentum comparison
      if (result.momentum !== undefined && criteria.momentum !== undefined) {
        const momentumDiff = Math.abs(result.momentum - criteria.momentum);
        const momentumSim = Math.exp(-momentumDiff);
        totalSimilarity += momentumSim;
        comparableFeatures++;
      }

      return comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating technical indicators similarity', { error });
      return 0.5;
    }
  }
}

/**
 * Temporal Similarity Service
 * Handles time-based similarity calculations with decay functions
 */
export class TemporalSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'temporal-similarity');
  }

  /**
   * Calculate temporal similarity with decay
   */
  calculateTemporalSimilarity(result: any): number {
    try {
      if (!result || !result.timestamp) return 0.5;

      const resultDate = new Date(result.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer = higher similarity
      // Half-life of 30 days
      const decayRate = Math.log(2) / 30;
      const temporalSimilarity = Math.exp(-decayRate * ageInDays);

      return Math.max(0.1, Math.min(1, temporalSimilarity));
    } catch (error) {
      this.logger.warn('Error calculating temporal similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate temporal decay factor
   */
  calculateTemporalDecay(result: any): number {
    try {
      if (!result || !result.timestamp) return 1.0;

      const resultDate = new Date(result.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay with 60-day half-life for outcomes
      const decayRate = Math.log(2) / 60;
      return Math.exp(-decayRate * ageInDays);
    } catch (error) {
      this.logger.warn('Error calculating temporal decay', { error });
      return 1.0;
    }
  }
}

/**
 * Outcome Similarity Service
 * Handles similarity calculations for trading outcomes, success rates, risk metrics
 */
export class OutcomeSimilarityService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'outcome-similarity');
  }

  /**
   * Calculate outcome similarity
   */
  calculateOutcomeSimilarity(result: any, criteria: any): number {
    try {
      if (!result || !criteria) return 0.5;

      let totalSimilarity = 0;
      let comparableFeatures = 0;

      // Compare success rates
      if (result.success_rate !== undefined && criteria.success_rate !== undefined) {
        const successDiff = Math.abs(result.success_rate - criteria.success_rate);
        const successSim = Math.exp(-successDiff * 3);
        totalSimilarity += successSim;
        comparableFeatures++;
      }

      // Compare profit/loss outcomes
      if (result.profit_loss !== undefined && criteria.profit_loss !== undefined) {
        const plSim = (result.profit_loss > 0) === (criteria.profit_loss > 0) ? 1.0 : 0.2;
        totalSimilarity += plSim;
        comparableFeatures++;
      }

      // Compare risk levels
      if (result.risk_level && criteria.risk_level) {
        const riskSim = result.risk_level === criteria.risk_level ? 1.0 : 0.3;
        totalSimilarity += riskSim;
        comparableFeatures++;
      }

      // Apply temporal decay for older outcomes
      const temporalDecay = this.calculateTemporalDecay(result);
      const finalSimilarity = (comparableFeatures > 0 ? totalSimilarity / comparableFeatures : 0.5) * temporalDecay;

      return Math.max(0, Math.min(1, finalSimilarity));
    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate temporal decay factor
   */
  private calculateTemporalDecay(result: any): number {
    try {
      if (!result || !result.timestamp) return 1.0;

      const resultDate = new Date(result.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay with 60-day half-life for outcomes
      const decayRate = Math.log(2) / 60;
      return Math.exp(-decayRate * ageInDays);
    } catch (error) {
      this.logger.warn('Error calculating temporal decay', { error });
      return 1.0;
    }
  }

  /**
   * Normalize success rate to 0-1 range
   */
  normalizeSuccessRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Normalize profit/loss ratio using logarithmic scaling
   */
  normalizeProfitLossRatio(pl: number): number {
    if (pl === 0) return 0.5;
    // Logarithmic scaling to handle wide range of P/L values
    const sign = pl > 0 ? 1 : -1;
    const absPl = Math.abs(pl);
    const normalized = Math.min(Math.log(1 + absPl) / 5, 1); // Cap at 1
    return 0.5 + (sign * normalized * 0.5); // Center at 0.5
  }

  /**
   * Calculate volatility-adjusted return
   */
  calculateVolatilityAdjustedReturn(data: any): number {
    const return_val = data.return || data.profit_loss || data.pnl || 0;
    const volatility = data.volatility || data.std_dev || 0.15; // Default 15% volatility

    if (volatility === 0) return return_val;

    // Sharpe ratio approximation
    return return_val / volatility;
  }

  /**
   * Normalize win rate to 0-1 range
   */
  normalizeWinRate(rate: number): number {
    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Get default outcome features for error cases
   */
  getDefaultOutcomeFeatures(): any {
    return {
      strategy_type: 'unknown',
      risk_profile: 'medium',
      time_horizon: 'medium',
      success_rate: 0.5,
      profit_loss_ratio: 0.5,
      volatility_adjusted_return: 0,
      max_drawdown: 0.1,
      sharpe_ratio: 0,
      win_rate: 0.5,
      avg_trade_duration: 1,
      market_regime_performance: {
        'bull': 0.5,
        'bear': 0.5,
        'sideways': 0.5,
        'high_volatility': 0.5
      }
    };
  }
}