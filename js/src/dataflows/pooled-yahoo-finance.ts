/**
 * Connection Pooled Yahoo Finance API
 * 
 * Enhanced version of Yahoo Finance API that uses connection pooling
 * for improved performance and reduced connection overhead.
 */

import { TradingAgentsConfig } from '../types/config';
import { 
  globalConnectionPool, 
  PooledHttpClient, 
  DefaultPoolConfigs,
  PooledClientConfig 
} from '../performance/connection-pooling';
import { createLogger } from '../utils/enhanced-logger';

export class PooledYahooFinanceAPI {
  private readonly logger = createLogger('dataflow', 'PooledYahooFinanceAPI');
  private client: PooledHttpClient;
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    
    const clientConfig: PooledClientConfig = {
      baseURL: 'https://query1.finance.yahoo.com',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      concurrentLimit: 10,
      poolConfig: DefaultPoolConfigs.yahoo,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    this.client = globalConnectionPool.getClient('yahoo-finance', clientConfig);
    
    this.logger.info('constructor', 'Pooled Yahoo Finance API initialized', {
      baseURL: clientConfig.baseURL,
      concurrentLimit: clientConfig.concurrentLimit
    });
  }

  /**
   * Get Yahoo Finance data for a symbol with connection pooling
   */
  async getData(symbol: string, startDate: string, endDate: string, online: boolean = true): Promise<string> {
    if (online) {
      return this.getDataOnline(symbol, startDate, endDate);
    } else {
      return this.getDataOffline(symbol, startDate, endDate);
    }
  }

  /**
   * Get data from Yahoo Finance API using pooled connections
   */
  private async getDataOnline(symbol: string, startDate: string, endDate: string): Promise<string> {
    try {
      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const url = `/v8/finance/chart/${symbol}`;
      const params = {
        period1: startTimestamp.toString(),
        period2: endTimestamp.toString(),
        interval: '1d',
        includePrePost: 'true',
        events: 'div%2Csplit'
      };

      this.logger.info('getDataOnline', 'Fetching Yahoo Finance data', {
        symbol,
        startDate,
        endDate,
        url
      });

      const response = await this.client.request({
        method: 'GET',
        url,
        params,
        timeout: 25000
      });

      if (response.data && response.data.chart && response.data.chart.result) {
        const result = response.data.chart.result[0];
        
        if (!result.timestamp || !result.indicators.quote[0]) {
          return `No data available for ${symbol} in the specified date range.`;
        }

        // Format the response data
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        const formattedData = [];

        for (let i = 0; i < timestamps.length; i++) {
          const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          formattedData.push({
            date,
            open: quote.open[i]?.toFixed(2) || 'N/A',
            high: quote.high[i]?.toFixed(2) || 'N/A',
            low: quote.low[i]?.toFixed(2) || 'N/A',
            close: quote.close[i]?.toFixed(2) || 'N/A',
            volume: quote.volume[i] || 0
          });
        }

        this.logger.info('getDataOnline', 'Yahoo Finance data retrieved successfully', {
          symbol,
          recordCount: formattedData.length
        });

        return JSON.stringify({
          symbol,
          period: `${startDate} to ${endDate}`,
          data: formattedData
        }, null, 2);

      } else {
        return `No data found for symbol ${symbol}`;
      }

    } catch (error) {
      this.logger.error('getDataOnline', 'Failed to fetch Yahoo Finance data', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get offline data (fallback when online is disabled)
   */
  private async getDataOffline(symbol: string, startDate: string, endDate: string): Promise<string> {
    this.logger.info('getDataOffline', 'Offline mode requested but no cached data available', {
      symbol,
      startDate,
      endDate
    });

    // No offline data available - return informative error
    throw new Error(`Offline mode not supported. Yahoo Finance data for ${symbol} is not available. Please enable online mode or ensure the Yahoo Finance service is running.`);
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return this.client.getStats();
  }

  /**
   * Dispose the client
   */
  dispose(): void {
    this.client.dispose();
    this.logger.info('dispose', 'Pooled Yahoo Finance API disposed');
  }
}