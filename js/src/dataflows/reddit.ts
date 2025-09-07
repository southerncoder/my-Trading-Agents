/**
 * Reddit API for Social Trading Data
 * 
 * Provides social sentiment analysis from Reddit for trading decisions.
 * Integrates with subreddits like r/investing, r/stocks, r/wallstreetbets
 * for market sentiment and discussion trends.
 * 
 * Uses isolated Reddit service with native API integration for security.
 */

import { redditServiceClient } from '../clients/reddit-service-client';
import { TradingAgentsConfig } from '@/types/config';
import { RedditPost } from '@/types/dataflows';
import { createLogger } from '../utils/enhanced-logger.js';
import { 
  withDataflowResilience, 
  REDDIT_API_CONFIG, 
  DataflowMetricsCollector 
} from '../utils/resilient-dataflow.js';

export interface RedditSentimentAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  mentions: number;
  posts: RedditPost[];
  analysis: {
    total_score: number;
    average_sentiment: number;
    trending_topics: string[];
    volume_trend: 'increasing' | 'decreasing' | 'stable';
    subreddit_breakdown: Record<string, {
      mentions: number;
      average_score: number;
      sentiment: 'bullish' | 'bearish' | 'neutral';
    }>;
  };
}

export interface RedditConfig {
  userAgent: string;
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  username?: string;
  password?: string;
}

/**
 * Reddit API wrapper using snoowrap with OAuth for social sentiment analysis
 * Enhanced with resilient patterns for robust external API integration
 * 
 * TODO: Core Social Media Integration Improvements Needed:
 * =======================================================
 * 
 * 1. MULTIPLE SOCIAL MEDIA PROVIDERS:
 *    - Add Twitter/X API for financial discussions
 *    - Add StockTwits API for trader sentiment
 *    - Add Discord financial communities monitoring
 *    - Add Telegram financial channels integration
 *    - Add YouTube financial content analysis
 *    - Implement cross-platform sentiment aggregation
 * 
 * 2. ENHANCED SENTIMENT ANALYSIS:
 *    - Add real-time sentiment scoring algorithms
 *    - Implement emotion detection (fear, greed, optimism)
 *    - Add influencer sentiment weighting
 *    - Add viral content detection and impact measurement
 *    - Implement sentiment trend analysis and prediction
 * 
 * 3. ADVANCED SOCIAL MONITORING:
 *    - Add mentions tracking across platforms
 *    - Implement hashtag and keyword trend analysis
 *    - Add social volume and engagement metrics
 *    - Add bot detection and filtering algorithms
 *    - Implement pump-and-dump scheme detection
 * 
 * 4. SOCIAL DATA CACHING & PROCESSING:
 *    - Implement Redis-based social data caching
 *    - Add local social database with analytics
 *    - Add social data archival for historical analysis
 *    - Add real-time social alerts and notifications
 * 
 * 5. FINANCIAL COMMUNITY INTEGRATION:
 *    - Add r/wallstreetbets specialized monitoring
 *    - Add r/investing and r/SecurityAnalysis tracking
 *    - Add FinTwit (Financial Twitter) influencer tracking
 *    - Add Discord trading communities monitoring
 *    - Add Telegram premium trading groups integration
 * 
 * 6. SOCIAL ANALYTICS & INSIGHTS:
 *    - Add social sentiment correlation with price movements
 *    - Implement social momentum indicators
 *    - Add crowd psychology analysis
 *    - Add social trading signals generation
 *    - Implement social risk assessment metrics
 */
export class RedditAPI {
  private config: TradingAgentsConfig;
  private redditClient = redditServiceClient;
  private redditConfig: RedditConfig | null = null;
  private logger = createLogger('dataflow', 'reddit-api');
  private metrics = new DataflowMetricsCollector();
  
  // Popular trading-related subreddits
  private readonly tradingSubreddits = [
    'investing',
    'stocks',
    'SecurityAnalysis',
    'ValueInvesting',
    'financialindependence',
    'StockMarket',
    'wallstreetbets',  // Note: High volatility content
    'options',
    'pennystocks',
    'dividends'
  ];

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    
    // Check if Reddit is enabled via feature switch
    const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
    
    if (!redditEnabled) {
      this.logger.info('constructor', 'Reddit API disabled via REDDIT_ENABLED feature switch', {
        enabled: false,
        featureSwitch: process.env.REDDIT_ENABLED || 'undefined'
      });
      return; // Skip initialization if disabled
    }
    
    this.initializeRedditConfig();
    
    this.logger.info('constructor', 'Initializing Reddit service client', {
      enabled: true,
      serviceUrl: process.env.REDDIT_SERVICE_URL || 'http://reddit-service:3001'
    });
    
    // Initialize service connection (async, but don't wait)
    this.initRedditAPI().catch(error => {
      this.logger.warn('constructor', 'Failed to initialize Reddit service connection', {
        error: error.message
      });
    });
  }

  private initializeRedditConfig(): void {
    // Load Reddit OAuth configuration from environment variables
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    const userAgent = process.env.REDDIT_USER_AGENT || 'TradingAgents:v1.0.0 (by /u/your_username)';

    if (!clientId || !clientSecret) {
      this.logger.warn('config-missing', 'Reddit OAuth credentials not configured', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        suggestion: 'Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables'
      });
      return;
    }

    // Store basic config for logging purposes (service client handles authentication)
    this.redditConfig = {
      userAgent,
      clientId,
      clientSecret,
      ...(refreshToken && { refreshToken }),
      ...(username && { username }),
      ...(password && { password })
    };
  }

  /**
   * Initialize Reddit service client connection
   */
  private async initRedditAPI() {
    try {
      // Check if Reddit service is healthy
      const isHealthy = await this.redditClient.healthCheck();
      if (isHealthy) {
        this.logger.info('service-init', 'Reddit service connection established');
      } else {
        this.logger.warn('service-unhealthy', 'Reddit service is not responding properly');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('service-init-failed', 'Failed to connect to Reddit service', {
        error: errorMessage,
        suggestion: 'Ensure Reddit service is running and accessible'
      });
    }
  }

  /**
   * Get posts from specified subreddits for ticker symbols
   */
  async getPosts(symbols: string[]): Promise<RedditPost[]> {
    // Check if Reddit is enabled
    const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
    if (!redditEnabled) {
      this.logger.info('reddit-disabled', 'Reddit API disabled via feature switch', {
        symbols,
        enabled: false
      });
      return [];
    }

    // Check if Reddit service is available
    const isHealthy = await this.redditClient.healthCheck();
    if (!isHealthy) {
      this.logger.warn('reddit-service-unavailable', 'Reddit service not available, cannot fetch posts');
      return [];
    }

    return withDataflowResilience(
      `reddit-posts-${symbols.join('-')}`,
      async () => {
        const posts: RedditPost[] = [];
        
        for (const symbol of symbols) {
          try {
            // Search for posts mentioning the symbol
            const searchResults = await this.searchSymbolMentions(symbol);
            posts.push(...searchResults);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('symbol-search-failed', `Failed to search for ${symbol}`, {
              symbol,
              error: errorMessage
            });
          }
        }

        this.logger.info('posts-fetched', 'Reddit posts fetched successfully', {
          symbolCount: symbols.length,
          postCount: posts.length
        });

        return posts.sort((a, b) => b.score - a.score).slice(0, 50); // Top 50 posts
      },
      REDDIT_API_CONFIG
    ).catch((error) => {
      this.logger.error('posts-fetch-failed', 'Failed to fetch Reddit posts', {
        symbols,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    });
  }

  /**
   * Search for posts mentioning a specific symbol across trading subreddits
   */
  private async searchSymbolMentions(symbol: string): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    
    for (const subredditName of this.tradingSubreddits) {
      try {
        // Search for the symbol in the subreddit using service client
        const searchResults = await this.redditClient.searchPosts(symbol, {
          subreddit: subredditName,
          sort: 'relevance',
          timeframe: 'week',
          limit: 10
        });

        posts.push(...searchResults);
        
        this.logger.debug('subreddit-searched', `Searched r/${subredditName} for ${symbol}`, {
          symbol,
          subreddit: subredditName,
          resultsCount: searchResults.length
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('subreddit-search-failed', `Failed to search r/${subredditName}`, {
          subreddit: subredditName,
          symbol,
          error: errorMessage
        });
      }
    }

    return posts;
  }

  /**
   * Get global news from Reddit with resilient patterns
   */
  async getGlobalNews(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    return withDataflowResilience(
      'reddit-global-news',
      async () => {
        this.logger.info('get-global-news', 'Fetching global news from Reddit', {
          startDate,
          lookBackDays,
          maxLimitPerDay
        });

        const isHealthy = await this.redditClient.healthCheck();
        if (!isHealthy) {
          return this.getFallbackGlobalNews(startDate);
        }

        const globalPosts = await this.fetchGlobalPosts(startDate, lookBackDays, maxLimitPerDay);
        
        if (globalPosts.length === 0) {
          this.logger.warn('no-global-news', 'No global financial news found on Reddit', {
            startDate,
            lookBackDays
          });
          return `## Global News Reddit:\n\nNo global financial news found on Reddit.`;
        }

        this.logger.info('global-news-fetched', 'Global news fetched successfully from Reddit', {
          postsCount: globalPosts.length,
          startDate,
          lookBackDays
        });

        let newsStr = '';
        for (const post of globalPosts) {
          const createdDate = new Date(post.createdUtc).toLocaleDateString();
          newsStr += `### ${post.title} (r/${post.subreddit || 'unknown'}, ${createdDate})\n\n`;
          newsStr += `Score: ${post.score} | Comments: ${post.numComments}\n\n`;
          
          if (post.content && post.content.length > 0) {
            const preview = post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content;
            newsStr += `${preview}\n\n`;
          }
          
          newsStr += `[View on Reddit](https://reddit.com${post.url})\n\n`;
        }

        const beforeDate = new Date(startDate);
        beforeDate.setDate(beforeDate.getDate() - lookBackDays);

        return `## Global News Reddit, from ${beforeDate.toISOString().split('T')[0]} to ${startDate}:\n\n${newsStr}`;
      },
      REDDIT_API_CONFIG
    ).catch((error) => {
      this.logger.error('global-news-error', 'Error fetching Reddit global news', {
        error: error instanceof Error ? error.message : String(error),
        startDate,
        lookBackDays
      });
      return this.getFallbackGlobalNews(startDate);
    });
  }

  /**
   * Get company-specific news from Reddit with resilient patterns
   */
  async getCompanyNews(ticker: string, startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    return withDataflowResilience(
      `reddit-company-news-${ticker}`,
      async () => {
        this.logger.info('get-company-news', `Fetching company news for ${ticker} from Reddit`, {
          ticker,
          startDate,
          lookBackDays,
          maxLimitPerDay
        });

        const isHealthy = await this.redditClient.healthCheck();
        if (!isHealthy) {
          return this.getFallbackNews(ticker, startDate);
        }

        const companyPosts = await this.fetchCompanyPosts(ticker, startDate, lookBackDays, maxLimitPerDay);
        
        if (companyPosts.length === 0) {
          this.logger.warn('no-company-news', `No Reddit posts found for ${ticker}`, {
            ticker,
            startDate,
            lookBackDays
          });
          return `## ${ticker} News Reddit:\n\nNo Reddit posts found for ${ticker}.`;
        }

        this.logger.info('company-news-fetched', `Company news fetched successfully for ${ticker}`, {
          ticker,
          postsCount: companyPosts.length,
          startDate,
          lookBackDays
        });

        let newsStr = '';
        for (const post of companyPosts) {
          const createdDate = new Date(post.createdUtc).toLocaleDateString();
          newsStr += `### ${post.title} (r/${post.subreddit || 'unknown'}, ${createdDate})\n\n`;
          newsStr += `Score: ${post.score} | Comments: ${post.numComments} | Author: u/${post.author || 'unknown'}\n\n`;
          
          if (post.content && post.content.length > 0) {
            const preview = post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content;
            newsStr += `${preview}\n\n`;
          }
          
          newsStr += `[View on Reddit](https://reddit.com${post.url})\n\n`;
        }

        const beforeDate = new Date(startDate);
        beforeDate.setDate(beforeDate.getDate() - lookBackDays);

        return `## ${ticker} News Reddit, from ${beforeDate.toISOString().split('T')[0]} to ${startDate}:\n\n${newsStr}`;
      },
      REDDIT_API_CONFIG
    ).catch((error) => {
      this.logger.error('company-news-error', `Error fetching Reddit news for ${ticker}`, {
        ticker,
        startDate,
        lookBackDays,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getFallbackNews(ticker, startDate);
    });
  }

  /**
   * Fetch global posts from Reddit using snoowrap
   */
  private async fetchGlobalPosts(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    const subreddits = ['investing', 'SecurityAnalysis', 'economics', 'finance', 'StockMarket'];
    
    for (const subredditName of subreddits) {
      try {
        const subredditPosts = await this.redditClient.getSubredditPosts(subredditName, {
          sort: 'hot',
          limit: Math.min(maxLimitPerDay, 10)
        });

        posts.push(...subredditPosts);
      } catch (error) {
        this.logger.warn('subreddit-fetch-failed', `Failed to fetch from r/${subredditName}`, {
          subreddit: subredditName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Filter recent posts and sort by score
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - lookBackDays);
    
    return posts
      .filter(post => new Date(post.createdUtc) >= recentCutoff)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLimitPerDay);
  }

  /**
   * Fetch company-specific posts from Reddit using service client
   */
  private async fetchCompanyPosts(ticker: string, _startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    const subreddits = ['investing', 'stocks', 'SecurityAnalysis', 'ValueInvesting'];
    
    for (const subredditName of subreddits) {
      try {
        const searchResults = await this.redditClient.searchPosts(ticker, {
          subreddit: subredditName,
          sort: 'relevance',
          timeframe: lookBackDays <= 7 ? 'week' : 'month',
          limit: Math.min(maxLimitPerDay, 25)
        });

        posts.push(...searchResults);
      } catch (error) {
        this.logger.warn('company-search-failed', `Failed to search r/${subredditName} for ${ticker}`, {
          subreddit: subredditName,
          ticker,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Sort by score and take top posts
    return posts
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLimitPerDay * 2);
  }

  /**
   * TODO: Implement comprehensive social media sentiment fallback
   * 
   * This method should provide:
   * - Cached social sentiment data for offline analysis
   * - Alternative sentiment data sources integration
   * - Sentiment trend analysis from multiple platforms
   * - Social media backup providers configuration
   */
  private getFallbackNews(ticker: string, startDate: string): string {
    this.logger.warn('reddit-fallback-unavailable', `Reddit fallback data unavailable for ${ticker}`, {
      ticker,
      startDate,
      reason: 'No social media data providers configured'
    });

    return `## ${ticker} Social Media Data Unavailable\n\n**Reddit data not accessible** - Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.\n\n*TODO: Implement alternative social media data providers and sentiment caching.*`;
  }

  /**
   * TODO: Implement global social sentiment aggregation fallback
   * 
   * This method should provide:
   * - Cached global sentiment data for offline analysis
   * - Economic news sentiment from alternative sources
   * - Market sentiment indicators from backup providers
   * - Financial forum sentiment aggregation
   */
  private getFallbackGlobalNews(startDate: string): string {
    this.logger.warn('reddit-global-fallback-unavailable', 'Reddit global fallback data unavailable', {
      startDate,
      reason: 'No social media data providers configured'
    });

    return `## Global Social Media Data Unavailable\n\n**Reddit data not accessible** - Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.\n\n*TODO: Implement alternative global sentiment data providers and trend analysis.*`;
  }

  /**
   * Test connection to Reddit API
   */
  async testConnection(): Promise<boolean> {
    // Check if Reddit is enabled
    const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
    if (!redditEnabled) {
      this.logger.info('test-connection-disabled', 'Reddit API disabled via feature switch', {
        enabled: false
      });
      return false;
    }

    try {
      // Test connection to Reddit service
      const isHealthy = await this.redditClient.healthCheck();
      if (isHealthy) {
        this.logger.info('test-connection-success', 'Reddit service connection successful');
        return true;
      } else {
        this.logger.warn('test-connection-unhealthy', 'Reddit service is not healthy');
        return false;
      }
    } catch (error) {
      this.logger.error('test-connection-error', 'Reddit service connection failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Analyze sentiment for a ticker symbol using Reddit data
   */
  async analyzeSentiment(symbol: string): Promise<RedditSentimentAnalysis> {
    // Check if Reddit is enabled
    const redditEnabled = process.env.REDDIT_ENABLED?.toLowerCase() === 'true';
    if (!redditEnabled) {
      this.logger.info('reddit-sentiment-disabled', 'Reddit sentiment analysis disabled via feature switch', {
        symbol,
        enabled: false
      });
      
      return {
        symbol,
        sentiment: 'neutral',
        confidence: 0,
        mentions: 0,
        posts: [],
        analysis: {
          total_score: 0,
          average_sentiment: 0,
          trending_topics: ['Reddit disabled'],
          volume_trend: 'stable',
          subreddit_breakdown: {}
        }
      };
    }

    const posts = await this.getPosts([symbol]);
    
    if (posts.length === 0) {
      return {
        symbol,
        sentiment: 'neutral',
        confidence: 0,
        mentions: 0,
        posts: [],
        analysis: {
          total_score: 0,
          average_sentiment: 0,
          trending_topics: [],
          volume_trend: 'stable',
          subreddit_breakdown: {}
        }
      };
    }

    // Basic sentiment analysis based on post scores and keywords
    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const averageScore = totalScore / posts.length;
    
    // Simple keyword-based sentiment (can be enhanced with proper NLP)
    const bullishKeywords = ['buy', 'bullish', 'long', 'pump', 'moon', 'rocket', 'positive', 'growth'];
    const bearishKeywords = ['sell', 'bearish', 'short', 'dump', 'crash', 'negative', 'decline', 'fall'];
    
    let sentimentScore = 0;
    
    for (const post of posts) {
      const text = (post.title + ' ' + post.content).toLowerCase();
      const bullishCount = bullishKeywords.filter(keyword => text.includes(keyword)).length;
      const bearishCount = bearishKeywords.filter(keyword => text.includes(keyword)).length;
      
      sentimentScore += (bullishCount - bearishCount) * Math.log(post.score + 1);
    }

    const sentiment: 'bullish' | 'bearish' | 'neutral' = 
      sentimentScore > 0 ? 'bullish' : 
      sentimentScore < 0 ? 'bearish' : 'neutral';

    const confidence = Math.min(Math.abs(sentimentScore) / posts.length, 1);

    // Subreddit breakdown
    const subredditBreakdown: Record<string, any> = {};
    for (const post of posts) {
      const subreddit = post.subreddit || 'unknown';
      if (!subredditBreakdown[subreddit]) {
        subredditBreakdown[subreddit] = {
          mentions: 0,
          average_score: 0,
          sentiment: 'neutral'
        };
      }
      subredditBreakdown[subreddit].mentions++;
      subredditBreakdown[subreddit].average_score += post.score;
    }

    // Calculate averages
    for (const subreddit in subredditBreakdown) {
      const data = subredditBreakdown[subreddit];
      data.average_score = data.average_score / data.mentions;
      data.sentiment = data.average_score > averageScore ? 'bullish' : 
                     data.average_score < averageScore ? 'bearish' : 'neutral';
    }

    return {
      symbol,
      sentiment,
      confidence,
      mentions: posts.length,
      posts: posts.slice(0, 20), // Top 20 posts
      analysis: {
        total_score: totalScore,
        average_sentiment: sentimentScore / posts.length,
        trending_topics: [], // TODO: Extract trending topics from post titles
        volume_trend: 'stable', // TODO: Compare with historical data
        subreddit_breakdown: subredditBreakdown
      }
    };
  }
}