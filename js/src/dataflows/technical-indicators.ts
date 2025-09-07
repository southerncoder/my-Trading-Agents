import { TradingAgentsConfig } from '@/types/config';
import yahooFinance from 'yahoo-finance2';

/**
 * Technical Indicators API with comprehensive analysis capabilities
 * Enhanced with caching, multi-timeframe support, and advanced indicators
 * 
 * TODO: Core Technical Analysis Enhancement Needed:
 * ================================================
 * 
 * 1. REAL MARKET DATA INTEGRATION:
 *    - Integrate with Yahoo Finance API for live price data
 *    - Add Alpha Vantage technical indicators API
 *    - Add TradingView charting library integration
 *    - Add multiple data provider failover system
 *    - Implement real-time streaming data processing
 * 
 * 2. ADVANCED INDICATOR LIBRARY:
 *    - Add Volume Profile and Market Profile indicators
 *    - Add Elliott Wave pattern recognition
 *    - Add Harmonic pattern detection (Gartley, Butterfly, etc.)
 *    - Add custom indicator plugin system
 *    - Add machine learning enhanced indicators
 * 
 * 3. MULTI-ASSET SUPPORT:
 *    - Add crypto-specific indicators (funding rates, fear/greed index)
 *    - Add forex-specific indicators (carry trade metrics, central bank data)
 *    - Add options-specific indicators (Greeks, volatility surface)
 *    - Add commodity-specific indicators (contango/backwardation)
 * 
 * 4. REAL-TIME PROCESSING:
 *    - Add WebSocket connections for live indicator updates
 *    - Implement streaming technical analysis alerts
 *    - Add real-time signal generation and notifications
 *    - Add live charting with indicator overlays
 * 
 * 5. PERFORMANCE OPTIMIZATION:
 *    - Add parallel indicator calculation for multiple timeframes
 *    - Implement incremental indicator updates (not full recalculation)
 *    - Add GPU acceleration for complex calculations
 *    - Add distributed computing for large-scale analysis
 * 
 * 6. SMART ALERT SYSTEM:
 *    - Add customizable technical alert rules
 *    - Implement signal confirmation across multiple indicators
 *    - Add webhook and email notification system
 *    - Add mobile push notifications for critical signals
 */

/**
 * Price data point for technical analysis
 */
interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Technical Indicators API for stock analysis
 * 
 * Enhanced implementation with caching, multi-timeframe support, and advanced analytics
 */
export class TechnicalIndicatorsAPI {
  private config: TradingAgentsConfig;
  private indicatorCache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.indicatorCache = new Map();
  }

  /**
   * Clear expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.indicatorCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.indicatorCache.delete(key);
      }
    }
  }

  /**
   * Get cached data or fetch new data
   */
  private getCachedData(key: string): any | null {
    this.cleanCache();
    const entry = this.indicatorCache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    return null;
  }

  /**
   * Cache data with TTL
   */
  private setCachedData(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.indicatorCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Fetch real market data from Yahoo Finance with caching and retry logic
   */
  private async fetchRealMarketData(symbol: string, currDate: string, lookBackDays: number, interval: string = '1d'): Promise<PriceData[]> {
    const cacheKey = `${symbol}-${currDate}-${lookBackDays}-${interval}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const endDate = new Date(currDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - lookBackDays);

      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: interval as '1d' | '1wk' | '1mo',
      };

      const result = await yahooFinance.historical(symbol, queryOptions);

      const mappedResult = result.map(item => ({
        date: item.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        open: item.open || 0,
        high: item.high || 0,
        low: item.low || 0,
        close: item.close || 0,
        volume: item.volume || 0
      })).filter(item => item.date && !isNaN(item.close)); // Filter out invalid data points

      // Cache the result
      this.setCachedData(cacheKey, mappedResult);
      
      return mappedResult as PriceData[];
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * TODO: Implement proper market data fetching integration
   * 
   * This method should:
   * - Integrate with real market data providers (Yahoo Finance, Alpha Vantage, IEX Cloud)
   * - Handle multiple data sources with fallback priority
   * - Implement proper error handling for network failures
   * - Add data validation and cleansing
   * - Support historical data backfill
   * - Add caching for expensive API calls
   * - Implement rate limiting compliance
   * - Add sector-specific volatility patterns
   * - Add correlation with market indices
   * - Add realistic volume patterns
   * - Add gap and trend simulation
   * - Add earnings/news event simulation
   */
  private async fetchHistoricalData(symbol: string, currDate: string, lookBackDays: number): Promise<PriceData[]> {
    // TODO: Replace with actual market data provider integration
    throw new Error(`Historical data fetching not implemented for ${symbol}. Need to integrate with market data providers.`);
  }

  /**
   * Get technical indicators report with multi-timeframe analysis
   */
  async getIndicatorsReport(symbol: string, currDate: string, lookBackDays: number, online: boolean = true, timeframes: string[] = ['1d']): Promise<string> {
    let fullReport = `## Technical Indicators Report for ${symbol}\n\n`;
    
    for (const timeframe of timeframes) {
      const adjustedLookback = this.adjustLookbackForTimeframe(lookBackDays, timeframe);
      
      // TODO: Integrate with real market data providers
      // Currently falling back to Yahoo Finance API if available
      const priceData = online 
        ? await this.fetchRealMarketData(symbol, currDate, adjustedLookback, timeframe)
        : await this.fetchHistoricalData(symbol, currDate, adjustedLookback);
      
      if (priceData.length === 0) {
        fullReport += `### ${timeframe.toUpperCase()} Timeframe: No data available\n\n`;
        continue;
      }

      fullReport += `### ${timeframe.toUpperCase()} Timeframe Analysis\n`;
      fullReport += `Data points: ${priceData.length} periods\n`;
      fullReport += `Data source: ${online ? 'Yahoo Finance API' : 'TODO: Historical data provider needed'}\n\n`;

      const indicators = [
        'close_50_sma',
        'close_200_sma', 
        'close_10_ema',
        'macd',
        'rsi',
        'boll',
        'atr',
        'ichimoku',
        'stochastic_rsi',
        'fibonacci'
      ];

      for (const indicator of indicators) {
        const indicatorData = await this.getIndicator(symbol, indicator, currDate, adjustedLookback, priceData);
        fullReport += indicatorData + '\n\n';
      }

      // Add confluence analysis for this timeframe
      fullReport += this.getConfluenceAnalysis(priceData) + '\n\n';
    }

    return fullReport;
  }

  /**
   * Adjust lookback period based on timeframe
   */
  private adjustLookbackForTimeframe(lookBackDays: number, timeframe: string): number {
    switch (timeframe) {
      case '1h': return lookBackDays * 24; // Hours
      case '4h': return lookBackDays * 6;  // 4-hour periods
      case '1d': return lookBackDays;      // Days
      case '1wk': return Math.ceil(lookBackDays / 7); // Weeks
      case '1mo': return Math.ceil(lookBackDays / 30); // Months
      default: return lookBackDays;
    }
  }

  /**
   * Get a specific technical indicator using real price data
   * 
   * TODO: Add parallel calculation for multiple indicators
   * TODO: Add indicator correlation analysis
   * TODO: Add machine learning-based indicator optimization
   * TODO: Add real-time streaming indicator updates
   * TODO: Add indicator confluence scoring
   */
  private async getIndicator(symbol: string, indicator: string, currDate: string, lookBackDays: number, priceData: PriceData[]): Promise<string> {
    const descriptions = {
      'close_50_sma': '50 SMA: A medium-term trend indicator. Usage: Identify trend direction and serve as dynamic support/resistance. Tips: It lags price; combine with faster indicators for timely signals.',
      'close_200_sma': '200 SMA: A long-term trend benchmark. Usage: Confirm overall market trend and identify golden/death cross setups. Tips: It reacts slowly; best for strategic trend confirmation rather than frequent trading entries.',
      'close_10_ema': '10 EMA: A responsive short-term average. Usage: Capture quick shifts in momentum and potential entry points. Tips: Prone to noise in choppy markets; use alongside longer averages for filtering false signals.',
      'macd': 'MACD: Computes momentum via differences of EMAs. Usage: Look for crossovers and divergence as signals of trend changes. Tips: Confirm with other indicators in low-volatility or sideways markets.',
      'rsi': 'RSI: Measures momentum to flag overbought/oversold conditions. Usage: Apply 70/30 thresholds and watch for divergence to signal reversals. Tips: In strong trends, RSI may remain extreme; always cross-check with trend analysis.',
      'boll': 'Bollinger Middle: A 20 SMA serving as the basis for Bollinger Bands. Usage: Acts as a dynamic benchmark for price movement. Tips: Combine with the upper and lower bands to effectively spot breakouts or reversals.',
      'atr': 'ATR: Averages true range to measure volatility. Usage: Set stop-loss levels and adjust position sizes based on current market volatility. Tips: It\'s a reactive measure, so use it as part of a broader risk management strategy.',
      'ichimoku': 'Ichimoku Cloud: Comprehensive trend and momentum indicator. Usage: Analyze cloud thickness, price position relative to cloud, and line crossovers for trend confirmation. Tips: Most effective in trending markets; signals are stronger when multiple components align.',
      'stochastic_rsi': 'Stochastic RSI: Combines RSI with Stochastic oscillator for enhanced sensitivity. Usage: Identify overbought/oversold conditions with faster signals than standard RSI. Tips: More sensitive to short-term moves; filter signals with trend analysis.',
      'fibonacci': 'Fibonacci Retracements: Key support/resistance levels based on Fibonacci ratios. Usage: Identify potential reversal levels during retracements. Tips: Most effective in trending markets; combine with other technical analysis for confirmation.'
    };

    let indicatorValues = '';
    const closePrices = priceData.map(d => d.close);

    switch (indicator) {
      case 'close_50_sma':
        indicatorValues = this.calculateSMA(priceData, 50);
        break;
      case 'close_200_sma':
        indicatorValues = this.calculateSMA(priceData, 200);
        break;
      case 'close_10_ema':
        indicatorValues = this.calculateEMA(priceData, 10);
        break;
      case 'macd':
        indicatorValues = this.calculateMACD(priceData);
        break;
      case 'rsi':
        indicatorValues = this.calculateRSI(priceData, 14);
        break;
      case 'boll':
        indicatorValues = this.calculateBollingerBands(priceData, 20);
        break;
      case 'atr':
        indicatorValues = this.calculateATR(priceData, 14);
        break;
      case 'ichimoku':
        indicatorValues = this.calculateIchimoku(priceData);
        break;
      case 'stochastic_rsi':
        indicatorValues = this.calculateStochasticRSI(priceData, 14, 14, 3, 3);
        break;
      case 'fibonacci':
        indicatorValues = this.calculateFibonacci(priceData);
        break;
      default:
        indicatorValues = 'Indicator not implemented';
    }

    const description = descriptions[indicator as keyof typeof descriptions] || 'No description available.';
    return `### ${indicator.toUpperCase()} Analysis:\n\n${indicatorValues}\n\n${description}`;
  }

  /**
   * Calculate Simple Moving Average
   * TODO: Add support for different price types (open, high, low, close)
   * TODO: Add weighted moving averages
   * TODO: Add exponential smoothing options
   */
  private calculateSMA(priceData: PriceData[], period: number): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for SMA calculation`;
    }
    
    if (priceData.length < period) {
      return `Insufficient data for ${period}-period SMA (need ${period} points, have ${priceData.length})`;
    }

    const smaValues: string[] = [];
    for (let i = period - 1; i < priceData.length; i++) {
      const slice = priceData.slice(i - period + 1, i + 1);
      
      // Validate slice data
      const validData = slice.filter(item => item && typeof item.close === 'number' && !isNaN(item.close));
      if (validData.length !== period) {
        continue; // Skip invalid data points
      }
      
      const sum = validData.reduce((acc, item) => acc + item.close, 0);
      const sma = sum / period;
      const currentItem = priceData[i];
      
      if (currentItem?.date) {
        smaValues.push(`${currentItem.date}: ${sma.toFixed(2)}`);
      }
    }

    if (smaValues.length === 0) {
      return `No valid SMA values could be calculated for ${period}-period`;
    }

    const latest = smaValues[smaValues.length - 1];
    const previous = smaValues.length > 1 ? smaValues[smaValues.length - 2] : null;
    return `${period}-period SMA:\nLatest: ${latest}\nPrevious: ${previous || 'N/A'}\n\nRecent values:\n${smaValues.slice(-5).join('\n')}`;
  }

  /**
   * Calculate Exponential Moving Average
   * TODO: Add support for different smoothing factors
   * TODO: Add adaptive EMA based on volatility
   * TODO: Add Hull Moving Average variant
   */
  private calculateEMA(priceData: PriceData[], period: number): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for EMA calculation`;
    }
    
    if (priceData.length < period) {
      return `Insufficient data for ${period}-period EMA (need ${period} points, have ${priceData.length})`;
    }

    const multiplier = 2 / (period + 1);
    const emaValues: string[] = [];
    
    // Start with SMA for first value - validate initial data
    const initialSlice = priceData.slice(0, period);
    const validInitialData = initialSlice.filter(item => item && typeof item.close === 'number' && !isNaN(item.close));
    
    if (validInitialData.length < period) {
      return `Insufficient valid data for ${period}-period EMA initialization`;
    }
    
    const initialSum = validInitialData.reduce((acc, item) => acc + item.close, 0);
    let ema = initialSum / period;
    
    const startItem = priceData[period - 1];
    if (startItem?.date) {
      emaValues.push(`${startItem.date}: ${ema.toFixed(2)}`);
    }

    // Calculate EMA for remaining values
    for (let i = period; i < priceData.length; i++) {
      const currentItem = priceData[i];
      if (!currentItem || typeof currentItem.close !== 'number' || isNaN(currentItem.close)) {
        continue; // Skip invalid data points
      }
      
      ema = (currentItem.close * multiplier) + (ema * (1 - multiplier));
      
      if (currentItem.date) {
        emaValues.push(`${currentItem.date}: ${ema.toFixed(2)}`);
      }
    }

    if (emaValues.length === 0) {
      return `No valid EMA values could be calculated for ${period}-period`;
    }

    const latest = emaValues[emaValues.length - 1];
    const previous = emaValues.length > 1 ? emaValues[emaValues.length - 2] : null;
    return `${period}-period EMA:\nLatest: ${latest}\nPrevious: ${previous || 'N/A'}\n\nRecent values:\n${emaValues.slice(-5).join('\n')}`;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * TODO: Add configurable fast/slow/signal periods
   * TODO: Add MACD percentage price oscillator variant
   * TODO: Add zero-lag MACD implementation
   * TODO: Add divergence detection algorithms
   */
  private calculateMACD(priceData: PriceData[]): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for MACD calculation`;
    }
    
    if (priceData.length < 26) {
      return `Insufficient data for MACD calculation (need 26 points, have ${priceData.length})`;
    }

    try {
      // Calculate 12-period EMA
      const ema12 = this.calculateEMAValues(priceData, 12);
      // Calculate 26-period EMA  
      const ema26 = this.calculateEMAValues(priceData, 26);
      
      if (!ema12 || !ema26 || ema12.length === 0 || ema26.length === 0) {
        return `Failed to calculate EMA values for MACD`;
      }
      
      // Calculate MACD line (12 EMA - 26 EMA)
      const macdLine: number[] = [];
      for (let i = 25; i < priceData.length; i++) {
        const ema12Value = ema12[i];
        const ema26Value = ema26[i];
        
        if (typeof ema12Value === 'number' && typeof ema26Value === 'number' && 
            !isNaN(ema12Value) && !isNaN(ema26Value)) {
          macdLine.push(ema12Value - ema26Value);
        }
      }

      if (macdLine.length === 0) {
        return `No valid MACD values could be calculated`;
      }

      // Calculate Signal line (9-period EMA of MACD)
      const signalLine = this.calculateEMAFromValues(macdLine, 9);

      if (!signalLine || signalLine.length === 0) {
        return `Failed to calculate MACD signal line`;
      }

      const latest = macdLine[macdLine.length - 1];
      const latestSignal = signalLine[signalLine.length - 1];
      
      if (typeof latest !== 'number' || typeof latestSignal !== 'number' || 
          isNaN(latest) || isNaN(latestSignal)) {
        return `Invalid MACD calculation results`;
      }
      
      const histogram = latest - latestSignal;

      return `MACD Analysis:\nMACD Line: ${latest.toFixed(4)}\nSignal Line: ${latestSignal.toFixed(4)}\nHistogram: ${histogram.toFixed(4)}\nTrend: ${histogram > 0 ? 'Bullish' : 'Bearish'}`;
    } catch (error) {
      return `Error calculating MACD: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * TODO: Add Stochastic RSI implementation
   * TODO: Add RSI divergence detection
   * TODO: Add configurable overbought/oversold levels
   * TODO: Add RSI smoothing options (Wilder's smoothing vs EMA)
   */
  private calculateRSI(priceData: PriceData[], period: number = 14): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for RSI calculation`;
    }
    
    if (priceData.length < period + 1) {
      return `Insufficient data for RSI calculation (need ${period + 1} points, have ${priceData.length})`;
    }

    try {
      const gains: number[] = [];
      const losses: number[] = [];

      // Calculate price changes with null checks
      for (let i = 1; i < priceData.length; i++) {
        const current = priceData[i];
        const previous = priceData[i - 1];
        
        if (!current || !previous || 
            typeof current.close !== 'number' || typeof previous.close !== 'number' ||
            isNaN(current.close) || isNaN(previous.close)) {
          gains.push(0);
          losses.push(0);
          continue;
        }
        
        const change = current.close - previous.close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
      }

      if (gains.length < period) {
        return `Insufficient valid price changes for RSI calculation`;
      }

      // Calculate average gains and losses
      let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

      const rsiValues: number[] = [];

      // Calculate RSI for remaining periods
      for (let i = period; i < gains.length; i++) {
        const currentGain = gains[i];
        const currentLoss = losses[i];
        
        if (typeof currentGain !== 'number' || typeof currentLoss !== 'number' ||
            isNaN(currentGain) || isNaN(currentLoss)) {
          continue;
        }
        
        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
        
        if (avgLoss === 0) {
          rsiValues.push(100); // RSI = 100 when no losses
        } else {
          const rs = avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));
          rsiValues.push(rsi);
        }
      }

      if (rsiValues.length === 0) {
        return `No valid RSI values could be calculated`;
      }

      const latestRSI = rsiValues[rsiValues.length - 1];
      
      if (typeof latestRSI !== 'number' || isNaN(latestRSI)) {
        return `Invalid RSI calculation result`;
      }
      
      let condition = 'Neutral';
      if (latestRSI > 70) condition = 'Overbought';
      else if (latestRSI < 30) condition = 'Oversold';

      return `RSI (${period}-period):\nCurrent: ${latestRSI.toFixed(2)}\nCondition: ${condition}\nSignal: ${latestRSI > 70 ? 'Consider selling' : latestRSI < 30 ? 'Consider buying' : 'Hold/Monitor'}`;
    } catch (error) {
      return `Error calculating RSI: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Calculate Bollinger Bands
   * TODO: Add percentage bandwidth indicator
   * TODO: Add bollinger band squeeze detection
   * TODO: Add configurable standard deviation multiplier
   * TODO: Add Keltner Channel comparison
   */
  private calculateBollingerBands(priceData: PriceData[], period: number = 20): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for Bollinger Bands calculation`;
    }
    
    if (priceData.length < period) {
      return `Insufficient data for Bollinger Bands (need ${period} points, have ${priceData.length})`;
    }

    try {
      const smaValues = [];
      const upperBands = [];
      const lowerBands = [];

      for (let i = period - 1; i < priceData.length; i++) {
        const slice = priceData.slice(i - period + 1, i + 1);
        
        // Validate slice data
        const validData = slice.filter(item => item && typeof item.close === 'number' && !isNaN(item.close));
        if (validData.length !== period) {
          continue; // Skip periods with invalid data
        }
        
        const sma = validData.reduce((sum, item) => sum + item.close, 0) / period;
        
        // Calculate standard deviation
        const variance = validData.reduce((sum, item) => sum + Math.pow(item.close - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        smaValues.push(sma);
        upperBands.push(sma + (stdDev * 2));
        lowerBands.push(sma - (stdDev * 2));
      }

      if (smaValues.length === 0 || upperBands.length === 0 || lowerBands.length === 0) {
        return `No valid Bollinger Bands values could be calculated`;
      }

      const lastPriceItem = priceData[priceData.length - 1];
      if (!lastPriceItem || typeof lastPriceItem.close !== 'number' || isNaN(lastPriceItem.close)) {
        return `Invalid current price data for Bollinger Bands analysis`;
      }
      
      const latestClose = lastPriceItem.close;
      const latestUpper = upperBands[upperBands.length - 1];
      const latestMiddle = smaValues[smaValues.length - 1];
      const latestLower = lowerBands[lowerBands.length - 1];

      if (typeof latestUpper !== 'number' || typeof latestMiddle !== 'number' || 
          typeof latestLower !== 'number' || isNaN(latestUpper) || 
          isNaN(latestMiddle) || isNaN(latestLower)) {
        return `Invalid Bollinger Bands calculation results`;
      }

      let position = 'Middle';
      if (latestClose > latestUpper) position = 'Above Upper Band';
      else if (latestClose < latestLower) position = 'Below Lower Band';
      else if (latestClose > latestMiddle) position = 'Upper Half';
      else position = 'Lower Half';

      return `Bollinger Bands (${period}-period):\nUpper: ${latestUpper.toFixed(2)}\nMiddle: ${latestMiddle.toFixed(2)}\nLower: ${latestLower.toFixed(2)}\nCurrent Price: ${latestClose.toFixed(2)}\nPosition: ${position}`;
    } catch (error) {
      return `Error calculating Bollinger Bands: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Calculate ATR (Average True Range)
   * TODO: Add Wilder's smoothing method vs SMA
   * TODO: Add percentage ATR calculation
   * TODO: Add ATR bands/channels
   * TODO: Add dynamic position sizing based on ATR
   */
  private calculateATR(priceData: PriceData[], period: number = 14): string {
    if (!priceData || priceData.length === 0) {
      return `No price data available for ATR calculation`;
    }
    
    if (priceData.length < period + 1) {
      return `Insufficient data for ATR calculation (need ${period + 1} points, have ${priceData.length})`;
    }

    try {
      const trueRanges: number[] = [];

      for (let i = 1; i < priceData.length; i++) {
        const current = priceData[i];
        const previous = priceData[i - 1];
        
        if (!current || !previous || 
            typeof current.high !== 'number' || typeof current.low !== 'number' ||
            typeof previous.close !== 'number' || isNaN(current.high) || 
            isNaN(current.low) || isNaN(previous.close)) {
          continue; // Skip invalid data points
        }
        
        const high = current.high;
        const low = current.low;
        const prevClose = previous.close;

        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);
        
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }

      if (trueRanges.length < period) {
        return `Insufficient valid data for ATR calculation`;
      }

      // Calculate ATR as simple moving average of true ranges
      const atrValues: number[] = [];
      for (let i = period - 1; i < trueRanges.length; i++) {
        const atr = trueRanges.slice(i - period + 1, i + 1).reduce((sum, tr) => sum + tr, 0) / period;
        atrValues.push(atr);
      }

      if (atrValues.length === 0) {
        return `No valid ATR values could be calculated`;
      }

      const latestATR = atrValues[atrValues.length - 1];
      
      if (typeof latestATR !== 'number' || isNaN(latestATR)) {
        return `Invalid ATR calculation result`;
      }
      
      const lastPriceItem = priceData[priceData.length - 1];
      if (!lastPriceItem || typeof lastPriceItem.close !== 'number' || isNaN(lastPriceItem.close)) {
        return `Invalid current price data for ATR analysis`;
      }
      
      const latestClose = lastPriceItem.close;
      const volatilityPercent = (latestATR / latestClose) * 100;

      return `ATR (${period}-period):\nCurrent ATR: ${latestATR.toFixed(2)}\nAs % of price: ${volatilityPercent.toFixed(2)}%\nVolatility: ${volatilityPercent > 3 ? 'High' : volatilityPercent > 1.5 ? 'Medium' : 'Low'}`;
    } catch (error) {
      return `Error calculating ATR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Helper method to calculate EMA values for MACD
   * TODO: Add error handling for edge cases
   * TODO: Add different EMA initialization methods
   */
  private calculateEMAValues(priceData: PriceData[], period: number): number[] {
    if (!priceData || priceData.length < period) {
      return [];
    }

    try {
      const multiplier = 2 / (period + 1);
      const emaValues: number[] = [];
      
      // Start with SMA for first value - validate initial data
      const initialSlice = priceData.slice(0, period);
      const validInitialData = initialSlice.filter(item => item && typeof item.close === 'number' && !isNaN(item.close));
      
      if (validInitialData.length < period) {
        return [];
      }
      
      const initialSum = validInitialData.reduce((acc, item) => acc + item.close, 0);
      let ema = initialSum / period;
      
      // Fill initial values with the first EMA value
      for (let i = 0; i < period - 1; i++) {
        emaValues.push(ema);
      }
      emaValues.push(ema);

      // Calculate EMA for remaining values
      for (let i = period; i < priceData.length; i++) {
        const currentItem = priceData[i];
        if (!currentItem || typeof currentItem.close !== 'number' || isNaN(currentItem.close)) {
          emaValues.push(ema); // Use previous EMA value for invalid data
          continue;
        }
        
        ema = (currentItem.close * multiplier) + (ema * (1 - multiplier));
        emaValues.push(ema);
      }

      return emaValues;
    } catch (error) {
      console.error('Error in calculateEMAValues:', error);
      return [];
    }
  }

  /**
   * Helper method to calculate EMA from array of values
   * TODO: Add validation for input array
   * TODO: Add support for different initialization methods
   */
  private calculateEMAFromValues(values: number[], period: number): number[] {
    if (!values || values.length < period) {
      return [];
    }

    try {
      const multiplier = 2 / (period + 1);
      const emaValues: number[] = [];
      
      // Start with SMA for first value
      const validInitialValues = values.slice(0, period).filter(val => typeof val === 'number' && !isNaN(val));
      
      if (validInitialValues.length < period) {
        return [];
      }
      
      const initialSum = validInitialValues.reduce((acc, val) => acc + val, 0);
      let ema = initialSum / period;
      
      // Fill initial values
      for (let i = 0; i < period - 1; i++) {
        emaValues.push(ema);
      }
      emaValues.push(ema);

      // Calculate EMA for remaining values
      for (let i = period; i < values.length; i++) {
        const currentValue = values[i];
        if (typeof currentValue !== 'number' || isNaN(currentValue)) {
          emaValues.push(ema); // Use previous EMA value for invalid data
          continue;
        }
        
        ema = (currentValue * multiplier) + (ema * (1 - multiplier));
        emaValues.push(ema);
      }

      return emaValues;
    } catch (error) {
      console.error('Error in calculateEMAFromValues:', error);
      return [];
    }
  }

  /**
   * Calculate Ichimoku Cloud indicator
   * Components: Tenkan-sen, Kijun-sen, Senkou Span A & B, Chikou Span
   */
  private calculateIchimoku(priceData: PriceData[]): string {
    if (!priceData || priceData.length < 52) {
      return `Insufficient data for Ichimoku calculation (need 52 points, have ${priceData.length})`;
    }

    try {
      const currentIndex = priceData.length - 1;
      const currentPrice = priceData[currentIndex]?.close;
      
      if (!currentPrice || isNaN(currentPrice)) {
        return `Invalid current price data for Ichimoku analysis`;
      }

      // Tenkan-sen (Conversion Line): 9-period high-low average
      const tenkanPeriod = 9;
      const tenkanHighs = priceData.slice(-tenkanPeriod).map(d => d.high).filter(h => !isNaN(h));
      const tenkanLows = priceData.slice(-tenkanPeriod).map(d => d.low).filter(l => !isNaN(l));
      const tenkanSen = tenkanHighs.length > 0 && tenkanLows.length > 0 ? 
        (Math.max(...tenkanHighs) + Math.min(...tenkanLows)) / 2 : 0;

      // Kijun-sen (Base Line): 26-period high-low average
      const kijunPeriod = 26;
      const kijunHighs = priceData.slice(-kijunPeriod).map(d => d.high).filter(h => !isNaN(h));
      const kijunLows = priceData.slice(-kijunPeriod).map(d => d.low).filter(l => !isNaN(l));
      const kijunSen = kijunHighs.length > 0 && kijunLows.length > 0 ? 
        (Math.max(...kijunHighs) + Math.min(...kijunLows)) / 2 : 0;

      // Senkou Span A (Leading Span A): (Tenkan + Kijun) / 2, plotted 26 periods ahead
      const senkouSpanA = (tenkanSen + kijunSen) / 2;

      // Senkou Span B (Leading Span B): 52-period high-low average, plotted 26 periods ahead
      const senkouPeriod = 52;
      const senkouHighs = priceData.slice(-senkouPeriod).map(d => d.high).filter(h => !isNaN(h));
      const senkouLows = priceData.slice(-senkouPeriod).map(d => d.low).filter(l => !isNaN(l));
      const senkouSpanB = senkouHighs.length > 0 && senkouLows.length > 0 ? 
        (Math.max(...senkouHighs) + Math.min(...senkouLows)) / 2 : 0;

      // Chikou Span: Current close plotted 26 periods back
      const chikouSpan = currentPrice;

      // Cloud analysis
      const cloudTop = Math.max(senkouSpanA, senkouSpanB);
      const cloudBottom = Math.min(senkouSpanA, senkouSpanB);
      const cloudThickness = cloudTop - cloudBottom;
      
      let pricePosition = '';
      let trend = '';
      if (currentPrice > cloudTop) {
        pricePosition = 'Above Cloud (Bullish)';
        trend = 'Uptrend';
      } else if (currentPrice < cloudBottom) {
        pricePosition = 'Below Cloud (Bearish)';
        trend = 'Downtrend';
      } else {
        pricePosition = 'Inside Cloud (Neutral)';
        trend = 'Sideways/Uncertain';
      }

      const tkCross = tenkanSen > kijunSen ? 'Bullish (TK Cross)' : 'Bearish (TK Cross)';

      return `Ichimoku Cloud Analysis:
Tenkan-sen (9): ${tenkanSen.toFixed(2)}
Kijun-sen (26): ${kijunSen.toFixed(2)}
Senkou Span A: ${senkouSpanA.toFixed(2)}
Senkou Span B: ${senkouSpanB.toFixed(2)}
Chikou Span: ${chikouSpan.toFixed(2)}

Cloud Analysis:
Price Position: ${pricePosition}
Cloud Thickness: ${cloudThickness.toFixed(2)}
TK Cross Signal: ${tkCross}
Overall Trend: ${trend}`;

    } catch (error) {
      return `Error calculating Ichimoku: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Calculate Stochastic RSI
   * Combines RSI with Stochastic oscillator for enhanced sensitivity
   */
  private calculateStochasticRSI(priceData: PriceData[], rsiPeriod: number = 14, stochPeriod: number = 14, kPeriod: number = 3, dPeriod: number = 3): string {
    if (!priceData || priceData.length < rsiPeriod + stochPeriod) {
      return `Insufficient data for Stochastic RSI (need ${rsiPeriod + stochPeriod} points, have ${priceData.length})`;
    }

    try {
      // First calculate RSI values
      const rsiValues = this.getRSIValues(priceData, rsiPeriod);
      
      if (rsiValues.length < stochPeriod) {
        return `Insufficient RSI values for Stochastic RSI calculation`;
      }

      // Calculate Stochastic of RSI
      const stochRSIValues: number[] = [];
      
      for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
        const rsiSlice = rsiValues.slice(i - stochPeriod + 1, i + 1);
        const rsiMax = Math.max(...rsiSlice);
        const rsiMin = Math.min(...rsiSlice);
        const currentRSI = rsiValues[i];
        
        if (typeof currentRSI !== 'number' || isNaN(currentRSI)) {
          continue; // Skip invalid RSI values
        }
        
        if (rsiMax === rsiMin) {
          stochRSIValues.push(0); // Avoid division by zero
        } else {
          const stochRSI = (currentRSI - rsiMin) / (rsiMax - rsiMin) * 100;
          stochRSIValues.push(stochRSI);
        }
      }

      if (stochRSIValues.length === 0) {
        return `No valid Stochastic RSI values calculated`;
      }

      // Calculate %K (SMA of Stochastic RSI)
      const kValues: number[] = [];
      for (let i = kPeriod - 1; i < stochRSIValues.length; i++) {
        const kSlice = stochRSIValues.slice(i - kPeriod + 1, i + 1);
        const kValue = kSlice.reduce((sum, val) => sum + val, 0) / kPeriod;
        kValues.push(kValue);
      }

      // Calculate %D (SMA of %K)
      const dValues: number[] = [];
      for (let i = dPeriod - 1; i < kValues.length; i++) {
        const dSlice = kValues.slice(i - dPeriod + 1, i + 1);
        const dValue = dSlice.reduce((sum, val) => sum + val, 0) / dPeriod;
        dValues.push(dValue);
      }

      const latestK = kValues[kValues.length - 1];
      const latestD = dValues[dValues.length - 1];
      
      if (typeof latestK !== 'number' || typeof latestD !== 'number' || isNaN(latestK) || isNaN(latestD)) {
        return `Invalid Stochastic RSI calculation results`;
      }

      let condition = 'Neutral';
      let signal = 'Hold';
      
      if (latestK > 80) {
        condition = 'Overbought';
        signal = 'Consider selling';
      } else if (latestK < 20) {
        condition = 'Oversold';
        signal = 'Consider buying';
      }

      const crossover = latestK > latestD ? 'Bullish (%K > %D)' : 'Bearish (%K < %D)';

      return `Stochastic RSI Analysis:
%K Line: ${latestK.toFixed(2)}
%D Line: ${latestD.toFixed(2)}
Condition: ${condition}
Crossover: ${crossover}
Signal: ${signal}`;

    } catch (error) {
      return `Error calculating Stochastic RSI: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Calculate Fibonacci Retracement levels
   */
  private calculateFibonacci(priceData: PriceData[]): string {
    if (!priceData || priceData.length < 20) {
      return `Insufficient data for Fibonacci analysis (need 20 points, have ${priceData.length})`;
    }

    try {
      // Find the swing high and swing low in the recent period
      const recentPeriod = Math.min(50, priceData.length); // Use last 50 periods or available data
      const recentData = priceData.slice(-recentPeriod);
      
      const highs = recentData.map(d => d.high).filter(h => !isNaN(h));
      const lows = recentData.map(d => d.low).filter(l => !isNaN(l));
      
      if (highs.length === 0 || lows.length === 0) {
        return `Invalid price data for Fibonacci analysis`;
      }

      const swingHigh = Math.max(...highs);
      const swingLow = Math.min(...lows);
      const range = swingHigh - swingLow;
      
      if (range <= 0) {
        return `Invalid price range for Fibonacci analysis`;
      }

      // Fibonacci ratios
      const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const currentPrice = priceData[priceData.length - 1]?.close;
      
      if (!currentPrice || isNaN(currentPrice)) {
        return `Invalid current price for Fibonacci analysis`;
      }

      // Calculate retracement levels (from high to low)
      const retracementLevels = fibRatios.map(ratio => ({
        ratio: ratio,
        level: swingHigh - (range * ratio),
        label: `${(ratio * 100).toFixed(1)}%`
      }));

      // Find nearest support and resistance levels
      let nearestSupport = null;
      let nearestResistance = null;
      
      for (const level of retracementLevels) {
        if (level.level < currentPrice && (nearestSupport === null || level.level > nearestSupport.level)) {
          nearestSupport = level;
        }
        if (level.level > currentPrice && (nearestResistance === null || level.level < nearestResistance.level)) {
          nearestResistance = level;
        }
      }

      const levelsText = retracementLevels
        .map(level => `${level.label}: ${level.level.toFixed(2)}`)
        .join('\n');

      const supportText = nearestSupport ? 
        `${nearestSupport.label} at ${nearestSupport.level.toFixed(2)}` : 
        'None identified';
      
      const resistanceText = nearestResistance ? 
        `${nearestResistance.label} at ${nearestResistance.level.toFixed(2)}` : 
        'None identified';

      return `Fibonacci Retracement Analysis:
Swing High: ${swingHigh.toFixed(2)}
Swing Low: ${swingLow.toFixed(2)}
Current Price: ${currentPrice.toFixed(2)}

Retracement Levels:
${levelsText}

Key Levels:
Nearest Support: ${supportText}
Nearest Resistance: ${resistanceText}`;

    } catch (error) {
      return `Error calculating Fibonacci: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Analyze indicator confluence to identify strong signals
   */
  private getConfluenceAnalysis(priceData: PriceData[]): string {
    if (!priceData || priceData.length < 50) {
      return "### Confluence Analysis\nInsufficient data for confluence analysis";
    }

    try {
      const currentPrice = priceData[priceData.length - 1]?.close;
      if (!currentPrice || isNaN(currentPrice)) {
        return "### Confluence Analysis\nInvalid current price data";
      }

      // Calculate key indicators for confluence
      const sma50Values = this.getSMAValues(priceData, 50);
      const sma200Values = this.getSMAValues(priceData, 200);
      const ema10Values = this.calculateEMAValues(priceData, 10);
      const rsiValues = this.getRSIValues(priceData, 14);
      
      const signals: string[] = [];
      let bullishCount = 0;
      let bearishCount = 0;

      // Trend analysis
      if (sma50Values.length > 0 && sma200Values.length > 0) {
        const sma50 = sma50Values[sma50Values.length - 1];
        const sma200 = sma200Values[sma200Values.length - 1];
        
        if (sma50 && sma200 && sma50 > sma200) {
          signals.push("✓ Golden Cross: 50 SMA > 200 SMA (Bullish trend)");
          bullishCount++;
        } else if (sma50 && sma200) {
          signals.push("✗ Death Cross: 50 SMA < 200 SMA (Bearish trend)");
          bearishCount++;
        }

        if (sma50 && currentPrice > sma50) {
          signals.push("✓ Price above 50 SMA (Short-term bullish)");
          bullishCount++;
        } else if (sma50) {
          signals.push("✗ Price below 50 SMA (Short-term bearish)");
          bearishCount++;
        }
      }

      // Momentum analysis
      if (ema10Values.length > 0) {
        const ema10 = ema10Values[ema10Values.length - 1];
        if (ema10 && currentPrice > ema10) {
          signals.push("✓ Price above 10 EMA (Immediate bullish momentum)");
          bullishCount++;
        } else if (ema10) {
          signals.push("✗ Price below 10 EMA (Immediate bearish momentum)");
          bearishCount++;
        }
      }

      // RSI analysis
      if (rsiValues.length > 0) {
        const rsi = rsiValues[rsiValues.length - 1];
        if (rsi && rsi > 70) {
          signals.push("⚠ RSI Overbought (>70) - Consider taking profits");
          bearishCount++;
        } else if (rsi && rsi < 30) {
          signals.push("⚠ RSI Oversold (<30) - Potential buying opportunity");
          bullishCount++;
        } else if (rsi && rsi > 50) {
          signals.push("✓ RSI bullish (>50)");
          bullishCount++;
        } else if (rsi) {
          signals.push("✗ RSI bearish (<50)");
          bearishCount++;
        }
      }

      // Overall confluence assessment
      const totalSignals = bullishCount + bearishCount;
      const bullishPercent = totalSignals > 0 ? (bullishCount / totalSignals) * 100 : 0;
      
      let confluenceLevel = "Neutral";
      let recommendation = "Hold";
      
      if (bullishPercent >= 75) {
        confluenceLevel = "Strong Bullish";
        recommendation = "Strong Buy";
      } else if (bullishPercent >= 60) {
        confluenceLevel = "Moderate Bullish";
        recommendation = "Buy";
      } else if (bullishPercent >= 40) {
        confluenceLevel = "Neutral";
        recommendation = "Hold";
      } else if (bullishPercent >= 25) {
        confluenceLevel = "Moderate Bearish";
        recommendation = "Sell";
      } else {
        confluenceLevel = "Strong Bearish";
        recommendation = "Strong Sell";
      }

      return `### Confluence Analysis
**Overall Assessment:** ${confluenceLevel} (${bullishCount}/${totalSignals} bullish signals)
**Recommendation:** ${recommendation}

**Signal Breakdown:**
${signals.join('\n')}

**Confluence Score:** ${bullishPercent.toFixed(1)}% bullish`;

    } catch (error) {
      return `### Confluence Analysis\nError in confluence analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Helper method to get SMA values
   */
  private getSMAValues(priceData: PriceData[], period: number): number[] {
    if (!priceData || priceData.length < period) {
      return [];
    }

    const smaValues: number[] = [];
    for (let i = period - 1; i < priceData.length; i++) {
      const slice = priceData.slice(i - period + 1, i + 1);
      const validData = slice.filter(item => item && typeof item.close === 'number' && !isNaN(item.close));
      
      if (validData.length === period) {
        const sma = validData.reduce((sum, item) => sum + item.close, 0) / period;
        smaValues.push(sma);
      }
    }
    return smaValues;
  }

  /**
   * Helper method to get RSI values
   */
  private getRSIValues(priceData: PriceData[], period: number = 14): number[] {
    if (!priceData || priceData.length < period + 1) {
      return [];
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < priceData.length; i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      if (current && previous && 
          typeof current.close === 'number' && typeof previous.close === 'number' &&
          !isNaN(current.close) && !isNaN(previous.close)) {
        const change = current.close - previous.close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
      }
    }

    if (gains.length < period) {
      return [];
    }

    // Calculate RSI
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const rsiValues: number[] = [];

    for (let i = period; i < gains.length; i++) {
      const currentGain = gains[i];
      const currentLoss = losses[i];
      
      if (typeof currentGain === 'number' && typeof currentLoss === 'number') {
        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
        
        if (avgLoss === 0) {
          rsiValues.push(100);
        } else {
          const rs = avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));
          rsiValues.push(rsi);
        }
      }
    }

    return rsiValues;
  }
}