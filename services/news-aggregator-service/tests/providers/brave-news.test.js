import BraveNewsProvider from '../src/providers/brave-news.js';

describe('BraveNewsProvider', () => {
  let provider;

  beforeEach(() => {
    // Clear any existing environment variables
    delete process.env.BRAVE_NEWS_API_KEY;

    // Create a new provider instance for each test
    provider = new BraveNewsProvider();
  });

  describe('initialization', () => {
    test('should initialize without API key', () => {
      expect(provider).toBeDefined();
      expect(provider.isConfigured()).toBe(false);
    });

    test('should initialize with API key', () => {
      process.env.BRAVE_NEWS_API_KEY = 'test-api-key';
      const configuredProvider = new BraveNewsProvider();
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    test('should return false when API key is not set', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    test('should return true when API key is set', () => {
      process.env.BRAVE_NEWS_API_KEY = 'test-api-key';
      const configuredProvider = new BraveNewsProvider();
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('searchNews', () => {
    test('should throw error when API key is not configured', async () => {
      await expect(provider.searchNews({ query: 'test' })).rejects.toThrow('Brave News API key not configured');
    });

    test('should throw error when query is missing', async () => {
      process.env.BRAVE_NEWS_API_KEY = 'test-api-key';
      const configuredProvider = new BraveNewsProvider();
      await expect(configuredProvider.searchNews({})).rejects.toThrow('Query parameter is required');
    });
  });

  describe('getTrendingTopics', () => {
    test('should throw error when API key is not configured', async () => {
      await expect(provider.getTrendingTopics()).rejects.toThrow('Brave News API key not configured');
    });
  });

  describe('getNewsByCategory', () => {
    test('should throw error when API key is not configured', async () => {
      await expect(provider.getNewsByCategory('business')).rejects.toThrow('Brave News API key not configured');
    });
  });

  describe('healthCheck', () => {
    test('should return unhealthy when API key is not configured', async () => {
      const health = await provider.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.message).toBe('API key not configured');
    });
  });
});