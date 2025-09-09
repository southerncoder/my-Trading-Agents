import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

// Import provider modules
import BingNewsProvider from './providers/bing-news.js';
import BraveNewsProvider from './providers/brave-news.js';
import NewsAPIProvider from './providers/newsapi.js';
import YahooFinanceProvider from './providers/yahoo-finance.js';
import GoogleNewsProvider from './providers/google-news.js';

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
  defaultMeta: { service: 'news-aggregator-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: '/tmp/news-aggregator-service.log' })
  ]
});

// Initialize cache for API responses
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL

const app = express();
const PORT = process.env.PORT || 3004;

// Provider configurations (keeping for backward compatibility)
const PROVIDERS = {
  GOOGLE_NEWS: 'google-news',
  YAHOO_FINANCE: 'yahoo-finance',
  BING_NEWS: 'bing-news',
  BRAVE_NEWS: 'brave-news',
  NEWSAPI: 'newsapi'
};

// Provider status tracking
const providerStatus = {
  [PROVIDERS.GOOGLE_NEWS]: { healthy: false, lastChecked: null, consecutiveFailures: 0 },
  [PROVIDERS.YAHOO_FINANCE]: { healthy: false, lastChecked: null, consecutiveFailures: 0 },
  [PROVIDERS.BING_NEWS]: { healthy: false, lastChecked: null, consecutiveFailures: 0 },
  [PROVIDERS.BRAVE_NEWS]: { healthy: false, lastChecked: null, consecutiveFailures: 0 },
  [PROVIDERS.NEWSAPI]: { healthy: false, lastChecked: null, consecutiveFailures: 0 }
};

// Initialize providers
const providers = {
  'bing-news': new BingNewsProvider(),
  'brave-news': new BraveNewsProvider(),
  'newsapi': new NewsAPIProvider(),
  'yahoo-finance': new YahooFinanceProvider(),
  'google-news': new GoogleNewsProvider()
};

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

// Provider health check function
async function checkProviderHealth(providerName) {
  try {
    const now = Date.now();
    const lastChecked = providerStatus[providerName].lastChecked;

    // Skip check if done recently (within 30 seconds)
    if (lastChecked && (now - lastChecked) < 30000) {
      return providerStatus[providerName].healthy;
    }

    providerStatus[providerName].lastChecked = now;

    const provider = providers[providerName];
    if (!provider) {
      providerStatus[providerName].healthy = false;
      return false;
    }

    // Use provider's built-in health check
    const healthResult = await provider.healthCheck();
    providerStatus[providerName].healthy = healthResult.healthy;

    if (healthResult.healthy) {
      providerStatus[providerName].consecutiveFailures = 0;
    } else {
      providerStatus[providerName].consecutiveFailures++;
    }

    logger.info(`Provider ${providerName} health check`, {
      healthy: healthResult.healthy,
      message: healthResult.message,
      consecutiveFailures: providerStatus[providerName].consecutiveFailures
    });

  } catch (error) {
    providerStatus[providerName].healthy = false;
    providerStatus[providerName].consecutiveFailures++;

    logger.warn(`Provider ${providerName} health check failed`, {
      error: error.message,
      consecutiveFailures: providerStatus[providerName].consecutiveFailures
    });
  }

  return providerStatus[providerName].healthy;
}

// Get best available provider for a given operation
async function getBestProvider(operation) {
  const candidates = [];

  // Check all providers for the operation
  for (const [providerName, provider] of Object.entries(providers)) {
    if (await checkProviderHealth(providerName)) {
      candidates.push(providerName);
    }
  }

  if (candidates.length === 0) {
    throw new Error('No healthy news providers available');
  }

  // Return the first healthy provider (could implement more sophisticated selection)
  return candidates[0];
}

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'news-aggregator-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    providers: providerStatus
  };

  // Check if at least one provider is healthy
  const hasHealthyProvider = Object.values(providerStatus).some(p => p.healthy);
  if (!hasHealthyProvider) {
    health.status = 'degraded';
  }

  res.json(health);
});

// Provider status endpoint
app.get('/api/providers/status', (req, res) => {
  const status = {
    status: 'success',
    timestamp: new Date().toISOString(),
    providers: {}
  };

  // Add detailed status for each provider
  for (const [provider, providerInfo] of Object.entries(providerStatus)) {
    status.providers[provider] = {
      healthy: providerInfo.healthy,
      lastChecked: providerInfo.lastChecked,
      consecutiveFailures: providerInfo.consecutiveFailures,
      uptime: providerInfo.lastChecked ? Date.now() - new Date(providerInfo.lastChecked).getTime() : null
    };
  }

  res.json(status);
});

// Get news articles with intelligent provider selection
app.get('/api/news', async (req, res) => {
  try {
    const { q: query, from, to, language = 'en', sortBy = 'relevancy', pageSize = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Query parameter "q" is required'
      });
    }

    const cacheKey = `news-${query}-${from}-${to}-${language}-${sortBy}-${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Serving cached news result', { query, cacheKey });
      return res.json(cachedResult);
    }

    // Try providers in order of preference (Brave News first, then others)
    const providers = [PROVIDERS.BRAVE_NEWS, PROVIDERS.GOOGLE_NEWS, PROVIDERS.NEWSAPI, PROVIDERS.BING_NEWS];
    let result = null;
    let usedProvider = null;

    for (const provider of providers) {
      try {
        if (await checkProviderHealth(provider)) {
          result = await fetchFromProvider(provider, 'news', { query, from, to, language, sortBy, pageSize });
          usedProvider = provider;
          break;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed for news`, { query, error: error.message });
      }
    }

    if (!result) {
      throw new Error('All news providers failed');
    }

    const response = {
      status: 'success',
      provider: usedProvider,
      data: result
    };

    // Cache the result
    cache.set(cacheKey, response);

    logger.info('News fetched successfully', {
      query,
      provider: usedProvider,
      articlesCount: result.articles?.length || 0
    });

    res.json(response);

  } catch (error) {
    logger.error('Error fetching news', {
      query: req.query.q,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch news articles from any provider'
    });
  }
});

// Get financial news (specialized endpoint)
app.get('/api/financial-news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { lookBackDays = 7, pageSize = 20 } = req.query;

    const cacheKey = `financial-news-${symbol}-${lookBackDays}-${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Serving cached financial news result', { symbol, cacheKey });
      return res.json(cachedResult);
    }

    // Try Yahoo Finance first for financial news, then fall back to news providers
    const providers = [PROVIDERS.YAHOO_FINANCE, PROVIDERS.BRAVE_NEWS, PROVIDERS.GOOGLE_NEWS, PROVIDERS.NEWSAPI];
    let result = null;
    let usedProvider = null;

    for (const provider of providers) {
      try {
        if (await checkProviderHealth(provider)) {
          result = await fetchFromProvider(provider, 'financial-news', { symbol, lookBackDays, pageSize });
          usedProvider = provider;
          break;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed for financial news`, { symbol, error: error.message });
      }
    }

    if (!result) {
      throw new Error('All financial news providers failed');
    }

    const response = {
      status: 'success',
      provider: usedProvider,
      data: result
    };

    // Cache the result
    cache.set(cacheKey, response);

    logger.info('Financial news fetched successfully', {
      symbol,
      provider: usedProvider,
      articlesCount: result.articles?.length || 0
    });

    res.json(response);

  } catch (error) {
    logger.error('Error fetching financial news', {
      symbol: req.params.symbol,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch financial news'
    });
  }
});

// Get stock quotes
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const cacheKey = `quote-${symbol}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Serving cached quote result', { symbol, cacheKey });
      return res.json(cachedResult);
    }

    // Try Yahoo Finance first, then fall back to other providers
    const providers = [PROVIDERS.YAHOO_FINANCE];
    let result = null;
    let usedProvider = null;

    for (const provider of providers) {
      try {
        if (await checkProviderHealth(provider)) {
          result = await fetchFromProvider(provider, 'quote', { symbol });
          usedProvider = provider;
          break;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed for quote`, { symbol, error: error.message });
      }
    }

    if (!result) {
      throw new Error('All quote providers failed');
    }

    const response = {
      status: 'success',
      provider: usedProvider,
      data: result
    };

    // Cache the result (shorter TTL for quotes)
    cache.set(cacheKey, response, 60); // 1 minute

    logger.info('Quote fetched successfully', {
      symbol,
      provider: usedProvider
    });

    res.json(response);

  } catch (error) {
    logger.error('Error fetching quote', {
      symbol: req.params.symbol,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch stock quote'
    });
  }
});

// Provider-specific fetch function
async function fetchFromProvider(providerName, operation, params) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  switch (operation) {
    case 'news':
      return await provider.searchNews(params);

    case 'financial-news':
      if (providerName === 'yahoo-finance') {
        return await provider.searchFinancialNews(params.symbol, params);
      } else {
        // For other providers, search with financial terms
        const financialQuery = `${params.symbol} stock OR ${params.symbol} shares OR ${params.symbol} market OR ${params.symbol} trading`;
        return await provider.searchNews({ ...params, query: financialQuery });
      }

    case 'quote':
      if (providerName === 'yahoo-finance') {
        return await provider.getQuote(params.symbol);
      } else {
        throw new Error(`Provider ${providerName} does not support quote operations`);
      }

    case 'top-headlines':
      if (provider.getTopHeadlines) {
        return await provider.getTopHeadlines(params);
      } else {
        // Fallback to regular search
        return await provider.searchNews({ ...params, sortBy: 'popularity' });
      }

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// NewsAPI fetch function (used for Google News and NewsAPI)
async function fetchFromNewsAPI(operation, params) {
  if (!newsapi) {
    throw new Error('NewsAPI not configured');
  }

  switch (operation) {
    case 'news':
      const response = await newsapi.v2.everything({
        q: params.query,
        from: params.from,
        to: params.to,
        language: params.language,
        sortBy: params.sortBy,
        pageSize: parseInt(params.pageSize)
      });

      if (response.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      return response;

    case 'financial-news':
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(params.lookBackDays));

      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];

      const query = `${params.symbol} stock OR ${params.symbol} shares OR ${params.symbol} market OR ${params.symbol} trading`;

      const response2 = await newsapi.v2.everything({
        q: query,
        from: fromDate,
        to: toDate,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: parseInt(params.pageSize)
      });

      if (response2.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response2.status}`);
      }

      // Format response for better readability
      const formattedArticles = response2.articles.map(article => ({
        title: article.title,
        source: article.source.name,
        publishedAt: article.publishedAt,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage
      }));

      return {
        symbol: params.symbol.toUpperCase(),
        query: query,
        dateRange: { from: fromDate, to: toDate },
        totalResults: response2.totalResults,
        articles: formattedArticles
      };

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// Yahoo Finance fetch function
async function fetchFromYahooFinance(operation, params) {
  switch (operation) {
    case 'quote':
      const quote = await yahooFinance.quote(params.symbol);
      return quote;

    case 'financial-news':
      // For financial news, we'll use Yahoo Finance's news search
      // This is a simplified implementation - in practice, you'd use Yahoo's news API
      const query = `${params.symbol} stock news`;
      const newsResponse = await yahooFinance.search(query, { newsCount: parseInt(params.pageSize) });

      return {
        symbol: params.symbol.toUpperCase(),
        query: query,
        articles: newsResponse.news?.map(item => ({
          title: item.title,
          source: item.publisher,
          publishedAt: item.publishTime,
          description: item.summary,
          url: item.link,
          urlToImage: item.thumbnail?.resolutions?.[0]?.url
        })) || []
      };

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// Bing News fetch function (placeholder implementation)
async function fetchFromBingNews(operation, params) {
  // This would require Bing News API integration
  // For now, return a placeholder error
  throw new Error('Bing News API not yet implemented - requires API key configuration');
}
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
  logger.info('News Aggregator Service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    providers: Object.keys(providerStatus)
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