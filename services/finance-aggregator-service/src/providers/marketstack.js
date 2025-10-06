import axios from 'axios';
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
  defaultMeta: { service: 'marketstack-provider' },
  transports: [new winston.transports.Console()]
});

const BASE = 'https://api.marketstack.com/v1';

function ensureKey() {
  const key = process.env.MARKETSTACK_API_KEY;
  if (!key) throw new Error('MARKETSTACK_API_KEY not configured');
  return key;
}

export default class MarketStackProvider {
  constructor() {
    this.base = BASE;
    this.key = process.env.MARKETSTACK_API_KEY || null;
    this.rateLimitDelay = 250; // gentle pacing
    this.lastRequest = 0;
    // Resilience
    this.retryHandler = new RetryHandler();
    this.circuitBreaker = new CircuitBreaker('marketstack');
  }

  isConfigured() {
    return !!process.env.MARKETSTACK_API_KEY;
  }

  async enforceRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.rateLimitDelay) await new Promise(r => setTimeout(r, this.rateLimitDelay - elapsed));
    this.lastRequest = Date.now();
  }

  async healthCheck() {
    try {
      const key = ensureKey();
      await this.enforceRateLimit();
      const res = await this.circuitBreaker.execute(() => this.retryHandler.execute(() => axios.get(`${this.base}/exchanges`, { params: { access_key: key }, timeout: 5000 }), { provider: 'marketstack', query: 'exchanges' }));
      return { healthy: res.status === 200, timestamp: new Date().toISOString() };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }

  async getQuote(symbol) {
    const key = ensureKey();
    await this.enforceRateLimit();
    try {
      const res = await this.circuitBreaker.execute(() => this.retryHandler.execute(() => axios.get(`${this.base}/eod`, { params: { access_key: key, symbols: symbol, limit: 1 }, timeout: 10000 }), { provider: 'marketstack', query: `eod-${symbol}` }));
      const data = res.data && res.data.data && res.data.data[0];
      if (!data) throw new Error('No quote data');
      return { provider: 'marketstack', symbol: data.symbol, date: data.date, open: data.open, high: data.high, low: data.low, close: data.close, adjusted_close: data.adjusted_close || null, volume: data.volume, raw: data };
    } catch (err) {
      logger.warn('marketstack quote failed', { symbol, error: err.message });
      throw err;
    }
  }

  async getHistorical(symbol, { period1, period2 } = {}) {
    const key = ensureKey();
    await this.enforceRateLimit();
    try {
      const params = { access_key: key, symbols: symbol };
      if (period1) params.date_from = period1;
      if (period2) params.date_to = period2;
      const res = await this.circuitBreaker.execute(() => this.retryHandler.execute(() => axios.get(`${this.base}/eod`, { params, timeout: 15000 }), { provider: 'marketstack', query: `eod-${symbol}-${period1 || ''}-${period2 || ''}` }));
      const rows = res.data && res.data.data ? res.data.data : [];
      return { provider: 'marketstack', symbol, data: rows };
    } catch (err) {
      logger.warn('marketstack historical failed', { symbol, error: err.message });
      throw err;
    }
  }

  async searchTickers(query, { limit = 10 } = {}) {
    const key = ensureKey();
    await this.enforceRateLimit();
    try {
      const res = await axios.get(`${this.base}/tickers`, { params: { access_key: key, search: query, limit }, timeout: 8000 });
      return { provider: 'marketstack', query, results: res.data.data || [] };
    } catch (err) {
      logger.warn('marketstack tickers failed', { query, error: err.message });
      throw err;
    }
  }
}
