/**
 * Cached Reddit API wrapper
 * Extends the original RedditAPI with intelligent caching
 */

import { RedditAPI } from './reddit';
import { globalCache, createApiCacheKey, CacheTTL } from '../performance/intelligent-cache';
import { TradingAgentsConfig } from '@/types/config';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('dataflow', 'cached-reddit');

export class CachedRedditAPI extends RedditAPI {
  private cacheEnabled: boolean;

  constructor(config: TradingAgentsConfig, enableCache: boolean = true) {
    super(config);
    this.cacheEnabled = enableCache;
    
    logger.info('constructor', 'Cached Reddit API initialized', {
      cacheEnabled: this.cacheEnabled
    });
  }

  /**
   * Get global news with caching
   */
  async getGlobalNews(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getGlobalNews(startDate, lookBackDays, maxLimitPerDay);
    }

    const cacheKey = createApiCacheKey('reddit', 'getGlobalNews', {
      startDate,
      lookBackDays,
      maxLimitPerDay
    });

    return globalCache.get(cacheKey, async () => {
      logger.debug('getGlobalNews', 'Cache miss - fetching from Reddit API', {
        startDate,
        lookBackDays,
        maxLimitPerDay
      });

      const startTime = Date.now();
      const result = await super.getGlobalNews(startDate, lookBackDays, maxLimitPerDay);
      const duration = Date.now() - startTime;

      logger.info('getGlobalNews', 'Global news fetched from Reddit', {
        startDate,
        lookBackDays,
        maxLimitPerDay,
        duration,
        resultLength: result.length
      });

      return result;
    }, CacheTTL.NEWS);
  }

  /**
   * Get company news with caching
   */
  async getCompanyNews(ticker: string, startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getCompanyNews(ticker, startDate, lookBackDays, maxLimitPerDay);
    }

    const cacheKey = createApiCacheKey('reddit', 'getCompanyNews', {
      ticker: ticker.toUpperCase(),
      startDate,
      lookBackDays,
      maxLimitPerDay
    });

    return globalCache.get(cacheKey, async () => {
      logger.debug('getCompanyNews', 'Cache miss - fetching from Reddit API', {
        ticker,
        startDate,
        lookBackDays,
        maxLimitPerDay
      });

      const startTime = Date.now();
      const result = await super.getCompanyNews(ticker, startDate, lookBackDays, maxLimitPerDay);
      const duration = Date.now() - startTime;

      logger.info('getCompanyNews', 'Company news fetched from Reddit', {
        ticker,
        startDate,
        lookBackDays,
        maxLimitPerDay,
        duration,
        resultLength: result.length
      });

      return result;
    }, CacheTTL.SENTIMENT_DATA);
  }

  /**
   * Pre-warm cache with social sentiment data
   */
  async preWarmSocialData(
    tickers: string[], 
    startDate: string, 
    lookBackDays: number, 
    maxLimitPerDay: number
  ): Promise<void> {
    const entries = [];

    // Global news
    entries.push({
      key: createApiCacheKey('reddit', 'getGlobalNews', {
        startDate,
        lookBackDays,
        maxLimitPerDay
      }),
      factory: () => super.getGlobalNews(startDate, lookBackDays, maxLimitPerDay),
      ttlMinutes: CacheTTL.NEWS
    });

    // Company-specific news
    for (const ticker of tickers) {
      entries.push({
        key: createApiCacheKey('reddit', 'getCompanyNews', {
          ticker: ticker.toUpperCase(),
          startDate,
          lookBackDays,
          maxLimitPerDay
        }),
        factory: () => super.getCompanyNews(ticker, startDate, lookBackDays, maxLimitPerDay),
        ttlMinutes: CacheTTL.SENTIMENT_DATA
      });
    }

    await globalCache.preWarm(entries);
    
    logger.info('preWarmSocialData', 'Social data pre-warming completed', {
      tickers,
      startDate,
      lookBackDays,
      maxLimitPerDay,
      entriesCount: entries.length
    });
  }

  /**
   * Invalidate cache for specific ticker
   */
  invalidateTickerCache(ticker: string): void {
    const pattern = `reddit:.*"ticker":"${ticker.toUpperCase()}"`;
    const invalidated = globalCache.invalidatePattern(pattern);
    
    logger.info('invalidateTickerCache', 'Ticker cache invalidated', {
      ticker,
      invalidated
    });
  }

  /**
   * Invalidate global news cache
   */
  invalidateGlobalNewsCache(): void {
    const pattern = `reddit:getglobalnews:.*`;
    const invalidated = globalCache.invalidatePattern(pattern);
    
    logger.info('invalidateGlobalNewsCache', 'Global news cache invalidated', {
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
    logger.info('disableCache', 'Caching disabled for Reddit API');
  }

  /**
   * Enable caching for this instance
   */
  enableCache(): void {
    this.cacheEnabled = true;
    logger.info('enableCache', 'Caching enabled for Reddit API');
  }
}