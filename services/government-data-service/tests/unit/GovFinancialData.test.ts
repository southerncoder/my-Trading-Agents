import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GovFinancialData } from '../../src/GovFinancialData.js';
import { SECClient } from '../../src/clients/SECClient.js';
import { FREDClient } from '../../src/clients/FREDClient.js';
import { BLSClient } from '../../src/clients/BLSClient.js';
import { CensusClient } from '../../src/clients/CensusClient.js';
import { CompanyProfile, EconomicDashboard, MarketIndicators, SearchResults } from '../../src/types/index.js';

// Mock all client classes
vi.mock('../../src/clients/SECClient.js');
vi.mock('../../src/clients/FREDClient.js');
vi.mock('../../src/clients/BLSClient.js');
vi.mock('../../src/clients/CensusClient.js');

describe('GovFinancialData', () => {
  let govData: GovFinancialData;
  let mockSECClient: any;
  let mockFREDClient: any;
  let mockBLSClient: any;
  let mockCensusClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockSECClient = {
      getCompanyByTicker: vi.fn(),
      getCompanyFilings: vi.fn(),
      getCompanyFacts: vi.fn(),
      getCompanyTickers: vi.fn(),
      getRateLimiterStatus: vi.fn().mockReturnValue({ tokensRemaining: 10 })
    };

    mockFREDClient = {
      getMarketIndicators: vi.fn(),
      searchSeries: vi.fn(),
      getMultipleSeriesObservations: vi.fn(),
      getEconomicIndicators: vi.fn(),
      getRateLimiterStatus: vi.fn().mockReturnValue({ tokensRemaining: 120 })
    };

    mockBLSClient = {
      getEconomicIndicators: vi.fn(),
      getLaborMarketIndicators: vi.fn(),
      getRateLimiterStatus: vi.fn().mockReturnValue({ tokensRemaining: 25 })
    };

    mockCensusClient = {
      getMarketCorrelationData: vi.fn(),
      getEconomicIndicators: vi.fn(),
      getRateLimiterStatus: vi.fn().mockReturnValue({ tokensRemaining: 50 })
    };

    // Mock constructors
    (SECClient as any).mockImplementation(() => mockSECClient);
    (FREDClient as any).mockImplementation(() => mockFREDClient);
    (BLSClient as any).mockImplementation(() => mockBLSClient);
    (CensusClient as any).mockImplementation(() => mockCensusClient);

    govData = new GovFinancialData({
      fredApiKey: 'test-fred-key',
      blsApiKey: 'test-bls-key',
      userAgent: globalThis.testConfig.userAgent
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultGovData = new GovFinancialData();
      expect(defaultGovData).toBeInstanceOf(GovFinancialData);
      expect(defaultGovData.sec).toBeDefined();
      expect(defaultGovData.bls).toBeDefined();
      expect(defaultGovData.census).toBeDefined();
    });

    it('should initialize with FRED client when API key provided', () => {
      expect(govData.fred).toBeDefined();
      expect(FREDClient).toHaveBeenCalledWith('test-fred-key', globalThis.testConfig.userAgent);
    });

    it('should not initialize FRED client without API key', () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });
      expect(noFredGovData.fred).toBeUndefined();
    });

    it('should initialize all clients with correct parameters', () => {
      expect(SECClient).toHaveBeenCalledWith(globalThis.testConfig.userAgent);
      expect(BLSClient).toHaveBeenCalledWith('test-bls-key', globalThis.testConfig.userAgent);
      expect(CensusClient).toHaveBeenCalledWith(globalThis.testConfig.userAgent);
    });
  });

  describe('getCompanyProfile', () => {
    const mockCompany = {
      cik_str: '0000320193',
      ticker: 'AAPL',
      title: 'Apple Inc.'
    };

    const mockFilings = [
      {
        accessionNumber: '0000320193-23-000006',
        filingDate: '2023-02-03',
        form: '10-Q',
        primaryDocument: 'aapl-20221231.htm'
      }
    ];

    const mockFacts = {
      cik: '0000320193',
      entityName: 'Apple Inc.',
      facts: {}
    };

    it('should fetch comprehensive company profile successfully', async () => {
      mockSECClient.getCompanyByTicker.mockResolvedValueOnce(mockCompany);
      mockSECClient.getCompanyFilings.mockResolvedValueOnce(mockFilings);
      mockSECClient.getCompanyFacts.mockResolvedValueOnce(mockFacts);

      const result = await govData.getCompanyProfile('AAPL');

      expect(mockSECClient.getCompanyByTicker).toHaveBeenCalledWith('AAPL');
      expect(mockSECClient.getCompanyFilings).toHaveBeenCalledWith('0000320193', { count: 10 });
      expect(mockSECClient.getCompanyFacts).toHaveBeenCalledWith('0000320193');

      expect(result).toEqual({
        company: mockCompany,
        recentFilings: mockFilings,
        financialFacts: mockFacts
      });
    });

    it('should handle company not found', async () => {
      mockSECClient.getCompanyByTicker.mockResolvedValueOnce(null);

      await expect(govData.getCompanyProfile('NONEXISTENT')).rejects.toThrow(
        'Company with ticker NONEXISTENT not found'
      );
    });

    it('should handle partial failures gracefully', async () => {
      mockSECClient.getCompanyByTicker.mockResolvedValueOnce(mockCompany);
      mockSECClient.getCompanyFilings.mockRejectedValueOnce(new Error('Filings error'));
      mockSECClient.getCompanyFacts.mockRejectedValueOnce(new Error('Facts error'));

      const result = await govData.getCompanyProfile('AAPL');

      expect(result).toEqual({
        company: mockCompany,
        recentFilings: [],
        financialFacts: null
      });
    });

    it('should handle SEC client errors', async () => {
      mockSECClient.getCompanyByTicker.mockRejectedValueOnce(new Error('SEC API error'));

      await expect(govData.getCompanyProfile('AAPL')).rejects.toThrow('SEC API error');
    });
  });

  describe('getEconomicDashboard', () => {
    const mockBLSData = [
      { seriesID: 'LNS14000000', data: [{ year: '2023', period: 'M12', value: '3.7' }] }
    ];

    const mockFREDData = {
      'GDP': [{ date: '2023-01-01', value: '26854.599' }]
    };

    it('should fetch economic dashboard with all sources', async () => {
      mockBLSClient.getEconomicIndicators.mockResolvedValueOnce(mockBLSData);
      mockFREDClient.getMarketIndicators.mockResolvedValueOnce(mockFREDData);

      const result = await govData.getEconomicDashboard();

      expect(mockBLSClient.getEconomicIndicators).toHaveBeenCalled();
      expect(mockFREDClient.getMarketIndicators).toHaveBeenCalled();

      expect(result).toEqual({
        bls: mockBLSData,
        fred: mockFREDData
      });
    });

    it('should handle BLS failure gracefully', async () => {
      mockBLSClient.getEconomicIndicators.mockRejectedValueOnce(new Error('BLS error'));
      mockFREDClient.getMarketIndicators.mockResolvedValueOnce(mockFREDData);

      const result = await govData.getEconomicDashboard();

      expect(result).toEqual({
        bls: null,
        fred: mockFREDData
      });
    });

    it('should handle FRED failure gracefully', async () => {
      mockBLSClient.getEconomicIndicators.mockResolvedValueOnce(mockBLSData);
      mockFREDClient.getMarketIndicators.mockRejectedValueOnce(new Error('FRED error'));

      const result = await govData.getEconomicDashboard();

      expect(result).toEqual({
        bls: mockBLSData,
        fred: null
      });
    });

    it('should work without FRED client', async () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });
      
      // Mock BLS client for no-FRED instance
      (noFredGovData as any).bls = mockBLSClient;
      mockBLSClient.getEconomicIndicators.mockResolvedValueOnce(mockBLSData);

      const result = await noFredGovData.getEconomicDashboard();

      expect(result).toEqual({
        bls: mockBLSData,
        fred: null
      });
    });
  });

  describe('searchAllSources', () => {
    const mockSECCompanies = {
      '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' },
      '1': { cik_str: '0000789019', ticker: 'MSFT', title: 'Microsoft Corporation' }
    };

    const mockFREDSeries = [
      { id: 'GDP', title: 'Gross Domestic Product' },
      { id: 'GDPC1', title: 'Real Gross Domestic Product' }
    ];

    it('should search across all sources successfully', async () => {
      mockSECClient.getCompanyTickers.mockResolvedValueOnce(mockSECCompanies);
      mockFREDClient.searchSeries.mockResolvedValueOnce(mockFREDSeries);

      const result = await govData.searchAllSources('apple');

      expect(mockSECClient.getCompanyTickers).toHaveBeenCalled();
      expect(mockFREDClient.searchSeries).toHaveBeenCalledWith('apple', { limit: 10 });

      expect(result.sec).toEqual([mockSECCompanies['0']]);
      expect(result.fred).toEqual(mockFREDSeries);
    });

    it('should handle SEC search failure gracefully', async () => {
      mockSECClient.getCompanyTickers.mockRejectedValueOnce(new Error('SEC error'));
      mockFREDClient.searchSeries.mockResolvedValueOnce(mockFREDSeries);

      const result = await govData.searchAllSources('test');

      expect(result).toEqual({
        sec: [],
        fred: mockFREDSeries
      });
    });

    it('should handle FRED search failure gracefully', async () => {
      mockSECClient.getCompanyTickers.mockResolvedValueOnce(mockSECCompanies);
      mockFREDClient.searchSeries.mockRejectedValueOnce(new Error('FRED error'));

      const result = await govData.searchAllSources('test');

      expect(result.sec).toEqual(Object.values(mockSECCompanies));
      expect(result.fred).toEqual([]);
    });

    it('should work without FRED client', async () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });
      
      // Mock SEC client for no-FRED instance
      (noFredGovData as any).sec = mockSECClient;
      mockSECClient.getCompanyTickers.mockResolvedValueOnce(mockSECCompanies);

      const result = await noFredGovData.searchAllSources('apple');

      expect(result).toEqual({
        sec: [mockSECCompanies['0']],
        fred: []
      });
    });

    it('should filter results by query term', async () => {
      const mixedCompanies = {
        '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' },
        '1': { cik_str: '0000789019', ticker: 'MSFT', title: 'Microsoft Corporation' },
        '2': { cik_str: '0000012345', ticker: 'TEST', title: 'Test Company' }
      };

      mockSECClient.getCompanyTickers.mockResolvedValueOnce(mixedCompanies);
      mockFREDClient.searchSeries.mockResolvedValueOnce([]);

      const result = await govData.searchAllSources('apple');

      expect(result.sec).toEqual([mixedCompanies['0']]);
    });
  });

  describe('getMarketIndicators', () => {
    const mockMarketData = {
      'DGS10': [{ date: '2023-01-01', value: '4.25' }],
      'DGS2': [{ date: '2023-01-01', value: '4.50' }],
      'VIXCLS': [{ date: '2023-01-01', value: '18.5' }]
    };

    it('should fetch market indicators successfully', async () => {
      mockFREDClient.getMultipleSeriesObservations.mockResolvedValueOnce(mockMarketData);

      const result = await govData.getMarketIndicators();

      expect(mockFREDClient.getMultipleSeriesObservations).toHaveBeenCalledWith(
        expect.arrayContaining(['DGS10', 'DGS2', 'DGS3MO', 'VIXCLS']),
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String)
        })
      );

      expect(result).toBeDefined();
      expect(result['DGS10']).toEqual({
        current: '4.25',
        previous: undefined,
        change: undefined,
        date: '2023-01-01'
      });
    });

    it('should calculate changes when multiple observations available', async () => {
      const multipleObservations = {
        'DGS10': [
          { date: '2023-01-01', value: '4.20' },
          { date: '2023-01-02', value: '4.25' }
        ]
      };

      mockFREDClient.getMultipleSeriesObservations.mockResolvedValueOnce(multipleObservations);

      const result = await govData.getMarketIndicators();

      expect(result['DGS10']).toEqual({
        current: '4.25',
        previous: '4.20',
        change: 0.05,
        date: '2023-01-02'
      });
    });

    it('should throw error without FRED client', async () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });

      await expect(noFredGovData.getMarketIndicators()).rejects.toThrow(
        'FRED API key required for market indicators'
      );
    });

    it('should handle FRED API errors', async () => {
      mockFREDClient.getMultipleSeriesObservations.mockRejectedValueOnce(new Error('FRED error'));

      await expect(govData.getMarketIndicators()).rejects.toThrow('FRED error');
    });

    it('should handle empty observations', async () => {
      mockFREDClient.getMultipleSeriesObservations.mockResolvedValueOnce({
        'DGS10': []
      });

      const result = await govData.getMarketIndicators();

      expect(result).toEqual({});
    });
  });

  describe('getCrossSourceCorrelation', () => {
    const mockEconomicData = { GDP: [{ date: '2023-01-01', value: '26854.599' }] };
    const mockLaborData = [{ seriesID: 'LNS14000000', data: [{ year: '2023', value: '3.7' }] }];
    const mockDemographicData = [{ NAME: 'United States', B19013_001E: '70784' }];

    it('should fetch cross-source correlation data', async () => {
      mockFREDClient.getEconomicIndicators.mockResolvedValueOnce(mockEconomicData);
      mockBLSClient.getLaborMarketIndicators.mockResolvedValueOnce(mockLaborData);
      mockCensusClient.getMarketCorrelationData.mockResolvedValueOnce(mockDemographicData);

      const result = await govData.getCrossSourceCorrelation({ year: 2023 });

      expect(mockFREDClient.getEconomicIndicators).toHaveBeenCalledWith({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      expect(mockBLSClient.getLaborMarketIndicators).toHaveBeenCalledWith({
        startYear: 2023,
        endYear: 2023
      });
      expect(mockCensusClient.getMarketCorrelationData).toHaveBeenCalledWith(2023, {});

      expect(result).toEqual({
        economic: mockEconomicData,
        labor: mockLaborData,
        demographic: mockDemographicData,
        correlation: expect.any(Object)
      });
    });

    it('should handle partial failures gracefully', async () => {
      mockFREDClient.getEconomicIndicators.mockRejectedValueOnce(new Error('FRED error'));
      mockBLSClient.getLaborMarketIndicators.mockResolvedValueOnce(mockLaborData);
      mockCensusClient.getMarketCorrelationData.mockResolvedValueOnce(mockDemographicData);

      const result = await govData.getCrossSourceCorrelation();

      expect(result.economic).toBeNull();
      expect(result.labor).toEqual(mockLaborData);
      expect(result.demographic).toEqual(mockDemographicData);
    });

    it('should work without FRED client', async () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });
      
      // Mock clients for no-FRED instance
      (noFredGovData as any).bls = mockBLSClient;
      (noFredGovData as any).census = mockCensusClient;
      
      mockBLSClient.getLaborMarketIndicators.mockResolvedValueOnce(mockLaborData);
      mockCensusClient.getMarketCorrelationData.mockResolvedValueOnce(mockDemographicData);

      const result = await noFredGovData.getCrossSourceCorrelation();

      expect(result.economic).toBeUndefined();
      expect(result.labor).toEqual(mockLaborData);
      expect(result.demographic).toEqual(mockDemographicData);
    });

    it('should use default year when not specified', async () => {
      const currentYear = new Date().getFullYear();
      const expectedYear = currentYear - 1;

      mockBLSClient.getLaborMarketIndicators.mockResolvedValueOnce(mockLaborData);
      mockCensusClient.getMarketCorrelationData.mockResolvedValueOnce(mockDemographicData);

      await govData.getCrossSourceCorrelation();

      expect(mockBLSClient.getLaborMarketIndicators).toHaveBeenCalledWith({
        startYear: expectedYear,
        endYear: expectedYear
      });
      expect(mockCensusClient.getMarketCorrelationData).toHaveBeenCalledWith(expectedYear, {});
    });
  });

  describe('getCompanyWithEconomicContext', () => {
    const mockCompanyProfile = {
      company: { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' },
      recentFilings: [],
      financialFacts: null
    };

    const mockEconomicContext = {
      marketIndicators: { 'DGS10': { current: '4.25', date: '2023-01-01' } },
      laborMarket: [{ seriesID: 'LNS14000000', data: [] }],
      demographics: [{ NAME: 'United States' }]
    };

    it('should fetch company with economic context', async () => {
      // Mock getCompanyProfile
      mockSECClient.getCompanyByTicker.mockResolvedValueOnce(mockCompanyProfile.company);
      mockSECClient.getCompanyFilings.mockResolvedValueOnce([]);
      mockSECClient.getCompanyFacts.mockResolvedValueOnce(null);

      // Mock economic context
      mockFREDClient.getMultipleSeriesObservations.mockResolvedValueOnce({
        'DGS10': [{ date: '2023-01-01', value: '4.25' }]
      });
      mockBLSClient.getLaborMarketIndicators.mockResolvedValueOnce(mockEconomicContext.laborMarket);
      mockCensusClient.getEconomicIndicators.mockResolvedValueOnce(mockEconomicContext.demographics);

      const result = await govData.getCompanyWithEconomicContext('AAPL');

      expect(result.company).toEqual(mockCompanyProfile);
      expect(result.economicContext).toBeDefined();
      expect(result.economicContext.marketIndicators).toBeDefined();
      expect(result.economicContext.laborMarket).toEqual(mockEconomicContext.laborMarket);
      expect(result.economicContext.demographics).toEqual(mockEconomicContext.demographics);
    });

    it('should handle economic context failures gracefully', async () => {
      // Mock successful company profile
      mockSECClient.getCompanyByTicker.mockResolvedValueOnce(mockCompanyProfile.company);
      mockSECClient.getCompanyFilings.mockResolvedValueOnce([]);
      mockSECClient.getCompanyFacts.mockResolvedValueOnce(null);

      // Mock economic context failures
      mockFREDClient.getMultipleSeriesObservations.mockRejectedValueOnce(new Error('FRED error'));
      mockBLSClient.getLaborMarketIndicators.mockRejectedValueOnce(new Error('BLS error'));
      mockCensusClient.getEconomicIndicators.mockRejectedValueOnce(new Error('Census error'));

      const result = await govData.getCompanyWithEconomicContext('AAPL');

      expect(result.company).toEqual(mockCompanyProfile);
      expect(result.economicContext).toEqual({});
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all clients', () => {
      const result = govData.getHealthStatus();

      expect(result).toEqual({
        sec: { tokensRemaining: 10 },
        fred: { tokensRemaining: 120 },
        bls: { tokensRemaining: 25 },
        census: { tokensRemaining: 50 }
      });
    });

    it('should return null for FRED when not initialized', () => {
      const noFredGovData = new GovFinancialData({
        userAgent: globalThis.testConfig.userAgent
      });

      // Mock other clients
      (noFredGovData as any).sec = mockSECClient;
      (noFredGovData as any).bls = mockBLSClient;
      (noFredGovData as any).census = mockCensusClient;

      const result = noFredGovData.getHealthStatus();

      expect(result).toEqual({
        sec: { tokensRemaining: 10 },
        fred: null,
        bls: { tokensRemaining: 25 },
        census: { tokensRemaining: 50 }
      });
    });
  });

  describe('utility methods', () => {
    it('should format dates correctly', () => {
      const currentDate = (govData as any).getCurrentDate();
      const oneYearAgo = (govData as any).getDateOneYearAgo();
      const oneMonthAgo = (govData as any).getDateOneMonthAgo();

      expect(currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(oneYearAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(oneMonthAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify date logic
      const current = new Date(currentDate);
      const yearAgo = new Date(oneYearAgo);
      const monthAgo = new Date(oneMonthAgo);

      expect(current.getFullYear() - yearAgo.getFullYear()).toBe(1);
      expect(current.getTime()).toBeGreaterThan(monthAgo.getTime());
    });

    it('should calculate basic correlation', () => {
      const testData = {
        economic: { GDP: [{ value: '100' }] },
        labor: { unemployment: [{ value: '5.0' }] },
        demographic: { population: [{ value: '1000000' }] }
      };

      const correlation = (govData as any).calculateBasicCorrelation(testData);

      expect(correlation).toBeDefined();
      expect(typeof correlation).toBe('object');
    });
  });

  describe('error handling', () => {
    it('should handle client initialization errors', () => {
      // Test with invalid configuration
      expect(() => new GovFinancialData({
        userAgent: '', // Empty user agent
        fredApiKey: 'test-key'
      })).not.toThrow(); // Should handle gracefully
    });

    it('should handle concurrent requests', async () => {
      mockSECClient.getCompanyByTicker.mockResolvedValue({
        cik_str: '0000320193',
        ticker: 'AAPL',
        title: 'Apple Inc.'
      });
      mockSECClient.getCompanyFilings.mockResolvedValue([]);
      mockSECClient.getCompanyFacts.mockResolvedValue(null);

      // Make multiple concurrent requests
      const promises = [
        govData.getCompanyProfile('AAPL'),
        govData.getCompanyProfile('MSFT'),
        govData.getCompanyProfile('GOOGL')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.company).toBeDefined();
      });
    });
  });
});