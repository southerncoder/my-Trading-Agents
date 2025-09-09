/**
 * LM Studio Architecture Demonstration
 *
 * Shows how the singleton pattern and multiple provider support work
 * Uses local LM Studio as example since remote server is not accessible
 */

import { ModelProvider, ModelConfig } from '../../src/models/provider';
import { getLMStudioSingleton } from '../../src/models/lmstudio-singleton';
import { createLogger } from '../../src/utils/enhanced-logger';

const logger = createLogger('test', 'LMStudioArchitectureDemo');

/**
 * Configuration for local LM Studio (fallback when remote is unavailable)
 */
const LOCAL_LM_STUDIO_CONFIG: ModelConfig = {
  provider: 'lm_studio',
  modelName: 'llama-3.2-3b-instruct',
  baseURL: 'http://localhost:1234/v1',
  temperature: 0.7,
  maxTokens: 1000,
  streaming: false,
  timeout: 30000
};

/**
 * Configuration for Ollama (alternative local provider)
 */
const OLLAMA_CONFIG: ModelConfig = {
  provider: 'ollama',
  modelName: 'llama3.2:3b',
  baseURL: 'http://localhost:11434/v1',
  temperature: 0.7,
  maxTokens: 1000,
  streaming: false,
  timeout: 30000
};

/**
 * Configuration for remote LM Studio (when available via environment variables)
 */
const REMOTE_LM_STUDIO_CONFIG: ModelConfig = {
  provider: 'lm_studio',
  modelName: 'llama-3.2-3b-instruct',
  baseURL: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
  temperature: 0.7,
  maxTokens: 1000,
  streaming: false,
  timeout: 30000
};

/**
 * Test the singleton pattern functionality
 */
async function demonstrateSingletonPattern(): Promise<void> {
  logger.info('demonstrateSingletonPattern', '=== Demonstrating LM Studio Singleton Pattern ===');

  console.log('\n🔄 Testing Singleton Pattern:');
  console.log('Creating multiple singleton instances for the same base URL...');

  // Create multiple singleton instances for the same base URL
  const singleton1 = getLMStudioSingleton(LOCAL_LM_STUDIO_CONFIG.baseURL);
  const singleton2 = getLMStudioSingleton(LOCAL_LM_STUDIO_CONFIG.baseURL);
  const singleton3 = getLMStudioSingleton(LOCAL_LM_STUDIO_CONFIG.baseURL);

  // They should all be the same instance
  const isSameInstance = singleton1 === singleton2 && singleton2 === singleton3;

  console.log(`✅ Same instance check: ${isSameInstance ? 'PASSED' : 'FAILED'}`);
  console.log(`📊 Singleton metrics:`, singleton1.getMetrics());

  // Create different singletons for different base URLs
  const remoteSingleton = getLMStudioSingleton(REMOTE_LM_STUDIO_CONFIG.baseURL);
  const isDifferentInstance = singleton1 !== remoteSingleton;

  console.log(`✅ Different base URL instances: ${isDifferentInstance ? 'PASSED' : 'FAILED'}`);
  console.log(`📊 Remote singleton metrics:`, remoteSingleton.getMetrics());

  // Test model creation through singleton
  try {
    console.log('\n🤖 Testing model creation through singleton...');
    const model1 = await singleton1.getModel(LOCAL_LM_STUDIO_CONFIG);
    const model2 = await singleton2.getModel(LOCAL_LM_STUDIO_CONFIG);

    console.log(`✅ Model creation successful:`);
    console.log(`   Model 1 type: ${model1.constructor.name}`);
    console.log(`   Model 2 type: ${model2.constructor.name}`);
    console.log(`   Current model: ${singleton1.getCurrentModel()}`);

  } catch (error) {
    console.log(`⚠️  Model creation failed (expected if LM Studio not running): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Demonstrate multiple provider support
 */
async function demonstrateMultipleProviders(): Promise<void> {
  logger.info('demonstrateMultipleProviders', '=== Demonstrating Multiple Provider Support ===');

  console.log('\n🔧 Testing Multiple Provider Support:');
  console.log('Each agent can use its own model provider and configuration...');

  const agentConfigs = [
    {
      name: 'Market Analyst Agent',
      config: LOCAL_LM_STUDIO_CONFIG,
      description: 'Uses LM Studio for market analysis'
    },
    {
      name: 'News Sentiment Agent',
      config: OLLAMA_CONFIG,
      description: 'Uses Ollama for news processing'
    },
    {
      name: 'Risk Assessment Agent',
      config: LOCAL_LM_STUDIO_CONFIG, // Could use different model
      description: 'Uses LM Studio for risk calculations'
    }
  ];

  for (const agent of agentConfigs) {
    console.log(`\n🤖 ${agent.name}:`);
    console.log(`   Provider: ${agent.config.provider}`);
    console.log(`   Model: ${agent.config.modelName}`);
    console.log(`   Base URL: ${agent.config.baseURL}`);
    console.log(`   Description: ${agent.description}`);

    try {
      const model = await ModelProvider.createModelAsync(agent.config);
      console.log(`   ✅ Model created successfully (${model.constructor.name})`);
    } catch (error) {
      console.log(`   ⚠️  Model creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Demonstrate agent-specific model configurations
 */
async function demonstrateAgentConfigurations(): Promise<void> {
  logger.info('demonstrateAgentConfigurations', '=== Demonstrating Agent-Specific Configurations ===');

  console.log('\n🎯 Testing Agent-Specific Model Configurations:');
  console.log('Different agents can have different model settings...');

  const agentConfigurations = [
    {
      agentName: 'marketAnalyst',
      config: {
        ...LOCAL_LM_STUDIO_CONFIG,
        temperature: 0.3, // Conservative for market analysis
        maxTokens: 500,
        timeout: 15000
      },
      useCase: 'Conservative market analysis with focused responses'
    },
    {
      agentName: 'socialAnalyst',
      config: {
        ...OLLAMA_CONFIG,
        temperature: 0.8, // Creative for social analysis
        maxTokens: 800,
        timeout: 20000
      },
      useCase: 'Creative social sentiment analysis'
    },
    {
      agentName: 'riskManager',
      config: {
        ...LOCAL_LM_STUDIO_CONFIG,
        temperature: 0.1, // Very conservative for risk
        maxTokens: 300,
        timeout: 10000
      },
      useCase: 'Conservative risk assessment with quick responses'
    }
  ];

  for (const agent of agentConfigurations) {
    console.log(`\n🎯 ${agent.agentName}:`);
    console.log(`   Temperature: ${agent.config.temperature}`);
    console.log(`   Max Tokens: ${agent.config.maxTokens}`);
    console.log(`   Timeout: ${agent.config.timeout}ms`);
    console.log(`   Use Case: ${agent.useCase}`);

    try {
      const model = await ModelProvider.createModelAsync(agent.config);
      console.log(`   ✅ Agent model configured successfully`);
    } catch (error) {
      console.log(`   ⚠️  Agent model configuration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Show how to configure for remote LM Studio when available
 */
function showRemoteConfiguration(): void {
  console.log('\n🌐 Remote LM Studio Configuration:');
  console.log('When the remote server is available via environment variables:');

  console.log('\n📝 Environment Variables:');
  console.log('   REMOTE_LM_STUDIO_URL=<your-remote-lm-studio-url>');
  console.log('   LM_STUDIO_ADMIN_URL=<your-remote-admin-url>');

  console.log('\n🔧 Model Provider Configuration:');
  console.log(`   Provider: ${REMOTE_LM_STUDIO_CONFIG.provider}`);
  console.log(`   Base URL: ${REMOTE_LM_STUDIO_CONFIG.baseURL}`);
  console.log(`   Model: ${REMOTE_LM_STUDIO_CONFIG.modelName}`);

  console.log('\n🚀 Usage in Code:');
  console.log(`   const model = await ModelProvider.createModelAsync(${JSON.stringify(REMOTE_LM_STUDIO_CONFIG, null, 2)});`);

  console.log('\n🔄 Singleton Pattern with Remote:');
  console.log('   const singleton = getLMStudioSingleton(process.env.REMOTE_LM_STUDIO_URL);');
  console.log('   const model = await singleton.getModel(remoteConfig);');
}

/**
 * Main demonstration function
 */
async function runArchitectureDemo(): Promise<void> {
  console.log('🚀 LM Studio Architecture Demonstration');
  console.log('=' .repeat(50));
  console.log('This demo shows the singleton pattern and multiple provider support');
  console.log('Note: Remote server configuration available via environment variables');
  console.log('Using local configurations for demonstration purposes\n');

  try {
    // Demonstrate singleton pattern
    await demonstrateSingletonPattern();

    // Demonstrate multiple providers
    await demonstrateMultipleProviders();

    // Demonstrate agent configurations
    await demonstrateAgentConfigurations();

    // Show remote configuration
    showRemoteConfiguration();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Architecture Demonstration Complete');
    console.log('\n📋 Key Points Demonstrated:');
    console.log('   • Singleton pattern ensures one LM Studio instance per base URL');
    console.log('   • Multiple providers (LM Studio, Ollama, OpenAI, etc.) supported');
    console.log('   • Each agent can have its own model provider and configuration');
    console.log('   • Remote LM Studio configuration ready when server is accessible');
    console.log('   • Proper error handling when services are unavailable');

  } catch (error) {
    logger.error('runArchitectureDemo', 'Demo failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`\n❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export for use in other files
export {
  LOCAL_LM_STUDIO_CONFIG,
  OLLAMA_CONFIG,
  REMOTE_LM_STUDIO_CONFIG,
  demonstrateSingletonPattern,
  demonstrateMultipleProviders,
  demonstrateAgentConfigurations,
  showRemoteConfiguration,
  runArchitectureDemo
};

// Run demo if this file is executed directly
if (require.main === module) {
  runArchitectureDemo().catch(console.error);
}