/**
 * Performance Optimization Test for Verbose Logging System
 * 
 * This test suite evaluates the performance characteristics of the verbose logging
 * system under various conditions and identifies optimization opportunities.
 */

import { performance } from 'perf_hooks';

async function performanceOptimizationTest() {
  console.log('🔬 Starting Verbose Logging Performance Optimization Analysis...\n');
  console.log('=' * 80);

  const results = {
    baselinePerformance: {},
    memoryUsage: {},
    scalabilityTests: {},
    optimizationImpact: {},
    recommendations: []
  };

  try {
    // Import required modules
    const { LoggingManager } = await import('../dist/cli/logging-manager.js');
    const { createLogger } = await import('../dist/utils/enhanced-logger.js');

    console.log('📊 Test 1: Baseline Performance Metrics\n');

    // Test 1: Baseline performance with different log levels
    const manager = LoggingManager.getInstance();
    const testLevels = ['debug', 'info', 'warn', 'error', 'critical'];
    
    for (const level of testLevels) {
      console.log(`Testing ${level.toUpperCase()} level performance...`);
      
      manager.setVerboseMode(true, level);
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Execute 1000 log operations
      for (let i = 0; i < 1000; i++) {
        manager.logOperationStart(`test-operation-${i}`, { 
          iteration: i, 
          data: 'test-data',
          timestamp: Date.now() 
        });
        
        if (i % 100 === 0) {
          manager.logAgentActivity('TestAgent', `processing batch ${i/100}`, { 
            batchSize: 100,
            progress: (i/1000) * 100 
          });
        }
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      results.baselinePerformance[level] = {
        duration: Math.round(duration * 100) / 100,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
        operationsPerSecond: Math.round(1000 / (duration / 1000))
      };

      console.log(`  ✓ Duration: ${results.baselinePerformance[level].duration}ms`);
      console.log(`  ✓ Memory Delta: ${results.baselinePerformance[level].memoryDelta}MB`);
      console.log(`  ✓ Ops/sec: ${results.baselinePerformance[level].operationsPerSecond}`);
      console.log('');
    }

    console.log('📈 Test 2: Scalability Analysis\n');

    // Test 2: Scalability with increasing load
    const testSizes = [100, 500, 1000, 5000, 10000];
    manager.setVerboseMode(true, 'info');

    for (const size of testSizes) {
      console.log(`Testing with ${size} operations...`);
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      for (let i = 0; i < size; i++) {
        manager.logOperationStart(`scalability-test-${i}`, { 
          size: size,
          iteration: i,
          largeData: new Array(10).fill('x').join('') // 10 char string
        });
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      results.scalabilityTests[size] = {
        duration: Math.round(duration * 100) / 100,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
        operationsPerSecond: Math.round(size / (duration / 1000)),
        avgTimePerOperation: Math.round((duration / size) * 100) / 100
      };

      console.log(`  ✓ Duration: ${results.scalabilityTests[size].duration}ms`);
      console.log(`  ✓ Memory Delta: ${results.scalabilityTests[size].memoryDelta}MB`);
      console.log(`  ✓ Avg per op: ${results.scalabilityTests[size].avgTimePerOperation}ms`);
      console.log('');
    }

    console.log('🧠 Test 3: Memory Usage Patterns\n');

    // Test 3: Memory usage with different data sizes
    const dataSizes = [
      { name: 'Small', data: { id: 1 } },
      { name: 'Medium', data: { id: 1, items: new Array(100).fill(0).map((_, i) => ({ id: i })) } },
      { name: 'Large', data: { id: 1, items: new Array(1000).fill(0).map((_, i) => ({ id: i, data: 'x'.repeat(50) })) } }
    ];

    for (const testCase of dataSizes) {
      console.log(`Testing with ${testCase.name} data size...`);
      
      const startMemory = process.memoryUsage();
      const startTime = performance.now();

      for (let i = 0; i < 500; i++) {
        manager.logOperationStart(`memory-test-${i}`, testCase.data);
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      results.memoryUsage[testCase.name] = {
        duration: Math.round(duration * 100) / 100,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
        dataSize: JSON.stringify(testCase.data).length
      };

      console.log(`  ✓ Duration: ${results.memoryUsage[testCase.name].duration}ms`);
      console.log(`  ✓ Memory Delta: ${results.memoryUsage[testCase.name].memoryDelta}MB`);
      console.log(`  ✓ Data Size: ${results.memoryUsage[testCase.name].dataSize} bytes`);
      console.log('');
    }

    console.log('🚀 Test 4: Optimization Impact Analysis\n');

    // Test 4: Compare enabled vs disabled logging
    console.log('Testing with logging DISABLED...');
    manager.setVerboseMode(false, 'info');
    
    const disabledStartTime = performance.now();
    const disabledStartMemory = process.memoryUsage();

    for (let i = 0; i < 5000; i++) {
      manager.logOperationStart(`disabled-test-${i}`, { iteration: i });
      manager.logAgentActivity('TestAgent', `operation ${i}`);
    }

    const disabledEndTime = performance.now();
    const disabledEndMemory = process.memoryUsage();
    const disabledDuration = disabledEndTime - disabledStartTime;
    const disabledMemoryDelta = disabledEndMemory.heapUsed - disabledStartMemory.heapUsed;

    console.log('Testing with logging ENABLED...');
    manager.setVerboseMode(true, 'info');
    
    const enabledStartTime = performance.now();
    const enabledStartMemory = process.memoryUsage();

    for (let i = 0; i < 5000; i++) {
      manager.logOperationStart(`enabled-test-${i}`, { iteration: i });
      manager.logAgentActivity('TestAgent', `operation ${i}`);
    }

    const enabledEndTime = performance.now();
    const enabledEndMemory = process.memoryUsage();
    const enabledDuration = enabledEndTime - enabledStartTime;
    const enabledMemoryDelta = enabledEndMemory.heapUsed - enabledStartMemory.heapUsed;

    results.optimizationImpact = {
      disabled: {
        duration: Math.round(disabledDuration * 100) / 100,
        memoryDelta: Math.round(disabledMemoryDelta / 1024 / 1024 * 100) / 100
      },
      enabled: {
        duration: Math.round(enabledDuration * 100) / 100,
        memoryDelta: Math.round(enabledMemoryDelta / 1024 / 1024 * 100) / 100
      },
      overhead: {
        duration: Math.round((enabledDuration - disabledDuration) * 100) / 100,
        memoryDelta: Math.round((enabledMemoryDelta - disabledMemoryDelta) / 1024 / 1024 * 100) / 100,
        percentageOverhead: Math.round(((enabledDuration - disabledDuration) / disabledDuration) * 100 * 100) / 100
      }
    };

    console.log(`  ✓ Disabled: ${results.optimizationImpact.disabled.duration}ms, ${results.optimizationImpact.disabled.memoryDelta}MB`);
    console.log(`  ✓ Enabled: ${results.optimizationImpact.enabled.duration}ms, ${results.optimizationImpact.enabled.memoryDelta}MB`);
    console.log(`  ✓ Overhead: ${results.optimizationImpact.overhead.duration}ms (${results.optimizationImpact.overhead.percentageOverhead}%)`);
    console.log('');

    console.log('🎯 Test 5: Concurrent Usage Simulation\n');

    // Test 5: Concurrent logging simulation
    console.log('Testing concurrent logging operations...');
    manager.setVerboseMode(true, 'debug');
    
    const concurrentStartTime = performance.now();
    const concurrentStartMemory = process.memoryUsage();

    const promises = [];
    for (let thread = 0; thread < 10; thread++) {
      promises.push(new Promise(async (resolve) => {
        for (let i = 0; i < 100; i++) {
          manager.logOperationStart(`concurrent-${thread}-${i}`, { thread, iteration: i });
          manager.logAgentActivity(`Agent${thread}`, `operation ${i}`);
          
          // Simulate some async work
          if (i % 10 === 0) {
            await new Promise(r => setTimeout(r, 1));
          }
        }
        resolve(thread);
      }));
    }

    await Promise.all(promises);

    const concurrentEndTime = performance.now();
    const concurrentEndMemory = process.memoryUsage();
    const concurrentDuration = concurrentEndTime - concurrentStartTime;
    const concurrentMemoryDelta = concurrentEndMemory.heapUsed - concurrentStartMemory.heapUsed;

    results.concurrentTest = {
      duration: Math.round(concurrentDuration * 100) / 100,
      memoryDelta: Math.round(concurrentMemoryDelta / 1024 / 1024 * 100) / 100,
      totalOperations: 1000,
      operationsPerSecond: Math.round(1000 / (concurrentDuration / 1000))
    };

    console.log(`  ✓ Duration: ${results.concurrentTest.duration}ms`);
    console.log(`  ✓ Memory Delta: ${results.concurrentTest.memoryDelta}MB`);
    console.log(`  ✓ Ops/sec: ${results.concurrentTest.operationsPerSecond}`);
    console.log('');

    // Generate recommendations based on results
    console.log('📋 Performance Analysis & Recommendations\n');

    // Analyze results and generate recommendations
    const avgOverhead = results.optimizationImpact.overhead.percentageOverhead;
    if (avgOverhead > 20) {
      results.recommendations.push({
        priority: 'HIGH',
        area: 'Performance Overhead',
        issue: `Logging overhead is ${avgOverhead}% which may impact production performance`,
        recommendation: 'Consider lazy evaluation of log messages and caching optimizations'
      });
    }

    const memoryGrowth = Object.values(results.memoryUsage).map(r => r.memoryDelta);
    const maxMemoryGrowth = Math.max(...memoryGrowth);
    if (maxMemoryGrowth > 10) {
      results.recommendations.push({
        priority: 'MEDIUM',
        area: 'Memory Usage',
        issue: `Maximum memory growth of ${maxMemoryGrowth}MB with large data objects`,
        recommendation: 'Implement metadata size limits and circular reference detection'
      });
    }

    const scalabilityIssues = Object.values(results.scalabilityTests)
      .some(r => r.avgTimePerOperation > 1);
    if (scalabilityIssues) {
      results.recommendations.push({
        priority: 'MEDIUM',
        area: 'Scalability',
        issue: 'Average time per operation increases significantly with load',
        recommendation: 'Consider batching log operations and async processing'
      });
    }

    // Display recommendations
    if (results.recommendations.length > 0) {
      results.recommendations.forEach(rec => {
        console.log(`🔥 ${rec.priority} PRIORITY - ${rec.area}`);
        console.log(`   Issue: ${rec.issue}`);
        console.log(`   Recommendation: ${rec.recommendation}`);
        console.log('');
      });
    } else {
      console.log('✅ No critical performance issues identified!');
    }

    console.log('=' * 80);
    console.log('📊 Performance Analysis Complete\n');

    // Summary
    console.log('📈 Performance Summary:');
    console.log(`   • Logging Overhead: ${results.optimizationImpact.overhead.percentageOverhead}%`);
    console.log(`   • Max Memory Impact: ${maxMemoryGrowth}MB`);
    console.log(`   • Concurrent Performance: ${results.concurrentTest.operationsPerSecond} ops/sec`);
    console.log(`   • Recommendations: ${results.recommendations.length} optimization opportunities`);

    return results;

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return null;
  }
}

// Run the performance test
performanceOptimizationTest().then(async (results) => {
  if (results) {
    console.log('\n🎯 Performance optimization analysis completed successfully!');
    
    // Write results to file for analysis
    const fs = await import('fs');
    fs.writeFileSync(
      './performance-analysis-results.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('📄 Detailed results saved to: performance-analysis-results.json');
  }
  
  process.exit(0);
}).catch(error => {
  console.error('💥 Performance test execution failed:', error);
  process.exit(1);
});