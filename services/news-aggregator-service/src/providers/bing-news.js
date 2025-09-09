import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bing-news-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class BingNewsProvider {
  constructor() {
    this.apiKey = process.env.BING_NEWS_API_KEY;
    this.baseUrl = 'https://api.bing.microsoft.com/v7.0/news';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;

    if (!this.apiKey) {
      logger.warn('Bing News API key not configured - provider will be unavailable');
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
      logger.debug(`Rate limiting Bing News API request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Bing News API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        query,
        count = 10,
        offset = 0,
        freshness = 'Day', // Day, Week, Month
        sortBy = 'Date' // Date, Relevance
      } = params;

      if (!query) {
        throw new Error('Query parameter is required');
      }

      const requestParams = {
        q: query,
        count: Math.min(count, 100), // Bing API max is 100
        offset,
        freshness,
        sortBy,
        mkt: 'en-US',
        safeSearch: 'Moderate'
      };

      logger.info('Searching Bing News', { query, count, offset });

      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'User-Agent': 'TradingAgents-NewsAggregator/1.0'
        },
        params: requestParams,
        timeout: 10000 // 10 second timeout
      });

      if (response.status !== 200) {
        throw new Error(`Bing News API returned status ${response.status}`);
      }

      const data = response.data;

      // Transform Bing News response to standardized format
      const articles = (data.value || []).map(article => ({
        title: article.name,
        description: article.description,
        content: article.description, // Bing doesn't provide full content
        url: article.url,
        urlToImage: article.image?.thumbnail?.contentUrl,
        publishedAt: article.datePublished,
        source: {
          id: null,
          name: article.provider[0]?.name || 'Bing News'
        },
        author: article.provider[0]?.name || null,
        category: article.category,
        about: article.about // Bing-specific rich metadata
      }));

      const result = {
        status: 'ok',
        totalResults: data.totalEstimatedMatches || articles.length,
        articles,
        provider: 'bing-news',
        query,
        searchMetadata: {
          freshness,
          sortBy,
          totalEstimatedMatches: data.totalEstimatedMatches,
          nextOffset: offset + articles.length
        }
      };

      logger.info('Bing News search completed', {
        query,
        articlesFound: articles.length,
        totalEstimated: data.totalEstimatedMatches
      });

      return result;

    } catch (error) {
      logger.error('Bing News search failed', {
        query: params.query,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Bing News API authentication failed - check API key');
      } else if (error.response?.status === 429) {
        throw new Error('Bing News API rate limit exceeded');
      } else if (error.response?.status === 403) {
        throw new Error('Bing News API access forbidden - check subscription');
      }

      throw new Error(`Bing News API error: ${error.message}`);
    }
  }

  /**
   * Search for trending news topics
   */
  async getTrendingTopics(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Bing News API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const { count = 10, category } = params;

      const requestParams = {
        count: Math.min(count, 100),
        mkt: 'en-US',
        safeSearch: 'Moderate'
      };

      if (category) {
        requestParams.category = category;
      }

      logger.info('Fetching Bing News trending topics', { count, category });

      const response = await axios.get(`${this.baseUrl}/trendingtopics`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'User-Agent': 'TradingAgents-NewsAggregator/1.0'
        },
        params: requestParams,
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`Bing News API returned status ${response.status}`);
      }

      const data = response.data;

      // Transform trending topics to standardized format
      const topics = (data.value || []).map(topic => ({
        name: topic.name,
        query: topic.query,
        image: topic.image,
        newsSearchUrl: topic.newsSearchUrl,
        webSearchUrl: topic.webSearchUrl,
        isBreakingNews: topic.isBreakingNews,
        queryContext: topic.queryContext
      }));

      const result = {
        status: 'ok',
        topics,
        provider: 'bing-news',
        searchMetadata: {
          totalEstimatedMatches: data.totalEstimatedMatches
        }
      };

      logger.info('Bing News trending topics fetched', {
        topicsFound: topics.length
      });

      return result;

    } catch (error) {
      logger.error('Bing News trending topics failed', {
        error: error.message,
        status: error.response?.status
      });

      throw new Error(`Bing News trending topics error: ${error.message}`);
    }
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(category, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Bing News API key not configured');
    }

    const { count = 10, offset = 0 } = params;

    // Use category-specific search
    return this.searchNews({
      query: `category:${category}`,
      count,
      offset,
      freshness: 'Day'
    });
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
      await this.searchNews({ query: 'test', count: 1 });

      return {
        healthy: true,
        message: 'Bing News API is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Bing News API health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default BingNewsProvider;