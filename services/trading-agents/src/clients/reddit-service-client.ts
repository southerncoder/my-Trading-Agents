/**
 * Reddit Service Client
 * 
 * HTTP client for communicating with the isolated Reddit microservice.
 * Provides sentiment analysis and social trading data with security isolation.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createLogger } from '../utils/enhanced-logger.js';
import { RedditPost as DataflowRedditPost } from '../types/dataflows.js';

const logger = createLogger('dataflow', 'RedditServiceClient');

// Service response type (internal) - now used
interface ServiceRedditPost {
  id: string;
  title: string;
  body: string;
  author: string;
  score: number;
  comments: number;
  url: string;
  created: Date;
  subreddit: string;
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
}

// Export the dataflow compatible type
export type RedditPost = DataflowRedditPost;

export interface RedditSearchOptions {
  subreddit?: string;
  limit?: number;
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  sort?: 'relevance' | 'hot' | 'top' | 'new';
}

export interface SubredditAnalysis {
  subreddit: string;
  posts: RedditPost[];
  sentiment: {
    overall: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  metrics: {
    totalPosts: number;
    averageScore: number;
    totalComments: number;
  };
}

export class RedditServiceClient {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(serviceUrl: string = 'http://reddit-service:3001') {
    this.client = axios.create({
      baseURL: serviceUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TradingAgents/1.0'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('http_request', 'Reddit service request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('http_request', 'Reddit service request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('http_response', 'Reddit service response', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        logger.error('http_response', 'Reddit service response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if Reddit service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      logger.warn('health_check', 'Reddit service health check failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Convert service response to dataflow compatible format
   */
  private convertToDataflowFormat(servicePosts: ServiceRedditPost[]): RedditPost[] {
    return servicePosts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.body,
      author: post.author,
      score: post.score,
      numComments: post.comments,
      createdUtc: post.created.toISOString(),
      url: post.url,
      subreddit: post.subreddit
    }));
  }

  /**
   * Search Reddit posts with caching
   */
  async searchPosts(query: string, options: RedditSearchOptions = {}): Promise<RedditPost[]> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      logger.debug('cache_hit', 'Returning cached Reddit search results', { query, cacheKey });
      return cached;
    }

    try {
      const response: AxiosResponse<ServiceRedditPost[]> = await this.client.get('/api/search', {
        params: { query, ...options }
      });

      const servicePosts = response.data;
      const posts = this.convertToDataflowFormat(servicePosts);
      this.setCached(cacheKey, posts);
      
      logger.info('search_completed', 'Reddit search completed', {
        query,
        resultsCount: posts.length,
        subreddit: options.subreddit
      });
      
      return posts;
    } catch (error) {
      logger.error('search_failed', 'Reddit search failed', {
        query,
        options,
        error: (error as Error).message
      });
      throw new Error(`Reddit search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get posts from a specific subreddit
   */
  async getSubredditPosts(subreddit: string, options: Omit<RedditSearchOptions, 'subreddit'> = {}): Promise<RedditPost[]> {
    const cacheKey = `subreddit:${subreddit}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      logger.debug('cache_hit', 'Returning cached subreddit posts', { subreddit, cacheKey });
      return cached;
    }

    try {
      const response: AxiosResponse<ServiceRedditPost[]> = await this.client.get(`/api/subreddit/${subreddit}`, {
        params: options
      });

      const servicePosts = response.data;
      const posts = this.convertToDataflowFormat(servicePosts);
      this.setCached(cacheKey, posts);
      
      logger.info('subreddit_posts', 'Subreddit posts retrieved', {
        subreddit,
        postsCount: posts.length,
        options
      });
      
      return posts;
    } catch (error) {
      logger.error('subreddit_posts_failed', 'Subreddit posts retrieval failed', {
        subreddit,
        options,
        error: (error as Error).message
      });
      throw new Error(`Subreddit posts retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze subreddit sentiment
   */
  async analyzeSubreddit(subreddit: string, options: Omit<RedditSearchOptions, 'subreddit'> = {}): Promise<SubredditAnalysis> {
    const cacheKey = `analysis:${subreddit}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      logger.debug('cache_hit', 'Returning cached subreddit analysis', { subreddit, cacheKey });
      return cached;
    }

    try {
      const response: AxiosResponse<SubredditAnalysis> = await this.client.get(`/api/analyze/${subreddit}`, {
        params: options
      });

      const analysis = response.data;
      this.setCached(cacheKey, analysis);
      
      logger.info('sentiment_analysis', 'Subreddit sentiment analysis completed', {
        subreddit,
        overallSentiment: analysis.sentiment.overall,
        postsAnalyzed: analysis.metrics.totalPosts
      });
      
      return analysis;
    } catch (error) {
      logger.error('sentiment_analysis_failed', 'Subreddit sentiment analysis failed', {
        subreddit,
        options,
        error: (error as Error).message
      });
      throw new Error(`Subreddit sentiment analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get sentiment for specific posts
   */
  async analyzeSentiment(posts: RedditPost[]): Promise<RedditPost[]> {
    try {
      const response: AxiosResponse<ServiceRedditPost[]> = await this.client.post('/api/sentiment', {
        posts
      });

      const serviceResults = response.data;
      const analyzedPosts = this.convertToDataflowFormat(serviceResults);
      
      logger.info('post_sentiment', 'Post sentiment analysis completed', {
        postsCount: posts.length,
        analyzedCount: analyzedPosts.length
      });
      
      return analyzedPosts;
    } catch (error) {
      logger.error('post_sentiment_failed', 'Post sentiment analysis failed', {
        postsCount: posts.length,
        error: (error as Error).message
      });
      throw new Error(`Post sentiment analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Legacy compatibility method - search by subreddit name
   */
  async getSubreddit(subredditName: string): Promise<{
    getHot: (options?: { limit?: number }) => Promise<RedditPost[]>;
    getTop: (options?: { limit?: number; time?: string }) => Promise<RedditPost[]>;
    search: (options?: { query?: string; limit?: number; time?: string; sort?: string }) => Promise<RedditPost[]>;
  }> {
    const client = this;
    
    return {
      async getHot(options = {}) {
        return client.getSubredditPosts(subredditName, {
          sort: 'hot',
          limit: options.limit || 25
        });
      },
      
      async getTop(options = {}) {
        return client.getSubredditPosts(subredditName, {
          sort: 'top',
          limit: options.limit || 25,
          timeframe: (options.time as any) || 'day'
        });
      },
      
      async search(options = {}) {
        if (options.query) {
          return client.searchPosts(options.query, {
            subreddit: subredditName,
            limit: options.limit || 25,
            timeframe: (options.time as any) || 'day',
            sort: (options.sort as any) || 'relevance'
          });
        }
        return client.getSubredditPosts(subredditName, {
          limit: options.limit || 25
        });
      }
    };
  }

  /**
   * Cache management
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('cache_clear', 'Reddit service cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const redditServiceClient = new RedditServiceClient(
  process.env.REDDIT_SERVICE_URL || 'http://reddit-service:3001'
);

export default redditServiceClient;