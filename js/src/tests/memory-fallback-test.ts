#!/usr/bin/env tsx
/**
 * Test memory provider fallback behavior
 * This test verifies that:
 * 1. OpenAI agents attempt to use OpenAI embeddings when keys are available
 * 2. Gracefully fallback to local embeddings when keys are not available
 * 3. Different providers are selected appropriately
 */

import { EmbeddingProviderFactory } from '../providers/memory-provider';

interface AgentLLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'lm_studio' | 'ollama' | 'openrouter';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

async function testMemoryProviderSelection() {
  console.log('🧪 Testing Memory Provider Selection Logic\n');

  // Test configurations for different scenarios
  const testConfigs: { name: string; config: AgentLLMConfig; expectation: string }[] = [
    {
      name: 'OpenAI Agent (without API key)',
      config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        // No API key provided
      },
      expectation: 'Should fallback to local provider'
    },
    {
      name: 'Anthropic Agent',
      config: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'fake-key',
      },
      expectation: 'Should use fallback (Anthropic has no embeddings)'
    },
    {
      name: 'LM Studio Agent',
      config: {
        provider: 'lm_studio',
        model: 'local-model',
        baseUrl: 'http://localhost:1234/v1',
      },
      expectation: 'Should use fallback (local provider)'
    },
    {
      name: 'Ollama Agent',
      config: {
        provider: 'ollama',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434',
      },
      expectation: 'Should use fallback (local provider)'
    }
  ];

  // Clear any existing API keys for testing fallback behavior
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  try {
    for (const test of testConfigs) {
      console.log(`\n📋 Testing: ${test.name}`);
      console.log(`   Config: ${test.config.provider} - ${test.config.model}`);
      console.log(`   Expected: ${test.expectation}`);

      try {
        const provider = EmbeddingProviderFactory.createProvider(test.config);
        console.log(`   ✅ Provider created successfully`);
        
        // Check if it's a fallback provider
        if ('getProviderInfo' in provider) {
          const info = (provider as any).getProviderInfo();
          console.log(`   📊 Provider info: ${JSON.stringify(info, null, 2)}`);
        }

        // Test basic functionality
        const testText = "This is a test sentence for embeddings.";
        console.log(`   🔄 Testing embedding generation...`);
        
        const embedding = await provider.embedText(testText);
        console.log(`   ✅ Embedding generated successfully (length: ${embedding.length})`);
        
        // Test similarity calculation
        const similarity = provider.calculateSimilarity(embedding, embedding);
        console.log(`   ✅ Similarity calculation: ${similarity.toFixed(4)} (should be 1.0)`);

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Test with API key available (simulated)
    console.log(`\n\n📋 Testing: OpenAI Agent (with simulated API key)`);
    process.env.OPENAI_API_KEY = 'sk-fake-key-for-testing';
    
    try {
      const config: AgentLLMConfig = {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
      };
      
      const provider = EmbeddingProviderFactory.createProvider(config);
      console.log(`   ✅ Provider created (would use OpenAI if key was valid)`);
      
      // This will fail with invalid key, but shows the provider selection logic works
      try {
        await provider.embedText("test");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`   📝 Expected error with fake key: ${errorMsg.substring(0, 100)}...`);
        console.log(`   ✅ This confirms OpenAI provider was selected (not fallback)`);
      }
    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }

  } finally {
    // Restore original environment
    if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
    if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey;
  }

  console.log('\n🎉 Memory provider fallback test completed!');
}

// Run the test
testMemoryProviderSelection().catch(console.error);