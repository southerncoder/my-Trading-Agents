import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CensusClient } from '../../../src/clients/CensusClient.js';
import { CensusVariable } from '../../../src/types/index.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => Object.assign(vi.fn(), {
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
  RateLimiter: vi.fn(function () {
    return {
    removeTokens: vi.fn().mockResolvedValue(1),
    getTokensRemaining: vi.fn().mockReturnValue(50)
    };
  })
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

  // Census API responses are tables: the first row holds column names
  const table = (...rows: (string | number)[][]) => rows.map(r => r.map(String));

  const okResponse = (data: unknown) => ({ data, status: 200 });

  describe('getACSData', () => {
    it('should parse the header row and convert numeric columns', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(
        ['NAME', 'B01001_001E', 'state'],
        ['California', 39538223, '06'],
        ['Texas', 29145505, '48']
      )));

      const result = await censusClient.getACSData(2022, ['NAME', 'B01001_001E'], 'state:*');

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/2022/acs/acs5',
          params: { get: 'NAME,B01001_001E', for: 'state:*' }
        })
      );
      // 'state' codes such as "06" are numeric strings, so they are converted too
      expect(result).toEqual([
        { NAME: 'California', B01001_001E: 39538223, state: 6 },
        { NAME: 'Texas', B01001_001E: 29145505, state: 48 }
      ]);
    });

    it('should add state, county and tract filters to the "in" parameter', async () => {
      mockAxiosInstance.mockResolvedValue(okResponse(table(['NAME'], ['x'])));

      await censusClient.getACSData(2022, ['NAME'], 'county:*', { state: '06' });
      expect(mockAxiosInstance).toHaveBeenLastCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ in: 'state:06' }) })
      );

      await censusClient.getACSData(2022, ['NAME'], 'tract:*', { state: '06', county: '037' });
      expect(mockAxiosInstance).toHaveBeenLastCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ in: 'state:06 county:037' }) })
      );

      await censusClient.getACSData(2022, ['NAME'], 'block group:*', { state: '06', county: '037', tract: '123400' });
      expect(mockAxiosInstance).toHaveBeenLastCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ in: 'state:06 county:037 tract:123400' }) })
      );
    });

    it('should return an empty array for an empty response', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse([]));
      expect(await censusClient.getACSData(2022, ['NAME'], 'state:*')).toEqual([]);
    });

    it('should return only headers-as-no-rows as an empty array', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'state'])));
      expect(await censusClient.getACSData(2022, ['NAME'], 'state:*')).toEqual([]);
    });

    it('should rethrow API errors', async () => {
      mockAxiosInstance.mockRejectedValue({ response: { status: 400, data: 'error: unknown variable' } });
      await expect(censusClient.getACSData(2022, ['BAD'], 'state:*')).rejects.toBeDefined();
    });
  });

  describe('getStateEconomicData', () => {
    it('should use default economic variables when none are given', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'B01001_001E'], ['California', 39538223])));

      const result = await censusClient.getStateEconomicData(2022, []);

      const params = mockAxiosInstance.mock.calls[0][0].params;
      expect(params.for).toBe('state:*');
      expect(params.get.split(',')).toEqual(expect.arrayContaining(['NAME', 'B01001_001E', 'B19013_001E', 'B25077_001E']));
      expect(result).toEqual([{ NAME: 'California', B01001_001E: 39538223 }]);
    });

    it('should use the supplied variables', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME'], ['California'])));

      await censusClient.getStateEconomicData(2022, ['NAME']);

      expect(mockAxiosInstance.mock.calls[0][0].params.get).toBe('NAME');
    });
  });

  describe('getCountyEconomicData', () => {
    it('should request all counties within a state', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'B01001_001E'], ['Los Angeles County, California', 10014009])));

      const result = await censusClient.getCountyEconomicData(2022, [], '06');

      const params = mockAxiosInstance.mock.calls[0][0].params;
      expect(params).toEqual(expect.objectContaining({ for: 'county:*', in: 'state:06' }));
      expect(result).toEqual([{ NAME: 'Los Angeles County, California', B01001_001E: 10014009 }]);
    });
  });

  describe('getMetropolitanAreaData', () => {
    it('should request metropolitan statistical areas', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME'], ['Los Angeles-Long Beach-Anaheim, CA Metro Area'])));

      const result = await censusClient.getMetropolitanAreaData(2022, []);

      expect(mockAxiosInstance.mock.calls[0][0].params.for).toBe(
        'metropolitan statistical area/micropolitan statistical area:*'
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getPopulationEstimates', () => {
    it('should request state population estimates', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'POP'], ['California', 39000000])));

      const result = await censusClient.getPopulationEstimates(2022, 'state');

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/2022/pep/population',
          params: { get: 'NAME,POP,BIRTHS,DEATHS,NETMIG', for: 'state:*' }
        })
      );
      expect(result).toEqual([{ NAME: 'California', POP: 39000000 }]);
    });

    it('should scope county estimates to a state', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'POP'], ['Alameda County', 1600000])));

      await censusClient.getPopulationEstimates(2022, 'county', { state: '06' });

      expect(mockAxiosInstance.mock.calls[0][0].params).toEqual(
        expect.objectContaining({ for: 'county:*', in: 'state:06' })
      );
    });

    it('should return an empty array when there is no data', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse([]));
      expect(await censusClient.getPopulationEstimates(2022, 'state')).toEqual([]);
    });
  });

  describe('getCountyBusinessPatterns', () => {
    it('should request business patterns for all states by default', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'EMP', 'ESTAB'], ['California', 100, 10])));

      const result = await censusClient.getCountyBusinessPatterns(2021);

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/2021/cbp',
          params: expect.objectContaining({ for: 'state:*' })
        })
      );
      expect(result).toEqual([{ NAME: 'California', EMP: 100, ESTAB: 10 }]);
    });

    it('should narrow by state, county and NAICS code', async () => {
      mockAxiosInstance.mockResolvedValue(okResponse(table(['NAME'], ['x'])));

      await censusClient.getCountyBusinessPatterns(2021, { state: '06' });
      expect(mockAxiosInstance.mock.calls[0][0].params.for).toBe('state:06');

      await censusClient.getCountyBusinessPatterns(2021, { state: '06', county: '037', naicsCode: '52' });
      const params = mockAxiosInstance.mock.calls[1][0].params;
      expect(params).toEqual(expect.objectContaining({ for: 'county:037', in: 'state:06', NAICS2017: '52' }));
    });
  });

  describe('searchVariables', () => {
    const mockVariables: Record<string, Partial<CensusVariable>> = {
      B19013_001E: { label: 'Estimate!!Median household income', concept: 'MEDIAN HOUSEHOLD INCOME' },
      B01001_001E: { label: 'Estimate!!Total', concept: 'SEX BY AGE' }
    };

    it('should return variables whose label, concept or name match, with the name attached', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse({ variables: mockVariables }));

      const result = await censusClient.searchVariables(2022, 'acs/acs5', 'income');

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', url: '/2022/acs/acs5/variables.json' })
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ name: 'B19013_001E', concept: 'MEDIAN HOUSEHOLD INCOME' }));
    });

    it('should match case-insensitively and by variable name', async () => {
      mockAxiosInstance.mockResolvedValue(okResponse({ variables: mockVariables }));

      expect(await censusClient.searchVariables(2022, 'acs/acs5', 'INCOME')).toHaveLength(1);
      expect(await censusClient.searchVariables(2022, 'acs/acs5', 'b01001')).toHaveLength(1);
    });

    it('should return an empty array when the dataset has no variables', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse({}));
      expect(await censusClient.searchVariables(2022, 'acs/acs5', 'income')).toEqual([]);
    });
  });

  describe('getEconomicIndicators', () => {
    const response = okResponse(table(['NAME', 'B01001_001E'], ['California', 39538223]));

    it('should fall back to all states', async () => {
      mockAxiosInstance.mockResolvedValueOnce(response);

      await censusClient.getEconomicIndicators(2022);

      expect(mockAxiosInstance.mock.calls[0][0].params.for).toBe('state:*');
    });

    it('should request a single state', async () => {
      mockAxiosInstance.mockResolvedValueOnce(response);

      await censusClient.getEconomicIndicators(2022, { state: '06' });

      expect(mockAxiosInstance.mock.calls[0][0].params.for).toBe('state:06');
    });

    it('should request counties for a state when asked', async () => {
      mockAxiosInstance.mockResolvedValueOnce(response);

      await censusClient.getEconomicIndicators(2022, { state: '06', includeCounties: true });

      expect(mockAxiosInstance.mock.calls[0][0].params).toEqual(
        expect.objectContaining({ for: 'county:*', in: 'state:06' })
      );
    });
  });

  describe('getDemographicAnalysis', () => {
    beforeEach(() => {
      mockAxiosInstance.mockResolvedValue(okResponse(table(['NAME'], ['x'])));
    });

    it('should support state, county and msa geographies', async () => {
      await censusClient.getDemographicAnalysis(2022, 'state');
      expect(mockAxiosInstance.mock.calls[0][0].params.for).toBe('state:*');

      await censusClient.getDemographicAnalysis(2022, 'county', { state: '06' });
      expect(mockAxiosInstance.mock.calls[1][0].params.for).toBe('county:*');

      await censusClient.getDemographicAnalysis(2022, 'msa');
      expect(mockAxiosInstance.mock.calls[2][0].params.for).toContain('metropolitan statistical area');
    });

    it('should require a state for county analysis', async () => {
      await expect(censusClient.getDemographicAnalysis(2022, 'county')).rejects.toThrow(
        'State parameter required for county-level data'
      );
    });

    it('should reject unsupported geographies', async () => {
      await expect(censusClient.getDemographicAnalysis(2022, 'zip' as any)).rejects.toThrow('Unsupported geography: zip');
    });
  });

  describe('getMarketCorrelationData', () => {
    it('should return state-level data with the correlation variables', async () => {
      mockAxiosInstance.mockResolvedValueOnce(okResponse(table(['NAME', 'B19301_001E'], ['California', 41276])));

      const result = await censusClient.getMarketCorrelationData(2022);

      const params = mockAxiosInstance.mock.calls[0][0].params;
      expect(params.for).toBe('state:*');
      expect(params.get.split(',')).toEqual(expect.arrayContaining(['B19301_001E', 'B08134_001E']));
      expect(result).toEqual([{ NAME: 'California', B19301_001E: 41276 }]);
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter configured', () => {
      expect(censusClient.getRateLimiterStatus()).toBeDefined();
    });
  });

  describe('error handling', () => {
    it.each([
      ['network errors', new Error('Network Error')],
      ['timeouts', Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ECONNABORTED' })],
      ['rate limits', { response: { status: 429, data: 'Too Many Requests' } }],
      ['server errors', { response: { status: 500, data: 'Internal Server Error' } }]
    ])('should surface %s', async (_name, error) => {
      mockAxiosInstance.mockRejectedValue(error);
      await expect(censusClient.getACSData(2022, ['NAME'], 'state:*')).rejects.toBeDefined();
    });
  });
});
