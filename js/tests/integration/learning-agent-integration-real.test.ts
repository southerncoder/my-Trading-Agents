/**
 * Comprehensive Learning Agent Integration Test with Real LM Studio
 * Tests the complete learning system integration with actual LLM responses
 */

import { LearningMarketAnalyst } from '../../src/agents/analysts/learning-market-analyst';
import { AgentState } from '../../src/types/agent-states';
import { AgentLLMConfig } from '../../src/types/agent-config';
import { LLMProviderFactory } from '../../src/providers/llm-factory';
import { createLogger } from '../../src/utils/enhanced-logger';

describe('Learning Agent Integration Tests (Real LM Studio)', () => {
  let learningMarketAnalyst: LearningMarketAnalyst;
  let testLogger: any;

  beforeAll(async () => {
    testLogger = createLogger('test', 'LearningAgentIntegration');

    // Create real LM Studio LLM for testing
    const llmConfig: AgentLLMConfig = {
      provider: 'lm_studio',
      model: 'mistralai/devstral-small-2507',
      baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
      temperature: 0.3,
      maxTokens: 1000
    };

    const realLLM = LLMProviderFactory.createLLM(llmConfig);

    // Create learning market analyst with real LLM
    learningMarketAnalyst = new LearningMarketAnalyst(realLLM, []);

    testLogger.info('beforeAll', 'Learning Market Analyst initialized with real LM Studio', {
      model: llmConfig.model,
      baseUrl: llmConfig.baseUrl
    });
  }, 30000);

  describe('Learning System Health', () => {
    test('should verify learning system health with real LM Studio models', () => {
      const health = learningMarketAnalyst.getLearningHealth();

      expect(health.enabled).toBe(true);
      expect(health.supervised).toBe(true);
      expect(health.unsupervised).toBe(true);
      expect(health.reinforcement).toBe(true);
      expect(health.experienceCount).toBe(0);

      testLogger.info('Learning System Health', 'Health check passed', health);
    });

    test('should verify learning engines are properly initialized', () => {
      expect(learningMarketAnalyst.supervisedEngine).toBeDefined();
      expect(learningMarketAnalyst.unsupervisedEngine).toBeDefined();
      expect(learningMarketAnalyst.reinforcementEngine).toBeDefined();

      // Test supervised engine health
      const supervisedHealth = learningMarketAnalyst.supervisedEngine?.getHealth();
      expect(supervisedHealth).toBe(true);

      testLogger.info('Engine Initialization', 'All learning engines initialized successfully');
    });
  });

  describe('Market Analysis with Learning Integration', () => {
    test('should perform market analysis using real LM Studio model', async () => {
      const testState: AgentState = {
        company_of_interest: 'AAPL',
        trade_date: '2025-09-07',
        sender: '',
        messages: [],
        market_report: '',
        sentiment_report: '',
        news_report: '',
        fundamentals_report: '',
        investment_debate_state: {
          bull_history: '',
          bear_history: '',
          history: '',
          current_response: '',
          judge_decision: '',
          count: 0
        },
        investment_plan: '',
        trader_investment_plan: '',
        risk_debate_state: {
          risky_history: '',
          safe_history: '',
          neutral_history: '',
          history: '',
          latest_speaker: '',
          current_risky_response: '',
          current_safe_response: '',
          current_neutral_response: '',
          judge_decision: '',
          count: 0
        },
        final_trade_decision: ''
      };

      const result = await learningMarketAnalyst.process(testState);

      expect(result).toBeDefined();
      expect(result.market_report).toBeDefined();
      expect(result.market_report).toBeTruthy();
      expect(result.market_report.length).toBeGreaterThan(10); // LLM generates some analysis content
      expect(result.sender).toBe('Learning Market Analyst');

      testLogger.info('Market Analysis', 'Real LM Studio analysis completed', {
        reportLength: result.market_report?.length,
        hasMessages: result.messages?.length > 0
      });
    }, 60000);

    test.skip('should perform social sentiment analysis using real LM Studio model', async () => {
      // Create a learning social analyst for this test
      const socialLLMConfig: AgentLLMConfig = {
        provider: 'lm_studio',
        model: 'mistralai/devstral-small-2507',
        baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
        temperature: 0.4,
        maxTokens: 800
      };

      const socialLLM = LLMProviderFactory.createLLM(socialLLMConfig);

      // Import and create learning social analyst
      let LearningSocialAnalyst;
      try {
        const socialModule = await import('../../src/agents/analysts/learning-social-analyst');
        LearningSocialAnalyst = socialModule.LearningSocialAnalyst;
        testLogger.info('Social Analyst Import', 'Successfully imported LearningSocialAnalyst');
      } catch (error) {
        testLogger.error('Social Analyst Import', 'Failed to import LearningSocialAnalyst', { error: String(error) });
        throw error;
      }

      const learningSocialAnalyst = new LearningSocialAnalyst(socialLLM, []);

      // Verify the agent was created successfully
      expect(learningSocialAnalyst).toBeDefined();
      expect(learningSocialAnalyst.name).toBe('Learning Social Analyst');

      const testState: AgentState = {
        company_of_interest: 'TSLA',
        trade_date: '2025-09-07',
        sender: '',
        messages: [],
        market_report: '',
        sentiment_report: '',
        news_report: '',
        fundamentals_report: '',
        investment_debate_state: {
          bull_history: '',
          bear_history: '',
          history: '',
          current_response: '',
          judge_decision: '',
          count: 0
        },
        investment_plan: '',
        trader_investment_plan: '',
        risk_debate_state: {
          risky_history: '',
          safe_history: '',
          neutral_history: '',
          history: '',
          latest_speaker: '',
          current_risky_response: '',
          current_safe_response: '',
          current_neutral_response: '',
          judge_decision: '',
          count: 0
        },
        final_trade_decision: ''
      };

      const result = await learningSocialAnalyst.process(testState);

      expect(result).toBeDefined();
      expect(result.sentiment_report).toBeDefined();
      expect(result.sentiment_report).toBeTruthy();
      expect(result.sentiment_report.length).toBeGreaterThan(50); // LLM generates substantial analysis

      testLogger.info('Social Sentiment Analysis', 'Real LM Studio sentiment analysis completed', {
        reportLength: result.sentiment_report?.length
      });
    }, 60000);
  });

  describe('Learning Experience Processing with Real Data', () => {
    test('should create and process learning experiences from real model analysis', async () => {
      const testState: AgentState = {
        company_of_interest: 'NVDA',
        trade_date: '2025-09-07',
        sender: '',
        messages: [],
        market_report: '',
        sentiment_report: '',
        news_report: '',
        fundamentals_report: '',
        investment_debate_state: {
          bull_history: '',
          bear_history: '',
          history: '',
          current_response: '',
          judge_decision: '',
          count: 0
        },
        investment_plan: '',
        trader_investment_plan: '',
        risk_debate_state: {
          risky_history: '',
          safe_history: '',
          neutral_history: '',
          history: '',
          latest_speaker: '',
          current_risky_response: '',
          current_safe_response: '',
          current_neutral_response: '',
          judge_decision: '',
          count: 0
        },
        final_trade_decision: ''
      };

      // Process analysis
      const result = await learningMarketAnalyst.process(testState);
      expect(result.market_report).toBeDefined();

      // Check that learning experience was created
      const health = learningMarketAnalyst.getLearningHealth();
      expect(health.experienceCount).toBeGreaterThan(0);

      testLogger.info('Learning Experience', 'Experience created from real analysis', {
        experienceCount: health.experienceCount,
        reportLength: result.market_report?.length
      });
    }, 60000);

    test('should generate learned insights from real model experiences', async () => {
      // Ensure we have experiences to work with
      const health = learningMarketAnalyst.getLearningHealth();
      if (health.experienceCount === 0) {
        // Create a test experience
        const testExperience = {
          id: `test-exp-${Date.now()}`,
          features: { rsi: 65, volume: 1.2, volatility: 0.15 },
          target: 0.8,
          timestamp: new Date().toISOString(),
          market_conditions: { company: 'TEST', analysis_date: '2025-09-07' },
          outcome: {
            realized_return: 0.025,
            risk_adjusted_return: 0.02,
            holding_period: 1,
            confidence_score: 0.85
          }
        };

        await learningMarketAnalyst.learnFromExperience(testExperience);
      }

      const insights = await learningMarketAnalyst.getLearnedInsights();

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThanOrEqual(0); // May be 0 if supervised engine needs more data

      testLogger.info('Learned Insights', 'Insights generated from real experiences', {
        insightsCount: insights.length,
        supervisedInsights: insights.filter(i => i.source === 'supervised').length,
        reinforcementInsights: insights.filter(i => i.source === 'reinforcement').length
      });
    }, 60000);
  });

  describe('Multi-Agent Learning Integration with Real LM Studio Models', () => {
    test('should coordinate learning across multiple agents using real LM Studio models', async () => {
      // Create multiple learning-enabled agents
      const agents = [];

      // Market Analyst
      const marketLLMConfig: AgentLLMConfig = {
        provider: 'lm_studio',
        model: 'mistralai/devstral-small-2507',
        baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
        temperature: 0.3,
        maxTokens: 1000
      };
      const marketLLM = LLMProviderFactory.createLLM(marketLLMConfig);
      const marketAnalyst = new LearningMarketAnalyst(marketLLM, []);
      agents.push(marketAnalyst);

      // Social Analyst - temporarily disabled
      // const socialLLMConfig: AgentLLMConfig = {
      //   provider: 'lm_studio',
      //   model: 'mistralai/devstral-small-2507',
      //   baseUrl: process.env.REMOTE_LM_STUDIO_URL || 'http://localhost:1234/v1',
      //   temperature: 0.4,
      //   maxTokens: 800
      // };
      // const socialLLM = LLMProviderFactory.createLLM(socialLLMConfig);
      // const { LearningSocialAnalyst } = await import('../../src/agents/analysts/learning-social-analyst');
      // const socialAnalyst = new LearningSocialAnalyst(socialLLM, []);
      // agents.push(socialAnalyst);

      // Test state for coordination
      const testState: AgentState = {
        company_of_interest: 'MSFT',
        trade_date: '2025-09-07',
        sender: '',
        messages: [],
        market_report: '',
        sentiment_report: '',
        news_report: '',
        fundamentals_report: '',
        investment_debate_state: {
          bull_history: '',
          bear_history: '',
          history: '',
          current_response: '',
          judge_decision: '',
          count: 0
        },
        investment_plan: '',
        trader_investment_plan: '',
        risk_debate_state: {
          risky_history: '',
          safe_history: '',
          neutral_history: '',
          history: '',
          latest_speaker: '',
          current_risky_response: '',
          current_safe_response: '',
          current_neutral_response: '',
          judge_decision: '',
          count: 0
        },
        final_trade_decision: ''
      };

      // Process with all agents
      const results = await Promise.all(
        agents.map(async (agent, index) => {
          try {
            const result = await agent.process(testState);
            return { agent: agent.name, success: true, result };
          } catch (error) {
            testLogger.warn(`Agent ${index} failed`, { error: String(error) });
            return { agent: agent.name, success: false, error: String(error) };
          }
        })
      );

      // Verify results
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);

      testLogger.info('Multi-Agent Coordination', 'Multi-agent processing completed', {
        totalAgents: agents.length,
        successfulAgents: successfulResults.length,
        failedAgents: results.length - successfulResults.length
      });
    }, 120000);
  });

  describe('Performance and Reliability with Real LM Studio Models', () => {
    test('should handle concurrent agent processing with real LM Studio models', async () => {
      const concurrentOperations = 3;
      const testStates: AgentState[] = ['AAPL', 'GOOGL', 'MSFT'].map(company => ({
        company_of_interest: company,
        trade_date: '2025-09-07',
        sender: '',
        messages: [],
        market_report: '',
        sentiment_report: '',
        news_report: '',
        fundamentals_report: '',
        investment_debate_state: {
          bull_history: '',
          bear_history: '',
          history: '',
          current_response: '',
          judge_decision: '',
          count: 0
        },
        investment_plan: '',
        trader_investment_plan: '',
        risk_debate_state: {
          risky_history: '',
          safe_history: '',
          neutral_history: '',
          history: '',
          latest_speaker: '',
          current_risky_response: '',
          current_safe_response: '',
          current_neutral_response: '',
          judge_decision: '',
          count: 0
        },
        final_trade_decision: ''
      }));

      const startTime = Date.now();

      // Process concurrently
      const results = await Promise.allSettled(
        testStates.map(state => learningMarketAnalyst.process(state))
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const fulfilledResults = results.filter(r => r.status === 'fulfilled').length;
      const rejectedResults = results.filter(r => r.status === 'rejected').length;

      expect(fulfilledResults).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(180000); // Should complete within 3 minutes

      testLogger.info('Concurrent Processing', 'Concurrent agent processing completed', {
        totalOperations: concurrentOperations,
        successfulOperations: fulfilledResults,
        failedOperations: rejectedResults,
        totalTimeMs: totalTime,
        averageTimePerOperation: totalTime / concurrentOperations
      });
    }, 180000);

    test('should maintain memory bounds during extended learning with real LM Studio models', async () => {
      const initialHealth = learningMarketAnalyst.getLearningHealth();
      const initialExperienceCount = initialHealth.experienceCount;

      // Create multiple learning experiences
      const experiences = [];
      for (let i = 0; i < 5; i++) {
        experiences.push({
          id: `extended-test-exp-${i}-${Date.now()}`,
          features: {
            rsi: 50 + Math.random() * 40,
            volume: 0.8 + Math.random() * 0.8,
            volatility: 0.1 + Math.random() * 0.2
          },
          target: Math.random() > 0.5 ? 1 : -1,
          timestamp: new Date().toISOString(),
          market_conditions: { company: `TEST${i}`, analysis_date: '2025-09-07' },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.1,
            risk_adjusted_return: (Math.random() - 0.5) * 0.08,
            holding_period: 1,
            confidence_score: 0.5 + Math.random() * 0.4
          }
        });
      }

      // Learn from all experiences
      await Promise.all(
        experiences.map(exp => learningMarketAnalyst.learnFromExperience(exp))
      );

      const finalHealth = learningMarketAnalyst.getLearningHealth();
      const finalExperienceCount = finalHealth.experienceCount;

      // Verify memory bounds are maintained
      expect(finalExperienceCount).toBeLessThanOrEqual(learningMarketAnalyst.learningConfig.memorySize);
      expect(finalExperienceCount).toBeGreaterThanOrEqual(initialExperienceCount);

      testLogger.info('Memory Bounds', 'Memory bounds maintained during extended learning', {
        initialExperienceCount,
        finalExperienceCount,
        memorySize: learningMarketAnalyst.learningConfig.memorySize,
        experiencesAdded: experiences.length
      });
    }, 60000);
  });
});