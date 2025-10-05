// Core workflow test (moved from tests/zep-graphiti/test-client-memory-integration.ts)
import { createLogger } from '../../src/utils/enhanced-logger';
import { createZepGraphitiMemory, EnhancedFinancialMemory } from '../../src/providers/zep-graphiti/zep-graphiti-memory-provider-client';
import { createPrePopulatedMemory } from '../../src/agents/utils/memory';
import { recordResult, markSkipped } from './test-helper';

async function run() {
  const logger = createLogger('test', 'ClientMemoryWorkflow');
  logger.info('start', '🧪 Client Memory Integration Workflow Test');
  try {
    const zepConfig = { sessionId: 'workflow-session', userId: 'workflow-user', maxResults: 10 };
    // Use OpenAI provider with Docker container
    const agentConfig = { 
      provider: 'openai' as const, 
      model: 'gpt-4o-mini', 
      apiKey: process.env.OPENAI_API_KEY || 'test-key-placeholder', 
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', 
      temperature: 0.3, 
      maxTokens: 1000 
    };
    let provider: any | null = null;
    let connected = false;
    try {
      provider = await createZepGraphitiMemory(zepConfig, agentConfig);
      connected = await provider.testConnection();
    } catch (err) {
      logger.warn('connection', 'Graphiti client bridge initialization failed (will skip detailed memory assertions)', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
    if (!connected) {
      logger.warn('skip', '⚠️ Skipping client memory deep integration (services not available)');
      logger.info('summary', '✅ Graceful skip complete; core workflow unaffected');
      markSkipped('client-memory', 'Graphiti services unavailable');
      return;
    }
    logger.info('connection', '✅ Connected to Zep Graphiti services');

    // Enhanced wrapper
    const enhanced = new EnhancedFinancialMemory('enhanced-workflow', agentConfig, zepConfig); await enhanced.initialize();
    await enhanced.addSituations([
      ['High inflation rising interest rates impact', 'Reduce growth tech, increase defensives'],
      ['Volatility increasing geopolitical tensions', 'Add hedges and raise cash buffer']
    ]);
    const matches = await enhanced.getMemories('What about rising rates?', 2);
    logger.info('search', `Found ${matches.length} matches`);

    const traditional = await createPrePopulatedMemory('traditional-workflow', agentConfig);
    logger.info('compare', `Traditional count=${traditional.count()} Enhanced provider=${enhanced.getProviderName()} Traditional provider=${traditional.getProviderName()}`);

    logger.info('summary', '🎉 Client Memory Integration Workflow Test Complete');
    recordResult({ name: 'client-memory', passed: true, metrics: { matchCount: matches.length } });
  } catch (e) {
    logger.error('failure', 'Test failed', { error: e instanceof Error ? e.message : String(e) });
    recordResult({ name: 'client-memory', passed: false, errors: [e instanceof Error ? e.message : String(e)] });
  }
}
run();
