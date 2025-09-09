/**
 * Enhanced Data Flow Utilities with Comprehensive Error Handling
 * 
 * This module wraps the existing data flow utilities with robust error handling,
 * retry mechanisms, circuit breakers, and graceful degradation.
 */

import { 
  globalErrorManager, 
  ErrorType, 
  ErrorSeverity, 
  createErrorContext,
  TradingAgentError,
  RecoveryStrategy 
} from '../utils/error-handler';
import { DEFAULT_CONFIG } from '../config/default';

// Import existing data flow utilities
import { FinnhubAPI } from '../dataflows/finnhub';
import { YahooFinanceAPI } from '../dataflows/yahoo-finance';
import { GoogleNewsAPI } from '../dataflows/google-news';
import { RedditAPI } from '../dataflows/reddit';

// ========================================
// Enhanced Finnhub API with Error Handling
// ========================================

export class EnhancedFinnhubAPI {
  private finnhub: FinnhubAPI;
  private circuitBreaker = globalErrorManager.getCircuitBreaker('finnhub');

  constructor(apiKey?: string) {
    // Create config with API key override if provided
    const config = { ...DEFAULT_CONFIG, finnhubApiKey: apiKey || DEFAULT_CONFIG.finnhubApiKey };
    this.finnhub = new FinnhubAPI(config);
  }

  async getInsiderSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    const context = createErrorContext('EnhancedFinnhubAPI', 'getInsiderSentiment', {
      ticker,
      metadata: { currDate, lookBackDays }
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          if (!this.finnhub['apiKey']) {
            throw new TradingAgentError(
              'Finnhub API key not configured',
              ErrorType.MISSING_API_KEY,
              ErrorSeverity.HIGH,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          return this.finnhub.getInsiderSentiment(ticker, currDate, lookBackDays);
        },
        context,
        {
          maxAttempts: 3,
          baseDelay: 2000,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR]
        }
      );
    });
  }

  async getInsiderTransactions(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    const context = createErrorContext('EnhancedFinnhubAPI', 'getInsiderTransactions', {
      ticker,
      metadata: { currDate, lookBackDays }
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          if (!this.finnhub['apiKey']) {
            throw new TradingAgentError(
              'Finnhub API key not configured',
              ErrorType.MISSING_API_KEY,
              ErrorSeverity.HIGH,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          return this.finnhub.getInsiderTransactions(ticker, currDate, lookBackDays);
        },
        context,
        {
          maxAttempts: 3,
          baseDelay: 2000,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR]
        }
      );
    });
  }

  async getBasicFinancials(ticker: string): Promise<string> {
    const context = createErrorContext('EnhancedFinnhubAPI', 'getBasicFinancials', {
      ticker
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          if (!this.finnhub['apiKey']) {
            throw new TradingAgentError(
              'Finnhub API key not configured',
              ErrorType.MISSING_API_KEY,
              ErrorSeverity.HIGH,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          // Call the original method (we need to add this method to FinnhubAPI)
          const url = `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${this.finnhub['apiKey']}`;
          const axios = await import('axios');
          const response = await axios.default.get(url);
          
          if (!response.data || !response.data.metric) {
            return `No financial data available for ${ticker}`;
          }

          const metrics = response.data.metric;
          let result = `## ${ticker} Basic Financial Metrics:\n`;
          
          // Key financial metrics
          if (metrics.peNormalizedAnnual) result += `P/E Ratio: ${metrics.peNormalizedAnnual}\n`;
          if (metrics.pbAnnual) result += `P/B Ratio: ${metrics.pbAnnual}\n`;
          if (metrics.psAnnual) result += `P/S Ratio: ${metrics.psAnnual}\n`;
          if (metrics.roiAnnual) result += `ROI: ${metrics.roiAnnual}%\n`;
          if (metrics.roeAnnual) result += `ROE: ${metrics.roeAnnual}%\n`;
          if (metrics.roaAnnual) result += `ROA: ${metrics.roaAnnual}%\n`;
          if (metrics.currentRatioAnnual) result += `Current Ratio: ${metrics.currentRatioAnnual}\n`;
          if (metrics.quickRatioAnnual) result += `Quick Ratio: ${metrics.quickRatioAnnual}\n`;
          
          return result;
        },
        context,
        {
          maxAttempts: 3,
          baseDelay: 2000,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR]
        }
      );
    });
  }
}

// ========================================
// Enhanced Yahoo Finance with Error Handling
// ========================================

export class EnhancedYahooFinanceDataflow {
  private yfin: YahooFinanceAPI;
  private circuitBreaker = globalErrorManager.getCircuitBreaker('yahoo_finance');

  constructor() {
    this.yfin = new YahooFinanceAPI(DEFAULT_CONFIG);
  }

  async getYFinDataOnline(ticker: string, startDate: string, endDate: string): Promise<string> {
    const context = createErrorContext('EnhancedYahooFinanceDataflow', 'getYFinDataOnline', {
      ticker,
      metadata: { startDate, endDate }
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          const result = await this.yfin.getData(ticker, startDate, endDate, true);
          
          if (!result || result.length === 0) {
            throw new TradingAgentError(
              `No data available for ${ticker} between ${startDate} and ${endDate}`,
              ErrorType.MISSING_DATA,
              ErrorSeverity.MEDIUM,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          return result;
        },
        context,
        {
          maxAttempts: 3,
          baseDelay: 1500,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
        }
      );
    });
  }

  async getYFinDataOnlineWithFallback(ticker: string, startDate: string, endDate: string): Promise<string> {
    try {
      return await this.getYFinDataOnline(ticker, startDate, endDate);
    } catch (error) {
      const context = createErrorContext('EnhancedYahooFinanceDataflow', 'getYFinDataOnlineWithFallback', {
        ticker,
        metadata: { startDate, endDate, fallbackUsed: true }
      });

      globalErrorManager.getLogger().log('warn', 'EnhancedYahooFinanceDataflow', 'fallback', 
        `Primary Yahoo Finance data failed for ${ticker}, using fallback data`);

      // Return a minimal dataset as fallback
      return this.generateFallbackData(ticker, startDate, endDate);
    }
  }

  private generateFallbackData(ticker: string, startDate: string, endDate: string): string {
    return `## ${ticker} Market Data (Fallback - Limited Data Available)

**Date Range**: ${startDate} to ${endDate}
**Status**: Primary data source unavailable
**Recommendation**: Consider using historical patterns or alternative analysis methods

**Note**: Real-time market data is currently unavailable. Please verify market conditions through alternative sources.`;
  }
}

// ========================================
// Enhanced Google News with Error Handling
// ========================================

export class EnhancedGoogleNewsDataflow {
  private googleNews: GoogleNewsAPI;
  private circuitBreaker = globalErrorManager.getCircuitBreaker('google_news');

  constructor() {
    this.googleNews = new GoogleNewsAPI(DEFAULT_CONFIG);
  }

  async getGoogleNews(ticker: string, companyName: string, currDate: string, lookBackDays: number): Promise<string> {
    const context = createErrorContext('EnhancedGoogleNewsDataflow', 'getGoogleNews', {
      ticker,
      metadata: { companyName, currDate, lookBackDays }
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          const result = await this.googleNews.getNews(`${ticker} ${companyName}`, currDate, lookBackDays);
          
          if (!result || result.trim().length === 0) {
            throw new TradingAgentError(
              `No news data available for ${ticker} (${companyName})`,
              ErrorType.MISSING_DATA,
              ErrorSeverity.LOW,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          return result;
        },
        context,
        {
          maxAttempts: 2,
          baseDelay: 1000,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR]
        }
      );
    });
  }

  async getGoogleNewsWithFallback(ticker: string, companyName: string, currDate: string, lookBackDays: number): Promise<string> {
    try {
      return await this.getGoogleNews(ticker, companyName, currDate, lookBackDays);
    } catch (error) {
      globalErrorManager.getLogger().log('warn', 'EnhancedGoogleNewsDataflow', 'fallback', 
        `Primary news data failed for ${ticker}, using fallback message`);

      return this.generateFallbackNews(ticker, companyName, currDate, lookBackDays);
    }
  }

  private generateFallbackNews(ticker: string, companyName: string, currDate: string, lookBackDays: number): string {
    return `## ${ticker} (${companyName}) News Analysis (Fallback)

**Date Range**: Last ${lookBackDays} days from ${currDate}
**Status**: News data currently unavailable

**Recommendation**: 
- Monitor company announcements directly
- Check SEC filings for material information
- Consider broader market sentiment analysis
- Use technical analysis as primary decision factor

**Note**: News sentiment analysis is temporarily unavailable. Base trading decisions on technical and fundamental analysis.`;
  }
}

// ========================================
// Enhanced Reddit Dataflow with Error Handling
// ========================================

export class EnhancedRedditDataflow {
  private reddit: RedditAPI;
  private circuitBreaker = globalErrorManager.getCircuitBreaker('reddit');

  constructor() {
    this.reddit = new RedditAPI(DEFAULT_CONFIG);
  }

  async getRedditSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    const context = createErrorContext('EnhancedRedditDataflow', 'getRedditSentiment', {
      ticker,
      metadata: { currDate, lookBackDays }
    });

    return this.circuitBreaker.execute(async () => {
      return globalErrorManager.executeWithRetry(
        async () => {
          const result = await this.reddit.getCompanyNews(ticker, currDate, lookBackDays, 50);
          
          if (!result || result.trim().length === 0) {
            throw new TradingAgentError(
              `No Reddit sentiment data available for ${ticker}`,
              ErrorType.MISSING_DATA,
              ErrorSeverity.LOW,
              context,
              { recoveryStrategy: RecoveryStrategy.FALLBACK }
            );
          }

          return result;
        },
        context,
        {
          maxAttempts: 2,
          baseDelay: 1000,
          retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.RATE_LIMIT_ERROR]
        }
      );
    });
  }

  async getRedditSentimentWithFallback(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    try {
      return await this.getRedditSentiment(ticker, currDate, lookBackDays);
    } catch (error) {
      globalErrorManager.getLogger().log('warn', 'EnhancedRedditDataflow', 'fallback', 
        `Reddit sentiment data failed for ${ticker}, using neutral sentiment fallback`);

      return this.generateFallbackSentiment(ticker, currDate, lookBackDays);
    }
  }

  private generateFallbackSentiment(ticker: string, currDate: string, lookBackDays: number): string {
    return `## ${ticker} Social Sentiment Analysis (Fallback)

**Date Range**: Last ${lookBackDays} days from ${currDate}
**Status**: Social sentiment data unavailable
**Sentiment**: Neutral (No data available)

**Recommendation**: 
- Social sentiment analysis is currently unavailable
- Focus on fundamental and technical analysis
- Consider general market sentiment indicators
- Monitor official company communications

**Note**: Social media sentiment data is temporarily unavailable. Trading decisions should prioritize technical and fundamental analysis.`;
  }
}

// ========================================
// Unified Enhanced Data Toolkit
// ========================================

export class EnhancedDataToolkit {
  public readonly finnhub: EnhancedFinnhubAPI;
  public readonly yahooFinance: EnhancedYahooFinanceDataflow;
  public readonly googleNews: EnhancedGoogleNewsDataflow;
  public readonly reddit: EnhancedRedditDataflow;

  constructor(finnhubApiKey?: string) {
    this.finnhub = new EnhancedFinnhubAPI(finnhubApiKey);
    this.yahooFinance = new EnhancedYahooFinanceDataflow();
    this.googleNews = new EnhancedGoogleNewsDataflow();
    this.reddit = new EnhancedRedditDataflow();
  }

  /**
   * Get comprehensive market data with automatic fallbacks
   */
  async getComprehensiveMarketData(ticker: string, currDate: string, lookBackDays: number = 7): Promise<{
    financialData: string;
    insiderSentiment: string;
    insiderTransactions: string;
    news: string;
    socialSentiment: string;
    errors: TradingAgentError[];
  }> {
    const errors: TradingAgentError[] = [];
    const results: {
      financialData: string;
      insiderSentiment: string;
      insiderTransactions: string;
      news: string;
      socialSentiment: string;
      errors: TradingAgentError[];
    } = {
      financialData: '',
      insiderSentiment: '',
      insiderTransactions: '',
      news: '',
      socialSentiment: '',
      errors
    };

    // Collect all data with error handling
    const dataCollectors = [
      {
        name: 'financialData',
        fn: () => this.yahooFinance.getYFinDataOnlineWithFallback(ticker, this.getPreviousDate(currDate, lookBackDays), currDate)
      },
      {
        name: 'insiderSentiment',
        fn: () => this.finnhub.getInsiderSentiment(ticker, currDate, lookBackDays)
      },
      {
        name: 'insiderTransactions',
        fn: () => this.finnhub.getInsiderTransactions(ticker, currDate, lookBackDays)
      },
      {
        name: 'news',
        fn: () => this.googleNews.getGoogleNewsWithFallback(ticker, ticker, currDate, lookBackDays)
      },
      {
        name: 'socialSentiment',
        fn: () => this.reddit.getRedditSentimentWithFallback(ticker, currDate, lookBackDays)
      }
    ];

    // Execute all data collection in parallel with error isolation
    await Promise.allSettled(
      dataCollectors.map(async collector => {
        try {
          (results as any)[collector.name] = await collector.fn();
        } catch (error) {
          const tradingError = await globalErrorManager.handleError(error, 
            createErrorContext('EnhancedDataToolkit', 'getComprehensiveMarketData', {
              ticker,
              metadata: { dataSource: collector.name, currDate, lookBackDays }
            })
          );
          errors.push(tradingError);

          // Provide fallback message for this data source
          (results as any)[collector.name] = 
            `Data unavailable for ${collector.name}: ${tradingError.message}`;
        }
      })
    );

    return results;
  }

  /**
   * Get error statistics and health status
   */
  getHealthStatus() {
    const errorStats = globalErrorManager.getStats();
    const circuitBreakers = ['finnhub', 'yahoo_finance', 'google_news', 'reddit'].map(name => ({
      name,
      status: globalErrorManager.getCircuitBreaker(name).getState()
    }));

    return {
      errorStats,
      circuitBreakers,
      timestamp: new Date()
    };
  }

  private getPreviousDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0] || dateStr;
  }
}

// ========================================
// Global Enhanced Data Toolkit Instance
// ========================================

export const enhancedDataToolkit = new EnhancedDataToolkit(process.env.FINNHUB_API_KEY);

// ========================================
// Error Recovery Utilities
// ========================================

export class DataErrorRecovery {
  /**
   * Attempt to recover from a data collection failure by trying alternative approaches
   */
  static async recoverFromDataFailure(
    ticker: string,
    dataType: 'market' | 'news' | 'sentiment' | 'financial',
    originalError: TradingAgentError
  ): Promise<string> {
    const context = createErrorContext('DataErrorRecovery', 'recoverFromDataFailure', {
      ticker,
      metadata: { dataType, originalErrorType: originalError.type }
    });

    switch (dataType) {
      case 'market':
        return this.generateMarketDataFallback(ticker);
      case 'news':
        return this.generateNewsDataFallback(ticker);
      case 'sentiment':
        return this.generateSentimentDataFallback(ticker);
      case 'financial':
        return this.generateFinancialDataFallback(ticker);
      default:
        throw new TradingAgentError(
          `Unknown data type for recovery: ${dataType}`,
          ErrorType.BUSINESS_LOGIC_ERROR,
          ErrorSeverity.MEDIUM,
          context
        );
    }
  }

  private static generateMarketDataFallback(ticker: string): string {
    return `## ${ticker} Market Data (Recovery Mode)

**Status**: Primary market data sources unavailable
**Recommendation**: Use technical analysis patterns and historical volatility estimates
**Action**: Consider postponing trading decision until market data is available`;
  }

  private static generateNewsDataFallback(ticker: string): string {
    return `## ${ticker} News Analysis (Recovery Mode)

**Status**: News sources currently unavailable
**Recommendation**: Monitor company official announcements and SEC filings
**Action**: Base decisions on technical and fundamental analysis`;
  }

  private static generateSentimentDataFallback(ticker: string): string {
    return `## ${ticker} Sentiment Analysis (Recovery Mode)

**Status**: Sentiment data sources unavailable
**Sentiment**: Neutral (default)
**Recommendation**: Use market momentum and volume indicators as sentiment proxies`;
  }

  private static generateFinancialDataFallback(ticker: string): string {
    return `## ${ticker} Financial Data (Recovery Mode)

**Status**: Financial data sources unavailable
**Recommendation**: Use last known financial ratios and earnings estimates
**Action**: Consider using broader market indices as reference points`;
  }
}