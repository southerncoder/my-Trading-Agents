
import { logger } from '../../utils/enhanced-logger';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Portfolio Manager Agent
 * Makes final trading decisions with comprehensive risk considerations
 */
export class PortfolioManager extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Portfolio Manager',
      'Makes final trading decisions by synthesizing all risk management perspectives and portfolio considerations',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from all risk analyses
      const humanMessage = this.createPortfolioManagementRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract portfolio decision from response
      let portfolioDecision = '';
      if (typeof response.content === 'string') {
        portfolioDecision = response.content;
      } else if (Array.isArray(response.content)) {
        portfolioDecision = response.content
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

      // Update risk debate state with final portfolio decision
      const currentRiskState = state.risk_debate_state || AgentStateHelpers.createInitialRiskDebateState();
      
      const updatedRiskState = {
        ...currentRiskState,
        judge_decision: portfolioDecision,
        history: `${currentRiskState.history}\n\nPORTFOLIO MANAGER DECISION:\n${portfolioDecision}`,
      };

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: updatedRiskState,
        final_trade_decision: portfolioDecision,
        sender: this.name,
      };
    } catch (error) {
      logger.error('agent', this.name, 'execution', `Error in ${this.name}`, { 
        error: error instanceof Error ? error.message : String(error),
        agentName: this.name,
        operation: 'processMessage'
      });
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Portfolio Manager responsible for making final trading decisions with comprehensive portfolio and risk considerations.

Your role and responsibilities:
- Make final trading decisions for the portfolio
- Balance individual trade merit with portfolio impact
- Consider overall portfolio risk and diversification
- Approve or reject trading recommendations
- Optimize portfolio-level risk-return characteristics

Decision-making framework:
- Evaluate trade merit within portfolio context
- Consider correlation with existing positions
- Assess portfolio concentration and diversification
- Balance risk budget allocation
- Optimize for portfolio-level objectives
- Make decisions based on total portfolio impact

Output Format:
Provide your final portfolio management decision in the following structure:

## Final Portfolio Management Decision

### Trade Decision
- APPROVED/REJECTED/MODIFIED with clear rationale
- Final position size and structure
- Implementation timeline and approach

### Portfolio Impact Analysis
- Effect on overall portfolio risk profile
- Diversification benefits or concentration concerns
- Correlation with existing positions
- Portfolio allocation optimization

### Risk Management Framework
- Final risk parameters and limits
- Stop-loss and take-profit levels
- Position monitoring requirements
- Risk budget allocation

### Risk Assessment Synthesis
- Evaluation of risky analyst recommendations
- Assessment of safe analyst concerns
- Integration of neutral analyst balance
- Final risk-reward optimization

### Implementation Plan
- Specific execution instructions
- Order types and timing requirements
- Market condition considerations
- Contingency planning

### Monitoring and Review
- Performance tracking metrics
- Review triggers and conditions
- Adjustment criteria and process
- Exit strategy refinement

### Portfolio Strategy Alignment
- Consistency with investment objectives
- Risk tolerance adherence
- Strategic asset allocation impact
- Long-term portfolio construction

Make decisive portfolio-level decisions that optimize overall portfolio performance while managing comprehensive risk considerations.`;
  }

  canProcess(state: AgentState): boolean {
    // Portfolio manager can process if all risk analysts have provided input
    return super.canProcess(state) && 
           AgentStateHelpers.isTradingPlanComplete(state) &&
           !!(state.risk_debate_state?.current_risky_response) &&
           !!(state.risk_debate_state?.current_safe_response) &&
           !!(state.risk_debate_state?.current_neutral_response) &&
           !AgentStateHelpers.isRiskManagementComplete(state);
  }

  private createPortfolioManagementRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      trader_investment_plan,
      risk_debate_state
    } = state;
    
    const prompt = `As Portfolio Manager, make the final trading decision for ${company_of_interest} based on all analyses below.

TRADING PLAN:
${trader_investment_plan || 'Not available'}

RISK MANAGEMENT ANALYSES:

RISKY ANALYST PERSPECTIVE:
${risk_debate_state?.current_risky_response || 'Not available'}

SAFE ANALYST PERSPECTIVE:
${risk_debate_state?.current_safe_response || 'Not available'}

NEUTRAL ANALYST PERSPECTIVE:
${risk_debate_state?.current_neutral_response || 'Not available'}

Your responsibility:
Make the final decision on whether to approve, reject, or modify the trading plan. Consider portfolio-level implications, risk management requirements, and overall investment objectives. Provide specific implementation guidance.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Make a decisive portfolio management decision that optimizes risk-adjusted returns at the portfolio level.`;

    return new HumanMessage(prompt);
  }
}