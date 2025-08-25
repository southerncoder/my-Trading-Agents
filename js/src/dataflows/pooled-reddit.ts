/**
 * Connection Pooled Reddit API
 * 
 * Enhanced version of Reddit API that uses connection pooling
 * for improved performance and reduced connection overhead.
 */

import { TradingAgentsConfig } from '../types/config';
import { 
  globalConnectionPool, 
  PooledHttpClient, 
  DefaultPoolConfigs,
  PooledClientConfig 
} from '../performance/connection-pooling';
import { createLogger } from '../utils/enhanced-logger';

export class PooledRedditAPI {
  private readonly logger = createLogger('dataflow', 'PooledRedditAPI');
  private client: PooledHttpClient;
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;

    const clientConfig: PooledClientConfig = {
      baseURL: 'https://www.reddit.com',
      timeout: 30000,
      retries: 3,
      retryDelay: 2000, // Reddit can be slower
      concurrentLimit: 3, // Be respectful to Reddit's servers
      poolConfig: DefaultPoolConfigs.reddit,
      headers: {
        'User-Agent': 'TradingAgents/1.0 (https://github.com/trading-agents)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    this.client = globalConnectionPool.getClient('reddit', clientConfig);
    
    this.logger.info('constructor', 'Pooled Reddit API initialized', {
      baseURL: clientConfig.baseURL,
      concurrentLimit: clientConfig.concurrentLimit
    });
  }

  /**
   * Search Reddit posts using pooled connections
   */
  async searchPosts(query: string, subreddit?: string, limit: number = 25): Promise<string> {
    try {
      const searchUrl = subreddit ? `/r/${subreddit}/search.json` : '/search.json';
      
      this.logger.info('searchPosts', 'Searching Reddit posts', {
        query,
        subreddit,
        limit
      });

      const params: any = {
        q: query,
        sort: 'relevance',
        limit: Math.min(limit, 100), // Reddit API limit
        t: 'month' // Time period: month for recent relevance
      };

      if (subreddit) {
        params.restrict_sr = 'true'; // Restrict search to subreddit
      }

      const response = await this.client.request({
        method: 'GET',
        url: searchUrl,
        params,
        timeout: 25000
      });

      if (response.data && response.data.data && response.data.data.children) {
        const posts = response.data.data.children;
        
        this.logger.info('searchPosts', 'Reddit posts retrieved successfully', {
          query,
          subreddit,
          postsCount: posts.length
        });

        return JSON.stringify({
          query,
          subreddit: subreddit || 'all',
          count: posts.length,
          posts: posts.map((post: any) => ({
            title: post.data.title,
            author: post.data.author,
            score: post.data.score,
            num_comments: post.data.num_comments,
            created_utc: post.data.created_utc,
            url: post.data.url,
            permalink: `https://reddit.com${post.data.permalink}`,
            selftext: post.data.selftext ? post.data.selftext.substring(0, 500) : '',
            subreddit: post.data.subreddit
          })),
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No posts found for query: ${query}`;
      }

    } catch (error) {
      this.logger.error('searchPosts', 'Failed to search Reddit posts', {
        query,
        subreddit,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error searching Reddit for "${query}": ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get hot posts from a subreddit using pooled connections
   */
  async getHotPosts(subreddit: string, limit: number = 25): Promise<string> {
    try {
      this.logger.info('getHotPosts', 'Fetching hot posts', {
        subreddit,
        limit
      });

      const response = await this.client.request({
        method: 'GET',
        url: `/r/${subreddit}/hot.json`,
        params: {
          limit: Math.min(limit, 100)
        },
        timeout: 25000
      });

      if (response.data && response.data.data && response.data.data.children) {
        const posts = response.data.data.children;
        
        this.logger.info('getHotPosts', 'Hot posts retrieved successfully', {
          subreddit,
          postsCount: posts.length
        });

        return JSON.stringify({
          subreddit,
          type: 'hot',
          count: posts.length,
          posts: posts.map((post: any) => ({
            title: post.data.title,
            author: post.data.author,
            score: post.data.score,
            num_comments: post.data.num_comments,
            created_utc: post.data.created_utc,
            url: post.data.url,
            permalink: `https://reddit.com${post.data.permalink}`,
            selftext: post.data.selftext ? post.data.selftext.substring(0, 500) : '',
            ups: post.data.ups,
            downs: post.data.downs
          })),
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No hot posts found in r/${subreddit}`;
      }

    } catch (error) {
      this.logger.error('getHotPosts', 'Failed to fetch hot posts', {
        subreddit,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching hot posts from r/${subreddit}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get top posts from a subreddit using pooled connections
   */
  async getTopPosts(subreddit: string, timeFrame: string = 'week', limit: number = 25): Promise<string> {
    try {
      this.logger.info('getTopPosts', 'Fetching top posts', {
        subreddit,
        timeFrame,
        limit
      });

      const response = await this.client.request({
        method: 'GET',
        url: `/r/${subreddit}/top.json`,
        params: {
          t: timeFrame, // hour, day, week, month, year, all
          limit: Math.min(limit, 100)
        },
        timeout: 25000
      });

      if (response.data && response.data.data && response.data.data.children) {
        const posts = response.data.data.children;
        
        this.logger.info('getTopPosts', 'Top posts retrieved successfully', {
          subreddit,
          timeFrame,
          postsCount: posts.length
        });

        return JSON.stringify({
          subreddit,
          type: 'top',
          timeFrame,
          count: posts.length,
          posts: posts.map((post: any) => ({
            title: post.data.title,
            author: post.data.author,
            score: post.data.score,
            num_comments: post.data.num_comments,
            created_utc: post.data.created_utc,
            url: post.data.url,
            permalink: `https://reddit.com${post.data.permalink}`,
            selftext: post.data.selftext ? post.data.selftext.substring(0, 500) : '',
            ups: post.data.ups,
            upvote_ratio: post.data.upvote_ratio
          })),
          timestamp: new Date().toISOString()
        }, null, 2);
      } else {
        return `No top posts found in r/${subreddit} for ${timeFrame}`;
      }

    } catch (error) {
      this.logger.error('getTopPosts', 'Failed to fetch top posts', {
        subreddit,
        timeFrame,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching top posts from r/${subreddit}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get post comments using pooled connections
   */
  async getPostComments(subreddit: string, postId: string, limit: number = 10): Promise<string> {
    try {
      this.logger.info('getPostComments', 'Fetching post comments', {
        subreddit,
        postId,
        limit
      });

      const response = await this.client.request({
        method: 'GET',
        url: `/r/${subreddit}/comments/${postId}.json`,
        params: {
          limit: Math.min(limit, 50)
        },
        timeout: 25000
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 1) {
        const commentsData = response.data[1];
        
        if (commentsData.data && commentsData.data.children) {
          const comments = commentsData.data.children;
          
          this.logger.info('getPostComments', 'Post comments retrieved successfully', {
            subreddit,
            postId,
            commentsCount: comments.length
          });

          return JSON.stringify({
            subreddit,
            postId,
            count: comments.length,
            comments: comments.map((comment: any) => ({
              author: comment.data.author,
              body: comment.data.body ? comment.data.body.substring(0, 1000) : '',
              score: comment.data.score,
              created_utc: comment.data.created_utc,
              permalink: `https://reddit.com${comment.data.permalink}`,
              ups: comment.data.ups,
              is_submitter: comment.data.is_submitter
            })),
            timestamp: new Date().toISOString()
          }, null, 2);
        }
      }
      
      return `No comments found for post ${postId} in r/${subreddit}`;

    } catch (error) {
      this.logger.error('getPostComments', 'Failed to fetch post comments', {
        subreddit,
        postId,
        error: error instanceof Error ? error.message : String(error)
      });

      return `Error fetching comments for post ${postId}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return this.client.getStats();
  }

  /**
   * Dispose the client
   */
  dispose(): void {
    this.client.dispose();
    this.logger.info('dispose', 'Pooled Reddit API disposed');
  }
}