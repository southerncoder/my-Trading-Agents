import axios from 'axios';
import process from 'process';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('reddit-service-client', 'DataFlow');

/**
 * Client for the isolated Reddit sentiment service
 * Replaces direct snoowrap usage with HTTP API calls
 */
export class RedditServiceClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.REDDIT_SERVICE_URL || 'http://localhost:3001';
    this.apiKey = config.apiKey || process.env.REDDIT_SERVICE_API_KEY;
    this.timeout = config.timeout || 30000;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      }
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Reddit service response', { 
          url: response.config.url, 
          status: response.status,
          dataSize: JSON.stringify(response.data).length 
        });
        return response;
      },
      (error) => {
        logger.error('Reddit service error', { 
          url: error.config?.url,
          status: error.response?.status,
          message: error.message 
        });
        throw error;
      }
    );

    logger.info('Reddit service client initialized', { baseUrl: this.baseUrl });
  }

  /**
   * Check if the Reddit service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Reddit service health check failed', { error: error.message });
      throw new Error(`Reddit service is not available: ${error.message}`);
    }
  }

  /**
   * Get posts from a specific subreddit with sentiment analysis
   */
  async getSubredditPosts(subreddit, options = {}) {
    const {
      sort = 'hot',
      limit = 25,
      timeframe = 'day',
      analyzeSentiment = true
    } = options;

    try {
      const response = await this.client.get(`/api/subreddit/${subreddit}/posts`, {
        params: { sort, limit, timeframe, analyzeSentiment }
      });

      logger.info('Fetched subreddit posts', { 
        subreddit, 
        count: response.data.count,
        sentiment: response.data.overallSentiment?.classification 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch subreddit posts', { subreddit, error: error.message });
      throw new Error(`Failed to fetch posts from ${subreddit}: ${error.message}`);
    }
  }

  /**
   * Analyze sentiment across multiple subreddits
   */
  async analyzeSentiment(subreddits = ['wallstreetbets', 'investing', 'stocks'], options = {}) {
    const { limit = 25, timeframe = 'day' } = options;

    try {
      const response = await this.client.post('/api/sentiment/analyze', {
        subreddits,
        limit,
        timeframe
      });

      logger.info('Completed sentiment analysis', { 
        subreddits: subreddits.length,
        totalPosts: response.data.summary?.totalPosts,
        sentiment: response.data.overallSentiment?.classification 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to analyze sentiment', { subreddits, error: error.message });
      throw new Error(`Failed to analyze sentiment: ${error.message}`);
    }
  }

  /**
   * Search for posts by ticker or keyword
   */
  async searchPosts(query, options = {}) {
    const {
      subreddit,
      sort = 'relevance',
      timeframe = 'week',
      limit = 25
    } = options;

    try {
      const response = await this.client.get('/api/search', {
        params: { query, subreddit, sort, timeframe, limit }
      });

      logger.info('Completed post search', { 
        query, 
        subreddit,
        count: response.data.count,
        sentiment: response.data.overallSentiment?.classification 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to search posts', { query, error: error.message });
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  }

  /**
   * Get comments for a specific post with sentiment analysis
   */
  async getPostComments(subreddit, postId, options = {}) {
    const { limit = 50, analyzeSentiment = true } = options;

    try {
      const response = await this.client.get(`/api/post/${subreddit}/${postId}/comments`, {
        params: { limit, analyzeSentiment }
      });

      logger.info('Fetched post comments', { 
        subreddit, 
        postId,
        count: response.data.count,
        sentiment: response.data.overallSentiment?.classification 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch comments', { subreddit, postId, error: error.message });
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }
  }

  /**
   * Get service statistics
   */
  async getStats() {
    try {
      const response = await this.client.get('/api/stats');
      return response.data;
    } catch (error) {
      logger.error('Failed to get service stats', { error: error.message });
      throw new Error(`Failed to get service stats: ${error.message}`);
    }
  }

  /**
   * Clear the service cache
   */
  async clearCache() {
    try {
      const response = await this.client.post('/api/cache/clear');
      logger.info('Reddit service cache cleared');
      return response.data;
    } catch (error) {
      logger.error('Failed to clear service cache', { error: error.message });
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * Legacy compatibility method for existing code
   * Maps to the new sentiment analysis endpoint
   */
  async getMarketSentimentData(options = {}) {
    const {
      subreddits = ['wallstreetbets', 'investing', 'stocks', 'SecurityAnalysis'],
      timeframe = 'day',
      limit = 25
    } = options;

    try {
      const sentimentData = await this.analyzeSentiment(subreddits, { timeframe, limit });
      
      // Transform to legacy format for compatibility
      return {
        overall_sentiment: sentimentData.overallSentiment.classification,
        sentiment_score: sentimentData.overallSentiment.score,
        confidence: sentimentData.overallSentiment.confidence,
        total_posts: sentimentData.summary.totalPosts,
        subreddit_breakdown: sentimentData.subredditAnalysis.map(analysis => ({
          subreddit: analysis.subreddit,
          sentiment: analysis.sentiment.classification,
          score: analysis.sentiment.score,
          post_count: analysis.postCount,
          top_tickers: analysis.topTickers
        })),
        timestamp: sentimentData.timestamp
      };
    } catch (error) {
      logger.error('Failed to get market sentiment data', { error: error.message });
      throw error;
    }
  }

  /**
   * Legacy compatibility method for ticker-specific sentiment
   */
  async getTickerSentiment(ticker, options = {}) {
    const {
      subreddits = ['wallstreetbets', 'investing', 'stocks'],
      timeframe = 'week',
      limit = 50
    } = options;

    try {
      // Search for the ticker across multiple subreddits
      const searchPromises = subreddits.map(subreddit => 
        this.searchPosts(ticker, { subreddit, timeframe, limit: Math.floor(limit / subreddits.length) })
          .catch(error => {
            logger.warn('Failed to search subreddit for ticker', { subreddit, ticker, error: error.message });
            return { posts: [], count: 0, overallSentiment: { score: 0, classification: 'neutral' } };
          })
      );

      const results = await Promise.all(searchPromises);
      
      // Aggregate results
      const allPosts = results.flatMap(result => result.posts || []);
      const totalMentions = allPosts.length;
      
      if (totalMentions === 0) {
        return {
          ticker,
          sentiment: 'neutral',
          score: 0,
          confidence: 0,
          mentions: 0,
          posts: []
        };
      }

      // Calculate weighted sentiment
      const weightedScore = results.reduce((sum, result) => {
        const weight = (result.posts?.length || 0) / totalMentions;
        return sum + (result.overallSentiment?.score || 0) * weight;
      }, 0);

      let sentiment = 'neutral';
      if (weightedScore > 0.1) sentiment = 'positive';
      else if (weightedScore < -0.1) sentiment = 'negative';

      return {
        ticker,
        sentiment,
        score: weightedScore,
        confidence: Math.min(totalMentions / 20, 1), // Higher confidence with more mentions
        mentions: totalMentions,
        posts: allPosts.slice(0, 10), // Return top 10 posts
        subreddit_breakdown: results.map((result, index) => ({
          subreddit: subreddits[index],
          mentions: result.posts?.length || 0,
          sentiment: result.overallSentiment?.classification || 'neutral',
          score: result.overallSentiment?.score || 0
        }))
      };
    } catch (error) {
      logger.error('Failed to get ticker sentiment', { ticker, error: error.message });
      throw error;
    }
  }

  /**
   * Test the service connection and functionality
   */
  async testConnection() {
    try {
      // Test health check
      const health = await this.healthCheck();
      logger.info('Reddit service health check passed', health);

      // Test basic functionality
      const testResult = await this.getSubredditPosts('investing', { limit: 5 });
      logger.info('Reddit service functionality test passed', { 
        posts: testResult.count,
        sentiment: testResult.overallSentiment?.classification 
      });

      return {
        status: 'success',
        health,
        testPosts: testResult.count,
        message: 'Reddit service is working correctly'
      };
    } catch (error) {
      logger.error('Reddit service connection test failed', { error: error.message });
      return {
        status: 'error',
        error: error.message,
        message: 'Reddit service is not available'
      };
    }
  }
}

// Export singleton instance with default configuration
export const redditServiceClient = new RedditServiceClient();

// Export factory function for custom configurations
export function createRedditServiceClient(config) {
  return new RedditServiceClient(config);
}