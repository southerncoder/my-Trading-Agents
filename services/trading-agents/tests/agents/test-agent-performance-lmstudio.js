/**
 * Agent Performance and Stress Test with LM Studio
 * Tests performance characteristics, concurrent processing, and stress scenarios
 */

import { ModelProvider } from '../dist/models/provider.js';
import { performance } from 'perf_hooks';

// Performance test configuration
const PERF_CONFIG = {
  provider: 'remote_lmstudio',
  modelName: 'microsoft/phi-4-mini-reasoning',
  baseURL: 'http://localhost:1234/v1',
  temperature: 0.1, // Lower for consistent performance measurement
  maxTokens: 1024,
  timeout: 30000
};

// Test scenarios
const TEST_COMPANIES = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
const TEST_DATES = ['2025-01-15', '2025-01-16', '2025-01-17'];

class PerformanceMetrics {
  constructor() {
    this.metrics = [];
  }

  startTimer(label) {
    return {
      label,
      startTime: performance.now(),
      end: () => {
        const duration = performance.now() - this.startTime;
        this.metrics.push({ label, duration, timestamp: new Date() });
        return duration;
      }
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getStatistics() {
    if (this.metrics.length === 0) return null;

    const durations = this.metrics.map(m => m.duration);
    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
    };
  }
}

async function testConnectionPerformance() {
  console.log('⚡ Connection Performance Test');
  console.log('-'.repeat(40));

  const metrics = new PerformanceMetrics();
  const model = ModelProvider.createModel(PERF_CONFIG);
  
  // Test multiple simple requests to measure baseline latency
  const testPrompts = [
    'Hello',
    'What is 2+2?',
    'Name a color',
    'Say OK',
    'Count to 3'
  ];

  console.log('Testing baseline request latency...');
  
  for (let i = 0; i < testPrompts.length; i++) {
    const timer = metrics.startTimer(`request_${i + 1}`);
    
    try {
      await model.invoke([
        { role: 'user', content: testPrompts[i] }
      ]);
      const duration = timer.end();
      console.log(`  Request ${i + 1}: ${duration.toFixed(0)}ms`);
    } catch (error) {
      console.error(`  Request ${i + 1}: FAILED - ${error.message}`);
    }
  }

  const stats = metrics.getStatistics();
  if (stats) {
    console.log('\n📊 Connection Performance Statistics:');
    console.log(`  Average: ${stats.average.toFixed(0)}ms`);
    console.log(`  Range: ${stats.min.toFixed(0)}ms - ${stats.max.toFixed(0)}ms`);
    console.log(`  Median: ${stats.median.toFixed(0)}ms`);
  }

  return stats;
}

async function testAgentPerformance() {
  console.log('\n🎯 Agent Processing Performance Test');
  console.log('-'.repeat(40));

  const metrics = new PerformanceMetrics();
  
  try {
    const model = ModelProvider.createModel(PERF_CONFIG);
    const { MarketAnalyst } = await import('../dist/agents/analysts/market-analyst.js');
    const agent = new MarketAnalyst(model, []);

    console.log('Testing MarketAnalyst performance across multiple scenarios...');

    for (let i = 0; i < 3; i++) {
      const company = TEST_COMPANIES[i % TEST_COMPANIES.length];
      const date = TEST_DATES[i % TEST_DATES.length];
      
      const testState = {
        company_of_interest: company,
        trade_date: date,
        messages: [],
        sender: 'perf_test'
      };

      const timer = metrics.startTimer(`${company}_${date}`);
      console.log(`  Processing ${company} for ${date}...`);

      try {
        const response = await agent.process(testState);
        const duration = timer.end();
        
        const outputLength = response.market_report?.length || 0;
        console.log(`    ✅ Completed in ${duration.toFixed(0)}ms (${outputLength} chars)`);
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }

    const stats = metrics.getStatistics();
    if (stats) {
      console.log('\n📊 Agent Performance Statistics:');
      console.log(`  Average Processing Time: ${stats.average.toFixed(0)}ms`);
      console.log(`  Range: ${stats.min.toFixed(0)}ms - ${stats.max.toFixed(0)}ms`);
      console.log(`  Median: ${stats.median.toFixed(0)}ms`);
    }

    return stats;
  } catch (error) {
    console.error('❌ Agent performance test failed:', error.message);
    return null;
  }
}

async function testConcurrentProcessing() {
  console.log('\n🚀 Concurrent Processing Test');
  console.log('-'.repeat(40));

  try {
    const model = ModelProvider.createModel(PERF_CONFIG);
    const { MarketAnalyst } = await import('../dist/agents/analysts/market-analyst.js');
    
    // Create multiple agent instances
    const agents = [
      new MarketAnalyst(model, []),
      new MarketAnalyst(model, []),
      new MarketAnalyst(model, [])
    ];

    // Create concurrent test scenarios
    const testCases = [
      { company: 'AAPL', date: '2025-01-15' },
      { company: 'GOOGL', date: '2025-01-16' },
      { company: 'MSFT', date: '2025-01-17' }
    ];

    console.log('Testing concurrent agent processing...');
    const startTime = performance.now();

    // Run all agents concurrently
    const promises = testCases.map((testCase, index) => {
      const agent = agents[index];
      const testState = {
        company_of_interest: testCase.company,
        trade_date: testCase.date,
        messages: [],
        sender: `concurrent_test_${index}`
      };

      return agent.process(testState)
        .then(response => ({
          agent: index + 1,
          company: testCase.company,
          success: true,
          outputLength: response.market_report?.length || 0
        }))
        .catch(error => ({
          agent: index + 1,
          company: testCase.company,
          success: false,
          error: error.message
        }));
    });

    const results = await Promise.all(promises);
    const totalDuration = performance.now() - startTime;

    console.log('\n📊 Concurrent Processing Results:');
    console.log(`  Total Time: ${totalDuration.toFixed(0)}ms`);
    console.log(`  Successful: ${results.filter(r => r.success).length}/${results.length}`);

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const info = result.success 
        ? `(${result.outputLength} chars)`
        : `(${result.error})`;
      console.log(`    ${status} Agent ${result.agent} - ${result.company} ${info}`);
    }

    return {
      totalDuration,
      successRate: results.filter(r => r.success).length / results.length,
      results
    };
  } catch (error) {
    console.error('❌ Concurrent processing test failed:', error.message);
    return null;
  }
}

async function testStressScenarios() {
  console.log('\n💪 Stress Test Scenarios');
  console.log('-'.repeat(40));

  const model = ModelProvider.createModel({
    ...PERF_CONFIG,
    timeout: 60000 // Longer timeout for stress tests
  });

  // Test 1: Large input context
  console.log('1. Testing with large input context...');
  try {
    const { MarketAnalyst } = await import('../dist/agents/analysts/market-analyst.js');
    const agent = new MarketAnalyst(model, []);

    const largeContext = Array(20).fill('This is additional context. ').join('');
    const testState = {
      company_of_interest: 'AAPL',
      trade_date: '2025-01-15',
      messages: [
        { role: 'system', content: largeContext },
        { role: 'user', content: 'Previous analysis data: ' + largeContext }
      ],
      sender: 'stress_test'
    };

    const startTime = performance.now();
    const response = await agent.process(testState);
    const duration = performance.now() - startTime;

    console.log(`   ✅ Large context handled in ${duration.toFixed(0)}ms`);
    console.log(`   📝 Output: ${response.market_report?.length || 0} characters`);
  } catch (error) {
    console.log(`   ❌ Large context failed: ${error.message}`);
  }

  // Test 2: Rapid sequential requests
  console.log('\n2. Testing rapid sequential requests...');
  const rapidResults = [];
  
  try {
    const { NewsAnalyst } = await import('../dist/agents/analysts/news-analyst.js');
    const agent = new NewsAnalyst(model, []);

    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      
      const testState = {
        company_of_interest: TEST_COMPANIES[i % TEST_COMPANIES.length],
        trade_date: '2025-01-15',
        messages: [],
        sender: `rapid_${i}`
      };

      try {
        await agent.process(testState);
        const duration = performance.now() - startTime;
        rapidResults.push({ request: i + 1, duration, success: true });
        console.log(`   Request ${i + 1}: ${duration.toFixed(0)}ms`);
      } catch (error) {
        rapidResults.push({ request: i + 1, success: false, error: error.message });
        console.log(`   Request ${i + 1}: FAILED`);
      }
    }

    const successfulRapid = rapidResults.filter(r => r.success);
    if (successfulRapid.length > 0) {
      const avgRapid = successfulRapid.reduce((sum, r) => sum + r.duration, 0) / successfulRapid.length;
      console.log(`   📊 Rapid requests average: ${avgRapid.toFixed(0)}ms`);
    }
  } catch (error) {
    console.log(`   ❌ Rapid request test setup failed: ${error.message}`);
  }

  return rapidResults;
}

async function generatePerformanceReport(connectionStats, agentStats, concurrentResults, stressResults) {
  console.log('\n📋 COMPREHENSIVE PERFORMANCE REPORT');
  console.log('='.repeat(50));

  console.log('\n🔗 CONNECTION PERFORMANCE');
  if (connectionStats) {
    console.log(`  Average Latency: ${connectionStats.average.toFixed(0)}ms`);
    console.log(`  Best Case: ${connectionStats.min.toFixed(0)}ms`);
    console.log(`  Worst Case: ${connectionStats.max.toFixed(0)}ms`);
    
    // Performance rating
    if (connectionStats.average < 1000) {
      console.log('  Rating: ⚡ Excellent (<1s average)');
    } else if (connectionStats.average < 3000) {
      console.log('  Rating: 👍 Good (1-3s average)');
    } else {
      console.log('  Rating: ⚠️  Slow (>3s average)');
    }
  } else {
    console.log('  ❌ Connection tests failed');
  }

  console.log('\n🤖 AGENT PROCESSING PERFORMANCE');
  if (agentStats) {
    console.log(`  Average Processing: ${agentStats.average.toFixed(0)}ms`);
    console.log(`  Processing Range: ${agentStats.min.toFixed(0)}ms - ${agentStats.max.toFixed(0)}ms`);
    
    // Processing rating
    if (agentStats.average < 5000) {
      console.log('  Rating: ⚡ Fast (<5s average)');
    } else if (agentStats.average < 15000) {
      console.log('  Rating: 👍 Acceptable (5-15s average)');
    } else {
      console.log('  Rating: ⚠️  Slow (>15s average)');
    }
  } else {
    console.log('  ❌ Agent processing tests failed');
  }

  console.log('\n🚀 CONCURRENT PROCESSING');
  if (concurrentResults) {
    console.log(`  Total Time: ${concurrentResults.totalDuration.toFixed(0)}ms`);
    console.log(`  Success Rate: ${(concurrentResults.successRate * 100).toFixed(1)}%`);
    console.log(`  Parallelization: ${concurrentResults.successRate > 0.8 ? '✅ Working' : '⚠️  Issues detected'}`);
  } else {
    console.log('  ❌ Concurrent processing tests failed');
  }

  console.log('\n💪 STRESS TEST RESILIENCE');
  if (stressResults && stressResults.length > 0) {
    const successfulStress = stressResults.filter(r => r.success).length;
    console.log(`  Rapid Request Success: ${successfulStress}/${stressResults.length}`);
    console.log(`  Stress Tolerance: ${successfulStress === stressResults.length ? '✅ Excellent' : '⚠️  Some failures'}`);
  } else {
    console.log('  ❌ Stress tests failed or incomplete');
  }

  console.log('\n💡 RECOMMENDATIONS');
  
  // Generate recommendations based on results
  const recommendations = [];
  
  if (connectionStats && connectionStats.average > 3000) {
    recommendations.push('🔧 Consider checking LM Studio model size and system resources');
  }
  
  if (agentStats && agentStats.average > 15000) {
    recommendations.push('⚡ Consider reducing maxTokens or model complexity for faster responses');
  }
  
  if (concurrentResults && concurrentResults.successRate < 0.8) {
    recommendations.push('🚀 Concurrent processing issues detected - check resource limits');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('🎉 All performance metrics look great!');
    recommendations.push('✨ LM Studio + microsoft/phi-4-mini-reasoning is well-optimized');
  }
  
  recommendations.forEach(rec => console.log(`  ${rec}`));
}

async function runPerformanceTests() {
  console.log('⚡ TRADING AGENTS PERFORMANCE TESTS');
  console.log('Model: microsoft/phi-4-mini-reasoning');
  console.log('Provider: LM Studio');
  console.log('='.repeat(50));

  try {
    // Run all performance tests
    const connectionStats = await testConnectionPerformance();
    const agentStats = await testAgentPerformance();
    const concurrentResults = await testConcurrentProcessing();
    const stressResults = await testStressScenarios();

    // Generate comprehensive report
    await generatePerformanceReport(connectionStats, agentStats, concurrentResults, stressResults);

    console.log('\n✅ Performance testing completed');
    return true;

  } catch (error) {
    console.error('\n💥 Performance test suite failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Critical performance test error:', error);
      process.exit(1);
    });
}

export { runPerformanceTests, testConnectionPerformance, testAgentPerformance };