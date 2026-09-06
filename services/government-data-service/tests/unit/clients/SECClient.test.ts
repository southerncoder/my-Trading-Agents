import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SECClient } from '../../../src/clients/SECClient.js';
import { SECCompany, SECFiling, SECCompanyFacts } from '../../../src/types/index.js';

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
    getTokensRemaining: vi.fn().mockReturnValue(10)
  }))
}));

describe('SECClient', () => {
  let secClient: SECClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    secClient = new SECClient(globalThis.testConfig.userAgent);
    mockAxiosInstance = (secClient as any).client;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const client = new SECClient();
      expect(client).toBeInstanceOf(SECClient);
    });

    it('should initialize with custom user agent', () => {
      const customUserAgent = 'Custom/1.0.0 (test@custom.com)';
      const client = new SECClient(customUserAgent);
      expect(client).toBeInstanceOf(SECClient);
    });
  });

  describe('getCompanyTickers', () => {
    it('should fetch company tickers successfully', async () => {
      const mockTickers = {
        '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' },
        '1': { cik_str: '0000789019', ticker: 'MSFT', title: 'Microsoft Corporation' }
      };

      mockAxiosInstance.mockResolvedValueOnce({
        data: mockTickers,
        status: 200
      });

      const result = await secClient.getCompanyTickers();

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/files/company_tickers.json',
        timeout: 30000
      });
      expect(result).toEqual(mockTickers);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.mockRejectedValueOnce(mockError);

      await expect(secClient.getCompanyTickers()).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
      mockAxiosInstance.mockRejectedValueOnce(timeoutError);

      await expect(secClient.getCompanyTickers()).rejects.toThrow();
    });
  });

  describe('getCompanyByTicker', () => {
    const mockTickers = {
      '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' },
      '1': { cik_str: '0000789019', ticker: 'MSFT', title: 'Microsoft Corporation' }
    };

    beforeEach(() => {
      mockAxiosInstance.mockResolvedValue({
        data: mockTickers,
        status: 200
      });
    });

    it('should find company by ticker (case insensitive)', async () => {
      const result = await secClient.getCompanyByTicker('aapl');
      
      expect(result).toEqual({
        cik_str: '0000320193',
        ticker: 'AAPL',
        title: 'Apple Inc.'
      });
    });

    it('should return null for non-existent ticker', async () => {
      const result = await secClient.getCompanyByTicker('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should handle empty ticker gracefully', async () => {
      const result = await secClient.getCompanyByTicker('');
      expect(result).toBeNull();
    });
  });

  describe('getCompanyByCIK', () => {
    const mockTickers = {
      '0': { cik_str: '0000320193', ticker: 'AAPL', title: 'Apple Inc.' }
    };

    beforeEach(() => {
      mockAxiosInstance.mockResolvedValue({
        data: mockTickers,
        status: 200
      });
    });

    it('should find company by CIK', async () => {
      const result = await secClient.getCompanyByCIK('320193');
      
      expect(result).toEqual({
        cik_str: '0000320193',
        ticker: 'AAPL',
        title: 'Apple Inc.'
      });
    });

    it('should format CIK correctly', async () => {
      const result = await secClient.getCompanyByCIK('320193');
      expect(result?.cik_str).toBe('0000320193');
    });

    it('should return null for non-existent CIK', async () => {
      const result = await secClient.getCompanyByCIK('9999999999');
      expect(result).toBeNull();
    });
  });

  describe('getCompanyFilings', () => {
    const mockFilingsResponse = {
      filings: {
        recent: {
          accessionNumber: ['0000320193-23-000006', '0000320193-23-000005'],
          filingDate: ['2023-02-03', '2023-01-27'],
          reportDate: ['2022-12-31', '2022-12-31'],
          acceptanceDateTime: ['2023-02-03T18:01:14.000Z', '2023-01-27T18:01:14.000Z'],
          act: ['34', '34'],
          form: ['10-Q', '8-K'],
          fileNumber: ['001-36743', '001-36743'],
          filmNumber: ['23601234', '23601233'],
          items: ['', '2.02'],
          size: [12345678, 1234567],
          isXBRL: [1, 0],
          isInlineXBRL: [1, 0],
          primaryDocument: ['aapl-20221231.htm', 'aapl-8k_20230127.htm'],
          primaryDocDescription: ['10-Q', '8-K']
        }
      }
    };

    it('should fetch company filings successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockFilingsResponse,
        status: 200
      });

      const result = await secClient.getCompanyFilings('0000320193');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/xbrl/submissions/CIK0000320193.json',
        timeout: 30000
      });
      expect(result).toHaveLength(2);
      expect(result[0].form).toBe('10-Q');
      expect(result[1].form).toBe('8-K');
    });

    it('should limit results when count is specified', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockFilingsResponse,
        status: 200
      });

      const result = await secClient.getCompanyFilings('0000320193', { count: 1 });
      expect(result).toHaveLength(1);
    });

    it('should filter by form type', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockFilingsResponse,
        status: 200
      });

      const result = await secClient.getCompanyFilings('0000320193', { type: '10-Q' });
      expect(result).toHaveLength(1);
      expect(result[0].form).toBe('10-Q');
    });

    it('should handle empty filings response', async () => {
      const emptyResponse = {
        filings: {
          recent: {
            accessionNumber: [],
            filingDate: [],
            reportDate: [],
            acceptanceDateTime: [],
            act: [],
            form: [],
            fileNumber: [],
            filmNumber: [],
            items: [],
            size: [],
            isXBRL: [],
            isInlineXBRL: [],
            primaryDocument: [],
            primaryDocDescription: []
          }
        }
      };

      mockAxiosInstance.mockResolvedValueOnce({
        data: emptyResponse,
        status: 200
      });

      const result = await secClient.getCompanyFilings('0000320193');
      expect(result).toHaveLength(0);
    });
  });

  describe('getCompanyFacts', () => {
    const mockFactsResponse: SECCompanyFacts = {
      cik: '0000320193',
      entityName: 'Apple Inc.',
      facts: {
        'us-gaap': {
          'Assets': {
            label: 'Assets',
            description: 'Total assets',
            units: {
              'USD': [
                {
                  end: '2022-09-24',
                  val: 352755000000,
                  accn: '0000320193-22-000108',
                  fy: 2022,
                  fp: 'FY',
                  form: '10-K',
                  filed: '2022-10-28'
                }
              ]
            }
          }
        }
      }
    };

    it('should fetch company facts successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockFactsResponse,
        status: 200
      });

      const result = await secClient.getCompanyFacts('0000320193');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/xbrl/companyfacts/CIK0000320193.json',
        timeout: 30000
      });
      expect(result.entityName).toBe('Apple Inc.');
      expect(result.facts['us-gaap']['Assets']).toBeDefined();
    });

    it('should handle 404 errors for non-existent companies', async () => {
      const notFoundError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Company not found' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(notFoundError);

      await expect(secClient.getCompanyFacts('9999999999')).rejects.toThrow();
    });
  });

  describe('getCompanyConcept', () => {
    const mockConceptResponse = {
      cik: '0000320193',
      taxonomy: 'us-gaap',
      tag: 'Assets',
      label: 'Assets',
      description: 'Total assets',
      entityName: 'Apple Inc.',
      units: {
        'USD': [
          {
            end: '2022-09-24',
            val: 352755000000,
            accn: '0000320193-22-000108',
            fy: 2022,
            fp: 'FY',
            form: '10-K',
            filed: '2022-10-28'
          }
        ]
      }
    };

    it('should fetch company concept successfully', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockConceptResponse,
        status: 200
      });

      const result = await secClient.getCompanyConcept('0000320193', 'us-gaap', 'Assets');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/xbrl/companyconcept/CIK0000320193/us-gaap/Assets.json',
        timeout: 30000
      });
      expect(result.entityName).toBe('Apple Inc.');
      expect(result.tag).toBe('Assets');
    });

    it('should handle invalid concept requests', async () => {
      const badRequestError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Invalid concept' }
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(badRequestError);

      await expect(
        secClient.getCompanyConcept('0000320193', 'invalid', 'InvalidConcept')
      ).rejects.toThrow();
    });
  });

  describe('getMutualFunds', () => {
    it('should return empty array on error (graceful degradation)', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };
      mockAxiosInstance.mockRejectedValueOnce(serverError);

      const result = await secClient.getMutualFunds();
      expect(result).toEqual([]);
    });

    it('should fetch mutual funds when available', async () => {
      const mockFundsResponse = {
        data: [
          {
            seriesId: 'S000001',
            classId: 'C000001',
            symbol: 'FUND1',
            seriesName: 'Test Fund Series',
            className: 'Class A'
          }
        ]
      };

      mockAxiosInstance.mockResolvedValueOnce({
        data: mockFundsResponse,
        status: 200
      });

      const result = await secClient.getMutualFunds();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('FUND1');
    });
  });

  describe('getFilingDocument', () => {
    it('should fetch filing document content', async () => {
      const mockDocumentContent = '<html><body>Filing content</body></html>';
      
      mockAxiosInstance.mockResolvedValueOnce({
        data: mockDocumentContent,
        status: 200
      });

      const result = await secClient.getFilingDocument(
        '0000320193',
        '0000320193-23-000006',
        'aapl-20221231.htm'
      );

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/Archives/edgar/data/320193/000032019323000006/aapl-20221231.htm',
        responseType: 'text',
        timeout: 30000
      });
      expect(result).toBe(mockDocumentContent);
    });

    it('should format accession number correctly', async () => {
      mockAxiosInstance.mockResolvedValueOnce({
        data: 'content',
        status: 200
      });

      await secClient.getFilingDocument(
        '320193',
        '0000320193-23-000006',
        'document.htm'
      );

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/Archives/edgar/data/320193/000032019323000006/document.htm'
        })
      );
    });
  });

  describe('getCompanySubmissions', () => {
    it('should fetch company submissions', async () => {
      const mockSubmissions = {
        cik: '0000320193',
        entityType: 'operating',
        sic: '3571',
        sicDescription: 'Electronic Computers',
        name: 'Apple Inc.',
        tickers: ['AAPL'],
        exchanges: ['Nasdaq']
      };

      mockAxiosInstance.mockResolvedValueOnce({
        data: mockSubmissions,
        status: 200
      });

      const result = await secClient.getCompanySubmissions('0000320193');

      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/xbrl/submissions/CIK0000320193.json',
        timeout: 30000
      });
      expect(result.name).toBe('Apple Inc.');
    });
  });

  describe('rate limiting', () => {
    it('should have rate limiter configured', () => {
      const status = secClient.getRateLimiterStatus();
      expect(status).toBeDefined();
      expect(status?.tokensRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = { code: 'ENOTFOUND', message: 'Network error' };
      mockAxiosInstance.mockRejectedValueOnce(networkError);

      await expect(secClient.getCompanyTickers()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout exceeded' };
      mockAxiosInstance.mockRejectedValueOnce(timeoutError);

      await expect(secClient.getCompanyTickers()).rejects.toThrow();
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

      await expect(secClient.getCompanyTickers()).rejects.toThrow();
    });
  });
});