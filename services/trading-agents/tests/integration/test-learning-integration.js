/**
 * Simple test script to verify learning market analyst works with remote LM Studio
 */

import { LearningMarketAnalyst } from '@/agents/analysts/learning-market-analyst';
import { AgentStateHelpers } from '@/types/agent-states';
import { ChatOpenAI } from '@langchain/openai';
import { createResilientLLM, OPENAI_LLM_CONFIG } from '@/utils/resilient-llm';

async function testLearningMarketAnalyst() {
  try {
    console.log('🧪 Testing Learning Market Analyst with remote LM Studio...');

    // Create LLM instance for LM Studio
    const llm = new ChatOpenAI({
      openAIApiKey: 'dummy-key', // Will be overridden by LM Studio URL
      modelName: 'microsoft/phi-4-mini-reasoning',
      temperature: 0.3,
      maxTokens: 1000,
      configuration: {
        baseURL: process.env.REMOTE_LM_STUDIO_BASE_URL
      }
    });

    // Create resilient LLM wrapper
    const resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    // Create learning market analyst with proper parameters
    const analyst = new LearningMarketAnalyst(resilientLLM, [], {
      enableSupervisedLearning: true,
      enableUnsupervisedLearning: true,
      enableReinforcementLearning: true
    });

    console.log('✅ Learning Market Analyst created successfully');

    // Create initial agent state
    const initialState = AgentStateHelpers.createInitialState('AAPL', '2025-08-24');

    // Test learning processing
    const result = await analyst.processWithLearning(initialState);

    console.log('✅ Learning processing completed successfully');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    // Test learning functionality
    if (analyst.createExperienceFromProcessing) {
      await analyst.createExperienceFromProcessing(result, 'Test analysis for learning');
      console.log('✅ Learning data created successfully');
    }

    console.log('🎉 All tests passed! Learning system is working with remote LM Studio.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testLearningMarketAnalyst();