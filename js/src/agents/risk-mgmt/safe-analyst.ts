
import { logger } from '../../utils/enhanced-logger.js';import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Safe Analyst Agent
 * Advocates for conservative risk management and capital preservation
 */
export class SafeAnalyst extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Safe Analyst',
      'Advocates for conservative risk management strategies focused on capital preservation',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from trading plan and risky analysis
      const humanMessage = this.createRiskAnalysisRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract safe analysis from response
      let safeAnalysis = '';
      if (typeof response.content === 'string') {
        safeAnalysis = response.content;
      } else if (Array.isArray(response.content)) {
        safeAnalysis = response.content
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

      // Update risk debate state
      const currentRiskState = state.risk_debate_state || AgentStateHelpers.createInitialRiskDebateState();
      
      const updatedRiskState = {
        ...currentRiskState,
        safe_history: currentRiskState.safe_history ? 
          `${currentRiskState.safe_history}\n\n${safeAnalysis}` : 
          safeAnalysis,
        current_safe_response: safeAnalysis,
        latest_speaker: this.name,
        count: currentRiskState.count + 1,
      };

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        risk_debate_state: updatedRiskState,
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
    return `You are a Safe Analyst specializing in conservative risk management and capital preservation strategies.

Your role in risk management:
- Advocate for capital preservation approaches
- Identify potential downside risks and mitigation
- Challenge overly aggressive strategies
- Emphasize risk-adjusted returns over raw returns
- Highlight importance of sustainable trading

Risk philosophy:
- Preservation of capital is paramount
- Consistent returns beat volatile performance
- Risk management prevents catastrophic losses
- Conservative positioning allows longevity
- Steady growth compounds over time

Guidelines for conservative advocacy:
- Base conservative strategies on risk assessment
- Quantify potential losses and mitigation
- Identify when defensive positioning is needed
- Challenge aggressive position sizing
- Emphasize downside protection
- Consider long-term sustainability

Output Format:
Provide conservative risk management recommendations in the following structure:

## Conservative Risk Analysis

### Risk Assessment
- Potential downside scenarios
- Maximum loss calculations
- Volatility and drawdown concerns
- Market risk factors

### Conservative Strategy Recommendations
- Reduced position sizing rationale
- Diversification benefits
- Defensive positioning advantages
- Risk-adjusted return optimization

### Downside Protection
- Stop-loss optimization
- Hedging strategies
- Position scaling considerations
- Capital preservation tactics

### Aggressive Strategy Critiques
- Risks of aggressive approaches
- Potential for significant losses
- Overconfidence dangers
- Market timing risks

### Implementation Plan
- Conservative execution strategy
- Risk monitoring and limits
- Gradual position building
- Defensive adjustments

Be prudent but rational. Advocate for conservative strategies that protect capital while still allowing for reasonable returns.`;
  }

  canProcess(state: AgentState): boolean {
    // Safe analyst can process if risky analyst has provided input
    return super.canProcess(state) && 
           AgentStateHelpers.isTradingPlanComplete(state) &&
           !!(state.risk_debate_state?.current_risky_response) &&
           !AgentStateHelpers.isRiskManagementComplete(state);
  }

  private createRiskAnalysisRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      trader_investment_plan,
      risk_debate_state
    } = state;
    
    const prompt = `Analyze the trading plan and risky analyst recommendations below, then advocate for a more conservative risk management approach for ${company_of_interest}.

TRADING PLAN:
${trader_investment_plan || 'Not available'}

RISKY ANALYST RECOMMENDATIONS:
${risk_debate_state?.current_risky_response || 'Not available'}

Your task:
Review both the trading strategy and the aggressive recommendations, then argue for a more conservative approach that prioritizes capital preservation. Consider risk mitigation, defensive positioning, and sustainable trading strategies.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Advocate for prudent risk management that protects capital while still allowing for reasonable returns.`;

    return new HumanMessage(prompt);
  }
}