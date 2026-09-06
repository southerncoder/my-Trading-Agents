import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BLSClient } from '../../../src/clients/BLSClient.js';
import { BLSSeries, BLSDataPoint, BLSSeriesInfo } from '../../../src/types/index.js';

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
    getTokensRemaining: vi.fn().mockReturnValue(25)
  }))
}));

describe('BLSClient', () => {
  let blsClient: BLSClient;
  let mockAxiosInstance: any;
  const testApiKey = 'test-bls-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    blsClient = new BLSClient(testApiKey, globalThis.testConfig.userAgent);
    mockAxiosInstance = (blsClient as any).client;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize without API key (public access)', () => {
      const publicClient = new BLSClient(undefined, globalThis.testConfig.userAgent);
      expect(publicClient).toBeInstanceOf(BLSClient);
    });

    it('should initialize with API key (registered access)', () => {
      expect(blsClient).toBeInstanceOf(BLSClient);
    });
  });

  describe('getSeriesData', () => {
    const mockSeriesData: BLSSeries = {
      seriesID: 'LNS14000000',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '3.7',
          footnotes: []
        },
        {
          year: '2023',
          period: 'M11',
          periodName: 'November',
          latest: 'false',
          value: '3.7',
          footnotes: []
        }
      ]
    };

    it('should fetch series data successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          responseTime: 100,
          message: [],
          Results: {
            series: [mockSeriesData]
          }
        },
        status: 200
      });

      const result = await blsClient.getSeriesData(['LNS14000000']);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'POST',
        url: '/publicAPI/v2/timeseries/data/',
        data: {
          seriesid: ['LNS14000000'],
          registrationkey: testApiKey
        },
        timeout: 30000
      });
      expect(result).toEqual([mockSeriesData]);
    });

    it('should handle date range parameters', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockSeriesData] }
        },
        status: 200
      });

      await blsClient.getSeriesData(['LNS14000000'], {
        startYear: 2022,
        endYear: 2023
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'POST',
        url: '/publicAPI/v2/timeseries/data/',
        data: {
          seriesid: ['LNS14000000'],
          startyear: '2022',
          endyear: '2023',
          registrationkey: testApiKey
        },
        timeout: 30000
      });
    });

    it('should work without API key (public access)', async () => {
      const publicClient = new BLSClient(undefined, globalThis.testConfig.userAgent);
      const publicMockAxios = (publicClient as any).client;
      
      publicMockAxios.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockSeriesData] }
        },
        status: 200
      });

      const result = await publicClient.getSeriesData(['LNS14000000']);

      expect(publicMockAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: '/publicAPI/v2/timeseries/data/',
        data: {
          seriesid: ['LNS14000000']
        },
        timeout: 30000
      });
      expect(result).toEqual([mockSeriesData]);
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_NOT_PROCESSED',
          message: ['Series does not exist'],
          Results: {}
        },
        status: 200
      });

      await expect(blsClient.getSeriesData(['INVALID_SERIES'])).rejects.toThrow('Series does not exist');
    });

    it('should handle empty results', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [] }
        },
        status: 200
      });

      const result = await blsClient.getSeriesData(['EMPTY_SERIES']);
      expect(result).toEqual([]);
    });

    it('should handle multiple series', async () => {
      const multipleSeries = [
        { ...mockSeriesData, seriesID: 'LNS14000000' },
        { ...mockSeriesData, seriesID: 'LNS12000000' }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: multipleSeries }
        },
        status: 200
      });

      const result = await blsClient.getSeriesData(['LNS14000000', 'LNS12000000']);
      expect(result).toHaveLength(2);
      expect(result[0].seriesID).toBe('LNS14000000');
      expect(result[1].seriesID).toBe('LNS12000000');
    });
  });

  describe('getUnemploymentRate', () => {
    const mockUnemploymentData: BLSSeries = {
      seriesID: 'LNS14000000',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '3.7',
          footnotes: []
        }
      ]
    };

    it('should fetch unemployment rate successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockUnemploymentData] }
        },
        status: 200
      });

      const result = await blsClient.getUnemploymentRate({
        startYear: 2023,
        endYear: 2023
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'POST',
        url: '/publicAPI/v2/timeseries/data/',
        data: {
          seriesid: ['LNS14000000'],
          startyear: '2023',
          endyear: '2023',
          registrationkey: testApiKey
        },
        timeout: 30000
      });
      expect(result).toEqual(mockUnemploymentData);
    });

    it('should handle missing unemployment data', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [] }
        },
        status: 200
      });

      await expect(blsClient.getUnemploymentRate()).rejects.toThrow('Unemployment data not found');
    });
  });

  describe('getConsumerPriceIndex', () => {
    const mockCPIData: BLSSeries = {
      seriesID: 'CUUR0000SA0',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '307.026',
          footnotes: []
        }
      ]
    };

    it('should fetch CPI data successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockCPIData] }
        },
        status: 200
      });

      const result = await blsClient.getConsumerPriceIndex({
        startYear: 2023,
        endYear: 2023
      });

      expect(result).toEqual(mockCPIData);
    });
  });

  describe('getProducerPriceIndex', () => {
    const mockPPIData: BLSSeries = {
      seriesID: 'WPUFD49207',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '195.8',
          footnotes: []
        }
      ]
    };

    it('should fetch PPI data successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockPPIData] }
        },
        status: 200
      });

      const result = await blsClient.getProducerPriceIndex({
        startYear: 2023,
        endYear: 2023
      });

      expect(result).toEqual(mockPPIData);
    });
  });

  describe('getAverageHourlyEarnings', () => {
    const mockEarningsData: BLSSeries = {
      seriesID: 'CES0500000003',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '34.27',
          footnotes: []
        }
      ]
    };

    it('should fetch average hourly earnings successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [mockEarningsData] }
        },
        status: 200
      });

      const result = await blsClient.getAverageHourlyEarnings({
        startYear: 2023,
        endYear: 2023
      });

      expect(result).toEqual(mockEarningsData);
    });
  });

  describe('getEconomicIndicators', () => {
    it('should fetch multiple economic indicators', async () => {
      const mockIndicators = [
        { seriesID: 'LNS14000000', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '3.7', footnotes: [] }] },
        { seriesID: 'CUUR0000SA0', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '307.026', footnotes: [] }] },
        { seriesID: 'WPUFD49207', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '195.8', footnotes: [] }] }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: mockIndicators }
        },
        status: 200
      });

      const result = await blsClient.getEconomicIndicators({
        startYear: 2023,
        endYear: 2023
      });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'POST',
        url: '/publicAPI/v2/timeseries/data/',
        data: {
          seriesid: ['LNS14000000', 'CUUR0000SA0', 'WPUFD49207', 'CES0500000003'],
          startyear: '2023',
          endyear: '2023',
          registrationkey: testApiKey
        },
        timeout: 30000
      });
      expect(result).toEqual(mockIndicators);
    });

    it('should handle partial failures in economic indicators', async () => {
      const partialResults = [
        { seriesID: 'LNS14000000', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '3.7', footnotes: [] }] }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: partialResults }
        },
        status: 200
      });

      const result = await blsClient.getEconomicIndicators({
        startYear: 2023,
        endYear: 2023
      });

      expect(result).toEqual(partialResults);
    });
  });

  describe('getLaborMarketIndicators', () => {
    it('should fetch labor market indicators', async () => {
      const mockLaborData = [
        { seriesID: 'LNS14000000', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '3.7', footnotes: [] }] },
        { seriesID: 'LNS11300000', data: [{ year: '2023', period: 'M12', periodName: 'December', latest: 'true', value: '166.661', footnotes: [] }] }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: mockLaborData }
        },
        status: 200
      });

      const result = await blsClient.getLaborMarketIndicators({
        startYear: 2023,
        endYear: 2023
      });

      expect(result).toEqual(mockLaborData);
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter configured', () => {
      const status = blsClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle different rate limits for registered vs public access', () => {
      const publicClient = new BLSClient(undefined, globalThis.testConfig.userAgent);
      const registeredClient = new BLSClient('api-key', globalThis.testConfig.userAgent);

      const publicStatus = publicClient.getRateLimiterStatus();
      const registeredStatus = registeredClient.getRateLimiterStatus();

      expect(publicStatus).toBeDefined();
      expect(registeredStatus).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle BLS API errors', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_NOT_PROCESSED',
          message: ['Invalid series ID'],
          Results: {}
        },
        status: 200
      });

      await expect(blsClient.getSeriesData(['INVALID'])).rejects.toThrow('Invalid series ID');
    });

    it('should handle network errors', async () => {
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };
      mockAxiosInstance.mockRejectedValueOnce(networkError);

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout exceeded' };
      mockAxiosInstance.mockRejectedValueOnce(timeoutError);

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { message: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(rateLimitError);

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(serverError);

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });

    it('should handle malformed responses', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: null,
        status: 200
      });

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });

    it('should handle missing Results in response', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED'
          // Missing Results field
        },
        status: 200
      });

      await expect(blsClient.getSeriesData(['LNS14000000'])).rejects.toThrow();
    });
  });

  describe('data validation', () => {
    it('should validate series ID format', async () => {
      // BLS series IDs typically follow specific patterns
      const validSeriesIds = ['LNS14000000', 'CUUR0000SA0', 'WPUFD49207'];
      const invalidSeriesIds = ['', 'INVALID', '123'];

      for (const validId of validSeriesIds) {
        mockAxiosInstance.mockResolvedValueOnce({
          data: {
            status: 'REQUEST_SUCCEEDED',
            Results: { series: [] }
          },
          status: 200
        });

        // Should not throw for valid IDs
        await expect(blsClient.getSeriesData([validId])).resolves.toBeDefined();
      }
    });

    it('should handle year range validation', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [] }
        },
        status: 200
      });

      // Should handle reasonable year ranges
      await expect(blsClient.getSeriesData(['LNS14000000'], {
        startYear: 2020,
        endYear: 2023
      })).resolves.toBeDefined();
    });
  });
});