import { TradingAgentsConfig } from '@/types/config';
import { YahooFinanceAPI } from './yahoo-finance.js';
import { AlphaVantageDataProvider } from './alpha-vantage.js';
import { MarketStackDataProvider, MARKETSTACK_CONFIG } from './marketstack.js';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Unified Market Data Provider
 * 
 * Multi-provider architecture with automatic failover:
 * - Primary: Yahoo Finance (node-yahoo-finance2) - Free, reliable
 * - Secondary: Alpha Vantage (alphavantage) - Free tier: 500 calls/day
 * - Tertiary: MarketStack (existing subscription) - Professional-grade data
 * 
 * TODO: Premium Provider Integration (Future Enhancement):
 * =======================================================
 * 
 * When budget allows, integrate these premium providers:
 * 
 * 1. Financial Modeling Prep WebSocket Streaming ($79/month)
 *    - Real-time WebSocket endpoints for stocks, forex, crypto
 *    - Low-latency professional market data
 *    - Implementation: WebSocket client with reconnection logic
 * 
 * 2. Alpaca Markets Institutional Data (Enterprise pricing)
 *    - Regulated broker with institutional-grade data
 *    - Real-time trades, quotes, bars via WebSocket
 *    - Implementation: Alpaca SDK integration
 * 
 * 3. Barchart MarketData API (Enterprise pricing)
 *    - Comprehensive asset class coverage
 *    - Note: Pending deprecation - monitor Openfeed migration
 */
export class UnifiedMarketDataProvider {
  private yahooFinance: YahooFinanceAPI;
  private alphaVantage: AlphaVantageDataProvider;
  private marketStack: MarketStackDataProvider | null;
  private config: TradingAgentsConfig;
  private logger = createLogger('dataflow', 'unified-market-data');

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.yahooFinance = new YahooFinanceAPI(config);
    this.alphaVantage = new AlphaVantageDataProvider(config);
    
    // Initialize MarketStack if API key is available
    this.marketStack = MARKETSTACK_CONFIG.apiKey 
      ? new MarketStackDataProvider(MARKETSTACK_CONFIG)
      : null;
    
    this.logger.info('constructor', 'Initializing Unified Market Data Provider', {
      primaryProvider: 'Yahoo Finance',
      secondaryProvider: 'Alpha Vantage',
      tertiaryProvider: this.marketStack ? 'MarketStack' : 'None',
      alphaVantageConfigured: this.alphaVantage.isConfigured(),
      marketStackConfigured: !!this.marketStack
    });
  }

  /**
   * Get historical data with automatic provider failover
   */
  async getHistoricalData(symbol: string, startDate: string, endDate: string): Promise<string> {
    this.logger.info('get-historical-data', `Getting historical data for ${symbol}`, {
      symbol,
      startDate,
      endDate
    });

    try {
      // Try Yahoo Finance first (primary provider)
      this.logger.info('trying-yahoo-finance', `Attempting Yahoo Finance for ${symbol}`);
      const yahooData = await this.yahooFinance.getData(symbol, startDate, endDate, true);
      
      this.logger.info('yahoo-finance-success', `Yahoo Finance data retrieved for ${symbol}`, {
        symbol,
        provider: 'yahoo-finance',
        dataLength: yahooData.length
      });
      
      return yahooData;
      
    } catch (yahooError) {
      this.logger.warn('yahoo-finance-failed', `Yahoo Finance failed for ${symbol}, trying Alpha Vantage`, {
        symbol,
        error: (yahooError as Error).message
      });

      try {
        // Fallback to Alpha Vantage
        if (!this.alphaVantage.isConfigured()) {
          this.logger.warn('alpha-vantage-not-configured', 'Alpha Vantage API key not configured, using demo key with limitations');
        }

        this.logger.info('trying-alpha-vantage', `Attempting Alpha Vantage for ${symbol}`);
        const alphaVantageData = await this.alphaVantage.getDailyData(symbol);
        const convertedData = this.alphaVantage.convertToYahooFormat(alphaVantageData, symbol);
        
        this.logger.info('alpha-vantage-success', `Alpha Vantage data retrieved for ${symbol}`, {
          symbol,
          provider: 'alpha-vantage',
          dataLength: convertedData.length
        });
        
        return convertedData;
        
      } catch (alphaVantageError) {
        this.logger.warn('alpha-vantage-failed', `Alpha Vantage failed for ${symbol}, trying MarketStack`, {
          symbol,
          yahooError: (yahooError as Error).message,
          alphaVantageError: (alphaVantageError as Error).message
        });

        try {
          // Try MarketStack if available
          if (!this.marketStack) {
            throw new Error('MarketStack provider not configured');
          }

          this.logger.info('trying-marketstack', `Attempting MarketStack for ${symbol}`);
          const marketStackData = await this.marketStack.getHistoricalData(symbol, startDate, endDate);
          
          // Convert MarketStack data to Yahoo Finance CSV format
          const convertedData = this.convertMarketStackToYahooFormat(marketStackData, symbol);
          
          this.logger.info('marketstack-success', `MarketStack data retrieved for ${symbol}`, {
            symbol,
            provider: 'marketstack',
            dataLength: convertedData.length,
            recordCount: marketStackData.length
          });
          
          return convertedData;
          
        } catch (marketStackError) {
          this.logger.error('all-providers-failed', `All data providers failed for ${symbol}`, {
            symbol,
            yahooError: (yahooError as Error).message,
            alphaVantageError: (alphaVantageError as Error).message,
            marketStackError: (marketStackError as Error).message
          });
          
          // Final fallback to offline data
          try {
            this.logger.info('trying-offline-data', `Attempting offline data for ${symbol}`);
            const offlineData = await this.yahooFinance.getData(symbol, startDate, endDate, false);
            
            this.logger.info('offline-data-success', `Offline data retrieved for ${symbol}`, {
              symbol,
              provider: 'offline-cache',
              dataLength: offlineData.length
            });
            
            return offlineData;
            
          } catch (offlineError) {
            this.logger.error('offline-data-failed', `All data sources failed for ${symbol}`, {
              symbol,
              yahooError: (yahooError as Error).message,
              alphaVantageError: (alphaVantageError as Error).message,
              marketStackError: (marketStackError as Error).message,
              offlineError: (offlineError as Error).message
            });
            
            throw new Error(`Unable to retrieve data for ${symbol} from any source. Yahoo Finance: ${(yahooError as Error).message}, Alpha Vantage: ${(alphaVantageError as Error).message}, MarketStack: ${(marketStackError as Error).message}, Offline: ${(offlineError as Error).message}`);
          }
        }
      }
    }
  }

  /**
   * Get real-time quote with provider failover
   */
  async getQuote(symbol: string): Promise<any> {
    this.logger.info('get-quote', `Getting quote for ${symbol}`, { symbol });

    try {
      // Try Yahoo Finance first
      const quote = await this.yahooFinance.getQuote(symbol);
      
      this.logger.info('quote-success', `Quote retrieved from Yahoo Finance for ${symbol}`, {
        symbol,
        provider: 'yahoo-finance',
        hasQuote: !!quote
      });
      
      return quote;
      
    } catch (yahooError) {
      this.logger.warn('yahoo-quote-failed', `Yahoo Finance quote failed for ${symbol}, trying Alpha Vantage`, {
        symbol,
        error: (yahooError as Error).message
      });

      try {
        // Fallback to Alpha Vantage
        const alphaQuote = await this.alphaVantage.getQuote(symbol);
        
        this.logger.info('alpha-quote-success', `Quote retrieved from Alpha Vantage for ${symbol}`, {
          symbol,
          provider: 'alpha-vantage',
          hasQuote: !!alphaQuote
        });
        
        return alphaQuote;
        
      } catch (alphaVantageError) {
        this.logger.warn('alpha-quote-failed', `Alpha Vantage quote failed for ${symbol}, trying MarketStack`, {
          symbol,
          yahooError: (yahooError as Error).message,
          alphaVantageError: (alphaVantageError as Error).message
        });

        try {
          // Try MarketStack if available
          if (!this.marketStack) {
            throw new Error('MarketStack provider not configured');
          }

          const marketStackQuote = await this.marketStack.getQuote(symbol);
          
          this.logger.info('marketstack-quote-success', `Quote retrieved from MarketStack for ${symbol}`, {
            symbol,
            provider: 'marketstack',
            hasQuote: !!marketStackQuote
          });
          
          return marketStackQuote;
          
        } catch (marketStackError) {
          this.logger.error('all-quote-providers-failed', `All quote providers failed for ${symbol}`, {
            symbol,
            yahooError: (yahooError as Error).message,
            alphaVantageError: (alphaVantageError as Error).message,
            marketStackError: (marketStackError as Error).message
          });
          
          throw new Error(`Unable to retrieve quote for ${symbol} from any provider. Yahoo Finance: ${(yahooError as Error).message}, Alpha Vantage: ${(alphaVantageError as Error).message}, MarketStack: ${(marketStackError as Error).message}`);
        }
      }
    }
  }

  /**
   * Get multiple quotes with optimized provider selection
   */
  async getQuotes(symbols: string[]): Promise<any[]> {
    this.logger.info('get-quotes', `Getting quotes for ${symbols.length} symbols`, {
      symbols,
      symbolCount: symbols.length
    });

    try {
      // Try Yahoo Finance first (can handle bulk requests efficiently)
      const quotes = await this.yahooFinance.getQuotes(symbols);
      
      this.logger.info('quotes-success', `Quotes retrieved from Yahoo Finance`, {
        symbols,
        provider: 'yahoo-finance',
        quotesCount: quotes.length
      });
      
      return quotes;
      
    } catch (yahooError) {
      this.logger.warn('yahoo-quotes-failed', `Yahoo Finance bulk quotes failed, falling back to individual Alpha Vantage requests`, {
        symbols,
        symbolCount: symbols.length,
        error: (yahooError as Error).message
      });

      // Fallback to individual Alpha Vantage requests (respecting rate limits)
      const quotes: any[] = [];
      const errors: string[] = [];
      
      for (const symbol of symbols) {
        try {
          // Add delay between requests to respect Alpha Vantage rate limits
          if (quotes.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 12000)); // 5 calls per minute = 12 second spacing
          }
          
          const quote = await this.alphaVantage.getQuote(symbol);
          quotes.push(quote);
          
        } catch (symbolError) {
          this.logger.error('symbol-quote-failed', `Failed to get quote for ${symbol}`, {
            symbol,
            error: (symbolError as Error).message
          });
          errors.push(`${symbol}: ${(symbolError as Error).message}`);
        }
      }
      
      if (quotes.length === 0) {
        throw new Error(`Failed to retrieve any quotes. Errors: ${errors.join(', ')}`);
      }
      
      this.logger.info('partial-quotes-success', `Retrieved ${quotes.length}/${symbols.length} quotes from Alpha Vantage`, {
        symbols,
        provider: 'alpha-vantage',
        successCount: quotes.length,
        totalCount: symbols.length,
        errors: errors.length
      });
      
      return quotes;
    }
  }

  /**
   * Search for symbols across providers
   */
  async searchSymbols(query: string): Promise<any> {
    this.logger.info('search-symbols', `Searching for symbols with query: ${query}`, { query });

    try {
      // Try Yahoo Finance first
      const yahooResults = await this.yahooFinance.search(query);
      
      this.logger.info('yahoo-search-success', `Symbol search completed via Yahoo Finance`, {
        query,
        provider: 'yahoo-finance',
        resultsCount: yahooResults?.length || 0
      });
      
      return yahooResults;
      
    } catch (yahooError) {
      this.logger.warn('yahoo-search-failed', `Yahoo Finance search failed, trying Alpha Vantage`, {
        query,
        error: (yahooError as Error).message
      });

      try {
        // Fallback to Alpha Vantage
        const alphaResults = await this.alphaVantage.searchSymbols(query);
        
        this.logger.info('alpha-search-success', `Symbol search completed via Alpha Vantage`, {
          query,
          provider: 'alpha-vantage',
          resultsCount: alphaResults?.bestMatches?.length || 0
        });
        
        return alphaResults;
        
      } catch (alphaVantageError) {
        this.logger.error('all-search-providers-failed', `All search providers failed for query: ${query}`, {
          query,
          yahooError: (yahooError as Error).message,
          alphaVantageError: (alphaVantageError as Error).message
        });
        
        throw new Error(`Unable to search for symbols with query "${query}" from any provider. Yahoo Finance: ${(yahooError as Error).message}, Alpha Vantage: ${(alphaVantageError as Error).message}`);
      }
    }
  }

  /**
   * Get provider health status
   */
  getProviderStatus(): any {
    return {
      primaryProvider: {
        name: 'Yahoo Finance',
        status: 'active',
        metrics: this.yahooFinance.getMetrics()
      },
      secondaryProvider: {
        name: 'Alpha Vantage',
        status: this.alphaVantage.isConfigured() ? 'active' : 'limited',
        configured: this.alphaVantage.isConfigured(),
        usage: this.alphaVantage.getUsageInfo(),
        metrics: this.alphaVantage.getMetrics()
      },
      tertiaryProvider: {
        name: 'MarketStack',
        status: this.marketStack ? 'active' : 'not-configured',
        configured: !!this.marketStack,
        info: this.marketStack ? this.marketStack.getProviderInfo() : null
      },
      futureProviders: {
        financialModelingPrep: {
          name: 'Financial Modeling Prep WebSocket',
          status: 'planned',
          cost: '$79/month',
          features: ['Real-time WebSocket streaming', 'Low latency', 'Multi-asset support']
        },
        alpacaMarkets: {
          name: 'Alpaca Markets',
          status: 'planned',
          cost: 'Enterprise pricing',
          features: ['Institutional data', 'Regulated broker', 'Real-time trades/quotes']
        },
        barchartAPI: {
          name: 'Barchart MarketData API',
          status: 'under-review',
          cost: 'Enterprise pricing',
          note: 'Pending deprecation - monitor Openfeed migration'
        }
      }
    };
  }

  /**
   * Reset all provider metrics
   */
  resetMetrics(): void {
    this.yahooFinance.resetMetrics();
    this.alphaVantage.resetMetrics();
    this.logger.info('metrics-reset', 'All provider metrics reset');
  }

  /**
   * Convert MarketStack data to Yahoo Finance CSV format
   * @private
   */
  private convertMarketStackToYahooFormat(marketStackData: any[], symbol: string): string {
    if (!marketStackData || marketStackData.length === 0) {
      throw new Error('No MarketStack data provided for conversion');
    }

    // CSV header
    const header = 'Date,Open,High,Low,Close,Adj Close,Volume\n';
    
    // Convert each MarketStack quote to Yahoo Finance CSV format
    const csvLines = marketStackData.map(quote => {
      // Format: Date,Open,High,Low,Close,Adj Close,Volume
      const date = new Date(quote.date).toISOString().split('T')[0]; // YYYY-MM-DD format
      const open = quote.open || quote.close;
      const high = quote.high || quote.close;
      const low = quote.low || quote.close;
      const close = quote.close;
      const adjClose = quote.adj_close || quote.close; // Use adjusted close if available
      const volume = quote.volume || 0;
      
      return `${date},${open},${high},${low},${close},${adjClose},${volume}`;
    });

    // Sort by date (oldest first) to match Yahoo Finance format
    csvLines.sort((a, b) => {
      const dateAStr = a.split(',')[0];
      const dateBStr = b.split(',')[0];
      if (!dateAStr || !dateBStr) return 0;
      
      const dateA = new Date(dateAStr);
      const dateB = new Date(dateBStr);
      return dateA.getTime() - dateB.getTime();
    });

    const csvData = header + csvLines.join('\n');
    
    this.logger.debug('marketstack-conversion', 'Converted MarketStack data to Yahoo Finance format', {
      symbol,
      recordCount: marketStackData.length,
      csvLength: csvData.length
    });

    return csvData;
  }
}