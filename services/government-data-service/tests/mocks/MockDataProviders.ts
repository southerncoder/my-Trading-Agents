import { 
  SECCompany, 
  SECFiling, 
  SECCompanyFacts, 
  FREDSeries, 
  FREDObservation, 
  BLSSeries, 
  BLSDataPoint,
  CensusVariable,
  CensusData
} from '../../src/types/index.js';

/**
 * Mock data providers for testing without external API dependencies
 */

export class MockSECProvider {
  static readonly MOCK_COMPANIES: Record<string, SECCompany> = {
    'AAPL': {
      cik_str: '0000320193',
      ticker: 'AAPL',
      title: 'Apple Inc.'
    },
    'MSFT': {
      cik_str: '0000789019',
      ticker: 'MSFT',
      title: 'Microsoft Corporation'
    },
    'GOOGL': {
      cik_str: '0001652044',
      ticker: 'GOOGL',
      title: 'Alphabet Inc.'
    },
    'TSLA': {
      cik_str: '0001318605',
      ticker: 'TSLA',
      title: 'Tesla, Inc.'
    }
  };

  static readonly MOCK_FILINGS: SECFiling[] = [
    {
      accessionNumber: '0000320193-23-000006',
      filingDate: '2023-02-03',
      reportDate: '2022-12-31',
      acceptanceDateTime: '2023-02-03T18:01:14.000Z',
      act: '34',
      form: '10-Q',
      fileNumber: '001-36743',
      filmNumber: '23601234',
      items: '',
      size: 12345678,
      isXBRL: 1,
      isInlineXBRL: 1,
      primaryDocument: 'aapl-20221231.htm',
      primaryDocDescription: '10-Q'
    },
    {
      accessionNumber: '0000320193-23-000005',
      filingDate: '2023-01-27',
      reportDate: '2022-12-31',
      acceptanceDateTime: '2023-01-27T18:01:14.000Z',
      act: '34',
      form: '8-K',
      fileNumber: '001-36743',
      filmNumber: '23601233',
      items: '2.02',
      size: 1234567,
      isXBRL: 0,
      isInlineXBRL: 0,
      primaryDocument: 'aapl-8k_20230127.htm',
      primaryDocDescription: '8-K'
    }
  ];

  static readonly MOCK_COMPANY_FACTS: SECCompanyFacts = {
    cik: '0000320193',
    entityName: 'Apple Inc.',
    facts: {
      'us-gaap': {
        'Assets': {
          label: 'Assets',
          description: 'Total assets',
          units: {
            'USD': [
              {
                end: '2022-09-24',
                val: 352755000000,
                accn: '0000320193-22-000108',
                fy: 2022,
                fp: 'FY',
                form: '10-K',
                filed: '2022-10-28'
              },
              {
                end: '2021-09-25',
                val: 351002000000,
                accn: '0000320193-21-000105',
                fy: 2021,
                fp: 'FY',
                form: '10-K',
                filed: '2021-10-29'
              }
            ]
          }
        },
        'Revenues': {
          label: 'Revenues',
          description: 'Total revenues',
          units: {
            'USD': [
              {
                end: '2022-09-24',
                val: 394328000000,
                accn: '0000320193-22-000108',
                fy: 2022,
                fp: 'FY',
                form: '10-K',
                filed: '2022-10-28'
              }
            ]
          }
        }
      }
    }
  };

  static getCompanyByTicker(ticker: string): SECCompany | null {
    return this.MOCK_COMPANIES[ticker.toUpperCase()] || null;
  }

  static getCompanyFilings(cik: string, count: number = 10): SECFiling[] {
    return this.MOCK_FILINGS.slice(0, count);
  }

  static getCompanyFacts(cik: string): SECCompanyFacts | null {
    // Return facts for Apple, null for others
    return cik === '0000320193' ? this.MOCK_COMPANY_FACTS : null;
  }

  static getAllCompanies(): Record<string, SECCompany> {
    return Object.keys(this.MOCK_COMPANIES).reduce((acc, ticker, index) => {
      acc[index.toString()] = this.MOCK_COMPANIES[ticker];
      return acc;
    }, {} as Record<string, SECCompany>);
  }
}

export class MockFREDProvider {
  static readonly MOCK_SERIES: Record<string, FREDSeries> = {
    'GDP': {
      id: 'GDP',
      realtime_start: '2023-01-01',
      realtime_end: '2023-12-31',
      title: 'Gross Domestic Product',
      observation_start: '1947-01-01',
      observation_end: '2023-07-01',
      frequency: 'Quarterly',
      frequency_short: 'Q',
      units: 'Billions of Dollars',
      units_short: 'Bil. of $',
      seasonal_adjustment: 'Seasonally Adjusted Annual Rate',
      seasonal_adjustment_short: 'SAAR',
      last_updated: '2023-10-26 07:46:03-05',
      popularity: 100,
      notes: 'BEA Account Code: A191RC'
    },
    'UNRATE': {
      id: 'UNRATE',
      realtime_start: '2023-01-01',
      realtime_end: '2023-12-31',
      title: 'Unemployment Rate',
      observation_start: '1948-01-01',
      observation_end: '2023-12-01',
      frequency: 'Monthly',
      frequency_short: 'M',
      units: 'Percent',
      units_short: '%',
      seasonal_adjustment: 'Seasonally Adjusted',
      seasonal_adjustment_short: 'SA',
      last_updated: '2024-01-05 07:44:03-06',
      popularity: 95,
      notes: 'The unemployment rate represents the number of unemployed as a percentage of the labor force.'
    },
    'DGS10': {
      id: 'DGS10',
      realtime_start: '2023-01-01',
      realtime_end: '2023-12-31',
      title: '10-Year Treasury Constant Maturity Rate',
      observation_start: '1962-01-02',
      observation_end: '2023-12-29',
      frequency: 'Daily',
      frequency_short: 'D',
      units: 'Percent',
      units_short: '%',
      seasonal_adjustment: 'Not Seasonally Adjusted',
      seasonal_adjustment_short: 'NSA',
      last_updated: '2024-01-02 15:17:03-06',
      popularity: 90,
      notes: 'Averages of business days. For further information regarding treasury constant maturity data, please refer to the Board of Governors of the Federal Reserve System.'
    }
  };

  static readonly MOCK_OBSERVATIONS: Record<string, FREDObservation[]> = {
    'GDP': [
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-01',
        value: '26854.599'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-04-01',
        value: '27063.011'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-07-01',
        value: '27610.925'
      }
    ],
    'UNRATE': [
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-01',
        value: '3.5'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-02-01',
        value: '3.6'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-03-01',
        value: '3.5'
      }
    ],
    'DGS10': [
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-01',
        value: '3.88'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-02',
        value: '3.85'
      },
      {
        realtime_start: '2023-01-01',
        realtime_end: '2023-12-31',
        date: '2023-01-03',
        value: '3.82'
      }
    ]
  };

  static getSeries(seriesId: string): FREDSeries | null {
    return this.MOCK_SERIES[seriesId] || null;
  }

  static getSeriesObservations(seriesId: string): FREDObservation[] {
    return this.MOCK_OBSERVATIONS[seriesId] || [];
  }

  static searchSeries(query: string): FREDSeries[] {
    const results: FREDSeries[] = [];
    const lowerQuery = query.toLowerCase();

    Object.values(this.MOCK_SERIES).forEach(series => {
      if (series.title.toLowerCase().includes(lowerQuery) || 
          series.id.toLowerCase().includes(lowerQuery)) {
        results.push(series);
      }
    });

    return results;
  }

  static getMultipleSeriesObservations(seriesIds: string[]): Record<string, FREDObservation[]> {
    const result: Record<string, FREDObservation[]> = {};
    
    seriesIds.forEach(seriesId => {
      result[seriesId] = this.getSeriesObservations(seriesId);
    });

    return result;
  }
}

export class MockBLSProvider {
  static readonly MOCK_SERIES_DATA: Record<string, BLSSeries> = {
    'LNS14000000': {
      seriesID: 'LNS14000000',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '3.7',
          footnotes: []
        },
        {
          year: '2023',
          period: 'M11',
          periodName: 'November',
          latest: 'false',
          value: '3.7',
          footnotes: []
        },
        {
          year: '2023',
          period: 'M10',
          periodName: 'October',
          latest: 'false',
          value: '3.9',
          footnotes: []
        }
      ]
    },
    'CUUR0000SA0': {
      seriesID: 'CUUR0000SA0',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '307.026',
          footnotes: []
        },
        {
          year: '2023',
          period: 'M11',
          periodName: 'November',
          latest: 'false',
          value: '307.671',
          footnotes: []
        }
      ]
    },
    'WPUFD49207': {
      seriesID: 'WPUFD49207',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '195.8',
          footnotes: []
        }
      ]
    },
    'CES0500000003': {
      seriesID: 'CES0500000003',
      data: [
        {
          year: '2023',
          period: 'M12',
          periodName: 'December',
          latest: 'true',
          value: '34.27',
          footnotes: []
        }
      ]
    }
  };

  static getSeriesData(seriesIds: string[]): BLSSeries[] {
    return seriesIds.map(seriesId => 
      this.MOCK_SERIES_DATA[seriesId] || {
        seriesID: seriesId,
        data: []
      }
    );
  }

  static getUnemploymentRate(): BLSSeries {
    return this.MOCK_SERIES_DATA['LNS14000000'];
  }

  static getConsumerPriceIndex(): BLSSeries {
    return this.MOCK_SERIES_DATA['CUUR0000SA0'];
  }

  static getProducerPriceIndex(): BLSSeries {
    return this.MOCK_SERIES_DATA['WPUFD49207'];
  }

  static getAverageHourlyEarnings(): BLSSeries {
    return this.MOCK_SERIES_DATA['CES0500000003'];
  }

  static getEconomicIndicators(): BLSSeries[] {
    return [
      this.getUnemploymentRate(),
      this.getConsumerPriceIndex(),
      this.getProducerPriceIndex(),
      this.getAverageHourlyEarnings()
    ];
  }
}

export class MockCensusProvider {
  static readonly MOCK_VARIABLES: CensusVariable[] = [
    {
      name: 'NAME',
      label: 'Geographic Area Name',
      concept: 'Geography',
      predicateType: 'string',
      group: 'N/A',
      limit: 0
    },
    {
      name: 'B01001_001E',
      label: 'Total Population',
      concept: 'Age and Sex',
      predicateType: 'int',
      group: 'B01001',
      limit: 0
    },
    {
      name: 'B19013_001E',
      label: 'Median Household Income in the Past 12 Months (in 2021 Inflation-Adjusted Dollars)',
      concept: 'Income',
      predicateType: 'int',
      group: 'B19013',
      limit: 0
    },
    {
      name: 'B25077_001E',
      label: 'Median Value (Dollars)',
      concept: 'Housing',
      predicateType: 'int',
      group: 'B25077',
      limit: 0
    }
  ];

  static readonly MOCK_STATE_DATA: CensusData[] = [
    {
      'NAME': 'California',
      'B01001_001E': '39538223',
      'B19013_001E': '80440',
      'B25077_001E': '684800',
      'state': '06'
    },
    {
      'NAME': 'Texas',
      'B01001_001E': '29145505',
      'B19013_001E': '64034',
      'B25077_001E': '172500',
      'state': '48'
    },
    {
      'NAME': 'Florida',
      'B01001_001E': '21538187',
      'B19013_001E': '59227',
      'B25077_001E': '232000',
      'state': '12'
    },
    {
      'NAME': 'New York',
      'B01001_001E': '20201249',
      'B19013_001E': '70696',
      'B25077_001E': '340000',
      'state': '36'
    }
  ];

  static readonly MOCK_COUNTY_DATA: CensusData[] = [
    {
      'NAME': 'Los Angeles County, California',
      'B01001_001E': '10014009',
      'B19013_001E': '70192',
      'B25077_001E': '669600',
      'county': '037',
      'state': '06'
    },
    {
      'NAME': 'Cook County, Illinois',
      'B01001_001E': '5275541',
      'B19013_001E': '62097',
      'B25077_001E': '249100',
      'county': '031',
      'state': '17'
    }
  ];

  static readonly MOCK_NATIONAL_DATA: CensusData[] = [
    {
      'NAME': 'United States',
      'B01001_001E': '331449281',
      'B19013_001E': '70784',
      'B25077_001E': '229800',
      'us': '1'
    }
  ];

  static getVariables(): CensusVariable[] {
    return this.MOCK_VARIABLES;
  }

  static getData(variables: string[], geography: any): CensusData[] {
    if (geography.for === 'state:*') {
      return this.MOCK_STATE_DATA;
    } else if (geography.for === 'county:*') {
      return this.MOCK_COUNTY_DATA;
    } else if (geography.for === 'us:1') {
      return this.MOCK_NATIONAL_DATA;
    } else if (geography.for?.startsWith('state:')) {
      const stateCode = geography.for.split(':')[1];
      return this.MOCK_STATE_DATA.filter(item => item.state === stateCode);
    } else if (geography.for?.startsWith('county:')) {
      const countyCode = geography.for.split(':')[1];
      return this.MOCK_COUNTY_DATA.filter(item => item.county === countyCode);
    }
    
    return [];
  }

  static getStateData(variables: string[], stateCode?: string): CensusData[] {
    if (stateCode) {
      return this.MOCK_STATE_DATA.filter(item => item.state === stateCode);
    }
    return this.MOCK_STATE_DATA;
  }

  static getCountyData(variables: string[], stateCode?: string, countyCode?: string): CensusData[] {
    let data = this.MOCK_COUNTY_DATA;
    
    if (stateCode) {
      data = data.filter(item => item.state === stateCode);
    }
    
    if (countyCode) {
      data = data.filter(item => item.county === countyCode);
    }
    
    return data;
  }

  static getEconomicIndicators(): CensusData[] {
    return this.MOCK_NATIONAL_DATA;
  }

  static searchVariables(keyword: string): CensusVariable[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.MOCK_VARIABLES.filter(variable =>
      variable.label.toLowerCase().includes(lowerKeyword) ||
      variable.concept.toLowerCase().includes(lowerKeyword) ||
      variable.name.toLowerCase().includes(lowerKeyword)
    );
  }
}

/**
 * Utility functions for creating test scenarios
 */
export class MockDataScenarios {
  /**
   * Create a scenario with all services working
   */
  static createHealthyScenario() {
    return {
      sec: MockSECProvider,
      fred: MockFREDProvider,
      bls: MockBLSProvider,
      census: MockCensusProvider
    };
  }

  /**
   * Create a scenario with some services failing
   */
  static createPartialFailureScenario() {
    return {
      sec: MockSECProvider,
      fred: null, // FRED service down
      bls: MockBLSProvider,
      census: MockCensusProvider
    };
  }

  /**
   * Create a scenario with rate limiting
   */
  static createRateLimitedScenario() {
    return {
      sec: {
        ...MockSECProvider,
        rateLimited: true,
        retryAfter: 60
      },
      fred: MockFREDProvider,
      bls: MockBLSProvider,
      census: MockCensusProvider
    };
  }

  /**
   * Create a scenario with empty data
   */
  static createEmptyDataScenario() {
    return {
      sec: {
        getCompanyByTicker: () => null,
        getCompanyFilings: () => [],
        getCompanyFacts: () => null,
        getAllCompanies: () => ({})
      },
      fred: {
        getSeries: () => null,
        getSeriesObservations: () => [],
        searchSeries: () => [],
        getMultipleSeriesObservations: () => ({})
      },
      bls: {
        getSeriesData: () => [],
        getUnemploymentRate: () => ({ seriesID: 'LNS14000000', data: [] }),
        getEconomicIndicators: () => []
      },
      census: {
        getVariables: () => [],
        getData: () => [],
        getStateData: () => [],
        getEconomicIndicators: () => []
      }
    };
  }

  /**
   * Generate large dataset for performance testing
   */
  static generateLargeDataset(size: number) {
    const largeStateData: CensusData[] = [];
    
    for (let i = 0; i < size; i++) {
      largeStateData.push({
        'NAME': `State ${i}`,
        'B01001_001E': (Math.random() * 10000000).toString(),
        'B19013_001E': (Math.random() * 100000).toString(),
        'state': i.toString().padStart(2, '0')
      });
    }
    
    return largeStateData;
  }

  /**
   * Create time series data for testing
   */
  static generateTimeSeriesData(seriesId: string, startDate: Date, endDate: Date): FREDObservation[] {
    const observations: FREDObservation[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      observations.push({
        realtime_start: startDate.toISOString().split('T')[0],
        realtime_end: endDate.toISOString().split('T')[0],
        date: current.toISOString().split('T')[0],
        value: (Math.random() * 100).toFixed(2)
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return observations;
  }
}

export default {
  MockSECProvider,
  MockFREDProvider,
  MockBLSProvider,
  MockCensusProvider,
  MockDataScenarios
};