/**
 * Cached Dataflows Export Module
 * Provides cached versions of all data APIs with intelligent caching
 */

export * from './cached-yahoo-finance';
export * from './cached-finnhub';
export * from './cached-reddit';

// Re-export original APIs for backward compatibility
export * from './yahoo-finance';
export * from './alpha-vantage';
export * from './marketstack';
export * from './unified-market-data';
export * from './finnhub';
export * from './reddit';
export * from './google-news';
export * from './enhanced-dataflows';

// Export cache utilities
export { globalCache, CacheTTL } from '../performance/intelligent-cache';

import { CachedYahooFinanceAPI } from './cached-yahoo-finance';
import { CachedFinnhubAPI } from './cached-finnhub';
import { CachedRedditAPI } from './cached-reddit';
import { GoogleNewsAPI } from './google-news';
import { UnifiedMarketDataProvider } from './unified-market-data';
import { TradingAgentsConfig } from '@/types/config';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('dataflow', 'cached-dataflows');

/**
 * Cached dataflows factory for creating API instances with caching enabled
 */
export class CachedDataflowsFactory {
  private config: TradingAgentsConfig;
  private cacheEnabled: boolean;

  constructor(config: TradingAgentsConfig, enableCache: boolean = true) {
    this.config = config;
    this.cacheEnabled = enableCache;
    
    logger.info('constructor', 'Cached dataflows factory initialized', {
      cacheEnabled: this.cacheEnabled
    });
  }

  /**
   * Create cached Yahoo Finance API instance
   */
  createYahooFinanceAPI(): CachedYahooFinanceAPI {
    return new CachedYahooFinanceAPI(this.config, this.cacheEnabled);
  }

  /**
   * Create unified market data provider (primary recommendation)
   * Combines Yahoo Finance + Alpha Vantage with automatic failover
   */
  createUnifiedMarketDataProvider(): UnifiedMarketDataProvider {
    logger.info('createUnifiedMarketDataProvider', 'Creating unified market data provider', {
      primaryProvider: 'Yahoo Finance',
      backupProvider: 'Alpha Vantage'
    });
    return new UnifiedMarketDataProvider(this.config);
  }

  /**
   * Create cached Finnhub API instance
   */
  createFinnhubAPI(): CachedFinnhubAPI {
    return new CachedFinnhubAPI(this.config, this.cacheEnabled);
  }

  /**
   * Create cached Reddit API instance
   */
  createRedditAPI(): CachedRedditAPI {
    return new CachedRedditAPI(this.config, this.cacheEnabled);
  }

  /**
   * Create Google News API instance (not cached yet)
   */
  createGoogleNewsAPI(): GoogleNewsAPI {
    return new GoogleNewsAPI(this.config);
  }

  /**
   * Pre-warm all caches with common data
   */
  async preWarmAllCaches(
    symbols: string[], 
    startDate: string, 
    endDate: string, 
    lookBackDays: number = 7
  ): Promise<void> {
    logger.info('preWarmAllCaches', 'Starting cache pre-warming for all APIs', {
      symbols,
      startDate,
      endDate,
      lookBackDays
    });

    const promises = [];

    // Yahoo Finance market data
    const yahooApi = this.createYahooFinanceAPI();
    promises.push(yahooApi.preWarmMarketData(symbols, startDate, endDate));

    // Finnhub financial data
    const finnhubApi = this.createFinnhubAPI();
    promises.push(finnhubApi.preWarmFinancialData(symbols, endDate, lookBackDays));

    // Reddit social data
    const redditApi = this.createRedditAPI();
    promises.push(redditApi.preWarmSocialData(symbols, endDate, lookBackDays, 10));

    await Promise.allSettled(promises);
    
    logger.info('preWarmAllCaches', 'Cache pre-warming completed for all APIs', {
      symbols,
      apiCount: 3
    });
  }

  /**
   * Get combined cache statistics
   */
  getAllCacheStats() {
    const stats = {
      yahoo: this.createYahooFinanceAPI().getCacheStats(),
      finnhub: this.createFinnhubAPI().getCacheStats(),
      reddit: this.createRedditAPI().getCacheStats()
    };

    return {
      ...stats,
      combined: {
        totalHits: stats.yahoo.hits + stats.finnhub.hits + stats.reddit.hits,
        totalMisses: stats.yahoo.misses + stats.finnhub.misses + stats.reddit.misses,
        overallHitRate: this.calculateOverallHitRate(stats),
        totalMemoryMB: stats.yahoo.memoryUsageMB + stats.finnhub.memoryUsageMB + stats.reddit.memoryUsageMB
      }
    };
  }

  /**
   * Invalidate all caches for a specific symbol
   */
  invalidateSymbol(symbol: string): void {
    const yahooApi = this.createYahooFinanceAPI();
    const finnhubApi = this.createFinnhubAPI();
    const redditApi = this.createRedditAPI();

    yahooApi.invalidateSymbolCache(symbol);
    finnhubApi.invalidateTickerCache(symbol);
    redditApi.invalidateTickerCache(symbol);

    logger.info('invalidateSymbol', 'Symbol cache invalidated across all APIs', {
      symbol
    });
  }

  /**
   * Enable caching for all APIs
   */
  enableCache(): void {
    this.cacheEnabled = true;
    logger.info('enableCache', 'Caching enabled for all APIs');
  }

  /**
   * Disable caching for all APIs
   */
  disableCache(): void {
    this.cacheEnabled = false;
    logger.info('disableCache', 'Caching disabled for all APIs');
  }

  private calculateOverallHitRate(stats: any): number {
    const totalRequests = stats.yahoo.hits + stats.yahoo.misses + 
                         stats.finnhub.hits + stats.finnhub.misses + 
                         stats.reddit.hits + stats.reddit.misses;
    
    const totalHits = stats.yahoo.hits + stats.finnhub.hits + stats.reddit.hits;
    
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }
}