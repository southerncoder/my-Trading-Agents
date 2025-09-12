import { createLogger } from '../../utils/enhanced-logger';

/**
 * Data Extraction Module
 *
 * This module contains all data extraction helper methods for parsing
 * market conditions, technical indicators, outcomes, and performance data
 * from various fact structures and memory content.
 */

export class DataExtraction {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'DataExtraction');
  }

  // Market Condition Extraction Methods

  /**
   * Extract market regime from result data
   */
  extractMarketRegime(result: any): string {
    try {
      if (!result) return 'unknown';

      const regime = result.market_regime ||
                    result.market_conditions?.regime ||
                    result.regime ||
                    result.market_state;

      if (regime) {
        if (typeof regime === 'string') {
          const normalized = regime.toLowerCase().trim();
          if (['bull', 'bullish', 'uptrend', 'rising'].includes(normalized)) return 'bull';
          if (['bear', 'bearish', 'downtrend', 'falling'].includes(normalized)) return 'bear';
          if (['sideways', 'range', 'neutral', 'flat'].includes(normalized)) return 'sideways';
          if (['volatile', 'high_volatility'].includes(normalized)) return 'high_volatility';
          return normalized;
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting market regime', { error });
      return 'unknown';
    }
  }

  /**
   * Extract volatility from result data
   */
  extractVolatility(result: any): number {
    try {
      if (!result) return 0.15; // Default 15% volatility

      const volatility = result.volatility ||
                        result.market_conditions?.volatility ||
                        result.vol ||
                        result.volatility_level ||
                        result.price_volatility;

      if (volatility !== undefined) {
        if (typeof volatility === 'number') {
          return Math.max(0, Math.min(1, volatility)); // Ensure 0-1 range
        }

        if (typeof volatility === 'string') {
          const normalized = volatility.toLowerCase().trim();
          if (['high', 'volatile'].includes(normalized)) return 0.25;
          if (['low', 'stable'].includes(normalized)) return 0.10;
          if (['medium', 'moderate'].includes(normalized)) return 0.15;
        }
      }

      return 0.15;
    } catch (error) {
      this.logger.warn('Error extracting volatility', { error });
      return 0.15;
    }
  }

  /**
   * Extract volume ratio from result data
   */
  extractVolumeRatio(result: any): number {
    try {
      if (!result) return 1.0;

      const volumeRatio = result.volume_ratio ||
                         result.market_data?.volume_ratio ||
                         result.volume_multiple ||
                         result.relative_volume;

      if (volumeRatio !== undefined) {
        if (typeof volumeRatio === 'number') {
          return Math.max(0, volumeRatio);
        }
      }

      return 1.0;
    } catch (error) {
      this.logger.warn('Error extracting volume ratio', { error });
      return 1.0;
    }
  }

  /**
   * Extract price level from result data
   */
  extractPriceLevel(result: any): number {
    try {
      if (!result) return 0;

      const price = result.price ||
                   result.current_price ||
                   result.market_price ||
                   result.price_level ||
                   result.market_data?.price;

      if (price !== undefined) {
        if (typeof price === 'number') {
          return price;
        }

        if (typeof price === 'string') {
          const parsed = parseFloat(price.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting price level', { error });
      return 0;
    }
  }

  /**
   * Extract trend direction from result data
   */
  extractTrendDirection(result: any): string {
    try {
      if (!result) return 'unknown';

      const trend = result.trend_direction ||
                   result.trend ||
                   result.market_conditions?.trend ||
                   result.price_trend ||
                   result.momentum_direction;

      if (trend) {
        if (typeof trend === 'string') {
          const normalized = trend.toLowerCase().trim();
          if (['up', 'uptrend', 'bullish', 'rising', 'positive'].includes(normalized)) return 'uptrend';
          if (['down', 'downtrend', 'bearish', 'falling', 'negative'].includes(normalized)) return 'downtrend';
          if (['sideways', 'range', 'neutral', 'flat'].includes(normalized)) return 'sideways';
          return normalized;
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting trend direction', { error });
      return 'unknown';
    }
  }

  /**
   * Extract momentum from result data
   */
  extractMomentum(result: any): number {
    try {
      if (!result) return 0;

      const momentum = result.momentum ||
                      result.market_conditions?.momentum ||
                      result.price_momentum ||
                      result.momentum_value;

      if (momentum !== undefined) {
        if (typeof momentum === 'number') {
          return momentum;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting momentum', { error });
      return 0;
    }
  }

  /**
   * Extract sector from result data
   */
  extractSector(result: any): string {
    try {
      if (!result) return 'unknown';

      const sector = result.sector ||
                    result.market_data?.sector ||
                    result.industry ||
                    result.industry_sector;

      if (sector && typeof sector === 'string') {
        return sector.toLowerCase().trim();
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting sector', { error });
      return 'unknown';
    }
  }

  /**
   * Extract market cap from result data
   */
  extractMarketCap(result: any): number {
    try {
      if (!result) return 0;

      const marketCap = result.market_cap ||
                       result.market_capitalization ||
                       result.company_data?.market_cap ||
                       result.market_data?.market_cap;

      if (marketCap !== undefined) {
        if (typeof marketCap === 'number') {
          return marketCap;
        }

        if (typeof marketCap === 'string') {
          const parsed = parseFloat(marketCap.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting market cap', { error });
      return 0;
    }
  }

  /**
   * Extract trading volume from result data
   */
  extractTradingVolume(result: any): number {
    try {
      if (!result) return 0;

      const volume = result.trading_volume ||
                    result.volume ||
                    result.market_data?.volume ||
                    result.daily_volume;

      if (volume !== undefined) {
        if (typeof volume === 'number') {
          return volume;
        }

        if (typeof volume === 'string') {
          const parsed = parseFloat(volume.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting trading volume', { error });
      return 0;
    }
  }

  /**
   * Extract price change from result data
   */
  extractPriceChange(result: any): number {
    try {
      if (!result) return 0;

      const priceChange = result.price_change ||
                         result.price_change_percent ||
                         result.market_data?.price_change ||
                         result.daily_change;

      if (priceChange !== undefined) {
        if (typeof priceChange === 'number') {
          return priceChange;
        }

        if (typeof priceChange === 'string') {
          const parsed = parseFloat(priceChange.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting price change', { error });
      return 0;
    }
  }

  /**
   * Extract volatility regime from result data
   */
  extractVolatilityRegime(result: any): string {
    try {
      const volatility = this.extractVolatility(result);

      if (volatility < 0.15) return 'low';
      if (volatility < 0.25) return 'medium';
      return 'high';
    } catch (error) {
      this.logger.warn('Error extracting volatility regime', { error });
      return 'medium';
    }
  }

  /**
   * Extract liquidity from result data
   */
  extractLiquidity(result: any): string {
    try {
      if (!result) return 'unknown';

      const liquidity = result.liquidity ||
                       result.market_liquidity ||
                       result.liquidity_level;

      if (liquidity) {
        if (typeof liquidity === 'string') {
          const normalized = liquidity.toLowerCase().trim();
          if (['high', 'excellent', 'good'].includes(normalized)) return 'high';
          if (['medium', 'moderate', 'average'].includes(normalized)) return 'medium';
          if (['low', 'poor', 'thin'].includes(normalized)) return 'low';
          return normalized;
        }

        if (typeof liquidity === 'number') {
          if (liquidity > 0.7) return 'high';
          if (liquidity > 0.3) return 'medium';
          return 'low';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting liquidity', { error });
      return 'unknown';
    }
  }

  /**
   * Extract market sentiment from result data
   */
  extractMarketSentiment(result: any): string {
    try {
      if (!result) return 'neutral';

      const sentiment = result.market_sentiment ||
                       result.sentiment ||
                       result.market_mood ||
                       result.investor_sentiment;

      if (sentiment) {
        if (typeof sentiment === 'string') {
          const normalized = sentiment.toLowerCase().trim();
          if (['bullish', 'positive', 'optimistic'].includes(normalized)) return 'bullish';
          if (['bearish', 'negative', 'pessimistic'].includes(normalized)) return 'bearish';
          if (['neutral', 'mixed', 'balanced'].includes(normalized)) return 'neutral';
          return normalized;
        }

        if (typeof sentiment === 'number') {
          if (sentiment > 0.6) return 'bullish';
          if (sentiment < 0.4) return 'bearish';
          return 'neutral';
        }
      }

      return 'neutral';
    } catch (error) {
      this.logger.warn('Error extracting market sentiment', { error });
      return 'neutral';
    }
  }

  /**
   * Extract competition level from result data
   */
  extractCompetitionLevel(result: any): string {
    try {
      if (!result) return 'unknown';

      const competition = result.competition_level ||
                         result.competition ||
                         result.market_competition ||
                         result.competitive_environment;

      if (competition) {
        if (typeof competition === 'string') {
          const normalized = competition.toLowerCase().trim();
          if (['high', 'intense', 'competitive'].includes(normalized)) return 'high';
          if (['medium', 'moderate', 'average'].includes(normalized)) return 'medium';
          if (['low', 'minimal', 'weak'].includes(normalized)) return 'low';
          return normalized;
        }

        if (typeof competition === 'number') {
          if (competition > 0.7) return 'high';
          if (competition > 0.3) return 'medium';
          return 'low';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting competition level', { error });
      return 'unknown';
    }
  }

  /**
   * Extract regulatory environment from result data
   */
  extractRegulatoryEnvironment(result: any): string {
    try {
      if (!result) return 'unknown';

      const regulatory = result.regulatory_environment ||
                        result.regulation ||
                        result.regulatory ||
                        result.compliance_environment;

      if (regulatory) {
        if (typeof regulatory === 'string') {
          const normalized = regulatory.toLowerCase().trim();
          if (['strict', 'heavy', 'regulated'].includes(normalized)) return 'strict';
          if (['moderate', 'normal', 'standard'].includes(normalized)) return 'moderate';
          if (['light', 'minimal', 'flexible'].includes(normalized)) return 'light';
          return normalized;
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting regulatory environment', { error });
      return 'unknown';
    }
  }

  // Technical Indicator Extraction Methods

  /**
   * Extract technical indicators from fact data
   */
  extractTechnicalIndicators(fact: any): any {
    try {
      if (!fact) return {};

      return {
        // RSI
        rsi: fact.rsi || fact.technical_indicators?.rsi,
        rsi_signal: this.categorizeRSI(fact.rsi || fact.technical_indicators?.rsi),

        // MACD
        macd: fact.macd || fact.technical_indicators?.macd,
        macd_signal: fact.macd_signal || fact.technical_indicators?.macd_signal,
        macd_histogram: fact.macd_histogram || fact.technical_indicators?.macd_histogram,
        macd_signal_categorized: this.categorizeMACD(
          fact.macd || fact.technical_indicators?.macd,
          fact.macd_signal || fact.technical_indicators?.macd_signal
        ),

        // Bollinger Bands
        bollinger_upper: fact.bollinger_upper || fact.technical_indicators?.bollinger?.upper,
        bollinger_middle: fact.bollinger_middle || fact.technical_indicators?.bollinger?.middle,
        bollinger_lower: fact.bollinger_lower || fact.technical_indicators?.bollinger?.lower,
        bollinger_position: fact.bollinger_position || fact.technical_indicators?.bollinger?.position,
        bollinger_signal: this.categorizeBollingerBands(fact),

        // Moving Averages
        sma_20: fact.sma_20 || fact.technical_indicators?.sma?.['20'],
        sma_50: fact.sma_50 || fact.technical_indicators?.sma?.['50'],
        sma_200: fact.sma_200 || fact.technical_indicators?.sma?.['200'],
        ema_12: fact.ema_12 || fact.technical_indicators?.ema?.['12'],
        ema_26: fact.ema_26 || fact.technical_indicators?.ema?.['26'],
        moving_averages_signal: this.categorizeMovingAverages(fact),

        // Stochastic
        stochastic_k: fact.stochastic_k || fact.technical_indicators?.stochastic?.k,
        stochastic_d: fact.stochastic_d || fact.technical_indicators?.stochastic?.d,
        stochastic_signal: this.categorizeStochastic(
          fact.stochastic_k || fact.technical_indicators?.stochastic?.k,
          fact.stochastic_d || fact.technical_indicators?.stochastic?.d
        ),

        // Volume Indicators
        volume: fact.volume || fact.market_data?.volume,
        volume_sma: fact.volume_sma || fact.technical_indicators?.volume?.sma,
        volume_ratio: fact.volume_ratio || fact.market_data?.volume_ratio,
        volume_signal: this.categorizeVolume(fact),

        // Momentum Indicators
        momentum: fact.momentum || fact.technical_indicators?.momentum,
        roc: fact.roc || fact.technical_indicators?.roc,
        momentum_signal: this.categorizeMomentum(fact),

        // Volatility Indicators
        atr: fact.atr || fact.technical_indicators?.atr,
        std_dev: fact.std_dev || fact.technical_indicators?.std_dev,
        volatility_signal: this.categorizeVolatility(fact),

        // Trend Indicators
        adx: fact.adx || fact.technical_indicators?.adx,
        di_plus: fact.di_plus || fact.technical_indicators?.di_plus,
        di_minus: fact.di_minus || fact.technical_indicators?.di_minus,
        trend_signal: this.categorizeTrend(fact),

        // Support/Resistance
        support_levels: fact.support_levels || fact.technical_indicators?.support_levels || [],
        resistance_levels: fact.resistance_levels || fact.technical_indicators?.resistance_levels || [],
        pivot_point: fact.pivot_point || fact.technical_indicators?.pivot_point,
        pivot_support: fact.pivot_support || fact.technical_indicators?.pivot_support,
        pivot_resistance: fact.pivot_resistance || fact.technical_indicators?.pivot_resistance,
        sr_signal: this.categorizeSupportResistance(fact),

        // Overall Technical Signal
        overall_technical_signal: this.calculateOverallTechnicalSignal(fact),
        technical_confidence: this.calculateTechnicalConfidence(fact)
      };
    } catch (error) {
      this.logger.warn('Error extracting technical indicators', { error, fact });
      return {};
    }
  }

  /**
   * Categorize RSI signal
   */
  private categorizeRSI(rsi: number): string {
    if (!rsi) return 'neutral';
    if (rsi > 70) return 'overbought';
    if (rsi < 30) return 'oversold';
    return 'neutral';
  }

  /**
   * Categorize MACD signal
   */
  private categorizeMACD(macd: number, signal: number): string {
    if (!macd || !signal) return 'neutral';
    if (macd > signal) return 'bullish';
    if (macd < signal) return 'bearish';
    return 'neutral';
  }

  /**
   * Categorize Bollinger Bands signal
   */
  private categorizeBollingerBands(fact: any): string {
    const price = fact.price || fact.current_price;
    const upper = fact.bollinger_upper || fact.technical_indicators?.bollinger?.upper;
    const lower = fact.bollinger_lower || fact.technical_indicators?.bollinger?.lower;

    if (!price || !upper || !lower) return 'neutral';

    if (price >= upper) return 'overbought';
    if (price <= lower) return 'oversold';
    return 'neutral';
  }

  /**
   * Categorize Moving Averages signal
   */
  private categorizeMovingAverages(fact: any): string {
    const price = fact.price || fact.current_price;
    const sma20 = fact.sma_20 || fact.technical_indicators?.sma?.['20'];
    const sma50 = fact.sma_50 || fact.technical_indicators?.sma?.['50'];

    if (!price || !sma20 || !sma50) return 'neutral';

    if (price > sma20 && sma20 > sma50) return 'strong_bullish';
    if (price > sma20 && sma20 < sma50) return 'bullish';
    if (price < sma20 && sma20 < sma50) return 'bearish';
    if (price < sma20 && sma20 > sma50) return 'strong_bearish';
    return 'neutral';
  }

  /**
   * Categorize Stochastic signal
   */
  private categorizeStochastic(k: number, d: number): string {
    if (!k || !d) return 'neutral';
    if (k > 80 && d > 80) return 'overbought';
    if (k < 20 && d < 20) return 'oversold';
    if (k > d) return 'bullish';
    if (k < d) return 'bearish';
    return 'neutral';
  }

  /**
   * Categorize Volume signal
   */
  private categorizeVolume(fact: any): string {
    const volume = fact.volume || fact.market_data?.volume;
    const volumeSma = fact.volume_sma || fact.technical_indicators?.volume?.sma;

    if (!volume || !volumeSma) return 'neutral';

    if (volume > volumeSma * 1.5) return 'high_volume';
    if (volume < volumeSma * 0.5) return 'low_volume';
    return 'normal_volume';
  }

  /**
   * Categorize Momentum signal
   */
  private categorizeMomentum(fact: any): string {
    const momentum = fact.momentum || fact.technical_indicators?.momentum;
    const roc = fact.roc || fact.technical_indicators?.roc;

    if (!momentum && !roc) return 'neutral';

    if ((momentum && momentum > 0) || (roc && roc > 0)) return 'positive';
    if ((momentum && momentum < 0) || (roc && roc < 0)) return 'negative';
    return 'neutral';
  }

  /**
   * Categorize Volatility signal
   */
  private categorizeVolatility(fact: any): string {
    const atr = fact.atr || fact.technical_indicators?.atr;
    const stdDev = fact.std_dev || fact.technical_indicators?.std_dev;

    if (!atr && !stdDev) return 'neutral';

    const volatility = atr || stdDev;
    if (volatility > 0.05) return 'high_volatility';
    if (volatility < 0.02) return 'low_volatility';
    return 'normal_volatility';
  }

  /**
   * Categorize Trend signal
   */
  private categorizeTrend(fact: any): string {
    const adx = fact.adx || fact.technical_indicators?.adx;
    const diPlus = fact.di_plus || fact.technical_indicators?.di_plus;
    const diMinus = fact.di_minus || fact.technical_indicators?.di_minus;

    if (!adx || !diPlus || !diMinus) return 'sideways';

    if (adx > 25) {
      if (diPlus > diMinus) return 'strong_uptrend';
      if (diMinus > diPlus) return 'strong_downtrend';
    }

    if (diPlus > diMinus) return 'uptrend';
    if (diMinus > diPlus) return 'downtrend';
    return 'sideways';
  }

  /**
   * Categorize Support/Resistance signal
   */
  private categorizeSupportResistance(fact: any): string {
    const price = fact.price || fact.current_price;
    const supportLevels = fact.support_levels || fact.technical_indicators?.support_levels || [];
    const resistanceLevels = fact.resistance_levels || fact.technical_indicators?.resistance_levels || [];

    if (!price || (supportLevels.length === 0 && resistanceLevels.length === 0)) return 'neutral';

    // Check proximity to support/resistance levels
    const tolerance = price * 0.02; // 2% tolerance

    for (const support of supportLevels) {
      if (Math.abs(price - support) <= tolerance) return 'near_support';
    }

    for (const resistance of resistanceLevels) {
      if (Math.abs(price - resistance) <= tolerance) return 'near_resistance';
    }

    return 'neutral';
  }

  /**
   * Calculate overall technical signal
   */
  private calculateOverallTechnicalSignal(fact: any): string {
    const signals = [
      this.categorizeRSI(fact.rsi || fact.technical_indicators?.rsi),
      this.categorizeMACD(fact.macd, fact.macd_signal),
      this.categorizeBollingerBands(fact),
      this.categorizeMovingAverages(fact),
      this.categorizeStochastic(fact.stochastic_k, fact.stochastic_d),
      this.categorizeTrend(fact)
    ];

    let bullish = 0;
    let bearish = 0;
    let _neutral = 0;

    for (const signal of signals) {
      if (['bullish', 'strong_bullish', 'oversold', 'positive'].includes(signal)) bullish++;
      else if (['bearish', 'strong_bearish', 'overbought', 'negative'].includes(signal)) bearish++;
      else _neutral++;
    }

    if (bullish > bearish + 1) return 'bullish';
    if (bearish > bullish + 1) return 'bearish';
    return 'neutral';
  }

  /**
   * Calculate technical confidence score
   */
  private calculateTechnicalConfidence(fact: any): number {
    let confidence = 0.5;
    let indicators = 0;

    // Check each major indicator group
    if (fact.rsi || fact.technical_indicators?.rsi) { confidence += 0.1; indicators++; }
    if (fact.macd || fact.technical_indicators?.macd) { confidence += 0.1; indicators++; }
    if (fact.bollinger_upper || fact.technical_indicators?.bollinger) { confidence += 0.1; indicators++; }
    if (fact.sma_20 || fact.technical_indicators?.sma) { confidence += 0.1; indicators++; }
    if (fact.stochastic_k || fact.technical_indicators?.stochastic) { confidence += 0.1; indicators++; }
    if (fact.adx || fact.technical_indicators?.adx) { confidence += 0.1; indicators++; }

    // Adjust confidence based on data completeness
    if (indicators > 0) {
      confidence = confidence / indicators;
    }

    // Boost confidence for comprehensive data
    if (indicators >= 4) confidence += 0.2;
    if (indicators >= 6) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  // Outcome Extraction Methods

  /**
   * Extract outcomes from result data
   */
  extractOutcomes(result: any): any {
    try {
      if (!result) return {};

      return {
        strategy_type: this.extractStrategyType(result),
        success_rate: this.extractSuccessRate(result),
        profit_loss: this.extractProfitLoss(result),
        risk_outcome: this.extractRiskOutcome(result),
        time_effectiveness: this.extractTimeEffectiveness(result),
        confidence_score: this.extractConfidence(result),
        market_impact: this.extractMarketImpact(result),
        drawdown: this.extractDrawdown(result),
        sharpe_ratio: this.extractSharpeRatio(result),
        execution_quality: this.extractExecutionQuality(result),
        outcome_category: this.categorizeOutcome(result),
        win_rate: this.extractWinRate(result),
        avg_trade_duration: this.extractAvgTradeDuration(result),
        sample_size: this.extractSampleSize(result)
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes', { error, result });
      return {};
    }
  }

  /**
   * Extract strategy type from result data
   */
  extractStrategyType(result: any): string {
    try {
      if (!result) return 'unknown';

      const strategy = result.strategy_type ||
                      result.strategy ||
                      result.trading_strategy ||
                      result.approach ||
                      result.method;

      if (strategy && typeof strategy === 'string') {
        const normalized = strategy.toLowerCase().trim();
        // Map common variations to standard types
        if (['momentum', 'trend_following'].includes(normalized)) return 'momentum';
        if (['mean_reversion', 'reversion'].includes(normalized)) return 'mean_reversion';
        if (['breakout', 'break_out'].includes(normalized)) return 'breakout';
        if (['scalping', 'scalp'].includes(normalized)) return 'scalping';
        if (['swing', 'swing_trading'].includes(normalized)) return 'swing';
        if (['position', 'position_trading'].includes(normalized)) return 'position';
        if (['arbitrage', 'arb'].includes(normalized)) return 'arbitrage';
        return normalized;
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting strategy type', { error });
      return 'unknown';
    }
  }

  /**
   * Extract success rate from result data
   */
  extractSuccessRate(result: any): number {
    try {
      if (!result) return 0.5;

      const successRate = result.success_rate ||
                         result.win_rate ||
                         result.accuracy ||
                         result.success_percentage;

      if (successRate !== undefined) {
        if (typeof successRate === 'number') {
          return Math.max(0, Math.min(1, successRate));
        }

        if (typeof successRate === 'string') {
          const parsed = parseFloat(successRate.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) {
            return Math.max(0, Math.min(1, parsed / 100)); // Convert percentage to decimal
          }
        }
      }

      return 0.5;
    } catch (error) {
      this.logger.warn('Error extracting success rate', { error });
      return 0.5;
    }
  }

  /**
   * Extract profit/loss from result data
   */
  extractProfitLoss(result: any): number {
    try {
      if (!result) return 0;

      const profitLoss = result.profit_loss ||
                        result.pnl ||
                        result.return ||
                        result.performance ||
                        result.profit ||
                        result.loss;

      if (profitLoss !== undefined) {
        if (typeof profitLoss === 'number') {
          return profitLoss;
        }

        if (typeof profitLoss === 'string') {
          const parsed = parseFloat(profitLoss.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting profit/loss', { error });
      return 0;
    }
  }

  /**
   * Extract risk outcome from result data
   */
  extractRiskOutcome(result: any): string {
    try {
      if (!result) return 'unknown';

      const risk = result.risk_outcome ||
                  result.risk_level ||
                  result.risk_assessment ||
                  result.risk_profile;

      if (risk) {
        if (typeof risk === 'string') {
          const normalized = risk.toLowerCase().trim();
          if (['low', 'conservative', 'safe'].includes(normalized)) return 'low';
          if (['medium', 'moderate', 'balanced'].includes(normalized)) return 'medium';
          if (['high', 'aggressive', 'risky'].includes(normalized)) return 'high';
          return normalized;
        }

        if (typeof risk === 'number') {
          if (risk < 0.3) return 'low';
          if (risk < 0.7) return 'medium';
          return 'high';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting risk outcome', { error });
      return 'unknown';
    }
  }

  /**
   * Extract time effectiveness from result data
   */
  extractTimeEffectiveness(result: any): string {
    try {
      if (!result) return 'unknown';

      const time = result.time_effectiveness ||
                  result.time_horizon ||
                  result.timeframe ||
                  result.holding_period ||
                  result.duration;

      if (time) {
        if (typeof time === 'string') {
          const normalized = time.toLowerCase().trim();
          if (['short', 'intraday', 'day'].includes(normalized)) return 'short';
          if (['medium', 'swing', 'week'].includes(normalized)) return 'medium';
          if (['long', 'position', 'month', 'year'].includes(normalized)) return 'long';
          return normalized;
        }

        if (typeof time === 'number') {
          if (time <= 1) return 'short';
          if (time <= 30) return 'medium';
          return 'long';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting time effectiveness', { error });
      return 'unknown';
    }
  }

  /**
   * Extract confidence from result data
   */
  extractConfidence(result: any): number {
    try {
      if (!result) return 0.5;

      const confidence = result.confidence_score ||
                        result.confidence ||
                        result.certainty ||
                        result.confidence_level;

      if (confidence !== undefined) {
        if (typeof confidence === 'number') {
          return Math.max(0, Math.min(1, confidence));
        }

        if (typeof confidence === 'string') {
          const normalized = confidence.toLowerCase().trim();
          if (['high', 'very_high', 'strong'].includes(normalized)) return 0.8;
          if (['medium', 'moderate', 'average'].includes(normalized)) return 0.5;
          if (['low', 'weak', 'uncertain'].includes(normalized)) return 0.2;
        }
      }

      return 0.5;
    } catch (error) {
      this.logger.warn('Error extracting confidence', { error });
      return 0.5;
    }
  }

  /**
   * Extract market impact from result data
   */
  extractMarketImpact(result: any): number {
    try {
      if (!result) return 0;

      const impact = result.market_impact ||
                    result.alpha ||
                    result.beta ||
                    result.market_effect ||
                    result.price_impact;

      if (impact !== undefined) {
        if (typeof impact === 'number') {
          return impact;
        }

        if (typeof impact === 'string') {
          const parsed = parseFloat(impact.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting market impact', { error });
      return 0;
    }
  }

  /**
   * Extract drawdown from result data
   */
  extractDrawdown(result: any): number {
    try {
      if (!result) return 0;

      const drawdown = result.drawdown ||
                      result.max_drawdown ||
                      result.draw_down ||
                      result.maximum_drawdown;

      if (drawdown !== undefined) {
        if (typeof drawdown === 'number') {
          return Math.abs(drawdown); // Ensure positive value
        }

        if (typeof drawdown === 'string') {
          const parsed = parseFloat(drawdown.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : Math.abs(parsed);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting drawdown', { error });
      return 0;
    }
  }

  /**
   * Extract Sharpe ratio from result data
   */
  extractSharpeRatio(result: any): number {
    try {
      if (!result) return 0;

      const sharpe = result.sharpe_ratio ||
                    result.sharpe ||
                    result.risk_adjusted_return ||
                    result.sharpe_ratio_value;

      if (sharpe !== undefined) {
        if (typeof sharpe === 'number') {
          return sharpe;
        }

        if (typeof sharpe === 'string') {
          const parsed = parseFloat(sharpe.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting Sharpe ratio', { error });
      return 0;
    }
  }

  /**
   * Extract execution quality from result data
   */
  extractExecutionQuality(result: any): string {
    try {
      if (!result) return 'unknown';

      const quality = result.execution_quality ||
                     result.slippage ||
                     result.fill_rate ||
                     result.execution ||
                     result.trade_execution;

      if (quality) {
        if (typeof quality === 'string') {
          const normalized = quality.toLowerCase().trim();
          if (['excellent', 'perfect', 'optimal'].includes(normalized)) return 'excellent';
          if (['good', 'high', 'above_average'].includes(normalized)) return 'good';
          if (['average', 'medium', 'standard'].includes(normalized)) return 'average';
          if (['poor', 'low', 'below_average'].includes(normalized)) return 'poor';
          return normalized;
        }

        if (typeof quality === 'number') {
          if (quality > 0.9) return 'excellent';
          if (quality > 0.7) return 'good';
          if (quality > 0.5) return 'average';
          return 'poor';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting execution quality', { error });
      return 'unknown';
    }
  }

  /**
   * Categorize outcome based on performance metrics
   */
  private categorizeOutcome(result: any): string {
    if (!result) return 'unknown';

    const profit = result.profit_loss || result.pnl || result.return;
    if (profit !== undefined) {
      if (profit > 0.05) return 'highly_successful';
      if (profit > 0) return 'successful';
      if (profit > -0.05) return 'neutral';
      return 'unsuccessful';
    }

    const success = result.success_rate || result.win_rate;
    if (success !== undefined) {
      if (success > 0.7) return 'highly_successful';
      if (success > 0.5) return 'successful';
      if (success > 0.3) return 'neutral';
      return 'unsuccessful';
    }

    return 'unknown';
  }

  /**
   * Extract win rate from result data
   */
  extractWinRate(result: any): number {
    try {
      if (!result) return 0.5;

      const winRate = result.win_rate ||
                     result.success_rate ||
                     result.winning_rate ||
                     result.win_percentage;

      if (winRate !== undefined) {
        if (typeof winRate === 'number') {
          return Math.max(0, Math.min(1, winRate));
        }

        if (typeof winRate === 'string') {
          const parsed = parseFloat(winRate.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) {
            return Math.max(0, Math.min(1, parsed / 100)); // Convert percentage to decimal
          }
        }
      }

      return 0.5;
    } catch (error) {
      this.logger.warn('Error extracting win rate', { error });
      return 0.5;
    }
  }

  /**
   * Extract average trade duration from result data
   */
  extractAvgTradeDuration(result: any): number {
    try {
      if (!result) return 1;

      const duration = result.avg_trade_duration ||
                      result.holding_period ||
                      result.average_duration ||
                      result.trade_duration ||
                      result.position_duration;

      if (duration !== undefined) {
        if (typeof duration === 'number') {
          return Math.max(0, duration);
        }

        if (typeof duration === 'string') {
          const parsed = parseFloat(duration.replace(/[^0-9.-]/g, ''));
          return isNaN(parsed) ? 1 : Math.max(0, parsed);
        }
      }

      return 1;
    } catch (error) {
      this.logger.warn('Error extracting average trade duration', { error });
      return 1;
    }
  }

  /**
   * Extract sample size from result data
   */
  extractSampleSize(result: any): number {
    try {
      if (!result) return 0;

      const sampleSize = result.sample_size ||
                        result.total_trades ||
                        result.trade_count ||
                        result.number_of_trades ||
                        result.n_trades;

      if (sampleSize !== undefined) {
        if (typeof sampleSize === 'number') {
          return Math.max(0, Math.floor(sampleSize));
        }

        if (typeof sampleSize === 'string') {
          const parsed = parseInt(sampleSize.replace(/[^0-9]/g, ''), 10);
          return isNaN(parsed) ? 0 : Math.max(0, parsed);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting sample size', { error });
      return 0;
    }
  }

  // Performance Data Extraction Methods

  /**
   * Extract performance data from result
   */
  extractPerformanceData(result: any): any {
    try {
      if (!result) return {
        success_rate: 0.5,
        avg_return: 0,
        volatility: 0.15,
        max_drawdown: 0.1
      };

      // Extract performance data from various fact structures
      return {
        success_rate: this.extractSuccessRate(result) || 0.5,
        avg_return: this.extractProfitLoss(result) || 0,
        volatility: this.extractVolatility(result) || 0.15,
        max_drawdown: this.extractDrawdown(result) || 0.1,
        sharpe_ratio: this.extractSharpeRatio(result) || 0,
        win_rate: this.extractWinRate(result) || 0.5,
        total_trades: this.extractSampleSize(result) || 0,
        avg_trade_duration: this.extractAvgTradeDuration(result) || 1,
        strategy_type: this.extractStrategyType(result) || 'unknown',
        risk_level: this.extractRiskOutcome(result) || 'medium'
      };
    } catch (error) {
      this.logger.warn('Error extracting performance data', { error, result });
      return {
        success_rate: 0.5,
        avg_return: 0,
        volatility: 0.15,
        max_drawdown: 0.1
      };
    }
  }

  /**
   * Extract lessons from fact data
   */
  extractLessonsFromFact(fact: any): string[] {
    try {
      if (!fact) return [];

      const lessons: string[] = [];

      // Extract lessons from various fact structures
      if (fact.lessons_learned) {
        if (Array.isArray(fact.lessons_learned)) {
          lessons.push(...fact.lessons_learned);
        } else if (typeof fact.lessons_learned === 'string') {
          lessons.push(fact.lessons_learned);
        }
      }

      if (fact.lessons) {
        if (Array.isArray(fact.lessons)) {
          lessons.push(...fact.lessons);
        } else if (typeof fact.lessons === 'string') {
          lessons.push(fact.lessons);
        }
      }

      if (fact.insights) {
        if (Array.isArray(fact.insights)) {
          lessons.push(...fact.insights);
        } else if (typeof fact.insights === 'string') {
          lessons.push(fact.insights);
        }
      }

      if (fact.notes) {
        if (Array.isArray(fact.notes)) {
          lessons.push(...fact.notes);
        } else if (typeof fact.notes === 'string') {
          lessons.push(fact.notes);
        }
      }

      // Extract lessons from content text
      if (fact.content || fact.fact) {
        const content = fact.content || fact.fact;
        if (typeof content === 'string') {
          const extractedLessons = this.extractLessonsFromText(content);
          lessons.push(...extractedLessons);
        }
      }

      // Remove duplicates and empty strings
      return [...new Set(lessons.filter(lesson => lesson && lesson.trim()))];
    } catch (error) {
      this.logger.warn('Error extracting lessons from fact', { error, fact });
      return [];
    }
  }

  /**
   * Extract context conditions from result data
   */
  extractContextConditions(result: any): any {
    try {
      if (!result) return {};

      // Extract context conditions from various fact structures
      return {
        market_regime: this.extractMarketRegime(result),
        volatility: this.extractVolatility(result),
        volume_ratio: this.extractVolumeRatio(result),
        trend_direction: this.extractTrendDirection(result),
        sector: this.extractSector(result),
        time_period: this.extractTimeEffectiveness(result),
        market_sentiment: this.extractMarketSentiment(result),
        liquidity: this.extractLiquidity(result),
        competition_level: this.extractCompetitionLevel(result),
        regulatory_environment: this.extractRegulatoryEnvironment(result)
      };
    } catch (error) {
      this.logger.warn('Error extracting context conditions', { error, result });
      return {};
    }
  }

  /**
   * Extract key insights from result data
   */
  extractKeyInsights(result: any): string[] {
    try {
      if (!result) return [];

      const insights: string[] = [];

      // Extract insights from various fact structures
      if (result.key_insights) {
        if (Array.isArray(result.key_insights)) {
          insights.push(...result.key_insights);
        } else if (typeof result.key_insights === 'string') {
          insights.push(result.key_insights);
        }
      }

      if (result.insights) {
        if (Array.isArray(result.insights)) {
          insights.push(...result.insights);
        } else if (typeof result.insights === 'string') {
          insights.push(result.insights);
        }
      }

      if (result.analysis) {
        if (Array.isArray(result.analysis)) {
          insights.push(...result.analysis);
        } else if (typeof result.analysis === 'string') {
          insights.push(result.analysis);
        }
      }

      // Extract insights from content text
      if (result.content || result.fact) {
        const content = result.content || result.fact;
        if (typeof content === 'string') {
          const extractedInsights = this.extractInsightsFromText(content);
          insights.push(...extractedInsights);
        }
      }

      // Generate insights from performance data
      const performanceInsights = this.generatePerformanceInsights(result);
      insights.push(...performanceInsights);

      // Remove duplicates and empty strings
      return [...new Set(insights.filter(insight => insight && insight.trim()))];
    } catch (error) {
      this.logger.warn('Error extracting key insights', { error, result });
      return [];
    }
  }

  // Text Processing Methods

  /**
   * Extract lessons from text content
   */
  private extractLessonsFromText(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') return [];

      const lessons: string[] = [];
      const lowerText = text.toLowerCase();

      // Look for lesson-related keywords and extract surrounding context
      const lessonKeywords = ['lesson', 'learned', 'insight', 'key takeaway', 'important', 'note'];

      for (const keyword of lessonKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          // Extract sentence containing the keyword
          const sentenceStart = text.lastIndexOf('.', index) + 1;
          const sentenceEnd = text.indexOf('.', index + keyword.length);
          if (sentenceEnd !== -1) {
            const sentence = text.substring(sentenceStart, sentenceEnd + 1).trim();
            if (sentence.length > 10) {
              lessons.push(sentence);
            }
          }
        }
      }

      return lessons;
    } catch (error) {
      this.logger.warn('Error extracting lessons from text', { error });
      return [];
    }
  }

  /**
   * Extract insights from text content
   */
  private extractInsightsFromText(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') return [];

      const insights: string[] = [];
      const lowerText = text.toLowerCase();

      // Look for insight-related keywords and extract surrounding context
      const insightKeywords = ['insight', 'observation', 'finding', 'discovery', 'pattern', 'trend'];

      for (const keyword of insightKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          // Extract sentence containing the keyword
          const sentenceStart = text.lastIndexOf('.', index) + 1;
          const sentenceEnd = text.indexOf('.', index + keyword.length);
          if (sentenceEnd !== -1) {
            const sentence = text.substring(sentenceStart, sentenceEnd + 1).trim();
            if (sentence.length > 10) {
              insights.push(sentence);
            }
          }
        }
      }

      return insights;
    } catch (error) {
      this.logger.warn('Error extracting insights from text', { error });
      return [];
    }
  }

  /**
   * Generate performance-based insights
   */
  private generatePerformanceInsights(result: any): string[] {
    try {
      const insights: string[] = [];
      const performanceData = this.extractPerformanceData(result);

      // Success rate insights
      if (performanceData.success_rate > 0.7) {
        insights.push('High success rate indicates strong strategy performance');
      } else if (performanceData.success_rate < 0.4) {
        insights.push('Low success rate suggests need for strategy refinement');
      }

      // Volatility insights
      if (performanceData.volatility > 0.25) {
        insights.push('High volatility may require enhanced risk management');
      }

      // Drawdown insights
      if (performanceData.max_drawdown > 0.15) {
        insights.push('Significant drawdown indicates potential risk exposure');
      }

      // Sharpe ratio insights
      if (performanceData.sharpe_ratio > 1.5) {
        insights.push('Strong risk-adjusted returns indicate efficient strategy');
      } else if (performanceData.sharpe_ratio < 0.5) {
        insights.push('Poor risk-adjusted returns suggest strategy inefficiency');
      }

      return insights;
    } catch (error) {
      this.logger.warn('Error generating performance insights', { error });
      return [];
    }
  }

  // Recommendation Generation Methods

  /**
   * Generate recommendations based on performance data and criteria
   */
  generateRecommendations(performanceData: any, criteria: any): string[] {
    try {
      if (!performanceData) return ['Insufficient data for recommendations'];

      const recommendations: string[] = [];

      // Analyze success rate
      if (performanceData.success_rate > 0.7) {
        recommendations.push('Strategy performing well - consider increasing position size');
      } else if (performanceData.success_rate < 0.4) {
        recommendations.push('Strategy underperforming - review entry/exit criteria');
      }

      // Analyze volatility
      if (performanceData.volatility > 0.25) {
        recommendations.push('High volatility detected - consider risk management adjustments');
      }

      // Analyze drawdown
      if (performanceData.max_drawdown > 0.15) {
        recommendations.push('Significant drawdown - implement stop-loss measures');
      }

      // Strategy-specific recommendations
      if (performanceData.strategy_type) {
        const strategyRecs = this.generateStrategyRecommendations(performanceData.strategy_type, performanceData);
        recommendations.push(...strategyRecs);
      }

      // Risk-based recommendations
      if (performanceData.risk_level) {
        const riskRecs = this.generateRiskRecommendations(performanceData.risk_level, performanceData);
        recommendations.push(...riskRecs);
      }

      // Market condition recommendations
      if (criteria?.market_conditions) {
        const marketRecs = this.generateMarketRecommendations(criteria.market_conditions, performanceData);
        recommendations.push(...marketRecs);
      }

      return recommendations.length > 0 ? recommendations : ['Monitor performance and adjust as needed'];
    } catch (error) {
      this.logger.warn('Error generating recommendations', { error, performanceData });
      return ['Unable to generate recommendations due to data processing error'];
    }
  }

  /**
   * Generate strategy-specific recommendations
   */
  private generateStrategyRecommendations(strategyType: string, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      switch (strategyType.toLowerCase()) {
        case 'momentum':
          if (performanceData.volatility > 0.2) {
            recommendations.push('Consider volatility filters for momentum strategy');
          }
          if (performanceData.success_rate < 0.6) {
            recommendations.push('Review momentum entry timing and strength thresholds');
          }
          break;

        case 'mean_reversion':
          if (performanceData.max_drawdown > 0.1) {
            recommendations.push('Implement tighter stop-losses for mean reversion');
          }
          if (performanceData.avg_trade_duration > 5) {
            recommendations.push('Consider shorter holding periods for mean reversion');
          }
          break;

        case 'breakout':
          if (performanceData.success_rate > 0.7) {
            recommendations.push('Strong breakout performance - consider scaling up');
          }
          if (performanceData.volatility < 0.15) {
            recommendations.push('Low volatility may reduce breakout opportunities');
          }
          break;

        case 'scalping':
          if (performanceData.avg_trade_duration > 0.1) {
            recommendations.push('Review scalping execution speed and slippage');
          }
          break;

        default:
          recommendations.push('Monitor strategy performance and adjust parameters as needed');
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating strategy recommendations', { error });
      return [];
    }
  }

  /**
   * Generate risk-based recommendations
   */
  private generateRiskRecommendations(riskLevel: string, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      switch (riskLevel.toLowerCase()) {
        case 'high':
          if (performanceData.max_drawdown > 0.2) {
            recommendations.push('High risk strategy experiencing large drawdowns - consider risk reduction');
          }
          if (performanceData.volatility > 0.3) {
            recommendations.push('Extreme volatility in high-risk strategy - implement position sizing limits');
          }
          break;

        case 'medium':
          if (performanceData.success_rate < 0.5) {
            recommendations.push('Medium risk strategy underperforming - review risk/reward balance');
          }
          break;

        case 'low':
          if (performanceData.success_rate > 0.8) {
            recommendations.push('Conservative strategy performing well - consider slight risk increase');
          }
          if (performanceData.avg_return < 0.02) {
            recommendations.push('Low returns in conservative strategy - evaluate opportunity cost');
          }
          break;

        default:
          recommendations.push('Maintain appropriate risk management practices');
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating risk recommendations', { error });
      return [];
    }
  }

  /**
   * Generate market condition recommendations
   */
  private generateMarketRecommendations(marketConditions: any, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      if (marketConditions.market_regime === 'bull') {
        if (performanceData.success_rate < 0.6) {
          recommendations.push('Bull market performance below expectations - review bullish bias');
        }
      } else if (marketConditions.market_regime === 'bear') {
        if (performanceData.success_rate < 0.5) {
          recommendations.push('Bear market performance concerning - consider defensive measures');
        }
      }

      if (marketConditions.volatility > 0.25) {
        if (performanceData.max_drawdown > 0.15) {
          recommendations.push('High market volatility causing significant drawdowns - implement volatility-based position sizing');
        }
      }

      if (marketConditions.trend_direction === 'sideways') {
        if (performanceData.success_rate < 0.55) {
          recommendations.push('Poor performance in sideways market - consider range-bound strategies');
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating market recommendations', { error });
      return [];
    }
  }
}

/**
 * Factory function to create DataExtraction instance
 */
export function createDataExtraction(logger?: any): DataExtraction {
  return new DataExtraction(logger);
}