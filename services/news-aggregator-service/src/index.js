import express from "express";
import cors from "cors";
import helmet from "helmet";
import winston from "winston";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import NodeCache from "node-cache";

// Load environment variables first (look for repo root .env.local) using module path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src -> service/src, go up three levels to reach repository root
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const envPath = path.join(repoRoot, '.env.local');
dotenv.config({ path: envPath });
console.log('[Env] dotenv loaded from', envPath);

// Load Docker secrets (overrides .env if running in container)
import { loadSecrets } from "./utils/secrets.js";
loadSecrets();

import { mergeArticles } from "./utils/merge-articles.js";
import { filterRelevant, lookupCompanyName } from "./utils/relevance.js";

// Dynamically import provider modules AFTER environment and secrets are loaded
const { default: BraveNewsProvider } = await import("./providers/brave-news.js");
const { default: NewsAPIProvider } = await import("./providers/newsapi.js");
const { default: GoogleNewsProvider } = await import("./providers/google-news.js");
const { default: TavilyProvider } = await import("./providers/tavily.js");
const { default: SerpApiProvider } = await import("./providers/serp-api.js");

// Import resilient aggregator
import { ResilientNewsAggregator } from "./aggregators/resilient-news-aggregator.js";

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "news-aggregator-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: "/tmp/news-aggregator-service.log",
    }),
  ],
});

// Initialize cache for API responses
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL

const app = express();
const PORT = process.env.PORT || 3004;

// Provider configurations (keeping for backward compatibility)
const PROVIDERS = {
  TAVILY: "tavily",
  BRAVE_NEWS: "brave-news",
  GOOGLE_NEWS: "google-news",
  NEWSAPI: "newsapi",
  SERP_API: "serp-api",
};

// Provider status tracking (legacy - kept for backward compatibility)
const providerStatus = {
  [PROVIDERS.TAVILY]: {
    healthy: false,
    lastChecked: null,
    consecutiveFailures: 0,
  },
  [PROVIDERS.BRAVE_NEWS]: {
    healthy: false,
    lastChecked: null,
    consecutiveFailures: 0,
  },
  [PROVIDERS.GOOGLE_NEWS]: {
    healthy: false,
    lastChecked: null,
    consecutiveFailures: 0,
  },
  [PROVIDERS.NEWSAPI]: {
    healthy: false,
    lastChecked: null,
    consecutiveFailures: 0,
  },
  [PROVIDERS.SERP_API]: {
    healthy: false,
    lastChecked: null,
    consecutiveFailures: 0,
  },
};

// Initialize providers (news providers only - no finance providers)
const providers = {
  tavily: new TavilyProvider(),
  "brave-news": new BraveNewsProvider(),
  newsapi: new NewsAPIProvider(),
  "serp-api": new SerpApiProvider(),
  "google-news": new GoogleNewsProvider(),
};

// Initialize resilient news aggregator with enterprise resilience patterns
const newsAggregator = new ResilientNewsAggregator(providers);

logger.info("News Aggregator initialized with providers", {
  providers: Object.keys(providers),
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info("Request received", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Provider health check function
async function checkProviderHealth(providerName) {
  try {
    const now = Date.now();
    const lastChecked = providerStatus[providerName].lastChecked;

    // Skip check if done recently (within 30 seconds)
    if (lastChecked && now - lastChecked < 30000) {
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
      consecutiveFailures: providerStatus[providerName].consecutiveFailures,
    });
  } catch (error) {
    providerStatus[providerName].healthy = false;
    providerStatus[providerName].consecutiveFailures++;

    logger.warn(`Provider ${providerName} health check failed`, {
      error: error.message,
      consecutiveFailures: providerStatus[providerName].consecutiveFailures,
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
    throw new Error("No healthy news providers available");
  }

  // Return the first healthy provider (could implement more sophisticated selection)
  return candidates[0];
}

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    service: "news-aggregator-service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    providers: providerStatus,
  };

  // Check if at least one provider is healthy
  const hasHealthyProvider = Object.values(providerStatus).some(
    (p) => p.healthy
  );
  if (!hasHealthyProvider) {
    health.status = "degraded";
  }

  res.json(health);
});

// Provider status endpoint
app.get("/api/providers/status", (req, res) => {
  const status = {
    status: "success",
    timestamp: new Date().toISOString(),
    providers: {},
  };

  // Add detailed status for each provider
  for (const [provider, providerInfo] of Object.entries(providerStatus)) {
    status.providers[provider] = {
      healthy: providerInfo.healthy,
      lastChecked: providerInfo.lastChecked,
      consecutiveFailures: providerInfo.consecutiveFailures,
      uptime: providerInfo.lastChecked
        ? Date.now() - new Date(providerInfo.lastChecked).getTime()
        : null,
    };
  }

  res.json(status);
});

// ============================================
// NEW RESILIENT AGGREGATION ENDPOINTS
// ============================================

// Aggregate news from all providers (bulk JSON response)
app.get("/api/news/aggregate", async (req, res) => {
  try {
    const { q: query, count = 10, freshness, language = "en" } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: 'Query parameter "q" is required',
      });
    }

    logger.info("Bulk news aggregation request", { query, count });

    const searchParams = {
      query,
      count: parseInt(count),
      freshness,
      language,
    };

    const result = await newsAggregator.aggregateNews(searchParams);

    res.json(result);
  } catch (error) {
    logger.error("Bulk news aggregation failed", {
      query: req.query.q,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Internal server error",
      message: error.message || "Failed to aggregate news from providers",
      query: req.query.q,
      providers: {},
      summary: { total: 0, successful: 0, failed: 0 },
      errors: [{ message: error.message }],
    });
  }
});

// Aggregate news from all providers (streaming response)
app.get("/api/news/aggregate/stream", async (req, res) => {
  try {
    const { q: query, count = 10, freshness, language = "en" } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: 'Query parameter "q" is required',
      });
    }

    logger.info("Streaming news aggregation request", { query, count });

    // Set headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    const searchParams = {
      query,
      count: parseInt(count),
      freshness,
      language,
    };

    // Stream results as they arrive
    for await (const event of newsAggregator.aggregateNewsStreaming(
      searchParams
    )) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error) {
    logger.error("Streaming news aggregation failed", {
      query: req.query.q,
      error: error.message,
      stack: error.stack,
    });

    // Send error event
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: error.message,
        query: req.query.q,
      })}\n\n`
    );
    res.end();
  }
});

// Get aggregated provider health status
app.get("/api/news/health", async (req, res) => {
  try {
    const health = await newsAggregator.getProvidersHealth();

    res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      providers: health,
    });
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
    });

    res.status(500).json({
      error: "Health check failed",
      message: error.message,
    });
  }
});

// Get aggregated statistics
app.get("/api/news/statistics", async (req, res) => {
  try {
    const stats = newsAggregator.getStatistics();

    res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      statistics: stats,
    });
  } catch (error) {
    logger.error("Statistics retrieval failed", {
      error: error.message,
    });

    res.status(500).json({
      error: "Statistics retrieval failed",
      message: error.message,
    });
  }
});

// ============================================
// LEGACY ENDPOINTS (kept for backward compatibility)
// ============================================

// Get news articles with intelligent provider selection
app.get("/api/news", async (req, res) => {
  try {
    const {
      q: query,
      from,
      to,
      language = "en",
      sortBy = "relevancy",
      pageSize = 20,
    } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing required parameter",
        message: 'Query parameter "q" is required',
      });
    }

    const cacheKey = `news-${query}-${from}-${to}-${language}-${sortBy}-${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info("Serving cached news result", { query, cacheKey });
      return res.json(cachedResult);
    }

    // Try providers in order of preference (Tavily first for AI-optimized results, then Brave News, then others)
    const providers = [
      PROVIDERS.TAVILY,
      PROVIDERS.BRAVE_NEWS,
      PROVIDERS.GOOGLE_NEWS,
      PROVIDERS.NEWSAPI,
    ];
    let result = null;
    let usedProvider = null;

    for (const provider of providers) {
      try {
        if (await checkProviderHealth(provider)) {
          result = await fetchFromProvider(provider, "news", {
            query,
            from,
            to,
            language,
            sortBy,
            pageSize,
          });
          usedProvider = provider;
          break;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed for news`, {
          query,
          error: error.message,
        });
      }
    }

    if (!result) {
      throw new Error("All news providers failed");
    }

    const response = {
      status: "success",
      provider: usedProvider,
      providers: providerReport,
      data: result,
    };

    // Cache the result
    cache.set(cacheKey, response);

    logger.info("Financial news fetched successfully", {
      symbol,
      provider: usedProvider,
      articlesCount: result.articles?.length || 0,
    });

    res.json(response);
  } catch (error) {
    logger.error("Error fetching news", {
      query: req.query.q,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch news articles from any provider",
    });
  }
});

// Get financial news (specialized endpoint)
app.get("/api/financial-news/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { lookBackDays = 7, pageSize = 20 } = req.query;

    const cacheKey = `financial-news-${symbol}-${lookBackDays}-${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info("Serving cached financial news result", { symbol, cacheKey });
      return res.json(cachedResult);
    }

    // Ask every configured provider at once and merge what comes back, so one provider's
    // blind spots (Brave rate limits, NewsAPI returning nothing for large caps) do not hide stories.
    // Which providers run is configurable; SerpAPI is metered, so it is off by default.
    const wanted = (process.env.FINANCIAL_NEWS_PROVIDERS || "brave-news,google-news,newsapi,tavily")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const params = { symbol, lookBackDays, pageSize };
    const outcomes = await Promise.all(
      wanted.map(async (provider) => {
        try {
          if (!(await checkProviderHealth(provider))) return { provider, skipped: "unhealthy" };
          let attempt;
          try {
            attempt = await fetchFromProvider(provider, "financial-news", params);
          } catch (error) {
            if (/rate limit/i.test(error.message)) {
              await new Promise((r) => setTimeout(r, 1300));
              attempt = await fetchFromProvider(provider, "financial-news", params);
            } else {
              throw error;
            }
          }
          return { provider, articles: attempt?.articles ?? [] };
        } catch (error) {
          logger.warn(`Provider ${provider} failed for financial news`, { symbol, error: error.message });
          return { provider, error: error.message };
        }
      })
    );
    const wantCount = Math.max(1, parseInt(pageSize) || 20);
    // Merge wide first, then drop off-topic and stale items, then trim: filtering after the trim would
    // leave short pages whenever the newest items are junk.
    const company = await lookupCompanyName(symbol, process.env.YAHOO_FINANCE_URL);
    const widened = mergeArticles(outcomes.filter((o) => o.articles?.length), 200);
    const { articles: merged0, stats: filterStats } = filterRelevant(widened, {
      symbol,
      company,
      lookBackDays: parseInt(lookBackDays) || 7,
      maxUndated: 2,
    });
    const merged = merged0.slice(0, wantCount);
    const providerReport = {
      used: outcomes.filter((o) => o.articles?.length).map((o) => ({ name: o.provider, articles: o.articles.length })),
      empty: outcomes.filter((o) => o.articles && !o.articles.length).map((o) => o.provider),
      skipped: outcomes.filter((o) => o.skipped).map((o) => o.provider),
      failed: outcomes.filter((o) => o.error).map((o) => ({ name: o.provider, error: o.error })),
      filtered: filterStats,
    };
    const result = merged.length ? { symbol: symbol.toUpperCase(), articles: merged } : null;
    const usedProvider = providerReport.used.map((u) => u.name).join("+") || null;

    if (!result) {
      // Every provider failed or was empty: report empty, but do not cache it.
      return res.json({ status: "success", provider: null, providers: providerReport, data: { articles: [] } });
    }

    const response = {
      status: "success",
      provider: usedProvider,
      providers: providerReport,
      data: result,
    };

    // Cache the result
    cache.set(cacheKey, response);

    logger.info("Financial news fetched successfully", {
      symbol,
      provider: usedProvider,
      articlesCount: result.articles?.length || 0,
    });

    res.json(response);
  } catch (error) {
    logger.error("Error fetching news", {
      query: req.query.q,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch news articles from any provider",
    });
  }
});

// Get financial news (specialized endpoint)
app.get("/api/financial-news/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { lookBackDays = 7, pageSize = 20 } = req.query;

    const cacheKey = `financial-news-${symbol}-${lookBackDays}-${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info("Serving cached financial news result", { symbol, cacheKey });
      return res.json(cachedResult);
    }

    // Try Yahoo Finance first for financial news, then fall back to news providers
    // An empty result is not a success: keep falling through to the next provider
    // (Brave's free tier rate-limits bursts and NewsAPI often returns nothing for large caps).
    const providers = [
      PROVIDERS.YAHOO_FINANCE,
      PROVIDERS.BRAVE_NEWS,
      PROVIDERS.TAVILY,
      PROVIDERS.GOOGLE_NEWS,
    ];
    let result = null;
    let usedProvider = null;

    for (const provider of providers) {
      try {
        if (!(await checkProviderHealth(provider))) continue;
        const params = { symbol, lookBackDays, pageSize };
        let attempt;
        try {
          attempt = await fetchFromProvider(provider, "financial-news", params);
        } catch (error) {
          if (/rate limit/i.test(error.message)) {
            await new Promise((r) => setTimeout(r, 1300));
            attempt = await fetchFromProvider(provider, "financial-news", params);
          } else {
            throw error;
          }
        }
        if (attempt?.articles?.length) {
          result = attempt;
          usedProvider = provider;
          break;
        }
        logger.warn(`Provider ${provider} returned no articles for financial news`, { symbol });
      } catch (error) {
        logger.warn(`Provider ${provider} failed for financial news`, {
          symbol,
          error: error.message,
        });
      }
    }

    if (!result) {
      // Every provider failed or was empty: report empty, but do not cache it.
      return res.json({ status: "success", provider: null, data: { articles: [] } });
    }

    const response = {
      status: "success",
      provider: usedProvider,
      providers: providerReport,
      data: result,
    };

    // Cache the result
    cache.set(cacheKey, response);

    logger.info("Financial news fetched successfully", {
      symbol,
      provider: usedProvider,
      articlesCount: result.articles?.length || 0,
    });

    res.json(response);
  } catch (error) {
    logger.error("Error fetching financial news", {
      symbol: req.params.symbol,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch financial news",
    });
  }
});

// Quotes are served by yahoo-finance-service, not this service.
app.get("/api/quote/:symbol", (req, res) => {
  res.status(410).json({
    error: "Gone",
    message: "Quotes are served by yahoo-finance-service (/api/quote/:symbol).",
  });
});

// Provider-specific fetch function
async function fetchFromProvider(providerName, operation, params) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  switch (operation) {
    case "news":
      return await provider.searchNews(params);

    case "financial-news": {
      const financialQuery = `${params.symbol} stock OR ${params.symbol} shares OR ${params.symbol} market OR ${params.symbol} trading`;
      return await provider.searchNews({ ...params, query: financialQuery });
    }

    case "top-headlines":
      if (provider.getTopHeadlines) {
        return await provider.getTopHeadlines(params);
      } else {
        // Fallback to regular search
        return await provider.searchNews({ ...params, sortBy: "popularity" });
      }

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

app.use((error, req, res, next) => {
  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred",
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    url: req.url,
  });

  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

// Start server
app.listen(PORT, () => {
  logger.info("News Aggregator Service started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    providers: Object.keys(providerStatus),
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});
