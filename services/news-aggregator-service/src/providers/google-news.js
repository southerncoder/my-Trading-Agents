import NewsAPI from 'newsapi';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'google-news-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class GoogleNewsProvider {
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    this.rateLimitDelay = 1200; // ~50 requests per minute (NewsAPI free tier)
    this.lastRequestTime = 0;

    if (this.apiKey) {
      try {
        this.newsapi = new NewsAPI(this.apiKey);
        logger.info('Google News provider initialized successfully (via NewsAPI)');
      } catch (error) {
        logger.error('Failed to initialize Google News provider', { error: error.message });
        this.newsapi = null;
      }
    } else {
      logger.warn('NewsAPI key not configured - Google News provider will be unavailable');
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
      logger.debug(`Rate limiting Google News request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles (Google News style)
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Google News provider not configured (requires NewsAPI key)');
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

      // Enhance query to get more Google News-like results
      const enhancedQuery = this.enhanceQueryForGoogleNews(query);

      const requestParams = {
        q: enhancedQuery,
        from,
        to,
        language,
        sortBy,
        pageSize: Math.min(pageSize, 100),
        page
      };

      logger.info('Searching Google News (via NewsAPI)', { query, enhancedQuery, pageSize, page });

      const response = await this.newsapi.v2.everything(requestParams);

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      // Transform and filter results to be more Google News-like
      const articles = (response.articles || [])
        .filter(article => this.isGoogleNewsLike(article))
        .map(article => ({
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
          author: article.author,
          // Add Google News specific metadata
          isGoogleNews: true,
          relevanceScore: this.calculateRelevanceScore(article, query)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance

      const result = {
        status: 'ok',
        totalResults: response.totalResults,
        articles,
        provider: 'google-news',
        query,
        enhancedQuery,
        searchMetadata: {
          page,
          pageSize: requestParams.pageSize,
          totalPages: Math.ceil(response.totalResults / requestParams.pageSize),
          filteredResults: articles.length,
          originalResults: response.articles?.length || 0
        }
      };

      logger.info('Google News search completed', {
        query,
        articlesFound: articles.length,
        totalResults: response.totalResults,
        filteredCount: articles.length
      });

      return result;

    } catch (error) {
      logger.error('Google News search failed', {
        query: params.query,
        error: error.message
      });

      if (error.message.includes('apiKeyInvalid')) {
        throw new Error('NewsAPI authentication failed - check API key');
      } else if (error.message.includes('rateLimited')) {
        throw new Error('NewsAPI rate limit exceeded');
      }

      throw new Error(`Google News error: ${error.message}`);
    }
  }

  /**
   * Enhance query to get more Google News-like results
   */
  enhanceQueryForGoogleNews(query) {
    // Add terms that typically appear in high-quality news sources
    const newsTerms = [
      'news',
      'breaking',
      'update',
      'report',
      'announces',
      'says',
      'according to'
    ];

    // Don't enhance if query already contains news terms
    const hasNewsTerms = newsTerms.some(term =>
      query.toLowerCase().includes(term)
    );

    if (hasNewsTerms) {
      return query;
    }

    // Add "news" to the query for better results
    return `${query} news`;
  }

  /**
   * Check if article looks like Google News content
   */
  isGoogleNewsLike(article) {
    // Filter out low-quality sources and content
    const lowQualitySources = [
      'youtube.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'tiktok.com',
      'reddit.com'
    ];

    const sourceUrl = article.url?.toLowerCase() || '';
    const hasLowQualitySource = lowQualitySources.some(domain =>
      sourceUrl.includes(domain)
    );

    // Check if article has proper metadata
    const hasTitle = article.title && article.title.length > 10;
    const hasDescription = article.description && article.description.length > 20;
    const hasSource = article.source?.name;

    return !hasLowQualitySource && hasTitle && hasDescription && hasSource;
  }

  /**
   * Calculate relevance score for article
   */
  calculateRelevanceScore(article, originalQuery) {
    let score = 0;

    // Title relevance
    if (article.title?.toLowerCase().includes(originalQuery.toLowerCase())) {
      score += 10;
    }

    // Description relevance
    if (article.description?.toLowerCase().includes(originalQuery.toLowerCase())) {
      score += 5;
    }

    // Recent publication (prefer newer articles)
    if (article.publishedAt) {
      const publishedDate = new Date(article.publishedAt);
      const now = new Date();
      const hoursSincePublished = (now - publishedDate) / (1000 * 60 * 60);

      if (hoursSincePublished < 24) {
        score += 8; // Very recent
      } else if (hoursSincePublished < 72) {
        score += 5; // Recent
      } else if (hoursSincePublished < 168) {
        score += 2; // This week
      }
    }

    // Source reputation (well-known sources get higher scores)
    const reputableSources = [
      'reuters',
      'bloomberg',
      'wsj',
      'ft',
      'cnn',
      'bbc',
      'nytimes',
      'washingtonpost',
      'ap news',
      'associated press'
    ];

    const sourceName = article.source?.name?.toLowerCase() || '';
    const isReputable = reputableSources.some(source =>
      sourceName.includes(source)
    );

    if (isReputable) {
      score += 3;
    }

    return score;
  }

  /**
   * Get top headlines (Google News style)
   */
  async getTopHeadlines(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Google News provider not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        country = 'us',
        category,
        q,
        pageSize = 20,
        page = 1
      } = params;

      const requestParams = {
        country,
        category,
        q,
        pageSize: Math.min(pageSize, 100),
        page
      };

      logger.info('Fetching Google News top headlines', { country, category, q });

      const response = await this.newsapi.v2.topHeadlines(requestParams);

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      // Transform to Google News-like format
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
        author: article.author,
        isGoogleNews: true,
        relevanceScore: this.calculateRelevanceScore(article, q || '')
      }));

      const result = {
        status: 'ok',
        totalResults: response.totalResults,
        articles,
        provider: 'google-news',
        searchMetadata: {
          country,
          category,
          page,
          pageSize: requestParams.pageSize
        }
      };

      logger.info('Google News top headlines fetched', {
        articlesFound: articles.length,
        totalResults: response.totalResults
      });

      return result;

    } catch (error) {
      logger.error('Google News top headlines failed', {
        error: error.message
      });

      throw new Error(`Google News top headlines error: ${error.message}`);
    }
  }

  /**
   * Health check for the provider
   */
  async healthCheck() {
    try {
      if (!this.isConfigured()) {
        return { healthy: false, message: 'NewsAPI key not configured' };
      }

      // Simple test query
      await this.searchNews({ query: 'test', pageSize: 1 });

      return {
        healthy: true,
        message: 'Google News (via NewsAPI) is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Google News health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default GoogleNewsProvider;