import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import yahooFinance from 'yahoo-finance2';
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
  defaultMeta: { service: 'yahoo-finance-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: '/tmp/yahoo-finance-service.log' })
  ]
});

// Configure yahoo-finance2
yahooFinance.setGlobalConfig({
  queue: {
    concurrency: 3,
    timeout: 10000
  }
});

const app = express();
const PORT = process.env.PORT || 3002;

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
    service: 'yahoo-finance-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get historical data
app.get('/api/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate, interval = '1d' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'startDate and endDate are required'
      });
    }

    logger.info('Fetching historical data', { symbol, startDate, endDate, interval });

    const queryOptions = {
      period1: startDate,
      period2: endDate,
      interval: interval
    };

    const result = await yahooFinance.historical(symbol, queryOptions);

    if (!result || result.length === 0) {
      logger.warn('No historical data found', { symbol, startDate, endDate });
      return res.status(404).json({
        error: 'No data found',
        message: `No historical data found for ${symbol}`
      });
    }

    // Convert to CSV format
    const header = `# Stock data for ${symbol.toUpperCase()} from ${startDate} to ${endDate}\n`;
    const timestamp = `# Data retrieved on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
    let csvData = 'Date,Open,High,Low,Close,Adj Close,Volume\n';

    for (const row of result) {
      const date = row.date.toISOString().split('T')[0];
      csvData += `${date},${row.open},${row.high},${row.low},${row.close},${row.adjClose || row.close},${row.volume}\n`;
    }

    const response = header + timestamp + csvData;

    logger.info('Historical data fetched successfully', {
      symbol,
      recordCount: result.length,
      responseSize: response.length
    });

    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (error) {
    logger.error('Error fetching historical data', {
      symbol: req.params.symbol,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch historical data'
    });
  }
});

// Get quote data
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    logger.info('Fetching quote data', { symbol });

    const quote = await yahooFinance.quote(symbol);

    logger.info('Quote data fetched successfully', { symbol });

    res.json({
      status: 'success',
      data: quote
    });

  } catch (error) {
    logger.error('Error fetching quote data', {
      symbol: req.params.symbol,
      error: error.message
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch quote data'
    });
  }
});

// Get multiple quotes
app.post('/api/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'symbols must be a non-empty array'
      });
    }

    if (symbols.length > 100) {
      return res.status(400).json({
        error: 'Too many symbols',
        message: 'Maximum 100 symbols allowed per request'
      });
    }

    logger.info('Fetching multiple quotes', { symbolCount: symbols.length, symbols });

    const quotes = await yahooFinance.quote(symbols);

    logger.info('Multiple quotes fetched successfully', { symbolCount: symbols.length });

    res.json({
      status: 'success',
      data: quotes
    });

  } catch (error) {
    logger.error('Error fetching multiple quotes', {
      symbolCount: req.body.symbols?.length,
      error: error.message
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch quotes'
    });
  }
});

// Get quote summary with modules
app.get('/api/quote-summary/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { modules = ['price', 'summaryDetail', 'defaultKeyStatistics'] } = req.query;

    const moduleArray = Array.isArray(modules) ? modules : [modules];

    logger.info('Fetching quote summary', { symbol, modules: moduleArray });

    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: moduleArray
    });

    logger.info('Quote summary fetched successfully', { symbol });

    res.json({
      status: 'success',
      data: summary
    });

  } catch (error) {
    logger.error('Error fetching quote summary', {
      symbol: req.params.symbol,
      modules: req.query.modules,
      error: error.message
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch quote summary'
    });
  }
});

// Search for symbols
app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query parameter "q" is required'
      });
    }

    logger.info('Searching for symbols', { query });

    const results = await yahooFinance.search(query);

    logger.info('Symbol search completed', {
      query,
      resultsCount: results?.length || 0
    });

    res.json({
      status: 'success',
      data: results
    });

  } catch (error) {
    logger.error('Error searching symbols', {
      query: req.query.q,
      error: error.message
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search symbols'
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
  logger.info('Yahoo Finance Service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
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