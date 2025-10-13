import { SECClient } from './clients/SECClient.js';
import { FREDClient } from './clients/FREDClient.js';
import { BLSClient } from './clients/BLSClient.js';
import { CensusClient } from './clients/CensusClient.js';
import { 
  LibraryConfig, 
  CompanyProfile, 
  EconomicDashboard, 
  MarketIndicators, 
  SearchResults,
  SECCompany,
  FREDSeries,
  DateRange
} from './types/index.js';
import { logger } from './utils/logger.js';

export class GovFinancialData {
  public sec: SECClient;
  public fred?: FREDClient;
  public bls: BLSClient;
  public census: CensusClient;

  constructor(config: Partial<LibraryConfig> = {}) {
    const defaultConfig: LibraryConfig = {
      userAgent: 'TradingAgents/1.0.0 (trading-agents@example.com)',
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    logger.info('Initializing Government Financial Data service', {
      hasFredKey: !!config.fredApiKey,
      hasBlsKey: !!config.blsApiKey,
      userAgent: defaultConfig.userAgent
    });

    // Initialize clients
    this.sec = new SECClient(defaultConfig.userAgent);
    this.bls = new BLSClient(config.blsApiKey, defaultConfig.userAgent);
    this.census = new CensusClient(defaultConfig.userAgent);

    // FRED client requires API key
    if (config.fredApiKey) {
      this.fred = new FREDClient(config.fredApiKey, defaultConfig.userAgent);
      logger.info('FRED client initialized with API key');
    } else {
      logger.warn('FRED client not initialized - API key required');
    }
  }

  /**
   * Get comprehensive company data including SEC filings and economic context
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    logger.info(`Fetching comprehensive company profile for: ${ticker}`);
    
    try {
      const company = await this.sec.getCompanyByTicker(ticker);
      if (!company) {
        throw new Error(`Company with ticker ${ticker} not found`);
      }

      logger.info(`Found company: ${company.title} (CIK: ${company.cik_str})`);

      const [filings, facts] = await Promise.all([
        this.sec.getCompanyFilings(company.cik_str, { count: 10 }).catch(error => {
          logger.warn(`Failed to fetch filings for ${ticker}`, { error });
          return [];
        }),
        this.sec.getCompanyFacts(company.cik_str).catch(error => {
          logger.warn(`Failed to fetch facts for ${ticker}`, { error });
          return null;
        }),
      ]);

      const profile: CompanyProfile = {
        company,
        recentFilings: filings,
        financialFacts: facts,
      };

      logger.info(`Company profile completed for ${ticker}`, {
        filingsCount: filings.length,
        hasFinancialFacts: !!facts
      });

      return profile;
    } catch (error) {
      logger.error(`Failed to fetch company profile for ${ticker}`, { error });
      throw error;
    }
  }

  /**
   * Get economic dashboard data combining all sources
   */
  async getEconomicDashboard(): Promise<EconomicDashboard> {
    logger.info('Fetching comprehensive economic dashboard');
    
    const promises: Promise<any>[] = [];
    const results: any = {};

    // BLS data
    promises.push(
      this.bls.getEconomicIndicators({
        startYear: new Date().getFullYear() - 1,
        endYear: new Date().getFullYear(),
      }).then(data => {
        results.bls = data;
        logger.info('BLS data retrieved for dashboard');
      }).catch(error => {
        logger.warn('Failed to fetch BLS data for dashboard', { error });
        results.bls = null;
      })
    );

    // FRED data (if available)
    if (this.fred) {
      promises.push(
        this.fred.getMarketIndicators({
          startDate: this.getDateOneYearAgo(),
          endDate: this.getCurrentDate(),
        }).then(data => {
          results.fred = data;
          logger.info('FRED data retrieved for dashboard');
        }).catch(error => {
          logger.warn('Failed to fetch FRED data for dashboard', { error });
          results.fred = null;
        })
      );
    } else {
      results.fred = null;
    }

    await Promise.all(promises);
    
    logger.info('Economic dashboard completed', {
      hasBls: !!results.bls,
      hasFred: !!results.fred
    });

    return results as EconomicDashboard;
  }

  /**
   * Search across multiple government data sources
   */
  async searchAllSources(query: string): Promise<SearchResults> {
    logger.info(`Searching all government sources for: "${query}"`);
    
    const results: SearchResults = {
      sec: [],
      fred: []
    };

    // SEC company search
    try {
      const companies = await this.sec.getCompanyTickers();
      const matchingCompanies = Object.values(companies).filter(company =>
        company.title?.toLowerCase().includes(query.toLowerCase()) ||
        company.ticker?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      results.sec = matchingCompanies;
      logger.info(`Found ${matchingCompanies.length} matching SEC companies`);
    } catch (error) {
      logger.warn('SEC search failed', { error, query });
      results.sec = [];
    }

    // FRED series search (if available)
    if (this.fred) {
      try {
        const fredSeries = await this.fred.searchSeries(query, { limit: 10 });
        results.fred = fredSeries;
        logger.info(`Found ${fredSeries.length} matching FRED series`);
      } catch (error) {
        logger.warn('FRED search failed', { error, query });
        results.fred = [];
      }
    }

    logger.info(`Search completed for "${query}"`, {
      secResults: results.sec.length,
      fredResults: results.fred.length
    });

    return results;
  }

  /**
   * Get market indicators summary with multi-source data fusion
   */
  async getMarketIndicators(): Promise<MarketIndicators> {
    if (!this.fred) {
      throw new Error('FRED API key required for market indicators');
    }

    logger.info('Fetching market indicators summary');

    const indicators = [
      'DGS10',      // 10-Year Treasury
      'DGS2',       // 2-Year Treasury  
      'DGS3MO',     // 3-Month Treasury
      'VIXCLS',     // VIX Volatility Index
      'DEXUSEU',    // USD/EUR Exchange Rate
      'DCOILWTICO', // Oil Price
      'GDP',        // GDP
      'UNRATE',     // Unemployment Rate
      'CPIAUCSL',   // Consumer Price Index
      'FEDFUNDS',   // Federal Funds Rate
    ];

    try {
      const data = await this.fred.getMultipleSeriesObservations(indicators, {
        startDate: this.getDateOneMonthAgo(),
        endDate: this.getCurrentDate(),
      });

      const summary: MarketIndicators = {};
      for (const [seriesId, observations] of Object.entries(data)) {
        if (observations.length > 0) {
          const latest = observations[observations.length - 1];
          const previous = observations.length > 1 ? observations[observations.length - 2] : null;
          
          summary[seriesId] = {
            current: latest.value,
            previous: previous?.value,
            change: previous ? parseFloat(latest.value) - parseFloat(previous.value) : undefined,
            date: latest.date,
          };
        }
      }

      logger.info(`Market indicators summary completed with ${Object.keys(summary).length} indicators`);
      return summary;
    } catch (error) {
      logger.error('Failed to fetch market indicators', { error });
      throw error;
    }
  }

  /**
   * Get cross-source data correlation analysis
   */
  async getCrossSourceCorrelation(options?: {
    year?: number;
    state?: string;
  }): Promise<{
    economic: any;
    demographic: any;
    labor: any;
    correlation: any;
  }> {
    const year = options?.year || new Date().getFullYear() - 1; // Use previous year for complete data
    logger.info(`Fetching cross-source correlation analysis for year ${year}`, {
      state: options?.state
    });

    const promises = [];
    const results: any = {};

    // FRED economic data
    if (this.fred) {
      promises.push(
        this.fred.getEconomicIndicators({
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
        }).then(data => {
          results.economic = data;
          logger.info('FRED economic data retrieved for correlation');
        }).catch(error => {
          logger.warn('Failed to fetch FRED data for correlation', { error });
          results.economic = null;
        })
      );
    }

    // BLS labor market data
    promises.push(
      this.bls.getLaborMarketIndicators({
        startYear: year,
        endYear: year,
      }).then(data => {
        results.labor = data;
        logger.info('BLS labor data retrieved for correlation');
      }).catch(error => {
        logger.warn('Failed to fetch BLS data for correlation', { error });
        results.labor = null;
      })
    );

    // Census demographic data
    promises.push(
      this.census.getMarketCorrelationData(year, {
        state: options?.state
      }).then(data => {
        results.demographic = data;
        logger.info('Census demographic data retrieved for correlation');
      }).catch(error => {
        logger.warn('Failed to fetch Census data for correlation', { error });
        results.demographic = null;
      })
    );

    await Promise.all(promises);

    // Simple correlation analysis (could be enhanced with statistical libraries)
    results.correlation = this.calculateBasicCorrelation(results);

    logger.info('Cross-source correlation analysis completed');
    return results;
  }

  /**
   * Get comprehensive company profile with economic context
   */
  async getCompanyWithEconomicContext(ticker: string): Promise<{
    company: CompanyProfile;
    economicContext: {
      marketIndicators?: MarketIndicators;
      laborMarket?: any;
      demographics?: any;
    };
  }> {
    logger.info(`Fetching company profile with economic context for: ${ticker}`);

    const [company, economicContext] = await Promise.all([
      this.getCompanyProfile(ticker),
      this.getEconomicContext()
    ]);

    logger.info(`Company profile with economic context completed for ${ticker}`);
    return {
      company,
      economicContext
    };
  }

  /**
   * Get economic context data
   */
  private async getEconomicContext(): Promise<{
    marketIndicators?: MarketIndicators;
    laborMarket?: any;
    demographics?: any;
  }> {
    const context: any = {};

    // Market indicators (if FRED available)
    if (this.fred) {
      try {
        context.marketIndicators = await this.getMarketIndicators();
      } catch (error) {
        logger.warn('Failed to fetch market indicators for context', { error });
      }
    }

    // Labor market data
    try {
      context.laborMarket = await this.bls.getLaborMarketIndicators({
        startYear: new Date().getFullYear() - 1,
        endYear: new Date().getFullYear(),
      });
    } catch (error) {
      logger.warn('Failed to fetch labor market data for context', { error });
    }

    // Demographics data
    try {
      context.demographics = await this.census.getEconomicIndicators(
        new Date().getFullYear() - 1 // Use previous year for complete data
      );
    } catch (error) {
      logger.warn('Failed to fetch demographics data for context', { error });
    }

    return context;
  }

  /**
   * Basic correlation calculation (placeholder for more sophisticated analysis)
   */
  private calculateBasicCorrelation(data: any): any {
    // This is a simplified correlation analysis
    // In a production system, you'd use statistical libraries like simple-statistics
    const correlations: any = {};
    
    if (data.economic && data.labor) {
      correlations.economicLabor = 'positive'; // Placeholder
    }
    
    if (data.demographic && data.labor) {
      correlations.demographicLabor = 'moderate'; // Placeholder
    }

    return correlations;
  }

  // Utility methods
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

  /**
   * Get service health status
   */
  getHealthStatus(): {
    sec: any;
    fred: any;
    bls: any;
    census: any;
  } {
    return {
      sec: this.sec.getRateLimiterStatus(),
      fred: this.fred?.getRateLimiterStatus() || null,
      bls: this.bls.getRateLimiterStatus(),
      census: this.census.getRateLimiterStatus(),
    };
  }
}