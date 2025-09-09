/**
 * LM Studio Load Testing
 *
 * Tests LM Studio singleton behavior under concurrent load
 */

import 'dotenv/config';
import { config } from 'dotenv';

// Load environment configuration
config({ path: '.env.local' });

class LMStudioLoadTester {
  constructor() {
    this.baseUrl = process.env.LM_STUDIO_BASE_URL || process.env.OPENAI_BASE_URL || 'http://localhost:1234/v1';
    this.results = [];
  }

  async runLoadTest(concurrentRequests = 5, requestsPerBatch = 10) {
    console.log(`🚀 Starting LM Studio Load Test...`);
    console.log(`📊 Configuration:`);
    console.log(`   - Base URL: ${this.baseUrl}`);
    console.log(`   - Concurrent Requests: ${concurrentRequests}`);
    console.log(`   - Requests per Batch: ${requestsPerBatch}`);
    console.log(`   - Total Requests: ${concurrentRequests * requestsPerBatch}`);

    const testPrompts = [
      "What is the current price of AAPL stock?",
      "Analyze the market sentiment for technology sector",
      "What are the key factors affecting NVIDIA's stock price?",
      "Provide a brief analysis of the current economic indicators",
      "What is the trading volume for Microsoft today?"
    ];

    // Test basic connectivity first
    console.log(`🔗 Testing basic connectivity...`);
    const connectivityTest = await this.testBasicConnectivity();
    if (!connectivityTest) {
      console.error('❌ Basic connectivity test failed. Aborting load test.');
      return;
    }

    console.log(`✅ Basic connectivity confirmed`);

    // Run concurrent load test
    console.log(`\n🔥 Starting concurrent load test...`);
    await this.runConcurrentTest(concurrentRequests, requestsPerBatch, testPrompts);

    // Analyze results
    this.analyzeResults();
  }

  async testBasicConnectivity() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Basic connectivity test failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async runConcurrentTest(concurrentRequests, requestsPerBatch, testPrompts) {
    const promises = [];

    for (let batch = 0; batch < requestsPerBatch; batch++) {
      for (let req = 0; req < concurrentRequests; req++) {
        const requestId = batch * concurrentRequests + req;
        const prompt = testPrompts[requestId % testPrompts.length];

        promises.push(this.makeRequest(requestId, prompt));
      }

      // Small delay between batches to avoid overwhelming
      if (batch < requestsPerBatch - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Wait for all requests to complete
    await Promise.allSettled(promises);
  }

  async makeRequest(requestId, prompt) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log(`🔄 Making request ${requestId} to: ${this.baseUrl}/chat/completions`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'dummy-key'}`
        },
        body: JSON.stringify({
          model: 'local-model', // LM Studio will use whatever model is loaded
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();

      console.log(`📥 Request ${requestId} - Status: ${response.status}, OK: ${response.ok}`);

      let responseSize = 0;
      if (response.ok) {
        const responseText = await response.text();
        responseSize = responseText.length;
        console.log(`📤 Request ${requestId} - Response size: ${responseSize} bytes`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Request ${requestId} - Error response: ${errorText}`);
      }

      this.results.push({
        requestId,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: response.ok,
        responseSize
      });

      if (requestId % 10 === 0) {
        console.log(`📊 Completed request ${requestId}`);
      }

    } catch (error) {
      const endTime = Date.now();
      console.log(`💥 Request ${requestId} failed with error:`, error);

      this.results.push({
        requestId,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  analyzeResults() {
    console.log(`\n📊 LOAD TEST RESULTS ANALYSIS`);
    console.log(`============================================================`);

    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   - Total Requests: ${totalRequests}`);
    console.log(`   - Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   - Failed: ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(1)}%)`);

    if (successfulRequests > 0) {
      const durations = this.results.filter(r => r.success).map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      console.log(`\n⏱️  Performance Metrics:`);
      console.log(`   - Average Response Time: ${avgDuration.toFixed(0)}ms`);
      console.log(`   - Min Response Time: ${minDuration}ms`);
      console.log(`   - Max Response Time: ${maxDuration}ms`);

      const responseSizes = this.results.filter(r => r.success && r.responseSize).map(r => r.responseSize);
      if (responseSizes.length > 0) {
        const avgResponseSize = responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length;
        console.log(`   - Average Response Size: ${(avgResponseSize / 1024).toFixed(2)} KB`);
      }
    }

    // Check for singleton behavior (consistent response times)
    if (successfulRequests > 5) {
      const durations = this.results.filter(r => r.success).map(r => r.duration);
      const variance = this.calculateVariance(durations);
      const stdDev = Math.sqrt(variance);

      console.log(`\n🎯 Singleton Behavior Analysis:`);
      console.log(`   - Response Time Variance: ${variance.toFixed(0)}ms²`);
      console.log(`   - Standard Deviation: ${stdDev.toFixed(0)}ms`);

      if (stdDev < 1000) {
        console.log(`   ✅ Good singleton behavior - consistent response times`);
      } else if (stdDev < 3000) {
        console.log(`   ⚠️ Moderate variance - some request queuing may be occurring`);
      } else {
        console.log(`   ❌ High variance - potential concurrency issues`);
      }
    }

    // Error analysis
    if (failedRequests > 0) {
      console.log(`\n❌ Error Analysis:`);
      const errors = this.results.filter(r => !r.success);
      console.log(`First few errors:`);
      errors.slice(0, 3).forEach((error, index) => {
        console.log(`   Error ${index + 1}: ${error.error}`);
      });

      const errorTypes = errors.reduce((acc, error) => {
        const errorType = error.error?.split(':')[0] || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});

      console.log(`Error types:`);
      Object.entries(errorTypes).forEach(([errorType, count]) => {
        console.log(`   - ${errorType}: ${count} occurrences`);
      });
    }

    console.log(`\n🏁 LOAD TEST COMPLETED`);

    if (successfulRequests / totalRequests > 0.8) {
      console.log(`🎉 LM Studio load test PASSED - good performance under concurrent load`);
    } else {
      console.log(`⚠️  LM Studio load test FAILED - poor performance under concurrent load`);
    }
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  }
}

// Run the load test
async function main() {
  const tester = new LMStudioLoadTester();

  // Run with moderate load: 3 concurrent requests, 5 batches = 15 total requests
  await tester.runLoadTest(3, 5);
}

main().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});