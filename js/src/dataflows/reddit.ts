import { TradingAgentsConfig } from '@/types/config';
import { RedditPost } from '@/types/dataflows';
import axios from 'axios';

// Reddit API interfaces
interface RedditApiResponse {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        selftext: string;
        score: number;
        num_comments: number;
        created_utc: number;
        url: string;
        subreddit: string;
        author: string;
        permalink: string;
      };
    }>;
  };
}

/**
 * Reddit API wrapper using official Reddit API for social sentiment analysis
 */
export class RedditAPI {
  private config: TradingAgentsConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
  }

  /**
   * Get Reddit client credentials token (for read-only access)
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.warn('Reddit API credentials not configured');
        return null;
      }

      // Check if current token is still valid
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Get new token using client credentials flow
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'TradingAgents/1.0 by YourUsername'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // 1 min buffer
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Reddit access token:', error);
      return null;
    }
  }

  /**
   * Get global news from Reddit
   */
  async getGlobalNews(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    try {
      const globalPosts = await this.fetchGlobalPosts(startDate, lookBackDays, maxLimitPerDay);
      
      if (globalPosts.length === 0) {
        return `## Global News Reddit:\n\nNo global financial news found on Reddit.`;
      }

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
    } catch (error) {
      console.error('Error fetching Reddit global news:', error);
      return this.getFallbackGlobalNews(startDate);
    }
  }

  /**
   * Get company-specific news from Reddit
   */
  async getCompanyNews(ticker: string, startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    try {
      const companyPosts = await this.fetchCompanyPosts(ticker, startDate, lookBackDays, maxLimitPerDay);
      
      if (companyPosts.length === 0) {
        return `## ${ticker} News Reddit:\n\nNo Reddit posts found for ${ticker}.`;
      }

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
    } catch (error) {
      console.error(`Error fetching Reddit news for ${ticker}:`, error);
      return this.getFallbackNews(ticker, startDate);
    }
  }

  /**
   * Fetch global posts from Reddit
   */
  private async fetchGlobalPosts(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<RedditPost[]> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      return this.getMockGlobalPosts();
    }

    try {
      const posts: RedditPost[] = [];
      const subreddits = ['investing', 'SecurityAnalysis', 'economics', 'finance', 'StockMarket'];
      
      for (const subreddit of subreddits) {
        try {
          const response = await axios.get<RedditApiResponse>(
            `https://oauth.reddit.com/r/${subreddit}/hot`,
            {
              params: {
                limit: Math.min(maxLimitPerDay, 10)
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'TradingAgents/1.0 by YourUsername'
              }
            }
          );

          const subredditPosts = response.data.data.children.map(item => ({
            id: item.data.id,
            title: item.data.title,
            content: item.data.selftext || '',
            score: item.data.score,
            numComments: item.data.num_comments,
            createdUtc: new Date(item.data.created_utc * 1000).toISOString(),
            url: item.data.permalink,
            subreddit: item.data.subreddit,
            author: item.data.author
          }));

          posts.push(...subredditPosts);
        } catch (subError) {
          console.warn(`Error fetching from r/${subreddit}:`, subError);
        }
      }

      // Filter recent posts and sort by score
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - lookBackDays);
      
      return posts
        .filter(post => new Date(post.createdUtc) >= recentCutoff)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxLimitPerDay);
    } catch (error) {
      console.error('Error fetching Reddit global posts:', error);
      return this.getMockGlobalPosts();
    }
  }

  /**
   * Fetch company-specific posts from Reddit
   */
  private async fetchCompanyPosts(ticker: string, _startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<RedditPost[]> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      return this.getMockCompanyPosts(ticker);
    }

    try {
      const posts: RedditPost[] = [];
      const subreddits = ['investing', 'stocks', 'SecurityAnalysis', 'ValueInvesting', ticker.toLowerCase()];
      
      for (const subreddit of subreddits) {
        try {
          const response = await axios.get<RedditApiResponse>(
            `https://oauth.reddit.com/r/${subreddit}/search`,
            {
              params: {
                q: ticker,
                sort: 'relevance',
                t: lookBackDays <= 7 ? 'week' : 'month',
                limit: Math.min(maxLimitPerDay, 25)
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'TradingAgents/1.0 by YourUsername'
              }
            }
          );

          const subredditPosts = response.data.data.children.map(item => ({
            id: item.data.id,
            title: item.data.title,
            content: item.data.selftext || '',
            score: item.data.score,
            numComments: item.data.num_comments,
            createdUtc: new Date(item.data.created_utc * 1000).toISOString(),
            url: item.data.permalink,
            subreddit: item.data.subreddit,
            author: item.data.author
          }));

          posts.push(...subredditPosts);
        } catch (subError) {
          console.warn(`Error fetching from r/${subreddit}:`, subError);
        }
      }

      // Sort by score and take top posts
      return posts
        .sort((a, b) => b.score - a.score)
        .slice(0, maxLimitPerDay * 2);
    } catch (error) {
      console.error('Error fetching Reddit company posts:', error);
      return this.getMockCompanyPosts(ticker);
    }
  }

  /**
   * Mock company posts for fallback
   */
  private getMockCompanyPosts(ticker: string): RedditPost[] {
    return [
      {
        id: 'sample1',
        title: `${ticker} Analysis and Discussion`,
        content: `Discussion about ${ticker} stock performance and future prospects.`,
        score: 150,
        numComments: 45,
        createdUtc: new Date().toISOString(),
        url: '/r/investing/sample1',
        subreddit: 'investing',
        author: 'investor123'
      },
      {
        id: 'sample2',
        title: `${ticker} Earnings Discussion`,
        content: `Analysis of ${ticker} latest earnings report and market implications.`,
        score: 98,
        numComments: 32,
        createdUtc: new Date().toISOString(),
        url: '/r/stocks/sample2',
        subreddit: 'stocks',
        author: 'analyst456'
      }
    ];
  }

  /**
   * Mock global posts for fallback
   */
  private getMockGlobalPosts(): RedditPost[] {
    return [
      {
        id: 'global1',
        title: 'Market Update: Global Economic Trends',
        content: 'Discussion of current global economic trends affecting markets.',
        score: 200,
        numComments: 67,
        createdUtc: new Date().toISOString(),
        url: '/r/investing/global1',
        subreddit: 'investing',
        author: 'economicwatcher'
      },
      {
        id: 'global2',
        title: 'Federal Reserve Policy Impact on Markets',
        content: 'Analysis of how Fed policy changes are affecting investment strategies.',
        score: 175,
        numComments: 43,
        createdUtc: new Date().toISOString(),
        url: '/r/SecurityAnalysis/global2',
        subreddit: 'SecurityAnalysis',
        author: 'fedwatcher'
      }
    ];
  }

  /**
   * Fallback news when API is unavailable
   */
  private getFallbackNews(ticker: string, startDate: string): string {
    const posts = this.getMockCompanyPosts(ticker);
    
    let newsStr = '';
    for (const post of posts) {
      newsStr += `### ${post.title} (r/${post.subreddit})\n\n`;
      newsStr += `Score: ${post.score} | Comments: ${post.numComments}\n\n`;
      newsStr += `${post.content}\n\n`;
    }

    return `## ${ticker} News Reddit (Fallback Data):\n\n${newsStr}\n\n*Note: Using fallback data. Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for live Reddit data.*`;
  }

  /**
   * Fallback global news when API is unavailable
   */
  private getFallbackGlobalNews(startDate: string): string {
    const posts = this.getMockGlobalPosts();
    
    let newsStr = '';
    for (const post of posts) {
      newsStr += `### ${post.title} (r/${post.subreddit})\n\n`;
      newsStr += `Score: ${post.score} | Comments: ${post.numComments}\n\n`;
      newsStr += `${post.content}\n\n`;
    }

    return `## Global News Reddit (Fallback Data):\n\n${newsStr}\n\n*Note: Using fallback data. Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for live Reddit data.*`;
  }
}