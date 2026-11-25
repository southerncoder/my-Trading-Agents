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
  FREDSeries,
  DateRange
} from './types/index.js';
import { logger } from './utils/logger.js';
import { summarizeFundamentals, type CompanyFactsLike, type FundamentalsSummary, type SubmissionsLike } from './fundamentals.js';
import { extractProperties, htmlToText, latestAnnualReport, type PropertiesSection, type RecentFilingsLike } from './properties.js';
import { BLS_SERIES, FRED_SERIES, blsAsOf, blsIndicators, fredIndicators, macroDigest, usDate, type BlsSeriesLike, type FredObs, type MacroIndicator } from './macro.js';

export interface MacroSummary {
  asOf: string;
  sources: { bls: boolean; fred: boolean };
  /** The figures behind the digest, for the web page. */
  indicators: MacroIndicator[];
  notes: string[];
  digest: string;
}

/** Macro data is market-wide: one build per date serves every stock that night (BLS allows 25 requests a day without a key). */
const MACRO_TTL_MS = 6 * 60 * 60 * 1000;

export class GovFinancialData {
  private macroCache = new Map<string, { at: number; data: MacroSummary }>();
  /** Item 2 text per 10-K URL: a filed document never changes. */
  private propertiesCache = new Map<string, PropertiesSection | null>();
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
   * Compact, point-in-time fundamentals for an analyst: figures and filings filed on or before `asOf`.
   * Returns null when the SEC has no company for the ticker (ETFs, foreign listings without a CIK, ...).
   */
  async getFundamentalsSummary(ticker: string, asOf: string): Promise<FundamentalsSummary | null> {
    const company = await this.sec.getCompanyByTicker(ticker);
    if (!company) return null;
    const cik = String(company.cik_str);
    const [facts, submissions] = await Promise.all([
      this.sec.getCompanyFacts(cik).catch((error) => {
        logger.warn(`No XBRL company facts for ${ticker}`, { error });
        return null;
      }),
      this.sec.getCompanySubmissions(cik).catch((error) => {
        logger.warn(`No submissions for ${ticker}`, { error });
        return null;
      }),
    ]);
    return summarizeFundamentals({
      ticker, cik, name: company.title, asOf,
      facts: facts as unknown as CompanyFactsLike | null,
      submissions: submissions as SubmissionsLike | null,
    });
  }

  /** Item 2 (Properties) of the newest annual report filed by `asOf`, quoted from the filing; null when absent. */
  async getProperties(ticker: string, asOf: string): Promise<PropertiesSection | null> {
    const company = await this.sec.getCompanyByTicker(ticker);
    if (!company) return null;
    const cik = String(company.cik_str);
    const sub = (await this.sec.getCompanySubmissions(cik)) as { filings?: { recent?: RecentFilingsLike } } | null;
    const report = latestAnnualReport(cik, sub?.filings?.recent, asOf);
    if (!report) return null;
    if (this.propertiesCache.has(report.url)) return this.propertiesCache.get(report.url) ?? null;
    const found = extractProperties(htmlToText(await this.sec.getArchiveText(report.url)));
    const out = found ? { ...report, ...found } : null;
    this.propertiesCache.set(report.url, out);
    while (this.propertiesCache.size > 200) this.propertiesCache.delete(this.propertiesCache.keys().next().value as string);
    return out;
  }

  /**
   * Macro backdrop as known on `asOf`: BLS jobs and inflation (no key needed) and, with a FRED key, rates,
   * the yield curve, volatility, credit spreads, oil and GDP growth. Partial data is returned with notes.
   */
  async getMacroSummary(asOf: string): Promise<MacroSummary> {
    const hit = this.macroCache.get(asOf);
    if (hit && Date.now() - hit.at < MACRO_TTL_MS) return hit.data;
    const notes: string[] = [];
    const year = Number(asOf.slice(0, 4));

    let blsItems: MacroIndicator[] = [];
    try {
      const ids = Object.values(BLS_SERIES);
      const series = (await this.bls.getSeriesData(ids, { startYear: year - 2, endYear: year })) as unknown as BlsSeriesLike[];
      const of = (k: keyof typeof BLS_SERIES) => blsAsOf(series.find((s) => s.seriesID === BLS_SERIES[k]), k, asOf);
      blsItems = blsIndicators({ unemployment: of('unemployment'), payrolls: of('payrolls'), cpi: of('cpi'), coreCpi: of('coreCpi') });
    } catch (error) {
      logger.warn('BLS data unavailable for the macro summary', { error });
      notes.push('Bureau of Labor Statistics data could not be loaded (jobs and inflation are missing).');
    }

    let fredItems: MacroIndicator[] = [];
    if (this.fred) {
      // Values known on asOf: FRED refuses a real-time date in the future, so cap it at today in the US. In the
      // US evening the UTC date is already tomorrow, which FRED rejects for every series.
      const today = usDate();
      const rt = asOf < today ? asOf : today;
      const start = new Date(Date.parse(asOf) - 400 * 86_400_000).toISOString().slice(0, 10);
      const got: Partial<Record<keyof typeof FRED_SERIES, FredObs[]>> = {};
      const failed: string[] = [];
      for (const [key, meta] of Object.entries(FRED_SERIES) as [keyof typeof FRED_SERIES, { id: string }][]) {
        try {
          got[key] = (await this.fred.getObservations(meta.id, { startDate: start, endDate: asOf, realtime_start: rt, realtime_end: rt })) as FredObs[];
        } catch (error) {
          logger.warn(`FRED series ${meta.id} unavailable for the macro summary`, { error });
          failed.push(meta.id);
        }
      }
      fredItems = fredIndicators(got, asOf);
      if (failed.length) notes.push(`FRED series unavailable: ${failed.join(', ')}.`);
    } else {
      notes.push('Rates, yield curve, volatility and credit spreads are missing: no FRED API key is configured.');
    }

    const bls = blsItems.map((i) => i.line).filter(Boolean);
    const fred = fredItems.map((i) => i.line);
    const data: MacroSummary = {
      asOf, sources: { bls: bls.length > 0, fred: fred.length > 0 }, indicators: [...blsItems, ...fredItems], notes,
      digest: macroDigest({ asOf, bls, fred, notes }),
    };
    // Only a complete answer is kept for the day; a partial one is retried on the next request.
    if (!notes.length || (!this.fred && bls.length)) this.macroCache.set(asOf, { at: Date.now(), data });
    while (this.macroCache.size > 30) this.macroCache.delete(this.macroCache.keys().next().value as string);
    return data;
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
      this.census.getMarketCorrelationData(year).then(data => {
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