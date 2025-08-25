import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent, AgentType } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Trader Agent
 * Creates concrete trading plans and strategies based on research recommendations
 */
export class Trader extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Trader',
      'Creates specific trading strategies, entry/exit points, and position sizing based on research decisions',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from research decision
      const humanMessage = this.createTradingRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract trading plan from response
      let tradingPlan = '';
      if (typeof response.content === 'string') {
        tradingPlan = response.content;
      } else if (Array.isArray(response.content)) {
        tradingPlan = response.content
          .map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (typeof item === 'object' && 'text' in item) {
              return (item as any).text;
            } else {
              return '';
            }
          })
          .filter(text => text.length > 0)
          .join('\n');
      }

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        trader_investment_plan: tradingPlan,
        sender: this.name,
      };
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Trader specializing in converting investment research into concrete, actionable trading strategies.

Your responsibilities include:
- Creating specific trading strategies and execution plans
- Determining optimal entry and exit points
- Setting appropriate position sizing and risk management
- Defining stop-loss and take-profit levels
- Planning trade timing and execution approach

Trading approach guidelines:
- Base strategies on research recommendations and market analysis
- Consider current market conditions and volatility
- Implement proper risk management and position sizing
- Plan for multiple scenarios (bull, bear, sideways)
- Use technical analysis for timing and levels
- Consider liquidity and market impact

Output Format:
Provide a comprehensive trading plan in the following structure:

## Trading Strategy Plan

### Trade Recommendation
- Action: BUY/SELL/HOLD with conviction level
- Position type: Long/Short/Options strategy
- Investment thesis summary

### Entry Strategy
- Optimal entry price range
- Entry timing considerations
- Market conditions for entry
- Entry order type and execution plan

### Position Sizing
- Recommended position size (% of portfolio)
- Risk-based sizing calculation
- Maximum exposure limits
- Scaling in/out strategy

### Risk Management
- Stop-loss levels and rationale
- Maximum acceptable loss
- Risk-reward ratio target
- Position monitoring plan

### Exit Strategy
- Take-profit targets (partial and full)
- Time-based exit considerations
- Conditions for early exit
- Profit-taking scaling plan

### Scenario Planning
- Bull case execution plan
- Bear case contingency plan
- Sideways market approach
- Black swan event preparation

### Execution Details
- Order types and timing
- Market vs. limit orders
- Slippage considerations
- Monitoring and adjustment plan

Be specific and actionable. Provide exact price levels, percentages, and timing where possible. Consider real-world execution challenges.`;
  }

  canProcess(state: AgentState): boolean {
    // Trader can process if investment research is complete but trading plan doesn't exist yet
    return super.canProcess(state) && 
           AgentStateHelpers.isInvestmentDebateComplete(state) &&
           !AgentStateHelpers.isTradingPlanComplete(state);
  }

  private createTradingRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      investment_plan,
      market_report 
    } = state;
    
    const prompt = `Create a comprehensive trading strategy for ${company_of_interest} based on the research recommendation below.

RESEARCH TEAM DECISION:
${investment_plan || 'Not available'}

MARKET ANALYSIS FOR TIMING:
${market_report || 'Not available'}

Your task:
Convert the research recommendation into a specific, actionable trading plan. Include entry/exit strategies, position sizing, risk management, and scenario planning. Consider current market conditions for optimal timing and execution.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Create a detailed trading strategy that can be executed immediately with specific price levels, position sizes, and risk parameters.`;

    return new HumanMessage(prompt);
  }
}