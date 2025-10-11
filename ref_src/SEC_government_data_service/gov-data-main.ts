// src/index.ts
import { SECClient } from './clients/SECClient';
import { FREDClient } from './clients/FREDClient';
import { BLSClient } from './clients/BLSClient';
import { CensusClient } from './clients/CensusClient';
import { LibraryConfig } from './types';

export class GovFinancialData {
  public sec: SECClient;
  public fred?: FREDClient;
  public bls: BLSClient;
  public census: CensusClient;

  constructor(config: Partial<LibraryConfig> = {}) {
    const defaultConfig: LibraryConfig = {
      userAgent: 'GovFinancialData/1.0.0',
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    // Initialize clients
    this.sec = new SECClient(defaultConfig.userAgent);
    this.bls = new BLSClient(config.blsApiKey, defaultConfig.userAgent);
    this.census = new CensusClient(defaultConfig.userAgent);

    // FRED client requires API key
    if (config.fredApiKey) {
      this.fred = new FREDClient(config.fredApiKey, defaultConfig.userAgent);
    }
  }

  /**
   * Get comprehensive company data including SEC filings and economic context
   */
  async getCompanyProfile(ticker: string) {
    const company = await this.sec.getCompanyByTicker(ticker);
    if (!company) {
      throw new Error(`Company with ticker ${ticker} not found`);
    }

    const [filings, facts] = await Promise.all([
      this.sec.getCompanyFilings(company.cik_str, { count: 10 }),
      this.sec.getCompanyFacts(company.cik_str).catch(() => null),
    ]);

    return {
      company,
      recentFilings: filings,
      financialFacts: facts,
    };
  }

  /**
   * Get economic dashboard data
   */
  async getEconomicDashboard() {
    const promises: Promise<any>[] = [];
    const results: any = {};

    // BLS data
    promises.push(
      this.bls.getEconomicIndicators({
        startYear: new Date().getFullYear() - 1,
        endYear: new Date().getFullYear(),
      }).then(data => {
        results.bls = data;
      }).catch(error => {
        console.warn('Failed to fetch BLS data:', error);
        results.bls = null;
      })
    );

    // FRED data (if available)
    if (this.fred) {
      promises.push(
        this.fred.getMultipleSeriesObservations([
          'GDP',      // Gross Domestic Product
          'UNRATE',   // Unemployment Rate
          'FEDFUNDS', // Federal Funds Rate
          'CPIAUCSL', // Consumer Price Index
          'DGS10',    // 10-Year Treasury Rate
        ], {
          startDate: this.getDateOneYearAgo(),
          endDate: this.getCurrentDate(),
        }).then(data => {
          results.fred = data;
        }).catch(error => {
          console.warn('Failed to fetch FRED data:', error);
          results.fred = null;
        })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Search across multiple government data sources
   */
  async searchAllSources(query: string) {
    const results: any = {};

    // SEC company search
    try {
      const companies = await this.sec.getCompanyTickers();
      const matchingCompanies = Object.values(companies).filter(company =>
        company.title?.toLowerCase().includes(query.toLowerCase()) ||
        company.ticker?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      results.sec = matchingCompanies;
    } catch (error) {
      console.warn('SEC search failed:', error);
      results.sec = [];
    }

    // FRED series search (if available)
    if (this.fred) {
      try {
        const fredSeries = await this.fred.searchSeries(query, { limit: 10 });
        results.fred = fredSeries;
      } catch (error) {
        console.warn('FRED search failed:', error);
        results.fred = [];
      }
    }

    return results;
  }

  /**
   * Get market indicators summary
   */
  async getMarketIndicators() {
    if (!this.fred) {
      throw new Error('FRED API key required for market indicators');
    }

    const indicators = [
      'DGS10',      // 10-Year Treasury
      'DGS2',       // 2-Year Treasury  
      'DGS3MO',     // 3-Month Treasury
      'VIXCLS',     // VIX Volatility Index
      'DEXUSEU',    // USD/EUR Exchange Rate
      'DCOILWTICO', // Oil Price
    ];

    const data = await this.fred.getMultipleSeriesObservations(indicators, {
      startDate: this.getDateOneMonthAgo(),
      endDate: this.getCurrentDate(),
    });

    const summary: any = {};
    for (const [seriesId, observations] of Object.entries(data)) {
      if (observations.length > 0) {
        const latest = observations[observations.length - 1];
        const previous = observations.length > 1 ? observations[observations.length - 2] : null;
        
        summary[seriesId] = {
          current: latest.value,
          previous: previous?.value,
          change: previous ? parseFloat(latest.value) - parseFloat(previous.value) : null,
          date: latest.date,
        };
      }
    }

    return summary;
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateOneYearAgo(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  }

  private getDateOneMonthAgo(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }
}

// Export all types and clients for direct use
export * from './types';
export { SECClient } from './clients/SECClient';
export { FREDClient } from './clients/FREDClient';
export { BLSClient } from './clients/BLSClient';
export { CensusClient } from './clients/CensusClient';

// Default export
export default GovFinancialData;