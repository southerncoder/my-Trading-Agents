/**
 import {
  REMOTE_LMSTUDIO_BASE_URL,
  TRADING_AGENT_MODEL_ASSIGNMENTS,
  MODEL_PERFORMANCE_PROFILES
} from '../../config/remote-lmstudio.config';ple Remote LM Studio Test
 * 
 * Basic connectivity and model testing for remote LM Studio at ${REMOTE_LM_STUDIO_BASE_URL}
 */

import {
  REMOTE_LMSTUDIO_BASE_URL,
  TRADING_AGENT_MODEL_ASSIGNMENTS,
  MODEL_PERFORMANCE_PROFILES
} from '../config/remote-lmstudio.config';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  data?: any;
}

class SimpleTestRunner {
  private results: TestResult[] = [];

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`\n🧪 Testing: ${name}...`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration, data: result });
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      
      if (result && typeof result === 'object') {
        console.log(`   📊 Result:`, result);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, duration, error: errorMsg });
      console.log(`❌ ${name} - FAILED (${duration}ms): ${errorMsg}`);
    }
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      total,
      passed,
      failed,
      success: failed === 0,
      totalDuration,
      results: this.results
    };
  }
}

async function fetchModels(): Promise<any> {
  console.log(`🔍 Fetching models from: ${REMOTE_LMSTUDIO_BASE_URL}/models`);
  const response = await fetch(`${REMOTE_LMSTUDIO_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`📦 Raw response:`, data);
  return data;
}

async function testModelCompletion(modelId: string, prompt: string): Promise<any> {
  console.log(`🤖 Testing model: ${modelId} with prompt: "${prompt.substring(0, 50)}..."`);
  const response = await fetch(`${REMOTE_LMSTUDIO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`📝 Completion response:`, data);
  return data;
}

async function main(): Promise<void> {
  console.log('🚀 Starting Remote LM Studio Integration Tests');
  console.log(`📡 Remote LM Studio: ${REMOTE_LMSTUDIO_BASE_URL}`);
  
  const runner = new SimpleTestRunner();

  // Test 1: Basic connectivity
  await runner.runTest('Remote LM Studio Connectivity', async () => {
    const models = await fetchModels();
    if (!models.data || !Array.isArray(models.data)) {
      throw new Error('Invalid models response format');
    }
    return { modelCount: models.data.length, models: models.data.map((m: any) => m.id) };
  });

  // Test 2: Validate model assignments exist
  await runner.runTest('Model Assignments Validation', async () => {
    const models = await fetchModels();
    const availableModels = models.data.map((m: any) => m.id);
    const assignedModelNames = Object.values(TRADING_AGENT_MODEL_ASSIGNMENTS).map(config => config.modelName);
    
    const missingModels = assignedModelNames.filter(model => !availableModels.includes(model));
    
    if (missingModels.length > 0) {
      throw new Error(`Missing assigned models: ${missingModels.join(', ')}`);
    }
    
    return { 
      availableModels: availableModels.length,
      assignedModels: assignedModelNames.length,
      allModelsAvailable: true
    };
  });

  // Test 3: Test specific model for market analysis
  await runner.runTest('Market Analyst Model Test', async () => {
    const modelConfig = TRADING_AGENT_MODEL_ASSIGNMENTS.marketAnalyst;
    const prompt = "Analyze the current market conditions for tech stocks. Provide a brief summary.";
    
    const response = await testModelCompletion(modelConfig.modelName, prompt);
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid completion response format');
    }
    
    const content = response.choices[0].message.content;
    return {
      model: modelConfig.modelName,
      description: modelConfig.description,
      responseLength: content.length,
      hasContent: content.length > 0,
      usage: response.usage
    };
  });

  // Test 4: Test reasoning model
  await runner.runTest('Reasoning Model Test (Phi-4)', async () => {
    const modelConfig = TRADING_AGENT_MODEL_ASSIGNMENTS.fundamentalsAnalyst;
    const prompt = "If a company's P/E ratio is 25 and the industry average is 15, what does this suggest about the stock's valuation?";
    
    const response = await testModelCompletion(modelConfig.modelName, prompt);
    const content = response.choices[0].message.content;
    
    return {
      model: modelConfig.modelName,
      description: modelConfig.description,
      responseLength: content.length,
      hasReasoningIndicators: content.toLowerCase().includes('higher') || content.toLowerCase().includes('expensive'),
      usage: response.usage
    };
  });

  // Test 5: Test creative/uncensored model
  await runner.runTest('Creative Model Test (Dolphin)', async () => {
    const modelConfig = TRADING_AGENT_MODEL_ASSIGNMENTS.socialAnalyst;
    const prompt = "Generate 3 creative trading strategies for a volatile cryptocurrency market.";
    
    const response = await testModelCompletion(modelConfig.modelName, prompt);
    const content = response.choices[0].message.content;
    
    return {
      model: modelConfig.modelName,
      description: modelConfig.description,
      responseLength: content.length,
      hasCreativeElements: content.toLowerCase().includes('strategy') || content.toLowerCase().includes('creative'),
      usage: response.usage
    };
  });

  // Test 6: Performance comparison
  await runner.runTest('Model Performance Comparison', async () => {
    const testPrompt = "What are the key factors to consider when evaluating a stock for investment?";
    const modelsToTest = [
      { name: 'Market Analyst', config: TRADING_AGENT_MODEL_ASSIGNMENTS.marketAnalyst },
      { name: 'News Analyst', config: TRADING_AGENT_MODEL_ASSIGNMENTS.newsAnalyst },
      { name: 'Risk Manager', config: TRADING_AGENT_MODEL_ASSIGNMENTS.riskManager }
    ];

    const results = [];
    
    for (const { name, config } of modelsToTest) {
      const startTime = Date.now();
      const response = await testModelCompletion(config.modelName, testPrompt);
      const duration = Date.now() - startTime;
      
      results.push({
        agent: name,
        model: config.modelName,
        description: config.description,
        duration,
        responseLength: response.choices[0].message.content.length,
        tokens: response.usage?.total_tokens || 0
      });
    }
    
    return { comparisons: results };
  });

  // Print final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 REMOTE LM STUDIO INTEGRATION TEST SUMMARY');
  console.log('='.repeat(70));
  
  const summary = runner.getSummary();
  
  console.log(`📊 Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⏱️  Total Duration: ${summary.totalDuration}ms`);
  console.log(`🎉 Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  
  if (summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    summary.results
      .filter(r => !r.passed)
      .forEach(r => console.log(`   • ${r.name}: ${r.error}`));
  }
  
  if (summary.success) {
    console.log('\n🎉 All tests passed! Remote LM Studio integration is working correctly.');
    console.log('🤖 Models are properly assigned and responding as expected.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  process.exit(summary.success ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});

export { main as runSimpleRemoteLMStudioTests };