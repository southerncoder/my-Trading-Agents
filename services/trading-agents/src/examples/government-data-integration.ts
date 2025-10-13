/**
 * Government Data Integration Example
 * 
 * This example demonstrates how to integrate government data
 * into trading strategies and analysis workflows.
 */

import { GovernmentDataflow } from '../dataflows/government-data.js';

// Initialize government data service
const govDataflow = new GovernmentDataflow({
  baseUrl: process.env.GOVERNMENT_DATA_URL || 'http://localhost:3005',
  timeout: 30000,
  enabled: true
});

/**
 * Example: Enhanced fundamental analysis with government data
 */
export async function enhancedFundamentalAnalysis(ticker: string) {
  console.log(`\n=== Enhanced Fundamental Analysis for ${ticker} ===`);
  
  try {
    // Check if service is healthy
    const isHealthy = await govDataflow.isHealthy();
    if (!isHealthy) {
      console.log('Government data service is not available');
      return null;
    }

    // Get comprehensive company profile with SEC filings
    const companyProfile = await govDataflow.getCompanyProfile(ticker);
    if (!companyProfile) {
      console.log(`No company profile found for ${ticker}`);
      return null;
    }

    console.log(`Company: ${companyProfile.company.title}`);
    console.log(`CIK: ${companyProfile.company.cik_str}`);
    console.log(`Recent Filings: ${companyProfile.recentFilings.length}`);
    
    // Get economic context
    const economicContext = await govDataflow.getEconomicDashboard();
    if (economicContext) {
      console.log('\nEconomic Context:');
      console.log(`- BLS Data Available: ${!!economicContext.bls}`);
      console.log(`- FRED Data Available: ${!!economicContext.fred}`);
    }

    // Get market indicators for trading context
    const marketIndicators = await govDataflow.getMarketIndicators();
    if (marketIndicators) {
      console.log('\nKey Market Indicators:');
      Object.entries(marketIndicators).slice(0, 5).forEach(([indicator, data]) => {
        console.log(`- ${indicator}: ${data.current} (${data.date})`);
      });
    }

    return {
      company: companyProfile,
      economic: economicContext,
      indicators: marketIndicators
    };

  } catch (error) {
    console.error('Enhanced fundamental analysis failed:', error);
    return null;
  }
}

/**
 * Example: Economic indicator alerts for strategy development
 */
export async function economicIndicatorAlerts() {
  console.log('\n=== Economic Indicator Alerts ===');
  
  try {
    const indicators = await govDataflow.getEconomicIndicators();
    if (!indicators) {
      console.log('No economic indicators available');
      return;
    }

    // Check FRED indicators for significant changes
    if (indicators.fred) {
      console.log('\nFRED Indicators:');
      Object.entries(indicators.fred).forEach(([seriesId, data]) => {
        if (data.change !== undefined && Math.abs(data.change) > 0.1) {
          const direction = data.change > 0 ? '↑' : '↓';
          console.log(`🚨 ${seriesId}: ${data.current} ${direction} ${Math.abs(data.change).toFixed(2)}`);
        }
      });
    }

    // Check BLS indicators
    if (indicators.bls) {
      console.log('\nBLS Labor Market Indicators:');
      if (indicators.bls.unemployment) {
        console.log(`- Unemployment Rate: Latest data available`);
      }
      if (indicators.bls.cpi) {
        console.log(`- Consumer Price Index: Latest data available`);
      }
    }

  } catch (error) {
    console.error('Economic indicator alerts failed:', error);
  }
}

/**
 * Example: Cross-source correlation analysis for market research
 */
export async function crossSourceCorrelationAnalysis() {
  console.log('\n=== Cross-Source Correlation Analysis ===');
  
  try {
    const correlation = await govDataflow.getCorrelationAnalysis();
    if (!correlation) {
      console.log('No correlation data available');
      return;
    }

    console.log('Correlation Analysis Results:');
    
    if (correlation.economic) {
      console.log('- Economic data: Available');
    }
    
    if (correlation.demographic) {
      console.log('- Demographic data: Available');
    }
    
    if (correlation.labor) {
      console.log('- Labor market data: Available');
    }
    
    if (correlation.correlation) {
      console.log('- Cross-correlation analysis: Completed');
    }

  } catch (error) {
    console.error('Correlation analysis failed:', error);
  }
}

/**
 * Example: SEC filings analysis for strategy development
 */
export async function secFilingsAnalysis(ticker: string) {
  console.log(`\n=== SEC Filings Analysis for ${ticker} ===`);
  
  try {
    // Get recent 10-K and 10-Q filings
    const filings = await govDataflow.getSECFilings(ticker, {
      count: 5,
      type: '10-K'
    });

    if (!filings || filings.length === 0) {
      console.log(`No SEC filings found for ${ticker}`);
      return;
    }

    console.log(`Found ${filings.length} recent 10-K filings:`);
    filings.forEach((filing, index) => {
      console.log(`${index + 1}. ${filing.form} - ${filing.filingDate} (${filing.reportDate})`);
    });

    // This could be enhanced with:
    // - Filing content analysis
    // - Financial metrics extraction
    // - Trend analysis across filings
    // - Risk factor identification

  } catch (error) {
    console.error('SEC filings analysis failed:', error);
  }
}

/**
 * Example: Demographic market research
 */
export async function demographicMarketResearch() {
  console.log('\n=== Demographic Market Research ===');
  
  try {
    const demographic = await govDataflow.getDemographicData();
    if (!demographic) {
      console.log('No demographic data available');
      return;
    }

    if (demographic.states) {
      console.log(`State-level demographic data: ${demographic.states.length} states`);
      
      // Example: Find states with highest median income
      const topStates = demographic.states
        .filter(state => state.B19013_001E && state.B19013_001E > 0)
        .sort((a, b) => b.B19013_001E - a.B19013_001E)
        .slice(0, 5);

      console.log('\nTop 5 States by Median Household Income:');
      topStates.forEach((state, index) => {
        console.log(`${index + 1}. ${state.NAME}: $${state.B19013_001E?.toLocaleString()}`);
      });
    }

    if (demographic.correlation) {
      console.log('\nDemographic correlation analysis completed');
    }

  } catch (error) {
    console.error('Demographic market research failed:', error);
  }
}

/**
 * Main example runner
 */
export async function runGovernmentDataExamples() {
  console.log('🏛️  Government Data Integration Examples');
  console.log('=========================================');

  // Example 1: Enhanced fundamental analysis
  await enhancedFundamentalAnalysis('AAPL');

  // Example 2: Economic indicator alerts
  await economicIndicatorAlerts();

  // Example 3: Cross-source correlation analysis
  await crossSourceCorrelationAnalysis();

  // Example 4: SEC filings analysis
  await secFilingsAnalysis('MSFT');

  // Example 5: Demographic market research
  await demographicMarketResearch();

  console.log('\n✅ Government data integration examples completed');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runGovernmentDataExamples().catch(console.error);
}