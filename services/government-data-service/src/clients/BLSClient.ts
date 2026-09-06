import { BaseClient } from '../base/BaseClient.js';
import { 
  BLSSeries, 
  BLSDataPoint, 
  BLSSeriesInfo,
  RequestOptions 
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class BLSClient extends BaseClient {
  private apiKey?: string;

  constructor(apiKey?: string, userAgent?: string) {
    // BLS rate limit: 25 queries per day without API key, 500 with API key
    // We'll be conservative and limit to 1 request per 5 seconds
    super(
      'https://api.bls.gov/publicAPI/v2', 
      userAgent || 'TradingAgents/1.0.0 (trading-agents@example.com)',
      30000, // 30 second timeout
      3, // max retries
      2000, // 2 second retry delay
      { tokensPerInterval: 1, interval: 5000 } // 1 request per 5 seconds
    );
    this.apiKey = apiKey;
  }

  /**
   * Get data for multiple series
   */
  async getSeriesData(
    seriesIds: string[],
    options?: RequestOptions & {
      startYear?: number;
      endYear?: number;
      catalog?: boolean;
      calculations?: boolean;
      annualaverage?: boolean;
    }
  ): Promise<BLSSeries[]> {
    logger.info(`Fetching BLS data for ${seriesIds.length} series`, {
      seriesIds: seriesIds.slice(0, 5), // Log first 5 for brevity
      startYear: options?.startYear,
      endYear: options?.endYear
    });

    const requestBody: any = {
      seriesid: seriesIds,
    };

    if (options?.startYear) requestBody.startyear = options.startYear.toString();
    if (options?.endYear) requestBody.endyear = options.endYear.toString();
    if (options?.catalog) requestBody.catalog = options.catalog;
    if (options?.calculations) requestBody.calculations = options.calculations;
    if (options?.annualaverage) requestBody.annualaverage = options.annualaverage;

    // Add API key if available
    if (this.apiKey) {
      requestBody.registrationkey = this.apiKey;
    }

    try {
      const response = await this.makeRequest<{
        status: string;
        responseTime: number;
        message: string[];
        Results: {
          series: BLSSeries[];
        };
      }>({
        method: 'POST',
        url: '/timeseries/data/',
        data: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      }, options);

      if (response.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(`BLS API request failed: ${response.message?.join(', ')}`);
      }

      const series = response.Results?.series || [];
      logger.info(`Retrieved ${series.length} BLS series with ${series.reduce((sum, s) => sum + s.data.length, 0)} total data points`);
      return series;
    } catch (error) {
      logger.error('Failed to fetch BLS series data', { error, seriesIds });
      throw error;
    }
  }

  /**
   * Get unemployment rate data
   */
  async getUnemploymentRate(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<BLSSeries> {
    logger.info('Fetching unemployment rate from BLS');
    
    const series = await this.getSeriesData(['LNS14000000'], options); // National unemployment rate
    
    if (series.length === 0) {
      throw new Error('No unemployment rate data found');
    }

    logger.info(`Retrieved unemployment rate data with ${series[0].data.length} data points`);
    return series[0];
  }

  /**
   * Get Consumer Price Index (CPI) data
   */
  async getCPI(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
    allItems?: boolean; // If false, gets core CPI
  }): Promise<BLSSeries> {
    logger.info('Fetching CPI data from BLS', { allItems: options?.allItems });
    
    // CUUR0000SA0 = All items CPI, CUUR0000SA0L1E = Core CPI (less food and energy)
    const seriesId = options?.allItems !== false ? 'CUUR0000SA0' : 'CUUR0000SA0L1E';
    const series = await this.getSeriesData([seriesId], options);
    
    if (series.length === 0) {
      throw new Error('No CPI data found');
    }

    logger.info(`Retrieved CPI data with ${series[0].data.length} data points`);
    return series[0];
  }

  /**
   * Get Producer Price Index (PPI) data
   */
  async getPPI(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<BLSSeries> {
    logger.info('Fetching PPI data from BLS');
    
    const series = await this.getSeriesData(['WPUFD49207'], options); // Final demand PPI
    
    if (series.length === 0) {
      throw new Error('No PPI data found');
    }

    logger.info(`Retrieved PPI data with ${series[0].data.length} data points`);
    return series[0];
  }

  /**
   * Get employment data by industry
   */
  async getEmploymentByIndustry(
    industryCode: string,
    options?: RequestOptions & {
      startYear?: number;
      endYear?: number;
    }
  ): Promise<BLSSeries> {
    logger.info(`Fetching employment data for industry: ${industryCode}`);
    
    // CES series for employment by industry
    const seriesId = `CES${industryCode}01`;
    const series = await this.getSeriesData([seriesId], options);
    
    if (series.length === 0) {
      throw new Error(`No employment data found for industry: ${industryCode}`);
    }

    logger.info(`Retrieved employment data for industry ${industryCode} with ${series[0].data.length} data points`);
    return series[0];
  }

  /**
   * Get average hourly earnings data
   */
  async getAverageHourlyEarnings(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
    sector?: 'private' | 'manufacturing' | 'construction';
  }): Promise<BLSSeries> {
    logger.info('Fetching average hourly earnings from BLS', { sector: options?.sector });
    
    let seriesId: string;
    switch (options?.sector) {
      case 'manufacturing':
        seriesId = 'CES3000000003'; // Manufacturing
        break;
      case 'construction':
        seriesId = 'CES2000000003'; // Construction
        break;
      default:
        seriesId = 'CES0500000003'; // Private sector
    }
    
    const series = await this.getSeriesData([seriesId], options);
    
    if (series.length === 0) {
      throw new Error('No average hourly earnings data found');
    }

    logger.info(`Retrieved average hourly earnings data with ${series[0].data.length} data points`);
    return series[0];
  }

  /**
   * Get productivity metrics
   */
  async getProductivityMetrics(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<{ [metric: string]: BLSSeries }> {
    logger.info('Fetching productivity metrics from BLS');
    
    const seriesIds = [
      'PRS85006092', // Nonfarm business productivity
      'PRS85006112', // Nonfarm business unit labor costs
      'PRS85006152', // Nonfarm business output per hour
    ];
    
    const series = await this.getSeriesData(seriesIds, options);
    
    const result: { [metric: string]: BLSSeries } = {};
    series.forEach((s, index) => {
      const metric = ['productivity', 'unit_labor_costs', 'output_per_hour'][index];
      result[metric] = s;
    });

    logger.info(`Retrieved ${Object.keys(result).length} productivity metrics`);
    return result;
  }

  /**
   * Get comprehensive economic indicators
   */
  async getEconomicIndicators(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<{
    unemployment: BLSSeries;
    cpi: BLSSeries;
    ppi: BLSSeries;
    employment: BLSSeries;
    earnings: BLSSeries;
  }> {
    logger.info('Fetching comprehensive economic indicators from BLS');
    
    const seriesIds = [
      'LNS14000000',   // Unemployment rate
      'CUUR0000SA0',   // CPI All Items
      'WPUFD49207',    // PPI Final Demand
      'CES0000000001', // Total nonfarm employment
      'CES0500000003', // Average hourly earnings - private sector
    ];
    
    const series = await this.getSeriesData(seriesIds, options);
    
    if (series.length < 5) {
      logger.warn(`Expected 5 series, got ${series.length}`);
    }
    
    const result = {
      unemployment: series[0] || { seriesID: seriesIds[0], data: [] },
      cpi: series[1] || { seriesID: seriesIds[1], data: [] },
      ppi: series[2] || { seriesID: seriesIds[2], data: [] },
      employment: series[3] || { seriesID: seriesIds[3], data: [] },
      earnings: series[4] || { seriesID: seriesIds[4], data: [] },
    };

    logger.info('Retrieved comprehensive economic indicators from BLS');
    return result;
  }

  /**
   * Get labor market indicators for economic analysis
   */
  async getLaborMarketIndicators(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<{ [indicator: string]: BLSSeries }> {
    logger.info('Fetching labor market indicators from BLS');
    
    const seriesIds = [
      'LNS14000000',   // Unemployment rate
      'LNS11300000',   // Labor force participation rate
      'LNS12300000',   // Employment-population ratio
      'JTS1000000000000000JOL', // Job openings
      'JTS1000000000000000QUR', // Quit rate
      'CES0000000001', // Total nonfarm employment
      'CES0500000003', // Average hourly earnings
    ];
    
    const series = await this.getSeriesData(seriesIds, options);
    
    const indicators = [
      'unemployment_rate',
      'labor_force_participation',
      'employment_population_ratio',
      'job_openings',
      'quit_rate',
      'nonfarm_employment',
      'hourly_earnings'
    ];
    
    const result: { [indicator: string]: BLSSeries } = {};
    series.forEach((s, index) => {
      if (indicators[index]) {
        result[indicators[index]] = s;
      }
    });

    logger.info(`Retrieved ${Object.keys(result).length} labor market indicators`);
    return result;
  }

  /**
   * Get industry-specific employment data
   */
  async getIndustryEmployment(options?: RequestOptions & {
    startYear?: number;
    endYear?: number;
  }): Promise<{ [industry: string]: BLSSeries }> {
    logger.info('Fetching industry-specific employment data from BLS');
    
    const industries = {
      'manufacturing': 'CES3000000001',
      'construction': 'CES2000000001',
      'retail_trade': 'CES4200000001',
      'professional_services': 'CES6054000001',
      'healthcare': 'CES6562000001',
      'financial_activities': 'CES5500000001',
      'information': 'CES5000000001',
      'leisure_hospitality': 'CES7000000001',
    };
    
    const seriesIds = Object.values(industries);
    const series = await this.getSeriesData(seriesIds, options);
    
    const result: { [industry: string]: BLSSeries } = {};
    Object.keys(industries).forEach((industry, index) => {
      if (series[index]) {
        result[industry] = series[index];
      }
    });

    logger.info(`Retrieved employment data for ${Object.keys(result).length} industries`);
    return result;
  }
}