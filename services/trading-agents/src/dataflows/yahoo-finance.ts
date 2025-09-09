import { TradingAgentsConfig } from '@/types/config';
import axios from 'axios';
import { createLogger } from '../utils/enhanced-logger.js';
import {
  withDataflowResilience,
  YAHOO_FINANCE_CONFIG,
  DataflowMetricsCollector
} from '../utils/resilient-dataflow.js';

/**
 * Yahoo Finance API wrapper using dedicated Yahoo Finance service
 * Enhanced with resilient patterns for robust external API integration
 *
 * FREE PROVIDER: Yahoo Finance Service (Dedicated microservice)
 *
 * This service now uses the dedicated yahoo-finance-service Docker container
 * which provides better isolation, scalability, and error handling.
 */
export class YahooFinanceAPI {
  private config: TradingAgentsConfig;
  private logger = createLogger('dataflow', 'yahoo-finance');
  private metrics = new DataflowMetricsCollector();
  private serviceUrl: string;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.serviceUrl = process.env.YAHOO_FINANCE_URL || 'http://localhost:3002';

    this.logger.info('constructor', 'Initializing Yahoo Finance API', {
      serviceUrl: this.serviceUrl
    });
  }

  /**
   * Get historical stock data using the dedicated Yahoo Finance service
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
   * Get data using the dedicated Yahoo Finance service
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

        const response = await axios.get(`${this.serviceUrl}/api/historical/${symbol}`, {
          params: { startDate, endDate },
          timeout: 30000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('data-fetched', `Historical data fetched successfully for ${symbol}`, {
          symbol,
          responseSize: response.data.length
        });

        return response.data;
      },
      YAHOO_FINANCE_CONFIG
    ).catch(async (error) => {
      this.logger.error('get-data-online-failed', `Yahoo Finance service failed for ${symbol}`, {
        symbol,
        startDate,
        endDate,
        error: error.message
      });

      // Fallback to cached data if service fails
      return this.getDataOffline(symbol, startDate, endDate);
    });
  }

  /**
   * Get quote data for a symbol using the dedicated service
   */
  async getQuote(symbol: string): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-quote-${symbol}`,
      async () => {
        this.logger.info('get-quote', `Fetching quote for ${symbol}`, { symbol });

        const response = await axios.get(`${this.serviceUrl}/api/quote/${symbol}`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('quote-fetched', `Quote fetched successfully for ${symbol}`, {
          symbol
        });

        return response.data.data;
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
   * Get multiple quotes at once using the dedicated service
   */
  async getQuotes(symbols: string[]): Promise<any[]> {
    return withDataflowResilience(
      `yahoo-finance-quotes-${symbols.length}`,
      async () => {
        this.logger.info('get-quotes', `Fetching quotes for ${symbols.length} symbols`, {
          symbols,
          symbolCount: symbols.length
        });

        const response = await axios.post(`${this.serviceUrl}/api/quotes`, {
          symbols
        }, {
          timeout: 15000,
          headers: {
            'User-Agent': 'TradingAgents/1.0',
            'Content-Type': 'application/json'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('quotes-fetched', `Quotes fetched successfully`, {
          symbols,
          quotesCount: response.data.data.length
        });

        return response.data.data;
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
   * Get comprehensive quote summary using the dedicated service
   */
  async getQuoteSummary(symbol: string, modules: string[] = ['price', 'summaryDetail', 'defaultKeyStatistics']): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-quote-summary-${symbol}`,
      async () => {
        this.logger.info('get-quote-summary', `Fetching quote summary for ${symbol}`, {
          symbol,
          modules
        });

        const response = await axios.get(`${this.serviceUrl}/api/quote-summary/${symbol}`, {
          params: { modules: modules.join(',') },
          timeout: 15000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('quote-summary-fetched', `Quote summary fetched successfully for ${symbol}`, {
          symbol,
          modules
        });

        return response.data.data;
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
   * Search for symbols using the dedicated service
   */
  async search(query: string): Promise<any> {
    return withDataflowResilience(
      `yahoo-finance-search-${query}`,
      async () => {
        this.logger.info('search', `Searching for symbols with query: ${query}`, { query });

        const response = await axios.get(`${this.serviceUrl}/api/search`, {
          params: { q: query },
          timeout: 10000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('search-complete', `Search completed for query: ${query}`, {
          query,
          resultsCount: response.data.data?.length || 0
        });

        return response.data.data;
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
   * Get fundamental data using the dedicated service
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

        const response = await axios.get(`${this.serviceUrl}/api/quote-summary/${symbol}`, {
          params: { modules: modules.join(',') },
          timeout: 15000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Yahoo Finance service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('fundamentals-fetched', `Fundamentals fetched successfully for ${symbol}`, {
          symbol,
          startDate,
          modules
        });

        return response.data.data;
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
   * Get data from offline cache as fallback
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

      throw new Error(`Historical data not available for ${symbol}. Yahoo Finance service unavailable and no cached data found.`);
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