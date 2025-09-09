import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'brave-news-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class BraveNewsProvider {
  constructor() {
    this.apiKey = process.env.BRAVE_NEWS_API_KEY;
    this.baseUrl = 'https://api.search.brave.com/res/v1/news/search';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;

    if (!this.apiKey) {
      logger.warn('Brave News API key not configured - provider will be unavailable');
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
      logger.debug(`Rate limiting Brave News API request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Brave News API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        query,
        count = 10,
        offset = 0,
        freshness = 'pd', // pd=24h, pw=7d, pm=31d, py=365d
        country = 'US',
        language = 'en'
      } = params;

      if (!query) {
        throw new Error('Query parameter is required');
      }

      const requestParams = {
        q: query,
        count: Math.min(count, 50), // Brave API max is 50
        offset: Math.min(offset, 9), // Brave API max offset is 9
        country,
        search_lang: language,
        safesearch: 'moderate',
        spellcheck: true
      };

      // Map freshness parameter to Brave API format
      if (freshness) {
        switch (freshness.toLowerCase()) {
          case 'day':
            requestParams.freshness = 'pd';
            break;
          case 'week':
            requestParams.freshness = 'pw';
            break;
          case 'month':
            requestParams.freshness = 'pm';
            break;
          default:
            requestParams.freshness = freshness;
        }
      }

      logger.info('Searching Brave News', { query, count, offset, country, language });

      const response = await axios.get(this.baseUrl, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'TradingAgents-NewsAggregator/1.0'
        },
        params: requestParams,
        timeout: 10000 // 10 second timeout
      });

      if (response.status !== 200) {
        throw new Error(`Brave News API returned status ${response.status}`);
      }

      const data = response.data;

      // Transform Brave News response to standardized format
      const articles = (data.results || []).map(article => ({
        title: article.title,
        description: article.description,
        content: article.description, // Brave doesn't provide full content
        url: article.url,
        urlToImage: article.thumbnail?.src,
        publishedAt: article.page_fetched,
        source: {
          id: null,
          name: article.meta_url?.hostname || article.source || 'Brave News'
        },
        author: article.source || null,
        category: null, // Brave doesn't provide categories
        age: article.age,
        breaking: article.breaking,
        is_live: article.is_live,
        extra_snippets: article.extra_snippets
      }));

      const result = {
        status: 'ok',
        totalResults: articles.length, // Brave doesn't provide total count
        articles,
        provider: 'brave-news',
        query,
        searchMetadata: {
          freshness: requestParams.freshness,
          country,
          language,
          offset,
          count: requestParams.count
        }
      };

      logger.info('Brave News search completed', {
        query,
        articlesFound: articles.length
      });

      return result;

    } catch (error) {
      logger.error('Brave News search failed', {
        query: params.query,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Brave News API authentication failed - check API key');
      } else if (error.response?.status === 429) {
        throw new Error('Brave News API rate limit exceeded');
      } else if (error.response?.status === 403) {
        throw new Error('Brave News API access forbidden - check subscription');
      }

      throw new Error(`Brave News API error: ${error.message}`);
    }
  }

  /**
   * Search for trending news topics
   * Note: Brave API doesn't have a direct trending topics endpoint,
   * so we'll simulate this by searching for popular current news
   */
  async getTrendingTopics(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Brave News API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const { count = 10 } = params;

      // Brave doesn't have a trending topics endpoint, so we'll search for recent news
      // and extract the most common topics/themes
      const searchResult = await this.searchNews({
        query: 'news OR breaking OR latest',
        count: Math.min(count * 3, 50), // Get more results to find trends
        freshness: 'pd', // Last 24 hours
        country: 'US'
      });

      // Extract trending topics from article titles and descriptions
      const topicCounts = {};
      const articles = searchResult.articles || [];

      articles.forEach(article => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();

        // Simple keyword extraction (could be enhanced with NLP)
        const keywords = text.match(/\b(breaking|market|economy|politics|technology|health|world|business|finance|sports)\b/g) || [];

        keywords.forEach(keyword => {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        });
      });

      // Convert to trending topics format
      const topics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, count)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          query: name,
          isBreakingNews: name === 'breaking',
          articleCount: count
        }));

      const result = {
        status: 'ok',
        topics,
        provider: 'brave-news',
        searchMetadata: {
          totalTopics: topics.length,
          basedOnArticles: articles.length
        }
      };

      logger.info('Brave News trending topics simulated', {
        topicsFound: topics.length,
        basedOnArticles: articles.length
      });

      return result;

    } catch (error) {
      logger.error('Brave News trending topics failed', {
        error: error.message,
        status: error.response?.status
      });

      throw new Error(`Brave News trending topics error: ${error.message}`);
    }
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(category, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Brave News API key not configured');
    }

    const { count = 10, offset = 0 } = params;

    // Map common categories to search terms
    const categoryMap = {
      'business': 'business OR finance OR economy OR market',
      'technology': 'technology OR tech OR AI OR software OR hardware',
      'sports': 'sports OR football OR basketball OR soccer OR tennis',
      'health': 'health OR medical OR medicine OR disease OR pandemic',
      'politics': 'politics OR government OR election OR policy',
      'entertainment': 'entertainment OR celebrity OR movie OR music OR TV',
      'science': 'science OR research OR discovery OR innovation',
      'world': 'world OR international OR global OR foreign'
    };

    const searchQuery = categoryMap[category.toLowerCase()] || category;

    // Use category-specific search
    return this.searchNews({
      query: searchQuery,
      count,
      offset,
      freshness: 'pd' // Last 24 hours for category news
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
        message: 'Brave News API is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Brave News API health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default BraveNewsProvider;