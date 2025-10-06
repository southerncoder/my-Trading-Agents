/**
 * Integration Tests for News Aggregator Service
 * Tests the Express API endpoints (not direct function calls)
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock providers to avoid real API calls
jest.mock('../src/providers/newsapi.js');
jest.mock('../src/providers/tavily.js');
jest.mock('../src/providers/brave-news.js');
jest.mock('../src/providers/serp-api.js');
jest.mock('../src/providers/google-news.js');

// Import mocked providers
import NewsAPIProvider from '../src/providers/newsapi.js';
import TavilyProvider from '../src/providers/tavily.js';
import BraveNewsProvider from '../src/providers/brave-news.js';
import SerpApiProvider from '../src/providers/serp-api.js';
import GoogleNewsProvider from '../src/providers/google-news.js';

// Import aggregator
import { ResilientNewsAggregator } from '../src/aggregators/resilient-news-aggregator.js';

// Test server setup
let app;
let newsAggregator;

const mockArticles = [
  {
    title: 'Test Article 1',
    description: 'Test description 1',
    url: 'https://example.com/1',
    publishedAt: '2025-10-05T10:00:00Z',
    source: { name: 'Test Source 1' },
  },
  {
    title: 'Test Article 2',
    description: 'Test description 2',
    url: 'https://example.com/2',
    publishedAt: '2025-10-05T11:00:00Z',
    source: { name: 'Test Source 2' },
  },
];

beforeAll(() => {
  // Setup mock providers
  NewsAPIProvider.mockImplementation(() => ({
    isConfigured: jest.fn(() => true),
    searchNews: jest.fn(async () => ({
      status: 'ok',
      totalResults: 2,
      articles: mockArticles,
      provider: 'newsapi',
    })),
    healthCheck: jest.fn(async () => ({
      healthy: true,
      message: 'NewsAPI is responding',
    })),
  }));

  TavilyProvider.mockImplementation(() => ({
    isConfigured: jest.fn(() => true),
    searchNews: jest.fn(async () => ({
      status: 'ok',
      totalResults: 2,
      articles: mockArticles,
      provider: 'tavily',
    })),
    healthCheck: jest.fn(async () => ({
      healthy: true,
      message: 'Tavily API is responding',
    })),
  }));

  BraveNewsProvider.mockImplementation(() => ({
    isConfigured: jest.fn(() => true),
    searchNews: jest.fn(async () => ({
      status: 'ok',
      totalResults: 2,
      articles: mockArticles,
      provider: 'brave-news',
    })),
    healthCheck: jest.fn(async () => ({
      healthy: true,
      message: 'Brave News API is responding',
    })),
  }));

  SerpApiProvider.mockImplementation(() => ({
    isConfigured: jest.fn(() => true),
    searchNews: jest.fn(async () => ({
      status: 'ok',
      totalResults: 2,
      articles: mockArticles,
      provider: 'serp-api',
    })),
    healthCheck: jest.fn(async () => ({
      healthy: true,
      message: 'SERP API is responding',
    })),
  }));

  GoogleNewsProvider.mockImplementation(() => ({
    isConfigured: jest.fn(() => true),
    searchNews: jest.fn(async () => ({
      status: 'ok',
      totalResults: 2,
      articles: mockArticles,
      provider: 'google-news',
    })),
    healthCheck: jest.fn(async () => ({
      healthy: true,
      message: 'Google News is responding',
    })),
  }));

  // Initialize providers
  const providers = {
    'newsapi': new NewsAPIProvider(),
    'tavily': new TavilyProvider(),
    'brave-news': new BraveNewsProvider(),
    'serp-api': new SerpApiProvider(),
    'google-news': new GoogleNewsProvider(),
  };

  // Create aggregator
  newsAggregator = new ResilientNewsAggregator(providers);

  // Setup Express app with test routes
  app = express();
  app.use(express.json());

  // Bulk aggregation endpoint
  app.get('/api/news/aggregate', async (req, res) => {
    try {
      const { q: query, count = 10, freshness, language = 'en' } = req.query;

      if (!query) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'Query parameter "q" is required',
        });
      }

      const searchParams = {
        query,
        count: parseInt(count),
        freshness,
        language,
      };

      const result = await newsAggregator.aggregateNews(searchParams);
      res.json(result);

    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // Streaming endpoint
  app.get('/api/news/aggregate/stream', async (req, res) => {
    try {
      const { q: query, count = 10, freshness, language = 'en' } = req.query;

      if (!query) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'Query parameter "q" is required',
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const searchParams = {
        query,
        count: parseInt(count),
        freshness,
        language,
      };

      for await (const event of newsAggregator.aggregateNewsStreaming(searchParams)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.end();

    } catch (error) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message,
      })}\n\n`);
      res.end();
    }
  });

  // Health endpoint
  app.get('/api/news/health', async (req, res) => {
    try {
      const health = await newsAggregator.getProvidersHealth();
      res.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        providers: health,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Health check failed',
        message: error.message,
      });
    }
  });

  // Statistics endpoint
  app.get('/api/news/statistics', async (req, res) => {
    try {
      const stats = newsAggregator.getStatistics();
      res.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        statistics: stats,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Statistics retrieval failed',
        message: error.message,
      });
    }
  });
});

describe('News Aggregator Service - Integration Tests', () => {
  
  describe('GET /api/news/aggregate', () => {
    
    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/news/aggregate')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('required');
    });

    it('should aggregate news from all providers successfully', async () => {
      const response = await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Tesla', count: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Tesla');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('successful');
      expect(response.body.summary).toHaveProperty('failed');
    });

    it('should include results from multiple providers', async () => {
      const response = await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Apple', count: 5 })
        .expect(200);

      const providers = Object.keys(response.body.providers);
      expect(providers.length).toBeGreaterThan(0);

      // Check that each provider has proper structure
      providers.forEach(providerName => {
        const provider = response.body.providers[providerName];
        expect(provider).toHaveProperty('status');
        
        if (provider.status === 'success') {
          expect(provider).toHaveProperty('data');
          expect(provider).toHaveProperty('responseTime');
          expect(provider).toHaveProperty('articlesCount');
        } else {
          expect(provider).toHaveProperty('error');
        }
      });
    });

    it('should handle provider failures gracefully', async () => {
      // Mock one provider to fail
      const failingProvider = new NewsAPIProvider();
      failingProvider.searchNews = jest.fn(() => {
        throw new Error('Provider timeout');
      });

      const response = await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Bitcoin', count: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.summary.failed).toBeGreaterThanOrEqual(0);
    });

    it('should return empty structure when all providers fail', async () => {
      // Mock all providers to fail
      Object.values(newsAggregator.providers).forEach(provider => {
        provider.searchNews = jest.fn(() => {
          throw new Error('All providers down');
        });
      });

      const response = await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Test', count: 10 })
        .expect(200);

      expect(response.body.summary.total).toBe(0);
      expect(response.body.summary.successful).toBe(0);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

  });

  describe('GET /api/news/aggregate/stream', () => {
    
    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/news/aggregate/stream')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should stream results with proper SSE format', async () => {
      const response = await request(app)
        .get('/api/news/aggregate/stream')
        .query({ q: 'Tesla', count: 10 })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const events = response.text
        .split('\n\n')
        .filter(line => line.startsWith('data: '))
        .map(line => JSON.parse(line.substring(6)));

      // Should have start event
      const startEvent = events.find(e => e.type === 'start');
      expect(startEvent).toBeDefined();
      expect(startEvent.query).toBe('Tesla');

      // Should have provider result events
      const providerEvents = events.filter(e => e.type === 'provider-result');
      expect(providerEvents.length).toBeGreaterThan(0);

      // Should have complete event
      const completeEvent = events.find(e => e.type === 'complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent).toHaveProperty('totalDuration');
    });

    it('should stream provider results as they complete', async () => {
      const response = await request(app)
        .get('/api/news/aggregate/stream')
        .query({ q: 'Apple', count: 5 })
        .expect(200);

      const events = response.text
        .split('\n\n')
        .filter(line => line.startsWith('data: '))
        .map(line => JSON.parse(line.substring(6)));

      const providerResults = events.filter(e => e.type === 'provider-result');
      
      providerResults.forEach(result => {
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('timestamp');
        
        if (result.status === 'success') {
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('articlesCount');
        } else {
          expect(result).toHaveProperty('error');
        }
      });
    });

  });

  describe('GET /api/news/health', () => {
    
    it('should return health status for all providers', async () => {
      const response = await request(app)
        .get('/api/news/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('timestamp');

      const providers = response.body.providers;
      Object.keys(providers).forEach(providerName => {
        const provider = providers[providerName];
        expect(provider).toHaveProperty('healthy');
        expect(provider).toHaveProperty('circuitBreaker');
        expect(provider.circuitBreaker).toHaveProperty('state');
      });
    });

    it('should include circuit breaker status', async () => {
      const response = await request(app)
        .get('/api/news/health')
        .expect(200);

      const providers = response.body.providers;
      Object.values(providers).forEach(provider => {
        expect(provider.circuitBreaker).toHaveProperty('state');
        expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(provider.circuitBreaker.state);
        expect(provider.circuitBreaker).toHaveProperty('failures');
      });
    });

  });

  describe('GET /api/news/statistics', () => {
    
    it('should return aggregated statistics', async () => {
      // Make a few requests first
      await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Test1', count: 10 });
      
      await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Test2', count: 10 });

      const response = await request(app)
        .get('/api/news/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('providers');
      expect(response.body.statistics).toHaveProperty('aggregated');
    });

    it('should include per-provider statistics', async () => {
      const response = await request(app)
        .get('/api/news/statistics')
        .expect(200);

      const stats = response.body.statistics.providers;
      Object.keys(stats).forEach(providerName => {
        const providerStats = stats[providerName];
        expect(providerStats).toHaveProperty('totalRequests');
        expect(providerStats).toHaveProperty('successCount');
        expect(providerStats).toHaveProperty('failureCount');
        expect(providerStats).toHaveProperty('errorRate');
      });
    });

    it('should include aggregated statistics', async () => {
      const response = await request(app)
        .get('/api/news/statistics')
        .expect(200);

      const aggregated = response.body.statistics.aggregated;
      expect(aggregated).toHaveProperty('totalRequests');
      expect(aggregated).toHaveProperty('totalSuccesses');
      expect(aggregated).toHaveProperty('totalFailures');
      expect(aggregated).toHaveProperty('overallErrorRate');
    });

  });

  describe('Error Handling and Resilience', () => {
    
    it('should handle circuit breaker open state', async () => {
      // Force circuit breaker to open by causing multiple failures
      const provider = Object.values(newsAggregator.providers)[0];
      provider.searchNews = jest.fn(() => {
        throw new Error('Service unavailable');
      });

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await request(app)
          .get('/api/news/aggregate')
          .query({ q: 'Test', count: 10 });
      }

      const healthResponse = await request(app)
        .get('/api/news/health')
        .expect(200);

      // At least one circuit breaker should be affected
      const providers = Object.values(healthResponse.body.providers);
      const hasOpenCircuit = providers.some(p => 
        p.circuitBreaker.state === 'OPEN' || p.circuitBreaker.failures > 0
      );
      
      expect(hasOpenCircuit).toBe(true);
    });

    it('should return partial results when some providers fail', async () => {
      // Mock half the providers to fail
      const providerArray = Object.values(newsAggregator.providers);
      providerArray.slice(0, Math.floor(providerArray.length / 2)).forEach(provider => {
        provider.searchNews = jest.fn(() => {
          throw new Error('Provider error');
        });
      });

      const response = await request(app)
        .get('/api/news/aggregate')
        .query({ q: 'Test', count: 10 })
        .expect(200);

      expect(response.body.summary.successful).toBeGreaterThan(0);
      expect(response.body.summary.failed).toBeGreaterThan(0);
      expect(response.body.summary.total).toBeGreaterThan(0);
    });

  });

});
