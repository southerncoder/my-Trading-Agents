// Manual test migrated from root: test-learning-integration.js
// Purpose: Verify LearningMarketAnalyst end-to-end with remote LM Studio.

import { LearningMarketAnalyst } from '@/agents/analysts/learning-market-analyst';
import { AgentStateHelpers } from '@/types/agent-states';
import { ChatOpenAI } from '@langchain/openai';
import { createResilientLLM, OPENAI_LLM_CONFIG } from '@/utils/resilient-llm';

async function run() {
  console.log('🧪 Learning Market Analyst manual test');
  const llm = new ChatOpenAI({
    openAIApiKey: 'dummy-key',
    modelName: 'microsoft/phi-4-mini-reasoning',
    temperature: 0.3,
    maxTokens: 1000,
    configuration: { baseURL: process.env.REMOTE_LM_STUDIO_BASE_URL }
  });
  const resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
  const analyst = new LearningMarketAnalyst(resilientLLM, [], {
    enableSupervisedLearning: true,
    enableUnsupervisedLearning: true,
    enableReinforcementLearning: true
  });
  const state = AgentStateHelpers.createInitialState('AAPL', '2025-08-24');
  const result = await analyst.processWithLearning(state);
  console.log('📊 Result:', JSON.stringify(result, null, 2));
  if (analyst.createExperienceFromProcessing) {
    await analyst.createExperienceFromProcessing(result, 'Manual test learning entry');
    console.log('✅ Experience persisted');
  }
  console.log('✅ Manual learning test complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error('❌ Failure:', e); process.exit(1); });
}
