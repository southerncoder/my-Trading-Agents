/**
 * Breakout Trading Strategies
 * 
 * This module implements various breakout strategies that capitalize on 
 * price movements beyond established support/resistance levels or consolidation patterns.
 * 
 * TODO: Add volume-confirmed breakout strategies
 * TODO: Implement pattern breakout recognition (triangles, flags, pennants)
 * TODO: Add failed breakout (fakeout) detection and reversal strategies
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
 * Range Breakout Strategy
 * 
 * Identifies consolidation ranges and generates signals when price breaks
 * above resistance or below support with sufficient volume confirmation.
 * 
 * TODO: Add adaptive range detection based on volatility
 * TODO: Implement time-based range validation
 * TODO: Add breakout target calculation using range height
 */
export class RangeBreakoutStrategy extends BaseTradingStrategy {
  private consolidationPeriod: number;
  private rangeThreshold: number; // Minimum range width as percentage
  private breakoutThreshold: number; // Percentage beyond range for confirmation
  private volumeMultiplier: number; // Volume required for confirmation
  private logger = createLogger('agent', 'range-breakout-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'Range_Breakout',
      'Range breakout strategy using consolidation pattern detection and volume confirmation',
      config,
      tradingConfig
    );

    this.consolidationPeriod = config.parameters.consolidationPeriod || 20;
    this.rangeThreshold = config.parameters.rangeThreshold || 0.02; // 2%
    this.breakoutThreshold = config.parameters.breakoutThreshold || 0.005; // 0.5%
    this.volumeMultiplier = config.parameters.volumeMultiplier || 1.5;
  }

  /**
   * Analyze market data for range breakout signals
   * 
   * TODO: Add pattern quality scoring
   * TODO: Implement false breakout detection
   * TODO: Add multi-timeframe confirmation
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.consolidationPeriod + 10) {
      return signals;
    }

    try {
      const recentData = marketData.slice(-this.consolidationPeriod);
      const currentData = marketData[marketData.length - 1]!;
      const currentPrice = currentData.close;

      // Identify consolidation range
      const range = this.identifyConsolidationRange(recentData);
      
      if (!range || !this.isValidRange(range, recentData)) {
        return signals;
      }

      // Check for upward breakout
      if (currentPrice > range.resistance + (range.resistance * this.breakoutThreshold)) {
        const volumeConfirmed = this.confirmBreakoutVolume(marketData);
        const rangeQuality = this.calculateRangeQuality(range, recentData);
        
        if (volumeConfirmed) {
          const strength = this.calculateBreakoutStrength(
            currentPrice,
            range.resistance,
            rangeQuality,
            'BUY'
          );
          
          const confidence = this.calculateBreakoutConfidence(
            currentData,
            range,
            volumeConfirmed,
            'BUY'
          );
          
          const target = this.calculateBreakoutTarget(range, 'BUY');
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.BUY,
            strength,
            confidence,
            currentPrice,
            `Range breakout upward: Price $${currentPrice.toFixed(2)} broke above resistance $${range.resistance.toFixed(2)} with ${volumeConfirmed ? 'strong' : 'weak'} volume. Target: $${target.toFixed(2)}`,
            {
              rangeSupport: range.support,
              rangeResistance: range.resistance,
              rangeHeight: range.height,
              rangeQuality,
              breakoutTarget: target,
              volumeConfirmed,
              breakoutStrength: (currentPrice - range.resistance) / range.resistance,
              consolidationPeriod: this.consolidationPeriod
            }
          ));
        }
      }

      // Check for downward breakout
      if (currentPrice < range.support - (range.support * this.breakoutThreshold)) {
        const volumeConfirmed = this.confirmBreakoutVolume(marketData);
        const rangeQuality = this.calculateRangeQuality(range, recentData);
        
        if (volumeConfirmed) {
          const strength = this.calculateBreakoutStrength(
            currentPrice,
            range.support,
            rangeQuality,
            'SELL'
          );
          
          const confidence = this.calculateBreakoutConfidence(
            currentData,
            range,
            volumeConfirmed,
            'SELL'
          );
          
          const target = this.calculateBreakoutTarget(range, 'SELL');
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.SELL,
            strength,
            confidence,
            currentPrice,
            `Range breakout downward: Price $${currentPrice.toFixed(2)} broke below support $${range.support.toFixed(2)} with ${volumeConfirmed ? 'strong' : 'weak'} volume. Target: $${target.toFixed(2)}`,
            {
              rangeSupport: range.support,
              rangeResistance: range.resistance,
              rangeHeight: range.height,
              rangeQuality,
              breakoutTarget: target,
              volumeConfirmed,
              breakoutStrength: (range.support - currentPrice) / range.support,
              consolidationPeriod: this.consolidationPeriod
            }
          ));
        }
      }

    } catch (error) {
      this.logger.error('analysis-error', 'Error in Range Breakout analysis', { 
        error: error instanceof Error ? error.message : String(error),
        consolidationPeriod: this.consolidationPeriod,
        rangeThreshold: this.rangeThreshold,
        breakoutThreshold: this.breakoutThreshold,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Identify consolidation range in recent data
   * 
   * TODO: Use more sophisticated range detection algorithms
   * TODO: Add pattern recognition (rectangles, triangles, etc.)
   */
  private identifyConsolidationRange(data: MarketData[]): { support: number, resistance: number, height: number } | null {
    if (data.length < 10) return null;

    // Find highest high and lowest low in the period
    let high = data[0]!.high;
    let low = data[0]!.low;

    for (const candle of data) {
      if (candle.high > high) high = candle.high;
      if (candle.low < low) low = candle.low;
    }

    const height = high - low;
    const midPoint = (high + low) / 2;
    const heightPercent = height / midPoint;

    // Check if range meets minimum threshold
    if (heightPercent < this.rangeThreshold) {
      return null;
    }

    return {
      support: low,
      resistance: high,
      height: heightPercent
    };
  }

  /**
   * Validate that the identified range represents genuine consolidation
   * 
   * TODO: Add more sophisticated validation criteria
   * TODO: Check for clean bounces off support/resistance
   */
  private isValidRange(range: { support: number, resistance: number, height: number }, data: MarketData[]): boolean {
    let touchCount = 0;
    const tolerance = range.height * 0.1; // 10% of range height

    // Count touches of support and resistance
    for (const candle of data) {
      // Check for support touches
      if (Math.abs(candle.low - range.support) <= tolerance) {
        touchCount++;
      }
      
      // Check for resistance touches
      if (Math.abs(candle.high - range.resistance) <= tolerance) {
        touchCount++;
      }
    }

    // Range should have at least 3 touches to be valid
    return touchCount >= 3;
  }

  /**
   * Confirm breakout with volume analysis
   * 
   * TODO: Add more sophisticated volume pattern analysis
   * TODO: Implement volume-price trend analysis
   */
  private confirmBreakoutVolume(data: MarketData[]): boolean {
    if (data.length < 10) return false;

    const recentVolumes = data.slice(-5);
    const consolidationVolumes = data.slice(-this.consolidationPeriod, -5);
    
    const recentAvgVolume = recentVolumes.reduce((sum, d) => sum + d.volume, 0) / recentVolumes.length;
    const consolidationAvgVolume = consolidationVolumes.reduce((sum, d) => sum + d.volume, 0) / consolidationVolumes.length;

    return recentAvgVolume >= consolidationAvgVolume * this.volumeMultiplier;
  }

  /**
   * Calculate range quality score
   * 
   * TODO: Add more quality factors (time duration, clean bounces, etc.)
   */
  private calculateRangeQuality(range: { support: number, resistance: number, height: number }, data: MarketData[]): number {
    let quality = 50; // Base quality

    // Add range height factor
    quality += Math.min(25, range.height * 500);

    // Add consolidation duration factor
    quality += Math.min(15, data.length);

    // Add touch count factor
    const touches = this.countRangeTouches(range, data);
    quality += Math.min(10, touches * 2);

    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Count touches of support and resistance
   */
  private countRangeTouches(range: { support: number, resistance: number, height: number }, data: MarketData[]): number {
    let touches = 0;
    const tolerance = range.height * 0.1;

    for (const candle of data) {
      if (Math.abs(candle.low - range.support) <= tolerance ||
          Math.abs(candle.high - range.resistance) <= tolerance) {
        touches++;
      }
    }

    return touches;
  }

  /**
   * Calculate breakout signal strength
   */
  private calculateBreakoutStrength(
    currentPrice: number,
    breakoutLevel: number,
    rangeQuality: number,
    _direction: 'BUY' | 'SELL'
  ): SignalStrength {
    const breakoutDistance = Math.abs(currentPrice - breakoutLevel) / breakoutLevel;
    const strengthScore = (breakoutDistance * 1000) + (rangeQuality * 0.5);

    if (strengthScore >= 40) return SignalStrength.VERY_STRONG;
    if (strengthScore >= 30) return SignalStrength.STRONG;
    if (strengthScore >= 20) return SignalStrength.MODERATE;
    if (strengthScore >= 10) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate breakout confidence
   */
  private calculateBreakoutConfidence(
    currentData: MarketData,
    range: { support: number, resistance: number, height: number },
    volumeConfirmed: boolean,
    _direction: 'BUY' | 'SELL'
  ): number {
    let confidence = 50;

    // Add range quality factor
    const rangeQuality = this.calculateRangeQuality(range, [currentData]);
    confidence += rangeQuality * 0.3;

    // Add volume confirmation
    if (volumeConfirmed) {
      confidence += 25;
    }

    // Add range height factor (larger ranges = higher confidence)
    confidence += Math.min(15, range.height * 300);

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate breakout target price
   * 
   * TODO: Add different target calculation methods
   */
  private calculateBreakoutTarget(range: { support: number, resistance: number, height: number }, direction: 'BUY' | 'SELL'): number {
    const rangeHeight = range.resistance - range.support;
    
    if (direction === 'BUY') {
      return range.resistance + rangeHeight; // Project range height above resistance
    } else {
      return range.support - rangeHeight; // Project range height below support
    }
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.rangeThreshold <= 0 || this.rangeThreshold > 0.1) {
      this.logger.error('validation-error', 'Range threshold should be between 0 and 0.1', {
        rangeThreshold: this.rangeThreshold,
        strategy: this.name
      });
      return false;
    }

    if (this.volumeMultiplier < 1) {
      this.logger.error('validation-error', 'Volume multiplier should be at least 1', {
        volumeMultiplier: this.volumeMultiplier,
        strategy: this.name
      });
      return false;
    }

    return true;
  }
}

/**
 * Volatility Breakout Strategy
 * 
 * Uses volatility measures (ATR, Bollinger Band width) to identify
 * low volatility periods followed by high volatility breakouts.
 * 
 * TODO: Add volatility regime detection
 * TODO: Implement adaptive volatility thresholds
 * TODO: Add volatility clustering analysis
 */
export class VolatilityBreakoutStrategy extends BaseTradingStrategy {
  private atrPeriod: number;
  private lowVolatilityThreshold: number; // ATR percentile for low volatility
  private breakoutMultiplier: number; // ATR multiplier for breakout detection
  private lookbackPeriod: number;
  private logger = createLogger('agent', 'volatility-breakout-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'Volatility_Breakout',
      'Volatility breakout strategy using ATR-based squeeze and expansion detection',
      config,
      tradingConfig
    );

    this.atrPeriod = config.parameters.atrPeriod || 14;
    this.lowVolatilityThreshold = config.parameters.lowVolatilityThreshold || 0.3; // 30th percentile
    this.breakoutMultiplier = config.parameters.breakoutMultiplier || 2.0;
    this.lookbackPeriod = config.parameters.lookbackPeriod || 50;
  }

  /**
   * Analyze market data for volatility breakout signals
   * 
   * TODO: Add volatility forecast models
   * TODO: Implement volatility mean reversion detection
   * TODO: Add correlation with market volatility index
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.lookbackPeriod + this.atrPeriod) {
      return signals;
    }

    try {
      const atrValues = this.calculateATR(marketData);
      
      if (atrValues.length < 10) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentATR = atrValues[atrValues.length - 1]!;
      const currentPrice = currentData.close;

      // Check for low volatility setup
      const isLowVolatility = this.isLowVolatilityPeriod(atrValues);
      
      if (!isLowVolatility) {
        return signals; // Wait for low volatility setup
      }

      // Calculate recent price movement
      const recentData = marketData.slice(-5);
      const priceRange = this.calculateRecentPriceMovement(recentData);

      // Check for volatility expansion breakout
      if (priceRange > currentATR * this.breakoutMultiplier) {
        const direction = this.determineBreakoutDirection(recentData);
        const volatilityExpansion = priceRange / currentATR;
        
        const strength = this.calculateVolatilityStrength(volatilityExpansion);
        const confidence = this.calculateVolatilityConfidence(
          currentData,
          atrValues,
          volatilityExpansion,
          direction
        );

        const signalType = direction === 'UP' ? SignalType.BUY : SignalType.SELL;
        
        signals.push(this.createSignal(
          currentData.symbol,
          signalType,
          strength,
          confidence,
          currentPrice,
          `Volatility breakout ${direction.toLowerCase()}: ATR expansion ${volatilityExpansion.toFixed(2)}x after low volatility period. Current ATR: ${currentATR.toFixed(4)}`,
          {
            currentATR,
            atrExpansion: volatilityExpansion,
            breakoutDirection: direction,
            lowVolatilitySetup: true,
            priceMovement: priceRange,
            volatilityPercentile: this.calculateVolatilityPercentile(currentATR, atrValues)
          }
        ));
      }

    } catch (error) {
      this.logger.error('analysis-error', 'Error in Volatility Breakout analysis', { 
        error: error instanceof Error ? error.message : String(error),
        atrPeriod: this.atrPeriod,
        lowVolatilityThreshold: this.lowVolatilityThreshold,
        breakoutMultiplier: this.breakoutMultiplier,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Calculate Average True Range
   * 
   * TODO: Add different ATR calculation methods (Wilder's, EMA-based, etc.)
   */
  private calculateATR(data: MarketData[]): number[] {
    const atr: number[] = [];
    
    if (data.length < this.atrPeriod + 1) return atr;
    
    const trueRanges: number[] = [];
    
    // Calculate True Range for each day
    for (let i = 1; i < data.length; i++) {
      const current = data[i]!;
      const previous = data[i - 1]!;
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trueRanges.push(tr);
    }
    
    // Calculate ATR using simple moving average of True Range
    for (let i = this.atrPeriod - 1; i < trueRanges.length; i++) {
      let sum = 0;
      for (let j = i - this.atrPeriod + 1; j <= i; j++) {
        sum += trueRanges[j]!;
      }
      atr.push(sum / this.atrPeriod);
    }
    
    return atr;
  }

  /**
   * Determine if current period has low volatility
   * 
   * TODO: Add more sophisticated volatility regime detection
   */
  private isLowVolatilityPeriod(atrValues: number[]): boolean {
    if (atrValues.length < 20) return false;

    const currentATR = atrValues[atrValues.length - 1]!;
    const recentATRs = atrValues.slice(-20);
    
    // Calculate percentile rank of current ATR
    const sortedATRs = [...recentATRs].sort((a, b) => a - b);
    const percentileIndex = Math.floor(sortedATRs.length * this.lowVolatilityThreshold);
    const thresholdATR = sortedATRs[percentileIndex]!;

    return currentATR <= thresholdATR;
  }

  /**
   * Calculate recent price movement range
   */
  private calculateRecentPriceMovement(data: MarketData[]): number {
    if (data.length === 0) return 0;

    const high = Math.max(...data.map(d => d.high));
    const low = Math.min(...data.map(d => d.low));
    
    return high - low;
  }

  /**
   * Determine breakout direction
   * 
   * TODO: Add more sophisticated direction detection
   */
  private determineBreakoutDirection(data: MarketData[]): 'UP' | 'DOWN' {
    if (data.length < 2) return 'UP';

    const startPrice = data[0]!.close;
    const endPrice = data[data.length - 1]!.close;

    return endPrice > startPrice ? 'UP' : 'DOWN';
  }

  /**
   * Calculate volatility signal strength
   */
  private calculateVolatilityStrength(volatilityExpansion: number): SignalStrength {
    if (volatilityExpansion >= 4.0) return SignalStrength.VERY_STRONG;
    if (volatilityExpansion >= 3.0) return SignalStrength.STRONG;
    if (volatilityExpansion >= 2.5) return SignalStrength.MODERATE;
    if (volatilityExpansion >= 2.0) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate volatility confidence
   */
  private calculateVolatilityConfidence(
    currentData: MarketData,
    atrValues: number[],
    volatilityExpansion: number,
    _direction: 'UP' | 'DOWN'
  ): number {
    let confidence = 50;

    // Add volatility expansion factor
    confidence += Math.min(30, (volatilityExpansion - 2) * 15);

    // Add volume confirmation
    if (atrValues.length >= 5) {
      const recentData = atrValues.slice(-5);
      const avgVolume = recentData.reduce((sum, atr) => sum + atr, 0) / recentData.length;
      if (currentData.volume > avgVolume * 1.5) {
        confidence += 15;
      }
    }

    // Add low volatility setup bonus
    if (this.isLowVolatilityPeriod(atrValues)) {
      confidence += 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate volatility percentile
   */
  private calculateVolatilityPercentile(currentATR: number, atrValues: number[]): number {
    const sortedATRs = [...atrValues].sort((a, b) => a - b);
    const rank = sortedATRs.findIndex(atr => atr >= currentATR);
    
    return (rank / sortedATRs.length) * 100;
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.lowVolatilityThreshold <= 0 || this.lowVolatilityThreshold >= 1) {
      this.logger.error('validation-error', 'Low volatility threshold should be between 0 and 1', {
        lowVolatilityThreshold: this.lowVolatilityThreshold,
        strategy: this.name
      });
      return false;
    }

    if (this.breakoutMultiplier < 1) {
      this.logger.error('validation-error', 'Breakout multiplier should be at least 1', {
        breakoutMultiplier: this.breakoutMultiplier,
        strategy: this.name
      });
      return false;
    }

    return true;
  }
}

// TODO: Add more breakout strategies:
// - Triangle Breakout Strategy
// - Flag and Pennant Breakout Strategy
// - Channel Breakout Strategy
// - Head and Shoulders Breakout Strategy
// - Cup and Handle Breakout Strategy
// - Ascending/Descending Triangle Breakout Strategy