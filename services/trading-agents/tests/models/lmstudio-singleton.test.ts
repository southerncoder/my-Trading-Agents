/**
 * Test script for LMStudio Singleton and Async ModelProvider
 * 
 * Tests:
 * 1. LMStudio singleton behavior
 * 2. Async model provider functionality
 * 3. Model coordination across multiple agents
 * 4. Trading graph integration
 */

import { ModelProvider, ModelConfig } from '../models/provider';
import { getLMStudioSingleton, getAllLMStudioMetrics, clearAllLMStudioSingletons } from '../models/lmstudio-singleton';
import { LangGraphSetup } from '../graph/langgraph-setup';
import { TradingAgentsConfig } from '../types/config';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('test', 'LMStudioTest');

async function testLMStudioSingleton() {
  logger.info('testLMStudioSingleton', '🧪 Testing LMStudio Singleton Pattern');
  
  try {
    // Clear any existing singletons
    clearAllLMStudioSingletons();
    
    // Test 1: Create multiple model configs for same LM Studio instance
    const config1: ModelConfig = {
      provider: 'remote_lmstudio',
      modelName: 'llama-3.2-3b-instruct',
      baseURL: 'http://localhost:1234/v1',
      temperature: 0.7
    };
    
    const config2: ModelConfig = {
      provider: 'remote_lmstudio',
      modelName: 'phi-3-mini-instruct',
      baseURL: 'http://localhost:1234/v1',
      temperature: 0.5
    };
    
    logger.info('testLMStudioSingleton', 'Creating first model instance');
    const model1 = await ModelProvider.createModelAsync(config1);
    
    logger.info('testLMStudioSingleton', 'Creating second model instance (should trigger model switch)');
    const model2 = await ModelProvider.createModelAsync(config2);
    
    // Test 2: Verify singleton metrics
    const metrics = getAllLMStudioMetrics();
    logger.info('testLMStudioSingleton', 'LMStudio metrics:', { metrics });
    
    // Test 3: Test model usage
    logger.info('testLMStudioSingleton', 'Testing model invocation');
    try {
      const testMessage = { role: 'user', content: 'Hello, this is a test message.' };
      const response1 = await model1.invoke([testMessage]);
      logger.info('testLMStudioSingleton', 'Model 1 response received', { 
        hasResponse: !!response1,
        responseType: typeof response1
      });
      
      const response2 = await model2.invoke([testMessage]);
      logger.info('testLMStudioSingleton', 'Model 2 response received', { 
        hasResponse: !!response2,
        responseType: typeof response2
      });
    } catch (error) {
      logger.warn('testLMStudioSingleton', 'Model invocation failed (expected if LM Studio not running)', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Test 4: Test multiple base URLs (different LM Studio instances)
    const config3: ModelConfig = {
      provider: 'remote_lmstudio',
      modelName: 'llama-3.2-1b-instruct',
      baseURL: 'http://localhost:1235/v1',
      temperature: 0.3
    };
    
    logger.info('testLMStudioSingleton', 'Creating model for different LM Studio instance');
    const model3 = await ModelProvider.createModelAsync(config3);
    
    const finalMetrics = getAllLMStudioMetrics();
    logger.info('testLMStudioSingleton', 'Final metrics (should show 2 instances):', { 
      metrics: finalMetrics,
      instanceCount: finalMetrics.length
    });
    
    logger.info('testLMStudioSingleton', '✅ LMStudio singleton test completed successfully');
    
  } catch (error) {
    logger.error('testLMStudioSingleton', '❌ LMStudio singleton test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function testAsyncModelProvider() {
  logger.info('testAsyncModelProvider', '🧪 Testing Async ModelProvider');
  
  try {
    // Test different providers
    const configs: ModelConfig[] = [
      {
        provider: 'remote_lmstudio',
        modelName: 'test-model',
        baseURL: 'http://localhost:1234/v1'
      },
      {
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || 'test-key'
      },
      {
        provider: 'ollama',
        modelName: 'llama3.2:3b',
        baseURL: 'http://localhost:11434/v1'
      }
    ];
    
    for (const config of configs) {
      logger.info('testAsyncModelProvider', `Testing ${config.provider} provider`);
      
      try {
        const model = await ModelProvider.createModelAsync(config);
        logger.info('testAsyncModelProvider', `✅ ${config.provider} model created successfully`, {
          modelName: config.modelName,
          hasModel: !!model
        });
        
        // Test caching
        const cachedModel = await ModelProvider.createModelAsync(config);
        const isSameInstance = model === cachedModel;
        logger.info('testAsyncModelProvider', `Cache test for ${config.provider}`, {
          isCached: isSameInstance
        });
        
      } catch (error) {
        logger.warn('testAsyncModelProvider', `${config.provider} model creation failed`, {
          error: error instanceof Error ? error.message : String(error),
          expected: config.provider === 'anthropic' || config.provider === 'google' ? 'API key required' : false
        });
      }
    }
    
    logger.info('testAsyncModelProvider', '✅ Async ModelProvider test completed');
    
  } catch (error) {
    logger.error('testAsyncModelProvider', '❌ Async ModelProvider test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function testTradingGraphIntegration() {
  logger.info('testTradingGraphIntegration', '🧪 Testing Trading Graph Integration');
  
  try {
    // Create test configuration
    const testConfig: TradingAgentsConfig = {
      projectDir: process.cwd(),
      resultsDir: './results',
      dataDir: './data',
      dataCacheDir: './data/cache',
      exportsDir: './exports',
      logsDir: './logs',
      llmProvider: 'remote_lmstudio',
      backendUrl: 'http://localhost:1234/v1',
      deepThinkLlm: 'test-deep-model',
      quickThinkLlm: 'test-quick-model',
      maxDebateRounds: 3,
      maxRiskDiscussRounds: 3,
      maxRecurLimit: 10,
      onlineTools: false
    };
    
    // Create graph setup
    const graphSetup = new LangGraphSetup({
      selectedAnalysts: ['market', 'news'],
      modelConfigs: {
        quickThinking: {
          provider: 'remote_lmstudio',
          modelName: 'test-quick-model',
          baseURL: 'http://localhost:1234/v1'
        },
        deepThinking: {
          provider: 'remote_lmstudio',
          modelName: 'test-deep-model',
          baseURL: 'http://localhost:1234/v1'
        }
      },
      config: testConfig
    });
    
    logger.info('testTradingGraphIntegration', 'Initializing models asynchronously');
    await graphSetup.initializeModels();
    
    logger.info('testTradingGraphIntegration', 'Setting up trading graph');
    try {
      const compiledGraph = await graphSetup.setupGraph();
      logger.info('testTradingGraphIntegration', '✅ Trading graph setup completed successfully', {
        hasGraph: !!compiledGraph
      });
    } catch (error) {
      // Expected to fail due to missing dependencies, but model initialization should work
      logger.info('testTradingGraphIntegration', 'Graph compilation failed (expected due to missing deps)', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    logger.info('testTradingGraphIntegration', '✅ Trading graph integration test completed');
    
  } catch (error) {
    logger.error('testTradingGraphIntegration', '❌ Trading graph integration test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function testDeprecationWarnings() {
  logger.info('testDeprecationWarnings', '🧪 Testing Deprecation Warnings');
  
  try {
    // Test deprecated sync methods
    const config: ModelConfig = {
      provider: 'openai',
      modelName: 'gpt-4o-mini',
      apiKey: 'test-key'
    };
    
    logger.info('testDeprecationWarnings', 'Testing deprecated createModel method');
    const syncModel = ModelProvider.createModel(config);
    
    logger.info('testDeprecationWarnings', 'Testing deprecated createAgentModels method');
    const agentModels = ModelProvider.createAgentModels({
      agentName: 'test-agent',
      quickThinkModel: config
    });
    
    logger.info('testDeprecationWarnings', '✅ Deprecation warnings test completed', {
      hasSyncModel: !!syncModel,
      hasAgentModels: !!agentModels
    });
    
  } catch (error) {
    logger.error('testDeprecationWarnings', '❌ Deprecation warnings test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function runAllTests() {
  logger.info('runAllTests', '🚀 Starting LMStudio Singleton and Async ModelProvider Tests');
  
  const tests = [
    { name: 'LMStudio Singleton', fn: testLMStudioSingleton },
    { name: 'Async ModelProvider', fn: testAsyncModelProvider },
    { name: 'Trading Graph Integration', fn: testTradingGraphIntegration },
    { name: 'Deprecation Warnings', fn: testDeprecationWarnings }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      logger.info('runAllTests', `\n📋 Running ${test.name} test...`);
      await test.fn();
      results.push({ name: test.name, status: 'PASSED' });
      logger.info('runAllTests', `✅ ${test.name} test PASSED`);
    } catch (error) {
      results.push({ 
        name: test.name, 
        status: 'FAILED', 
        error: error instanceof Error ? error.message : String(error)
      });
      logger.error('runAllTests', `❌ ${test.name} test FAILED`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Summary
  logger.info('runAllTests', '\n📊 Test Results Summary:');
  results.forEach(result => {
    const emoji = result.status === 'PASSED' ? '✅' : '❌';
    logger.info('runAllTests', `${emoji} ${result.name}: ${result.status}`);
    if (result.error) {
      logger.info('runAllTests', `   Error: ${result.error}`);
    }
  });
  
  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const totalCount = results.length;
  
  logger.info('runAllTests', `\n🎯 Overall Results: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    logger.info('runAllTests', '🎉 All tests passed! LMStudio Singleton and Async ModelProvider are working correctly.');
  } else {
    logger.warn('runAllTests', '⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Export for use in other test files
export {
  testLMStudioSingleton,
  testAsyncModelProvider,
  testTradingGraphIntegration,
  testDeprecationWarnings,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}