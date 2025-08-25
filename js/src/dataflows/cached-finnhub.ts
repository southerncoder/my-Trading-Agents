/**
 * Cached Finnhub API wrapper
 * Extends the original FinnhubAPI with intelligent caching
 */

import { FinnhubAPI } from './finnhub';
import { globalCache, createApiCacheKey, CacheTTL } from '../performance/intelligent-cache';
import { TradingAgentsConfig } from '@/types/config';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('dataflow', 'cached-finnhub');

export class CachedFinnhubAPI extends FinnhubAPI {
  private cacheEnabled: boolean;

  constructor(config: TradingAgentsConfig, enableCache: boolean = true) {
    super(config);
    this.cacheEnabled = enableCache;
    
    logger.info('constructor', 'Cached Finnhub API initialized', {
      cacheEnabled: this.cacheEnabled
    });
  }

  /**
   * Get news with caching
   */
  async getNews(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getNews(ticker, currDate, lookBackDays);
    }

    const cacheKey = createApiCacheKey('finnhub', 'getNews', {
      ticker: ticker.toUpperCase(),
      currDate,
      lookBackDays
    });

    return globalCache.get(cacheKey, async () => {
      logger.debug('getNews', 'Cache miss - fetching from Finnhub API', {
        ticker,
        currDate,
        lookBackDays
      });

      const startTime = Date.now();
      const result = await super.getNews(ticker, currDate, lookBackDays);
      const duration = Date.now() - startTime;

      logger.info('getNews', 'News fetched from Finnhub', {
        ticker,
        currDate,
        lookBackDays,
        duration,
        resultLength: result.length
      });

      return result;
    }, CacheTTL.NEWS);
  }

  /**
   * Get insider sentiment with caching
   */
  async getInsiderSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getInsiderSentiment(ticker, currDate, lookBackDays);
    }

    const cacheKey = createApiCacheKey('finnhub', 'getInsiderSentiment', {
      ticker: ticker.toUpperCase(),
      currDate,
      lookBackDays
    });

    return globalCache.get(cacheKey, async () => {
      logger.debug('getInsiderSentiment', 'Cache miss - fetching from Finnhub API', {
        ticker,
        currDate,
        lookBackDays
      });

      const startTime = Date.now();
      const result = await super.getInsiderSentiment(ticker, currDate, lookBackDays);
      const duration = Date.now() - startTime;

      logger.info('getInsiderSentiment', 'Insider sentiment fetched from Finnhub', {
        ticker,
        currDate,
        lookBackDays,
        duration,
        resultLength: result.length
      });

      return result;
    }, CacheTTL.SENTIMENT_DATA);
  }

  /**
   * Get insider transactions with caching
   */
  async getInsiderTransactions(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getInsiderTransactions(ticker, currDate, lookBackDays);
    }

    const cacheKey = createApiCacheKey('finnhub', 'getInsiderTransactions', {
      ticker: ticker.toUpperCase(),
      currDate,
      lookBackDays
    });

    return globalCache.get(cacheKey, async () => {
      logger.debug('getInsiderTransactions', 'Cache miss - fetching from Finnhub API', {
        ticker,
        currDate,
        lookBackDays
      });

      const startTime = Date.now();
      const result = await super.getInsiderTransactions(ticker, currDate, lookBackDays);
      const duration = Date.now() - startTime;

      logger.info('getInsiderTransactions', 'Insider transactions fetched from Finnhub', {
        ticker,
        currDate,
        lookBackDays,
        duration,
        resultLength: result.length
      });

      return result;
    }, CacheTTL.FUNDAMENTAL_DATA);
  }

  /**
   * Pre-warm cache with common financial data
   */
  async preWarmFinancialData(
    tickers: string[], 
    currDate: string, 
    lookBackDays: number
  ): Promise<void> {
    const entries = [];

    for (const ticker of tickers) {
      // News
      entries.push({
        key: createApiCacheKey('finnhub', 'getNews', {
          ticker: ticker.toUpperCase(),
          currDate,
          lookBackDays
        }),
        factory: () => super.getNews(ticker, currDate, lookBackDays),
        ttlMinutes: CacheTTL.NEWS
      });

      // Insider sentiment
      entries.push({
        key: createApiCacheKey('finnhub', 'getInsiderSentiment', {
          ticker: ticker.toUpperCase(),
          currDate,
          lookBackDays
        }),
        factory: () => super.getInsiderSentiment(ticker, currDate, lookBackDays),
        ttlMinutes: CacheTTL.SENTIMENT_DATA
      });

      // Insider transactions
      entries.push({
        key: createApiCacheKey('finnhub', 'getInsiderTransactions', {
          ticker: ticker.toUpperCase(),
          currDate,
          lookBackDays
        }),
        factory: () => super.getInsiderTransactions(ticker, currDate, lookBackDays),
        ttlMinutes: CacheTTL.FUNDAMENTAL_DATA
      });
    }

    await globalCache.preWarm(entries);
    
    logger.info('preWarmFinancialData', 'Financial data pre-warming completed', {
      tickers,
      currDate,
      lookBackDays,
      entriesCount: entries.length
    });
  }

  /**
   * Invalidate cache for specific ticker
   */
  invalidateTickerCache(ticker: string): void {
    const pattern = `finnhub:.*"ticker":"${ticker.toUpperCase()}"`;
    const invalidated = globalCache.invalidatePattern(pattern);
    
    logger.info('invalidateTickerCache', 'Ticker cache invalidated', {
      ticker,
      invalidated
    });
  }

  /**
   * Get cache statistics for this API
   */
  getCacheStats() {
    return globalCache.getStats();
  }

  /**
   * Disable caching for this instance
   */
  disableCache(): void {
    this.cacheEnabled = false;
    logger.info('disableCache', 'Caching disabled for Finnhub API');
  }

  /**
   * Enable caching for this instance
   */
  enableCache(): void {
    this.cacheEnabled = true;
    logger.info('enableCache', 'Caching enabled for Finnhub API');
  }
}