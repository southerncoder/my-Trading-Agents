import { tavily } from '@tavily/core';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tavily-provider' },
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
 * Tavily Search Provider
 * Uses official @tavily/core SDK for best practice implementation
 * Provides AI-powered web search optimized for LLMs and RAG applications
 */
class TavilyProvider {
  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
    this.rateLimitDelay = 1000; // 1 second between requests (adjust based on plan)
    this.lastRequestTime = 0;
    this.client = null;

    if (this.apiKey) {
      try {
        // Initialize official Tavily client
        this.client = tavily({ apiKey: this.apiKey });
        logger.info('Tavily provider initialized successfully with official SDK');
      } catch (error) {
        logger.error('Failed to initialize Tavily client', { error: error.message });
        this.client = null;
      }
    } else {
      logger.warn('Tavily API key not configured - provider will be unavailable');
    }
  }

  /**
   * Check if the provider is configured and ready
   */
  isConfigured() {
    return !!this.client;
  }

  /**
   * Implement rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      logger.debug(`Rate limiting Tavily API request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for news articles using Tavily Search API
   * Optimized for real-time news and recent events
   */
  async searchNews(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Tavily API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        query,
        searchDepth = 'basic', // 'basic' or 'advanced'
        maxResults = 10,
        includeDomains = [],
        excludeDomains = [],
        includeAnswer = false,
        includeRawContent = false,
        includeImages = false
      } = params;

      if (!query) {
        throw new Error('Query parameter is required');
      }

      logger.info('Searching Tavily', { 
        query, 
        maxResults, 
        searchDepth 
      });

      // Execute search using official SDK
      const response = await this.client.search(query, {
        searchDepth,
        maxResults: Math.min(maxResults, 20), // Tavily max is 20
        includeDomains: includeDomains.length > 0 ? includeDomains : undefined,
        excludeDomains: excludeDomains.length > 0 ? excludeDomains : undefined,
        includeAnswer,
        includeRawContent,
        includeImages
      });

      // Transform Tavily response to standardized format
      const articles = (response.results || []).map(result => ({
        title: result.title,
        description: result.content, // Tavily's content field contains the summary
        content: includeRawContent ? result.rawContent : result.content,
        url: result.url,
        urlToImage: result.image || null,
        publishedAt: result.publishedDate || new Date().toISOString(),
        source: {
          id: null,
          name: this.extractDomain(result.url)
        },
        author: null,
        score: result.score || null, // Relevance score from Tavily
        rawContent: includeRawContent ? result.rawContent : undefined
      }));

      const standardizedResponse = {
        status: 'ok',
        totalResults: articles.length,
        articles,
        provider: 'tavily',
        query,
        searchMetadata: {
          searchDepth,
          maxResults,
          answer: response.answer || null, // AI-generated answer if requested
          images: response.images || [],
          responseTime: response.responseTime || null
        }
      };

      logger.info('Tavily search completed', {
        query,
        articlesFound: articles.length,
        hasAnswer: !!response.answer
      });

      return standardizedResponse;

    } catch (error) {
      logger.error('Tavily search failed', {
        query: params.query,
        error: error.message,
        stack: error.stack
      });

      if (error.message?.includes('401') || error.message?.includes('authentication')) {
        throw new Error('Tavily API authentication failed - check API key');
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        throw new Error('Tavily API rate limit exceeded');
      } else if (error.message?.includes('402') || error.message?.includes('quota')) {
        throw new Error('Tavily API quota exceeded - upgrade plan');
      }

      throw new Error(`Tavily API error: ${error.message}`);
    }
  }

  /**
   * Search for financial news with Tavily
   * Optimized for stock ticker queries and market news
   */
  async searchFinancialNews(symbol, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Tavily API key not configured');
    }

    const { 
      lookBackDays = 7, 
      maxResults = 20,
      includeAnswer = true // Get AI summary of financial news
    } = params;

    // Construct financial news query
    const query = `${symbol} stock news OR ${symbol} earnings OR ${symbol} market update OR ${symbol} financial`;

    // Use advanced search depth for financial queries
    return this.searchNews({
      query,
      searchDepth: 'advanced',
      maxResults,
      includeAnswer,
      includeRawContent: false,
      includeImages: true
    });
  }

  /**
   * Get top headlines using Tavily search
   * Searches for recent breaking news and trending topics
   */
  async getTopHeadlines(params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Tavily API key not configured');
    }

    const { 
      category = 'business',
      country = 'us',
      maxResults = 10
    } = params;

    // Construct query for top headlines
    const categoryMap = {
      'business': 'business news OR market news OR finance news',
      'technology': 'technology news OR tech updates OR AI news',
      'sports': 'sports news OR sports headlines',
      'health': 'health news OR medical news',
      'politics': 'politics news OR government news',
      'entertainment': 'entertainment news OR celebrity news',
      'science': 'science news OR research news',
      'world': 'world news OR international news'
    };

    const query = `breaking news OR latest ${categoryMap[category] || category}`;

    return this.searchNews({
      query,
      searchDepth: 'basic',
      maxResults,
      includeAnswer: false,
      includeImages: true
    });
  }

  /**
   * Extract domain name from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get AI-powered answer to a question using Tavily
   * Useful for financial analysis queries
   */
  async getAnswer(question, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Tavily API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const {
        searchDepth = 'advanced',
        maxResults = 5
      } = params;

      logger.info('Getting Tavily answer', { question });

      const response = await this.client.search(question, {
        searchDepth,
        maxResults,
        includeAnswer: true,
        includeRawContent: false,
        includeImages: false
      });

      return {
        status: 'ok',
        question,
        answer: response.answer || 'No answer available',
        sources: (response.results || []).map(r => ({
          title: r.title,
          url: r.url,
          content: r.content
        })),
        provider: 'tavily',
        searchMetadata: {
          searchDepth,
          resultsCount: response.results?.length || 0
        }
      };

    } catch (error) {
      logger.error('Tavily answer failed', {
        question,
        error: error.message
      });

      throw new Error(`Tavily answer error: ${error.message}`);
    }
  }

  /**
   * Extract content from specific URLs using Tavily Extract API
   * Useful for deep-dive analysis of specific articles
   */
  async extractContent(urls, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Tavily API key not configured');
    }

    await this.enforceRateLimit();

    try {
      if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('URLs array is required and must not be empty');
      }

      if (urls.length > 20) {
        throw new Error('Maximum 20 URLs can be extracted at once');
      }

      logger.info('Extracting content from URLs', { urlCount: urls.length });

      const response = await this.client.extract(urls);

      const extracted = (response.results || []).map(result => ({
        url: result.url,
        rawContent: result.rawContent,
        status: 'success'
      }));

      const failed = (response.failedResults || []).map(result => ({
        url: result.url,
        status: 'failed',
        error: result.error || 'Extraction failed'
      }));

      logger.info('Tavily content extraction completed', {
        successful: extracted.length,
        failed: failed.length
      });

      return {
        status: 'ok',
        provider: 'tavily',
        results: extracted,
        failedResults: failed,
        summary: {
          total: urls.length,
          successful: extracted.length,
          failed: failed.length
        }
      };

    } catch (error) {
      logger.error('Tavily content extraction failed', {
        urlCount: urls?.length,
        error: error.message
      });

      throw new Error(`Tavily extract error: ${error.message}`);
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
      await this.searchNews({ query: 'test', maxResults: 1 });

      return {
        healthy: true,
        message: 'Tavily API is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Tavily API health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default TavilyProvider;
