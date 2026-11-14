#!/usr/bin/env node

/**
 * Test LM Studio Connection
 *
 * Simple script to test the remote LM Studio connection
 */

import { LLMProviderFactory } from './src/providers/llm-factory';
import { LLMProvider } from './src/types/config';

async function testLMStudioConnection() {
  console.log('🧪 Testing LM Studio connection...');

  const config = {
    provider: 'remote_lmstudio' as LLMProvider,
    model: 'mistralai/devstral-small-2507', // Use actual model from LM Studio
    baseUrl: process.env.REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.7,
    maxTokens: 100
  };

  console.log('📍 LM Studio URL:', config.baseUrl);

  try {
    const result = await LLMProviderFactory.testConnection(config);

    if (result) {
      console.log('✅ LM Studio connection successful!');
      process.exit(0);
    } else {
      console.log('❌ LM Studio connection failed - service may not be running');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ LM Studio connection error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testLMStudioConnection();