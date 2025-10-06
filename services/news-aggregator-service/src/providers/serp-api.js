import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'serp-api-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * SERP API Provider for Bing News
 * Enterprise-ready provider with comprehensive error handling
 * SERP API provides a reliable alternative to direct Bing News API
 */
class SerpApiProvider {
  constructor() {
    this.apiKey = process.env.SERP_API_KEY;
    this.baseUrl = 'https://serpapi.com/search.json';
    this.rateLimitDelay = 1000; // 1 second between requests (adjust based on plan)
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.errorCount = 0;

    if (!this.apiKey) {
      logger.warn('SERP API key not configured - provider will be unavailable');
    } else {
      logger.info('SERP API provider initialized successfully', {
        baseUrl: this.baseUrl
      });
    }
  }

  /**
   * Check if the provider is configured and ready
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Implement rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      logger.debug('Rate limiting SERP API request', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles using SERP API (Bing News)
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('SERP API key not configured');
    }

    await this.enforceRateLimit();

    const startTime = Date.now();
    this.requestCount++;

    try {
      const {
        query,
        count = 10,
        offset = 0,
        freshness = 'qdr:d', // qdr:d=day, qdr:w=week, qdr:m=month
        location = 'United States',
        language = 'en'
      } = params;

      if (!query) {
        throw new Error('Query parameter is required');
      }

      const requestParams = {
        engine: 'bing_news',
        q: query,
        api_key: this.apiKey,
        num: Math.min(count, 50), // SERP API supports up to 50 results
        first: offset,
        location: location,
        hl: language,
        tbm: 'nws', // News search
        safe: 'moderate'
      };

      // Map freshness parameter
      if (freshness) {
        requestParams.qdr = this.mapFreshness(freshness);
      }

      logger.info('Searching SERP API (Bing News)', { 
        query, 
        count, 
        offset,
        location,
        language,
        requestNumber: this.requestCount
      });

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 15000, // 15 second timeout
        headers: {
          'User-Agent': 'TradingAgents-NewsAggregator/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`SERP API returned status ${response.status}`);
      }

      const data = response.data;

      // Check for API errors
      if (data.error) {
        throw new Error(`SERP API error: ${data.error}`);
      }

      // Transform SERP API response to standardized format
      const articles = (data.news_results || []).map(article => ({
        title: article.title,
        description: article.snippet || article.description,
        content: article.snippet || article.description,
        url: article.link,
        urlToImage: article.thumbnail,
        publishedAt: article.date,
        source: {
          id: null,
          name: article.source || 'Bing News (SERP API)'
        },
        author: article.source || null,
        category: null,
        position: article.position
      }));

      const duration = Date.now() - startTime;

      const result = {
        status: 'ok',
        totalResults: articles.length,
        articles,
        provider: 'serp-api',
        query,
        searchMetadata: {
          location,
          language,
          freshness: requestParams.qdr,
          offset,
          count: requestParams.num,
          responseTime: duration,
          searchId: data.search_metadata?.id,
          credits: data.search_metadata?.credits_used
        }
      };

      logger.info('SERP API search completed successfully', {
        query,
        articlesFound: articles.length,
        responseTime: duration,
        requestNumber: this.requestCount,
        creditsUsed: data.search_metadata?.credits_used
      });

      return result;

    } catch (error) {
      this.errorCount++;
      const duration = Date.now() - startTime;

      logger.error('SERP API search failed', {
        query: params.query,
        error: error.message,
        stack: error.stack,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        responseTime: duration,
        requestNumber: this.requestCount,
        errorCount: this.errorCount
      });

      // Enhanced error classification
      if (error.response?.status === 401 || error.message?.includes('Invalid API key')) {
        throw new Error('SERP API authentication failed - check API key');
      } else if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        throw new Error('SERP API rate limit exceeded - upgrade plan or wait');
      } else if (error.response?.status === 403) {
        throw new Error('SERP API access forbidden - check subscription and credits');
      } else if (error.response?.status === 500) {
        throw new Error('SERP API internal server error - service temporarily unavailable');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('SERP API request timeout - service may be slow or unavailable');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('SERP API connection failed - network or service issue');
      }

      throw new Error(`SERP API error: ${error.message}`);
    }
  }

  /**
   * Map freshness parameter to SERP API format
   */
  mapFreshness(freshness) {
    const freshnessMap = {
      'day': 'qdr:d',
      'week': 'qdr:w',
      'month': 'qdr:m',
      'year': 'qdr:y',
      'pd': 'qdr:d',  // Brave News format
      'pw': 'qdr:w',  // Brave News format
      'pm': 'qdr:m',  // Brave News format
      'py': 'qdr:y'   // Brave News format
    };

    return freshnessMap[freshness.toLowerCase()] || freshness;
  }

  /**
   * Get trending news topics (simulated via popular queries)
   */
  async getTrendingTopics(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('SERP API key not configured');
    }

    const { count = 10, category = 'business' } = params;

    logger.info('Fetching trending topics via SERP API', { count, category });

    // Popular trending queries by category
    const trendingQueries = {
      business: ['stock market news', 'economy news', 'business news', 'earnings reports'],
      technology: ['tech news', 'AI news', 'software updates', 'gadget launches'],
      sports: ['sports highlights', 'game results', 'player news'],
      health: ['health news', 'medical breakthroughs', 'wellness tips'],
      politics: ['political news', 'election updates', 'government policy'],
      entertainment: ['entertainment news', 'movie releases', 'celebrity news'],
      world: ['world news', 'international news', 'global events']
    };

    const queries = trendingQueries[category.toLowerCase()] || trendingQueries.business;

    // Fetch results for each trending query
    const topics = [];
    for (const query of queries.slice(0, count)) {
      try {
        const result = await this.searchNews({ query, count: 3, freshness: 'day' });
        
        topics.push({
          name: query,
          query: query,
          articleCount: result.totalResults,
          recentArticles: result.articles.slice(0, 3),
          isBreakingNews: false
        });

      } catch (error) {
        logger.warn('Failed to fetch trending topic', { 
          query, 
          error: error.message 
        });
      }
    }

    logger.info('SERP API trending topics completed', {
      topicsFound: topics.length,
      category
    });

    return {
      status: 'ok',
      topics,
      provider: 'serp-api',
      searchMetadata: {
        category,
        totalTopics: topics.length
      }
    };
  }

  /**
   * Health check for the provider
   */
  async healthCheck() {
    try {
      if (!this.isConfigured()) {
        return { 
          healthy: false, 
          message: 'API key not configured',
          provider: 'serp-api'
        };
      }

      const startTime = Date.now();

      // Simple test query
      await this.searchNews({ query: 'test', count: 1 });

      const duration = Date.now() - startTime;

      return {
        healthy: true,
        message: 'SERP API is responding',
        timestamp: new Date().toISOString(),
        provider: 'serp-api',
        responseTime: duration,
        statistics: {
          totalRequests: this.requestCount,
          totalErrors: this.errorCount,
          errorRate: this.requestCount > 0 
            ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + '%' 
            : '0%'
        }
      };

    } catch (error) {
      return {
        healthy: false,
        message: `SERP API health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        provider: 'serp-api',
        error: error.message,
        statistics: {
          totalRequests: this.requestCount,
          totalErrors: this.errorCount
        }
      };
    }
  }

  /**
   * Get provider statistics
   */
  getStatistics() {
    return {
      provider: 'serp-api',
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 
        ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + '%' 
        : '0%',
      lastRequestTime: this.lastRequestTime 
        ? new Date(this.lastRequestTime).toISOString() 
        : null
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStatistics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastRequestTime = 0;
    logger.info('SERP API statistics reset');
  }
}

export default SerpApiProvider;
