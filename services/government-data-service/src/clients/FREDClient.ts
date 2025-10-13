import { BaseClient } from '../base/BaseClient.js';
import { 
  FREDSeries, 
  FREDObservation, 
  FREDCategory,
  RequestOptions,
  DateRange 
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class FREDClient extends BaseClient {
  private apiKey: string;

  constructor(apiKey: string, userAgent?: string) {
    // FRED rate limit: 120 requests per minute (2 per second)
    super(
      'https://api.stlouisfed.org/fred', 
      userAgent || 'TradingAgents/1.0.0 (trading-agents@example.com)',
      30000, // 30 second timeout
      3, // max retries
      1000, // 1 second retry delay
      { tokensPerInterval: 2, interval: 'second' } // 120 requests per minute
    );
    this.apiKey = apiKey;
  }

  /**
   * Get economic data series information
   */
  async getSeries(seriesId: string, options?: RequestOptions): Promise<FREDSeries> {
    logger.info(`Fetching FRED series: ${seriesId}`);
    
    try {
      const response = await this.makeRequest<{
        seriess: FREDSeries[];
      }>({
        method: 'GET',
        url: '/series',
        params: {
          series_id: seriesId,
          api_key: this.apiKey,
          file_type: 'json',
        },
      }, options);

      if (!response.seriess || response.seriess.length === 0) {
        throw new Error(`Series ${seriesId} not found`);
      }

      const series = response.seriess[0];
      logger.info(`Retrieved FRED series: ${series.title}`);
      return series;
    } catch (error) {
      logger.error(`Failed to fetch FRED series: ${seriesId}`, { error });
      throw error;
    }
  }

  /**
   * Get observations (data points) for a series
   */
  async getObservations(
    seriesId: string,
    options?: RequestOptions & DateRange & {
      limit?: number;
      offset?: number;
      sort_order?: 'asc' | 'desc';
      frequency?: string;
      aggregation_method?: 'avg' | 'sum' | 'eop';
    }
  ): Promise<FREDObservation[]> {
    logger.info(`Fetching FRED observations for series: ${seriesId}`, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit
    });

    const params: any = {
      series_id: seriesId,
      api_key: this.apiKey,
      file_type: 'json',
    };

    if (options?.startDate) params.observation_start = options.startDate;
    if (options?.endDate) params.observation_end = options.endDate;
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.sort_order) params.sort_order = options.sort_order;
    if (options?.frequency) params.frequency = options.frequency;
    if (options?.aggregation_method) params.aggregation_method = options.aggregation_method;

    try {
      const response = await this.makeRequest<{
        observations: FREDObservation[];
      }>({
        method: 'GET',
        url: '/series/observations',
        params,
      }, options);

      const observations = response.observations || [];
      logger.info(`Retrieved ${observations.length} observations for series: ${seriesId}`);
      return observations;
    } catch (error) {
      logger.error(`Failed to fetch FRED observations for series: ${seriesId}`, { error });
      throw error;
    }
  }

  /**
   * Search for economic data series
   */
  async searchSeries(
    searchText: string,
    options?: RequestOptions & {
      searchType?: 'full_text' | 'series_id';
      limit?: number;
      offset?: number;
      orderBy?: 'search_rank' | 'series_id' | 'title' | 'units' | 'frequency' | 'seasonal_adjustment' | 'realtime_start' | 'realtime_end' | 'last_updated' | 'observation_start' | 'observation_end' | 'popularity';
      sortOrder?: 'asc' | 'desc';
      filterVariable?: 'frequency' | 'units' | 'seasonal_adjustment';
      filterValue?: string;
      tagNames?: string[];
      excludeTagNames?: string[];
    }
  ): Promise<FREDSeries[]> {
    logger.info(`Searching FRED series: "${searchText}"`, {
      searchType: options?.searchType,
      limit: options?.limit
    });

    const params: any = {
      search_text: searchText,
      api_key: this.apiKey,
      file_type: 'json',
      search_type: options?.searchType || 'full_text',
    };

    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.orderBy) params.order_by = options.orderBy;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.filterVariable && options?.filterValue) {
      params.filter_variable = options.filterVariable;
      params.filter_value = options.filterValue;
    }
    if (options?.tagNames) params.tag_names = options.tagNames.join(';');
    if (options?.excludeTagNames) params.exclude_tag_names = options.excludeTagNames.join(';');

    try {
      const response = await this.makeRequest<{
        seriess: FREDSeries[];
      }>({
        method: 'GET',
        url: '/series/search',
        params,
      }, options);

      const series = response.seriess || [];
      logger.info(`Found ${series.length} FRED series for search: "${searchText}"`);
      return series;
    } catch (error) {
      logger.error(`Failed to search FRED series: "${searchText}"`, { error });
      throw error;
    }
  }

  /**
   * Get category information
   */
  async getCategory(categoryId: number, options?: RequestOptions): Promise<FREDCategory> {
    logger.info(`Fetching FRED category: ${categoryId}`);
    
    try {
      const response = await this.makeRequest<{
        categories: FREDCategory[];
      }>({
        method: 'GET',
        url: '/category',
        params: {
          category_id: categoryId,
          api_key: this.apiKey,
          file_type: 'json',
        },
      }, options);

      if (!response.categories || response.categories.length === 0) {
        throw new Error(`Category ${categoryId} not found`);
      }

      const category = response.categories[0];
      logger.info(`Retrieved FRED category: ${category.name}`);
      return category;
    } catch (error) {
      logger.error(`Failed to fetch FRED category: ${categoryId}`, { error });
      throw error;
    }
  }

  /**
   * Get child categories
   */
  async getChildCategories(parentId: number, options?: RequestOptions): Promise<FREDCategory[]> {
    logger.info(`Fetching FRED child categories for parent: ${parentId}`);
    
    try {
      const response = await this.makeRequest<{
        categories: FREDCategory[];
      }>({
        method: 'GET',
        url: '/category/children',
        params: {
          category_id: parentId,
          api_key: this.apiKey,
          file_type: 'json',
        },
      }, options);

      const categories = response.categories || [];
      logger.info(`Retrieved ${categories.length} child categories for parent: ${parentId}`);
      return categories;
    } catch (error) {
      logger.error(`Failed to fetch FRED child categories for parent: ${parentId}`, { error });
      throw error;
    }
  }

  /**
   * Get series in a category
   */
  async getCategorySeries(
    categoryId: number,
    options?: RequestOptions & {
      limit?: number;
      offset?: number;
      orderBy?: 'series_id' | 'title' | 'units' | 'frequency' | 'seasonal_adjustment' | 'realtime_start' | 'realtime_end' | 'last_updated' | 'observation_start' | 'observation_end' | 'popularity';
      sortOrder?: 'asc' | 'desc';
      filterVariable?: 'frequency' | 'units' | 'seasonal_adjustment';
      filterValue?: string;
      tagNames?: string[];
      excludeTagNames?: string[];
    }
  ): Promise<FREDSeries[]> {
    logger.info(`Fetching FRED series for category: ${categoryId}`, {
      limit: options?.limit,
      orderBy: options?.orderBy
    });

    const params: any = {
      category_id: categoryId,
      api_key: this.apiKey,
      file_type: 'json',
    };

    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.orderBy) params.order_by = options.orderBy;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.filterVariable && options?.filterValue) {
      params.filter_variable = options.filterVariable;
      params.filter_value = options.filterValue;
    }
    if (options?.tagNames) params.tag_names = options.tagNames.join(';');
    if (options?.excludeTagNames) params.exclude_tag_names = options.excludeTagNames.join(';');

    try {
      const response = await this.makeRequest<{
        seriess: FREDSeries[];
      }>({
        method: 'GET',
        url: '/category/series',
        params,
      }, options);

      const series = response.seriess || [];
      logger.info(`Retrieved ${series.length} series for category: ${categoryId}`);
      return series;
    } catch (error) {
      logger.error(`Failed to fetch FRED series for category: ${categoryId}`, { error });
      throw error;
    }
  }

  /**
   * Get latest observation for a series
   */
  async getLatestObservation(seriesId: string, options?: RequestOptions): Promise<FREDObservation | null> {
    logger.info(`Fetching latest FRED observation for series: ${seriesId}`);
    
    try {
      const observations = await this.getObservations(seriesId, {
        ...options,
        limit: 1,
        sort_order: 'desc',
      });

      const latest = observations.length > 0 ? observations[0] : null;
      if (latest) {
        logger.info(`Retrieved latest observation for ${seriesId}: ${latest.value} (${latest.date})`);
      } else {
        logger.warn(`No observations found for series: ${seriesId}`);
      }
      
      return latest;
    } catch (error) {
      logger.error(`Failed to fetch latest FRED observation for series: ${seriesId}`, { error });
      throw error;
    }
  }

  /**
   * Get multiple series observations in one request
   */
  async getMultipleSeriesObservations(
    seriesIds: string[],
    options?: RequestOptions & DateRange
  ): Promise<{ [seriesId: string]: FREDObservation[] }> {
    logger.info(`Fetching multiple FRED series observations`, {
      seriesCount: seriesIds.length,
      seriesIds: seriesIds.slice(0, 5) // Log first 5 for brevity
    });

    const result: { [seriesId: string]: FREDObservation[] } = {};

    // FRED API doesn't support multiple series in one request, so we make concurrent requests
    const promises = seriesIds.map(async (seriesId) => {
      try {
        const observations = await this.getObservations(seriesId, options);
        result[seriesId] = observations;
      } catch (error) {
        logger.warn(`Failed to fetch series ${seriesId}`, { error });
        result[seriesId] = [];
      }
    });

    await Promise.all(promises);
    
    const totalObservations = Object.values(result).reduce((sum, obs) => sum + obs.length, 0);
    logger.info(`Retrieved ${totalObservations} total observations across ${seriesIds.length} series`);
    
    return result;
  }

  /**
   * Get market indicators dashboard data
   */
  async getMarketIndicators(options?: RequestOptions & DateRange): Promise<{ [seriesId: string]: FREDObservation[] }> {
    const indicators = [
      'GDP',        // Gross Domestic Product
      'UNRATE',     // Unemployment Rate
      'FEDFUNDS',   // Federal Funds Rate
      'CPIAUCSL',   // Consumer Price Index
      'DGS10',      // 10-Year Treasury Rate
      'DGS2',       // 2-Year Treasury Rate
      'DGS3MO',     // 3-Month Treasury Rate
      'VIXCLS',     // VIX Volatility Index
      'DEXUSEU',    // USD/EUR Exchange Rate
      'DCOILWTICO', // Oil Price
    ];

    logger.info('Fetching market indicators from FRED');
    return this.getMultipleSeriesObservations(indicators, options);
  }

  /**
   * Get economic indicators for correlation analysis
   */
  async getEconomicIndicators(options?: RequestOptions & DateRange): Promise<{ [seriesId: string]: FREDObservation[] }> {
    const indicators = [
      'GDP',          // Gross Domestic Product
      'GDPC1',        // Real GDP
      'UNRATE',       // Unemployment Rate
      'PAYEMS',       // Nonfarm Payrolls
      'CPIAUCSL',     // Consumer Price Index
      'CPILFESL',     // Core CPI
      'FEDFUNDS',     // Federal Funds Rate
      'TB3MS',        // 3-Month Treasury Bill
      'GS10',         // 10-Year Treasury
      'HOUST',        // Housing Starts
      'INDPRO',       // Industrial Production
      'RETAILMNSA',   // Retail Sales
    ];

    logger.info('Fetching economic indicators for correlation analysis');
    return this.getMultipleSeriesObservations(indicators, options);
  }
}