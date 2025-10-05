/**
 * OpenAI Provider Test
 * 
 * Tests the OpenAI provider integration with best practices
 */

import { ModelProvider } from '../../src/models/provider';
import { LLMProviderFactory } from '../../src/providers/llm-factory';
import { resolveLLMProviderConfig, validateLLMProviderEnv } from '../../src/utils/llm-provider-utils';

async function testOpenAIProvider() {
  console.log('🧪 OpenAI Provider Test Suite\n');

  // Test 1: Environment Variable Resolution
  console.log('Test 1: Environment Variable Resolution');
  try {
    const isAvailable = validateLLMProviderEnv('openai');
    if (isAvailable) {
      const config = resolveLLMProviderConfig('openai');
      console.log('✅ OpenAI provider configured');
      console.log('   Base URL:', config.baseUrl);
      console.log('   API Key:', config.apiKey.substring(0, 10) + '...' + config.apiKey.substring(config.apiKey.length - 4));
    } else {
      console.log('⚠️  OpenAI API key not configured');
      console.log('   Set OPENAI_API_KEY environment variable to continue');
      return;
    }
  } catch (error) {
    console.log('❌ Configuration error:', error instanceof Error ? error.message : String(error));
    return;
  }

  console.log('');

  // Test 2: Factory Helper Method
  console.log('Test 2: Factory Helper Method');
  try {
    const config = ModelProvider.getOpenAIConfig('gpt-4o-mini');
    console.log('✅ Factory helper created config');
    console.log('   Provider:', config.provider);
    console.log('   Model:', config.modelName);
    console.log('   Temperature:', config.temperature);
    console.log('   Max Tokens:', config.maxTokens);
  } catch (error) {
    console.log('❌ Factory helper error:', error instanceof Error ? error.message : String(error));
  }

  console.log('');

  // Test 3: Provider Status
  console.log('Test 3: Provider Status');
  const status = ModelProvider.getProviderStatus();
  console.log('✅ Provider status retrieved');
  console.log('   OpenAI Available:', status.openai.available);
  console.log('   Description:', status.openai.description);

  console.log('');

  // Test 4: Available Models
  console.log('Test 4: Available Models');
  const models = LLMProviderFactory.getAvailableModels('openai');
  console.log('✅ Available models:', models.length);
  models.forEach((model: string) => console.log('   -', model));

  console.log('');

  // Test 5: Model Creation (without API call)
  console.log('Test 5: Model Instance Creation');
  try {
    const config = ModelProvider.getOpenAIConfig('gpt-4o-mini');
    console.log('✅ Model configuration created successfully');
    console.log('   Ready for createModelAsync()');
  } catch (error) {
    console.log('❌ Model creation error:', error instanceof Error ? error.message : String(error));
  }

  console.log('');

  // Test 6: Cost Estimation
  console.log('Test 6: Cost Estimation');
  const cost = LLMProviderFactory.getTokenCost('openai', 'gpt-4o-mini');
  console.log('✅ Cost information retrieved');
  console.log('   Input cost per 1K tokens: $' + cost.input);
  console.log('   Output cost per 1K tokens: $' + cost.output);

  console.log('');

  // Test 7: Validation
  console.log('Test 7: Configuration Validation');
  const config = ModelProvider.getOpenAIConfig('gpt-4o-mini');
  const validation = ModelProvider.validateConfig(config);
  if (validation.isValid) {
    console.log('✅ Configuration is valid');
  } else {
    console.log('❌ Configuration errors:', validation.errors);
  }

  console.log('');

  // Test 8: Connection Test (Optional - requires API key and makes API call)
  console.log('Test 8: Connection Test (Optional)');
  console.log('⏭️  Skipped to avoid API charges');
  console.log('   To test connection, set OPENAI_API_KEY and uncomment test code');
  
  // Uncomment to test actual connection (makes API call):
  // try {
  //   const testConfig = ModelProvider.getOpenAIConfig('gpt-4o-mini');
  //   const result = await ModelProvider.testConnection(testConfig);
  //   if (result.success) {
  //     console.log('✅ Connection test successful');
  //   } else {
  //     console.log('❌ Connection test failed:', result.error);
  //   }
  // } catch (error) {
  //   console.log('❌ Connection test error:', error.message);
  // }

  console.log('');
  console.log('✅ All tests completed!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Set your OPENAI_API_KEY in docker/secrets/openai_api_key.txt');
  console.log('2. Or set OPENAI_API_KEY environment variable');
  console.log('3. Run the trading agents CLI: npm run cli');
  console.log('4. Select "openai" as provider and choose your model');
}

// Run tests
testOpenAIProvider().catch(console.error);
