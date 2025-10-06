import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import NodeCache from 'node-cache';
import winston from 'winston';

// Load repo .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(repoRoot, '.env.local') });

// Load secrets
import { loadSecrets } from './utils/secrets.js';
loadSecrets();

// Dynamically import providers
const { default: YahooProvider } = await import('./providers/yahoo-finance.js');
const { default: MarketWatchProvider } = await import('./providers/marketwatch.js');
const { default: MarketStackProvider } = await import('./providers/marketstack.js');

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const providers = {
  yahoo: new YahooProvider(),
  marketwatch: new MarketWatchProvider(),
  marketstack: new MarketStackProvider(),
};

app.get('/health', async (req, res) => {
  const health = {};
  for (const [k, p] of Object.entries(providers)) {
    health[k] = await p.healthCheck();
  }
  res.json({ status: 'success', timestamp: new Date().toISOString(), providers: health });
});

app.get('/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cached = cache.get(`quote-${symbol}`);
    if (cached) return res.json(cached);

    const results = {};
    try {
      results.yahoo = await providers.yahoo.getQuote(symbol);
    } catch (e) {
      logger.warn('yahoo quote unavailable', { symbol, error: e.message });
      results.yahoo = { error: 'yahoo quote unavailable', detail: e.message };
    }

    try {
      results.marketwatch = await providers.marketwatch.getQuote(symbol);
    } catch (e) {
      // MarketWatch may not implement quote; don't fail the whole request
      logger.warn('marketwatch quote unavailable', { symbol, error: e.message });
      results.marketwatch = { error: 'marketwatch quote unavailable', detail: e.message };
    }

    try {
      results.marketstack = await providers.marketstack.getQuote(symbol);
    } catch (e) {
      // MarketStack optional -- don't fail the whole request
      logger.warn('marketstack quote unavailable', { symbol, error: e.message });
      results.marketstack = { error: 'marketstack quote unavailable', detail: e.message };
    }

    cache.set(`quote-${symbol}`, results, 60);
    res.json({ status: 'success', providerData: results });
  } catch (err) {
    logger.error('quote failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/historical/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const period1 = req.query.period1 || '2020-01-01';
    const period2 = req.query.period2 || new Date().toISOString();
    const results = {};

    try {
      results.yahoo = await providers.yahoo.getHistorical(symbol, { period1, period2 });
    } catch (e) {
      logger.warn('yahoo historical unavailable', { symbol, error: e.message });
      results.yahoo = { error: 'yahoo historical unavailable', detail: e.message };
    }

    try {
      results.marketwatch = await providers.marketwatch.getHistorical(symbol, { period1, period2 });
    } catch (e) {
      logger.warn('marketwatch historical unavailable', { symbol, error: e.message });
      results.marketwatch = { error: 'marketwatch historical unavailable', detail: e.message };
    }

    try {
      results.marketstack = await providers.marketstack.getHistorical(symbol, { period1, period2 });
    } catch (e) {
      logger.warn('marketstack historical unavailable', { symbol, error: e.message });
      results.marketstack = { error: 'marketstack historical unavailable', detail: e.message };
    }

    res.json({ status: 'success', providerData: results });
  } catch (err) {
    logger.error('historical failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/prospectus/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const results = {};
    try {
      results.yahoo = await providers.yahoo.getProspectus(symbol);
    } catch (e) {
      logger.warn('yahoo prospectus unavailable', { symbol, error: e.message });
      results.yahoo = { error: 'yahoo prospectus unavailable', detail: e.message };
    }

    try {
      results.marketwatch = await providers.marketwatch.getProspectus(symbol);
    } catch (e) {
      logger.warn('marketwatch prospectus unavailable', { symbol, error: e.message });
      results.marketwatch = { error: 'marketwatch prospectus unavailable', detail: e.message };
    }
    res.json({ status: 'success', providerData: results });
  } catch (err) {
    logger.error('prospectus failed', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3010;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => logger.info('Finance Aggregator started', { port: PORT }));
} else {
  logger.info('Finance Aggregator running in test mode; app.listen suppressed');
}

export default app;
