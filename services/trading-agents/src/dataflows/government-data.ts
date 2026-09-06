import { GovernmentDataClient, CompanyProfile, EconomicDashboard, MarketIndicators } from '../clients/government-data-client.js';
import { DataflowInterface } from './interface.js';

export interface GovernmentDataConfig {
  baseUrl: string;
  timeout?: number;
  enabled?: boolean;
}

export class GovernmentDataflow implements DataflowInterface {
  private client: GovernmentDataClient;
  private enabled: boolean;

  constructor(config: GovernmentDataConfig) {
    this.enabled = config.enabled !== false;
    
    if (this.enabled) {
      this.client = new GovernmentDataClient({
        baseUrl: config.baseUrl,
        timeout: config.timeout
      });
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      await this.client.healthCheck();
      return true;
    } catch (error) {
      console.warn('Government data service health check failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive company profile with SEC filings
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.getCompanyProfile(ticker);
    } catch (error) {
      console.error(`Failed to get company profile for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get company with economic context
   */
  async getCompanyWithEconomicContext(ticker: string): Promise<{
    company: CompanyProfile;
    economicContext: any;
  } | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.getCompanyWithContext(ticker);
    } catch (error) {
      console.error(`Failed to get company with context for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get economic dashboard for market analysis
   */
  async getEconomicDashboard(): Promise<EconomicDashboard | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.getEconomicDashboard();
    } catch (error) {
      console.error('Failed to get economic dashboard:', error);
      return null;
    }
  }

  /**
   * Get market indicators for trading context
   */
  async getMarketIndicators(): Promise<MarketIndicators | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.getMarketIndicators();
    } catch (error) {
      console.error('Failed to get market indicators:', error);
      return null;
    }
  } 
 /**
   * Get fundamental analysis data for backtesting
   */
  async getFundamentalData(ticker: string): Promise<{
    company: any;
    filings: any[];
    facts: any;
    economicContext: any;
  } | null> {
    if (!this.enabled) return null;
    
    try {
      const [companyData, economicData] = await Promise.all([
        this.client.getCompanyProfile(ticker),
        this.client.getEconomicDashboard()
      ]);

      return {
        company: companyData.company,
        filings: companyData.recentFilings,
        facts: companyData.financialFacts,
        economicContext: economicData
      };
    } catch (error) {
      console.error(`Failed to get fundamental data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get economic indicators for strategy development
   */
  async getEconomicIndicators(): Promise<{
    fred?: MarketIndicators;
    bls?: any;
    correlation?: any;
  } | null> {
    if (!this.enabled) return null;
    
    try {
      const [marketIndicators, dashboard, correlation] = await Promise.all([
        this.client.getMarketIndicators().catch(() => null),
        this.client.getEconomicDashboard().catch(() => null),
        this.client.getCorrelationAnalysis().catch(() => null)
      ]);

      return {
        fred: marketIndicators,
        bls: dashboard?.bls,
        correlation
      };
    } catch (error) {
      console.error('Failed to get economic indicators:', error);
      return null;
    }
  }

  /**
   * Search government data for research
   */
  async searchGovernmentData(query: string): Promise<{
    sec: any[];
    fred: any[];
  } | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.search(query);
    } catch (error) {
      console.error(`Failed to search government data for "${query}":`, error);
      return null;
    }
  }

  /**
   * Get SEC filings for a company
   */
  async getSECFilings(ticker: string, options?: {
    count?: number;
    type?: string;
  }): Promise<any[] | null> {
    if (!this.enabled) return null;
    
    try {
      // First get company to get CIK
      const company = await this.client.getSECCompany(ticker);
      if (!company) return null;
      
      return await this.client.getSECFilings(company.cik_str, options);
    } catch (error) {
      console.error(`Failed to get SEC filings for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get FRED economic series data
   */
  async getFREDData(seriesId: string, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[] | null> {
    if (!this.enabled) return null;
    
    try {
      return await this.client.getFREDSeries(seriesId, options);
    } catch (error) {
      console.error(`Failed to get FRED data for ${seriesId}:`, error);
      return null;
    }
  }

  /**
   * Get BLS employment and inflation data
   */
  async getBLSData(): Promise<{
    unemployment?: any;
    indicators?: any;
  } | null> {
    if (!this.enabled) return null;
    
    try {
      const [unemployment, indicators] = await Promise.all([
        this.client.getBLSUnemployment().catch(() => null),
        this.client.getBLSIndicators().catch(() => null)
      ]);

      return {
        unemployment,
        indicators
      };
    } catch (error) {
      console.error('Failed to get BLS data:', error);
      return null;
    }
  }

  /**
   * Get demographic data for market research
   */
  async getDemographicData(year?: number): Promise<{
    states?: any[];
    correlation?: any;
  } | null> {
    if (!this.enabled) return null;
    
    const targetYear = year || new Date().getFullYear() - 1;
    
    try {
      const [stateData, correlation] = await Promise.all([
        this.client.getCensusStateData(targetYear).catch(() => null),
        this.client.getCorrelationAnalysis({ year: targetYear }).catch(() => null)
      ]);

      return {
        states: stateData,
        correlation
      };
    } catch (error) {
      console.error(`Failed to get demographic data for ${targetYear}:`, error);
      return null;
    }
  }
}