#!/usr/bin/env node

/**
 * Focused API Test Suite for Trading Agents
 * 
 * Tests core external API integrations using lm_studio provider 
 * with microsoft/phi-4-mini-reasoning model.
 */

import { EnhancedTradingAgentsGraph } from '../dist/graph/enhanced-trading-graph.js';
import { createConfig } from '../dist/config/default.js';

const TEST_CONFIG = createConfig({
  llmProvider: 'lm_studio',
  deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
  quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
  backendUrl: 'http://localhost:1234/v1',
  onlineTools: true,
  maxRecurLimit: 3,
  maxDebateRounds: 1,
  maxRiskDiscussRounds: 1
});

class FocusedAPITester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Test LM Studio connectivity with the specified model
   */
  async testLMStudioConnectivity() {
    console.log('🤖 Testing LM Studio Connectivity...');
    console.log(`Model: ${TEST_CONFIG.quickThinkLlm}`);
    console.log(`Backend: ${TEST_CONFIG.backendUrl}`);
    
    try {
      // Import ModelProvider dynamically
      const { ModelProvider } = await import('../dist/models/provider.js');
      
      const modelConfig = {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.7,
        maxTokens: 1024
      };
      
      console.log('  Testing connection...');
      const connectionTest = await ModelProvider.testConnection(modelConfig);
      
      if (connectionTest.success) {
        console.log('  ✅ LM Studio connection successful');
        this.logResult('LM Studio Connectivity', true, 'Connection established');
        return true;
      } else {
        console.log('  ❌ LM Studio connection failed:', connectionTest.error);
        this.logResult('LM Studio Connectivity', false, connectionTest.error);
        return false;
      }
    } catch (error) {
      console.log('  ❌ LM Studio test error:', error.message);
      this.logResult('LM Studio Connectivity', false, error.message);
      return false;
    }
  }

  /**
   * Test Enhanced Trading Graph workflow
   */
  async testTradingGraphWorkflow() {
    console.log('\n📊 Testing Enhanced Trading Graph Workflow...');
    
    try {
      console.log('  Creating trading graph instance...');
      const graph = new EnhancedTradingAgentsGraph({
        config: TEST_CONFIG,
        selectedAnalysts: ['market'],
        enableLangGraph: true
      });
      
      console.log('  Testing workflow initialization...');
      await graph.initializeWorkflow();
      console.log('  ✅ Workflow initialized successfully');
      
      console.log('  Testing workflow connectivity...');
      const connectivityTest = await graph.testWorkflow();
      
      if (connectivityTest.success) {
        console.log('  ✅ Workflow connectivity test passed');
        this.logResult('Trading Graph Workflow', true, 'Workflow operational');
        return true;
      } else {
        console.log('  ❌ Workflow connectivity test failed:', connectivityTest.error);
        this.logResult('Trading Graph Workflow', false, connectivityTest.error);
        return false;
      }
    } catch (error) {
      console.log('  ❌ Trading graph test error:', error.message);
      this.logResult('Trading Graph Workflow', false, error.message);
      return false;
    }
  }

  /**
   * Test basic data flow operations
   */
  async testBasicDataFlows() {
    console.log('\n📈 Testing Basic Data Flow Operations...');
    
    try {
      // Import Toolkit dynamically
      const { Toolkit, setConfig } = await import('../dist/dataflows/interface.js');
      
      console.log('  Setting up data flow toolkit...');
      setConfig(TEST_CONFIG);
      const toolkit = new Toolkit(TEST_CONFIG);
      
      // Test Yahoo Finance (most reliable)
      console.log('  Testing Yahoo Finance data retrieval...');
      try {
        const yahooData = await this.timeoutWrapper(
          toolkit.getYFinData('AAPL', '2025-08-20', '2025-08-24'),
          10000
        );
        
        if (yahooData && yahooData.length > 0) {
          console.log(`  ✅ Yahoo Finance - Retrieved ${yahooData.length} chars`);
          this.logResult('Yahoo Finance API', true, `Data retrieved: ${yahooData.length} chars`);
        } else {
          console.log('  ⚠️  Yahoo Finance - No data returned');
          this.logResult('Yahoo Finance API', false, 'No data returned');
        }
      } catch (error) {
        console.log(`  ❌ Yahoo Finance error: ${error.message}`);
        this.logResult('Yahoo Finance API', false, error.message);
      }
      
      // Test Technical Indicators
      console.log('  Testing Technical Indicators...');
      try {
        const indicators = await this.timeoutWrapper(
          toolkit.getStockstatsIndicatorsReport('AAPL', '2025-08-24', 10),
          15000
        );
        
        if (indicators && indicators.length > 0) {
          console.log(`  ✅ Technical Indicators - Generated ${indicators.length} chars report`);
          this.logResult('Technical Indicators', true, `Report generated: ${indicators.length} chars`);
        } else {
          console.log('  ⚠️  Technical Indicators - No report generated');
          this.logResult('Technical Indicators', false, 'No report generated');
        }
      } catch (error) {
        console.log(`  ❌ Technical Indicators error: ${error.message}`);
        this.logResult('Technical Indicators', false, error.message);
      }
      
      return true;
    } catch (error) {
      console.log('  ❌ Data flow test error:', error.message);
      this.logResult('Data Flow Operations', false, error.message);
      return false;
    }
  }

  /**
   * Test external API endpoints (with graceful degradation)
   */
  async testExternalAPIs() {
    console.log('\n🌐 Testing External API Endpoints...');
    
    try {
      const { Toolkit, setConfig } = await import('../dist/dataflows/interface.js');
      setConfig(TEST_CONFIG);
      const toolkit = new Toolkit(TEST_CONFIG);
      
      // Test Google News
      console.log('  Testing Google News API...');
      try {
        const newsData = await this.timeoutWrapper(
          toolkit.getGoogleNews('AAPL Apple stock', '2025-08-24', 3),
          10000
        );
        
        if (newsData && newsData.length > 0) {
          console.log(`  ✅ Google News - Retrieved ${newsData.length} chars`);
          this.logResult('Google News API', true, `News retrieved: ${newsData.length} chars`);
        } else {
          console.log('  ⚠️  Google News - No news data returned');
          this.logResult('Google News API', false, 'No news data returned');
        }
      } catch (error) {
        console.log(`  ⚠️  Google News error (expected if no API key): ${error.message}`);
        this.logResult('Google News API', false, `API error: ${error.message}`);
      }
      
      // Test Finnhub (if API key available)
      console.log('  Testing Finnhub API...');
      try {
        const finnhubData = await this.timeoutWrapper(
          toolkit.getFinnhubNews('AAPL', '2025-08-24', 3),
          10000
        );
        
        if (finnhubData && finnhubData.length > 0) {
          console.log(`  ✅ Finnhub - Retrieved ${finnhubData.length} chars`);
          this.logResult('Finnhub API', true, `News retrieved: ${finnhubData.length} chars`);
        } else {
          console.log('  ⚠️  Finnhub - No data returned');
          this.logResult('Finnhub API', false, 'No data returned');
        }
      } catch (error) {
        console.log(`  ⚠️  Finnhub error (expected if no API key): ${error.message}`);
        this.logResult('Finnhub API', false, `API error: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.log('  ❌ External API test error:', error.message);
      this.logResult('External APIs', false, error.message);
      return false;
    }
  }

  /**
   * Test rate limiting and error recovery
   */
  async testRateLimitingAndRecovery() {
    console.log('\n⏱️  Testing Rate Limiting and Error Recovery...');
    
    try {
      const { Toolkit, setConfig } = await import('../dist/dataflows/interface.js');
      setConfig(TEST_CONFIG);
      const toolkit = new Toolkit(TEST_CONFIG);
      
      console.log('  Testing rapid sequential requests...');
      const requests = [];
      
      // Make multiple rapid requests to test rate limiting
      for (let i = 0; i < 3; i++) {
        requests.push(
          toolkit.getYFinData('AAPL', '2025-08-24', '2025-08-24')
            .then(result => ({ success: true, data: result?.length || 0 }))
            .catch(error => ({ success: false, error: error.message }))
        );
      }
      
      const results = await Promise.all(requests);
      const successful = results.filter(r => r.success).length;
      
      console.log(`  Results: ${successful}/${results.length} requests successful`);
      
      if (successful >= 2) {
        console.log('  ✅ Rate limiting handling - Multiple requests succeeded');
        this.logResult('Rate Limiting', true, `${successful}/${results.length} requests succeeded`);
      } else {
        console.log('  ⚠️  Rate limiting handling - Limited success');
        this.logResult('Rate Limiting', false, `Only ${successful}/${results.length} requests succeeded`);
      }
      
      return true;
    } catch (error) {
      console.log('  ❌ Rate limiting test error:', error.message);
      this.logResult('Rate Limiting', false, error.message);
      return false;
    }
  }

  /**
   * Generate focused test report
   */
  generateReport() {
    const endTime = Date.now();
    const totalTime = Math.round((endTime - this.startTime) / 1000);
    
    console.log('\n📋 Focused API Integration Test Report');
    console.log('=====================================');
    console.log(`Test Duration: ${totalTime} seconds`);
    console.log(`Total Tests: ${this.results.length}`);
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const passRate = Math.round((passed / this.results.length) * 100);
    
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log('');
    
    // Show detailed results
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.details}`);
    });
    
    console.log('');
    
    // Overall assessment
    if (passRate >= 80) {
      console.log('🎉 Overall Assessment: EXCELLENT - Core systems operational');
    } else if (passRate >= 60) {
      console.log('👍 Overall Assessment: GOOD - Most systems working');
    } else if (passRate >= 40) {
      console.log('⚠️  Overall Assessment: FAIR - Some systems need attention');
    } else {
      console.log('❌ Overall Assessment: POOR - Major systems failing');
    }
    
    // Specific recommendations
    console.log('\nRecommendations:');
    if (this.results.find(r => r.name === 'LM Studio Connectivity' && !r.success)) {
      console.log('- Ensure LM Studio is running with microsoft/phi-4-mini-reasoning model loaded');
    }
    if (this.results.filter(r => r.name.includes('API') && !r.success).length > 2) {
      console.log('- Check external API keys and network connectivity');
    }
    if (this.results.find(r => r.name === 'Trading Graph Workflow' && !r.success)) {
      console.log('- Verify LangGraph dependencies and model connectivity');
    }
    
    return passRate >= 60;
  }

  /**
   * Run all focused tests
   */
  async runAllTests() {
    console.log('🚀 Running Focused API Integration Tests...');
    console.log(`Model Provider: ${TEST_CONFIG.llmProvider}`);
    console.log(`Model: ${TEST_CONFIG.quickThinkLlm}`);
    console.log('');
    
    try {
      // Run tests in sequence for better debugging
      await this.testLMStudioConnectivity();
      await this.testTradingGraphWorkflow();
      await this.testBasicDataFlows();
      await this.testExternalAPIs();
      await this.testRateLimitingAndRecovery();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Focused API test suite failed:', error);
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
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
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

// Run the focused test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function runTests() {
    const tester = new FocusedAPITester();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  }
  
  runTests().catch(error => {
    console.error('Focused test runner error:', error);
    process.exit(1);
  });
}

export { FocusedAPITester };