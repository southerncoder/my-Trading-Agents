import fetch from 'node-fetch';

/**
 * Modern Reddit API client using native fetch
 * Replaces snoowrap with secure, minimal dependencies
 */
export class RedditAPIClient {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
    this.userAgent = config.userAgent || 'TradingAgents/1.0';
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://www.reddit.com';
    this.oauthUrl = 'https://oauth.reddit.com';
  }

  /**
   * Authenticate with Reddit API using OAuth2
   */
  async authenticate() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.username,
        password: this.password
      })
    });

    if (!response.ok) {
      throw new Error(`Reddit authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    await this.authenticate();

    const url = endpoint.startsWith('http') ? endpoint : `${this.oauthUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get posts from a subreddit
   */
  async getSubredditPosts(subreddit, options = {}) {
    const {
      sort = 'hot',
      limit = 25,
      timeframe = 'day'
    } = options;

    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      t: timeframe
    });

    const endpoint = `/r/${subreddit}/${sort}?${params}`;
    const data = await this.makeRequest(endpoint);

    return data.data.children.map(post => ({
      id: post.data.id,
      title: post.data.title,
      selftext: post.data.selftext,
      url: post.data.url,
      score: post.data.score,
      upvoteRatio: post.data.upvote_ratio,
      numComments: post.data.num_comments,
      created: new Date(post.data.created_utc * 1000),
      author: post.data.author,
      permalink: post.data.permalink,
      subreddit: post.data.subreddit,
      flair: post.data.link_flair_text
    }));
  }

  /**
   * Get comments for a specific post
   */
  async getPostComments(subreddit, postId, options = {}) {
    const { limit = 50, sort = 'best' } = options;
    
    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      sort
    });

    const endpoint = `/r/${subreddit}/comments/${postId}?${params}`;
    const data = await this.makeRequest(endpoint);

    // Reddit returns an array with post data and comments data
    const commentsData = data[1];
    
    return this.flattenComments(commentsData.data.children);
  }

  /**
   * Flatten nested comment structure
   */
  flattenComments(comments, depth = 0) {
    const flattened = [];

    for (const comment of comments) {
      if (comment.kind === 't1' && comment.data.body) {
        flattened.push({
          id: comment.data.id,
          body: comment.data.body,
          score: comment.data.score,
          author: comment.data.author,
          created: new Date(comment.data.created_utc * 1000),
          depth,
          parentId: comment.data.parent_id
        });

        // Recursively process replies
        if (comment.data.replies && comment.data.replies.data) {
          flattened.push(...this.flattenComments(
            comment.data.replies.data.children, 
            depth + 1
          ));
        }
      }
    }

    return flattened;
  }

  /**
   * Search for posts across Reddit
   */
  async searchPosts(query, options = {}) {
    const {
      subreddit = null,
      sort = 'relevance',
      timeframe = 'all',
      limit = 25
    } = options;

    const params = new URLSearchParams({
      q: query,
      sort,
      t: timeframe,
      limit: Math.min(limit, 100).toString(),
      type: 'link'
    });

    const endpoint = subreddit 
      ? `/r/${subreddit}/search?${params}`
      : `/search?${params}`;

    const data = await this.makeRequest(endpoint);

    return data.data.children.map(post => ({
      id: post.data.id,
      title: post.data.title,
      selftext: post.data.selftext,
      url: post.data.url,
      score: post.data.score,
      upvoteRatio: post.data.upvote_ratio,
      numComments: post.data.num_comments,
      created: new Date(post.data.created_utc * 1000),
      author: post.data.author,
      permalink: post.data.permalink,
      subreddit: post.data.subreddit,
      flair: post.data.link_flair_text
    }));
  }

  /**
   * Get user information
   */
  async getUser(username) {
    const endpoint = `/user/${username}/about`;
    const data = await this.makeRequest(endpoint);

    return {
      name: data.data.name,
      created: new Date(data.data.created_utc * 1000),
      commentKarma: data.data.comment_karma,
      linkKarma: data.data.link_karma,
      isVerified: data.data.verified
    };
  }

  /**
   * Get multiple subreddits data in parallel
   */
  async getMultipleSubreddits(subreddits, options = {}) {
    const promises = subreddits.map(subreddit => 
      this.getSubredditPosts(subreddit, options)
        .then(posts => ({ subreddit, posts, error: null }))
        .catch(error => ({ subreddit, posts: [], error: error.message }))
    );

    return Promise.all(promises);
  }
}