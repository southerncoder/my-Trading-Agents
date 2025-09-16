#!/usr/bin/env node

/**
 * Comprehensive Data Provider API Test Suite
 * 
 * Tests all integrated data providers in the TradingAgents system:
 * 1. Yahoo Finance (primary)
 * 2. Alpha Vantage (secondary) 
 * 3. MarketStack (tertiary)
 * 4. Google News
 * 5. Reddit Social Sentiment
 * 6. Unified Market Data Provider
 */

import { YahooFinanceAPI } from '../src/dataflows/yahoo-finance.js';
import { AlphaVantageDataProvider } from '../src/dataflows/alpha-vantage.js';
import { MarketStackDataProvider, MARKETSTACK_CONFIG } from '../src/dataflows/marketstack.js';
import { UnifiedMarketDataProvider } from '../src/dataflows/unified-market-data.js';
import { GoogleNewsAPI } from '../src/dataflows/google-news.js';
import { RedditAPI } from '../src/dataflows/reddit.js';
import { createLogger } from '../src/utils/enhanced-logger.js';

const logger = createLogger('test', 'comprehensive-api-test');

// Test configuration
const TEST_SYMBOL = 'AAPL';
const TEST_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT'];
const TEST_START_DATE = '2024-08-01';
const TEST_END_DATE = '2024-09-01';
const TEST_NEWS_QUERY = 'Apple earnings';
const TEST_REDDIT_SYMBOLS = ['AAPL'];

// Types
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  data?: Record<string, unknown> | null;
  timestamp: string;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  details: TestResult[];
}

const testResults: TestResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logTest(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, data?: Record<string, unknown> | null): void {
  testResults.total++;
  const result: TestResult = { name, status, message, data, timestamp: new Date().toISOString() };
  testResults.details.push(result);
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else if (status === 'FAIL') {
    testResults.failed++;
    console.log(`❌ ${name}: ${message}`);
  } else if (status === 'WARN') {
    testResults.warnings++;
    console.log(`⚠️  ${name}: ${message}`);
  }
  
  if (data && Object.keys(data).length > 0) {
    console.log(`   ${JSON.stringify(data, null, 2).split('\n').slice(1, -1).join('\n   ')}`);
  }
}

// Error handler helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function testYahooFinance() {
  console.log('\n📊 Testing Yahoo Finance API');
  console.log('============================');
  
  try {
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const yahoo = new YahooFinanceAPI(config);
    
    // Test 1: Single quote
    try {
      const quote = await yahoo.getQuote(TEST_SYMBOL);
      if (quote && (quote.regularMarketPrice || quote.price)) {
        logTest('Yahoo Finance Quote', 'PASS', `Retrieved quote for ${TEST_SYMBOL}`, {
          price: quote.regularMarketPrice || quote.price,
          change: quote.regularMarketChange,
          symbol: quote.symbol
        });
      } else {
        logTest('Yahoo Finance Quote', 'FAIL', 'Quote data incomplete or missing');
      }
    } catch (error) {
      logTest('Yahoo Finance Quote', 'FAIL', `Quote failed: ${getErrorMessage(error)}`);
    }
    
    // Test 2: Multiple quotes
    try {
      const quotes = await yahoo.getQuotes(TEST_SYMBOLS);
      if (quotes && quotes.length > 0) {
        logTest('Yahoo Finance Quotes', 'PASS', `Retrieved ${quotes.length} quotes`, {
          symbols: quotes.map(q => q.symbol || 'unknown'),
          count: quotes.length
        });
      } else {
        logTest('Yahoo Finance Quotes', 'FAIL', 'No quotes returned');
      }
    } catch (error) {
      logTest('Yahoo Finance Quotes', 'FAIL', `Quotes failed: ${getErrorMessage(error)}`);
    }
    
    // Test 3: Historical data
    try {
      const historical = await yahoo.getData(TEST_SYMBOL, TEST_START_DATE, TEST_END_DATE, true);
      if (historical && historical.length > 100) {
        const lines = historical.split('\n');
        logTest('Yahoo Finance Historical', 'PASS', `Retrieved historical data for ${TEST_SYMBOL}`, {
          dataLength: historical.length,
          lines: lines.length - 1, // minus header
          sample: lines[1]?.substring(0, 50) + '...'
        });
      } else {
        logTest('Yahoo Finance Historical', 'FAIL', 'Historical data insufficient or missing');
      }
    } catch (error) {
      logTest('Yahoo Finance Historical', 'FAIL', `Historical data failed: ${getErrorMessage(error)}`);
    }
    
    // Test 4: Metrics
    const metrics = yahoo.getMetrics();
    logTest('Yahoo Finance Metrics', 'PASS', 'Metrics retrieved', {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      averageResponseTime: metrics.averageResponseTime
    });
    
  } catch (error) {
    logTest('Yahoo Finance Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function testAlphaVantage() {
  console.log('\n📈 Testing Alpha Vantage API');
  console.log('============================');
  
  try {
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const alphaVantage = new AlphaVantageDataProvider(config);
    
    // Test configuration
    const isConfigured = alphaVantage.isConfigured();
    if (isConfigured) {
      logTest('Alpha Vantage Config', 'PASS', 'API key configured');
    } else {
      logTest('Alpha Vantage Config', 'WARN', 'Using demo key with rate limits');
    }
    
    // Test 1: Daily data
    try {
      const dailyData = await alphaVantage.getDailyData(TEST_SYMBOL);
      if (dailyData && Object.keys(dailyData).length > 0) {
        const dataKeys = Object.keys(dailyData);
        logTest('Alpha Vantage Daily', 'PASS', `Retrieved daily data for ${TEST_SYMBOL}`, {
          recordCount: dataKeys.length,
          latestDate: dataKeys[0],
          sampleData: dailyData[dataKeys[0]]
        });
      } else {
        logTest('Alpha Vantage Daily', 'FAIL', 'No daily data returned');
      }
    } catch (error) {
      logTest('Alpha Vantage Daily', 'FAIL', `Daily data failed: ${getErrorMessage(error)}`);
    }
    
    // Test 2: Quote
    try {
      const quote = await alphaVantage.getQuote(TEST_SYMBOL);
      if (quote && quote.price) {
        logTest('Alpha Vantage Quote', 'PASS', `Retrieved quote for ${TEST_SYMBOL}`, {
          price: quote.price,
          symbol: quote.symbol,
          change: quote.change
        });
      } else {
        logTest('Alpha Vantage Quote', 'FAIL', 'Quote data incomplete');
      }
    } catch (error) {
      logTest('Alpha Vantage Quote', 'FAIL', `Quote failed: ${getErrorMessage(error)}`);
    }
    
    // Test 3: Usage info
    const usage = alphaVantage.getUsageInfo();
    logTest('Alpha Vantage Usage', 'PASS', 'Usage info retrieved', {
      plan: usage.plan,
      callsPerDay: usage.callsPerDay,
      callsPerMinute: usage.callsPerMinute
    });
    
  } catch (error) {
    logTest('Alpha Vantage Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function testMarketStack() {
  console.log('\n📊 Testing MarketStack API');
  console.log('==========================');
  
  try {
    if (!MARKETSTACK_CONFIG.apiKey) {
      logTest('MarketStack Config', 'WARN', 'API key not configured');
      return;
    }
    
    const marketStack = new MarketStackDataProvider(MARKETSTACK_CONFIG);
    
    // Test 1: Connection
    try {
      const isConnected = await marketStack.testConnection();
      if (isConnected) {
        logTest('MarketStack Connection', 'PASS', 'API connection successful');
      } else {
        logTest('MarketStack Connection', 'FAIL', 'API connection failed');
        return;
      }
    } catch (error) {
      logTest('MarketStack Connection', 'FAIL', `Connection failed: ${getErrorMessage(error)}`);
      return;
    }
    
    // Test 2: Quote
    try {
      const quote = await marketStack.getQuote(TEST_SYMBOL);
      if (quote && quote.price) {
        logTest('MarketStack Quote', 'PASS', `Retrieved quote for ${TEST_SYMBOL}`, {
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume
        });
      } else {
        logTest('MarketStack Quote', 'FAIL', 'Quote data incomplete');
      }
    } catch (error) {
      logTest('MarketStack Quote', 'FAIL', `Quote failed: ${getErrorMessage(error)}`);
    }
    
    // Test 3: End-of-day data
    try {
      const eodData = await marketStack.getEndOfDayData(TEST_SYMBOL, { limit: 5 });
      if (eodData && eodData.length > 0) {
        logTest('MarketStack EOD', 'PASS', `Retrieved ${eodData.length} EOD records`, {
          recordCount: eodData.length,
          latestDate: eodData[0]?.date,
          latestClose: eodData[0]?.close
        });
      } else {
        logTest('MarketStack EOD', 'FAIL', 'No EOD data returned');
      }
    } catch (error) {
      logTest('MarketStack EOD', 'FAIL', `EOD data failed: ${getErrorMessage(error)}`);
    }
    
    // Test 4: Symbol search
    try {
      const searchResults = await marketStack.searchSymbols('Apple', { limit: 3 });
      if (searchResults && searchResults.length > 0) {
        logTest('MarketStack Search', 'PASS', `Found ${searchResults.length} symbols for "Apple"`, {
          results: searchResults.map(r => ({ symbol: r.symbol, name: r.name }))
        });
      } else {
        logTest('MarketStack Search', 'FAIL', 'No search results returned');
      }
    } catch (error) {
      logTest('MarketStack Search', 'FAIL', `Search failed: ${getErrorMessage(error)}`);
    }
    
    // Test 5: Provider info
    const providerInfo = marketStack.getProviderInfo();
    logTest('MarketStack Info', 'PASS', 'Provider info retrieved', {
      name: providerInfo.name,
      rateLimit: providerInfo.rateLimit,
      featureCount: providerInfo.features.length
    });
    
  } catch (error) {
    logTest('MarketStack Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function testUnifiedProvider() {
  console.log('\n🔄 Testing Unified Market Data Provider');
  console.log('=======================================');
  
  try {
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const unified = new UnifiedMarketDataProvider(config);
    
    // Test 1: Provider status
    const status = unified.getProviderStatus();
    logTest('Unified Provider Status', 'PASS', 'Provider status retrieved', {
      primary: status.primaryProvider.name,
      secondary: status.secondaryProvider.name,
      tertiary: status.tertiaryProvider.name,
      primaryStatus: status.primaryProvider.status,
      secondaryStatus: status.secondaryProvider.status,
      tertiaryStatus: status.tertiaryProvider.status
    });
    
    // Test 2: Quote with failover
    try {
      const quote = await unified.getQuote(TEST_SYMBOL);
      if (quote && (quote.price || quote.regularMarketPrice)) {
        logTest('Unified Quote', 'PASS', `Retrieved quote for ${TEST_SYMBOL} via failover system`, {
          price: quote.price || quote.regularMarketPrice,
          symbol: quote.symbol,
          hasChange: !!(quote.change || quote.regularMarketChange)
        });
      } else {
        logTest('Unified Quote', 'FAIL', 'Quote data incomplete from all providers');
      }
    } catch (error) {
      logTest('Unified Quote', 'FAIL', `All providers failed: ${getErrorMessage(error)}`);
    }
    
    // Test 3: Historical data with failover
    try {
      const historical = await unified.getHistoricalData(TEST_SYMBOL, TEST_START_DATE, TEST_END_DATE);
      if (historical && historical.length > 100) {
        logTest('Unified Historical', 'PASS', `Retrieved historical data via failover system`, {
          dataLength: historical.length,
          lines: historical.split('\n').length - 1
        });
      } else {
        logTest('Unified Historical', 'FAIL', 'Historical data insufficient from all providers');
      }
    } catch (error) {
      logTest('Unified Historical', 'FAIL', `All providers failed: ${getErrorMessage(error)}`);
    }
    
  } catch (error) {
    logTest('Unified Provider Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function testGoogleNews() {
  console.log('\n📰 Testing Google News API');
  console.log('==========================');
  
  try {
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const googleNews = new GoogleNewsAPI(config);
    
    // Test news retrieval
    try {
      const news = await googleNews.getNews(TEST_NEWS_QUERY, 'en', 5);
      if (news && news.length > 0) {
        logTest('Google News', 'PASS', `Retrieved ${news.length} news articles`, {
          articleCount: news.length,
          sampleTitle: typeof news[0] === 'string' ? news[0].substring(0, 50) + '...' : 'Complex object',
          hasContent: news.length > 0
        });
      } else {
        logTest('Google News', 'WARN', 'No news articles returned (may need API key)');
      }
    } catch (error) {
      logTest('Google News', 'WARN', `News retrieval limited: ${getErrorMessage(error)}`);
    }
    
  } catch (error) {
    logTest('Google News Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function testRedditAPI() {
  console.log('\n🗣️  Testing Reddit API');
  console.log('======================');
  
  try {
    const config = { llmProvider: 'remote_lmstudio', selectedAnalysts: ['market'], enableLangGraph: false };
    const reddit = new RedditAPI(config);
    
    // Check configuration
    const hasCredentials = process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET;
    if (!hasCredentials) {
      logTest('Reddit Config', 'WARN', 'Reddit credentials not configured');
    } else {
      logTest('Reddit Config', 'PASS', 'Reddit credentials configured');
    }
    
    // Test posts retrieval
    try {
      const posts = await reddit.getPosts(TEST_REDDIT_SYMBOLS);
      if (posts && posts.length > 0) {
        logTest('Reddit Posts', 'PASS', `Retrieved ${posts.length} posts`, {
          postCount: posts.length,
          sampleTitle: posts[0]?.title?.substring(0, 50) + '...',
          hasContent: !!posts[0]?.content
        });
      } else {
        logTest('Reddit Posts', 'WARN', 'No Reddit posts returned (may need credentials)');
      }
    } catch (error) {
      logTest('Reddit Posts', 'WARN', `Reddit access limited: ${getErrorMessage(error)}`);
    }
    
  } catch (error) {
    logTest('Reddit Setup', 'FAIL', `Failed to initialize: ${getErrorMessage(error)}`);
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Comprehensive Data Provider API Test Suite');
  console.log('==============================================');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🎯 Test Symbol: ${TEST_SYMBOL}`);
  console.log(`📊 Test Symbols: ${TEST_SYMBOLS.join(', ')}`);
  console.log(`📈 Date Range: ${TEST_START_DATE} to ${TEST_END_DATE}`);
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testYahooFinance();
    await testAlphaVantage();
    await testMarketStack();
    await testUnifiedProvider();
    await testGoogleNews();
    await testRedditAPI();
    
    const elapsed = Date.now() - startTime;
    
    // Final summary
    console.log('\n🎉 Test Suite Complete!');
    console.log('========================');
    console.log(`⏱️  Total Time: ${elapsed}ms`);
    console.log(`📊 Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
    }
    
    if (testResults.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      testResults.details
        .filter(test => test.status === 'WARN')
        .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
    }
    
    // Configuration recommendations
    console.log('\n💡 Configuration Recommendations:');
    
    const alphaVantageConfigured = process.env.ALPHA_VANTAGE_API_KEY;
    const redditConfigured = process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET;
    const newsConfigured = process.env.NEWS_API_KEY;
    
    if (!alphaVantageConfigured) {
      console.log('   📈 Get Alpha Vantage API key for enhanced data: https://www.alphavantage.co/support/#api-key');
    }
    if (!redditConfigured) {
      console.log('   🗣️  Configure Reddit API for social sentiment: https://www.reddit.com/prefs/apps');
    }
    if (!newsConfigured) {
      console.log('   📰 Get News API key for enhanced news: https://newsapi.org/');
    }
    
    console.log('\n🚀 Ready for Enhanced Breakout Strategy Implementation!');
    
    // Log comprehensive results
    logger.info('comprehensive-test-complete', 'Comprehensive API test suite completed', {
      totalTests: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: parseFloat(successRate),
      elapsedTime: elapsed,
      testedAPIs: [
        'Yahoo Finance',
        'Alpha Vantage', 
        'MarketStack',
        'Unified Provider',
        'Google News',
        'Reddit'
      ]
    });
    
  } catch (error) {
    console.log(`\n❌ Test suite failed: ${getErrorMessage(error)}`);
    logger.error('comprehensive-test-failed', 'Comprehensive test suite failed', {
      error: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('Test execution failed:', getErrorMessage(error));
  process.exit(1);
});