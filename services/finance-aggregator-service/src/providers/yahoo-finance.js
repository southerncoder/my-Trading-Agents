import yahooFinance from 'yahoo-finance2';
import winston from 'winston';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { RetryHandler } from '../resilience/retry-handler.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'yahoo-finance-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class YahooFinanceProvider {
  constructor() {
    this.rateLimitDelay = 300; // ~200 requests per minute (be conservative)
    this.lastRequestTime = 0;
    this.isInitialized = false;
    // Resilience
    this.retryHandler = new RetryHandler();
    this.circuitBreaker = new CircuitBreaker('yahoo-finance');

    // Yahoo Finance doesn't require API keys for basic operations
    logger.info('Yahoo Finance provider initialized (no API key required)');
  }

  /**
   * Check if the provider is configured and ready
   */
  isConfigured() {
    return true; // Yahoo Finance works without API keys
  }

  /**
   * Implement rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      logger.debug(`Rate limiting Yahoo Finance request`, { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get stock quote
   */
  async getQuote(symbol) {
    if (!symbol) {
      throw new Error('Symbol parameter is required');
    }

    await this.enforceRateLimit();

    // Execute via circuit breaker and retry handler
    return await this.circuitBreaker.execute(() => this.retryHandler.execute(async () => {
      logger.info('Fetching Yahoo Finance quote', { symbol });
      try {
        const quote = await yahooFinance.quote(symbol.toUpperCase());
        const result = {
          symbol: quote.symbol,
          shortName: quote.shortName,
          longName: quote.longName,
          regularMarketPrice: quote.regularMarketPrice,
          regularMarketChange: quote.regularMarketChange,
          regularMarketChangePercent: quote.regularMarketChangePercent,
          regularMarketVolume: quote.regularMarketVolume,
          regularMarketDayHigh: quote.regularMarketDayHigh,
          regularMarketDayLow: quote.regularMarketDayLow,
          regularMarketOpen: quote.regularMarketOpen,
          regularMarketPreviousClose: quote.regularMarketPreviousClose,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
          marketCap: quote.marketCap,
          averageVolume: quote.averageVolume,
          trailingPE: quote.trailingPE,
          forwardPE: quote.forwardPE,
          dividendYield: quote.dividendYield,
          currency: quote.currency,
          exchange: quote.exchange,
          quoteType: quote.quoteType,
          marketState: quote.marketState,
          regularMarketTime: quote.regularMarketTime,
          provider: 'yahoo-finance'
        };

        logger.info('Yahoo Finance quote fetched', { symbol, price: quote.regularMarketPrice, change: quote.regularMarketChangePercent });
        return result;
      } catch (error) {
        // Specific fallback: Yahoo crumb/cookie flow may fail (No set-cookie header). Try chart() as a fallback to derive latest price.
        logger.warn('Primary yahoo.quote failed, attempting chart() fallback', { symbol, error: error.message });
        try {
          const chart = await yahooFinance.chart(symbol.toUpperCase(), { range: '1d', interval: '1m' });
          const resultPrice = chart?.result?.[0]?.indicators?.quote?.[0]?.close?.slice(-1)?.[0];
          const timestamp = chart?.result?.[0]?.timestamp?.slice(-1)?.[0];
          if (resultPrice !== undefined && resultPrice !== null) {
            return {
              symbol: symbol.toUpperCase(),
              provider: 'yahoo-finance',
              regularMarketPrice: resultPrice,
              regularMarketTime: timestamp ? new Date(timestamp * 1000).toISOString() : null,
              note: 'price from chart() fallback (quote() failed)'
            };
          }
        } catch (fallbackErr) {
          logger.warn('yahoo.chart() fallback also failed', { symbol, error: fallbackErr.message });
        }

        // If fallback didn't work, rethrow original error to be handled by retry/circuit
        throw new Error(`Yahoo Finance quote error: ${error.message}`);
      }
    }, { provider: 'yahoo-finance', query: symbol }));
  }

  /**
   * Get historical data
   */
  async getHistoricalData(symbol, params = {}) {
    if (!symbol) {
      throw new Error('Symbol parameter is required');
    }

    await this.enforceRateLimit();
    try {
      const {
        period1,
        period2,
        interval = '1d',
        includePrePost = false
      } = params;

      const queryOptions = {
        period1,
        period2,
        interval,
        includePrePost
      };

      // Remove undefined values
      Object.keys(queryOptions).forEach(key => {
        if (queryOptions[key] === undefined) {
          delete queryOptions[key];
        }
      });

      logger.info('Fetching Yahoo Finance historical data', { symbol, period1, period2, interval });
      return await this.circuitBreaker.execute(() => this.retryHandler.execute(async () => {
        const historical = await yahooFinance.historical(symbol.toUpperCase(), queryOptions);
        const result = {
          symbol: symbol.toUpperCase(),
          data: historical.map(item => ({ date: item.date, open: item.open, high: item.high, low: item.low, close: item.close, adjClose: item.adjClose, volume: item.volume })),
          provider: 'yahoo-finance',
          metadata: { count: historical.length, interval, period1, period2 }
        };
        logger.info('Yahoo Finance historical data fetched', { symbol, dataPoints: historical.length, interval });
        return result;
      }, { provider: 'yahoo-finance', query: `${symbol}-${period1 || ''}-${period2 || ''}` }));
    } catch (error) {
      logger.error('Yahoo Finance historical data failed', { symbol, error: error.message });
      throw new Error(`Yahoo Finance historical data error: ${error.message}`);
    }
  }

  /**
   * Search for financial news
   */
  async searchFinancialNews(symbol, params = {}) {
    if (!symbol) {
      throw new Error('Symbol parameter is required');
    }

    await this.enforceRateLimit();

    try {
      const { count = 10 } = params;

      logger.info('Searching Yahoo Finance news', { symbol, count });

      // Use Yahoo's search functionality for news
      const query = `${symbol} stock news`;
      const searchResult = await yahooFinance.search(query, {
        newsCount: count,
        quotesCount: 0
      });

      // Transform news results to standardized format
      const articles = (searchResult.news || []).map(item => ({
        title: item.title,
        description: item.summary,
        content: item.summary,
        url: item.link,
        urlToImage: item.thumbnail?.resolutions?.[0]?.url,
        publishedAt: item.publishTime ? new Date(item.publishTime * 1000).toISOString() : null,
        source: {
          id: null,
          name: item.publisher
        },
        author: item.publisher,
        symbol: symbol.toUpperCase()
      }));

      const result = {
        status: 'ok',
        symbol: symbol.toUpperCase(),
        query,
        totalResults: articles.length,
        articles,
        provider: 'yahoo-finance',
        searchMetadata: {
          newsCount: count,
          actualResults: articles.length
        }
      };

      logger.info('Yahoo Finance news search completed', {
        symbol,
        articlesFound: articles.length
      });

      return result;

    } catch (error) {
      logger.error('Yahoo Finance news search failed', {
        symbol,
        error: error.message
      });

      throw new Error(`Yahoo Finance news search error: ${error.message}`);
    }
  }

  /**
   * Get market summary
   */
  async getMarketSummary() {
    await this.enforceRateLimit();

    try {
      logger.info('Fetching Yahoo Finance market summary');

      // This would typically use yahooFinance's market summary endpoint
      // For now, we'll get summaries for major indices
      const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT'];

      const summaries = await Promise.all(
        indices.map(async (symbol) => {
          try {
            const quote = await yahooFinance.quote(symbol);
            return {
              symbol,
              name: quote.shortName,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePercent: quote.regularMarketChangePercent
            };
          } catch (error) {
            logger.warn(`Failed to get quote for ${symbol}`, { error: error.message });
            return null;
          }
        })
      );

      const result = {
        status: 'ok',
        marketSummary: summaries.filter(summary => summary !== null),
        provider: 'yahoo-finance',
        timestamp: new Date().toISOString()
      };

      logger.info('Yahoo Finance market summary fetched', {
        indicesFetched: summaries.filter(s => s !== null).length
      });

      return result;

    } catch (error) {
      logger.error('Yahoo Finance market summary failed', {
        error: error.message
      });

      throw new Error(`Yahoo Finance market summary error: ${error.message}`);
    }
  }

  // Compatibility wrapper expected by the aggregator
  async getHistorical(symbol, params = {}) {
    return await this.getHistoricalData(symbol, params);
  }

  // Provide a prospectus/profile endpoint
  async getProspectus(ticker) {
    await this.enforceRateLimit();
    try {
      // Use summaryProfile as a lightweight company profile
      const profile = await yahooFinance.summaryProfile(ticker);
      return { provider: 'yahoo-finance', symbol: ticker.toUpperCase(), profile };
    } catch (error) {
      logger.warn('yahoo prospectus failed', { ticker, error: error.message });
      throw new Error(`Yahoo prospectus error: ${error.message}`);
    }
  }

  /**
   * Health check for the provider
   */
  async healthCheck() {
    try {
      // Test with a well-known symbol
      await this.getQuote('AAPL');

      return {
        healthy: true,
        message: 'Yahoo Finance is responding',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: `Yahoo Finance health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default YahooFinanceProvider;
