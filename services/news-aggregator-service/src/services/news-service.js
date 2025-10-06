import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'news-service' },
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
 * News Service Layer
 * Provides basic news retrieval operations
 * Called by NewsManager for abstraction
 */
class NewsService {
  constructor(providers = {}) {
    this.providers = providers;
    
    logger.info('News Service initialized', {
      availableProviders: Object.keys(providers),
    });
  }

  /**
   * Search news using a specific provider
   * @param {string} providerName - Name of the provider to use
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchWithProvider(providerName, searchParams) {
    const startTime = Date.now();
    
    try {
      const provider = this.providers[providerName];
      
      if (!provider) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      if (!provider.isConfigured()) {
        throw new Error(`Provider '${providerName}' is not configured`);
      }

      logger.debug('Searching with provider', {
        provider: providerName,
        query: searchParams.query,
      });

      const result = await provider.searchNews(searchParams);
      
      const duration = Date.now() - startTime;
      
      logger.info('Provider search completed', {
        provider: providerName,
        query: searchParams.query,
        resultsCount: result.articles?.length || 0,
        duration,
      });

      return {
        success: true,
        provider: providerName,
        data: result,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Provider search failed', {
        provider: providerName,
        query: searchParams.query,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get top headlines from a specific provider
   * @param {string} providerName - Name of the provider to use
   * @param {Object} params - Headline parameters
   * @returns {Promise<Object>} Headlines results
   */
  async getHeadlinesWithProvider(providerName, params) {
    const startTime = Date.now();
    
    try {
      const provider = this.providers[providerName];
      
      if (!provider) {
        throw new Error(`Provider '${providerName}' not found`);
      }

      if (!provider.isConfigured()) {
        throw new Error(`Provider '${providerName}' is not configured`);
      }

      logger.debug('Getting headlines with provider', {
        provider: providerName,
        category: params.category,
      });

      const result = await provider.getTopHeadlines 
        ? await provider.getTopHeadlines(params)
        : await provider.searchNews({ ...params, sortBy: 'popularity' });
      
      const duration = Date.now() - startTime;
      
      logger.info('Provider headlines completed', {
        provider: providerName,
        resultsCount: result.articles?.length || 0,
        duration,
      });

      return {
        success: true,
        provider: providerName,
        data: result,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Provider headlines failed', {
        provider: providerName,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Check health of a specific provider
   * @param {string} providerName - Name of the provider to check
   * @returns {Promise<Object>} Health check result
   */
  async checkProviderHealth(providerName) {
    try {
      const provider = this.providers[providerName];
      
      if (!provider) {
        return {
          healthy: false,
          provider: providerName,
          message: 'Provider not found',
        };
      }

      if (!provider.isConfigured()) {
        return {
          healthy: false,
          provider: providerName,
          message: 'Provider not configured',
        };
      }

      const healthResult = await provider.healthCheck();
      
      return {
        ...healthResult,
        provider: providerName,
      };

    } catch (error) {
      logger.warn('Provider health check failed', {
        provider: providerName,
        error: error.message,
      });

      return {
        healthy: false,
        provider: providerName,
        message: error.message,
      };
    }
  }

  /**
   * Get list of available providers
   * @returns {Array<string>} List of provider names
   */
  getAvailableProviders() {
    return Object.keys(this.providers).filter(name => {
      const provider = this.providers[name];
      return provider && provider.isConfigured();
    });
  }

  /**
   * Get provider statistics
   * @param {string} providerName - Name of the provider
   * @returns {Object} Provider statistics
   */
  getProviderStatistics(providerName) {
    const provider = this.providers[providerName];
    
    if (!provider) {
      return null;
    }

    if (typeof provider.getStatistics === 'function') {
      return provider.getStatistics();
    }

    return {
      provider: providerName,
      configured: provider.isConfigured(),
    };
  }
}

export default NewsService;
