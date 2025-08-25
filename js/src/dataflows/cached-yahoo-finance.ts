/**
 * Cached Yahoo Finance API wrapper
 * Extends the original YahooFinanceAPI with intelligent caching
 */

import { YahooFinanceAPI } from './yahoo-finance';
import { globalCache, createApiCacheKey, CacheTTL } from '../performance/intelligent-cache';
import { TradingAgentsConfig } from '@/types/config';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('dataflow', 'cached-yahoo-finance');

export class CachedYahooFinanceAPI extends YahooFinanceAPI {
  private cacheEnabled: boolean;

  constructor(config: TradingAgentsConfig, enableCache: boolean = true) {
    super(config);
    this.cacheEnabled = enableCache;
    
    logger.info('constructor', 'Cached Yahoo Finance API initialized', {
      cacheEnabled: this.cacheEnabled
    });
  }

  /**
   * Get Yahoo Finance data with caching
   */
  async getData(symbol: string, startDate: string, endDate: string, online: boolean = true): Promise<string> {
    if (!this.cacheEnabled) {
      return super.getData(symbol, startDate, endDate, online);
    }

    const cacheKey = createApiCacheKey('yahoo-finance', 'getData', {
      symbol: symbol.toUpperCase(),
      startDate,
      endDate,
      online
    });

    const ttl = online ? CacheTTL.MARKET_DATA : CacheTTL.FUNDAMENTAL_DATA;

    return globalCache.get(cacheKey, async () => {
      logger.debug('getData', 'Cache miss - fetching from API', {
        symbol,
        startDate,
        endDate,
        online,
        ttl
      });

      const startTime = Date.now();
      const result = await super.getData(symbol, startDate, endDate, online);
      const duration = Date.now() - startTime;

      logger.info('getData', 'Data fetched from Yahoo Finance', {
        symbol,
        startDate,
        endDate,
        online,
        duration,
        resultLength: result.length
      });

      return result;
    }, ttl);
  }

  /**
   * Pre-warm cache with market data for multiple symbols
   */
  async preWarmMarketData(symbols: string[], startDate: string, endDate: string): Promise<void> {
    const entries = symbols.map(symbol => ({
      key: createApiCacheKey('yahoo-finance', 'getData', {
        symbol: symbol.toUpperCase(),
        startDate,
        endDate,
        online: true
      }),
      factory: () => super.getData(symbol, startDate, endDate, true),
      ttlMinutes: CacheTTL.MARKET_DATA
    }));

    await globalCache.preWarm(entries);
    
    logger.info('preWarmMarketData', 'Market data pre-warming completed', {
      symbols,
      startDate,
      endDate,
      count: symbols.length
    });
  }

  /**
   * Invalidate cache for specific symbol
   */
  invalidateSymbolCache(symbol: string): void {
    const pattern = `yahoo-finance:getdata:.*"symbol":"${symbol.toUpperCase()}"`;
    const invalidated = globalCache.invalidatePattern(pattern);
    
    logger.info('invalidateSymbolCache', 'Symbol cache invalidated', {
      symbol,
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
    logger.info('disableCache', 'Caching disabled for Yahoo Finance API');
  }

  /**
   * Enable caching for this instance
   */
  enableCache(): void {
    this.cacheEnabled = true;
    logger.info('enableCache', 'Caching enabled for Yahoo Finance API');
  }
}