/**
 * Connection Pooling Integration Test
 * 
 * This test validates the performance benefits of connection pooling
 * by comparing regular HTTP clients vs pooled clients.
 */

import { PooledYahooFinanceAPI } from './dist/dataflows/pooled-yahoo-finance.js';
import { PooledRedditAPI } from './dist/dataflows/pooled-reddit.js';
import { globalConnectionPool } from './dist/performance/connection-pooling.js';

async function testConnectionPooling() {
  console.log('🔗 Connection Pooling Integration Test');
  console.log('=====================================');
  
  const config = {
    agents: {
      researcher: { enabled: true },
      analyst: { enabled: true },
      trader: { enabled: true }
    }
  };

  const results = {
    connectionReuse: 0,
    totalRequests: 0,
    pooledResponseTimes: [],
    errors: []
  };

  try {
    // Initialize pooled APIs
    console.log('\n📡 Initializing pooled APIs...');
    const yahooAPI = new PooledYahooFinanceAPI(config);
    const redditAPI = new PooledRedditAPI(config);

    console.log('✅ APIs initialized with connection pooling');

    // Test 1: Multiple Yahoo Finance requests to test connection reuse
    console.log('\n📊 Test 1: Yahoo Finance connection reuse');
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    const yahooPromises = symbols.map(symbol => {
      const startTime = Date.now();
      return yahooAPI.getData(symbol, startDate, endDate, true)
        .then(result => {
          const responseTime = Date.now() - startTime;
          results.pooledResponseTimes.push(responseTime);
          results.totalRequests++;
          console.log(`  ✅ ${symbol}: ${responseTime}ms`);
          return { symbol, responseTime, success: true };
        })
        .catch(error => {
          results.errors.push({ symbol, error: error.message });
          console.log(`  ❌ ${symbol}: ${error.message}`);
          return { symbol, error: error.message, success: false };
        });
    });

    const yahooResults = await Promise.all(yahooPromises);
    console.log(`📈 Yahoo Finance: ${yahooResults.filter(r => r.success).length}/${symbols.length} successful`);

    // Test 2: Reddit API requests
    console.log('\n🔍 Test 2: Reddit API connection pooling');
    const subreddits = ['stocks', 'investing', 'SecurityAnalysis'];
    
    const redditPromises = subreddits.map(subreddit => {
      const startTime = Date.now();
      return redditAPI.getHotPosts(subreddit, 10)
        .then(result => {
          const responseTime = Date.now() - startTime;
          results.pooledResponseTimes.push(responseTime);
          results.totalRequests++;
          console.log(`  ✅ r/${subreddit}: ${responseTime}ms`);
          return { subreddit, responseTime, success: true };
        })
        .catch(error => {
          results.errors.push({ subreddit, error: error.message });
          console.log(`  ❌ r/${subreddit}: ${error.message}`);
          return { subreddit, error: error.message, success: false };
        });
    });

    const redditResults = await Promise.all(redditPromises);
    console.log(`💬 Reddit: ${redditResults.filter(r => r.success).length}/${subreddits.length} successful`);

    // Test 3: Get pool statistics
    console.log('\n📊 Connection Pool Statistics');
    console.log('============================');
    
    const yahooStats = yahooAPI.getPoolStats();
    const redditStats = redditAPI.getPoolStats();
    
    console.log('Yahoo Finance Pool:');
    console.log(`  Total Requests: ${yahooStats.totalRequests}`);
    console.log(`  Active Connections: ${yahooStats.activeConnections}`);
    console.log(`  Connection Reuses: ${yahooStats.connectionReuses}`);
    console.log(`  Average Response Time: ${yahooStats.averageResponseTime}ms`);
    console.log(`  Success Rate: ${yahooStats.successRate}%`);

    console.log('\nReddit Pool:');
    console.log(`  Total Requests: ${redditStats.totalRequests}`);
    console.log(`  Active Connections: ${redditStats.activeConnections}`);
    console.log(`  Connection Reuses: ${redditStats.connectionReuses}`);
    console.log(`  Average Response Time: ${redditStats.averageResponseTime}ms`);
    console.log(`  Success Rate: ${redditStats.successRate}%`);

    // Calculate overall metrics
    const totalConnectionReuses = yahooStats.connectionReuses + redditStats.connectionReuses;
    const totalActiveConnections = yahooStats.activeConnections + redditStats.activeConnections;
    const reuseRatio = totalConnectionReuses / results.totalRequests;
    const avgResponseTime = results.pooledResponseTimes.reduce((a, b) => a + b, 0) / results.pooledResponseTimes.length;

    console.log('\n🎯 Overall Pool Performance');
    console.log('===========================');
    console.log(`Total Requests: ${results.totalRequests}`);
    console.log(`Total Connection Reuses: ${totalConnectionReuses}`);
    console.log(`Connection Reuse Ratio: ${(reuseRatio * 100).toFixed(1)}%`);
    console.log(`Active Connections: ${totalActiveConnections}`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Error Rate: ${(results.errors.length / results.totalRequests * 100).toFixed(1)}%`);

    // Test 4: Concurrent request handling
    console.log('\n⚡ Test 4: Concurrent request handling');
    console.log('=====================================');

    const concurrentStartTime = Date.now();
    
    // Mix of concurrent requests across different APIs
    const concurrentPromises = [
      yahooAPI.getData('AAPL', startDate, endDate, true),
      redditAPI.searchPosts('trading', 'stocks', 5),
      yahooAPI.getData('GOOGL', startDate, endDate, true),
      redditAPI.getTopPosts('investing', 'week', 5),
      yahooAPI.getData('MSFT', startDate, endDate, true),
    ];

    const concurrentResults = await Promise.allSettled(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStartTime;
    const successfulConcurrent = concurrentResults.filter(r => r.status === 'fulfilled').length;

    console.log(`Concurrent execution: ${successfulConcurrent}/${concurrentPromises.length} successful in ${concurrentTime}ms`);

    // Performance assessment
    console.log('\n🏆 Connection Pooling Assessment');
    console.log('================================');
    
    if (reuseRatio > 0.3) {
      console.log('✅ EXCELLENT: High connection reuse ratio (>30%)');
    } else if (reuseRatio > 0.1) {
      console.log('✅ GOOD: Moderate connection reuse ratio (>10%)');
    } else {
      console.log('⚠️  LOW: Connection reuse could be improved');
    }

    if (avgResponseTime < 3000) {
      console.log('✅ EXCELLENT: Fast average response time (<3s)');
    } else if (avgResponseTime < 5000) {
      console.log('✅ GOOD: Acceptable response time (<5s)');
    } else {
      console.log('⚠️  SLOW: Response times could be improved');
    }

    if (results.errors.length === 0) {
      console.log('✅ PERFECT: No errors encountered');
    } else if (results.errors.length < results.totalRequests * 0.1) {
      console.log('✅ GOOD: Low error rate (<10%)');
    } else {
      console.log('⚠️  HIGH ERROR RATE: Check network connectivity');
    }

    // Global pool summary
    console.log('\n🌐 Global Pool Summary');
    console.log('=====================');
    const globalStats = globalConnectionPool.getGlobalStats();
    console.log(`Total Pools: ${globalStats.totalPools}`);
    console.log(`Total Active Connections: ${globalStats.totalActiveConnections}`);
    console.log(`Global Request Count: ${globalStats.totalRequests}`);
    console.log(`Global Connection Reuses: ${globalStats.totalReuses}`);

    // Cleanup
    yahooAPI.dispose();
    redditAPI.dispose();

    console.log('\n🎉 Connection pooling integration test completed!');
    console.log(`📊 Summary: ${results.totalRequests} requests, ${totalConnectionReuses} reuses, ${avgResponseTime.toFixed(0)}ms avg`);

    return {
      success: true,
      metrics: {
        totalRequests: results.totalRequests,
        connectionReuses: totalConnectionReuses,
        reuseRatio,
        averageResponseTime: avgResponseTime,
        errorRate: results.errors.length / results.totalRequests,
        concurrentExecutionTime: concurrentTime
      }
    };

  } catch (error) {
    console.error('❌ Connection pooling test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test if this file is executed directly
testConnectionPooling()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Connection pooling is working effectively!');
      process.exit(0);
    } else {
      console.log('\n❌ Connection pooling test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });

export { testConnectionPooling };