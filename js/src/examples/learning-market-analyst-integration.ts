import { ChatOpenAI } from '@langchain/openai';
import { LearningMarketAnalyst } from '../agents/analysts/learning-market-analyst';
import { AgentState } from '../types/agent-states';
import { createLogger } from '../utils/enhanced-logger';

/**
 * Comprehensive Integration Example: Learning-Enabled Market Analyst
 *
 * This example demonstrates how to:
 * 1. Create a learning-enabled market analyst
 * 2. Configure learning parameters for financial analysis
 * 3. Process market data with learning integration
 * 4. Extract and apply learned insights
 * 5. Monitor learning performance and adaptations
 */

export class LearningMarketAnalystIntegrationExample {
  private readonly logger = createLogger('test', 'LearningMarketAnalystIntegration');

  /**
   * Helper to create LLM with proper API key validation
   */
  private createLLM(temperature: number = 0.3): ChatOpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature,
      openAIApiKey: apiKey
    });
  }

  /**
   * Example 1: Basic Learning Market Analyst Setup
   */
  async exampleBasicSetup(): Promise<void> {
    this.logger.info('exampleBasicSetup', 'Starting basic learning market analyst setup');

    // Create LLM instance
    const llm = this.createLLM();

    // Create learning-enabled market analyst with default configuration
    const learningAnalyst = new LearningMarketAnalyst(llm, []);

    this.logger.info('exampleBasicSetup', 'Learning market analyst created successfully', {
      name: learningAnalyst.name,
      description: learningAnalyst.description,
      learningEnabled: learningAnalyst.learningEnabled
    });
  }

  /**
   * Example 2: Advanced Configuration for Financial Analysis
   */
  async exampleAdvancedConfiguration(): Promise<void> {
    this.logger.info('exampleAdvancedConfiguration', 'Starting advanced configuration example');

    const llm = this.createLLM(0.2);

    // Configure learning specifically for financial markets
    const learningConfig = {
      enableSupervisedLearning: true,    // Learn from successful predictions
      enableUnsupervisedLearning: true,  // Detect market regimes
      enableReinforcementLearning: true, // Optimize analysis strategies
      learningRate: 0.05,               // Conservative learning for financial data
      memorySize: 500,                  // Keep extensive historical data
      adaptationThreshold: 0.75,        // High confidence threshold for adaptations
      feedbackLoopEnabled: true,        // Enable continuous learning
      experienceBufferSize: 1000,       // Large buffer for market data
      minSamplesForLearning: 50         // Require substantial data before learning
    };

    const _advancedAnalyst = new LearningMarketAnalyst(llm, [], learningConfig);

    this.logger.info('exampleAdvancedConfiguration', 'Advanced learning analyst configured', {
      learningRate: learningConfig.learningRate,
      memorySize: learningConfig.memorySize,
      adaptationThreshold: learningConfig.adaptationThreshold
    });
  }

  /**
   * Example 3: Processing Market Data with Learning Integration
   */
  async exampleMarketAnalysisWithLearning(): Promise<void> {
    this.logger.info('exampleMarketAnalysisWithLearning', 'Starting market analysis with learning');

    const llm = this.createLLM();

    const analyst = new LearningMarketAnalyst(llm, []);

    // Create sample market state
    const marketState: AgentState = {
      messages: [],
      company_of_interest: 'AAPL',
      trade_date: '2025-01-15',
      market_report: 'Previous analysis showed bullish momentum with RSI at 65',
      sender: 'test'
    };

    // Process with learning integration
    const result = await analyst.process(marketState);

    this.logger.info('exampleMarketAnalysisWithLearning', 'Market analysis completed', {
      company: result.company_of_interest,
      hasReport: !!result.market_report,
      reportLength: result.market_report?.length || 0,
      messageCount: result.messages?.length || 0
    });

    // Extract learning insights
    const insights = await analyst.getLearnedInsights();
    this.logger.info('exampleMarketAnalysisWithLearning', 'Learned insights extracted', {
      totalInsights: insights.length,
      highConfidenceInsights: insights.filter((i: any) => i.confidence_score > 0.8).length
    });
  }

  /**
   * Example 4: Learning from Multiple Market Scenarios
   */
  async exampleLearningFromScenarios(): Promise<void> {
    this.logger.info('exampleLearningFromScenarios', 'Starting multi-scenario learning example');

    const llm = this.createLLM();

    const analyst = new LearningMarketAnalyst(llm, []);

    // Simulate multiple market scenarios
    const scenarios = [
      { company: 'AAPL', date: '2025-01-15', context: 'Strong earnings beat' },
      { company: 'TSLA', date: '2025-01-16', context: 'EV market volatility' },
      { company: 'NVDA', date: '2025-01-17', context: 'AI chip demand surge' },
      { company: 'MSFT', date: '2025-01-18', context: 'Cloud revenue growth' }
    ];

    for (const scenario of scenarios) {
      const state: AgentState = {
        messages: [],
        company_of_interest: scenario.company,
        trade_date: scenario.date,
        market_report: `Market context: ${scenario.context}`,
        sender: 'scenario-test'
      };

      // Process scenario and learn from it
      await analyst.process(state);

      // Simulate learning feedback (in real implementation, this would come from actual market outcomes)
      await analyst.learnFromExperience({
        id: `scenario-${scenario.company}-${Date.now()}`,
        features: { volatility: Math.random(), momentum: Math.random() },
        target: Math.random() > 0.5 ? 1 : -1, // Random outcome for demo
        timestamp: new Date().toISOString(),
        market_conditions: {
          company: scenario.company,
          analysis_date: scenario.date,
          analyst_type: 'market'
        },
        outcome: {
          realized_return: (Math.random() - 0.5) * 0.1, // Random return
          risk_adjusted_return: (Math.random() - 0.5) * 0.05,
          holding_period: 1,
          confidence_score: Math.random() * 0.5 + 0.5 // 0.5-1.0 range
        }
      });

      this.logger.debug('exampleLearningFromScenarios', 'Processed scenario', {
        company: scenario.company,
        context: scenario.context
      });
    }

    // Check accumulated learning
    const insights = await analyst.getLearnedInsights();
    this.logger.info('exampleLearningFromScenarios', 'Learning from scenarios completed', {
      scenariosProcessed: scenarios.length,
      totalInsights: insights.length,
      averageConfidence: insights.reduce((sum: number, i: any) => sum + i.confidence_score, 0) / insights.length
    });
  }

  /**
   * Example 5: Monitoring Learning Performance and Adaptations
   */
  async exampleLearningPerformanceMonitoring(): Promise<void> {
    this.logger.info('exampleLearningPerformanceMonitoring', 'Starting performance monitoring example');

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    const analyst = new LearningMarketAnalyst(llm, []);

    // Get learning health status
    const health = analyst.getLearningHealth();
    this.logger.info('exampleLearningPerformanceMonitoring', 'Learning health status', {
      enabled: health.enabled,
      supervised: health.supervised,
      unsupervised: health.unsupervised,
      reinforcement: health.reinforcement,
      experienceCount: health.experienceCount
    });
  }

  /**
   * Example 6: Custom Learning Configuration for Different Market Conditions
   */
  async exampleCustomLearningConfiguration(): Promise<void> {
    this.logger.info('exampleCustomLearningConfiguration', 'Starting custom configuration example');

    const llm = this.createLLM();

    // Configuration for volatile markets
    const volatileMarketConfig = {
      enableSupervisedLearning: true,
      enableUnsupervisedLearning: true,
      enableReinforcementLearning: false, // Disable RL in volatile conditions
      learningRate: 0.02,                // Very conservative learning
      memorySize: 200,                   // Smaller memory for volatile data
      adaptationThreshold: 0.85,         // Very high threshold for adaptations
      feedbackLoopEnabled: true
    };

    // Configuration for stable markets
    const stableMarketConfig = {
      enableSupervisedLearning: true,
      enableUnsupervisedLearning: true,
      enableReinforcementLearning: true, // Enable RL in stable conditions
      learningRate: 0.08,               // More aggressive learning
      memorySize: 800,                  // Larger memory for stable patterns
      adaptationThreshold: 0.65,        // Lower threshold for adaptations
      feedbackLoopEnabled: true
    };

    const _volatileAnalyst = new LearningMarketAnalyst(llm, [], volatileMarketConfig);
    const _stableAnalyst = new LearningMarketAnalyst(llm, [], stableMarketConfig);

    this.logger.info('exampleCustomLearningConfiguration', 'Custom configurations created', {
      volatileLearningRate: volatileMarketConfig.learningRate,
      stableLearningRate: stableMarketConfig.learningRate,
      volatileThreshold: volatileMarketConfig.adaptationThreshold,
      stableThreshold: stableMarketConfig.adaptationThreshold
    });
  }

  /**
   * Run all integration examples
   */
  async runAllExamples(): Promise<void> {
    this.logger.info('runAllExamples', 'Starting comprehensive integration examples');

    try {
      await this.exampleBasicSetup();
      await this.exampleAdvancedConfiguration();
      await this.exampleMarketAnalysisWithLearning();
      await this.exampleLearningFromScenarios();
      await this.exampleLearningPerformanceMonitoring();
      await this.exampleCustomLearningConfiguration();

      this.logger.info('runAllExamples', 'All integration examples completed successfully');
    } catch (error) {
      this.logger.error('runAllExamples', 'Integration examples failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

/**
 * Standalone function to demonstrate learning market analyst integration
 */
export async function demonstrateLearningMarketAnalyst(): Promise<void> {
  const example = new LearningMarketAnalystIntegrationExample();
  await example.runAllExamples();
}

// Export for use in other modules
export { LearningMarketAnalyst } from '../agents/analysts/learning-market-analyst';