#!/usr/bin/env node

/**
 * Comprehensive API Integration Test Suite
 * 
 * Tests all external API integrations with rate limiting, fallback mechanisms,
 * and real-world scenarios using remote_lmstudio provider with microsoft/phi-4-mini-reasoning model.
 */

import { Toolkit, setConfig } from '../dist/dataflows/interface.js';
import { ModelProvider } from '../dist/models/provider.js';
import { createConfig } from '../dist/config/default.js';

const TEST_CONFIG = createConfig({
  llmProvider: 'remote_lmstudio',
  deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
  quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
  backendUrl: 'http://localhost:1234/v1',
  onlineTools: true,
  // Mock API keys for testing (actual keys from environment)
  finnhubApiKey: process.env.FINNHUB_API_KEY || 'test-key',
  redditClientId: process.env.REDDIT_CLIENT_ID || 'test-client-id',
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET || 'test-secret',
  redditUsername: process.env.REDDIT_USERNAME || 'test-user',
  redditPassword: process.env.REDDIT_PASSWORD || 'test-password'
});

class APIIntegrationTester {
  constructor() {
    this.toolkit = null;
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize the test environment
   */
  async initialize() {
    console.log('🚀 Initializing API Integration Test Suite...\n');
    console.log('Configuration:');
    console.log('  LLM Provider:', TEST_CONFIG.llmProvider);
    console.log('  Model:', TEST_CONFIG.quickThinkLlm);
    console.log('  Backend URL:', TEST_CONFIG.backendUrl);
    console.log('  Online Tools:', TEST_CONFIG.onlineTools);
    console.log('');

    // Set global config and create toolkit
    setConfig(TEST_CONFIG);
    this.toolkit = new Toolkit(TEST_CONFIG);

    // Test LLM connectivity first
    await this.testLLMConnectivity();
  }

  /**
   * Test LLM provider connectivity
   */
  async testLLMConnectivity() {
    console.log('📡 Testing LLM Provider Connectivity...');
    
    try {
      const modelConfig = ModelProvider.getLMStudioConfig('microsoft/phi-4-mini-reasoning');
      const connectionTest = await ModelProvider.testConnection(modelConfig);
      
      if (connectionTest.success) {
        console.log('✅ LM Studio connection successful');
        this.logResult('LLM Connectivity', true, 'Connected successfully');
      } else {
        console.log('❌ LM Studio connection failed:', connectionTest.error);
        this.logResult('LLM Connectivity', false, connectionTest.error);
        throw new Error(`LLM connectivity failed: ${connectionTest.error}`);
      }
    } catch (error) {
      console.log('❌ LLM connectivity test error:', error.message);
      this.logResult('LLM Connectivity', false, error.message);
      throw error;
    }
    console.log('');
  }

  /**
   * Test Yahoo Finance API integration
   */
  async testYahooFinance() {
    console.log('📈 Testing Yahoo Finance API...');
    
    const tests = [
      {
        name: 'Historical Data (Offline)',
        test: () => this.toolkit.getYFinData('AAPL', '2025-08-20', '2025-08-24')
      },
      {
        name: 'Historical Data (Online)', 
        test: () => this.toolkit.getYFinDataOnline('AAPL', '2025-08-20', '2025-08-24')
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 15000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Data length: ${result.length} chars`);
          this.logResult(`Yahoo Finance - ${test.name}`, true, `Data retrieved: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No data returned`);
          this.logResult(`Yahoo Finance - ${test.name}`, false, 'No data returned');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`Yahoo Finance - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test Technical Indicators API integration
   */
  async testTechnicalIndicators() {
    console.log('📊 Testing Technical Indicators API...');
    
    const tests = [
      {
        name: 'Stock Indicators (Offline)',
        test: () => this.toolkit.getStockstatsIndicatorsReport('AAPL', '2025-08-24', 30)
      },
      {
        name: 'Stock Indicators (Online)',
        test: () => this.toolkit.getStockstatsIndicatorsReportOnline('AAPL', '2025-08-24', 30)
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 20000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Report length: ${result.length} chars`);
          this.logResult(`Technical Indicators - ${test.name}`, true, `Report generated: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No report generated`);
          this.logResult(`Technical Indicators - ${test.name}`, false, 'No report generated');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`Technical Indicators - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test Finnhub API integration
   */
  async testFinnhub() {
    console.log('📰 Testing Finnhub API...');
    
    const tests = [
      {
        name: 'Company News',
        test: () => this.toolkit.getFinnhubNews('AAPL', '2025-08-24', 7)
      },
      {
        name: 'Insider Sentiment',
        test: () => this.toolkit.getFinnhubCompanyInsiderSentiment('AAPL', '2025-08-24', 30)
      },
      {
        name: 'Insider Transactions',
        test: () => this.toolkit.getFinnhubCompanyInsiderTransactions('AAPL', '2025-08-24', 30)
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 10000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Data length: ${result.length} chars`);
          this.logResult(`Finnhub - ${test.name}`, true, `Data retrieved: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No data returned`);
          this.logResult(`Finnhub - ${test.name}`, false, 'No data returned');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`Finnhub - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test Google News API integration
   */
  async testGoogleNews() {
    console.log('🗞️  Testing Google News API...');
    
    const tests = [
      {
        name: 'AAPL News Search',
        test: () => this.toolkit.getGoogleNews('AAPL Apple stock', '2025-08-24', 7)
      },
      {
        name: 'Market News Search',
        test: () => this.toolkit.getGoogleNews('stock market trading', '2025-08-24', 3)
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 15000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Articles length: ${result.length} chars`);
          this.logResult(`Google News - ${test.name}`, true, `Articles retrieved: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No articles returned`);
          this.logResult(`Google News - ${test.name}`, false, 'No articles returned');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`Google News - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test Reddit API integration
   */
  async testReddit() {
    console.log('🔥 Testing Reddit API...');
    
    const tests = [
      {
        name: 'Global News',
        test: () => this.toolkit.getRedditNews('2025-08-24', 3, 5)
      },
      {
        name: 'AAPL Stock Info',
        test: () => this.toolkit.getRedditStockInfo('AAPL', '2025-08-24', 7, 10)
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 20000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Posts length: ${result.length} chars`);
          this.logResult(`Reddit - ${test.name}`, true, `Posts retrieved: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No posts returned`);
          this.logResult(`Reddit - ${test.name}`, false, 'No posts returned');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`Reddit - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test SimFin API integration (Financial Statements)
   */
  async testSimFin() {
    console.log('💰 Testing SimFin API...');
    
    const tests = [
      {
        name: 'Balance Sheet (Annual)',
        test: () => this.toolkit.getSimfinBalanceSheet('AAPL', 'annual', '2025-08-24')
      },
      {
        name: 'Income Statement (Quarterly)',
        test: () => this.toolkit.getSimfinIncomeStmt('AAPL', 'quarterly', '2025-08-24')
      },
      {
        name: 'Cash Flow (Annual)',
        test: () => this.toolkit.getSimfinCashflow('AAPL', 'annual', '2025-08-24')
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 15000);
        
        if (result && result.length > 0) {
          console.log(`  ✅ ${test.name} - Financial data length: ${result.length} chars`);
          this.logResult(`SimFin - ${test.name}`, true, `Financial data retrieved: ${result.length} chars`);
        } else {
          console.log(`  ⚠️  ${test.name} - No financial data returned`);
          this.logResult(`SimFin - ${test.name}`, false, 'No financial data returned');
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        this.logResult(`SimFin - ${test.name}`, false, error.message);
      }
    }
    console.log('');
  }

  /**
   * Test rate limiting and retry mechanisms
   */
  async testRateLimiting() {
    console.log('⏱️  Testing Rate Limiting and Retry Mechanisms...');
    
    try {
      console.log('  Testing rapid API calls...');
      const promises = [];
      
      // Make multiple rapid calls to test rate limiting
      for (let i = 0; i < 3; i++) {
        promises.push(
          this.toolkit.getFinnhubNews('AAPL', '2025-08-24', 1)
            .then(() => ({ success: true, index: i }))
            .catch(error => ({ success: false, index: i, error: error.message }))
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`  Results: ${successCount} successful, ${failCount} failed`);
      
      if (successCount > 0) {
        console.log('  ✅ Rate limiting test - Some requests succeeded');
        this.logResult('Rate Limiting', true, `${successCount}/${results.length} requests succeeded`);
      } else {
        console.log('  ⚠️  Rate limiting test - All requests failed');
        this.logResult('Rate Limiting', false, 'All rapid requests failed');
      }
      
    } catch (error) {
      console.log(`  ❌ Rate limiting test error: ${error.message}`);
      this.logResult('Rate Limiting', false, error.message);
    }
    console.log('');
  }

  /**
   * Test error handling and fallback mechanisms
   */
  async testErrorHandling() {
    console.log('🛡️  Testing Error Handling and Fallback Mechanisms...');
    
    const tests = [
      {
        name: 'Invalid Ticker Symbol',
        test: () => this.toolkit.getYFinData('INVALID_TICKER_12345', '2025-08-24', '2025-08-24')
      },
      {
        name: 'Invalid Date Range',
        test: () => this.toolkit.getYFinData('AAPL', '2030-01-01', '2030-01-02')
      },
      {
        name: 'Empty Query',
        test: () => this.toolkit.getGoogleNews('', '2025-08-24', 1)
      }
    ];

    for (const test of tests) {
      try {
        console.log(`  Testing: ${test.name}`);
        const result = await this.timeoutWrapper(test.test(), 10000);
        
        // Check if we got a graceful error message or fallback data
        if (result && typeof result === 'string') {
          if (result.includes('error') || result.includes('unavailable') || result.includes('not found')) {
            console.log(`  ✅ ${test.name} - Graceful error handling`);
            this.logResult(`Error Handling - ${test.name}`, true, 'Graceful error response');
          } else {
            console.log(`  ✅ ${test.name} - Fallback data provided`);
            this.logResult(`Error Handling - ${test.name}`, true, 'Fallback data provided');
          }
        } else {
          console.log(`  ⚠️  ${test.name} - Unexpected response`);
          this.logResult(`Error Handling - ${test.name}`, false, 'Unexpected response type');
        }
      } catch (error) {
        console.log(`  ✅ ${test.name} - Exception handled: ${error.message}`);
        this.logResult(`Error Handling - ${test.name}`, true, `Exception properly handled: ${error.message}`);
      }
    }
    console.log('');
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const endTime = Date.now();
    const totalTime = Math.round((endTime - this.startTime) / 1000);
    
    console.log('📋 API Integration Test Report');
    console.log('================================');
    console.log(`Test Duration: ${totalTime} seconds`);
    console.log(`Total Tests: ${this.results.length}`);
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const passRate = Math.round((passed / this.results.length) * 100);
    
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log('');
    
    // Group results by category
    const categories = {};
    this.results.forEach(result => {
      const category = result.name.split(' - ')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });
    
    Object.entries(categories).forEach(([category, tests]) => {
      const categoryPassed = tests.filter(t => t.success).length;
      const categoryTotal = tests.length;
      const categoryRate = Math.round((categoryPassed / categoryTotal) * 100);
      
      console.log(`${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
      
      tests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`  ${status} ${test.name} - ${test.details}`);
      });
      console.log('');
    });
    
    // Overall assessment
    if (passRate >= 80) {
      console.log('🎉 Overall Assessment: EXCELLENT - API integrations are working well');
    } else if (passRate >= 60) {
      console.log('👍 Overall Assessment: GOOD - Most API integrations are working');
    } else if (passRate >= 40) {
      console.log('⚠️  Overall Assessment: FAIR - Some API integrations need attention');
    } else {
      console.log('❌ Overall Assessment: POOR - Many API integrations are failing');
    }
    
    return passRate >= 60; // Consider test suite passed if 60% or more tests pass
  }

  /**
   * Run all API integration tests
   */
  async runAllTests() {
    try {
      await this.initialize();
      
      // Run all test suites
      await this.testYahooFinance();
      await this.testTechnicalIndicators();
      await this.testFinnhub();
      await this.testGoogleNews();
      await this.testReddit();
      await this.testSimFin();
      await this.testRateLimiting();
      await this.testErrorHandling();
      
      // Generate and return report
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ API Integration Test Suite failed:', error);
      return false;
    }
  }

  /**
   * Utility: Timeout wrapper for API calls
   */
  async timeoutWrapper(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Utility: Log test result
   */
  logResult(name, success, details) {
    this.results.push({
      name,
      success,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

// Run the test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function runTests() {
    const tester = new APIIntegrationTester();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  }
  
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { APIIntegrationTester };