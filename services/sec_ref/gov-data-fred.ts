// src/clients/FREDClient.ts
import { BaseClient } from '../base/BaseClient';
import { 
  FREDSeries, 
  FREDObservation, 
  FREDCategory,
  RequestOptions,
  DateRange 
} from '../types';

export class FREDClient extends BaseClient {
  private apiKey: string;

  constructor(apiKey: string, userAgent?: string) {
    super('https://api.stlouisfed.org/fred', userAgent);
    this.apiKey = apiKey;
  }

  /**
   * Get economic data series information
   */
  async getSeries(seriesId: string, options?: RequestOptions): Promise<FREDSeries> {
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

    return response.seriess[0];
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

    const response = await this.makeRequest<{
      observations: FREDObservation[];
    }>({
      method: 'GET',
      url: '/series/observations',
      params,
    }, options);

    return response.observations || [];
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

    const response = await this.makeRequest<{
      seriess: FREDSeries[];
    }>({
      method: 'GET',
      url: '/series/search',
      params,
    }, options);

    return response.seriess || [];
  }

  /**
   * Get category information
   */
  async getCategory(categoryId: number, options?: RequestOptions): Promise<FREDCategory> {
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

    return response.categories[0];
  }

  /**
   * Get child categories
   */
  async getChildCategories(parentId: number, options?: RequestOptions): Promise<FREDCategory[]> {
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

    return response.categories || [];
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

    const response = await this.makeRequest<{
      seriess: FREDSeries[];
    }>({
      method: 'GET',
      url: '/category/series',
      params,
    }, options);

    return response.seriess || [];
  }

  /**
   * Get latest observation for a series
   */
  async getLatestObservation(seriesId: string, options?: RequestOptions): Promise<FREDObservation | null> {
    const observations = await this.getObservations(seriesId, {
      ...options,
      limit: 1,
      sort_order: 'desc',
    });

    return observations.length > 0 ? observations[0] : null;
  }

  /**
   * Get multiple series observations in one request
   */
  async getMultipleSeriesObservations(
    seriesIds: string[],
    options?: RequestOptions & DateRange
  ): Promise<{ [seriesId: string]: FREDObservation[] }> {
    const result: { [seriesId: string]: FREDObservation[] } = {};

    // FRED API doesn't support multiple series in one request, so we make concurrent requests
    const promises = seriesIds.map(async (seriesId) => {
      try {
        const observations = await this.getObservations(seriesId, options);
        result[seriesId] = observations;
      } catch (error) {
        console.warn(`Failed to fetch series ${seriesId}:`, error);
        result[seriesId] = [];
      }
    });

    await Promise.all(promises);
    return result;
  }
}