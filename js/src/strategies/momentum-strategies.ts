/**
 * Momentum Trading Strategies
 * 
 * This module implements various momentum-based trading strategies that capitalize on 
 * the tendency of assets to continue moving in their current direction.
 * 
 * TODO: Add adaptive momentum strategies that adjust to market volatility
 * TODO: Implement multi-timeframe momentum analysis
 * TODO: Add momentum ranking and portfolio rotation strategies
 */

import { 
  BaseTradingStrategy, 
  ITradingStrategy, 
  MarketData, 
  TradingSignal, 
  SignalType, 
  SignalStrength, 
  StrategyConfig,
  RiskLevel 
} from './base-strategy';
import { TradingAgentsConfig } from '../config';

/**
 * Moving Average Crossover Strategy
 * 
 * Generates signals based on crossovers between fast and slow moving averages.
 * Classic momentum strategy that works well in trending markets.
 * 
 * TODO: Add multiple MA types (SMA, EMA, WMA, DEMA, TEMA)
 * TODO: Implement adaptive period selection based on volatility
 * TODO: Add volume confirmation and divergence detection
 */
export class MovingAverageCrossoverStrategy extends BaseTradingStrategy {
  private fastPeriod: number;
  private slowPeriod: number;
  private maType: 'SMA' | 'EMA';
  private volumeConfirmation: boolean;

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'MA_Crossover',
      'Moving Average Crossover momentum strategy using fast/slow MA signals',
      config,
      tradingConfig
    );

    // Extract strategy-specific parameters
    this.fastPeriod = config.parameters.fastPeriod || 10;
    this.slowPeriod = config.parameters.slowPeriod || 20;
    this.maType = config.parameters.maType || 'EMA';
    this.volumeConfirmation = config.parameters.volumeConfirmation || false;
  }

  /**
   * Analyze market data for MA crossover signals
   * 
   * TODO: Add signal filtering based on trend strength
   * TODO: Implement multi-timeframe confirmation
   * TODO: Add adaptive thresholds based on market volatility
   */
  async analyze(marketData: MarketData[], currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.slowPeriod + 5) {
      return signals; // Insufficient data
    }

    try {
      // Calculate moving averages
      const fastMA = this.calculateMA(marketData, this.fastPeriod);
      const slowMA = this.calculateMA(marketData, this.slowPeriod);
      
      if (fastMA.length < 3 || slowMA.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentFastMA = fastMA[fastMA.length - 1]!;
      const currentSlowMA = slowMA[slowMA.length - 1]!;
      const prevFastMA = fastMA[fastMA.length - 2]!;
      const prevSlowMA = slowMA[slowMA.length - 2]!;

      // Detect crossovers
      const bullishCrossover = prevFastMA <= prevSlowMA && currentFastMA > currentSlowMA;
      const bearishCrossover = prevFastMA >= prevSlowMA && currentFastMA < currentSlowMA;

      if (bullishCrossover) {
        const trendStrength = this.calculateTrendStrength(marketData, fastMA, slowMA);
        const volumeConfirmed = this.confirmWithVolume(marketData, 'BUY');
        
        if (!this.volumeConfirmation || volumeConfirmed) {
          const confidence = this.calculateConfidence(trendStrength, volumeConfirmed, currentData);
          const strength = confidence > 70 ? SignalStrength.STRONG : SignalStrength.MODERATE;
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.BUY,
            strength,
            confidence,
            currentData.close,
            `Bullish MA crossover: Fast MA (${currentFastMA.toFixed(2)}) crossed above Slow MA (${currentSlowMA.toFixed(2)}). Trend strength: ${trendStrength.toFixed(2)}`,
            {
              fastMA: currentFastMA,
              slowMA: currentSlowMA,
              trendStrength,
              volumeConfirmed,
              crossoverType: 'golden_cross'
            }
          ));
        }
      }

      if (bearishCrossover) {
        const trendStrength = this.calculateTrendStrength(marketData, fastMA, slowMA);
        const volumeConfirmed = this.confirmWithVolume(marketData, 'SELL');
        
        if (!this.volumeConfirmation || volumeConfirmed) {
          const confidence = this.calculateConfidence(trendStrength, volumeConfirmed, currentData);
          const strength = confidence > 70 ? SignalStrength.STRONG : SignalStrength.MODERATE;
          
          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.SELL,
            strength,
            confidence,
            currentData.close,
            `Bearish MA crossover: Fast MA (${currentFastMA.toFixed(2)}) crossed below Slow MA (${currentSlowMA.toFixed(2)}). Trend strength: ${trendStrength.toFixed(2)}`,
            {
              fastMA: currentFastMA,
              slowMA: currentSlowMA,
              trendStrength,
              volumeConfirmed,
              crossoverType: 'death_cross'
            }
          ));
        }
      }

    } catch (error) {
      // TODO: Implement proper logging
      console.error(`Error in MA Crossover analysis:`, error);
    }

    return signals;
  }

  /**
   * Calculate moving average based on type
   * 
   * TODO: Implement more MA types (DEMA, TEMA, Hull MA, etc.)
   */
  private calculateMA(data: MarketData[], period: number): number[] {
    if (this.maType === 'EMA') {
      return this.calculateEMA(data, period);
    } else {
      return this.calculateSMA(data, period);
    }
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
   * Calculate Exponential Moving Average
   * 
   * TODO: Add different EMA calculation methods
   */
  private calculateEMA(data: MarketData[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    if (data.length === 0) return ema;
    
    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, data.length); i++) {
      sum += data[i]!.close;
    }
    ema.push(sum / Math.min(period, data.length));
    
    // Calculate subsequent EMA values
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i]!.close * multiplier) + (ema[ema.length - 1]! * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  /**
   * Calculate trend strength based on MA separation
   * 
   * TODO: Add volatility-adjusted trend strength
   * TODO: Implement trend acceleration measurement
   */
  private calculateTrendStrength(data: MarketData[], fastMA: number[], slowMA: number[]): number {
    if (fastMA.length === 0 || slowMA.length === 0) return 0;
    
    const currentFast = fastMA[fastMA.length - 1]!;
    const currentSlow = slowMA[slowMA.length - 1]!;
    const currentPrice = data[data.length - 1]!.close;
    
    const separation = Math.abs(currentFast - currentSlow) / currentPrice;
    const pricePosition = Math.abs(currentPrice - currentSlow) / currentPrice;
    
    return Math.min(100, (separation + pricePosition) * 500);
  }

  /**
   * Confirm signal with volume analysis
   * 
   * TODO: Implement sophisticated volume analysis
   * TODO: Add volume-price trend (VPT) confirmation
   */
  private confirmWithVolume(data: MarketData[], direction: 'BUY' | 'SELL'): boolean {
    if (data.length < 5) return true; // Default to confirmed if insufficient data
    
    // Simple volume confirmation: current volume > average volume
    const recentData = data.slice(-5);
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
    const currentVolume = data[data.length - 1]!.volume;
    
    return currentVolume > avgVolume * 1.2; // 20% above average
  }

  /**
   * Calculate signal confidence
   * 
   * TODO: Add more sophisticated confidence scoring
   * TODO: Implement machine learning-based confidence
   */
  private calculateConfidence(trendStrength: number, volumeConfirmed: boolean, currentData: MarketData): number {
    let confidence = 50; // Base confidence
    
    // Add trend strength component
    confidence += Math.min(30, trendStrength * 0.3);
    
    // Add volume confirmation
    if (volumeConfirmed) {
      confidence += 15;
    }
    
    // Add volatility consideration (lower volatility = higher confidence)
    const volatility = this.calculateVolatility(currentData);
    confidence += Math.max(-10, (0.02 - volatility) * 500);
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate price volatility
   * 
   * TODO: Use proper volatility calculations (ATR, historical vol, etc.)
   */
  private calculateVolatility(data: MarketData): number {
    // Simplified volatility calculation
    const range = data.high - data.low;
    return range / data.close;
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.fastPeriod >= this.slowPeriod) {
      console.error(`${this.name}: Fast period must be less than slow period`);
      return false;
    }
    
    if (this.fastPeriod < 1 || this.slowPeriod < 1) {
      console.error(`${this.name}: MA periods must be positive`);
      return false;
    }
    
    return true;
  }
}

/**
 * MACD (Moving Average Convergence Divergence) Strategy
 * 
 * Uses MACD line crossovers, signal line crossovers, and histogram analysis
 * for momentum-based trading decisions.
 * 
 * TODO: Add MACD divergence detection
 * TODO: Implement histogram pattern recognition
 * TODO: Add multi-timeframe MACD analysis
 */
export class MACDStrategy extends BaseTradingStrategy {
  private fastPeriod: number;
  private slowPeriod: number;
  private signalPeriod: number;
  private useHistogram: boolean;

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'MACD',
      'MACD momentum strategy using signal line crossovers and histogram analysis',
      config,
      tradingConfig
    );

    this.fastPeriod = config.parameters.fastPeriod || 12;
    this.slowPeriod = config.parameters.slowPeriod || 26;
    this.signalPeriod = config.parameters.signalPeriod || 9;
    this.useHistogram = config.parameters.useHistogram !== false;
  }

  /**
   * Analyze market data for MACD signals
   * 
   * TODO: Add MACD pattern recognition (bullish/bearish divergences)
   * TODO: Implement zero-line crossover analysis
   * TODO: Add histogram momentum analysis
   */
  async analyze(marketData: MarketData[], currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.slowPeriod + this.signalPeriod + 5) {
      return signals;
    }

    try {
      const macdData = this.calculateMACD(marketData);
      
      if (macdData.macd.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentMACD = macdData.macd[macdData.macd.length - 1]!;
      const currentSignal = macdData.signal[macdData.signal.length - 1]!;
      const currentHistogram = macdData.histogram[macdData.histogram.length - 1]!;
      
      const prevMACD = macdData.macd[macdData.macd.length - 2]!;
      const prevSignal = macdData.signal[macdData.signal.length - 2]!;
      const prevHistogram = macdData.histogram[macdData.histogram.length - 2]!;

      // Signal line crossover
      const bullishCrossover = prevMACD <= prevSignal && currentMACD > currentSignal;
      const bearishCrossover = prevMACD >= prevSignal && currentMACD < currentSignal;

      if (bullishCrossover) {
        const strength = this.calculateMACDStrength(macdData, 'BUY');
        const confidence = this.calculateMACDConfidence(macdData, currentData, 'BUY');
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.BUY,
          strength,
          confidence,
          currentData.close,
          `MACD bullish crossover: MACD (${currentMACD.toFixed(4)}) crossed above Signal (${currentSignal.toFixed(4)}). Histogram: ${currentHistogram.toFixed(4)}`,
          {
            macd: currentMACD,
            signal: currentSignal,
            histogram: currentHistogram,
            crossoverType: 'bullish'
          }
        ));
      }

      if (bearishCrossover) {
        const strength = this.calculateMACDStrength(macdData, 'SELL');
        const confidence = this.calculateMACDConfidence(macdData, currentData, 'SELL');
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.SELL,
          strength,
          confidence,
          currentData.close,
          `MACD bearish crossover: MACD (${currentMACD.toFixed(4)}) crossed below Signal (${currentSignal.toFixed(4)}). Histogram: ${currentHistogram.toFixed(4)}`,
          {
            macd: currentMACD,
            signal: currentSignal,
            histogram: currentHistogram,
            crossoverType: 'bearish'
          }
        ));
      }

      // TODO: Add zero-line crossover signals
      // TODO: Add histogram reversal signals
      // TODO: Add divergence detection

    } catch (error) {
      console.error(`Error in MACD analysis:`, error);
    }

    return signals;
  }

  /**
   * Calculate MACD components
   * 
   * TODO: Add different EMA calculation methods
   * TODO: Optimize calculation performance
   */
  private calculateMACD(data: MarketData[]): { macd: number[], signal: number[], histogram: number[] } {
    // Calculate EMAs
    const fastEMA = this.calculateEMA(data, this.fastPeriod);
    const slowEMA = this.calculateEMA(data, this.slowPeriod);
    
    // Calculate MACD line
    const macd: number[] = [];
    const startIndex = Math.max(0, this.slowPeriod - this.fastPeriod);
    
    for (let i = startIndex; i < fastEMA.length; i++) {
      const slowIndex = i - startIndex;
      if (slowIndex < slowEMA.length) {
        macd.push(fastEMA[i]! - slowEMA[slowIndex]!);
      }
    }
    
    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMAFromValues(macd, this.signalPeriod);
    
    // Calculate Histogram
    const histogram: number[] = [];
    for (let i = 0; i < Math.min(macd.length, signalLine.length); i++) {
      histogram.push(macd[i]! - signalLine[i]!);
    }
    
    return { macd, signal: signalLine, histogram };
  }

  /**
   * Calculate EMA from price data
   */
  private calculateEMA(data: MarketData[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    if (data.length === 0) return ema;
    
    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, data.length); i++) {
      sum += data[i]!.close;
    }
    ema.push(sum / Math.min(period, data.length));
    
    // Calculate subsequent EMA values
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i]!.close * multiplier) + (ema[ema.length - 1]! * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  /**
   * Calculate EMA from array of values
   */
  private calculateEMAFromValues(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    if (values.length === 0) return ema;
    
    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, values.length); i++) {
      sum += values[i]!;
    }
    ema.push(sum / Math.min(period, values.length));
    
    // Calculate subsequent EMA values
    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i]! * multiplier) + (ema[ema.length - 1]! * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  /**
   * Calculate MACD signal strength
   * 
   * TODO: Implement more sophisticated strength calculation
   */
  private calculateMACDStrength(macdData: { macd: number[], signal: number[], histogram: number[] }, direction: 'BUY' | 'SELL'): SignalStrength {
    if (macdData.histogram.length < 2) return SignalStrength.MODERATE;
    
    const currentHist = macdData.histogram[macdData.histogram.length - 1]!;
    const prevHist = macdData.histogram[macdData.histogram.length - 2]!;
    
    const histogramMomentum = Math.abs(currentHist - prevHist);
    
    if (histogramMomentum > 0.1) return SignalStrength.VERY_STRONG;
    if (histogramMomentum > 0.05) return SignalStrength.STRONG;
    if (histogramMomentum > 0.02) return SignalStrength.MODERATE;
    if (histogramMomentum > 0.01) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate MACD confidence
   * 
   * TODO: Add more factors to confidence calculation
   */
  private calculateMACDConfidence(macdData: { macd: number[], signal: number[], histogram: number[] }, currentData: MarketData, direction: 'BUY' | 'SELL'): number {
    let confidence = 50;
    
    // Add histogram momentum
    if (macdData.histogram.length >= 2) {
      const histChange = Math.abs(macdData.histogram[macdData.histogram.length - 1]! - macdData.histogram[macdData.histogram.length - 2]!);
      confidence += Math.min(25, histChange * 1000);
    }
    
    // Add zero-line consideration
    const currentMACD = macdData.macd[macdData.macd.length - 1]!;
    if ((direction === 'BUY' && currentMACD > 0) || (direction === 'SELL' && currentMACD < 0)) {
      confidence += 15;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.fastPeriod >= this.slowPeriod) {
      console.error(`${this.name}: Fast period must be less than slow period`);
      return false;
    }
    
    if (this.signalPeriod < 1) {
      console.error(`${this.name}: Signal period must be positive`);
      return false;
    }
    
    return true;
  }
}

/**
 * RSI (Relative Strength Index) Momentum Strategy
 * 
 * Uses RSI overbought/oversold levels and RSI divergences for trading signals.
 * 
 * TODO: Add RSI divergence detection
 * TODO: Implement RSI pattern recognition
 * TODO: Add multi-timeframe RSI analysis
 */
export class RSIMomentumStrategy extends BaseTradingStrategy {
  private rsiPeriod: number;
  private oversoldLevel: number;
  private overboughtLevel: number;
  private useDivergence: boolean;

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'RSI_Momentum',
      'RSI momentum strategy using overbought/oversold levels and divergence analysis',
      config,
      tradingConfig
    );

    this.rsiPeriod = config.parameters.rsiPeriod || 14;
    this.oversoldLevel = config.parameters.oversoldLevel || 30;
    this.overboughtLevel = config.parameters.overboughtLevel || 70;
    this.useDivergence = config.parameters.useDivergence !== false;
  }

  /**
   * Analyze market data for RSI signals
   * 
   * TODO: Implement RSI divergence detection
   * TODO: Add RSI trend line break analysis
   * TODO: Add multi-timeframe RSI confirmation
   */
  async analyze(marketData: MarketData[], currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.rsiPeriod + 5) {
      return signals;
    }

    try {
      const rsiValues = this.calculateRSI(marketData);
      
      if (rsiValues.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentRSI = rsiValues[rsiValues.length - 1]!;
      const prevRSI = rsiValues[rsiValues.length - 2]!;

      // Oversold to normal (potential buy)
      if (prevRSI <= this.oversoldLevel && currentRSI > this.oversoldLevel) {
        const strength = this.calculateRSIStrength(currentRSI, 'BUY');
        const confidence = this.calculateRSIConfidence(rsiValues, currentData, 'BUY');
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.BUY,
          strength,
          confidence,
          currentData.close,
          `RSI oversold recovery: RSI moved from ${prevRSI.toFixed(2)} to ${currentRSI.toFixed(2)}, crossing above oversold level of ${this.oversoldLevel}`,
          {
            rsi: currentRSI,
            prevRSI,
            level: 'oversold_recovery',
            threshold: this.oversoldLevel
          }
        ));
      }

      // Overbought to normal (potential sell)
      if (prevRSI >= this.overboughtLevel && currentRSI < this.overboughtLevel) {
        const strength = this.calculateRSIStrength(currentRSI, 'SELL');
        const confidence = this.calculateRSIConfidence(rsiValues, currentData, 'SELL');
        
        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.SELL,
          strength,
          confidence,
          currentData.close,
          `RSI overbought decline: RSI moved from ${prevRSI.toFixed(2)} to ${currentRSI.toFixed(2)}, crossing below overbought level of ${this.overboughtLevel}`,
          {
            rsi: currentRSI,
            prevRSI,
            level: 'overbought_decline',
            threshold: this.overboughtLevel
          }
        ));
      }

      // TODO: Add divergence detection
      // TODO: Add RSI failure swings

    } catch (error) {
      console.error(`Error in RSI analysis:`, error);
    }

    return signals;
  }

  /**
   * Calculate RSI values
   * 
   * TODO: Add different RSI calculation methods (Cutler's RSI, etc.)
   */
  private calculateRSI(data: MarketData[]): number[] {
    const rsi: number[] = [];
    
    if (data.length < this.rsiPeriod + 1) return rsi;
    
    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i]!.close - data[i - 1]!.close);
    }
    
    // Calculate RSI
    for (let i = this.rsiPeriod - 1; i < changes.length; i++) {
      let avgGain = 0;
      let avgLoss = 0;
      
      // Calculate average gains and losses
      for (let j = i - this.rsiPeriod + 1; j <= i; j++) {
        const change = changes[j]!;
        if (change > 0) {
          avgGain += change;
        } else {
          avgLoss += Math.abs(change);
        }
      }
      
      avgGain /= this.rsiPeriod;
      avgLoss /= this.rsiPeriod;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }
    
    return rsi;
  }

  /**
   * Calculate RSI signal strength
   */
  private calculateRSIStrength(rsi: number, direction: 'BUY' | 'SELL'): SignalStrength {
    if (direction === 'BUY') {
      if (rsi < 20) return SignalStrength.VERY_STRONG;
      if (rsi < 25) return SignalStrength.STRONG;
      if (rsi < 30) return SignalStrength.MODERATE;
      if (rsi < 35) return SignalStrength.WEAK;
      return SignalStrength.VERY_WEAK;
    } else {
      if (rsi > 80) return SignalStrength.VERY_STRONG;
      if (rsi > 75) return SignalStrength.STRONG;
      if (rsi > 70) return SignalStrength.MODERATE;
      if (rsi > 65) return SignalStrength.WEAK;
      return SignalStrength.VERY_WEAK;
    }
  }

  /**
   * Calculate RSI confidence
   */
  private calculateRSIConfidence(rsiValues: number[], currentData: MarketData, direction: 'BUY' | 'SELL'): number {
    let confidence = 50;
    
    const currentRSI = rsiValues[rsiValues.length - 1]!;
    
    // Add RSI level confidence
    if (direction === 'BUY') {
      confidence += Math.max(0, (35 - currentRSI) * 1.5);
    } else {
      confidence += Math.max(0, (currentRSI - 65) * 1.5);
    }
    
    // Add momentum consideration
    if (rsiValues.length >= 3) {
      const rsiMomentum = Math.abs(currentRSI - rsiValues[rsiValues.length - 3]!);
      confidence += Math.min(15, rsiMomentum * 0.5);
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.oversoldLevel >= this.overboughtLevel) {
      console.error(`${this.name}: Oversold level must be less than overbought level`);
      return false;
    }
    
    if (this.oversoldLevel < 0 || this.overboughtLevel > 100) {
      console.error(`${this.name}: RSI levels must be between 0 and 100`);
      return false;
    }
    
    return true;
  }
}

// TODO: Add more momentum strategies:
// - Stochastic Oscillator Strategy
// - Williams %R Strategy  
// - Rate of Change (ROC) Strategy
// - Commodity Channel Index (CCI) Strategy
// - Average Directional Index (ADX) Strategy
// - Parabolic SAR Strategy