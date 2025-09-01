import { TradingAgentsConfig } from '@/types/config';
import yahooFinance from 'yahoo-finance2';

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
 * TODO: Add caching layer for expensive calculations
 * TODO: Add support for intraday timeframes (1m, 5m, 15m, 1h)
 * TODO: Add more advanced indicators (Ichimoku, Fibonacci retracements, Elliott Wave)
 * TODO: Add alert system for indicator threshold crossovers
 * TODO: Add backtesting framework for indicator strategies
 * TODO: Add performance metrics and indicator reliability scoring
 * TODO: Add multi-timeframe analysis capability
 * TODO: Add custom indicator plugin system
 */
export class TechnicalIndicatorsAPI {
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
  }

  /**
   * Fetch real market data from Yahoo Finance
   * 
   * TODO: Add support for multiple data providers (Alpha Vantage, Quandl, IEX)
   * TODO: Add data validation and cleaning
   * TODO: Add automatic retry mechanism with exponential backoff
   * TODO: Add rate limiting and request throttling
   * TODO: Add data caching with configurable TTL
   * TODO: Add support for adjusted prices (splits, dividends)
   */
  private async fetchRealMarketData(symbol: string, currDate: string, lookBackDays: number): Promise<PriceData[]> {
    try {
      const endDate = new Date(currDate);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - lookBackDays);

      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: '1d' as const,
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

      return mappedResult as PriceData[];
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Generate realistic fallback price data when API fails
   * 
   * TODO: Add sector-specific volatility patterns
   * TODO: Add correlation with market indices
   * TODO: Add realistic volume patterns
   * TODO: Add gap and trend simulation
   * TODO: Add earnings/news event simulation
   */
  private generateRealisticPriceData(symbol: string, currDate: string, lookBackDays: number): PriceData[] {
    const data: PriceData[] = [];
    const endDate = new Date(currDate);
    const basePrice = 100 + Math.random() * 400; // Random base price between 100-500
    let currentPrice = basePrice;
    
    for (let i = lookBackDays; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement (±3% daily volatility)
      const volatility = 0.03;
      const priceChange = (Math.random() - 0.5) * 2 * volatility;
      currentPrice *= (1 + priceChange);
      
      const dailyRange = currentPrice * 0.02; // 2% daily range
      const high = currentPrice + (Math.random() * dailyRange);
      const low = currentPrice - (Math.random() * dailyRange);
      const open = low + Math.random() * (high - low);
      const close = low + Math.random() * (high - low);
      
      data.push({
        date: date.toISOString().split('T')[0] as string,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
    }
    
    return data;
  }

  /**
   * Get technical indicators report for a symbol using real market data
   */
  async getIndicatorsReport(symbol: string, currDate: string, lookBackDays: number, online: boolean = true): Promise<string> {
    // Fetch real market data or use realistic fallback
    const priceData = online 
      ? await this.fetchRealMarketData(symbol, currDate, lookBackDays)
      : this.generateRealisticPriceData(symbol, currDate, lookBackDays);
    
    if (priceData.length === 0) {
      return `## Technical Indicators Report for ${symbol}: No data available`;
    }

    const indicators = [
      'close_50_sma',
      'close_200_sma', 
      'close_10_ema',
      'macd',
      'rsi',
      'boll',
      'atr'
    ];

    let report = `## Technical Indicators Report for ${symbol} from ${new Date(new Date(currDate).getTime() - lookBackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${currDate}:\n\n`;
    report += `Data points: ${priceData.length} days\n`;
    report += `Data source: ${online ? 'Yahoo Finance API' : 'Fallback realistic data'}\n\n`;

    for (const indicator of indicators) {
      const indicatorData = await this.getIndicator(symbol, indicator, currDate, lookBackDays, priceData);
      report += indicatorData + '\n\n';
    }

    return report;
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
      'atr': 'ATR: Averages true range to measure volatility. Usage: Set stop-loss levels and adjust position sizes based on current market volatility. Tips: It\'s a reactive measure, so use it as part of a broader risk management strategy.'
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
}