/**
 * Connection Pooled Finnhub API
 * 
 * Enhanced version of Finnhub API that uses connection pooling
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

export class PooledFinnhubAPI {
  private readonly logger = createLogger('dataflow', 'PooledFinnhubAPI');
  private client: PooledHttpClient;
  private config: TradingAgentsConfig;
  private apiKey: string;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.apiKey = process.env.FINNHUB_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Finnhub API key is required. Set FINNHUB_API_KEY environment variable.');
    }

    const clientConfig: PooledClientConfig = {
      baseURL: 'https://finnhub.io/api/v1',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      concurrentLimit: 5, // Finnhub has stricter rate limits
      poolConfig: DefaultPoolConfigs.finnhub,
      headers: {
        'X-Finnhub-Token': this.apiKey,
        'Accept': 'application/json',
        'User-Agent': 'TradingAgents/1.0'
      }
    };

    this.client = globalConnectionPool.getClient('finnhub', clientConfig);
    
    this.logger.info('constructor', 'Pooled Finnhub API initialized', {
      baseURL: clientConfig.baseURL,
      concurrentLimit: clientConfig.concurrentLimit
    });
  }

  /**
   * Get company profile data using pooled connections
   */
  async getCompanyProfile(symbol: string): Promise<string> {
    try {
      this.logger.info('getCompanyProfile', 'Fetching company profile', { symbol });

      const response = await this.client.request({
        method: 'GET',
        url: '/stock/profile2',
        params: { symbol },
        timeout: 25000
      });

      if (response.data && Object.keys(response.data).length > 0) {
        this.logger.info('getCompanyProfile', 'Company profile retrieved successfully', {
          symbol,
          company: response.data.name
        });

        return JSON.stringify({
          symbol,
          profile: response.data,
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No company profile data found for symbol ${symbol}`;
      }

    } catch (error) {
      this.logger.error('getCompanyProfile', 'Failed to fetch company profile', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching company profile for ${symbol}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get basic financials using pooled connections
   */
  async getBasicFinancials(symbol: string): Promise<string> {
    try {
      this.logger.info('getBasicFinancials', 'Fetching basic financials', { symbol });

      const response = await this.client.request({
        method: 'GET',
        url: '/stock/metric',
        params: { symbol, metric: 'all' },
        timeout: 25000
      });

      if (response.data && response.data.metric) {
        this.logger.info('getBasicFinancials', 'Basic financials retrieved successfully', {
          symbol,
          metricsCount: Object.keys(response.data.metric).length
        });

        return JSON.stringify({
          symbol,
          financials: response.data,
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No financial data found for symbol ${symbol}`;
      }

    } catch (error) {
      this.logger.error('getBasicFinancials', 'Failed to fetch basic financials', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching financials for ${symbol}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get market news using pooled connections
   */
  async getMarketNews(category: string = 'general', count: number = 10): Promise<string> {
    try {
      this.logger.info('getMarketNews', 'Fetching market news', { category, count });

      const response = await this.client.request({
        method: 'GET',
        url: '/news',
        params: { 
          category,
          minId: 0
        },
        timeout: 25000
      });

      if (response.data && Array.isArray(response.data)) {
        const limitedNews = response.data.slice(0, count);
        
        this.logger.info('getMarketNews', 'Market news retrieved successfully', {
          category,
          newsCount: limitedNews.length
        });

        return JSON.stringify({
          category,
          count: limitedNews.length,
          news: limitedNews.map(item => ({
            headline: item.headline,
            summary: item.summary,
            source: item.source,
            url: item.url,
            datetime: new Date(item.datetime * 1000).toISOString()
          })),
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No news found for category ${category}`;
      }

    } catch (error) {
      this.logger.error('getMarketNews', 'Failed to fetch market news', {
        category,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching news for category ${category}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get company news using pooled connections
   */
  async getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<string> {
    try {
      this.logger.info('getCompanyNews', 'Fetching company news', { 
        symbol, 
        fromDate, 
        toDate 
      });

      const response = await this.client.request({
        method: 'GET',
        url: '/company-news',
        params: { 
          symbol,
          from: fromDate,
          to: toDate
        },
        timeout: 25000
      });

      if (response.data && Array.isArray(response.data)) {
        this.logger.info('getCompanyNews', 'Company news retrieved successfully', {
          symbol,
          newsCount: response.data.length
        });

        return JSON.stringify({
          symbol,
          period: `${fromDate} to ${toDate}`,
          count: response.data.length,
          news: response.data.map(item => ({
            headline: item.headline,
            summary: item.summary,
            source: item.source,
            url: item.url,
            datetime: new Date(item.datetime * 1000).toISOString()
          })),
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No company news found for ${symbol}`;
      }

    } catch (error) {
      this.logger.error('getCompanyNews', 'Failed to fetch company news', {
        symbol,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching company news for ${symbol}: ${error instanceof Error ? error.message : String(error)}`;
    }
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
    this.logger.info('dispose', 'Pooled Finnhub API disposed');
  }
}