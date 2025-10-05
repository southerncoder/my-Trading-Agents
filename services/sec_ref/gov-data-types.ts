// src/types/index.ts

// Base types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

// SEC Types
export interface SECCompany {
  cik_str: string;
  ticker: string;
  title: string;
}

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface SECCompanyFacts {
  cik: string;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [concept: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            frame?: string;
          }>;
        };
      };
    };
  };
}

export interface SECMutualFund {
  seriesId: string;
  classId: string;
  symbol: string;
  seriesName: string;
  className: string;
}

// FRED Types
export interface FREDSeries {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes: string;
}

export interface FREDObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export interface FREDCategory {
  id: number;
  name: string;
  parent_id: number;
  notes?: string;
}

// BLS Types
export interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  latest: string;
  value: string;
  footnotes: Array<{
    code: string;
    text: string;
  }>;
}

export interface BLSSeriesInfo {
  seriesID: string;
  title: string;
  catalog: {
    series_title: string;
    series_id: string;
    seasonal: string;
    survey_name: string;
    survey_abbreviation: string;
    measure_data_type: string;
    commerce_industry: string;
    area: string;
    item: string;
  };
}

// Census Types
export interface CensusVariable {
  name: string;
  label: string;
  concept: string;
  predicateType: string;
  group: string;
  limit: number;
  predicateOnly?: boolean;
}

export interface CensusData {
  [key: string]: string | number;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Configuration
export interface LibraryConfig {
  fredApiKey?: string;
  blsApiKey?: string;
  userAgent: string;
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
}