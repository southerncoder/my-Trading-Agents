import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import NewsAPI from 'newsapi';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'google-news-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: '/tmp/google-news-service.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize NewsAPI
const NEWS_API_KEY = process.env.NEWS_API_KEY;
let newsapi;

if (NEWS_API_KEY) {
  newsapi = new NewsAPI(NEWS_API_KEY);
  logger.info('NewsAPI initialized successfully');
} else {
  logger.warn('NEWS_API_KEY not provided - service will return fallback data');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'google-news-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    newsApiConfigured: !!NEWS_API_KEY
  });
});

// Get news articles
app.get('/api/news', async (req, res) => {
  try {
    const { q: query, from, to, language = 'en', sortBy = 'relevancy', pageSize = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Query parameter "q" is required'
      });
    }

    if (!NEWS_API_KEY) {
      logger.warn('NewsAPI not configured, returning fallback data', { query });
      return res.json({
        status: 'ok',
        totalResults: 0,
        articles: [],
        message: 'NewsAPI not configured. Please set NEWS_API_KEY environment variable.',
        fallback: true
      });
    }

    logger.info('Fetching news articles', {
      query,
      from,
      to,
      language,
      sortBy,
      pageSize
    });

    const response = await newsapi.v2.everything({
      q: query,
      from: from,
      to: to,
      language: language,
      sortBy: sortBy,
      pageSize: parseInt(pageSize)
    });

    if (response.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    logger.info('News articles fetched successfully', {
      query,
      articlesCount: response.articles.length,
      totalResults: response.totalResults
    });

    res.json({
      status: 'success',
      data: response
    });

  } catch (error) {
    logger.error('Error fetching news articles', {
      query: req.query.q,
      error: error.message,
      stack: error.stack
    });

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'NewsAPI rate limit exceeded. Please try again later.',
        retryAfter: error.response.headers['retry-after']
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch news articles'
    });
  }
});

// Get top headlines
app.get('/api/top-headlines', async (req, res) => {
  try {
    const { q, category, language = 'en', country, pageSize = 20 } = req.query;

    if (!NEWS_API_KEY) {
      logger.warn('NewsAPI not configured, returning fallback data');
      return res.json({
        status: 'ok',
        totalResults: 0,
        articles: [],
        message: 'NewsAPI not configured. Please set NEWS_API_KEY environment variable.',
        fallback: true
      });
    }

    logger.info('Fetching top headlines', {
      query: q,
      category,
      language,
      country,
      pageSize
    });

    const response = await newsapi.v2.topHeadlines({
      q: q,
      category: category,
      language: language,
      country: country,
      pageSize: parseInt(pageSize)
    });

    if (response.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    logger.info('Top headlines fetched successfully', {
      articlesCount: response.articles.length,
      totalResults: response.totalResults
    });

    res.json({
      status: 'success',
      data: response
    });

  } catch (error) {
    logger.error('Error fetching top headlines', {
      error: error.message,
      stack: error.stack
    });

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'NewsAPI rate limit exceeded. Please try again later.',
        retryAfter: error.response.headers['retry-after']
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch top headlines'
    });
  }
});

// Get news sources
app.get('/api/sources', async (req, res) => {
  try {
    const { category, language, country } = req.query;

    if (!NEWS_API_KEY) {
      logger.warn('NewsAPI not configured, returning fallback data');
      return res.json({
        status: 'ok',
        sources: [],
        message: 'NewsAPI not configured. Please set NEWS_API_KEY environment variable.',
        fallback: true
      });
    }

    logger.info('Fetching news sources', {
      category,
      language,
      country
    });

    const response = await newsapi.v2.sources({
      category: category,
      language: language,
      country: country
    });

    if (response.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    logger.info('News sources fetched successfully', {
      sourcesCount: response.sources.length
    });

    res.json({
      status: 'success',
      data: response
    });

  } catch (error) {
    logger.error('Error fetching news sources', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch news sources'
    });
  }
});

// Get financial news (specialized endpoint)
app.get('/api/financial-news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { lookBackDays = 7, pageSize = 20 } = req.query;

    if (!NEWS_API_KEY) {
      logger.warn('NewsAPI not configured, returning fallback data', { symbol });
      return res.json({
        status: 'ok',
        totalResults: 0,
        articles: [],
        message: 'NewsAPI not configured. Please set NEWS_API_KEY environment variable.',
        fallback: true
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(lookBackDays));

    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];

    // Search for financial news about the symbol
    const query = `${symbol} stock OR ${symbol} shares OR ${symbol} market OR ${symbol} trading`;

    logger.info('Fetching financial news', {
      symbol,
      query,
      fromDate,
      toDate,
      lookBackDays,
      pageSize
    });

    const response = await newsapi.v2.everything({
      q: query,
      from: fromDate,
      to: toDate,
      language: 'en',
      sortBy: 'relevancy',
      pageSize: parseInt(pageSize)
    });

    if (response.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    logger.info('Financial news fetched successfully', {
      symbol,
      articlesCount: response.articles.length,
      totalResults: response.totalResults,
      dateRange: { fromDate, toDate }
    });

    // Format response for better readability
    const formattedArticles = response.articles.map(article => ({
      title: article.title,
      source: article.source.name,
      publishedAt: article.publishedAt,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage
    }));

    res.json({
      status: 'success',
      data: {
        symbol: symbol.toUpperCase(),
        query: query,
        dateRange: { from: fromDate, to: toDate },
        totalResults: response.totalResults,
        articles: formattedArticles
      }
    });

  } catch (error) {
    logger.error('Error fetching financial news', {
      symbol: req.params.symbol,
      error: error.message,
      stack: error.stack
    });

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'NewsAPI rate limit exceeded. Please try again later.',
        retryAfter: error.response.headers['retry-after']
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch financial news'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url
  });

  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Google News Service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    newsApiConfigured: !!NEWS_API_KEY
  });
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