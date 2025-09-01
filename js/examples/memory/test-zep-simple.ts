/**
 * Simple Zep Graphiti test without service dependency
 */

import { AgentLLMConfig } from '../src/types/agent-config';
import { ZepGraphitiConfig, EpisodeType } from '../src/providers/zep-graphiti-memory-provider';

async function testSimple() {
  console.log('=== Simple Zep Graphiti Code Test ===');

  const agentConfig: AgentLLMConfig = {
    model: 'microsoft/phi-4-mini-reasoning',
    temperature: 0.1,
    maxTokens: 4000,
    apiKey: 'lm-studio',
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    provider: 'lm_studio'
  };

  console.log('✅ Agent config created successfully');
  console.log('Config:', agentConfig);

  // Test if we can import the memory provider class
  try {
    const { createZepGraphitiMemory } = await import('../src/providers/zep-graphiti-memory-provider.js');
    console.log('✅ Successfully imported ZepGraphitiMemoryProvider');
    console.log('Available functions:', { createZepGraphitiMemory: typeof createZepGraphitiMemory, EpisodeType });
    
    const zepConfig: ZepGraphitiConfig = {
      sessionId: 'test-session',
      userId: 'test-user',
      serviceUrl: process.env.ZEP_SERVICE_URL || 'http://localhost:8000',
      maxResults: 5
    };
    
    console.log('✅ Zep config created successfully');
    console.log('Config:', zepConfig);
    
    console.log('\n🎉 All imports and configurations work correctly!');
    console.log('The TypeScript code structure is ready.');
    
  } catch (error) {
    console.error('❌ Import error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testSimple().catch(console.error);