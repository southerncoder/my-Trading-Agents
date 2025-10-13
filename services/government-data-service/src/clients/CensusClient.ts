import { BaseClient } from '../base/BaseClient.js';
import { 
  CensusVariable, 
  CensusData,
  RequestOptions 
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class CensusClient extends BaseClient {
  constructor(userAgent?: string) {
    // Census API has no official rate limits, but we'll be respectful
    super(
      'https://api.census.gov/data', 
      userAgent || 'TradingAgents/1.0.0 (trading-agents@example.com)',
      30000, // 30 second timeout
      3, // max retries
      1000, // 1 second retry delay
      { tokensPerInterval: 5, interval: 'second' } // 5 requests per second
    );
  }

  /**
   * Get American Community Survey (ACS) data
   */
  async getACSData(
    year: number,
    variables: string[],
    geography: string,
    options?: RequestOptions & {
      state?: string;
      county?: string;
      tract?: string;
      blockGroup?: string;
    }
  ): Promise<CensusData[]> {
    logger.info(`Fetching ACS data for year ${year}`, {
      variableCount: variables.length,
      geography,
      state: options?.state,
      county: options?.county
    });

    const params: any = {
      get: variables.join(','),
      for: geography,
    };

    if (options?.state) params.in = `state:${options.state}`;
    if (options?.county && options?.state) {
      params.in = `state:${options.state} county:${options.county}`;
    }
    if (options?.tract && options?.county && options?.state) {
      params.in = `state:${options.state} county:${options.county} tract:${options.tract}`;
    }

    try {
      const response = await this.makeRequest<string[][]>({
        method: 'GET',
        url: `/${year}/acs/acs5`,
        params,
      }, options);

      if (!response || response.length === 0) {
        return [];
      }

      // First row contains headers, subsequent rows contain data
      const headers = response[0];
      const data = response.slice(1).map(row => {
        const item: CensusData = {};
        headers.forEach((header, index) => {
          const value = row[index];
          // Try to parse as number, otherwise keep as string
          item[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return item;
      });

      logger.info(`Retrieved ${data.length} ACS data records`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch ACS data for year ${year}`, { error, variables, geography });
      throw error;
    }
  }

  /**
   * Get state-level economic data
   */
  async getStateEconomicData(
    year: number,
    variables: string[],
    options?: RequestOptions
  ): Promise<CensusData[]> {
    logger.info(`Fetching state economic data for year ${year}`);
    
    const defaultVariables = variables.length > 0 ? variables : [
      'NAME',
      'B01001_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B08303_001E', // Total Commuters
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B15003_024E', // Professional Degree
      'B15003_025E', // Doctorate Degree
    ];

    return this.getACSData(year, defaultVariables, 'state:*', options);
  }

  /**
   * Get county-level economic data
   */
  async getCountyEconomicData(
    year: number,
    variables: string[],
    state: string,
    options?: RequestOptions
  ): Promise<CensusData[]> {
    logger.info(`Fetching county economic data for year ${year}, state ${state}`);
    
    const defaultVariables = variables.length > 0 ? variables : [
      'NAME',
      'B01001_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B08303_001E', // Total Commuters
    ];

    return this.getACSData(year, defaultVariables, 'county:*', {
      ...options,
      state
    });
  }

  /**
   * Get metropolitan statistical area data
   */
  async getMetropolitanAreaData(
    year: number,
    variables: string[],
    options?: RequestOptions
  ): Promise<CensusData[]> {
    logger.info(`Fetching metropolitan area data for year ${year}`);
    
    const defaultVariables = variables.length > 0 ? variables : [
      'NAME',
      'B01001_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B08303_001E', // Total Commuters
      'B25003_002E', // Owner Occupied Housing
      'B25003_003E', // Renter Occupied Housing
    ];

    return this.getACSData(year, defaultVariables, 'metropolitan statistical area/micropolitan statistical area:*', options);
  }

  /**
   * Get population estimates
   */
  async getPopulationEstimates(
    year: number,
    geography: 'state' | 'county',
    options?: RequestOptions & {
      state?: string;
    }
  ): Promise<CensusData[]> {
    logger.info(`Fetching population estimates for year ${year}, geography: ${geography}`);

    const variables = [
      'NAME',
      'POP',      // Population estimate
      'BIRTHS',   // Births
      'DEATHS',   // Deaths
      'NETMIG',   // Net migration
    ];

    const params: any = {
      get: variables.join(','),
      for: geography === 'state' ? 'state:*' : 'county:*',
    };

    if (geography === 'county' && options?.state) {
      params.in = `state:${options.state}`;
    }

    try {
      const response = await this.makeRequest<string[][]>({
        method: 'GET',
        url: `/${year}/pep/population`,
        params,
      }, options);

      if (!response || response.length === 0) {
        return [];
      }

      const headers = response[0];
      const data = response.slice(1).map(row => {
        const item: CensusData = {};
        headers.forEach((header, index) => {
          const value = row[index];
          item[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return item;
      });

      logger.info(`Retrieved ${data.length} population estimate records`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch population estimates for year ${year}`, { error, geography });
      throw error;
    }
  }

  /**
   * Get County Business Patterns data
   */
  async getCountyBusinessPatterns(
    year: number,
    options?: RequestOptions & {
      state?: string;
      county?: string;
      naicsCode?: string; // Industry code
    }
  ): Promise<CensusData[]> {
    logger.info(`Fetching County Business Patterns for year ${year}`, {
      state: options?.state,
      county: options?.county,
      naicsCode: options?.naicsCode
    });

    const variables = [
      'NAME',
      'NAICS2017',     // Industry code
      'NAICS2017_LABEL', // Industry description
      'EMP',           // Number of employees
      'ESTAB',         // Number of establishments
      'PAYANN',        // Annual payroll
    ];

    const params: any = {
      get: variables.join(','),
      for: options?.county ? 'county:*' : 'state:*',
    };

    if (options?.state) {
      if (options?.county) {
        params.in = `state:${options.state}`;
        params.for = `county:${options.county}`;
      } else {
        params.for = `state:${options.state}`;
      }
    }

    if (options?.naicsCode) {
      params.NAICS2017 = options.naicsCode;
    }

    try {
      const response = await this.makeRequest<string[][]>({
        method: 'GET',
        url: `/${year}/cbp`,
        params,
      }, options);

      if (!response || response.length === 0) {
        return [];
      }

      const headers = response[0];
      const data = response.slice(1).map(row => {
        const item: CensusData = {};
        headers.forEach((header, index) => {
          const value = row[index];
          item[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return item;
      });

      logger.info(`Retrieved ${data.length} County Business Patterns records`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch County Business Patterns for year ${year}`, { error });
      throw error;
    }
  }

  /**
   * Search for available variables
   */
  async searchVariables(
    year: number,
    dataset: string,
    searchTerm: string,
    options?: RequestOptions
  ): Promise<CensusVariable[]> {
    logger.info(`Searching variables in ${dataset} for year ${year}: "${searchTerm}"`);

    try {
      const response = await this.makeRequest<{
        variables: { [key: string]: CensusVariable };
      }>({
        method: 'GET',
        url: `/${year}/${dataset}/variables.json`,
      }, options);

      if (!response.variables) {
        return [];
      }

      // Filter variables that match the search term
      const matchingVariables = Object.entries(response.variables)
        .filter(([key, variable]) => 
          variable.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          variable.concept?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          key.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(([key, variable]) => ({
          ...variable,
          name: key
        }));

      logger.info(`Found ${matchingVariables.length} variables matching "${searchTerm}"`);
      return matchingVariables;
    } catch (error) {
      logger.error(`Failed to search variables in ${dataset} for year ${year}`, { error, searchTerm });
      throw error;
    }
  }

  /**
   * Get economic indicators for demographic analysis
   */
  async getEconomicIndicators(
    year: number,
    options?: RequestOptions & {
      state?: string;
      includeCounties?: boolean;
    }
  ): Promise<CensusData[]> {
    logger.info(`Fetching economic indicators for year ${year}`, {
      state: options?.state,
      includeCounties: options?.includeCounties
    });

    const variables = [
      'NAME',
      'B01001_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B19301_001E', // Per Capita Income
      'B25077_001E', // Median Home Value
      'B25064_001E', // Median Gross Rent
      'B08303_001E', // Total Commuters
      'B08303_013E', // Public Transportation Commuters
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B23025_002E', // Labor Force
      'B23025_005E', // Unemployed
      'B25003_002E', // Owner Occupied Housing
      'B25003_003E', // Renter Occupied Housing
    ];

    if (options?.includeCounties && options?.state) {
      return this.getCountyEconomicData(year, variables, options.state, options);
    } else if (options?.state) {
      return this.getACSData(year, variables, `state:${options.state}`, options);
    } else {
      return this.getStateEconomicData(year, variables, options);
    }
  }

  /**
   * Get demographic analysis for market research
   */
  async getDemographicAnalysis(
    year: number,
    geography: 'state' | 'county' | 'msa',
    options?: RequestOptions & {
      state?: string;
    }
  ): Promise<CensusData[]> {
    logger.info(`Fetching demographic analysis for year ${year}, geography: ${geography}`);

    const variables = [
      'NAME',
      'B01001_001E', // Total Population
      'B01002_001E', // Median Age
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B08303_001E', // Total Commuters
      'B08303_013E', // Public Transportation
      'B25003_002E', // Owner Occupied
      'B25003_003E', // Renter Occupied
      'B23025_002E', // Labor Force
      'B23025_005E', // Unemployed
    ];

    switch (geography) {
      case 'state':
        return this.getStateEconomicData(year, variables, options);
      case 'county':
        if (!options?.state) {
          throw new Error('State parameter required for county-level data');
        }
        return this.getCountyEconomicData(year, variables, options.state, options);
      case 'msa':
        return this.getMetropolitanAreaData(year, variables, options);
      default:
        throw new Error(`Unsupported geography: ${geography}`);
    }
  }

  /**
   * Get geographic data correlation with market performance
   */
  async getMarketCorrelationData(
    year: number,
    options?: RequestOptions
  ): Promise<CensusData[]> {
    logger.info(`Fetching market correlation data for year ${year}`);

    const variables = [
      'NAME',
      'B01001_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B19301_001E', // Per Capita Income
      'B25077_001E', // Median Home Value
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B15003_024E', // Professional Degree
      'B15003_025E', // Doctorate Degree
      'B08303_001E', // Total Commuters
      'B23025_002E', // Labor Force
      'B23025_005E', // Unemployed
      'B25003_002E', // Owner Occupied Housing
      'B08134_001E', // Commute Time
    ];

    // Get state-level data for market correlation analysis
    return this.getStateEconomicData(year, variables, options);
  }
}