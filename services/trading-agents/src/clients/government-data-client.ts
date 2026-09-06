import axios, { AxiosInstance } from 'axios';

export interface GovernmentDataConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export interface CompanyProfile {
  company: {
    cik_str: string;
    ticker: string;
    title: string;
  };
  recentFilings: any[];
  financialFacts: any;
}

export interface EconomicDashboard {
  bls: any;
  fred: any;
}

export interface MarketIndicators {
  [seriesId: string]: {
    current: string;
    previous?: string;
    change?: number;
    date: string;
  };
}

export class GovernmentDataClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: GovernmentDataConfig) {
    this.baseUrl = config.baseUrl;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config: requestConfig } = error;
        if (requestConfig && !requestConfig._retry && error.response?.status >= 500) {
          requestConfig._retry = true;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.client(requestConfig);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get comprehensive company profile
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    const response = await this.client.get(`/api/company/${ticker}`);
    return response.data;
  } 
 /**
   * Get company with economic context
   */
  async getCompanyWithContext(ticker: string): Promise<{
    company: CompanyProfile;
    economicContext: any;
  }> {
    const response = await this.client.get(`/api/company/${ticker}/context`);
    return response.data;
  }

  /**
   * Get economic dashboard
   */
  async getEconomicDashboard(): Promise<EconomicDashboard> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  /**
   * Get market indicators
   */
  async getMarketIndicators(): Promise<MarketIndicators> {
    const response = await this.client.get('/api/fred/indicators');
    return response.data;
  }

  /**
   * Search across government data sources
   */
  async search(query: string): Promise<{
    sec: any[];
    fred: any[];
  }> {
    const response = await this.client.get('/api/search', {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * Get cross-source correlation analysis
   */
  async getCorrelationAnalysis(options?: {
    year?: number;
    state?: string;
  }): Promise<any> {
    const response = await this.client.get('/api/correlation', {
      params: options
    });
    return response.data;
  }

  /**
   * Get SEC company data
   */
  async getSECCompany(ticker: string): Promise<any> {
    const response = await this.client.get(`/api/sec/company/${ticker}`);
    return response.data;
  }

  /**
   * Get SEC filings
   */
  async getSECFilings(cik: string, options?: {
    count?: number;
    type?: string;
  }): Promise<any[]> {
    const response = await this.client.get(`/api/sec/filings/${cik}`, {
      params: options
    });
    return response.data;
  }

  /**
   * Get FRED economic series
   */
  async getFREDSeries(seriesId: string, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await this.client.get(`/api/fred/series/${seriesId}`, {
      params: options
    });
    return response.data;
  }

  /**
   * Search FRED series
   */
  async searchFREDSeries(query: string, limit = 10): Promise<any[]> {
    const response = await this.client.get('/api/fred/search', {
      params: { q: query, limit }
    });
    return response.data;
  }

  /**
   * Get BLS unemployment data
   */
  async getBLSUnemployment(options?: {
    startYear?: number;
    endYear?: number;
  }): Promise<any> {
    const response = await this.client.get('/api/bls/unemployment', {
      params: options
    });
    return response.data;
  }

  /**
   * Get BLS economic indicators
   */
  async getBLSIndicators(options?: {
    startYear?: number;
    endYear?: number;
  }): Promise<any> {
    const response = await this.client.get('/api/bls/indicators', {
      params: options
    });
    return response.data;
  }

  /**
   * Get Census state data
   */
  async getCensusStateData(year: number, variables?: string[]): Promise<any[]> {
    const response = await this.client.get(`/api/census/states/${year}`, {
      params: variables ? { variables: variables.join(',') } : undefined
    });
    return response.data;
  }

  /**
   * Get Census county data
   */
  async getCensusCountyData(year: number, state: string, variables?: string[]): Promise<any[]> {
    const response = await this.client.get(`/api/census/counties/${year}/${state}`, {
      params: variables ? { variables: variables.join(',') } : undefined
    });
    return response.data;
  }
}