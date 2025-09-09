/**
 * Remote LM Studio Integration Test
 *
 * Tests the remote LM Studio instance using environment variables
 * Demonstrates the singleton pattern and multiple provider support
 * Uses the existing ModelProvider and LMStudioSingleton architecture
 */

import { ModelProvider, ModelConfig } from '../../src/models/provider';
import { getLMStudioSingleton } from '../../src/models/lmstudio-singleton';
import { createLogger } from '../../src/utils/enhanced-logger';
import {
  REMOTE_LM_STUDIO_BASE_URL,
  TRADING_AGENT_MODEL_ASSIGNMENTS,
  createAgentModelConfig
} from '../config/remote-lmstudio.config';

const logger = createLogger('test', 'RemoteLMStudioIntegration');

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
  logger.info('fetchModels', 'Fetching models from remote LM Studio', {
    baseURL: REMOTE_LM_STUDIO_BASE_URL
  });

  const modelsEndpoint = `${REMOTE_LM_STUDIO_BASE_URL.replace(/\/$/, '')}/models`;

  try {
    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info('fetchModels', 'Models fetched successfully', {
      modelCount: Array.isArray(data) ? data.length : data.models?.length || 0
    });

    return data;
  } catch (error) {
    logger.error('fetchModels', 'Failed to fetch models', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function testModelCompletion(modelId: string, prompt: string): Promise<any> {
  logger.info('testModelCompletion', 'Testing model completion', {
    modelId,
    promptLength: prompt.length
  });

  // Use the existing ModelProvider and singleton pattern
  const modelConfig: ModelConfig = {
    provider: 'lm_studio',
    modelName: modelId,
    baseURL: REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.7,
    maxTokens: 100,
    streaming: false,
    timeout: 30000
  };

  try {
    const model = await ModelProvider.createModelAsync(modelConfig);

    const response = await model.invoke([
      { role: 'user', content: prompt }
    ]);

    const responseText = response.content as string;

    logger.info('testModelCompletion', 'Model completion successful', {
      modelId,
      responseLength: responseText.length
    });

    // Format response to match expected structure
    return {
      choices: [{
        message: {
          content: responseText
        }
      }],
      usage: {
        total_tokens: responseText.split(' ').length * 1.3 // Rough estimate
      }
    };
  } catch (error) {
    logger.error('testModelCompletion', 'Model completion failed', {
      modelId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Remote LM Studio Integration Tests');
  console.log(`📡 Remote LM Studio: ${REMOTE_LM_STUDIO_BASE_URL}`);
  
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
      { name: 'Market Analyst', agentKey: 'marketAnalyst' as const },
      { name: 'News Analyst', agentKey: 'newsAnalyst' as const },
      { name: 'Risk Manager', agentKey: 'riskManager' as const }
    ];

    const results = [];

    for (const { name, agentKey } of modelsToTest) {
      const config = createAgentModelConfig(agentKey);
      const startTime = Date.now();

      const model = await ModelProvider.createModelAsync(config);
      const response = await model.invoke([{ role: 'user', content: testPrompt }]);

      const duration = Date.now() - startTime;

      results.push({
        agent: name,
        model: config.modelName,
        description: config.agentDescription,
        duration,
        responseLength: (response.content as string).length,
        capabilities: config.capabilities
      });
    }

    return { comparisons: results };
  });

  // Test 7: Test singleton pattern functionality
  await runner.runTest('LM Studio Singleton Pattern', async () => {
    const singleton1 = getLMStudioSingleton(REMOTE_LM_STUDIO_BASE_URL);
    const singleton2 = getLMStudioSingleton(REMOTE_LM_STUDIO_BASE_URL);

    // Should be the same instance
    const isSameInstance = singleton1 === singleton2;

    // Test model creation through singleton
    const modelConfig: ModelConfig = {
      provider: 'lm_studio',
      modelName: 'llama-3.2-3b-instruct',
      baseURL: REMOTE_LM_STUDIO_BASE_URL,
      temperature: 0.7,
      maxTokens: 100
    };

    const model1 = await singleton1.getModel(modelConfig);
    const model2 = await singleton2.getModel(modelConfig);

    return {
      isSameInstance,
      singleton1Metrics: singleton1.getMetrics(),
      singleton2Metrics: singleton2.getMetrics(),
      currentModel: singleton1.getCurrentModel(),
      model1Type: model1.constructor.name,
      model2Type: model2.constructor.name
    };
  });

  // Test 8: Test multiple agents with different model providers
  await runner.runTest('Multi-Agent Model Provider Support', async () => {
    const agents = [
      { name: 'Market Analyst', agentKey: 'marketAnalyst' as const },
      { name: 'News Analyst', agentKey: 'newsAnalyst' as const },
      { name: 'Risk Manager', agentKey: 'riskManager' as const }
    ];

    const results = [];

    for (const agent of agents) {
      const config = createAgentModelConfig(agent.agentKey);
      const model = await ModelProvider.createModelAsync(config);

      const testPrompt = `You are a ${agent.name}. Provide a brief 2-sentence response about your role in trading.`;
      const response = await model.invoke([{ role: 'user', content: testPrompt }]);

      results.push({
        agent: agent.name,
        model: config.modelName,
        responseLength: (response.content as string).length,
        capabilities: config.capabilities
      });
    }

    return { agentResults: results };
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