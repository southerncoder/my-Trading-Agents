/**
 * Debug Learning Agent LLM Response Format
 */

import { LLMProviderFactory } from '../../src/providers/llm-factory';
import { AgentLLMConfig } from '../../src/types/agent-config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

async function debugLLMResponse() {
  console.log('🔍 Debugging LLM Response Format...\n');

  try {
    // Create real LM Studio LLM
    const llmConfig: AgentLLMConfig = {
      provider: 'remote_lmstudio',
      model: 'mistralai/devstral-small-2507',
      baseUrl: process.env.REMOTE_LM_STUDIO_BASE_URL,
      temperature: 0.3,
      maxTokens: 1000
    };

    const llm = LLMProviderFactory.createLLM(llmConfig);
    console.log('✅ LLM created successfully');

    // Test simple message
    const testMessage = new HumanMessage('Analyze the market for AAPL on 2025-09-07. Provide a brief market analysis.');
    console.log('📤 Sending test message...');

    const response = await llm.invoke([testMessage]);
    console.log('📥 Received response:');
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response));
    console.log('Response content type:', typeof response.content);
    console.log('Response content length:', response.content?.length || 0);
    console.log('Response content preview:', typeof response.content === 'string' ? response.content.substring(0, 200) + '...' : JSON.stringify(response.content).substring(0, 200) + '...');

    // Test with system message
    const systemPrompt = `You are an expert Market Analyst. Analyze market data and provide insights.`;
    const systemMessage = new SystemMessage(systemPrompt);
    const humanMessage = new HumanMessage('Please analyze the market for AAPL on 2025-09-07.');

    console.log('\n📤 Sending system + human message...');
    const fullResponse = await llm.invoke([systemMessage, humanMessage]);
    console.log('📥 Full response:');
    console.log('Response type:', typeof fullResponse);
    console.log('Response content type:', typeof fullResponse.content);
    console.log('Response content length:', fullResponse.content?.length || 0);
    console.log('Response content preview:', typeof fullResponse.content === 'string' ? fullResponse.content.substring(0, 300) + '...' : JSON.stringify(fullResponse.content).substring(0, 300) + '...');

    console.log('\n🎉 Debug completed successfully!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run debug
debugLLMResponse();