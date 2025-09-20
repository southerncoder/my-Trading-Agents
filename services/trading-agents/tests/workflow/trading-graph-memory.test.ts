#!/usr/bin/env tsx
// Core workflow test (moved from tests/integration/trading-graph-memory.test.ts)
import { enhancedConfigLoader } from '../../src/config/enhanced-loader';
import { EmbeddingProviderFactory } from '../../src/providers/memory-provider';
import { FinancialSituationMemory } from '../../src/agents/utils/memory';
import { recordResult } from './test-helper';

async function run() {
  console.log('🧪 Trading Graph Memory Workflow Test');
  const originalOpenAIKey = process.env.OPENAI_API_KEY; const originalGoogleKey = process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY; delete process.env.GOOGLE_API_KEY;
  const warnings: string[] = [];
  let totalSituations = 0;
  let totalQueriesAnswered = 0;
  try {
    const memoryAgents = [ { name: 'bull_researcher', memoryType: 'bull_memory' }, { name: 'trader', memoryType: 'trader_memory' } ];
    for (const { name, memoryType } of memoryAgents) {
      console.log(`\n🤖 ${name}`);
      const agentConfig = enhancedConfigLoader.getAgentConfig(name);
      const provider = EmbeddingProviderFactory.createProvider(agentConfig);
      if ('getProviderInfo' in provider) {
        const info = (provider as any).getProviderInfo();
        console.log(`   📊 Provider actual=${info.actualProvider} attempted=${info.attemptedProvider}`);
      }
      const memory = new FinancialSituationMemory(memoryType, agentConfig);
      await memory.addSituations([
        ['Market bullish momentum high volume', 'Consider increasing position size while controlling risk'],
        ['Earnings season mixed expectations', 'Reduce exposure and prepare for volatility'],
        ['Fed dovish signals', 'Watch bond yields and sector rotation'],
        ['Overbought technical indicators', 'Take partial profits and wait for pullback']
      ]);
      totalSituations += 4;
      const queries = [ 'increase my position momentum?', 'earnings volatility handling', 'overbought technical action' ];
      for (const q of queries) {
        const m = await memory.getMemories(q, 1);
        if (m[0]) { console.log(`   💡 Query: ${q} -> ${m[0].recommendation}`); totalQueriesAnswered++; }
      }
      const info = memory.getProviderInfo();
      console.log(`   📈 Stored situations: ${info.memoryCount}`);
    }
  } catch (err) {
    recordResult({ name: 'trading-graph-memory', passed: false, errors: [err instanceof Error ? err.message : String(err)] });
    return;
  } finally { if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey; if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey; }
  if (totalQueriesAnswered === 0) warnings.push('No query answers produced (embedding/unavailable)');
  console.log('\n🎉 Trading Graph Memory Workflow Test Complete');
  recordResult({ name: 'trading-graph-memory', passed: true, warnings, metrics: { totalSituations, totalQueriesAnswered } });
}
run();
