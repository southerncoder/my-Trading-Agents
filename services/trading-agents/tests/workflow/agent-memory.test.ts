#!/usr/bin/env tsx
// Core workflow test (moved from tests/integration/agent-memory.test.ts)
import { EmbeddingProviderFactory } from '../../src/providers/memory-provider';
import { FinancialSituationMemory } from '../../src/agents/utils/memory';
import { recordResult } from './test-helper';

const testAgentConfigs = {
  openai_agent: { provider: 'openai' as const, model: 'gpt-4-turbo-preview' },
  anthropic_agent: { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022' },
  local_agent: { provider: 'remote_lmstudio' as const, model: 'local-model', baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1' }
};

async function run() {
  console.log('🧪 Agent Memory Workflow Test');
  const originalOpenAIKey = process.env.OPENAI_API_KEY; const originalGoogleKey = process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY; delete process.env.GOOGLE_API_KEY;
  const warnings: string[] = [];
  let totalMatches = 0;
  try {
    for (const [agentName, agentConfig] of Object.entries(testAgentConfigs)) {
      console.log(`\n🤖 Agent: ${agentName}`);
      const memoryProvider = EmbeddingProviderFactory.createProvider(agentConfig);
      console.log('   ✅ Memory provider created');
      if ('getProviderInfo' in memoryProvider) {
        const info = (memoryProvider as any).getProviderInfo();
        console.log(`   📊 Provider: ${info.actualProvider} (attempted: ${info.attemptedProvider})`);
      }
      const memory = new FinancialSituationMemory(agentName, agentConfig);
      await memory.addSituations([
        ['Stock market volatility is increasing', 'Consider diversifying portfolio and reducing risk exposure'],
        ['Tech stocks showing strong momentum', 'Monitor earnings and manage position sizing'],
        ['Interest rates rising', 'Review fixed income allocations and duration risk']
      ]);
      const matches = await memory.getMemories('Market showing signs of volatility', 2);
      console.log(`   📚 Retrieved ${matches.length} memories`);
      totalMatches += matches.length;
    }
  } catch (err) {
    recordResult({ name: 'agent-memory', passed: false, errors: [err instanceof Error ? err.message : String(err)] });
    return;
  } finally { if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey; if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey; }
  if (totalMatches === 0) warnings.push('No memory matches retrieved (embedding path inactive)');
  console.log('\n🎉 Agent Memory Workflow Test Complete');
  recordResult({ name: 'agent-memory', passed: true, warnings, metrics: { totalMatches } });
}
run();
