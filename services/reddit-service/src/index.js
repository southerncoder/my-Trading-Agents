import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import winston from 'winston';
import dotenv from 'dotenv';
import { RedditAPIClient } from './reddit-client.js';
import { SentimentAnalyzer } from './sentiment-analyzer.js';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'reddit-service.log' })
  ]
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
});

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const totalHits = rejRes.totalHits || 1;
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 1000;

    res.set('Retry-After', Math.round(msBeforeNext / 1000) || 1);
    res.set('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX_REQUESTS || 100);
    res.set('X-RateLimit-Remaining', remainingPoints);
    res.set('X-RateLimit-Reset', new Date(Date.now() + msBeforeNext));

    logger.warn('Rate limit exceeded', { ip: req.ip, totalHits });
    res.status(429).json({ error: 'Too Many Requests', retryAfter: msBeforeNext });
  }
};

// API key authentication middleware
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    logger.warn('API_KEY not configured');
    return next(); // Skip auth if not configured
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('Invalid API key', { ip: req.ip, providedKey: apiKey ? 'PROVIDED' : 'MISSING' });
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
};

// Apply middleware
app.use(rateLimitMiddleware);

// Health check endpoint (before authentication middleware)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.use(authenticateAPI);

// Get posts from specific subreddit with sentiment analysis
app.get('/api/subreddit/:subreddit/posts', cacheMiddleware(300), async (req, res) => {
  try {
    const { subreddit } = req.params;
    const {
      sort = 'hot',
      limit = 25,
      timeframe = 'day',
      analyzeSentiment = 'true'
    } = req.query;

    logger.info('Fetching subreddit posts', { subreddit, sort, limit, timeframe });

    const posts = await redditClient.getSubredditPosts(subreddit, {
      sort,
      limit: parseInt(limit),
      timeframe
    });

    let result = { subreddit, posts, count: posts.length };

    if (analyzeSentiment === 'true') {
      const texts = posts.map(post => `${post.title} ${post.selftext}`).filter(Boolean);
      const sentiment = sentimentAnalyzer.analyzeMultiple(texts);
      
      // Add sentiment to individual posts
      result.posts = posts.map((post, index) => ({
        ...post,
        sentiment: sentimentAnalyzer.analyzeSentiment(`${post.title} ${post.selftext}`),
        mentions: sentimentAnalyzer.extractTradingMentions(`${post.title} ${post.selftext}`)
      }));

      result.overallSentiment = sentiment;
    }

    res.json(result);
  } catch (error) {
    logger.error('Error fetching subreddit posts', { error: error.message, subreddit: req.params.subreddit });
    res.status(500).json({ error: 'Failed to fetch subreddit posts', details: error.message });
  }
});

// Get sentiment analysis for multiple subreddits
app.post('/api/sentiment/analyze', cacheMiddleware(180), async (req, res) => {
  try {
    const { 
      subreddits = ['wallstreetbets', 'investing', 'stocks'],
      limit = 25,
      timeframe = 'day'
    } = req.body;

    logger.info('Analyzing sentiment across subreddits', { subreddits, limit, timeframe });

    const results = await redditClient.getMultipleSubreddits(subreddits, {
      limit: parseInt(limit),
      timeframe
    });

    const analysis = results.map(({ subreddit, posts, error }) => {
      if (error) {
        return { subreddit, error, sentiment: null, posts: [] };
      }

      const texts = posts.map(post => `${post.title} ${post.selftext}`).filter(Boolean);
      const sentiment = sentimentAnalyzer.analyzeMultiple(texts);

      // Extract all trading mentions
      const allMentions = posts.flatMap(post => 
        sentimentAnalyzer.extractTradingMentions(`${post.title} ${post.selftext}`)
      );

      // Aggregate ticker mentions
      const tickerCounts = {};
      allMentions.forEach(mention => {
        mention.tickers.forEach(ticker => {
          tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
        });
      });

      return {
        subreddit,
        sentiment,
        postCount: posts.length,
        topTickers: Object.entries(tickerCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([ticker, count]) => ({ ticker, mentions: count })),
        posts: posts.slice(0, 5).map(post => ({
          id: post.id,
          title: post.title,
          score: post.score,
          sentiment: sentimentAnalyzer.analyzeSentiment(`${post.title} ${post.selftext}`)
        }))
      };
    });

    // Calculate overall sentiment across all subreddits
    const allTexts = results.flatMap(result => 
      result.posts.map(post => `${post.title} ${post.selftext}`)
    ).filter(Boolean);

    const overallSentiment = sentimentAnalyzer.analyzeMultiple(allTexts);

    res.json({
      timestamp: new Date().toISOString(),
      overallSentiment,
      subredditAnalysis: analysis,
      summary: {
        totalPosts: results.reduce((sum, result) => sum + result.posts.length, 0),
        averageSentiment: overallSentiment.score,
        sentiment: overallSentiment.classification
      }
    });
  } catch (error) {
    logger.error('Error analyzing sentiment', { error: error.message });
    res.status(500).json({ error: 'Failed to analyze sentiment', details: error.message });
  }
});

// Search posts by ticker or keyword
app.get('/api/search', cacheMiddleware(300), async (req, res) => {
  try {
    const {
      query,
      subreddit,
      sort = 'relevance',
      timeframe = 'week',
      limit = 25
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    logger.info('Searching posts', { query, subreddit, sort, timeframe, limit });

    const posts = await redditClient.searchPosts(query, {
      subreddit,
      sort,
      timeframe,
      limit: parseInt(limit)
    });

    // Analyze sentiment and extract mentions
    const results = posts.map(post => ({
      ...post,
      sentiment: sentimentAnalyzer.analyzeSentiment(`${post.title} ${post.selftext}`),
      mentions: sentimentAnalyzer.extractTradingMentions(`${post.title} ${post.selftext}`)
    }));

    const texts = posts.map(post => `${post.title} ${post.selftext}`).filter(Boolean);
    const overallSentiment = sentimentAnalyzer.analyzeMultiple(texts);

    res.json({
      query,
      posts: results,
      count: results.length,
      overallSentiment
    });
  } catch (error) {
    logger.error('Error searching posts', { error: error.message, query: req.query.query });
    res.status(500).json({ error: 'Failed to search posts', details: error.message });
  }
});

// Get comments for a specific post
app.get('/api/post/:subreddit/:postId/comments', cacheMiddleware(600), async (req, res) => {
  try {
    const { subreddit, postId } = req.params;
    const { limit = 50, analyzeSentiment = 'true' } = req.query;

    logger.info('Fetching post comments', { subreddit, postId, limit });

    const comments = await redditClient.getPostComments(subreddit, postId, {
      limit: parseInt(limit)
    });

    let result = { subreddit, postId, comments, count: comments.length };

    if (analyzeSentiment === 'true') {
      const texts = comments.map(comment => comment.body).filter(Boolean);
      const sentiment = sentimentAnalyzer.analyzeMultiple(texts);

      result.comments = comments.map(comment => ({
        ...comment,
        sentiment: sentimentAnalyzer.analyzeSentiment(comment.body),
        mentions: sentimentAnalyzer.extractTradingMentions(comment.body)
      }));

      result.overallSentiment = sentiment;
    }

    res.json(result);
  } catch (error) {
    logger.error('Error fetching comments', { error: error.message, postId: req.params.postId });
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
});

// Get service statistics
app.get('/api/stats', (req, res) => {
  res.json({
    cacheSize: cache.size,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
  cache.clear();
  logger.info('Cache cleared manually');
  res.json({ message: 'Cache cleared successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Reddit sentiment service running on port ${port}`);
  console.log(`🚀 Reddit Sentiment Service running on http://0.0.0.0:${port}`);
  console.log(`📊 Health check: http://0.0.0.0:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});