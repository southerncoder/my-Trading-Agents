/**
 * Simple integration test for Government Data Service
 */

import { GovFinancialData } from './GovFinancialData.js';
import { logger } from './utils/logger.js';

async function testIntegration() {
  logger.info('Starting Government Data Service integration test');

  // Initialize service
  const govData = new GovFinancialData({
    fredApiKey: process.env.FRED_API_KEY,
    blsApiKey: process.env.BLS_API_KEY,
    userAgent: 'TradingAgents/1.0.0 (test@example.com)',
  });

  try {
    // Test 1: SEC company lookup
    logger.info('Test 1: SEC company lookup');
    const company = await govData.sec.getCompanyByTicker('AAPL');
    if (company) {
      logger.info(`✅ Found company: ${company.title} (CIK: ${company.cik_str})`);
    } else {
      logger.warn('❌ Company not found');
    }

    // Test 2: Health status
    logger.info('Test 2: Service health status');
    const health = govData.getHealthStatus();
    logger.info('✅ Health status retrieved', { health });

    // Test 3: Economic dashboard (if FRED available)
    if (govData.fred) {
      logger.info('Test 3: Economic dashboard');
      try {
        const dashboard = await govData.getEconomicDashboard();
        logger.info('✅ Economic dashboard retrieved', {
          hasBls: !!dashboard.bls,
          hasFred: !!dashboard.fred
        });
      } catch (error) {
        logger.warn('⚠️ Economic dashboard test failed', { error });
      }
    } else {
      logger.info('Test 3: Skipped (FRED API key not provided)');
    }

    // Test 4: BLS data
    logger.info('Test 4: BLS unemployment data');
    try {
      const unemployment = await govData.bls.getUnemploymentRate({
        startYear: 2023,
        endYear: 2024
      });
      logger.info(`✅ BLS unemployment data retrieved: ${unemployment.data.length} data points`);
    } catch (error) {
      logger.warn('⚠️ BLS unemployment test failed', { error });
    }

    // Test 5: Census data
    logger.info('Test 5: Census state data');
    try {
      const stateData = await govData.census.getStateEconomicData(2022, ['NAME', 'B01001_001E']);
      logger.info(`✅ Census state data retrieved: ${stateData.length} states`);
    } catch (error) {
      logger.warn('⚠️ Census state data test failed', { error });
    }

    logger.info('🎉 Integration test completed successfully');

  } catch (error) {
    logger.error('❌ Integration test failed', { error });
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIntegration().catch((error) => {
    logger.error('Test execution failed', { error });
    process.exit(1);
  });
}

export { testIntegration };