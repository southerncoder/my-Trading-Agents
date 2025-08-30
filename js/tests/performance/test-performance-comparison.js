/**
 * Performance Comparison Test - Original vs Optimized Logging Manager
 * 
 * This test compares the performance of the original LoggingManager with the 
 * new OptimizedLoggingManager to validate optimization improvements.
 */

import { performance } from 'perf_hooks';

async function performanceComparisonTest() {
  console.log('🏁 Starting Performance Comparison Test...\n');
  console.log('=' * 80);

  const results = {
    original: {},
    optimized: {},
    improvement: {}
  };

  try {
    // Import both logging managers
    const { LoggingManager } = await import('../dist/cli/logging-manager.js');
    const { OptimizedLoggingManager } = await import('../dist/cli/optimized-logging-manager.js');

    console.log('📊 Test 1: Basic Performance Comparison\n');

    // Test configuration
    const testSizes = [1000, 5000, 10000];
    const testLevels = ['info', 'debug'];

    for (const level of testLevels) {
      console.log(`Testing ${level.toUpperCase()} level...\n`);
      
      for (const size of testSizes) {
        console.log(`  Running ${size} operations...`);

        // Test Original LoggingManager
        const originalManager = LoggingManager.getInstance();
        originalManager.setVerboseMode(true, level);
        
        const originalStartTime = performance.now();
        const originalStartMemory = process.memoryUsage();

        for (let i = 0; i < size; i++) {
          originalManager.logOperationStart(`original-test-${i}`, { 
            iteration: i, 
            data: 'test-data',
            timestamp: Date.now() 
          });
          
          if (i % 100 === 0) {
            originalManager.logAgentActivity('TestAgent', `processing batch ${i/100}`, { 
              batchSize: 100,
              progress: (i/size) * 100 
            });
          }
        }

        const originalEndTime = performance.now();
        const originalEndMemory = process.memoryUsage();
        const originalDuration = originalEndTime - originalStartTime;
        const originalMemoryDelta = originalEndMemory.heapUsed - originalStartMemory.heapUsed;

        // Small delay to separate tests
        await new Promise(resolve => setTimeout(resolve, 100));

        // Test Optimized LoggingManager
        const optimizedManager = OptimizedLoggingManager.getInstance();
        optimizedManager.setVerboseMode(true, level);
        
        const optimizedStartTime = performance.now();
        const optimizedStartMemory = process.memoryUsage();

        for (let i = 0; i < size; i++) {
          optimizedManager.logOperationStart(`optimized-test-${i}`, { 
            iteration: i, 
            data: 'test-data',
            timestamp: Date.now() 
          });
          
          if (i % 100 === 0) {
            optimizedManager.logAgentActivity('TestAgent', `processing batch ${i/100}`, { 
              batchSize: 100,
              progress: (i/size) * 100 
            });
          }
        }

        // Force flush to get accurate timing
        optimizedManager.forceFlush();
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow async processing

        const optimizedEndTime = performance.now();
        const optimizedEndMemory = process.memoryUsage();
        const optimizedDuration = optimizedEndTime - optimizedStartTime;
        const optimizedMemoryDelta = optimizedEndMemory.heapUsed - optimizedStartMemory.heapUsed;

        // Calculate improvements
        const durationImprovement = ((originalDuration - optimizedDuration) / originalDuration) * 100;
        const memoryImprovement = ((originalMemoryDelta - optimizedMemoryDelta) / originalMemoryDelta) * 100;

        // Store results
        const testKey = `${level}_${size}`;
        results.original[testKey] = {
          duration: Math.round(originalDuration * 100) / 100,
          memory: Math.round(originalMemoryDelta / 1024 / 1024 * 100) / 100,
          opsPerSec: Math.round(size / (originalDuration / 1000))
        };

        results.optimized[testKey] = {
          duration: Math.round(optimizedDuration * 100) / 100,
          memory: Math.round(optimizedMemoryDelta / 1024 / 1024 * 100) / 100,
          opsPerSec: Math.round(size / (optimizedDuration / 1000))
        };

        results.improvement[testKey] = {
          duration: Math.round(durationImprovement * 100) / 100,
          memory: Math.round(memoryImprovement * 100) / 100,
          speedup: Math.round((originalDuration / optimizedDuration) * 100) / 100
        };

        console.log(`    Original:  ${results.original[testKey].duration}ms, ${results.original[testKey].memory}MB`);
        console.log(`    Optimized: ${results.optimized[testKey].duration}ms, ${results.optimized[testKey].memory}MB`);
        console.log(`    Improvement: ${results.improvement[testKey].duration}% faster, ${results.improvement[testKey].speedup}x speedup`);
        console.log('');
      }
    }

    console.log('🚀 Test 2: High-Throughput Stress Test\n');

    // Stress test with 50,000 operations
    const stressTestSize = 50000;
    console.log(`Running stress test with ${stressTestSize} operations...`);

    // Original stress test
    const originalManager = LoggingManager.getInstance();
    originalManager.setVerboseMode(true, 'info');
    
    const originalStressStart = performance.now();
    const originalStressMemStart = process.memoryUsage();

    for (let i = 0; i < stressTestSize; i++) {
      originalManager.logOperationStart(`stress-original-${i}`, { iteration: i });
    }

    const originalStressEnd = performance.now();
    const originalStressMemEnd = process.memoryUsage();

    await new Promise(resolve => setTimeout(resolve, 200));

    // Optimized stress test
    const optimizedManager = OptimizedLoggingManager.getInstance();
    optimizedManager.setVerboseMode(true, 'info');
    
    const optimizedStressStart = performance.now();
    const optimizedStressMemStart = process.memoryUsage();

    for (let i = 0; i < stressTestSize; i++) {
      optimizedManager.logOperationStart(`stress-optimized-${i}`, { iteration: i });
    }

    optimizedManager.forceFlush();
    await new Promise(resolve => setTimeout(resolve, 200));

    const optimizedStressEnd = performance.now();
    const optimizedStressMemEnd = process.memoryUsage();

    const stressResults = {
      original: {
        duration: Math.round((originalStressEnd - originalStressStart) * 100) / 100,
        memory: Math.round((originalStressMemEnd.heapUsed - originalStressMemStart.heapUsed) / 1024 / 1024 * 100) / 100
      },
      optimized: {
        duration: Math.round((optimizedStressEnd - optimizedStressStart) * 100) / 100,
        memory: Math.round((optimizedStressMemEnd.heapUsed - optimizedStressMemStart.heapUsed) / 1024 / 1024 * 100) / 100
      }
    };

    stressResults.improvement = {
      duration: Math.round(((stressResults.original.duration - stressResults.optimized.duration) / stressResults.original.duration) * 100 * 100) / 100,
      memory: Math.round(((stressResults.original.memory - stressResults.optimized.memory) / stressResults.original.memory) * 100 * 100) / 100,
      speedup: Math.round((stressResults.original.duration / stressResults.optimized.duration) * 100) / 100
    };

    console.log(`Original:   ${stressResults.original.duration}ms, ${stressResults.original.memory}MB`);
    console.log(`Optimized:  ${stressResults.optimized.duration}ms, ${stressResults.optimized.memory}MB`);
    console.log(`Improvement: ${stressResults.improvement.duration}% faster, ${stressResults.improvement.speedup}x speedup`);
    console.log(`Memory saved: ${stressResults.improvement.memory}%`);
    console.log('');

    console.log('🎯 Test 3: Feature Toggle Performance\n');

    // Test feature toggle optimization
    const optimizedManagerToggle = OptimizedLoggingManager.getInstance();
    
    // Test disabled logging performance
    optimizedManagerToggle.setVerboseMode(false, 'info');
    
    const disabledStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      optimizedManagerToggle.logOperationStart(`disabled-${i}`, { iteration: i });
      optimizedManagerToggle.logAgentActivity('TestAgent', `operation ${i}`);
    }
    const disabledEnd = performance.now();
    const disabledDuration = disabledEnd - disabledStart;

    // Test enabled logging performance
    optimizedManagerToggle.setVerboseMode(true, 'info');
    
    const enabledStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      optimizedManagerToggle.logOperationStart(`enabled-${i}`, { iteration: i });
      optimizedManagerToggle.logAgentActivity('TestAgent', `operation ${i}`);
    }
    optimizedManagerToggle.forceFlush();
    const enabledEnd = performance.now();
    const enabledDuration = enabledEnd - enabledStart;

    const toggleOverhead = ((enabledDuration - disabledDuration) / disabledDuration) * 100;

    console.log(`Disabled logging: ${Math.round(disabledDuration * 100) / 100}ms`);
    console.log(`Enabled logging:  ${Math.round(enabledDuration * 100) / 100}ms`);
    console.log(`Toggle overhead:  ${Math.round(toggleOverhead * 100) / 100}%`);
    console.log('');

    console.log('=' * 80);
    console.log('📈 Performance Comparison Summary\n');

    // Calculate overall improvements
    const overallDurationImprovement = Object.values(results.improvement)
      .reduce((sum, result) => sum + result.duration, 0) / Object.keys(results.improvement).length;
    
    const overallSpeedup = Object.values(results.improvement)
      .reduce((sum, result) => sum + result.speedup, 0) / Object.keys(results.improvement).length;

    console.log(`🎯 Overall Results:`);
    console.log(`   • Average Duration Improvement: ${Math.round(overallDurationImprovement * 100) / 100}%`);
    console.log(`   • Average Speedup: ${Math.round(overallSpeedup * 100) / 100}x`);
    console.log(`   • Stress Test Improvement: ${stressResults.improvement.duration}% (${stressResults.improvement.speedup}x)`);
    console.log(`   • Memory Improvement: ${stressResults.improvement.memory}%`);
    console.log(`   • Feature Toggle Overhead: ${Math.round(toggleOverhead * 100) / 100}%`);

    // Clean up
    optimizedManager.shutdown();

    return {
      detailed: results,
      stress: stressResults,
      summary: {
        avgDurationImprovement: overallDurationImprovement,
        avgSpeedup: overallSpeedup,
        stressDurationImprovement: stressResults.improvement.duration,
        stressSpeedup: stressResults.improvement.speedup,
        memoryImprovement: stressResults.improvement.memory,
        toggleOverhead: toggleOverhead
      }
    };

  } catch (error) {
    console.error('❌ Performance comparison test failed:', error);
    return null;
  }
}

// Run the comparison test
performanceComparisonTest().then(async (results) => {
  if (results) {
    console.log('\n🎯 Performance comparison completed successfully!');
    
    // Write results to file
    const fs = await import('fs');
    fs.writeFileSync(
      './performance-comparison-results.json', 
      JSON.stringify(results, null, 2)
    );
    console.log('📄 Detailed results saved to: performance-comparison-results.json');
  }
  
  process.exit(0);
}).catch(error => {
  console.error('💥 Performance comparison failed:', error);
  process.exit(1);
});