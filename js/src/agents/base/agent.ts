import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { AgentState } from '../../types/agent-states';

/**
 * Base interface for all trading agents
 */
export interface BaseAgent {
  name: string;
  description: string;
  llm: BaseChatModel;
  tools: StructuredTool[] | undefined;
  
  /**
   * Process the agent's task with the given state
   */
  process(state: AgentState): Promise<Partial<AgentState>>;
  
  /**
   * Generate a system prompt for the agent
   */
  getSystemPrompt(): string;
  
  /**
   * Validate if the agent can process the current state
   */
  canProcess(state: AgentState): boolean;
}

/**
 * Abstract base class for trading agents
 */
export abstract class AbstractAgent implements BaseAgent {
  public name: string;
  public description: string;
  public llm: BaseChatModel;
  public tools: StructuredTool[] | undefined;

  constructor(
    name: string,
    description: string,
    llm: BaseChatModel,
    tools?: StructuredTool[]
  ) {
    this.name = name;
    this.description = description;
    this.llm = llm;
    this.tools = tools || undefined;
  }

  abstract process(state: AgentState): Promise<Partial<AgentState>>;
  abstract getSystemPrompt(): string;

  canProcess(state: AgentState): boolean {
    // Default implementation - can process if company and date are set
    return !!(state.company_of_interest && state.trade_date);
  }

  /**
   * Helper method to invoke LLM with tools if available
   */
  protected async invokeLLM(messages: BaseMessage[]): Promise<BaseMessage> {
    if (this.tools && this.tools.length > 0 && this.llm.bindTools) {
      const llmWithTools = this.llm.bindTools(this.tools);
      return await llmWithTools.invoke(messages);
    }
    return await this.llm.invoke(messages);
  }

  /**
   * Helper method to create a formatted response
   */
  protected createResponse(content: string, sender?: string): AIMessage {
    return new AIMessage({
      content,
      additional_kwargs: {
        sender: sender || this.name,
      },
    });
  }
}

/**
 * Agent types enumeration
 */
export enum AgentType {
  // Analysts
  MARKET_ANALYST = 'market_analyst',
  SOCIAL_ANALYST = 'social_analyst', 
  NEWS_ANALYST = 'news_analyst',
  FUNDAMENTALS_ANALYST = 'fundamentals_analyst',
  
  // Researchers
  BULL_RESEARCHER = 'bull_researcher',
  BEAR_RESEARCHER = 'bear_researcher',
  
  // Managers
  RESEARCH_MANAGER = 'research_manager',
  PORTFOLIO_MANAGER = 'portfolio_manager',
  
  // Risk Management
  RISKY_ANALYST = 'risky_analyst',
  SAFE_ANALYST = 'safe_analyst',
  NEUTRAL_ANALYST = 'neutral_analyst',
  
  // Trader
  TRADER = 'trader',
}

/**
 * Agent role definitions
 */
export interface AgentRole {
  type: AgentType;
  name: string;
  description: string;
  responsibilities: string[];
  dependencies: AgentType[];
}

export const AGENT_ROLES: Record<AgentType, AgentRole> = {
  [AgentType.MARKET_ANALYST]: {
    type: AgentType.MARKET_ANALYST,
    name: 'Market Analyst',
    description: 'Analyzes market data, technical indicators, and price movements',
    responsibilities: [
      'Technical analysis of stock price movements',
      'Market trend identification',
      'Volume and momentum analysis',
      'Support and resistance level identification'
    ],
    dependencies: []
  },
  
  [AgentType.SOCIAL_ANALYST]: {
    type: AgentType.SOCIAL_ANALYST,
    name: 'Social Analyst',
    description: 'Analyzes social media sentiment and public opinion',
    responsibilities: [
      'Social media sentiment analysis',
      'Reddit discussion analysis',
      'Public opinion tracking',
      'Sentiment trend identification'
    ],
    dependencies: []
  },
  
  [AgentType.NEWS_ANALYST]: {
    type: AgentType.NEWS_ANALYST,
    name: 'News Analyst',
    description: 'Analyzes news events and their market impact',
    responsibilities: [
      'News event analysis',
      'Market-moving news identification',
      'Global event impact assessment',
      'News sentiment analysis'
    ],
    dependencies: []
  },
  
  [AgentType.FUNDAMENTALS_ANALYST]: {
    type: AgentType.FUNDAMENTALS_ANALYST,
    name: 'Fundamentals Analyst',
    description: 'Analyzes company fundamentals and financial metrics',
    responsibilities: [
      'Financial statement analysis',
      'Earnings and revenue analysis',
      'Company valuation metrics',
      'Industry comparison analysis'
    ],
    dependencies: []
  },
  
  [AgentType.BULL_RESEARCHER]: {
    type: AgentType.BULL_RESEARCHER,
    name: 'Bull Researcher',
    description: 'Argues for positive investment thesis',
    responsibilities: [
      'Develop bullish investment arguments',
      'Identify growth opportunities',
      'Highlight positive catalysts',
      'Counter bearish arguments'
    ],
    dependencies: [
      AgentType.MARKET_ANALYST,
      AgentType.SOCIAL_ANALYST,
      AgentType.NEWS_ANALYST,
      AgentType.FUNDAMENTALS_ANALYST
    ]
  },
  
  [AgentType.BEAR_RESEARCHER]: {
    type: AgentType.BEAR_RESEARCHER,
    name: 'Bear Researcher',
    description: 'Argues for negative investment thesis',
    responsibilities: [
      'Develop bearish investment arguments',
      'Identify potential risks',
      'Highlight negative catalysts',
      'Counter bullish arguments'
    ],
    dependencies: [
      AgentType.MARKET_ANALYST,
      AgentType.SOCIAL_ANALYST,
      AgentType.NEWS_ANALYST,
      AgentType.FUNDAMENTALS_ANALYST
    ]
  },
  
  [AgentType.RESEARCH_MANAGER]: {
    type: AgentType.RESEARCH_MANAGER,
    name: 'Research Manager',
    description: 'Synthesizes research and makes investment decisions',
    responsibilities: [
      'Evaluate bull and bear arguments',
      'Make final investment recommendations',
      'Synthesize research findings',
      'Provide balanced perspective'
    ],
    dependencies: [AgentType.BULL_RESEARCHER, AgentType.BEAR_RESEARCHER]
  },
  
  [AgentType.TRADER]: {
    type: AgentType.TRADER,
    name: 'Trader',
    description: 'Creates concrete trading plans and strategies',
    responsibilities: [
      'Create specific trading strategies',
      'Determine entry and exit points',
      'Set position sizing',
      'Define stop-loss and take-profit levels'
    ],
    dependencies: [AgentType.RESEARCH_MANAGER]
  },
  
  [AgentType.RISKY_ANALYST]: {
    type: AgentType.RISKY_ANALYST,
    name: 'Risky Analyst',
    description: 'Advocates for aggressive risk-taking strategies',
    responsibilities: [
      'Propose high-risk, high-reward strategies',
      'Identify aggressive opportunities',
      'Challenge conservative approaches',
      'Maximize return potential'
    ],
    dependencies: [AgentType.TRADER]
  },
  
  [AgentType.SAFE_ANALYST]: {
    type: AgentType.SAFE_ANALYST,
    name: 'Safe Analyst',
    description: 'Advocates for conservative risk management',
    responsibilities: [
      'Propose risk-averse strategies',
      'Identify potential downsides',
      'Emphasize capital preservation',
      'Challenge aggressive approaches'
    ],
    dependencies: [AgentType.TRADER]
  },
  
  [AgentType.NEUTRAL_ANALYST]: {
    type: AgentType.NEUTRAL_ANALYST,
    name: 'Neutral Analyst',
    description: 'Provides balanced risk assessment',
    responsibilities: [
      'Provide balanced risk perspective',
      'Mediate between aggressive and conservative views',
      'Identify optimal risk-reward balance',
      'Synthesize risk considerations'
    ],
    dependencies: [AgentType.TRADER]
  },
  
  [AgentType.PORTFOLIO_MANAGER]: {
    type: AgentType.PORTFOLIO_MANAGER,
    name: 'Portfolio Manager',
    description: 'Makes final trading decisions with risk considerations',
    responsibilities: [
      'Make final trading decisions',
      'Balance risk and reward',
      'Consider portfolio implications',
      'Approve or reject trading plans'
    ],
    dependencies: [
      AgentType.RISKY_ANALYST,
      AgentType.SAFE_ANALYST,
      AgentType.NEUTRAL_ANALYST
    ]
  }
};