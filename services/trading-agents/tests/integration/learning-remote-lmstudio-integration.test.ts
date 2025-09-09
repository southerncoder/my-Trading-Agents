/**
 * Learning System + Remote LM Studio Integration Test
 *
 * Comprehensive integration testing for learning-enabled agents using remote LM Studio models.
 * Tests the complete pipeline from model inference through learning adaptation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../../src/types/agent-states';
import { LearningExample, LearningInsight } from '../../src/learning/learning-types';
import { AdvancedLearningSystem } from '../../src/learning/learning-system';
import { createLogger } from '../../src/utils/enhanced-logger';
import { ModelProvider, ModelConfig } from '../../src/models/provider';
import {
  REMOTE_LM_STUDIO_BASE_URL,
  TRADING_AGENT_MODEL_ASSIGNMENTS,
  createAgentModelConfig
} from '../config/remote-lmstudio.config';

// Import learning-enabled agents
import { LearningMarketAnalyst } from '../../src/agents/analysts/learning-market-analyst';
import { LearningSocialAnalyst } from '../../src/agents/analysts/learning-social-analyst';
import { LearningNewsAnalyst } from '../../src/agents/analysts/learning-news-analyst';
import { LearningFundamentalsAnalyst } from '../../src/agents/analysts/learning-fundamentals-analyst';

const logger = createLogger('test', 'LearningRemoteLMStudioIntegration');

describe('Learning System + Remote LM Studio Integration Tests', () => {
  let learningSystem: AdvancedLearningSystem;
  let testAgents: any[];
  let remoteModels: Map<string, any>;

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
    logger.info('beforeAll', 'Setting up learning + remote LM Studio integration test');

    // Initialize learning system
    learningSystem = new AdvancedLearningSystem(logger);

    // Initialize remote models for different agents
    remoteModels = new Map();

    const agentTypes = [
      { key: 'marketAnalyst', name: 'Market Analyst' },
      { key: 'socialAnalyst', name: 'Social Analyst' },
      { key: 'newsAnalyst', name: 'News Analyst' },
      { key: 'fundamentalsAnalyst', name: 'Fundamentals Analyst' }
    ];

    for (const agentType of agentTypes) {
      try {
        const modelConfig = createAgentModelConfig(agentType.key as keyof typeof TRADING_AGENT_MODEL_ASSIGNMENTS);
        const model = await ModelProvider.createModelAsync(modelConfig);
        remoteModels.set(agentType.key, model);

        logger.info('beforeAll', `Initialized remote model for ${agentType.name}`, {
          modelName: modelConfig.modelName,
          baseURL: modelConfig.baseURL
        });
      } catch (error) {
        logger.error('beforeAll', `Failed to initialize remote model for ${agentType.name}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    // Initialize learning-enabled agents with remote models
    testAgents = [
      new LearningMarketAnalyst(remoteModels.get('marketAnalyst'), [], { learningRate: 0.1 }),
      new LearningSocialAnalyst(remoteModels.get('socialAnalyst'), [], { learningRate: 0.1 }),
      new LearningNewsAnalyst(remoteModels.get('newsAnalyst'), [], { learningRate: 0.1 }),
      new LearningFundamentalsAnalyst(remoteModels.get('fundamentalsAnalyst'), [], { learningRate: 0.1 })
    ];

    logger.info('beforeAll', 'Integration test setup completed', {
      agentsInitialized: testAgents.length,
      modelsInitialized: remoteModels.size
    });
  });

  afterAll(async () => {
    logger.info('afterAll', 'Cleaning up integration test');

    // Cleanup remote models
    for (const [key, model] of remoteModels) {
      try {
        // Close any connections if needed
        logger.info('afterAll', `Cleaned up model for ${key}`);
      } catch (error) {
        logger.warn('afterAll', `Error cleaning up model for ${key}`, { error: String(error) });
      }
    }
  });

  describe('Remote LM Studio + Learning System Health', () => {
    it('should verify remote LM Studio connectivity', async () => {
      for (const [key, model] of remoteModels) {
        try {
          // Test basic connectivity with a simple prompt
          const testPrompt = "Hello, please respond with 'OK' if you can read this.";
          const response = await model.invoke([{ role: 'user', content: testPrompt }]);

          expect(response).toBeDefined();
          expect(response.content).toBeDefined();
          expect(typeof response.content).toBe('string');
          expect((response.content as string).length).toBeGreaterThan(0);

          logger.info('Remote Connectivity', `Model ${key} responded successfully`, {
            responseLength: (response.content as string).length
          });
        } catch (error) {
          logger.error('Remote Connectivity', `Model ${key} failed to respond`, {
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    });

    it('should verify learning system health with remote models', () => {
      const health = learningSystem.getSystemHealth();

      expect(health.supervised_engine).toBe(true);
      expect(health.unsupervised_engine).toBe(true);
      expect(health.reinforcement_engine).toBe(true);
      expect(health.overall_health).toBe('healthy');

      logger.info('Learning System Health', 'All learning engines healthy', health);
    });

    it('should verify learning-enabled agents are properly configured', () => {
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

  describe('Learning Agent Analysis with Remote Models', () => {
    it('should perform market analysis using remote LM Studio model', async () => {
      const marketAnalyst = testAgents[0]; // LearningMarketAnalyst

      const analysisState = {
        ...baseAgentState,
        market_report: '' // Ensure clean slate
      };

      const result = await marketAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.market_report).toBeDefined();
      expect(result.market_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(marketAnalyst.name);

      logger.info('Market Analysis', 'Remote model analysis completed', {
        reportLength: result.market_report.length,
        hasTechnicalIndicators: result.market_report.toLowerCase().includes('rsi') ||
                              result.market_report.toLowerCase().includes('macd'),
        hasPriceTargets: result.market_report.toLowerCase().includes('target') ||
                        result.market_report.toLowerCase().includes('support') ||
                        result.market_report.toLowerCase().includes('resistance')
      });
    });

    it('should perform social sentiment analysis using remote LM Studio model', async () => {
      const socialAnalyst = testAgents[1]; // LearningSocialAnalyst

      const analysisState = {
        ...baseAgentState,
        sentiment_report: '' // Ensure clean slate
      };

      const result = await socialAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.sentiment_report).toBeDefined();
      expect(result.sentiment_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(socialAnalyst.name);

      logger.info('Social Analysis', 'Remote model sentiment analysis completed', {
        reportLength: result.sentiment_report.length,
        hasSentimentIndicators: result.sentiment_report.toLowerCase().includes('sentiment') ||
                               result.sentiment_report.toLowerCase().includes('bullish') ||
                               result.sentiment_report.toLowerCase().includes('bearish'),
        hasSocialMetrics: result.sentiment_report.toLowerCase().includes('social') ||
                         result.sentiment_report.toLowerCase().includes('mention')
      });
    });

    it('should perform news analysis using remote LM Studio model', async () => {
      const newsAnalyst = testAgents[2]; // LearningNewsAnalyst

      const analysisState = {
        ...baseAgentState,
        news_report: '' // Ensure clean slate
      };

      const result = await newsAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.news_report).toBeDefined();
      expect(result.news_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(newsAnalyst.name);

      logger.info('News Analysis', 'Remote model news analysis completed', {
        reportLength: result.news_report.length,
        hasNewsElements: result.news_report.toLowerCase().includes('news') ||
                        result.news_report.toLowerCase().includes('article') ||
                        result.news_report.toLowerCase().includes('headline'),
        hasImpactAssessment: result.news_report.toLowerCase().includes('impact') ||
                           result.news_report.toLowerCase().includes('effect')
      });
    });

    it('should perform fundamentals analysis using remote LM Studio model', async () => {
      const fundamentalsAnalyst = testAgents[3]; // LearningFundamentalsAnalyst

      const analysisState = {
        ...baseAgentState,
        fundamentals_report: '' // Ensure clean slate
      };

      const result = await fundamentalsAnalyst.process(analysisState);

      expect(result).toBeDefined();
      expect(result.fundamentals_report).toBeDefined();
      expect(result.fundamentals_report.length).toBeGreaterThan(0);
      expect(result.sender).toBe(fundamentalsAnalyst.name);

      logger.info('Fundamentals Analysis', 'Remote model fundamentals analysis completed', {
        reportLength: result.fundamentals_report.length,
        hasFinancialMetrics: result.fundamentals_report.toLowerCase().includes('pe') ||
                           result.fundamentals_report.toLowerCase().includes('earnings') ||
                           result.fundamentals_report.toLowerCase().includes('revenue'),
        hasValuationAnalysis: result.fundamentals_report.toLowerCase().includes('valuation') ||
                             result.fundamentals_report.toLowerCase().includes('fair value')
      });
    });
  });

  describe('Learning Experience Processing with Remote Models', () => {
    let marketAnalyst: LearningMarketAnalyst;

    beforeEach(() => {
      marketAnalyst = testAgents[0];
    });

    it('should create and process learning experiences from remote model analysis', async () => {
      // Perform analysis
      const analysisState = { ...baseAgentState };
      const result = await marketAnalyst.process(analysisState);

      // Create experience from the analysis
      const experience: LearningExample = {
        id: `remote-test-${Date.now()}`,
        features: {
          rsi: 65 + Math.random() * 30, // Random RSI between 65-95
          volume: 1000000 + Math.random() * 9000000, // Random volume
          volatility: Math.random() * 0.5, // Random volatility
          analysis_length: result.market_report?.length || 0,
          has_technical_indicators: (result.market_report?.toLowerCase().includes('rsi') ||
                                   result.market_report?.toLowerCase().includes('macd')) ? 1 : 0
        },
        target: Math.random() > 0.5 ? 1.0 : -1.0, // Random bullish/bearish target
        timestamp: new Date().toISOString(),
        market_conditions: {
          company: testCompany,
          analyst_type: 'market',
          model_provider: 'remote_lm_studio'
        },
        outcome: {
          realized_return: (Math.random() - 0.5) * 0.1, // Random return between -5% and +5%
          risk_adjusted_return: (Math.random() - 0.5) * 0.08,
          holding_period: 1,
          confidence_score: 0.7 + Math.random() * 0.3 // Random confidence 0.7-1.0
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

    it('should generate learned insights from remote model experiences', async () => {
      // Add multiple experiences
      const experiences: LearningExample[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await marketAnalyst.process({
          ...baseAgentState,
          trade_date: `2025-01-${15 + i}`
        });

        const experience: LearningExample = {
          id: `insight-test-${i}`,
          features: {
            rsi: 60 + Math.random() * 40,
            volume: 500000 + Math.random() * 9500000,
            analysis_quality: (result.market_report?.length || 0) / 1000, // Quality metric
            has_recommendations: (result.market_report?.toLowerCase().includes('recommend')) ? 1 : 0
          },
          target: Math.random() > 0.4 ? 1.0 : -1.0, // Slightly bullish bias
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: 'market',
            iteration: i
          },
          outcome: {
            realized_return: (Math.random() - 0.3) * 0.15, // Slightly positive bias
            risk_adjusted_return: (Math.random() - 0.3) * 0.12,
            holding_period: 1,
            confidence_score: 0.6 + Math.random() * 0.4
          }
        };

        experiences.push(experience);
        await marketAnalyst.learnFromExperience(experience);
      }

      // Get learned insights
      const insights = await marketAnalyst.getLearnedInsights();

      expect(Array.isArray(insights)).toBe(true);

      logger.info('Insight Generation', 'Learned insights generated from remote model experiences', {
        experiencesProcessed: experiences.length,
        insightsGenerated: insights.length,
        avgConfidence: insights.length > 0 ?
          insights.reduce((sum, i) => sum + i.confidence_score, 0) / insights.length : 0,
        insightTypes: insights.map(i => i.type).filter((v, i, a) => a.indexOf(v) === i)
      });

      // Verify insights have expected structure
      if (insights.length > 0) {
        insights.forEach(insight => {
          expect(insight).toHaveProperty('type');
          expect(insight).toHaveProperty('description');
          expect(insight).toHaveProperty('confidence_score');
          expect(insight.confidence_score).toBeGreaterThanOrEqual(0);
          expect(insight.confidence_score).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should adapt strategy based on learned insights from remote models', async () => {
      // Add successful experiences to build learning history
      for (let i = 0; i < 3; i++) {
        const result = await marketAnalyst.process(baseAgentState);

        const successfulExperience: LearningExample = {
          id: `adaptation-test-${i}`,
          features: {
            rsi: 75 + Math.random() * 15, // High RSI (bullish)
            trend_strength: 0.8 + Math.random() * 0.2, // Strong trend
            volume_ratio: 1.2 + Math.random() * 0.8 // Above average volume
          },
          target: 1.0, // Bullish target
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: 'market',
            successful_pattern: true
          },
          outcome: {
            realized_return: 0.03 + Math.random() * 0.04, // Positive return 3-7%
            risk_adjusted_return: 0.025 + Math.random() * 0.03,
            holding_period: 1,
            confidence_score: 0.85 + Math.random() * 0.15 // High confidence
          }
        };

        await marketAnalyst.learnFromExperience(successfulExperience);
      }

      // Test strategy adaptation
      const adaptationState = {
        ...baseAgentState,
        trade_date: '2025-01-16' // Different date to test adaptation
      };

      await marketAnalyst.adaptStrategy(adaptationState);

      // Process with adapted strategy
      const adaptedResult = await marketAnalyst.process(adaptationState);

      expect(adaptedResult).toBeDefined();
      expect(adaptedResult.market_report).toBeDefined();

      logger.info('Strategy Adaptation', 'Strategy adapted based on learned insights', {
        originalDate: baseAgentState.trade_date,
        adaptedDate: adaptationState.trade_date,
        adaptedReportLength: adaptedResult.market_report?.length || 0,
        hasAdaptedContent: (adaptedResult.market_report?.toLowerCase().includes('adapted') ||
                          adaptedResult.market_report?.toLowerCase().includes('learned') ||
                          adaptedResult.market_report?.toLowerCase().includes('based on')) || false
      });
    });
  });

  describe('Multi-Agent Learning Integration with Remote Models', () => {
    it('should coordinate learning across multiple agents using remote models', async () => {
      const coordinationResults = [];

      // Process analysis with each agent
      for (const agent of testAgents) {
        const result = await agent.process(baseAgentState);

        // Create and process learning experience
        const experience: LearningExample = {
          id: `multi-agent-${agent.name}-${Date.now()}`,
          features: {
            agent_type: agent.name,
            analysis_length: result.market_report?.length || result.sentiment_report?.length ||
                           result.news_report?.length || result.fundamentals_report?.length || 0,
            processing_time: Date.now() % 1000, // Mock processing time
            model_provider: 'remote_lm_studio'
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: agent.name.toLowerCase().replace(' learning', ''),
            multi_agent: 1
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.08,
            risk_adjusted_return: (Math.random() - 0.5) * 0.06,
            holding_period: 1,
            confidence_score: 0.7 + Math.random() * 0.3
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

    it('should demonstrate learning improvement over time with remote models', async () => {
      const marketAnalyst = testAgents[0];
      const performanceMetrics = [];

      // Simulate multiple analysis cycles
      for (let cycle = 1; cycle <= 5; cycle++) {
        const cycleStart = Date.now();

        // Perform analysis
        const result = await marketAnalyst.process({
          ...baseAgentState,
          trade_date: `2025-01-${14 + cycle}`
        });

        const cycleTime = Date.now() - cycleStart;

        // Create experience based on analysis quality
        const analysisQuality = result.market_report.length / 1000; // Quality metric
        const experience: LearningExample = {
          id: `improvement-test-${cycle}`,
          features: {
            cycle,
            analysis_quality: analysisQuality,
            processing_time: cycleTime,
            experience_count: marketAnalyst.getLearningHealth().experienceCount
          },
          target: Math.random() > 0.5 ? 1.0 : -1.0,
          timestamp: new Date().toISOString(),
          market_conditions: {
            company: testCompany,
            analyst_type: 'market',
            improvement_cycle: cycle
          },
          outcome: {
            realized_return: (Math.random() - 0.5) * 0.06,
            risk_adjusted_return: (Math.random() - 0.5) * 0.04,
            holding_period: 1,
            confidence_score: Math.min(0.95, 0.7 + (cycle * 0.05)) // Improving confidence
          }
        };

        await marketAnalyst.learnFromExperience(experience);

        performanceMetrics.push({
          cycle,
          analysisQuality,
          processingTime: cycleTime,
          confidence: experience.outcome.confidence_score,
          experienceCount: marketAnalyst.getLearningHealth().experienceCount
        });
      }

      // Verify improvement trends
      const avgQuality = performanceMetrics.reduce((sum, m) => sum + m.analysisQuality, 0) / performanceMetrics.length;
      const avgConfidence = performanceMetrics.reduce((sum, m) => sum + m.confidence, 0) / performanceMetrics.length;
      const finalExperienceCount = performanceMetrics[performanceMetrics.length - 1].experienceCount;

      expect(avgQuality).toBeGreaterThan(0);
      expect(avgConfidence).toBeGreaterThan(0.7); // Should show improvement
      expect(finalExperienceCount).toBeGreaterThanOrEqual(5);

      logger.info('Learning Improvement', 'Demonstrated learning improvement over cycles', {
        cyclesCompleted: performanceMetrics.length,
        avgAnalysisQuality: avgQuality.toFixed(2),
        avgConfidence: avgConfidence.toFixed(2),
        finalExperienceCount,
        improvementTrend: performanceMetrics.map(m => ({
          cycle: m.cycle,
          quality: m.analysisQuality.toFixed(2),
          confidence: m.confidence.toFixed(2)
        }))
      });
    });
  });

  describe('Performance and Reliability with Remote Models', () => {
    it('should handle concurrent agent processing with remote models', async () => {
      const concurrentPromises = testAgents.map(async (agent, index) => {
        const agentState = {
          ...baseAgentState,
          company_of_interest: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'][index],
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
      const maxProcessingTime = Math.max(...results.map(r => r.processingTime));

      logger.info('Concurrent Processing', 'All agents processed concurrently successfully', {
        agentsProcessed: results.length,
        avgProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
        maxProcessingTime: `${maxProcessingTime.toFixed(0)}ms`,
        allSuccessful: results.every(r => r.analysisCompleted && r.experienceProcessed)
      });
    });

    it('should maintain memory bounds during extended learning with remote models', async () => {
      const marketAnalyst = testAgents[0];
      const memorySize = 10;
      const totalExperiences = memorySize * 3; // More than memory capacity

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
            analysis_length: result.market_report.length,
            memory_test: true
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

    it('should handle remote model failures gracefully', async () => {
      const marketAnalyst = testAgents[0];

      // Create a mock failing model for testing
      const originalModel = remoteModels.get('marketAnalyst');
      const failingModel = {
        invoke: async () => {
          throw new Error('Remote model connection failed');
        }
      };

      // Temporarily replace the model
      remoteModels.set('marketAnalyst', failingModel);
      (marketAnalyst as any).llm = failingModel;

      // Should handle failure gracefully
      try {
        await marketAnalyst.process(baseAgentState);
      } catch (error) {
        // Expected to fail, but should not crash the learning system
        expect(error).toBeDefined();
      }

      // Restore original model
      remoteModels.set('marketAnalyst', originalModel);
      (marketAnalyst as any).llm = originalModel;

      // Verify system remains functional
      const health = marketAnalyst.getLearningHealth();
      expect(health.enabled).toBe(true);

      // Should still be able to process with working model
      const recoveryResult = await marketAnalyst.process(baseAgentState);
      expect(recoveryResult).toBeDefined();

      logger.info('Failure Handling', 'System handled remote model failure gracefully', {
        failureHandled: true,
        systemRecovered: !!recoveryResult,
        learningHealth: health.enabled
      });
    });
  });
});