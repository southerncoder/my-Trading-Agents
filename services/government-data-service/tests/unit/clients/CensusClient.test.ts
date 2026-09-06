import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CensusClient } from '../../../src/clients/CensusClient.js';
import { CensusVariable, CensusData } from '../../../src/types/index.js';

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
    getTokensRemaining: vi.fn().mockReturnValue(50)
  }))
}));

describe('CensusClient', () => {
  let censusClient: CensusClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    censusClient = new CensusClient(globalThis.testConfig.userAgent);
    mockAxiosInstance = (censusClient as any).client;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(censusClient).toBeInstanceOf(CensusClient);
    });

    it('should initialize with custom user agent', () => {
      const customUserAgent = 'Custom/1.0.0 (test@custom.com)';
      const client = new CensusClient(customUserAgent);
      expect(client).toBeInstanceOf(CensusClient);
    });
  });

  describe('getVariables', () => {
    const mockVariables: CensusVariable[] = [
      {
        name: 'NAME',
        label: 'Geographic Area Name',
        concept: 'Geography',
        predicateType: 'string',
        group: 'N/A',
        limit: 0
      },
      {
        name: 'B01001_001E',
        label: 'Total Population',
        concept: 'Age and Sex',
        predicateType: 'int',
        group: 'B01001',
        limit: 0
      }
    ];

    it('should fetch variables successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          variables: mockVariables.reduce((acc, variable) => {
            acc[variable.name] = variable;
            return acc;
          }, {} as Record<string, CensusVariable>)
        },
        status: 200
      });

      const result = await censusClient.getVariables('acs', 'acs5', 2021);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5/variables.json',
        timeout: 30000
      });
      expect(result).toEqual(mockVariables);
    });

    it('should handle empty variables response', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { variables: {} },
        status: 200
      });

      const result = await censusClient.getVariables('acs', 'acs5', 2021);
      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Dataset not found' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(apiError);

      await expect(censusClient.getVariables('invalid', 'invalid', 2021)).rejects.toThrow();
    });
  });

  describe('getData', () => {
    const mockCensusData: CensusData[] = [
      {
        'NAME': 'California',
        'B01001_001E': '39538223',
        'state': '06'
      },
      {
        'NAME': 'Texas',
        'B01001_001E': '29145505',
        'state': '48'
      }
    ];

    it('should fetch data successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'state'],
          ['California', '39538223', '06'],
          ['Texas', '29145505', '48']
        ],
        status: 200
      });

      const result = await censusClient.getData(
        'acs',
        'acs5',
        2021,
        ['NAME', 'B01001_001E'],
        { for: 'state:*' }
      );

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'state:*'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCensusData);
    });

    it('should handle geographic filters', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'county', 'state'],
          ['Los Angeles County, California', '10014009', '037', '06']
        ],
        status: 200
      });

      const result = await censusClient.getData(
        'acs',
        'acs5',
        2021,
        ['NAME', 'B01001_001E'],
        { for: 'county:037', in: 'state:06' }
      );

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'county:037',
          in: 'state:06'
        },
        timeout: 30000
      });
      expect(result).toHaveLength(1);
      expect(result[0]['NAME']).toBe('Los Angeles County, California');
    });

    it('should handle empty data response', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [['NAME', 'B01001_001E']],
        status: 200
      });

      const result = await censusClient.getData(
        'acs',
        'acs5',
        2021,
        ['NAME', 'B01001_001E'],
        { for: 'state:99' } // Non-existent state
      );

      expect(result).toEqual([]);
    });

    it('should handle malformed data response', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: null,
        status: 200
      });

      await expect(censusClient.getData(
        'acs',
        'acs5',
        2021,
        ['NAME'],
        { for: 'state:*' }
      )).rejects.toThrow();
    });

    it('should handle invalid variable names', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { error: 'Invalid variable name' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(badRequestError);

      await expect(censusClient.getData(
        'acs',
        'acs5',
        2021,
        ['INVALID_VARIABLE'],
        { for: 'state:*' }
      )).rejects.toThrow();
    });
  });

  describe('getStateData', () => {
    const mockStateData: CensusData[] = [
      {
        'NAME': 'California',
        'B01001_001E': '39538223',
        'state': '06'
      }
    ];

    it('should fetch state data successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'state'],
          ['California', '39538223', '06']
        ],
        status: 200
      });

      const result = await censusClient.getStateData(2021, ['NAME', 'B01001_001E']);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'state:*'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockStateData);
    });

    it('should fetch specific state data', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'state'],
          ['California', '39538223', '06']
        ],
        status: 200
      });

      const result = await censusClient.getStateData(2021, ['NAME', 'B01001_001E'], '06');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'state:06'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockStateData);
    });
  });

  describe('getStateEconomicData', () => {
    it('should fetch state economic data', async () => {
      const mockEconomicData = [
        {
          'NAME': 'California',
          'B19013_001E': '80440',
          'B25077_001E': '684800',
          'state': '06'
        }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B19013_001E', 'B25077_001E', 'state'],
          ['California', '80440', '684800', '06']
        ],
        status: 200
      });

      const result = await censusClient.getStateEconomicData(2021, ['NAME', 'B19013_001E', 'B25077_001E']);

      expect(result).toEqual(mockEconomicData);
    });
  });

  describe('getCountyData', () => {
    const mockCountyData: CensusData[] = [
      {
        'NAME': 'Los Angeles County, California',
        'B01001_001E': '10014009',
        'county': '037',
        'state': '06'
      }
    ];

    it('should fetch county data for all counties', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'county', 'state'],
          ['Los Angeles County, California', '10014009', '037', '06']
        ],
        status: 200
      });

      const result = await censusClient.getCountyData(2021, ['NAME', 'B01001_001E']);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'county:*'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCountyData);
    });

    it('should fetch county data for specific state', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'county', 'state'],
          ['Los Angeles County, California', '10014009', '037', '06']
        ],
        status: 200
      });

      const result = await censusClient.getCountyData(2021, ['NAME', 'B01001_001E'], '06');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'county:*',
          in: 'state:06'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCountyData);
    });

    it('should fetch specific county data', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B01001_001E', 'county', 'state'],
          ['Los Angeles County, California', '10014009', '037', '06']
        ],
        status: 200
      });

      const result = await censusClient.getCountyData(2021, ['NAME', 'B01001_001E'], '06', '037');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B01001_001E',
          for: 'county:037',
          in: 'state:06'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCountyData);
    });
  });

  describe('getEconomicIndicators', () => {
    it('should fetch economic indicators', async () => {
      const mockEconomicIndicators = [
        {
          'NAME': 'United States',
          'B19013_001E': '70784',
          'B25077_001E': '229800',
          'B08303_001E': '27.6',
          'us': '1'
        }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B19013_001E', 'B25077_001E', 'B08303_001E', 'us'],
          ['United States', '70784', '229800', '27.6', '1']
        ],
        status: 200
      });

      const result = await censusClient.getEconomicIndicators(2021);

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B19013_001E,B25077_001E,B08303_001E',
          for: 'us:1'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockEconomicIndicators);
    });

    it('should handle missing economic data', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [['NAME', 'B19013_001E', 'B25077_001E', 'B08303_001E', 'us']],
        status: 200
      });

      const result = await censusClient.getEconomicIndicators(2021);
      expect(result).toEqual([]);
    });
  });

  describe('getMarketCorrelationData', () => {
    it('should fetch market correlation data', async () => {
      const mockCorrelationData = [
        {
          'NAME': 'California',
          'B19013_001E': '80440',
          'B25077_001E': '684800',
          'B08303_001E': '29.2',
          'state': '06'
        }
      ];

      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B19013_001E', 'B25077_001E', 'B08303_001E', 'state'],
          ['California', '80440', '684800', '29.2', '06']
        ],
        status: 200
      });

      const result = await censusClient.getMarketCorrelationData(2021);

      expect(result).toEqual(mockCorrelationData);
    });

    it('should fetch market correlation data for specific state', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: [
          ['NAME', 'B19013_001E', 'B25077_001E', 'B08303_001E', 'state'],
          ['California', '80440', '684800', '29.2', '06']
        ],
        status: 200
      });

      const result = await censusClient.getMarketCorrelationData(2021, { state: '06' });

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/data/2021/acs/acs5',
        params: {
          get: 'NAME,B19013_001E,B25077_001E,B08303_001E',
          for: 'state:06'
        },
        timeout: 30000
      });
      expect(result).toEqual(mockCorrelationData);
    });
  });

  describe('searchVariables', () => {
    const mockSearchResults: CensusVariable[] = [
      {
        name: 'B01001_001E',
        label: 'Total Population',
        concept: 'Age and Sex',
        predicateType: 'int',
        group: 'B01001',
        limit: 0
      }
    ];

    it('should search variables by keyword', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          variables: {
            'B01001_001E': mockSearchResults[0]
          }
        },
        status: 200
      });

      const result = await censusClient.searchVariables('acs', 'acs5', 2021, 'population');

      expect(result).toEqual(mockSearchResults);
    });

    it('should return empty array for no matches', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: { variables: {} },
        status: 200
      });

      const result = await censusClient.searchVariables('acs', 'acs5', 2021, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should handle case insensitive search', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: {
          variables: {
            'B01001_001E': mockSearchResults[0]
          }
        },
        status: 200
      });

      const result = await censusClient.searchVariables('acs', 'acs5', 2021, 'POPULATION');
      expect(result).toEqual(mockSearchResults);
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter configured', () => {
      const status = censusClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };
      mockAxiosInstance.mockRejectedValueOnce(networkError);

      await expect(censusClient.getVariables('acs', 'acs5', 2021)).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout exceeded' };
      mockAxiosInstance.mockRejectedValueOnce(timeoutError);

      await expect(censusClient.getVariables('acs', 'acs5', 2021)).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: { error: 'Invalid dataset' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(apiError);

      await expect(censusClient.getVariables('invalid', 'invalid', 2021)).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          data: { error: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(rateLimitError);

      await expect(censusClient.getVariables('acs', 'acs5', 2021)).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(serverError);

      await expect(censusClient.getVariables('acs', 'acs5', 2021)).rejects.toThrow();
    });
  });

  describe('data validation', () => {
    it('should validate year parameter', async () => {
      // Should handle reasonable years
      const validYears = [2019, 2020, 2021, 2022];
      
      for (const year of validYears) {
        mockAxiosInstance.mockResolvedValueOnce({
          data: { variables: {} },
          status: 200
        });

        await expect(censusClient.getVariables('acs', 'acs5', year)).resolves.toBeDefined();
      }
    });

    it('should handle variable name validation', async () => {
      const validVariables = ['NAME', 'B01001_001E', 'B19013_001E'];
      
      mockAxiosInstance.mockResolvedValue({
        data: [['NAME', 'B01001_001E']],
        status: 200
      });

      await expect(censusClient.getData(
        'acs',
        'acs5',
        2021,
        validVariables,
        { for: 'state:*' }
      )).resolves.toBeDefined();
    });

    it('should handle geographic parameter validation', async () => {
      const validGeographies = [
        { for: 'state:*' },
        { for: 'county:*' },
        { for: 'state:06' },
        { for: 'county:037', in: 'state:06' }
      ];

      for (const geography of validGeographies) {
        mockAxiosInstance.mockResolvedValueOnce({
          data: [['NAME']],
          status: 200
        });

        await expect(censusClient.getData(
          'acs',
          'acs5',
          2021,
          ['NAME'],
          geography
        )).resolves.toBeDefined();
      }
    });
  });
});