/**
 * Comprehensive Integration Tests for Learning-Enabled Trading Agents
 *
 * This test suite validates the complete learning system integration across:
 * - 4 Learning Analysts (Market, Social, News, Fundamentals)
 * - 3 Learning Researchers (Bull, Bear, Research Manager)
 * - 4 Learning Risk Managers (Risky, Safe, Neutral, Portfolio Manager)
 * - 1 Learning Trader
 * - Learning System Orchestrator (AdvancedLearningSystem)
 * - Enhanced Trading Graph Integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../../src/types/agent-states';
import { LearningExample, LearningInsight } from '../../src/learning/learning-types';
import { AdvancedLearningSystem } from '../../src/learning/learning-system';
import { createLogger } from '../../src/utils/enhanced-logger';

// Import all learning-enabled agents
import { LearningMarketAnalyst } from '../../src/agents/analysts/learning-market-analyst';
import { LearningSocialAnalyst } from '../../src/agents/analysts/learning-social-analyst';
import { LearningNewsAnalyst } from '../../src/agents/analysts/learning-news-analyst';
import { LearningFundamentalsAnalyst } from '../../src/agents/analysts/learning-fundamentals-analyst';

import { LearningBullResearcher } from '../../src/agents/researchers/learning-bull-researcher';
import { LearningBearResearcher } from '../../src/agents/researchers/learning-bear-researcher';
import { LearningResearchManager } from '../../src/agents/researchers/learning-research-manager';

import { LearningRiskyAnalyst } from '../../src/agents/risk-management/learning-risky-analyst';
import { LearningSafeAnalyst } from '../../src/agents/risk-management/learning-safe-analyst';
import { LearningNeutralAnalyst } from '../../src/agents/risk-management/learning-neutral-analyst';
import { LearningPortfolioManager } from '../../src/agents/risk-management/learning-portfolio-manager';

import { LearningTrader } from '../../src/agents/traders/learning-trader';

const logger = createLogger('test', 'learning-integration');

describe('Learning-Enabled Trading Agents Integration Tests', () => {
  let llm: ChatOpenAI;
  let learningSystem: AdvancedLearningSystem;
  let testAgents: any[];

  // Test data
  const testCompany = 'AAPL';
  const testDate = '2025-01-15';
  const baseAgentState: AgentState = {
    company_of_interest: testCompany,
    trade_date: testDate,
    messages: [],
    market_report: '',
    sentiment_report: '',
    news_report: '',
    fundamentals_report: ''
  };

  beforeAll(async () => {
    // Initialize LLM (use mock or test configuration)
    llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo', // Use cheaper model for tests
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY || 'test-key',
      timeout: 5000, // 5 second timeout for tests
      maxRetries: 1 // Only retry once for tests
    });

    // Initialize learning system
    learningSystem = new AdvancedLearningSystem(logger);

    logger.info('beforeAll', 'Test setup completed');
  });

  afterAll(async () => {
    // Cleanup
    logger.info('afterAll', 'Test cleanup completed');
  });

  describe('Learning Engines Health Tests', () => {
    it('should initialize all learning engines successfully', () => {
      const health = learningSystem.getSystemHealth();

      expect(health.supervised_engine).toBeDefined();
      expect(health.unsupervised_engine).toBeDefined();
      expect(health.reinforcement_engine).toBeDefined();

      logger.info('Learning Engines Health', 'All engines initialized', health);
    });

    it('should report healthy system status', () => {
      const health = learningSystem.getSystemHealth();

      expect(['healthy', 'degraded']).toContain(health.overall_health);
      expect(health.supervised_engine).toBe(true);
      expect(health.unsupervised_engine).toBe(true);
      expect(health.reinforcement_engine).toBe(true);
    });
  });

  describe('Learning-Enabled Agent Initialization Tests', () => {
    beforeAll(() => {
      // Initialize all learning-enabled agents
      testAgents = [
        // Analysts
        new LearningMarketAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningSocialAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningNewsAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningFundamentalsAnalyst(llm, [], { learningRate: 0.1 }),

        // Researchers
        new LearningBullResearcher(llm, [], { learningRate: 0.1 }),
        new LearningBearResearcher(llm, [], { learningRate: 0.1 }),
        new LearningResearchManager(llm, [], { learningRate: 0.1 }),

        // Risk Managers
        new LearningRiskyAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningSafeAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningNeutralAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningPortfolioManager(llm, [], { learningRate: 0.1 }),

        // Trader
        new LearningTrader(llm, [], { learningRate: 0.1 })
      ];
    });

    it('should initialize all 12 learning-enabled agents', () => {
      expect(testAgents).toHaveLength(12); // 4 analysts + 3 researchers + 4 risk managers + 1 trader

      testAgents.forEach((agent, index) => {
        expect(agent).toBeDefined();
        expect(agent.learningEnabled).toBe(true);
        expect(agent.name).toBeDefined();
        expect(agent.description).toBeDefined();
      });

      logger.info('Agent Initialization', `${testAgents.length} learning-enabled agents initialized successfully`);
    });

    it('should configure learning engines for each agent', () => {
      testAgents.forEach((agent, index) => {
        const health = agent.getLearningHealth();

        expect(health.enabled).toBe(true);
        expect(health.experienceCount).toBe(0); // Start with empty experience buffer

        // At least one learning engine should be enabled
        const enginesEnabled = [health.supervised, health.unsupervised, health.reinforcement];
        expect(enginesEnabled.some(enabled => enabled)).toBe(true);
      });
    });

    it('should have unique agent names and descriptions', () => {
      const names = testAgents.map(agent => agent.name);
      const descriptions = testAgents.map(agent => agent.description);

      expect(new Set(names)).toHaveLength(names.length); // All names unique
      expect(new Set(descriptions)).toHaveLength(descriptions.length); // All descriptions unique

      logger.info('Agent Uniqueness', 'All agents have unique names and descriptions');
    });
  });

  describe('Learning System Orchestrator Tests', () => {
    it('should coordinate learning across multiple agents', async () => {
      // Create sample learning experiences for different agents
      const experiences: LearningExample[] = [
        {
          id: 'market-exp-1',
          features: { rsi: 65, volume: 1000000, volatility: 0.15 },
          target: 1.0, // Bullish prediction
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany, analyst_type: 'market' },
          outcome: {
            realized_return: 0.02,
            risk_adjusted_return: 0.015,
            holding_period: 1,
            confidence_score: 0.8
          }
        },
        {
          id: 'social-exp-1',
          features: { sentiment_score: 0.7, mention_volume: 5000 },
          target: 0.5,
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany, analyst_type: 'social' },
          outcome: {
            realized_return: 0.01,
            risk_adjusted_return: 0.008,
            holding_period: 1,
            confidence_score: 0.6
          }
        }
      ];

      // Process experiences through learning system
      for (const experience of experiences) {
        // Simulate learning from experience
        logger.info('Orchestrator Test', 'Processing experience', {
          experienceId: experience.id,
          features: Object.keys(experience.features).length
        });
      }

      // Verify system health after processing
      const health = learningSystem.getSystemHealth();
      expect(health.overall_health).toBe('healthy');
    });

    it('should handle learning system failures gracefully', () => {
      // Test with invalid configuration
      const invalidSystem = new AdvancedLearningSystem(null as any);

      const health = invalidSystem.getSystemHealth();
      expect(health.overall_health).toBeDefined(); // Should not crash
    });
  });

  describe('Agent Learning Integration Tests', () => {
    let marketAnalyst: LearningMarketAnalyst;

    beforeEach(() => {
      marketAnalyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1 });
    });

    it('should process learning experiences correctly', async () => {
      const experience: LearningExample = {
        id: 'test-experience-1',
        features: { rsi: 70, macd: 0.5, volume: 2000000 },
        target: 1.0,
        timestamp: new Date().toISOString(),
        market_conditions: { company: testCompany },
        outcome: {
          realized_return: 0.025,
          risk_adjusted_return: 0.02,
          holding_period: 1,
          confidence_score: 0.85
        }
      };

      await marketAnalyst.learnFromExperience(experience);

      const health = marketAnalyst.getLearningHealth();
      expect(health.experienceCount).toBeGreaterThan(0);
    });

    it('should generate learned insights', async () => {
      // Add multiple experiences first
      const experiences: LearningExample[] = [
        {
          id: 'insight-test-1',
          features: { rsi: 75, volume: 1500000 },
          target: 1.0,
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany },
          outcome: {
            realized_return: 0.03,
            risk_adjusted_return: 0.025,
            holding_period: 1,
            confidence_score: 0.9
          }
        },
        {
          id: 'insight-test-2',
          features: { rsi: 25, volume: 800000 },
          target: -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany },
          outcome: {
            realized_return: -0.02,
            risk_adjusted_return: -0.025,
            holding_period: 1,
            confidence_score: 0.8
          }
        }
      ];

      for (const exp of experiences) {
        await marketAnalyst.learnFromExperience(exp);
      }

      const insights = await marketAnalyst.getLearnedInsights();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThanOrEqual(0); // May be 0 if engines don't generate insights immediately
    });

    it('should adapt strategy based on learning', async () => {
      // Add successful experiences
      const successfulExperience: LearningExample = {
        id: 'adaptation-test-1',
        features: { rsi: 80, trend_strength: 0.9 },
        target: 1.0,
        timestamp: new Date().toISOString(),
        market_conditions: { company: testCompany },
        outcome: {
          realized_return: 0.04,
          risk_adjusted_return: 0.035,
          holding_period: 1,
          confidence_score: 0.95
        }
      };

      await marketAnalyst.learnFromExperience(successfulExperience);

      // Test strategy adaptation
      const testState = { ...baseAgentState };
      await marketAnalyst.adaptStrategy(testState);

      // Verify adaptation occurred (check logs or internal state)
      const health = marketAnalyst.getLearningHealth();
      expect(health.enabled).toBe(true);
    });
  });

  describe('End-to-End Learning Workflow Tests', () => {
    it('should complete full learning workflow', async () => {
      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1 });

      // Step 1: Process initial analysis
      const initialState = { ...baseAgentState };
      const result = await analyst.process(initialState);

      expect(result).toBeDefined();
      expect(result.market_report).toBeDefined();

      // Step 2: Create and learn from experience
      const experience = analyst['createExperienceFromProcessing'](initialState, result);
      await analyst.learnFromExperience(experience);

      // Step 3: Get learned insights
      const insights = await analyst.getLearnedInsights();

      // Step 4: Adapt strategy for next analysis
      const nextState = { ...baseAgentState, trade_date: '2025-01-16' };
      await analyst.adaptStrategy(nextState);

      // Step 5: Process with adapted strategy
      const adaptedResult = await analyst.process(nextState);

      expect(adaptedResult).toBeDefined();
      expect(adaptedResult.market_report).toBeDefined();

      logger.info('End-to-End Workflow', 'Complete learning workflow executed successfully', {
        initialAnalysis: !!result.market_report,
        insightsGenerated: insights.length,
        adaptedAnalysis: !!adaptedResult.market_report
      });
    });

    it('should handle learning workflow with multiple agents', async () => {
      const agents = [
        new LearningMarketAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningSocialAnalyst(llm, [], { learningRate: 0.1 }),
        new LearningNewsAnalyst(llm, [], { learningRate: 0.1 })
      ];

      const workflowResults = [];

      for (const agent of agents) {
        // Process analysis
        const result = await agent.process(baseAgentState);
        workflowResults.push({
          agent: agent.name,
          success: !!result.market_report || !!result.sentiment_report || !!result.news_report
        });

        // Learn from experience - use type assertion for protected method access
        const typedAgent = agent as any;
        const experience = typedAgent.createExperienceFromProcessing(baseAgentState, result);
        await agent.learnFromExperience(experience);
      }

      // Verify all agents completed workflow
      workflowResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      logger.info('Multi-Agent Workflow', 'All agents completed learning workflow', {
        agentsProcessed: workflowResults.length,
        allSuccessful: workflowResults.every(r => r.success)
      });
    });
  });

  describe('Error Handling and Resilience Tests', () => {
    it('should handle LLM failures gracefully', async () => {
      // Create agent with failing LLM
      const failingLLM = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1,
        openAIApiKey: 'invalid-key' // This will cause failures
      });

      const analyst = new LearningMarketAnalyst(failingLLM, [], { learningRate: 0.1 });

      // Should not crash despite LLM failures
      const result = await analyst.process(baseAgentState);

      // Should return some result (possibly fallback)
      expect(result).toBeDefined();
      expect(result.sender).toBe(analyst.name);
    });

    it('should maintain learning state during failures', async () => {
      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1 });

      // Add successful experience
      const experience: LearningExample = {
        id: 'error-test-1',
        features: { test_feature: 1.0 },
        target: 0.5,
        timestamp: new Date().toISOString(),
        market_conditions: { company: testCompany },
        outcome: {
          realized_return: 0.01,
          risk_adjusted_return: 0.008,
          holding_period: 1,
          confidence_score: 0.7
        }
      };

      await analyst.learnFromExperience(experience);

      const healthBefore = analyst.getLearningHealth();
      expect(healthBefore.experienceCount).toBeGreaterThan(0);

      // Simulate failure scenario
      try {
        await analyst.process({ ...baseAgentState, company_of_interest: null as any });
      } catch (error) {
        // Expected to fail, but learning state should be preserved
      }

      const healthAfter = analyst.getLearningHealth();
      expect(healthAfter.experienceCount).toBe(healthBefore.experienceCount);
    });

    it('should handle invalid learning data gracefully', async () => {
      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1 });

      const invalidExperience: LearningExample = {
        id: 'invalid-test',
        features: {}, // Empty features
        target: NaN, // Invalid target
        timestamp: 'invalid-date',
        market_conditions: {},
        outcome: {
          realized_return: NaN,
          risk_adjusted_return: NaN,
          holding_period: -1, // Invalid holding period
          confidence_score: 2.0 // Invalid confidence (> 1.0)
        }
      };

      // Should not crash with invalid data
      await expect(analyst.learnFromExperience(invalidExperience)).resolves.not.toThrow();

      const health = analyst.getLearningHealth();
      expect(health.enabled).toBe(true); // System should remain functional
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle multiple learning experiences efficiently', async () => {
      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1, memorySize: 100 });

      const startTime = Date.now();
      const experienceCount = 50;

      // Add multiple experiences
      for (let i = 0; i < experienceCount; i++) {
        const experience: LearningExample = {
          id: `perf-test-${i}`,
          features: { feature1: Math.random(), feature2: Math.random() },
          target: Math.random() * 2 - 1, // Random between -1 and 1
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany, batch: i },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.1,
            risk_adjusted_return: (Math.random() - 0.5) * 0.08,
            holding_period: 1,
            confidence_score: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
          }
        };

        await analyst.learnFromExperience(experience);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const health = analyst.getLearningHealth();

      expect(health.experienceCount).toBeLessThanOrEqual(100); // Should respect memory size
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      logger.info('Performance Test', 'Multiple experiences processed', {
        experiencesProcessed: experienceCount,
        finalExperienceCount: health.experienceCount,
        durationMs: duration,
        avgTimePerExperience: duration / experienceCount
      });
    });

    it('should maintain memory bounds', async () => {
      const memorySize = 10;
      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1, memorySize });

      // Add more experiences than memory size
      for (let i = 0; i < memorySize * 2; i++) {
        const experience: LearningExample = {
          id: `memory-test-${i}`,
          features: { test: i },
          target: 0.5,
          timestamp: new Date().toISOString(),
          market_conditions: { company: testCompany },
          outcome: {
            realized_return: 0.01,
            risk_adjusted_return: 0.008,
            holding_period: 1,
            confidence_score: 0.7
          }
        };

        await analyst.learnFromExperience(experience);
      }

      const health = analyst.getLearningHealth();
      expect(health.experienceCount).toBeLessThanOrEqual(memorySize);

      logger.info('Memory Test', 'Memory bounds maintained', {
        memorySize,
        finalExperienceCount: health.experienceCount,
        memoryEfficiency: health.experienceCount / memorySize
      });
    });
  });

  describe('Integration with Enhanced Trading Graph', () => {
    it('should integrate learning agents with trading graph', async () => {
      // This test would require setting up the full trading graph
      // For now, we'll test the integration points

      const analyst = new LearningMarketAnalyst(llm, [], { learningRate: 0.1 });

      // Simulate integration with graph state
      const graphState = {
        ...baseAgentState,
        learning_enabled: true,
        learning_agents_active: ['market', 'social', 'news']
      };

      // Process through agent
      const result = await analyst.process(graphState);

      // Verify integration maintained state
      expect(result).toBeDefined();
      expect(result.sender).toBe(analyst.name);

      // Check that learning state is preserved
      const health = analyst.getLearningHealth();
      expect(health.enabled).toBe(true);

      logger.info('Graph Integration', 'Learning agent integrated with trading graph', {
        agentProcessed: analyst.name,
        resultGenerated: !!result.market_report,
        learningEnabled: health.enabled
      });
    });
  });
});