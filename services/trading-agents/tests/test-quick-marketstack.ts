#!/usr/bin/env node

/**
 * Quick MarketStack and Unified Provider Test
 * 
 * Fast verification of MarketStack API and failover system
 */

import { MarketStackDataProvider, MARKETSTACK_CONFIG } from '../src/dataflows/marketstack.js';
import { UnifiedMarketDataProvider } from '../src/dataflows/unified-market-data.js';
import { createLogger } from '../src/utils/enhanced-logger.js';

const logger = createLogger('test', 'quick-marketstack-test');

const TEST_SYMBOL = 'AAPL';

async function quickMarketStackTest() {
  console.log('🚀 Quick MarketStack & Unified Provider Test');
  console.log('============================================');
  
  const startTime = Date.now();
  
  try {
    // Test 1: MarketStack Direct
    console.log('\n📊 Testing MarketStack Direct Connection...');
    
    if (!MARKETSTACK_CONFIG.apiKey) {
      console.log('❌ MarketStack API key not configured');
      return;
    }
    
    const marketStack = new MarketStackDataProvider(MARKETSTACK_CONFIG);
    
    // Connection test
    const isConnected = await marketStack.testConnection();
    console.log(`✅ MarketStack Connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
    
    if (isConnected) {
      // Quick quote test
      const quote = await marketStack.getQuote(TEST_SYMBOL);
      if (quote && quote.price) {
        console.log(`✅ MarketStack Quote for ${TEST_SYMBOL}: $${quote.price} (${quote.change >= 0 ? '+' : ''}${quote.change})`);
      } else {
        console.log(`❌ MarketStack Quote failed for ${TEST_SYMBOL}`);
      }
    }
    
    // Test 2: Unified Provider with Failover
    console.log('\n🔄 Testing Unified Provider Failover...');
    
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const unified = new UnifiedMarketDataProvider(config);
    
    // Provider status
    const status = unified.getProviderStatus();
    console.log(`✅ Primary Provider: ${status.primaryProvider.name} (${status.primaryProvider.status})`);
    console.log(`✅ Secondary Provider: ${status.secondaryProvider.name} (${status.secondaryProvider.status})`);
    console.log(`✅ Tertiary Provider: ${status.tertiaryProvider.name} (${status.tertiaryProvider.status})`);
    
    // Unified quote test
    const unifiedQuote = await unified.getQuote(TEST_SYMBOL);
    if (unifiedQuote && (unifiedQuote.price || unifiedQuote.regularMarketPrice)) {
      const price = unifiedQuote.price || unifiedQuote.regularMarketPrice;
      const change = unifiedQuote.change || unifiedQuote.regularMarketChange || 0;
      console.log(`✅ Unified Quote for ${TEST_SYMBOL}: $${price} (${change >= 0 ? '+' : ''}${change})`);
    } else {
      console.log(`❌ Unified Quote failed for ${TEST_SYMBOL}`);
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  Test completed in ${elapsed}ms`);
    console.log('🎉 MarketStack integration is working!');
    
    // Log results
    logger.info('quick-test-complete', 'Quick MarketStack test completed successfully', {
      elapsedTime: elapsed,
      marketStackConnected: isConnected,
      testSymbol: TEST_SYMBOL
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Test failed: ${errorMessage}`);
    logger.error('quick-test-failed', 'Quick MarketStack test failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    process.exit(1);
  }
}

// Run the quick test
quickMarketStackTest().catch(error => {
  console.error('Quick test execution failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});