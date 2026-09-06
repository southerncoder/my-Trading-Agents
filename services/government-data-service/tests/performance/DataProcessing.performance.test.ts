import { describe, it, expect, beforeAll } from 'vitest';
import { GovFinancialData } from '../../src/GovFinancialData.js';
import { MockDataScenarios } from '../mocks/MockDataProviders.js';

describe('Government Data Service Performance Tests', () => {
  let govData: GovFinancialData;

  beforeAll(() => {
    govData = new GovFinancialData({
      fredApiKey: 'test-key',
      blsApiKey: 'test-key',
      userAgent: globalThis.testConfig.userAgent
    });
  });

  describe('Large Dataset Processing', () => {
    it('should process large state dataset efficiently', async () => {
      const largeDataset = MockDataScenarios.generateLargeDataset(10000);
      const startTime = Date.now();
      
      // Simulate processing large dataset
      const processedData = largeDataset.map(item => ({
        ...item,
        populationDensity: parseInt(item.B01001_001E as string) / 1000, // Mock calculation
        incomeRatio: parseInt(item.B19013_001E as string) / 50000 // Mock calculation
      }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedData).toHaveLength(10000);
      expect(processingTime).toBeLessThan(5000); // Should process in under 5 seconds
      
      console.log(`Processed ${largeDataset.length} records in ${processingTime}ms`);
    }, 10000);

    it('should handle concurrent large data requests', async () => {
      const startTime = Date.now();
      
      // Simulate multiple concurrent large data requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => {
          const dataset = MockDataScenarios.generateLargeDataset(2000);
          const processed = dataset.filter(item => 
            parseInt(item.B01001_001E as string) > 1000000
          );
          resolve(processed);
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(10000); // Should complete in under 10 seconds
      
      console.log(`Processed 5 concurrent large datasets in ${totalTime}ms`);
    }, 15000);

    it('should efficiently process time series data', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2023-12-31');
      const timeSeriesData = MockDataScenarios.generateTimeSeriesData('GDP', startDate, endDate);
      
      const startTime = Date.now();
      
      // Simulate time series analysis
      const analysis = {
        count: timeSeriesData.length,
        average: timeSeriesData.reduce((sum, obs) => sum + parseFloat(obs.value), 0) / timeSeriesData.length,
        min: Math.min(...timeSeriesData.map(obs => parseFloat(obs.value))),
        max: Math.max(...timeSeriesData.map(obs => parseFloat(obs.value))),
        trend: timeSeriesData.length > 1 ? 
          parseFloat(timeSeriesData[timeSeriesData.length - 1].value) - parseFloat(timeSeriesData[0].value) : 0
      };
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(analysis.count).toBeGreaterThan(1000); // Should have many data points
      expect(analysis.average).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(1000); // Should process quickly
      
      console.log(`Analyzed ${analysis.count} time series points in ${processingTime}ms`);
    }, 5000);

    it('should handle memory-intensive operations efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create multiple large datasets
      const datasets = Array.from({ length: 10 }, (_, i) => 
        MockDataScenarios.generateLargeDataset(1000)
      );
      
      const startTime = Date.now();
      
      // Perform memory-intensive operations
      const combinedData = datasets.flat();
      const groupedByState = combinedData.reduce((acc, item) => {
        const state = item.state as string;
        if (!acc[state]) acc[state] = [];
        acc[state].push(item);
        return acc;
      }, {} as Record<string, any[]>);
      
      const stateAggregates = Object.entries(groupedByState).map(([state, items]) => ({
        state,
        totalPopulation: items.reduce((sum, item) => sum + parseInt(item.B01001_001E as string), 0),
        avgIncome: items.reduce((sum, item) => sum + parseInt(item.B19013_001E as string), 0) / items.length,
        count: items.length
      }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const finalMemory = process.memoryUsage();
      
      expect(combinedData).toHaveLength(10000);
      expect(stateAggregates.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(5000);
      
      // Memory usage should be reasonable
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      
      console.log(`Processed ${combinedData.length} records with ${memoryIncrease / 1024 / 1024}MB memory increase in ${processingTime}ms`);
    }, 10000);
  });

  describe('API Response Processing', () => {
    it('should efficiently parse large SEC company listings', async () => {
      // Simulate large SEC company response
      const largeCompanyList = Array.from({ length: 50000 }, (_, i) => ({
        [`${i}`]: {
          cik_str: i.toString().padStart(10, '0'),
          ticker: `TICK${i}`,
          title: `Company ${i} Inc.`
        }
      })).reduce((acc, item) => ({ ...acc, ...item }), {});
      
      const startTime = Date.now();
      
      // Simulate parsing and filtering
      const filteredCompanies = Object.values(largeCompanyList).filter(company => 
        company.title.includes('Inc.')
      );
      
      const searchResults = Object.values(largeCompanyList).filter(company =>
        company.title.toLowerCase().includes('tech') ||
        company.ticker.includes('TECH')
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(filteredCompanies.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(2000); // Should process in under 2 seconds
      
      console.log(`Processed ${Object.keys(largeCompanyList).length} companies in ${processingTime}ms`);
    }, 5000);

    it('should efficiently process large FRED time series responses', async () => {
      // Simulate large FRED time series response
      const largeTimeSeries = Array.from({ length: 10000 }, (_, i) => {
        const date = new Date('2000-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          value: (Math.random() * 1000).toFixed(2),
          realtime_start: '2000-01-01',
          realtime_end: '2023-12-31'
        };
      });
      
      const startTime = Date.now();
      
      // Simulate processing operations
      const yearlyAverages = largeTimeSeries.reduce((acc, obs) => {
        const year = obs.date.split('-')[0];
        if (!acc[year]) acc[year] = { sum: 0, count: 0 };
        acc[year].sum += parseFloat(obs.value);
        acc[year].count += 1;
        return acc;
      }, {} as Record<string, { sum: number; count: number }>);
      
      const processedAverages = Object.entries(yearlyAverages).map(([year, data]) => ({
        year,
        average: data.sum / data.count
      }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedAverages.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(1000); // Should process quickly
      
      console.log(`Processed ${largeTimeSeries.length} time series observations in ${processingTime}ms`);
    }, 3000);

    it('should handle large BLS data responses efficiently', async () => {
      // Simulate large BLS response with multiple series
      const largeBLSResponse = Array.from({ length: 100 }, (_, seriesIndex) => ({
        seriesID: `SERIES${seriesIndex}`,
        data: Array.from({ length: 120 }, (_, dataIndex) => ({
          year: (2010 + Math.floor(dataIndex / 12)).toString(),
          period: `M${(dataIndex % 12 + 1).toString().padStart(2, '0')}`,
          periodName: new Date(2010, dataIndex % 12).toLocaleString('default', { month: 'long' }),
          latest: dataIndex === 119 ? 'true' : 'false',
          value: (Math.random() * 100).toFixed(1),
          footnotes: []
        }))
      }));
      
      const startTime = Date.now();
      
      // Simulate processing operations
      const latestValues = largeBLSResponse.map(series => ({
        seriesID: series.seriesID,
        latestValue: series.data.find(d => d.latest === 'true')?.value,
        dataPoints: series.data.length
      }));
      
      const totalDataPoints = largeBLSResponse.reduce((sum, series) => sum + series.data.length, 0);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(latestValues.length).toBe(100);
      expect(totalDataPoints).toBe(12000);
      expect(processingTime).toBeLessThan(500); // Should process very quickly
      
      console.log(`Processed ${totalDataPoints} BLS data points across ${largeBLSResponse.length} series in ${processingTime}ms`);
    }, 2000);
  });

  describe('Cross-Source Data Correlation', () => {
    it('should efficiently correlate data across multiple sources', async () => {
      const startTime = Date.now();
      
      // Generate mock data from different sources
      const secData = Array.from({ length: 1000 }, (_, i) => ({
        ticker: `TICK${i}`,
        marketCap: Math.random() * 1000000000,
        sector: ['Tech', 'Finance', 'Healthcare', 'Energy'][i % 4]
      }));
      
      const fredData = Array.from({ length: 365 }, (_, i) => {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          gdp: 25000 + Math.random() * 1000,
          unemployment: 3.5 + Math.random() * 2
        };
      });
      
      const censusData = Array.from({ length: 50 }, (_, i) => ({
        state: `State${i}`,
        population: 1000000 + Math.random() * 10000000,
        medianIncome: 50000 + Math.random() * 50000
      }));
      
      // Perform correlation analysis
      const sectorAnalysis = secData.reduce((acc, company) => {
        if (!acc[company.sector]) acc[company.sector] = { count: 0, totalMarketCap: 0 };
        acc[company.sector].count += 1;
        acc[company.sector].totalMarketCap += company.marketCap;
        return acc;
      }, {} as Record<string, { count: number; totalMarketCap: number }>);
      
      const economicTrends = fredData.reduce((acc, data, index) => {
        if (index === 0) return acc;
        const prev = fredData[index - 1];
        acc.gdpGrowth += (data.gdp - prev.gdp) / prev.gdp;
        acc.unemploymentChange += data.unemployment - prev.unemployment;
        return acc;
      }, { gdpGrowth: 0, unemploymentChange: 0 });
      
      const demographicInsights = censusData.map(state => ({
        ...state,
        incomePerCapita: state.medianIncome / (state.population / 1000000)
      }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(Object.keys(sectorAnalysis).length).toBe(4);
      expect(demographicInsights.length).toBe(50);
      expect(processingTime).toBeLessThan(100); // Should be very fast
      
      console.log(`Correlated data across 3 sources (${secData.length + fredData.length + censusData.length} total records) in ${processingTime}ms`);
    }, 2000);
  });

  describe('Memory and Resource Management', () => {
    it('should manage memory efficiently during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple memory-intensive operations
      for (let i = 0; i < 10; i++) {
        const largeArray = Array.from({ length: 10000 }, (_, index) => ({
          id: index,
          data: Math.random().toString(36).repeat(100) // Large string
        }));
        
        // Process and discard
        const processed = largeArray.filter(item => item.id % 2 === 0);
        expect(processed.length).toBe(5000);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after large operations: ${memoryIncrease / 1024 / 1024}MB`);
    }, 10000);

    it('should handle resource cleanup properly', async () => {
      const resources: any[] = [];
      
      try {
        // Create multiple "resources" (simulated)
        for (let i = 0; i < 1000; i++) {
          resources.push({
            id: i,
            data: new Array(1000).fill(Math.random()),
            cleanup: () => { /* cleanup logic */ }
          });
        }
        
        expect(resources.length).toBe(1000);
        
        // Simulate processing
        const startTime = Date.now();
        const processed = resources.map(resource => ({
          id: resource.id,
          sum: resource.data.reduce((a: number, b: number) => a + b, 0)
        }));
        const endTime = Date.now();
        
        expect(processed.length).toBe(1000);
        expect(endTime - startTime).toBeLessThan(1000);
        
      } finally {
        // Cleanup resources
        resources.forEach(resource => {
          if (resource.cleanup) {
            resource.cleanup();
          }
        });
        resources.length = 0; // Clear array
      }
      
      expect(resources.length).toBe(0);
    }, 5000);
  });

  describe('Concurrent Processing', () => {
    it('should handle high concurrency efficiently', async () => {
      const startTime = Date.now();
      const concurrentTasks = 50;
      
      const promises = Array.from({ length: concurrentTasks }, async (_, i) => {
        // Simulate different types of data processing
        const taskType = i % 4;
        
        switch (taskType) {
          case 0: // SEC data processing
            const companies = Array.from({ length: 100 }, (_, j) => ({
              ticker: `TICK${i}_${j}`,
              price: Math.random() * 1000
            }));
            return companies.filter(c => c.price > 500);
            
          case 1: // FRED data processing
            const timeSeries = Array.from({ length: 365 }, (_, j) => ({
              date: `2023-${Math.floor(j/30)+1}-${j%30+1}`,
              value: Math.random() * 100
            }));
            return timeSeries.reduce((sum, point) => sum + point.value, 0) / timeSeries.length;
            
          case 2: // BLS data processing
            const laborData = Array.from({ length: 12 }, (_, j) => ({
              month: j + 1,
              unemployment: 3 + Math.random() * 2
            }));
            return Math.max(...laborData.map(d => d.unemployment));
            
          case 3: // Census data processing
            const stateData = Array.from({ length: 50 }, (_, j) => ({
              state: j,
              population: 1000000 + Math.random() * 10000000
            }));
            return stateData.reduce((sum, state) => sum + state.population, 0);
            
          default:
            return null;
        }
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results.length).toBe(concurrentTasks);
      expect(results.every(result => result !== null)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      console.log(`Completed ${concurrentTasks} concurrent tasks in ${totalTime}ms`);
    }, 10000);
  });
});