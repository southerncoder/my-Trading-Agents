/**
 * Agent Factory for LangGraph Integration
 * 
 * Creates and configures trading agents for use in LangGraph workflows
 */

import { MarketAnalyst } from '../agents/analysts/market-analyst';
import { SocialAnalyst } from '../agents/analysts/social-analyst';
import { NewsAnalyst } from '../agents/analysts/news-analyst';
import { FundamentalsAnalyst } from '../agents/analysts/fundamentals-analyst';
import { BullResearcher } from '../agents/researchers/bull-researcher';
import { BearResearcher } from '../agents/researchers/bear-researcher';
import { ResearchManager } from '../agents/managers/research-manager';
import { RiskyAnalyst } from '../agents/risk-mgmt/risky-analyst';
import { SafeAnalyst } from '../agents/risk-mgmt/safe-analyst';
import { NeutralAnalyst } from '../agents/risk-mgmt/neutral-analyst';
import { PortfolioManager } from '../agents/risk-mgmt/portfolio-manager';
import { LearningTrader } from '../agents/traders/learning-trader';
import { ModelProvider, LLMProvider } from '../models/provider';
import { createLogger } from '../utils/enhanced-logger';
import { YahooFinanceAPI } from '../dataflows/yahoo-finance';
import { TradingAgentsConfig } from '../types/config';
import { AnalystType } from './langgraph-working';

const logger = createLogger('graph', 'agent-factory');

/**
 * Factory for creating configured trading agents
 */
export class AgentFactory {
  private config: TradingAgentsConfig;
  private yahooFinance: YahooFinanceAPI;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.yahooFinance = new YahooFinanceAPI(config);
    
    logger.info('constructor', 'AgentFactory initialized', {
      dataDir: config.dataDir,
      resultsDir: config.resultsDir
    });
  }

  /**
   * Create a Market Analyst with real data provider and LLM
   */
  async createMarketAnalyst(): Promise<MarketAnalyst> {
    try {
      logger.info('createMarketAnalyst', 'Creating Market Analyst instance');

      // Create LLM for market analysis
      const llm = await this.createLLM();

      // Create tools for market analyst
      const tools = await this.createMarketAnalystTools();

      // Create and return the market analyst
      const analyst = new MarketAnalyst(llm, tools);
      
      logger.info('createMarketAnalyst', 'Market Analyst created successfully', {
        hasTools: tools.length > 0,
        toolCount: tools.length
      });

      return analyst;
    } catch (error) {
      logger.error('createMarketAnalyst', 'Error creating Market Analyst', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create tools for Market Analyst
   */
  private async createMarketAnalystTools(): Promise<any[]> {
    const { DynamicStructuredTool } = await import('@langchain/core/tools');
    const { z } = await import('zod');

    return [
      new DynamicStructuredTool({
        name: 'get_historical_price_data',
        description: 'Get historical stock price data for technical analysis. Returns OHLCV (Open, High, Low, Close, Volume) data.',
        schema: z.object({
          symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, MSFT)'),
          startDate: z.string().describe('Start date in YYYY-MM-DD format'),
          endDate: z.string().describe('End date in YYYY-MM-DD format')
        }),
        func: async (input: { symbol: string; startDate: string; endDate: string }) => {
          try {
            const data = await this.yahooFinance.getData(input.symbol, input.startDate, input.endDate, true);
            return data;
          } catch (error) {
            return `Error fetching data: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: 'get_current_quote',
        description: 'Get current real-time quote for a stock including price, volume, and basic metrics.',
        schema: z.object({
          symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, MSFT)')
        }),
        func: async (input: { symbol: string }) => {
          try {
            const quote = await this.yahooFinance.getQuote(input.symbol);
            return JSON.stringify(quote, null, 2);
          } catch (error) {
            return `Error fetching quote: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: 'get_quote_summary',
        description: 'Get comprehensive quote summary including key statistics, price details, and financial metrics.',
        schema: z.object({
          symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, MSFT)'),
          modules: z.array(z.string()).optional().describe('Specific data modules to fetch (e.g., price, summaryDetail, defaultKeyStatistics)')
        }),
        func: async (input: { symbol: string; modules?: string[] }) => {
          try {
            const summary = await this.yahooFinance.getQuoteSummary(
              input.symbol,
              input.modules || ['price', 'summaryDetail', 'defaultKeyStatistics']
            );
            return JSON.stringify(summary, null, 2);
          } catch (error) {
            return `Error fetching summary: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      })
    ];
  }

  /**
   * Create a Social Analyst
   */
  async createSocialAnalyst(): Promise<SocialAnalyst> {
    logger.info('createSocialAnalyst', 'Creating Social Analyst instance');
    
    const llm = await this.createLLM();
    return new SocialAnalyst(llm, []);
  }

  /**
   * Create a News Analyst
   */
  async createNewsAnalyst(): Promise<NewsAnalyst> {
    logger.info('createNewsAnalyst', 'Creating News Analyst instance');
    
    const llm = await this.createLLM();
    return new NewsAnalyst(llm, []);
  }

  /**
   * Create a Fundamentals Analyst
   */
  async createFundamentalsAnalyst(): Promise<FundamentalsAnalyst> {
    logger.info('createFundamentalsAnalyst', 'Creating Fundamentals Analyst instance');
    
    const llm = await this.createLLM();
    const tools = await this.createFundamentalsAnalystTools();
    return new FundamentalsAnalyst(llm, tools);
  }

  /**
   * Create tools for Fundamentals Analyst
   */
  private async createFundamentalsAnalystTools(): Promise<any[]> {
    const { DynamicStructuredTool } = await import('@langchain/core/tools');
    const { z } = await import('zod');

    return [
      new DynamicStructuredTool({
        name: 'get_fundamentals',
        description: 'Get fundamental financial data including key statistics, financial ratios, and company profile.',
        schema: z.object({
          symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, MSFT)'),
          startDate: z.string().describe('Start date for analysis in YYYY-MM-DD format')
        }),
        func: async (input: { symbol: string; startDate: string }) => {
          try {
            const fundamentals = await this.yahooFinance.getFundamentals(input.symbol, input.startDate);
            return JSON.stringify(fundamentals, null, 2);
          } catch (error) {
            return `Error fetching fundamentals: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      })
    ];
  }

  /**
   * Create Bull Researcher
   */
  async createBullResearcher(): Promise<BullResearcher> {
    logger.info('createBullResearcher', 'Creating Bull Researcher instance');
    
    const llm = await this.createLLM();
    return new BullResearcher(llm, []);
  }

  /**
   * Create Bear Researcher
   */
  async createBearResearcher(): Promise<BearResearcher> {
    logger.info('createBearResearcher', 'Creating Bear Researcher instance');
    
    const llm = await this.createLLM();
    return new BearResearcher(llm, []);
  }

  /**
   * Create Research Manager
   */
  async createResearchManager(): Promise<ResearchManager> {
    logger.info('createResearchManager', 'Creating Research Manager instance');
    
    const llm = await this.createLLM('deepThinkLlm'); // Use deep thinking model
    return new ResearchManager(llm, []);
  }

  /**
   * Create Risky Analyst
   */
  async createRiskyAnalyst(): Promise<RiskyAnalyst> {
    logger.info('createRiskyAnalyst', 'Creating Risky Analyst instance');
    
    const llm = await this.createLLM();
    return new RiskyAnalyst(llm, []);
  }

  /**
   * Create Safe Analyst
   */
  async createSafeAnalyst(): Promise<SafeAnalyst> {
    logger.info('createSafeAnalyst', 'Creating Safe Analyst instance');
    
    const llm = await this.createLLM();
    return new SafeAnalyst(llm, []);
  }

  /**
   * Create Neutral Analyst
   */
  async createNeutralAnalyst(): Promise<NeutralAnalyst> {
    logger.info('createNeutralAnalyst', 'Creating Neutral Analyst instance');
    
    const llm = await this.createLLM();
    return new NeutralAnalyst(llm, []);
  }

  /**
   * Create Portfolio Manager
   */
  async createPortfolioManager(): Promise<PortfolioManager> {
    logger.info('createPortfolioManager', 'Creating Portfolio Manager instance');
    
    const llm = await this.createLLM('deepThinkLlm'); // Use deep thinking model
    return new PortfolioManager(llm, []);
  }

  /**
   * Create Learning Trader
   */
  async createLearningTrader(): Promise<LearningTrader> {
    logger.info('createLearningTrader', 'Creating Learning Trader instance');
    
    const llm = await this.createLLM('deepThinkLlm'); // Use deep thinking model
    return new LearningTrader(llm, []);
  }

  /**
   * Helper method to create LLM with API key
   */
  private async createLLM(modelKey: 'quickThinkLlm' | 'deepThinkLlm' = 'quickThinkLlm'): Promise<any> {
    const provider = (this.config.llmProvider || 'openai') as LLMProvider;
    let apiKey: string | undefined;
    
    if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY;
    } else if (provider === 'anthropic') {
      apiKey = process.env.ANTHROPIC_API_KEY;
    } else if (provider === 'google') {
      apiKey = process.env.GOOGLE_API_KEY;
    }

    const modelConfig: any = {
      provider,
      modelName: this.config[modelKey] || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000
    };
    
    if (apiKey) {
      modelConfig.apiKey = apiKey;
    }
    
    return ModelProvider.createModelAsync(modelConfig);
  }

  /**
   * Create an analyst by type
   */
  async createAnalyst(type: AnalystType): Promise<any> {
    switch (type) {
      case 'market':
        return this.createMarketAnalyst();
      case 'social':
        return this.createSocialAnalyst();
      case 'news':
        return this.createNewsAnalyst();
      case 'fundamentals':
        return this.createFundamentalsAnalyst();
      default:
        throw new Error(`Unknown analyst type: ${type}`);
    }
  }
}

/**
 * Factory function to create AgentFactory instance
 */
export function createAgentFactory(config: TradingAgentsConfig): AgentFactory {
  return new AgentFactory(config);
}
