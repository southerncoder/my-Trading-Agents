import { TradingAgentsConfig } from '@/types/config';
import AlphaVantageAPI from 'alphavantage';
import { createLogger } from '../utils/enhanced-logger.js';
import { 
  withDataflowResilience, 
  ALPHA_VANTAGE_CONFIG, 
  DataflowMetricsCollector 
} from '../utils/resilient-dataflow.js';

/**
 * Alpha Vantage API wrapper as backup data provider
 * FREE TIER: 500 API calls per day, 5 calls per minute
 * 
 * TODO: Premium Alpha Vantage Features (Future Enhancement):
 * =========================================================
 * 
 * 1. PREMIUM PLAN INTEGRATION (Hold for Budget Approval):
 *    - Premium plan: $50/month for 1200 calls/minute
 *    - Extended intraday data (1min, 5min intervals)
 *    - Real-time data updates
 *    - Extended historical data (20+ years)
 *    - Advanced technical indicators
 * 
 * 2. ENHANCED DATA TYPES (Premium Features):
 *    - Forex data with 1-minute intervals
 *    - Cryptocurrency data with real-time updates
 *    - Commodity prices and futures data
 *    - Economic indicators and news sentiment
 */
export class AlphaVantageDataProvider {
  private alphaVantage: any;
  private config: TradingAgentsConfig;
  private logger = createLogger('dataflow', 'alpha-vantage');
  private metrics = new DataflowMetricsCollector();
  private apiKey: string;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    
    // Get API key from environment variable
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.apiKey) {
      this.logger.warn('no-api-key', 'Alpha Vantage API key not provided. Free demo key will be used with severe rate limits.');
      this.apiKey = 'demo'; // Alpha Vantage provides a demo key with very limited functionality
    }

    this.alphaVantage = AlphaVantageAPI({ key: this.apiKey });
    
    this.logger.info('constructor', 'Initializing Alpha Vantage API', {
      hasApiKey: !!this.apiKey && this.apiKey !== 'demo',
      keyLength: this.apiKey.length
    });
  }

  /**
   * Get historical daily data for a symbol
   */
  async getDailyData(symbol: string): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-daily-${symbol}`,
      async () => {
        this.logger.info('get-daily-data', `Fetching daily data for ${symbol}`, { symbol });
        
        const data = await this.alphaVantage.data.daily(symbol, 'full');
        
        this.logger.info('daily-data-fetched', `Daily data fetched successfully for ${symbol}`, {
          symbol,
          hasData: !!data,
          metaData: data?.['Meta Data'] || null
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('daily-data-failed', `Error fetching daily data for ${symbol}`, {
        symbol,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get intraday data for a symbol (free tier: 5min intervals only)
   */
  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-intraday-${symbol}`,
      async () => {
        this.logger.info('get-intraday-data', `Fetching intraday data for ${symbol}`, { 
          symbol, 
          interval 
        });
        
        // Free tier only supports 5min intervals
        if (this.apiKey === 'demo' && interval !== '5min') {
          this.logger.warn('demo-key-limitation', 'Demo key only supports 5min intervals. Adjusting interval.', {
            requestedInterval: interval,
            adjustedInterval: '5min'
          });
          interval = '5min';
        }
        
        const data = await this.alphaVantage.data.intraday(symbol, interval, 'compact');
        
        this.logger.info('intraday-data-fetched', `Intraday data fetched successfully for ${symbol}`, {
          symbol,
          interval,
          hasData: !!data,
          metaData: data?.['Meta Data'] || null
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('intraday-data-failed', `Error fetching intraday data for ${symbol}`, {
        symbol,
        interval,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get current quote for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-quote-${symbol}`,
      async () => {
        this.logger.info('get-quote', `Fetching quote for ${symbol}`, { symbol });
        
        const data = await this.alphaVantage.data.quote(symbol);
        
        this.logger.info('quote-fetched', `Quote fetched successfully for ${symbol}`, {
          symbol,
          hasData: !!data,
          quote: data?.['Global Quote'] || null
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('quote-failed', `Error fetching quote for ${symbol}`, {
        symbol,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Search for symbols
   */
  async searchSymbols(keywords: string): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-search-${keywords}`,
      async () => {
        this.logger.info('search-symbols', `Searching for symbols with keywords: ${keywords}`, { keywords });
        
        const data = await this.alphaVantage.data.search(keywords);
        
        this.logger.info('search-complete', `Search completed for keywords: ${keywords}`, {
          keywords,
          hasData: !!data,
          resultsCount: data?.bestMatches?.length || 0
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('search-failed', `Error searching for symbols with keywords: ${keywords}`, {
        keywords,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get technical indicators (SMA, EMA, RSI, etc.)
   */
  async getTechnicalIndicator(
    symbol: string, 
    indicator: 'sma' | 'ema' | 'rsi' | 'macd' | 'bbands',
    interval: '1min' | '5min' | '15min' | '30min' | '60min' | 'daily' = 'daily',
    timePeriod: number = 20
  ): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-indicator-${symbol}-${indicator}`,
      async () => {
        this.logger.info('get-technical-indicator', `Fetching ${indicator} for ${symbol}`, {
          symbol,
          indicator,
          interval,
          timePeriod
        });
        
        let data: any;
        
        switch (indicator) {
          case 'sma':
            data = await this.alphaVantage.technical.sma(symbol, interval, timePeriod, 'close');
            break;
          case 'ema':
            data = await this.alphaVantage.technical.ema(symbol, interval, timePeriod, 'close');
            break;
          case 'rsi':
            data = await this.alphaVantage.technical.rsi(symbol, interval, timePeriod, 'close');
            break;
          case 'macd':
            data = await this.alphaVantage.technical.macd(symbol, interval, 12, 26, 9, 'close');
            break;
          case 'bbands':
            data = await this.alphaVantage.technical.bbands(symbol, interval, timePeriod, 'close', 2, 2);
            break;
          default:
            throw new Error(`Unsupported technical indicator: ${indicator}`);
        }
        
        this.logger.info('indicator-fetched', `${indicator} indicator fetched successfully for ${symbol}`, {
          symbol,
          indicator,
          interval,
          timePeriod,
          hasData: !!data
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('indicator-failed', `Error fetching ${indicator} for ${symbol}`, {
        symbol,
        indicator,
        interval,
        timePeriod,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get company overview/fundamentals
   */
  async getCompanyOverview(symbol: string): Promise<any> {
    return withDataflowResilience(
      `alpha-vantage-overview-${symbol}`,
      async () => {
        this.logger.info('get-company-overview', `Fetching company overview for ${symbol}`, { symbol });
        
        const data = await this.alphaVantage.fundamental.company_overview(symbol);
        
        this.logger.info('overview-fetched', `Company overview fetched successfully for ${symbol}`, {
          symbol,
          hasData: !!data,
          companySymbol: data?.Symbol || null,
          name: data?.Name || null
        });
        
        return data;
      },
      ALPHA_VANTAGE_CONFIG
    ).catch((error) => {
      this.logger.error('overview-failed', `Error fetching company overview for ${symbol}`, {
        symbol,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Convert Alpha Vantage data to Yahoo Finance-compatible format
   */
  convertToYahooFormat(alphaVantageData: any, symbol: string): string {
    try {
      let csvData = 'Date,Open,High,Low,Close,Adj Close,Volume\n';
      
      // Handle different Alpha Vantage response formats
      let timeSeries: any = null;
      
      if (alphaVantageData['Time Series (Daily)']) {
        timeSeries = alphaVantageData['Time Series (Daily)'];
      } else if (alphaVantageData['Time Series (5min)']) {
        timeSeries = alphaVantageData['Time Series (5min)'];
      } else if (alphaVantageData['Time Series (Intraday)']) {
        timeSeries = alphaVantageData['Time Series (Intraday)'];
      }
      
      if (!timeSeries) {
        this.logger.warn('no-time-series', 'No time series data found in Alpha Vantage response', {
          symbol,
          availableKeys: Object.keys(alphaVantageData)
        });
        return `No time series data available for ${symbol}`;
      }
      
      // Convert data to CSV format
      const dates = Object.keys(timeSeries).sort();
      for (const date of dates) {
        const dayData = timeSeries[date];
        const open = dayData['1. open'] || dayData['1. Open'] || '';
        const high = dayData['2. high'] || dayData['2. High'] || '';
        const low = dayData['3. low'] || dayData['3. Low'] || '';
        const close = dayData['4. close'] || dayData['4. Close'] || '';
        const volume = dayData['5. volume'] || dayData['5. Volume'] || '';
        
        csvData += `${date},${open},${high},${low},${close},${close},${volume}\n`;
      }
      
      const header = `# Stock data for ${symbol.toUpperCase()} from Alpha Vantage\n`;
      const timestamp = `# Data retrieved on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
      
      return header + timestamp + csvData;
      
    } catch (error) {
      this.logger.error('format-conversion-failed', 'Error converting Alpha Vantage data to Yahoo format', {
        symbol,
        error: (error as Error).message
      });
      return `Error converting data for ${symbol}: ${(error as Error).message}`;
    }
  }

  /**
   * Get metrics for monitoring and health checks
   */
  getMetrics(): any {
    return this.metrics.getMetrics();
  }

  /**
   * Reset metrics (for testing or periodic cleanup)
   */
  resetMetrics(): void {
    this.metrics.resetMetrics();
    this.logger.info('metrics-reset', 'Alpha Vantage API metrics reset');
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== '' && this.apiKey !== 'demo';
  }

  /**
   * Get API usage information
   */
  getUsageInfo(): any {
    return {
      hasApiKey: this.isConfigured(),
      keyType: this.apiKey === 'demo' ? 'demo' : 'user-provided',
      rateLimits: {
        free: '500 calls/day, 5 calls/minute',
        premium: '1200 calls/minute (Premium plan: $50/month)'
      }
    };
  }
}