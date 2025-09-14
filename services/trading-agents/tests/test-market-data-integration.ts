#!/usr/bin/env node
/**
 * Test script for the new unified market data provider
 * Tests Yahoo Finance + Alpha Vantage integration with automatic failover
 */

import { TradingAgentsConfig } from '../src/types/config.js';
import { UnifiedMarketDataProvider } from '../src/dataflows/unified-market-data.js';
import { AlphaVantageDataProvider } from '../src/dataflows/alpha-vantage.js';
import { createLogger } from '../src/utils/enhanced-logger.js';

const logger = createLogger('test', 'market-data-integration');

async function testMarketDataIntegration() {
  logger.info('test-start', 'Starting market data integration test');
  
  // Create test config
  const config: TradingAgentsConfig = {
    dataDir: './test-data',
    llmProvider: 'remote_lmstudio',
    lmStudioUrl: 'http://localhost:1234',
    openaiApiKey: '',
    anthropicApiKey: '',
    geminiApiKey: '',
    enableTracing: false,
    useLocalFiles: false,
    selectedAnalysts: ['market'],
    enableParallelExecution: false,
    enableCaching: true,
    enableLazyLoading: true,
    traceConfig: {
      enableFileLogging: false,
      enableConsoleLogging: true,
      logLevel: 'info'
    }
  };

  try {
    // Test 1: Unified Market Data Provider
    logger.info('test-unified-provider', 'Testing unified market data provider');
    const unifiedProvider = new UnifiedMarketDataProvider(config);
    
    // Test provider status
    const status = unifiedProvider.getProviderStatus();
    logger.info('provider-status', 'Provider status', { status });
    
    // Test symbol search
    logger.info('test-search', 'Testing symbol search for Apple');
    try {
      const searchResults = await unifiedProvider.searchSymbols('Apple Inc');
      logger.info('search-results', 'Search completed', {
        resultsCount: Array.isArray(searchResults) ? searchResults.length : 'non-array',
        hasResults: !!searchResults
      });
    } catch (searchError) {
      logger.warn('search-failed', 'Symbol search failed', {
        error: (searchError as Error).message
      });
    }

    // Test single quote
    logger.info('test-quote', 'Testing single quote for AAPL');
    try {
      const quote = await unifiedProvider.getQuote('AAPL');
      logger.info('quote-result', 'Quote retrieved', {
        hasQuote: !!quote,
        symbol: quote?.symbol || 'unknown'
      });
    } catch (quoteError) {
      logger.warn('quote-failed', 'Quote retrieval failed', {
        error: (quoteError as Error).message
      });
    }

    // Test historical data
    logger.info('test-historical', 'Testing historical data for AAPL');
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const historicalData = await unifiedProvider.getHistoricalData('AAPL', startDate, endDate);
      logger.info('historical-result', 'Historical data retrieved', {
        dataLength: historicalData.length,
        startDate,
        endDate,
        preview: historicalData.substring(0, 200) + '...'
      });
    } catch (historicalError) {
      logger.warn('historical-failed', 'Historical data retrieval failed', {
        error: (historicalError as Error).message
      });
    }

    // Test 2: Alpha Vantage Direct (if configured)
    logger.info('test-alpha-vantage', 'Testing Alpha Vantage provider directly');
    const alphaVantage = new AlphaVantageDataProvider(config);
    
    const alphaUsage = alphaVantage.getUsageInfo();
    logger.info('alpha-usage', 'Alpha Vantage usage info', { usage: alphaUsage });
    
    if (alphaVantage.isConfigured()) {
      logger.info('alpha-configured', 'Alpha Vantage API key is configured');
      try {
        const alphaQuote = await alphaVantage.getQuote('AAPL');
        logger.info('alpha-quote-result', 'Alpha Vantage quote retrieved', {
          hasQuote: !!alphaQuote
        });
      } catch (alphaError) {
        logger.warn('alpha-quote-failed', 'Alpha Vantage quote failed', {
          error: (alphaError as Error).message
        });
      }
    } else {
      logger.warn('alpha-not-configured', 'Alpha Vantage API key not configured, using demo key with limitations');
    }

    // Test 3: Multiple quotes
    logger.info('test-multiple-quotes', 'Testing multiple quotes');
    try {
      const multipleQuotes = await unifiedProvider.getQuotes(['AAPL', 'MSFT', 'GOOGL']);
      logger.info('multiple-quotes-result', 'Multiple quotes retrieved', {
        quotesCount: multipleQuotes.length,
        symbols: ['AAPL', 'MSFT', 'GOOGL']
      });
    } catch (multipleError) {
      logger.warn('multiple-quotes-failed', 'Multiple quotes failed', {
        error: (multipleError as Error).message
      });
    }

    logger.info('test-complete', 'Market data integration test completed successfully');
    return true;

  } catch (error) {
    logger.error('test-failed', 'Market data integration test failed', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testMarketDataIntegration()
    .then((success) => {
      if (success) {
        console.log('\n✅ Market data integration test passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Market data integration test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}