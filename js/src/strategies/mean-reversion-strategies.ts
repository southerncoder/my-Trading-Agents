/**
 * Mean Reversion Trading Strategies
 * 
 * This module implements various mean reversion strategies that capitalize on 
 * the tendency of prices to return to their historical average.
 * 
 * TODO: Add statistical arbitrage and pairs trading strategies
 * TODO: Implement regime-aware mean reversion with volatility clustering
 * TODO: Add machine learning-based mean reversion prediction
 */

import { 
  BaseTradingStrategy, 
  MarketData, 
  TradingSignal, 
  SignalType, 
  SignalStrength, 
  StrategyConfig 
} from './base-strategy';
import { TradingAgentsConfig } from '../config';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Bollinger Bands Mean Reversion Strategy
 * 
 * Uses Bollinger Band extremes to identify overbought/oversold conditions
 * and generates signals when price touches or breaches the bands.
 * 
 * TODO: Add Bollinger Band squeeze detection
 * TODO: Implement %B and Bandwidth indicators
 * TODO: Add multi-timeframe band analysis
 */
export class BollingerBandsMeanReversionStrategy extends BaseTradingStrategy {
  private period: number;
  private standardDeviations: number;
  private bandTouchThreshold: number;
  private requireVolumeConfirmation: boolean;
  private logger = createLogger('agent', 'bollinger-bands-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'BBands_MeanReversion',
      'Bollinger Bands mean reversion strategy using band extremes and squeeze patterns',
      config,
      tradingConfig
    );

    this.period = config.parameters.period || 20;
    this.standardDeviations = config.parameters.standardDeviations || 2.0;
    this.bandTouchThreshold = config.parameters.bandTouchThreshold || 0.02; // 2% from band
    this.requireVolumeConfirmation = config.parameters.requireVolumeConfirmation !== false;
  }

  /**
   * Analyze market data for Bollinger Band mean reversion signals
   * 
   * TODO: Add band squeeze detection for breakout preparation
   * TODO: Implement band walk detection (trending markets)
   * TODO: Add support/resistance at bands
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.period + 5) {
      return signals;
    }

    try {
      const bollingerBands = this.calculateBollingerBands(marketData);
      
      if (bollingerBands.middle.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentPrice = currentData.close;
      
      const currentMiddle = bollingerBands.middle[bollingerBands.middle.length - 1]!;
      const currentUpper = bollingerBands.upper[bollingerBands.upper.length - 1]!;
      const currentLower = bollingerBands.lower[bollingerBands.lower.length - 1]!;

      // Calculate distance from bands
      const distanceFromUpper = (currentUpper - currentPrice) / currentPrice;
      const distanceFromLower = (currentPrice - currentLower) / currentPrice;

      // Check for oversold condition (near or below lower band)
      if (distanceFromLower <= this.bandTouchThreshold) {
        const volumeConfirmed = this.confirmWithVolume(marketData);
        const bandWidth = this.calculateBandWidth(bollingerBands);
        
        if (!this.requireVolumeConfirmation || volumeConfirmed) {
          const strength = this.calculateMeanReversionStrength(distanceFromLower, 'BUY');
          const confidence = this.calculateBollingerConfidence(
            distanceFromLower, 
            bandWidth, 
            volumeConfirmed, 
            'BUY'
          );
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.BUY,
            strength,
            confidence,
            currentPrice,
            `Bollinger Bands oversold: Price $${currentPrice.toFixed(2)} near lower band $${currentLower.toFixed(2)} (${(distanceFromLower * 100).toFixed(2)}% from band). Mean reversion expected.`,
            {
              upperBand: currentUpper,
              middleBand: currentMiddle,
              lowerBand: currentLower,
              distanceFromBand: distanceFromLower,
              bandWidth,
              bandPosition: 'near_lower',
              volumeConfirmed
            }
          ));
        }
      }

      // Check for overbought condition (near or above upper band)
      if (distanceFromUpper <= this.bandTouchThreshold) {
        const volumeConfirmed = this.confirmWithVolume(marketData);
        const bandWidth = this.calculateBandWidth(bollingerBands);
        
        if (!this.requireVolumeConfirmation || volumeConfirmed) {
          const strength = this.calculateMeanReversionStrength(distanceFromUpper, 'SELL');
          const confidence = this.calculateBollingerConfidence(
            distanceFromUpper, 
            bandWidth, 
            volumeConfirmed, 
            'SELL'
          );
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.SELL,
            strength,
            confidence,
            currentPrice,
            `Bollinger Bands overbought: Price $${currentPrice.toFixed(2)} near upper band $${currentUpper.toFixed(2)} (${(distanceFromUpper * 100).toFixed(2)}% from band). Mean reversion expected.`,
            {
              upperBand: currentUpper,
              middleBand: currentMiddle,
              lowerBand: currentLower,
              distanceFromBand: distanceFromUpper,
              bandWidth,
              bandPosition: 'near_upper',
              volumeConfirmed
            }
          ));
        }
      }

      // TODO: Add squeeze detection
      // TODO: Add band expansion/contraction signals

    } catch (error) {
      this.logger.error('analysis-error', 'Error in Bollinger Bands analysis', { 
        error: error instanceof Error ? error.message : String(error),
        period: this.period,
        standardDeviations: this.standardDeviations,
        bandTouchThreshold: this.bandTouchThreshold,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Calculate Bollinger Bands
   * 
   * TODO: Add different basis calculation methods (EMA, WMA, etc.)
   * TODO: Implement adaptive period selection
   */
  private calculateBollingerBands(data: MarketData[]): { middle: number[], upper: number[], lower: number[] } {
    const middle = this.calculateSMA(data, this.period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = this.period - 1; i < data.length; i++) {
      // Calculate standard deviation
      let sum = 0;
      for (let j = i - this.period + 1; j <= i; j++) {
        sum += Math.pow(data[j]!.close - middle[i - this.period + 1]!, 2);
      }
      const stdDev = Math.sqrt(sum / this.period);
      
      const middleValue = middle[i - this.period + 1]!;
      upper.push(middleValue + (stdDev * this.standardDeviations));
      lower.push(middleValue - (stdDev * this.standardDeviations));
    }
    
    return { middle, upper, lower };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: MarketData[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j]!.close;
      }
      sma.push(sum / period);
    }
    
    return sma;
  }

  /**
   * Calculate band width for volatility analysis
   */
  private calculateBandWidth(bands: { middle: number[], upper: number[], lower: number[] }): number {
    if (bands.middle.length === 0) return 0;
    
    const latest = bands.middle.length - 1;
    const middle = bands.middle[latest]!;
    const upper = bands.upper[latest]!;
    const lower = bands.lower[latest]!;
    
    return (upper - lower) / middle;
  }

  /**
   * Calculate mean reversion signal strength
   */
  private calculateMeanReversionStrength(distanceFromBand: number, _direction: 'BUY' | 'SELL'): SignalStrength {
    // Closer to band = stronger signal
    if (distanceFromBand <= 0.005) return SignalStrength.VERY_STRONG; // 0.5%
    if (distanceFromBand <= 0.01) return SignalStrength.STRONG; // 1%
    if (distanceFromBand <= 0.015) return SignalStrength.MODERATE; // 1.5%
    if (distanceFromBand <= 0.02) return SignalStrength.WEAK; // 2%
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate Bollinger Bands confidence
   */
  private calculateBollingerConfidence(
    distanceFromBand: number, 
    bandWidth: number, 
    volumeConfirmed: boolean, 
    _direction: 'BUY' | 'SELL'
  ): number {
    let confidence = 50;
    
    // Add distance component (closer = higher confidence)
    confidence += Math.max(0, (0.025 - distanceFromBand) * 1000);
    
    // Add band width component (wider bands = lower confidence in mean reversion)
    const normalizedBandWidth = Math.min(0.1, bandWidth);
    confidence += (0.1 - normalizedBandWidth) * 200;
    
    // Add volume confirmation
    if (volumeConfirmed) {
      confidence += 15;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Confirm signal with volume analysis
   * 
   * TODO: Implement sophisticated volume pattern analysis
   */
  private confirmWithVolume(data: MarketData[]): boolean {
    if (data.length < 5) return true;
    
    const recentData = data.slice(-5);
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
    const currentVolume = data[data.length - 1]!.volume;
    
    return currentVolume > avgVolume * 1.1; // 10% above average
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.standardDeviations <= 0) {
      this.logger.error('validation-error', 'Standard deviations must be positive', {
        standardDeviations: this.standardDeviations,
        strategy: this.name
      });
      return false;
    }
    
    if (this.bandTouchThreshold < 0 || this.bandTouchThreshold > 0.1) {
      this.logger.error('validation-error', 'Band touch threshold should be between 0 and 0.1', {
        bandTouchThreshold: this.bandTouchThreshold,
        strategy: this.name
      });
      return false;
    }
    
    return true;
  }
}

/**
 * Price Action Mean Reversion Strategy
 * 
 * Uses support/resistance levels and price extremes to identify
 * mean reversion opportunities based on price action patterns.
 * 
 * TODO: Add dynamic support/resistance level detection
 * TODO: Implement price action pattern recognition
 * TODO: Add volume profile integration
 */
export class PriceActionMeanReversionStrategy extends BaseTradingStrategy {
  private lookbackPeriod: number;
  private extremeThreshold: number; // Percentage for price extremes
  private supportResistanceStrength: number; // Minimum touches for S/R level
  private logger = createLogger('agent', 'price-action-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'PriceAction_MeanReversion',
      'Price action mean reversion using support/resistance and price extremes',
      config,
      tradingConfig
    );

    this.lookbackPeriod = config.parameters.lookbackPeriod || 50;
    this.extremeThreshold = config.parameters.extremeThreshold || 0.02; // 2%
    this.supportResistanceStrength = config.parameters.supportResistanceStrength || 3;
  }

  /**
   * Analyze market data for price action mean reversion signals
   * 
   * TODO: Add pattern recognition (doji, hammer, shooting star, etc.)
   * TODO: Implement dynamic S/R level detection
   * TODO: Add time-based pattern analysis
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.lookbackPeriod + 5) {
      return signals;
    }

    try {
      const recentData = marketData.slice(-this.lookbackPeriod);
      const currentData = marketData[marketData.length - 1]!;
      const currentPrice = currentData.close;

      // Find support and resistance levels
      const supportLevels = this.findSupportLevels(recentData);
      const resistanceLevels = this.findResistanceLevels(recentData);

      // Check for bounce off support
      const nearestSupport = this.findNearestLevel(currentPrice, supportLevels);
      if (nearestSupport && this.isNearLevel(currentPrice, nearestSupport.level, this.extremeThreshold)) {
        const strength = this.calculatePriceActionStrength(
          Math.abs(currentPrice - nearestSupport.level) / currentPrice,
          nearestSupport.strength,
          'BUY'
        );
        
        const confidence = this.calculatePriceActionConfidence(
          currentData,
          recentData,
          nearestSupport,
          'BUY'
        );
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.BUY,
          strength,
          confidence,
          currentPrice,
          `Price action support bounce: Current price $${currentPrice.toFixed(2)} near support level $${nearestSupport.level.toFixed(2)} (touched ${nearestSupport.strength} times)`,
          {
            supportLevel: nearestSupport.level,
            supportStrength: nearestSupport.strength,
            distanceFromLevel: Math.abs(currentPrice - nearestSupport.level) / currentPrice,
            levelType: 'support',
            candlePattern: this.identifyBasicPattern(currentData, recentData)
          }
        ));
      }

      // Check for rejection at resistance
      const nearestResistance = this.findNearestLevel(currentPrice, resistanceLevels);
      if (nearestResistance && this.isNearLevel(currentPrice, nearestResistance.level, this.extremeThreshold)) {
        const strength = this.calculatePriceActionStrength(
          Math.abs(currentPrice - nearestResistance.level) / currentPrice,
          nearestResistance.strength,
          'SELL'
        );
        
        const confidence = this.calculatePriceActionConfidence(
          currentData,
          recentData,
          nearestResistance,
          'SELL'
        );
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.SELL,
          strength,
          confidence,
          currentPrice,
          `Price action resistance rejection: Current price $${currentPrice.toFixed(2)} near resistance level $${nearestResistance.level.toFixed(2)} (touched ${nearestResistance.strength} times)`,
          {
            resistanceLevel: nearestResistance.level,
            resistanceStrength: nearestResistance.strength,
            distanceFromLevel: Math.abs(currentPrice - nearestResistance.level) / currentPrice,
            levelType: 'resistance',
            candlePattern: this.identifyBasicPattern(currentData, recentData)
          }
        ));
      }

    } catch (error) {
      this.logger.error('analysis-error', 'Error in Price Action analysis', { 
        error: error instanceof Error ? error.message : String(error),
        lookbackPeriod: this.lookbackPeriod,
        extremeThreshold: this.extremeThreshold,
        supportResistanceStrength: this.supportResistanceStrength,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Find support levels in price data
   * 
   * TODO: Use more sophisticated algorithms (pivot points, volume profile, etc.)
   */
  private findSupportLevels(data: MarketData[]): Array<{ level: number, strength: number }> {
    const levels: Array<{ level: number, strength: number }> = [];
    const tolerance = 0.01; // 1% tolerance for level grouping

    // Find local lows
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i]!;
      const prev2 = data[i - 2]!;
      const prev1 = data[i - 1]!;
      const next1 = data[i + 1]!;
      const next2 = data[i + 2]!;

      if (current.low <= prev2.low && 
          current.low <= prev1.low && 
          current.low <= next1.low && 
          current.low <= next2.low) {
        
        // Check if this level already exists
        const existingLevel = levels.find(l => 
          Math.abs(l.level - current.low) / current.low < tolerance
        );

        if (existingLevel) {
          existingLevel.strength++;
        } else {
          levels.push({ level: current.low, strength: 1 });
        }
      }
    }

    // Filter by minimum strength and return sorted by strength
    return levels
      .filter(l => l.strength >= this.supportResistanceStrength)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Find resistance levels in price data
   * 
   * TODO: Add volume-weighted resistance levels
   */
  private findResistanceLevels(data: MarketData[]): Array<{ level: number, strength: number }> {
    const levels: Array<{ level: number, strength: number }> = [];
    const tolerance = 0.01; // 1% tolerance for level grouping

    // Find local highs
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i]!;
      const prev2 = data[i - 2]!;
      const prev1 = data[i - 1]!;
      const next1 = data[i + 1]!;
      const next2 = data[i + 2]!;

      if (current.high >= prev2.high && 
          current.high >= prev1.high && 
          current.high >= next1.high && 
          current.high >= next2.high) {
        
        // Check if this level already exists
        const existingLevel = levels.find(l => 
          Math.abs(l.level - current.high) / current.high < tolerance
        );

        if (existingLevel) {
          existingLevel.strength++;
        } else {
          levels.push({ level: current.high, strength: 1 });
        }
      }
    }

    // Filter by minimum strength and return sorted by strength
    return levels
      .filter(l => l.strength >= this.supportResistanceStrength)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Find nearest support/resistance level to current price
   */
  private findNearestLevel(
    currentPrice: number, 
    levels: Array<{ level: number, strength: number }>
  ): { level: number, strength: number } | null {
    if (levels.length === 0) return null;

    return levels.reduce((nearest, current) => {
      const currentDistance = Math.abs(currentPrice - current.level);
      const nearestDistance = Math.abs(currentPrice - nearest.level);
      
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  /**
   * Check if price is near a level
   */
  private isNearLevel(price: number, level: number, threshold: number): boolean {
    return Math.abs(price - level) / price <= threshold;
  }

  /**
   * Calculate price action signal strength
   */
  private calculatePriceActionStrength(
    distanceFromLevel: number, 
    levelStrength: number, 
    _direction: 'BUY' | 'SELL'
  ): SignalStrength {
    // Combine distance and level strength
    const strengthScore = levelStrength * 10 + (0.02 - distanceFromLevel) * 1000;
    
    if (strengthScore >= 80) return SignalStrength.VERY_STRONG;
    if (strengthScore >= 60) return SignalStrength.STRONG;
    if (strengthScore >= 40) return SignalStrength.MODERATE;
    if (strengthScore >= 20) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate price action confidence
   */
  private calculatePriceActionConfidence(
    currentData: MarketData,
    recentData: MarketData[],
    level: { level: number, strength: number },
    _direction: 'BUY' | 'SELL'
  ): number {
    let confidence = 50;
    
    // Add level strength component
    confidence += Math.min(25, level.strength * 5);
    
    // Add distance component
    const distance = Math.abs(currentData.close - level.level) / currentData.close;
    confidence += Math.max(0, (0.02 - distance) * 500);
    
    // Add volume confirmation
    const avgVolume = recentData.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
    if (currentData.volume > avgVolume * 1.2) {
      confidence += 15;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Identify basic candlestick patterns
   * 
   * TODO: Implement comprehensive pattern recognition
   */
  private identifyBasicPattern(currentData: MarketData, _recentData: MarketData[]): string {
    const bodySize = Math.abs(currentData.close - currentData.open);
    const upperShadow = currentData.high - Math.max(currentData.open, currentData.close);
    const lowerShadow = Math.min(currentData.open, currentData.close) - currentData.low;
    const range = currentData.high - currentData.low;

    if (bodySize < range * 0.1) {
      return 'doji'; // Very small body
    }
    
    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
      return currentData.close > currentData.open ? 'hammer' : 'hanging_man';
    }
    
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
      return currentData.close > currentData.open ? 'shooting_star' : 'inverted_hammer';
    }
    
    return 'normal';
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.extremeThreshold <= 0 || this.extremeThreshold > 0.1) {
      this.logger.error('validation-error', 'Extreme threshold should be between 0 and 0.1', {
        extremeThreshold: this.extremeThreshold,
        strategy: this.name
      });
      return false;
    }
    
    if (this.supportResistanceStrength < 2) {
      this.logger.error('validation-error', 'Support/Resistance strength should be at least 2', {
        supportResistanceStrength: this.supportResistanceStrength,
        strategy: this.name
      });
      return false;
    }
    
    return true;
  }
}

// TODO: Add more mean reversion strategies:
// - Statistical Arbitrage Strategy
// - Pairs Trading Strategy
// - Z-Score Mean Reversion Strategy
// - Ornstein-Uhlenbeck Process Strategy
// - Kalman Filter Mean Reversion Strategy
// - Regime-Switching Mean Reversion Strategy