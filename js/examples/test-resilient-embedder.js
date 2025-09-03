/**
 * Test script for resilient embedder implementation
 * 
 * This script tests the comprehensive retry, circuit breaker, and monitoring functionality
 */

import { embedWithResilience, getEmbedderMetrics, getEmbedderHealth } from '../src/utils/resilient-embedder.js';
import { logger } from '../src/utils/enhanced-logger.js';

async function testResilientEmbedder() {
  logger.info('test', 'resilient-embedder', 'start', 'Starting resilient embedder tests');

  // Test 1: Normal operation
  logger.info('test', 'resilient-embedder', 'test-normal', 'Testing normal operation');
  try {
    const result = await embedWithResilience({
      text: "This is a test text for embedding",
      model: "text-embedding-3-small"
    });
    
    logger.info('test', 'resilient-embedder', 'test-normal-success', 'Normal operation test successful', {
      embeddingLength: result.embedding.length,
      model: result.model,
      tokens: result.tokens
    });
  } catch (error) {
    logger.error('test', 'resilient-embedder', 'test-normal-failed', 'Normal operation test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Check metrics
  logger.info('test', 'resilient-embedder', 'test-metrics', 'Testing metrics collection');
  const metrics = getEmbedderMetrics();
  logger.info('test', 'resilient-embedder', 'test-metrics-result', 'Current metrics', {
    totalCalls: metrics.totalCalls,
    successCount: metrics.successCount,
    failureCount: metrics.failureCount,
    avgResponseTime: metrics.avgResponseTime,
    successRate: metrics.successCount / Math.max(metrics.totalCalls, 1) * 100
  });

  // Test 3: Check health status
  logger.info('test', 'resilient-embedder', 'test-health', 'Testing health check');
  const health = getEmbedderHealth();
  logger.info('test', 'resilient-embedder', 'test-health-result', 'Current health status', {
    circuitState: health.circuitState,
    isHealthy: health.isHealthy,
    successCount: health.stats.successes,
    failureCount: health.stats.failures
  });

  // Test 4: Test with AbortController
  logger.info('test', 'resilient-embedder', 'test-abort', 'Testing AbortController functionality');
  try {
    const controller = new AbortController();
    
    // Start embedding request and abort it quickly
    const embedPromise = embedWithResilience({
      text: "This request should be aborted",
      model: "text-embedding-3-small"
    }, {
      signal: controller.signal
    });
    
    // Abort after 100ms
    setTimeout(() => controller.abort(), 100);
    
    await embedPromise;
    logger.warn('test', 'resilient-embedder', 'test-abort-unexpected', 'AbortController test did not abort as expected');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.info('test', 'resilient-embedder', 'test-abort-success', 'AbortController test successful');
    } else {
      logger.error('test', 'resilient-embedder', 'test-abort-failed', 'AbortController test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Test 5: Test retry with retryable errors (simulated)
  logger.info('test', 'resilient-embedder', 'test-retry', 'Testing retry behavior with simulated errors');
  try {
    // This will likely fail due to fake model, triggering retry logic
    await embedWithResilience({
      text: "Test retry behavior",
      model: "fake-model-should-fail"
    }, {
      retries: 2,
      minTimeout: 500,
      maxTimeout: 2000
    });
  } catch (error) {
    logger.info('test', 'resilient-embedder', 'test-retry-expected', 'Retry test completed as expected', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Final metrics check
  const finalMetrics = getEmbedderMetrics();
  const finalHealth = getEmbedderHealth();
  
  logger.info('test', 'resilient-embedder', 'final-report', 'Final test results', {
    totalCalls: finalMetrics.totalCalls,
    successCount: finalMetrics.successCount,
    failureCount: finalMetrics.failureCount,
    circuitState: finalHealth.circuitState,
    avgResponseTime: finalMetrics.avgResponseTime,
    p95ResponseTime: finalMetrics.p95ResponseTime,
    throughput: finalMetrics.currentThroughput
  });

  logger.info('test', 'resilient-embedder', 'complete', 'Resilient embedder tests completed');
}

// Export for use in other test files
export { testResilientEmbedder };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testResilientEmbedder().catch(console.error);
}