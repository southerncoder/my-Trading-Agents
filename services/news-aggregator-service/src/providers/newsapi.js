import NewsAPI from 'newsapi';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'newsapi-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class NewsAPIProvider {
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    this.rateLimitDelay = 1200; // ~50 requests per minute (NewsAPI free tier)
    this.lastRequestTime = 0;

    if (this.apiKey) {
      try {
        this.newsapi = new NewsAPI(this.apiKey);
        logger.info('NewsAPI provider initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize NewsAPI provider', { error: error.message });
        this.newsapi = null;
      }
    } else {
      logger.warn('NewsAPI key not configured - provider will be unavailable');
    }
  }

  /**
   * Check if the provider is configured and ready
   */
  isConfigured() {
    return !!this.newsapi;
  }

  /**
   * Implement rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      logger.debug(`Rate limiting NewsAPI request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('NewsAPI not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        query,
        from,
        to,
        language = 'en',
        sortBy = 'relevancy',
        pageSize = 20,
        page = 1
      } = params;

      if (!query) {
        throw new Error('Query parameter is required');
      }

      const requestParams = {
        q: query,
        from,
        to,
        language,
        sortBy,
        pageSize: Math.min(pageSize, 100), // NewsAPI max is 100
        page
      };

      logger.info('Searching NewsAPI', { query, pageSize, page });

      const response = await this.newsapi.v2.everything(requestParams);

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      // Transform to standardized format
      const articles = (response.articles || []).map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          id: article.source.id,
          name: article.source.name
        },
        author: article.author
      }));

      const result = {
        status: 'ok',
        totalResults: response.totalResults,
        articles,
        provider: 'newsapi',
        query,
        searchMetadata: {
          page,
          pageSize: requestParams.pageSize,
          totalPages: Math.ceil(response.totalResults / requestParams.pageSize)
        }
      };

      logger.info('NewsAPI search completed', {
        query,
        articlesFound: articles.length,
        totalResults: response.totalResults
      });

      return result;

    } catch (error) {
      logger.error('NewsAPI search failed', {
        query: params.query,
        error: error.message
      });

      if (error.message.includes('apiKeyInvalid')) {
        throw new Error('NewsAPI authentication failed - check API key');
      } else if (error.message.includes('rateLimited')) {
        throw new Error('NewsAPI rate limit exceeded');
      }

      throw new Error(`NewsAPI error: ${error.message}`);
    }
  }

  /**
   * Get top headlines
   */
  async getTopHeadlines(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('NewsAPI not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        country = 'us',
        category,
        sources,
        q,
        pageSize = 20,
        page = 1
      } = params;

      const requestParams = {
        country,
        category,
        sources,
        q,
        pageSize: Math.min(pageSize, 100),
        page
      };

      logger.info('Fetching NewsAPI top headlines', { country, category, q });

      const response = await this.newsapi.v2.topHeadlines(requestParams);

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      // Transform to standardized format
      const articles = (response.articles || []).map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          id: article.source.id,
          name: article.source.name
        },
        author: article.author
      }));

      const result = {
        status: 'ok',
        totalResults: response.totalResults,
        articles,
        provider: 'newsapi',
        searchMetadata: {
          country,
          category,
          page,
          pageSize: requestParams.pageSize
        }
      };

      logger.info('NewsAPI top headlines fetched', {
        articlesFound: articles.length,
        totalResults: response.totalResults
      });

      return result;

    } catch (error) {
      logger.error('NewsAPI top headlines failed', {
        error: error.message
      });

      throw new Error(`NewsAPI top headlines error: ${error.message}`);
    }
  }

  /**
   * Get news sources
   */
  async getSources(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('NewsAPI not configured');
    }

    await this.enforceRateLimit();

    try {
      const { category, language = 'en', country } = params;

      const requestParams = {
        category,
        language,
        country
      };

      logger.info('Fetching NewsAPI sources', { category, language, country });

      const response = await this.newsapi.v2.sources(requestParams);

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const result = {
        status: 'ok',
        sources: response.sources,
        provider: 'newsapi',
        searchMetadata: {
          totalSources: response.sources.length,
          category,
          language,
          country
        }
      };

      logger.info('NewsAPI sources fetched', {
        sourcesFound: response.sources.length
      });

      return result;

    } catch (error) {
      logger.error('NewsAPI sources failed', {
        error: error.message
      });

      throw new Error(`NewsAPI sources error: ${error.message}`);
    }
  }

  /**
   * Health check for the provider
   */
  async healthCheck() {
    try {
      if (!this.isConfigured()) {
        return { healthy: false, message: 'API key not configured' };
      }

      // Simple test query
      await this.searchNews({ query: 'test', pageSize: 1 });

      return {
        healthy: true,
        message: 'NewsAPI is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `NewsAPI health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default NewsAPIProvider;