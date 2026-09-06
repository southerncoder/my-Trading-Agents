import axios from 'axios';
import winston from 'winston';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { RetryHandler } from '../resilience/retry-handler.js';
import { chromium } from 'playwright';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'marketwatch-provider' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default class MarketWatchProvider {
  constructor() {
    this.rssBase = 'https://feeds.marketwatch.com/marketwatch/stockstowatch/';
    this.basePage = 'https://www.marketwatch.com/investing/stock';
    this.retryHandler = new RetryHandler();
    this.circuitBreaker = new CircuitBreaker('marketwatch');
  }

  isConfigured() {
    return true; // uses public RSS feeds
  }

  async healthCheck() {
    try {
      const response = await axios.get(this.rssBase, { timeout: 10000 });
      return { healthy: response.status === 200, message: 'RSS reachable' };
    } catch (err) {
      return { healthy: false, message: err.message };
    }
  }

  async getQuote(symbol) {
    if (!symbol) throw new Error('Symbol parameter is required');

    // MarketWatch doesn't have a documented API; use Playwright's APIRequestContext which handles cookies/redirects
    const url = `${this.basePage}/${symbol}`;
    try {
      // Try using Playwright's API context first (lightweight, cookie-aware)
      const response = await this.circuitBreaker.execute(() => this.retryHandler.execute(async () => {
        const pw = await chromium.launch();
        const context = await pw.newContext();
        const api = context.request;
        const res = await api.get(url, { timeout: 10000 });
        const text = await res.text();
        await context.close();
        await pw.close();
        return { status: res.status(), body: text };
      }, { provider: 'marketwatch', query: `quote-${symbol}` }));

      if (response && response.status === 200 && response.body) {
        // Basic text scan for price patterns; fallback to opening a headless page if we can't parse reliably
        const priceMatch = response.body.match(/\b(?:\$)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\b/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          return { provider: 'marketwatch', symbol: symbol.toUpperCase(), price, sourceUrl: url, note: 'extracted from APIRequestContext HTML' };
        }
      }

      // Fallback: launch a headless page and evaluate DOM selectors with Playwright (more robust)
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      // Use page.locator with Playwright recommended patterns (auto-waiting)
      const priceLocator = page.locator('[class*="intraday__price"] >> text=\S').first().locator('xpath=..');
      let price = null;
      try {
        const priceText = await page.locator('[class*="intraday__price"]').textContent({ timeout: 3000 }).catch(() => null);
        if (priceText) price = parseFloat(priceText.replace(/[^0-9.-]+/g, ''));
      } catch (e) {
        // ignore
      }

      // try alternate selector
      if (price === null || Number.isNaN(price)) {
        const alt = await page.locator('[class*="price"]').textContent({ timeout: 2000 }).catch(() => null);
        if (alt) price = parseFloat(alt.replace(/[^0-9.-]+/g, ''));
      }

      await browser.close();

      if (price === null || Number.isNaN(price)) throw new Error('Could not extract price from MarketWatch page');
      return { provider: 'marketwatch', symbol: symbol.toUpperCase(), price, sourceUrl: url, note: 'extracted via Playwright page' };
    } catch (err) {
      logger.warn('marketwatch quote failed', { symbol, error: err.message });
      throw new Error(`MarketWatch quote failed: ${err.message}`);
    }
  }

  async getHistorical(symbol, params = {}) {
    if (!symbol) throw new Error('Symbol parameter is required');

    // MarketWatch doesn't offer a documented public CSV API; we'll attempt Playwright APIRequestContext to download CSV or fall back to page scraping
    const { period1, period2 } = params;
    const csvUrl = `${this.basePage}/${symbol}/download-data?modified=true`;
    try {
      const response = await this.circuitBreaker.execute(() => this.retryHandler.execute(async () => {
        const pw = await chromium.launch();
        const context = await pw.newContext();
        const api = context.request;
        const res = await api.get(csvUrl, { timeout: 15000 });
        const text = await res.text();
        await context.close();
        await pw.close();
        return { status: res.status(), body: text };
      }, { provider: 'marketwatch', query: `historical-csv-${symbol}` }));

      if (response && response.status === 200 && response.body) {
        const lines = response.body.split(/\r?\n/).filter(Boolean);
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 5) continue;
          const [date, open, high, low, close, volume] = cols;
          rows.push({ date, open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), close: parseFloat(close), volume: parseInt(volume || '0', 10) });
        }
        if (rows.length > 0) return { provider: 'marketwatch', symbol: symbol.toUpperCase(), data: rows, sourceUrl: csvUrl };
      }

      // If CSV not available, attempt page-based extraction (may be limited)
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`${this.basePage}/${symbol}/historical`, { waitUntil: 'networkidle' });
      // Example: table rows
      const rows = await page.$$eval('table tbody tr', trs => trs.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim())));
      await browser.close();

      const parsed = rows.map(cols => ({ date: cols[0], close: parseFloat(cols[4].replace(/[^0-9.-]+/g, '')) }));
      if (parsed.length === 0) throw new Error('No historical data found on page');
      return { provider: 'marketwatch', symbol: symbol.toUpperCase(), data: parsed };
    } catch (err) {
      logger.warn('marketwatch historical failed', { symbol, error: err.message });
      throw new Error(`MarketWatch historical failed: ${err.message}`);
    }
  }

  async getProspectus(symbol) {
    // MarketWatch profile pages are public; we can try to fetch the profile summary via RSS or page scraping.
    try {
      const url = `https://www.marketwatch.com/investing/stock/${symbol}`;
      const res = await axios.get(url, { timeout: 10000 });
      // Simplified: extract the <meta name="description"> content as a short profile
      const match = res.data.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      const profile = match ? match[1] : null;
      return {
        symbol,
        profile: profile || 'Profile not available',
        source: 'marketwatch'
      };
    } catch (err) {
      logger.warn('marketwatch-prospectus-failed', { symbol, error: err.message });
      throw new Error(`MarketWatch prospectus fetch failed: ${err.message}`);
    }
  }

  /**
   * Parse MarketWatch RSS feed and return recent items mentioning the symbol
   */
  parseRSSForSymbol(rssXml, symbol) {
    const articles = [];
    try {
      const itemMatches = rssXml.match(/<item[\s\S]*?<\/item>/gi);
      if (itemMatches) {
        for (const item of itemMatches) {
          const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          const descMatch = item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
          const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          const pubMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

          const title = titleMatch ? (titleMatch[1] || '').trim() : '';
          const description = descMatch ? (descMatch[1] || '').trim() : '';
          const link = linkMatch ? (linkMatch[1] || '').trim() : '';
          const publishedAt = pubMatch ? new Date(pubMatch[1]).toISOString() : new Date().toISOString();

          const lower = (title + ' ' + description).toLowerCase();
          if (lower.includes(symbol.toLowerCase())) {
            articles.push({ title, description, url: link, publishedAt, source: 'MarketWatch' });
          }
        }
      }
    } catch (err) {
      logger.warn('marketwatch-rss-parse-failed', { symbol, error: err.message });
    }

    return articles.slice(0, 5);
  }

  async searchNews(symbol, { count = 5 } = {}) {
    try {
      const response = await axios.get(this.rssBase, { timeout: 10000 });
      if (!response.data) return { status: 'ok', totalResults: 0, articles: [] };
      const articles = this.parseRSSForSymbol(response.data, symbol).slice(0, count);
      return { status: 'ok', symbol: symbol.toUpperCase(), totalResults: articles.length, articles, provider: 'marketwatch' };
    } catch (err) {
      logger.warn('marketwatch-search-failed', { symbol, error: err.message });
      return { status: 'error', message: err.message };
    }
  }
}
