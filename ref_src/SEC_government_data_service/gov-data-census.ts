// src/clients/CensusClient.ts
import { BaseClient } from '../base/BaseClient';
import { 
  CensusVariable, 
  CensusData,
  RequestOptions 
} from '../types';

export class CensusClient extends BaseClient {
  constructor(userAgent?: string) {
    super('https://api.census.gov/data', userAgent);
  }

  /**
   * Get available datasets
   */
  async getDatasets(options?: RequestOptions): Promise<{
    dataset: Array<{
      identifier: string;
      title: string;
      description: string;
      c_vintage: string;
      c_dataset: string[];
      c_geographyLink: string;
      c_variablesLink: string;
      c_examplesLink: string;
      distribution: Array<{
        accessURL: string;
        format: string;
      }>;
    }>;
  }> {
    return this.makeRequest({
      method: 'GET',
      url: '.json',
    }, options);
  }

  /**
   * Get variables for a specific dataset
   */
  async getVariables(
    year: string | number,
    dataset: string,
    options?: RequestOptions
  ): Promise<{ [variableName: string]: CensusVariable }> {
    return this.makeRequest({
      method: 'GET',
      url: `/${year}/${dataset}/variables.json`,
    }, options);
  }

  /**
   * Get geography options for a dataset
   */
  async getGeographies(
    year: string | number,
    dataset: string,
    options?: RequestOptions
  ): Promise<{
    fips: Array<{
      name: string;
      geoLevelId: number;
      referenceDate: string;
      requires: string[];
      wildcard: string[];
      optionalWithWCFor: string[];
    }>;
  }> {
    return this.makeRequest({
      method: 'GET',
      url: `/${year}/${dataset}/geography.json`,
    }, options);
  }

  /**
   * Query census data
   */
  async queryData(
    year: string | number,
    dataset: string,
    variables: string[],
    geography: { [key: string]: string },
    options?: RequestOptions & {
      predicate?: string;
    }
  ): Promise<CensusData[]> {
    const params: any = {
      get: variables.join(','),
    };

    // Build geography string
    const geoStrings: string[] = [];
    for (const [geoType, geoValue] of Object.entries(geography)) {
      if (geoValue === '*') {
        geoStrings.push(`${geoType}:*`);
      } else {
        geoStrings.push(`${geoType}:${geoValue}`);
      }
    }
    
    if (geoStrings.length > 0) {
      params.for = geoStrings[geoStrings.length - 1];
      if (geoStrings.length > 1) {
        params.in = geoStrings.slice(0, -1).join(' ');
      }
    }

    if (options?.predicate) {
      params.predicate = options.predicate;
    }

    const response = await this.makeRequest<string[][]>({
      method: 'GET',
      url: `/${year}/${dataset}`,
      params,
    }, options);

    if (!response || response.length === 0) {
      return [];
    }

    // Convert array format to object format
    const headers = response[0];
    const data: CensusData[] = [];

    for (let i = 1; i < response.length; i++) {
      const row: CensusData = {};
      for (let j = 0; j < headers.length; j++) {
        const value = response[i][j];
        // Try to convert to number if possible
        const numValue = parseFloat(value);
        row[headers[j]] = isNaN(numValue) ? value : numValue;
      }
      data.push(row);
    }

    return data;
  }

  /**
   * Get American Community Survey (ACS) data
   */
  async getACSData(
    year: string | number,
    variables: string[],
    geography: { [key: string]: string },
    options?: RequestOptions & {
      survey?: '1' | '3' | '5'; // 1-year, 3-year, or 5-year estimates
      profile?: boolean; // Use data profile tables
    }
  ): Promise<CensusData[]> {
    const survey = options?.survey || '5';
    const dataset = options?.profile 
      ? `acs/acs${survey}/profile` 
      : `acs/acs${survey}`;

    return this.queryData(year, dataset, variables, geography, options);
  }

  /**
   * Get Population Estimates data
   */
  async getPopulationEstimates(
    year: string | number,
    variables: string[],
    geography: { [key: string]: string },
    options?: RequestOptions
  ): Promise<CensusData[]> {
    return this.queryData(year, 'pep/population', variables, geography, options);
  }

  /**
   * Get Economic Census data
   */
  async getEconomicCensus(
    year: string | number,
    variables: string[],
    geography: { [key: string]: string },
    options?: RequestOptions & {
      sector?: string; // NAICS sector code
    }
  ): Promise<CensusData[]> {
    const dataset = options?.sector 
      ? `ecnbasic/ecnbasic${options.sector}` 
      : 'ecnbasic';
    
    return this.queryData(year, dataset, variables, geography, options);
  }

  /**
   * Get business patterns data (County Business Patterns/Nonemployer Statistics)
   */
  async getBusinessPatterns(
    year: string | number,
    variables: string[],
    geography: { [key: string]: string },
    options?: RequestOptions & {
      type?: 'cbp' | 'nonemp'; // County Business Patterns or Nonemployer Statistics
    }
  ): Promise<CensusData[]> {
    const dataset = options?.type === 'nonemp' ? 'nonemp' : 'cbp';
    return this.queryData(year, dataset, variables, geography, options);
  }

  /**
   * Get state-level economic data
   */
  async getStateEconomicData(
    year: string | number,
    variables: string[],
    stateCode?: string,
    options?: RequestOptions
  ): Promise<CensusData[]> {
    const geography = stateCode 
      ? { state: stateCode }
      : { state: '*' };

    return this.getACSData(year, variables, geography, options);
  }

  /**
   * Get county-level economic data
   */
  async getCountyEconomicData(
    year: string | number,
    variables: string[],
    stateCode: string,
    countyCode?: string,
    options?: RequestOptions
  ): Promise<CensusData[]> {
    const geography = countyCode
      ? { state: stateCode, county: countyCode }
      : { state: stateCode, county: '*' };

    return this.getACSData(year, variables, geography, options);
  }

  /**
   * Get metropolitan statistical area data
   */
  async getMetroAreaData(
    year: string | number,
    variables: string[],
    msaCode?: string,
    options?: RequestOptions
  ): Promise<CensusData[]> {
    const geography = msaCode
      ? { 'metropolitan statistical area/micropolitan statistical area': msaCode }
      : { 'metropolitan statistical area/micropolitan statistical area': '*' };

    return this.getACSData(year, variables, geography, options);
  }

  /**
   * Get common economic indicators by geography
   */
  async getEconomicIndicators(
    year: string | number,
    geography: { [key: string]: string },
    options?: RequestOptions
  ): Promise<CensusData[]> {
    const variables = [
      'B01001_001E', // Total Population
      'B25001_001E', // Total Housing Units
      'B08303_001E', // Total Commuters
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B08301_010E', // Public Transportation Commuters
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B15003_024E', // Professional Degree
      'B15003_025E', // Doctorate Degree
    ];

    return this.getACSData(year, variables, geography, options);
  }

  /**
   * Search for variables by keyword
   */
  async searchVariables(
    year: string | number,
    dataset: string,
    keyword: string,
    options?: RequestOptions
  ): Promise<CensusVariable[]> {
    const allVariables = await this.getVariables(year, dataset, options);
    const matchingVariables: CensusVariable[] = [];

    for (const [name, variable] of Object.entries(allVariables)) {
      if (
        variable.label?.toLowerCase().includes(keyword.toLowerCase()) ||
        variable.concept?.toLowerCase().includes(keyword.toLowerCase()) ||
        name.toLowerCase().includes(keyword.toLowerCase())
      ) {
        matchingVariables.push({ ...variable, name });
      }
    }

    return matchingVariables;
  }
}