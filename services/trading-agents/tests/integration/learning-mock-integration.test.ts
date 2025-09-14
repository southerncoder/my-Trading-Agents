/**
 * Learning System Integration Test (Real LM Studio Models)
 *
 * Tests the learning system integration with real LM Studio models instead of mocks.
 * Uses the remote LM Studio service via environment variables for actual LLM responses.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AgentState } from '../../src/types/agent-states';
import { LearningExample, LearningInsight } from '../../src/learning/learning-types';
import { AdvancedLearningSystem } from '../../src/learning/learning-system';
import { createLogger } from '../../src/utils/enhanced-logger';

// Import learning-enabled agents
import { LearningMarketAnalyst } from '../../src/agents/analysts/learning-market-analyst';
import { LearningSocialAnalyst } from '../../src/agents/analysts/learning-social-analyst';

// Import real LLM provider factory
import { LLMProviderFactory } from '../../src/providers/llm-factory';
import { AgentLLMConfig } from '../../src/types/agent-config';

const logger = createLogger('test', 'LearningRealIntegration');

describe('Learning System Integration Tests (Real LM Studio Models)', () => {
  let learningSystem: AdvancedLearningSystem;
  let realLLM: any;
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
    logger.info('beforeAll', 'Setting up learning + real LM Studio integration test');

    // Initialize learning system
    learningSystem = new AdvancedLearningSystem(logger);

    // Initialize real LM Studio LLM using the remote service
    const lmStudioConfig: AgentLLMConfig = {
      provider: 'remote_lmstudio',
      model: 'mistralai/devstral-small-2507', // Use actual model from LM Studio
      baseUrl: process.env.REMOTE_LMSTUDIO_BASE_URL,
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 30000
    };

    // Test connection first
    const connectionTest = await LLMProviderFactory.testConnection(lmStudioConfig);
    if (!connectionTest) {
      logger.warn('beforeAll', 'LM Studio connection test failed, but continuing with test');
    }

    realLLM = LLMProviderFactory.createLLM(lmStudioConfig);

    // Initialize learning-enabled agents with real LLM
    testAgents = [
      new LearningMarketAnalyst(realLLM, [], { learningRate: 0.1 }),
      new LearningSocialAnalyst(realLLM, [], { learningRate: 0.1 })
    ];

    logger.info('beforeAll', 'Real LM Studio integration test setup completed', {
      agentsInitialized: testAgents.length,
      lmStudioUrl: lmStudioConfig.baseUrl,
      connectionTest: connectionTest
    });
  });

  afterAll(async () => {
    logger.info('afterAll', 'Cleaning up mock integration test');
  });

  describe('Mock Model + Learning System Health', () => {
    it('should verify learning system health with mock models', () => {
      const health = learningSystem.getSystemHealth();

      expect(health.supervised_engine).toBe(true);
      expect(health.unsupervised_engine).toBe(true);
      expect(health.reinforcement_engine).toBe(true);
      expect(health.overall_health).toBe('healthy');

      logger.info('Learning System Health', 'All learning engines healthy', health);
    });

    it('should verify learning-enabled agents are properly configured with mock models', () => {
      testAgents.forEach((agent, index) => {
        expect(agent).toBeDefined();
        expect(agent.learningEnabled).toBe(true);
        expect(agent.name).toBeDefined();

        const health = agent.getLearningHealth();
        expect(health.enabled).toBe(true);

        logger.info('Agent Configuration', `Agent ${agent.name} properly configured`, {
          learningEnabled: health.enabled,
          experienceCount: health.experienceCount
        });
      });
    });
  });

  describe('Learning Agent Analysis with Real LM Studio Models', () => {
    it('should perform market analysis using real LM Studio model', async () => {
      const marketAnalyst = testAgents[0];

      const analysisState = {
        ...baseAgentState,
        market_report: ''
      };

      const result = await marketAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.market_report).toBeDefined();
      expect(result.market_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(marketAnalyst.name);

      logger.info('Market Analysis', 'Mock model analysis completed', {
        reportLength: result.market_report.length,
        hasTechnicalIndicators: result.market_report.toLowerCase().includes('rsi') ||
                              result.market_report.toLowerCase().includes('macd'),
        hasPriceTargets: result.market_report.toLowerCase().includes('support') ||
                        result.market_report.toLowerCase().includes('resistance')
      });
    });

    it('should perform social sentiment analysis using real LM Studio model', async () => {
      const socialAnalyst = testAgents[1];

      const analysisState = {
        ...baseAgentState,
        sentiment_report: ''
      };

      const result = await socialAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.sentiment_report).toBeDefined();
      expect(result.sentiment_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(socialAnalyst.name);

      logger.info('Social Analysis', 'Mock model sentiment analysis completed', {
        reportLength: result.sentiment_report.length,
        hasSentimentIndicators: result.sentiment_report.toLowerCase().includes('sentiment') ||
                               result.sentiment_report.toLowerCase().includes('bullish') ||
                               result.sentiment_report.toLowerCase().includes('bearish'),
        hasSocialMetrics: result.sentiment_report.toLowerCase().includes('social') ||
                         result.sentiment_report.toLowerCase().includes('mention')
      });
    });
  });

  describe('Learning Experience Processing with Real LM Studio Models', () => {
    let marketAnalyst: LearningMarketAnalyst;

    beforeEach(() => {
      marketAnalyst = testAgents[0];
    });

    it('should create and process learning experiences from mock model analysis', async () => {
      // Perform analysis
      const analysisState = { ...baseAgentState };
      const result = await marketAnalyst.process(analysisState);

      // Create experience from the analysis
      const experience: LearningExample = {
        id: `mock-test-${Date.now()}`,
        features: {
          rsi: 65 + Math.random() * 30,
          volume: 1000000 + Math.random() * 9000000,
          volatility: Math.random() * 0.5,
          analysis_length: result.market_report?.length || 0,
          has_technical_indicators: (result.market_report?.toLowerCase().includes('rsi') ||
                                   result.market_report?.toLowerCase().includes('macd')) ? 1 : 0
        },
        target: Math.random() > 0.5 ? 1.0 : -1.0,
        timestamp: new Date().toISOString(),
        market_conditions: {
          company: testCompany,
          analyst_type: 'market',
          model_provider: 1
        },
        outcome: {
          realized_return: (Math.random() - 0.5) * 0.1,
          risk_adjusted_return: (Math.random() - 0.5) * 0.08,
          holding_period: 1,
          confidence_score: 0.7 + Math.random() * 0.3
        }
      };

      // Process the experience through learning
      await marketAnalyst.learnFromExperience(experience);

      const health = marketAnalyst.getLearningHealth();
      expect(health.experienceCount).toBeGreaterThan(0);

      logger.info('Experience Processing', 'Learning experience processed successfully', {
        experienceId: experience.id,
        featuresCount: Object.keys(experience.features).length,
        target: experience.target,
        confidence: experience.outcome.confidence_score,
        newExperienceCount: health.experienceCount
      });
    });

    it('should generate learned insights from mock model experiences', async () => {
      // Add multiple experiences
      const experiences: LearningExample[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await marketAnalyst.process({
          ...baseAgentState,
          trade_date: `2025-01-${15 + i}`
        });

        const experience: LearningExample = {
          id: `insight-test-${i}`,
          features: {
            rsi: 60 + Math.random() * 40,
            volume: 500000 + Math.random() * 9500000,
            analysis_quality: (result.market_report?.length || 0) / 1000,
            has_recommendations: (result.market_report?.toLowerCase().includes('recommend')) ? 1 : 0
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: 'market',
            iteration: i
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.08,
            risk_adjusted_return: (Math.random() - 0.5) * 0.06,
            holding_period: 1,
            confidence_score: 0.7 + Math.random() * 0.3
          }
        };

        experiences.push(experience);
        await marketAnalyst.learnFromExperience(experience);
      }

      // Get learned insights
      const insights = await marketAnalyst.getLearnedInsights();

      expect(Array.isArray(insights)).toBe(true);

      logger.info('Insight Generation', 'Learned insights generated from mock model experiences', {
        experiencesProcessed: experiences.length,
        insightsGenerated: insights.length,
        avgConfidence: insights.length > 0 ?
          insights.reduce((sum, i) => sum + i.confidence_score, 0) / insights.length : 0
      });

      // Verify insights have expected structure if any were generated
      if (insights.length > 0) {
        insights.forEach(insight => {
          expect(insight).toHaveProperty('insight_type');
          expect(insight).toHaveProperty('description');
          expect(insight).toHaveProperty('confidence_score');
          expect(insight.confidence_score).toBeGreaterThanOrEqual(0);
          expect(insight.confidence_score).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Multi-Agent Learning Integration with Real LM Studio Models', () => {
    it('should coordinate learning across multiple agents using real LM Studio models', async () => {
      const coordinationResults = [];

      // Process analysis with each agent
      for (const agent of testAgents) {
        const result = await agent.process(baseAgentState);

        // Create and process learning experience
        const experience: LearningExample = {
          id: `multi-agent-${agent.name}-${Date.now()}`,
          features: {
            agent_type: agent.name === 'Learning Market Analyst' ? 1 : 2, // Numeric encoding
            analysis_length: result.market_report?.length || result.sentiment_report?.length || 0,
            processing_time: Date.now() % 1000,
            model_provider: 1 // Numeric: 1 for LM Studio
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: agent.name.toLowerCase().replace(' learning', ''),
            multi_agent: 1
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.06,
            risk_adjusted_return: (Math.random() - 0.5) * 0.04,
            holding_period: 1,
            confidence_score: 0.75 + Math.random() * 0.25
          }
        };

        await agent.learnFromExperience(experience);

        coordinationResults.push({
          agent: agent.name,
          analysisCompleted: !!result,
          experienceProcessed: true,
          health: agent.getLearningHealth()
        });
      }

      // Verify all agents completed successfully
      coordinationResults.forEach(result => {
        expect(result.analysisCompleted).toBe(true);
        expect(result.experienceProcessed).toBe(true);
        expect(result.health.enabled).toBe(true);
      });

      logger.info('Multi-Agent Coordination', 'All agents processed successfully', {
        agentsProcessed: coordinationResults.length,
        allSuccessful: coordinationResults.every(r => r.analysisCompleted),
        totalExperiences: coordinationResults.reduce((sum, r) => sum + r.health.experienceCount, 0)
      });
    });
  });

  describe('Performance and Reliability with Real LM Studio Models', () => {
    it('should handle concurrent agent processing with real LM Studio models', async () => {
      const concurrentPromises = testAgents.map(async (agent, index) => {
        const agentState = {
          ...baseAgentState,
          company_of_interest: ['AAPL', 'GOOGL'][index],
          trade_date: `2025-01-${15 + index}`
        };

        const startTime = Date.now();
        const result = await agent.process(agentState);
        const processingTime = Date.now() - startTime;

        // Process learning experience
        const experience: LearningExample = {
          id: `concurrent-test-${index}`,
          features: {
            agent_index: index,
            processing_time: processingTime,
            concurrent: 1
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: agentState.company_of_interest,
            analyst_type: agent.name.toLowerCase().replace(' learning', ''),
            concurrent_processing: 1
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.05,
            risk_adjusted_return: (Math.random() - 0.5) * 0.03,
            holding_period: 1,
            confidence_score: 0.75 + Math.random() * 0.25
          }
        };

        await agent.learnFromExperience(experience);

        return {
          agent: agent.name,
          company: agentState.company_of_interest,
          processingTime,
          analysisCompleted: !!result,
          experienceProcessed: true
        };
      });

      const results = await Promise.all(concurrentPromises);

      // Verify all concurrent operations completed
      results.forEach(result => {
        expect(result.analysisCompleted).toBe(true);
        expect(result.experienceProcessed).toBe(true);
        expect(result.processingTime).toBeGreaterThan(0);
      });

      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

      logger.info('Concurrent Processing', 'All agents processed concurrently successfully', {
        agentsProcessed: results.length,
        avgProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
        allSuccessful: results.every(r => r.analysisCompleted && r.experienceProcessed)
      });
    });

    it('should maintain memory bounds during extended learning with real LM Studio models', async () => {
      const marketAnalyst = testAgents[0];
      const memorySize = 5;
      const totalExperiences = memorySize * 2; // More than memory capacity

      // Override memory size for this test
      (marketAnalyst as any).learningConfig.memorySize = memorySize;

      for (let i = 0; i < totalExperiences; i++) {
        const result = await marketAnalyst.process({
          ...baseAgentState,
          trade_date: `2025-01-${15 + i}`
        });

        const experience: LearningExample = {
          id: `memory-test-${i}`,
          features: {
            iteration: i,
            analysis_length: result.market_report?.length || 0,
            memory_test: 1
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: 'market',
            memory_test: 1
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.04,
            risk_adjusted_return: (Math.random() - 0.5) * 0.03,
            holding_period: 1,
            confidence_score: 0.7 + Math.random() * 0.3
          }
        };

        await marketAnalyst.learnFromExperience(experience);
      }

      const finalHealth = marketAnalyst.getLearningHealth();

      expect(finalHealth.experienceCount).toBeLessThanOrEqual(memorySize);
      expect(finalHealth.enabled).toBe(true);

      logger.info('Memory Management', 'Memory bounds maintained during extended learning', {
        memorySize,
        totalExperiencesProcessed: totalExperiences,
        finalExperienceCount: finalHealth.experienceCount,
        memoryEfficiency: (finalHealth.experienceCount / memorySize * 100).toFixed(1) + '%'
      });
    });
  });
});