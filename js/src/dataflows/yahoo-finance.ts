import { TradingAgentsConfig } from '@/types/config';
import yahooFinance from 'yahoo-finance2';
import { createLogger } from '../utils/enhanced-logger.js';
import { 
  withDataflowResilience, 
  YAHOO_FINANCE_CONFIG, 
  createResilientDataflowWrapper,
  DataflowMetricsCollector 
} from '../utils/resilient-dataflow.js';

/**
 * Yahoo Finance API wrapper using the official node-yahoo-finance2 library
 * Enhanced with resilient patterns for robust external API integration
 * 
 * FREE PROVIDER: Yahoo Finance (node-yahoo-finance2) - Primary real-time data source
 * 
 * TODO: Premium Data Provider Integration (Future Enhancement):
 * =============================================================
 * 
 * 1. PAID STREAMING SERVICES (Hold for Budget Approval):
 *    - Financial Modeling Prep WebSocket API ($79/month)
 *      * WebSocket endpoints: wss://websockets.financialmodelingprep.com
 *      * Real-time stocks, forex, crypto streaming
 *      * Professional-grade market data with low latency
 *    - Alpaca Markets WebSocket Streaming (Institutional)
 *      * WebSocket endpoint: wss://stream.data.alpaca.markets
 *      * Real-time trades, quotes, bars for stocks/crypto/options
 *      * Regulated broker with institutional data quality
 *    - Barchart MarketData API (Enterprise)
 *      * Comprehensive asset class coverage (stocks, futures, forex)
 *      * Note: Pending deprecation - migrating to Openfeed protocol
 * 
 * 2. ENHANCED CACHING SYSTEM (Next Phase):
 *    - Implement Redis-based distributed caching
 *    - Add local SQLite caching for offline functionality
 *    - Add data compression and storage optimization
 *    - Implement cache warming strategies
 *    - Add cache expiration and refresh logic
 * 
 * 3. ALTERNATIVE DATA SOURCES (Premium Features):
 *    - Add earnings calendar integration
 *    - Add options data and volatility surface
 *    - Add insider trading and institutional ownership data
 *    - Add ESG scores and alternative metrics
 * 
 * 4. PERFORMANCE OPTIMIZATION (Production Ready):
 *    - Add request batching and bulk operations
 *    - Implement connection pooling and keep-alive
 *    - Add rate limiting compliance and queue management
 *    - Add parallel data fetching for multiple symbols
 */
export class YahooFinanceAPI {
  private config: TradingAgentsConfig;
  private logger = createLogger('dataflow', 'yahoo-finance');
  private metrics = new DataflowMetricsCollector();

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    
    this.logger.info('constructor', 'Initializing Yahoo Finance API', {
      concurrency: 3,
      timeout: 10000
    });
    
    // Configure global settings for yahoo-finance2
    yahooFinance.setGlobalConfig({
      queue: {
        concurrency: 3, // Limit concurrent requests
        timeout: 10000  // 10 second timeout
      }
    });
  }

  /**
   * Get historical stock data using the official Yahoo Finance library
   */
  async getData(symbol: string, startDate: string, endDate: string, online: boolean = true): Promise<string> {
    this.logger.info('get-data', `Getting data for ${symbol}`, {
      symbol,
      startDate,
      endDate,
      online
    });

    if (online) {
      return this.getDataOnline(symbol, startDate, endDate);
    } else {
      return this.getDataOffline(symbol, startDate, endDate);
    }
  }

  /**
   * Get data using yahoo-finance2 library with resilient patterns
   */
  private async getDataOnline(symbol: string, startDate: string, endDate: string): Promise<string> {
    return withDataflowResilience(
      `yahoo-finance-historical-${symbol}`,
      async () => {
        this.logger.info('get-data-online', `Fetching historical data for ${symbol}`, {
          symbol,
          startDate,
          endDate
        });

        // Use yahoo-finance2 historical endpoint
        const queryOptions = {
          period1: startDate,
          period2: endDate,
          interval: '1d' as const
        };

        const result = await yahooFinance.historical(symbol, queryOptions);

        if (!result || result.length === 0) {
          this.logger.warn('no-data-found', `No historical data found for ${symbol}`, {
            symbol,
            startDate,
            endDate,
            resultLength: 0
          });
          return `No historical data found for ${symbol} between ${startDate} and ${endDate}`;
        }

        this.logger.info('data-fetched', `Historical data fetched successfully for ${symbol}`, {
          symbol,
          recordCount: result.length,
          dateRange: { startDate, endDate }
        });

        // Convert to CSV format with header
        const header = `# Stock data for ${symbol.toUpperCase()} from ${startDate} to ${endDate}\n`;
        const timestamp = `# Data retrieved on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
        let csvData = 'Date,Open,High,Low,Close,Adj Close,Volume\n';
        
        for (const row of result) {
          const date = row.date.toISOString().split('T')[0];
          csvData += `${date},${row.open},${row.high},${row.low},${row.close},${row.adjClose || row.close},${row.volume}\n`;
        }

        return header + timestamp + csvData;
      },
      YAHOO_FINANCE_CONFIG
    ).catch(async (error) => {
      this.logger.error('get-data-online-failed', `Yahoo Finance API failed for ${symbol}`, {
        symbol,
        startDate,
        endDate,
        error: error.message
      });
      
      // Fallback to cached data if API fails
      return this.getDataOffline(symbol, startDate, endDate);
    });
  }

  /**
   * Get quote data for a symbol with resilient patterns
   */
  async getQuote(symbol: string): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-quote-${symbol}`,
      async () => {
        this.logger.info('get-quote', `Fetching quote for ${symbol}`, { symbol });
        const quote = await yahooFinance.quote(symbol);
        this.logger.info('quote-fetched', `Quote fetched successfully for ${symbol}`, {
          symbol,
          hasQuote: !!quote
        });
        return quote;
      },
      YAHOO_FINANCE_CONFIG
    ).catch((error) => {
      this.logger.error('quote-fetch-failed', `Error fetching quote for ${symbol}`, {
        symbol,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get multiple quotes at once with resilient patterns
   */
  async getQuotes(symbols: string[]): Promise<any[]> {
    return withDataflowResilience(
      `yahoo-finance-quotes-${symbols.length}`,
      async () => {
        this.logger.info('get-quotes', `Fetching quotes for ${symbols.length} symbols`, {
          symbols,
          symbolCount: symbols.length
        });
        const quotes = await yahooFinance.quote(symbols);
        const result = Array.isArray(quotes) ? quotes : [quotes];
        this.logger.info('quotes-fetched', `Quotes fetched successfully`, {
          symbols,
          quotesCount: result.length
        });
        return result;
      },
      YAHOO_FINANCE_CONFIG
    ).catch((error) => {
      this.logger.error('quotes-fetch-failed', `Error fetching quotes for ${symbols.join(', ')}`, {
        symbols,
        symbolCount: symbols.length,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get comprehensive quote summary with additional data using resilient patterns
   */
  async getQuoteSummary(symbol: string, modules: string[] = ['price', 'summaryDetail', 'defaultKeyStatistics']): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-quote-summary-${symbol}`,
      async () => {
        this.logger.info('get-quote-summary', `Fetching quote summary for ${symbol}`, {
          symbol,
          modules
        });
        const summary = await yahooFinance.quoteSummary(symbol, {
          modules: modules as any
        });
        this.logger.info('quote-summary-fetched', `Quote summary fetched successfully for ${symbol}`, {
          symbol,
          modules,
          hasSummary: !!summary
        });
        return summary;
      },
      YAHOO_FINANCE_CONFIG
    ).catch((error) => {
      this.logger.error('quote-summary-failed', `Error fetching quote summary for ${symbol}`, {
        symbol,
        modules,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Search for symbols with resilient patterns
   */
  async search(query: string): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-search-${query}`,
      async () => {
        this.logger.info('search', `Searching for symbols with query: ${query}`, { query });
        const results = await yahooFinance.search(query);
        this.logger.info('search-complete', `Search completed for query: ${query}`, {
          query,
          resultsCount: results?.length || 0
        });
        return results;
      },
      YAHOO_FINANCE_CONFIG
    ).catch((error) => {
      this.logger.error('symbol-search-failed', `Error searching for ${query}`, {
        query,
        error: error.message
      });
      throw error;
    });
  }

  /**
   * Get fundamental data time series with resilient patterns
   */
  async getFundamentals(symbol: string, startDate: string): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-fundamentals-${symbol}`,
      async () => {
        const modules = ['defaultKeyStatistics', 'financialData', 'summaryProfile', 'earningsHistory'];
        this.logger.info('get-fundamentals', `Fetching fundamentals for ${symbol}`, {
          symbol,
          startDate,
          modules
        });
        const fundamentals = await yahooFinance.quoteSummary(symbol, { modules });
        this.logger.info('fundamentals-fetched', `Fundamentals fetched successfully for ${symbol}`, {
          symbol,
          startDate,
          modules,
          hasFundamentals: !!fundamentals
        });
        return fundamentals;
      },
      YAHOO_FINANCE_CONFIG
    ).catch((error) => {
      this.logger.error('fundamentals-fetch-failed', `Error fetching fundamentals for ${symbol}`, {
        symbol,
        startDate,
        modules: ['defaultKeyStatistics', 'financialData', 'summaryProfile', 'earningsHistory'],
        error: error.message
      });
      throw error;
    });
  }

  /**
   * TODO: Implement proper historical data caching and fallback system
   * 
   * This method should:
   * - Implement proper local data cache management
   * - Add data validation and integrity checks  
   * - Support multiple data formats (CSV, JSON, Parquet)
   * - Add data compression for storage efficiency
   * - Implement cache expiration and refresh logic
   * - Add backup data source integration
   */
  private async getDataOffline(symbol: string, startDate: string, endDate: string): Promise<string> {
    return withDataflowResilience(
      `yahoo-finance-offline-${symbol}`,
      async () => {
        this.logger.info('get-data-offline', `Reading cached data for ${symbol}`, {
          symbol,
          startDate,
          endDate
        });

        // Try to read from cached CSV files as fallback
        const fs = await import('fs/promises');
        const path = await import('path');

        const filePath = path.join(this.config.dataDir, 'market_data', 'price_data', `${symbol}-YFin-data-2015-01-01-2025-03-25.csv`);
        const data = await fs.readFile(filePath, 'utf-8');
        
        // Parse CSV and filter by date range
        const lines = data.split('\n');
        const headers = lines[0];
        const filteredLines = [headers];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (line && line.trim()) {
            const dateMatch = line.match(/^([^,]+)/);
            if (dateMatch && dateMatch[1]) {
              const rowDate = dateMatch[1].slice(0, 10); // Extract YYYY-MM-DD
              if (rowDate >= startDate && rowDate <= endDate) {
                filteredLines.push(line);
              }
            }
          }
        }

        this.logger.info('cached-data-read', `Cached data read successfully for ${symbol}`, {
          symbol,
          startDate,
          endDate,
          recordsFound: filteredLines.length - 1,
          filePath
        });

        return `## Raw Market Data for ${symbol} from ${startDate} to ${endDate}:\n\n` + filteredLines.join('\n');
      },
      { maxRetries: 1, retryDelay: 500, timeout: 5000 }
    ).catch((error) => {
      this.logger.error('cached-data-read-failed', `Error reading cached data for ${symbol}`, {
        symbol,
        startDate,
        endDate,
        error: error.message
      });
      
      // TODO: Replace with proper error handling
      throw new Error(`Historical data not available for ${symbol}. Need to implement data caching and backup providers.`);
    });
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
    this.logger.info('metrics-reset', 'Yahoo Finance API metrics reset');
  }
}