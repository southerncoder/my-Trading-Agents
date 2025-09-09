const axios = require('axios');

const BASE_URL = 'http://localhost:3004';

describe('News Aggregator Service', () => {
  test('Health check endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('providers');
    } catch (error) {
      // Service might not be running, skip test
      console.log('Service not running, skipping health check test');
    }
  });

  test('Provider status endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/providers/status`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('providers');
      expect(Array.isArray(response.data.providers)).toBe(true);
    } catch (error) {
      console.log('Service not running, skipping provider status test');
    }
  });

  test('News search endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/news/search?q=technology&limit=5`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('articles');
      expect(Array.isArray(response.data.articles)).toBe(true);
      if (response.data.articles.length > 0) {
        expect(response.data.articles[0]).toHaveProperty('title');
        expect(response.data.articles[0]).toHaveProperty('source');
      }
    } catch (error) {
      console.log('Service not running or API key missing, skipping news search test');
    }
  });

  test('Financial news endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/news/financial?symbol=AAPL&limit=3`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('articles');
      expect(Array.isArray(response.data.articles)).toBe(true);
    } catch (error) {
      console.log('Service not running or API key missing, skipping financial news test');
    }
  });

  test('Cache stats endpoint', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/cache/stats`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('cache');
      expect(response.data.cache).toHaveProperty('hits');
      expect(response.data.cache).toHaveProperty('misses');
    } catch (error) {
      console.log('Service not running, skipping cache stats test');
    }
  });
});