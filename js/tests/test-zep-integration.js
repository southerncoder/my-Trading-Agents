#!/usr/bin/env node

/**
 * Integration test for the official Zep Graphiti service
 * Tests basic connectivity and API compatibility
 */

import { ZepGraphitiMemoryProvider } from '../dist/providers/zep-graphiti-memory-provider.js';

async function testZepGraphitiIntegration() {
  console.log('🧪 Testing Official Zep Graphiti Integration...\n');

  try {
    // Create memory provider with default configuration
    const config = {
      sessionId: 'test-session-' + Date.now(),
      serviceUrl: 'http://localhost:8000'
    };

    const agentConfig = {
      provider: 'lm-studio',
      temperature: 0.1,
      maxTokens: 2048
    };

    console.log('📡 Creating ZepGraphitiMemoryProvider...');
    const memoryProvider = new ZepGraphitiMemoryProvider(config, agentConfig);

    // Test connection
    console.log('🔍 Testing service connectivity...');
    const isConnected = await memoryProvider.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to Zep Graphiti service');
    }
    console.log('✅ Successfully connected to Zep Graphiti service');

    // Test basic search functionality
    console.log('🔍 Testing search functionality...');
    const searchResult = await memoryProvider.searchMemories('test query');
    console.log(`✅ Search completed. Found ${searchResult.facts.length} facts`);

    // Test provider info
    console.log('ℹ️  Testing provider info...');
    const providerInfo = memoryProvider.getProviderInfo();
    console.log(`✅ Provider: ${providerInfo.provider}, Name: ${providerInfo.name}`);

    console.log('\n🎉 All tests passed! Official Zep Graphiti integration is working correctly.');
    return true;

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('\n💡 Make sure the services are running:');
    console.error('   cd py_zep && docker-compose up -d');
    console.error('   Then check: http://localhost:8000/docs');
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testZepGraphitiIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testZepGraphitiIntegration };