/**
 * Test Learning Agent Integration
 */

import { LearningAgentBase } from '../../src/agents/base/learning-agent';
import { AgentState } from '../../src/agents/utils/agent-states';
import { AgentLLMConfig } from '../../src/types/agent-config';

// Add Jest globals for TypeScript
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

class TestLearningAgent extends LearningAgentBase {
  constructor() {
    const mockLLM = {
      invoke: async () => ({ content: 'test response' })
    };

    const config: AgentLLMConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key'
    };

    super('TestAgent', 'Test learning agent', mockLLM, config);
  }

  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    return {
      sender: this.name,
      messages: []
    };
  }

  protected createExperienceFromProcessing(state: AgentState, result: Partial<AgentState>): any {
    return {
      id: `exp-${Date.now()}`,
      features: { test: 1.0 },
      target: 0.5,
      timestamp: new Date().toISOString(),
      market_conditions: {},
      outcome: {
        realized_return: 0.02,
        risk_adjusted_return: 0.015,
        holding_period: 1,
        confidence_score: 0.8
      }
    };
  }

  protected async applyLearnedAdaptations(insights: any[], state: AgentState): Promise<void> {
    console.log(`Applying ${insights.length} learned adaptations`);
  }
}

async function testLearningAgent() {
  console.log('🧪 Testing Learning Agent Integration...\n');

  try {
    const agent = new TestLearningAgent();
    console.log('✅ Learning agent created successfully');

    const health = agent.getLearningHealth();
    console.log('Learning Health:', health);

    // Test basic functionality
    const testState: AgentState = {
      company_of_interest: 'AAPL',
      trade_date: '2025-09-07',
      sender: '',
      messages: [],
      marketReport: '',
      sentimentReport: '',
      newsReport: '',
      fundamentalsReport: '',
      investmentDebateState: {
        bullHistory: '',
        bearHistory: '',
        history: '',
        currentResponse: '',
        judgeDecision: '',
        count: 0
      },
      investmentPlan: '',
      traderInvestmentPlan: '',
      riskDebateState: {
        riskyHistory: '',
        safeHistory: '',
        neutralHistory: '',
        history: '',
        latestSpeaker: '',
        currentRiskyResponse: '',
        currentSafeResponse: '',
        currentNeutralResponse: '',
        judgeDecision: '',
        count: 0
      },
      finalTradeDecision: ''
    };

    const result = await agent.process(testState);
    console.log('✅ Agent processing completed');

    const insights = await agent.getLearnedInsights();
    console.log(`✅ Retrieved ${insights.length} learned insights`);

    console.log('\n🎉 Learning Agent Integration Test Passed!');

  } catch (error) {
    console.error('❌ Learning Agent Integration Test Failed:', error);
  }
}

// Jest test wrapper
describe('Learning Agent Integration', () => {
  it('should create test learning agent', () => {
    const agent = new TestLearningAgent();
    expect(agent).toBeDefined();
    expect(agent.constructor.name).toBe('TestLearningAgent');
  });

  it('should have required methods', () => {
    const agent = new TestLearningAgent();
    expect(typeof (agent as any).process).toBe('function');
    expect(typeof (agent as any).getLearnedInsights).toBe('function');
  });
});

// Run test
testLearningAgent();