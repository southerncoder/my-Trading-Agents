import winston from 'winston';
import NodeCache from 'node-cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'news-manager' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

/**
 * News Manager Layer
 * Provides abstraction, caching, and intelligent provider selection
 * Sits between resilience layer and service layer
 */
class NewsManager {
  constructor(newsService, options = {}) {
    this.newsService = newsService;
    
    // Configuration
    this.options = {
      cacheTTL: options.cacheTTL || 300, // 5 minutes default
      enableCaching: options.enableCaching !== false,
      providerPriority: options.providerPriority || [
        'tavily',
        'brave-news',
        'serp-api',
        'newsapi',
        'google-news',
      ],
      maxRetries: options.maxRetries || 3,
      ...options,
    };

    // Initialize cache
    this.cache = new NodeCache({ 
      stdTTL: this.options.cacheTTL,
      checkperiod: 60,
    });

    // Provider health tracking
    this.providerHealth = new Map();
    
    logger.info('News Manager initialized', {
      cacheTTL: this.options.cacheTTL,
      enableCaching: this.options.enableCaching,
      providerPriority: this.options.providerPriority,
    });
  }

  /**
   * Search for news with intelligent provider selection
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchNews(searchParams) {
    const startTime = Date.now();
    const { query } = searchParams;

    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey('search', searchParams);
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Cache hit for news search', {
            query,
            cacheKey,
          });

          return {
            ...cachedResult,
            cached: true,
            responseTime: Date.now() - startTime,
          };
        }
      }

      // Get available providers in priority order
      const availableProviders = this.getHealthyProviders();

      if (availableProviders.length === 0) {
        throw new Error('No healthy news providers available');
      }

      // Try providers in order until success
      let lastError;
      for (const providerName of availableProviders) {
        try {
          logger.debug('Attempting search with provider', {
            provider: providerName,
            query,
          });

          const result = await this.newsService.searchWithProvider(
            providerName,
            searchParams,
          );

          // Cache successful result
          if (this.options.enableCaching) {
            const cacheKey = this.generateCacheKey('search', searchParams);
            this.cache.set(cacheKey, result.data);
          }

          // Update provider health to healthy
          this.updateProviderHealth(providerName, true);

          const duration = Date.now() - startTime;

          logger.info('News search completed successfully', {
            provider: providerName,
            query,
            resultsCount: result.data.articles?.length || 0,
            duration,
          });

          return {
            ...result.data,
            provider: providerName,
            cached: false,
            responseTime: duration,
          };

        } catch (error) {
          lastError = error;
          
          logger.warn('Provider failed for news search', {
            provider: providerName,
            query,
            error: error.message,
          });

          // Update provider health to unhealthy
          this.updateProviderHealth(providerName, false);
        }
      }

      // All providers failed
      throw new Error(`All news providers failed. Last error: ${lastError.message}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('News search failed', {
        query,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get top headlines with intelligent provider selection
   * @param {Object} params - Headline parameters
   * @returns {Promise<Object>} Headlines results
   */
  async getTopHeadlines(params = {}) {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey('headlines', params);
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
          logger.debug('Cache hit for headlines', {
            category: params.category,
            cacheKey,
          });

          return {
            ...cachedResult,
            cached: true,
            responseTime: Date.now() - startTime,
          };
        }
      }

      // Get available providers
      const availableProviders = this.getHealthyProviders();

      if (availableProviders.length === 0) {
        throw new Error('No healthy news providers available');
      }

      // Try providers in order
      let lastError;
      for (const providerName of availableProviders) {
        try {
          logger.debug('Attempting headlines with provider', {
            provider: providerName,
            category: params.category,
          });

          const result = await this.newsService.getHeadlinesWithProvider(
            providerName,
            params,
          );

          // Cache successful result
          if (this.options.enableCaching) {
            const cacheKey = this.generateCacheKey('headlines', params);
            this.cache.set(cacheKey, result.data);
          }

          // Update provider health
          this.updateProviderHealth(providerName, true);

          const duration = Date.now() - startTime;

          logger.info('Headlines completed successfully', {
            provider: providerName,
            category: params.category,
            resultsCount: result.data.articles?.length || 0,
            duration,
          });

          return {
            ...result.data,
            provider: providerName,
            cached: false,
            responseTime: duration,
          };

        } catch (error) {
          lastError = error;
          
          logger.warn('Provider failed for headlines', {
            provider: providerName,
            category: params.category,
            error: error.message,
          });

          this.updateProviderHealth(providerName, false);
        }
      }

      throw new Error(`All headline providers failed. Last error: ${lastError.message}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Headlines failed', {
        category: params.category,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get list of healthy providers in priority order
   * @returns {Array<string>} List of healthy provider names
   */
  getHealthyProviders() {
    const availableProviders = this.newsService.getAvailableProviders();
    
    // Filter and sort by priority and health
    return this.options.providerPriority
      .filter(providerName => {
        if (!availableProviders.includes(providerName)) {
          return false;
        }

        const health = this.providerHealth.get(providerName);
        if (!health) {
          return true; // Not tested yet, include it
        }

        // Exclude if too many consecutive failures
        return health.consecutiveFailures < 3;
      });
  }

  /**
   * Update provider health status
   * @param {string} providerName - Provider name
   * @param {boolean} isHealthy - Whether the operation succeeded
   */
  updateProviderHealth(providerName, isHealthy) {
    const currentHealth = this.providerHealth.get(providerName) || {
      healthy: true,
      consecutiveFailures: 0,
      lastChecked: null,
    };

    if (isHealthy) {
      currentHealth.healthy = true;
      currentHealth.consecutiveFailures = 0;
    } else {
      currentHealth.healthy = false;
      currentHealth.consecutiveFailures++;
    }

    currentHealth.lastChecked = new Date().toISOString();
    this.providerHealth.set(providerName, currentHealth);

    logger.debug('Provider health updated', {
      provider: providerName,
      healthy: isHealthy,
      consecutiveFailures: currentHealth.consecutiveFailures,
    });
  }

  /**
   * Generate cache key from operation and parameters
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   * @returns {string} Cache key
   */
  generateCacheKey(operation, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    return `${operation}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get provider health status for all providers
   * @returns {Object} Provider health map
   */
  getProviderHealthStatus() {
    const status = {};
    
    for (const [providerName, health] of this.providerHealth.entries()) {
      status[providerName] = {
        ...health,
      };
    }

    return status;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    const stats = this.cache.getStats();
    
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits > 0 
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

export default NewsManager;
