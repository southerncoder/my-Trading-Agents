import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FREDClient } from '../../../src/clients/FREDClient.js';
import { FREDSeries, FREDObservation, FREDCategory } from '../../../src/types/index.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

// Mock limiter
vi.mock('limiter', () => ({
  RateLimiter: vi.fn(() => ({
    removeTokens: vi.fn().mockResolvedValue(1),
    getTokensRemaining: vi.fn().mockReturnValue(120)
  }))
}));

describe('FREDClient', () => {
  let fredClient: FREDClient;
  let mockAxiosInstance: any;
  const testApiKey = 'test-fred-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    fredClient = new FREDClient(testApiKey, globalThis.testConfig.userAgent);
    mockAxiosInstance = (fredClient as any).client;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(fredClient).toBeInstanceOf(FREDClient);
    });

    it('should throw error without API key', () => {
      expect(() => new FREDClient('')).toThrow('FRED API key is required');
    });
  });

  describe('getSeries', () => {
    const mockSeries: FREDSeries = {
      id: 'GDP',
      realtime_start: '2023-01-01',
      realtime_end: '2023-12-31',
      title: 'Gross Domestic Product',
      observation_start: '1947-01-01',
      observation_end: '2023-07-01',
      frequency: 'Quarterly',
      frequency_short: 'Q',
      units: 'Billions of Dollars',
      units_short: 'Bil. of $',
      seasonal_adjustment: 'Seasonally Adjusted Annual Rate',
      seasonal_adjustment_short: 'SAAR',
      last_updated: '2023-10-26 07:46:03-05',
      popularity: 100,
      notes: 'BEA Account Code: A191RC'
    };

    it('should fetch series information successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          seriess: [mockSeries]
        },
        status: 200
      });

      const result = await fredClient.getSeries('GDP');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/series',
        params: {
          series_id: 'GDP',
          api_key: testApiKey,
          file_type: 'json'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockSeries);
    });

    it('should handle series not found', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          seriess: []
        },
        status: 200
      });

      await expect(fredClient.getSeries('INVALID_SERIES')).rejects.toThrow('Series not found');
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error_code: 400,
            error_message: 'Bad Request. The series does not exist.'
          }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(apiError);

      await expect(fredClient.getSeries('INVALID')).rejects.toThrow();
    });
  });

  describe('getSeriesObservations', () => {
    const mockObservations: FREDObservation[] = [
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-01',
        value: '26854.599'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-04-01',
        value: '27063.011'
      }
    ];

    it('should fetch series observations successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          observations: mockObservations
        },
        status: 200
      });

      const result = await fredClient.getSeriesObservations('GDP');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/series/observations',
        params: {
          series_id: 'GDP',
          api_key: testApiKey,
          file_type: 'json'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockObservations);
    });

    it('should handle date range parameters', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { observations: mockObservations },
        status: 200
      });

      await fredClient.getSeriesObservations('GDP', {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/series/observations',
        params: {
          series_id: 'GDP',
          api_key: testApiKey,
          file_type: 'json',
          observation_start: '2023-01-01',
          observation_end: '2023-12-31'
        },
        timeout: 30000
      });
    });

    it('should handle limit parameter', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { observations: mockObservations.slice(0, 1) },
        status: 200
      });

      const result = await fredClient.getSeriesObservations('GDP', { limit: 1 });

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 1
          })
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should handle empty observations', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { observations: [] },
        status: 200
      });

      const result = await fredClient.getSeriesObservations('EMPTY_SERIES');
      expect(result).toEqual([]);
    });
  });

  describe('searchSeries', () => {
    const mockSearchResults: FREDSeries[] = [
      {
        id: 'GDP',
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        title: 'Gross Domestic Product',
        observation_start: '1947-01-01',
        observation_end: '2023-07-01',
        frequency: 'Quarterly',
        frequency_short: 'Q',
        units: 'Billions of Dollars',
        units_short: 'Bil. of $',
        seasonal_adjustment: 'Seasonally Adjusted Annual Rate',
        seasonal_adjustment_short: 'SAAR',
        last_updated: '2023-10-26 07:46:03-05',
        popularity: 100,
        notes: 'BEA Account Code: A191RC'
      }
    ];

    it('should search series successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          seriess: mockSearchResults
        },
        status: 200
      });

      const result = await fredClient.searchSeries('GDP');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/series/search',
        params: {
          search_text: 'GDP',
          api_key: testApiKey,
          file_type: 'json'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockSearchResults);
    });

    it('should handle search options', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { seriess: mockSearchResults },
        status: 200
      });

      await fredClient.searchSeries('GDP', {
        limit: 10,
        orderBy: 'popularity',
        sortOrder: 'desc'
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/series/search',
        params: {
          search_text: 'GDP',
          api_key: testApiKey,
          file_type: 'json',
          limit: 10,
          order_by: 'popularity',
          sort_order: 'desc'
        },
        timeout: 30000
      });
    });

    it('should handle empty search results', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { seriess: [] },
        status: 200
      });

      const result = await fredClient.searchSeries('NONEXISTENT');
      expect(result).toEqual([]);
    });
  });

  describe('getCategories', () => {
    const mockCategories: FREDCategory[] = [
      {
        id: 32991,
        name: 'Money, Banking, & Finance',
        parent_id: 0
      },
      {
        id: 10,
        name: 'Population, Employment, & Labor Markets',
        parent_id: 0
      }
    ];

    it('should fetch categories successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          categories: mockCategories
        },
        status: 200
      });

      const result = await fredClient.getCategories();

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/categories',
        params: {
          api_key: testApiKey,
          file_type: 'json'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCategories);
    });

    it('should fetch category by ID', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          categories: [mockCategories[0]]
        },
        status: 200
      });

      const result = await fredClient.getCategories(32991);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/categories',
        params: {
          category_id: 32991,
          api_key: testApiKey,
          file_type: 'json'
        },
        timeout: 30000
      });
      expect(result).toEqual([mockCategories[0]]);
    });
  });

  describe('getMultipleSeriesObservations', () => {
    const mockMultipleObservations = {
      'GDP': [
        { realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '26854.599' }
      ],
      'UNRATE': [
        { realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '3.5' }
      ]
    };

    it('should fetch multiple series observations', async () => {
      // Mock multiple API calls
      mockAxiosInstance
        .mockResolvedValueOnce({
          data: { observations: mockMultipleObservations['GDP'] },
          status: 200
        })
        .mockResolvedValueOnce({
          data: { observations: mockMultipleObservations['UNRATE'] },
          status: 200
        });

      const result = await fredClient.getMultipleSeriesObservations(['GDP', 'UNRATE']);

      expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockMultipleObservations);
    });

    it('should handle partial failures gracefully', async () => {
      mockAxiosInstance
        .mockResolvedValueOnce({
          data: { observations: mockMultipleObservations['GDP'] },
          status: 200
        })
        .mockRejectedValueOnce(new Error('Series not found'));

      const result = await fredClient.getMultipleSeriesObservations(['GDP', 'INVALID']);

      expect(result).toEqual({
        'GDP': mockMultipleObservations['GDP'],
        'INVALID': []
      });
    });

    it('should handle date range for multiple series', async () => {
      mockAxiosInstance
        .mockResolvedValueOnce({
          data: { observations: mockMultipleObservations['GDP'] },
          status: 200
        })
        .mockResolvedValueOnce({
          data: { observations: mockMultipleObservations['UNRATE'] },
          status: 200
        });

      await fredClient.getMultipleSeriesObservations(['GDP', 'UNRATE'], {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            observation_start: '2023-01-01',
            observation_end: '2023-12-31'
          })
        })
      );
    });
  });

  describe('getEconomicIndicators', () => {
    it('should fetch economic indicators', async () => {
      const mockIndicators = {
        'GDP': [{ realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '26854.599' }],
        'UNRATE': [{ realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '3.5' }],
        'CPIAUCSL': [{ realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '307.026' }]
      };

      // Mock multiple API calls for different indicators
      mockAxiosInstance
        .mockResolvedValueOnce({ data: { observations: mockIndicators['GDP'] }, status: 200 })
        .mockResolvedValueOnce({ data: { observations: mockIndicators['UNRATE'] }, status: 200 })
        .mockResolvedValueOnce({ data: { observations: mockIndicators['CPIAUCSL'] }, status: 200 });

      const result = await fredClient.getEconomicIndicators({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });

      expect(result).toEqual(mockIndicators);
      expect(mockAxiosInstance).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMarketIndicators', () => {
    it('should fetch market indicators', async () => {
      const mockMarketData = {
        'DGS10': [{ realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '4.25' }],
        'VIXCLS': [{ realtime_start: '2023-01-01', realtime_end: '2023-12-31', date: '2023-01-01', value: '18.5' }]
      };

      // Mock API calls for market indicators
      mockAxiosInstance
        .mockResolvedValue({ data: { observations: [] }, status: 200 })
        .mockResolvedValueOnce({ data: { observations: mockMarketData['DGS10'] }, status: 200 })
        .mockResolvedValueOnce({ data: { observations: mockMarketData['VIXCLS'] }, status: 200 });

      const result = await fredClient.getMarketIndicators({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });

      expect(result).toBeDefined();
      expect(mockAxiosInstance).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter configured for 120 requests per minute', () => {
      const status = fredClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle API key errors', async () => {
      const apiKeyError = {
        response: {
          status: 400,
          data: {
            error_code: 400,
            error_message: 'Bad Request. The api_key parameter is required.'
          }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(apiKeyError);

      await expect(fredClient.getSeries('GDP')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { error_message: 'API rate limit exceeded' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(rateLimitError);

      await expect(fredClient.getSeries('GDP')).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(serverError);

      await expect(fredClient.getSeries('GDP')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };
      mockAxiosInstance.mockRejectedValueOnce(networkError);

      await expect(fredClient.getSeries('GDP')).rejects.toThrow();
    });
  });
});