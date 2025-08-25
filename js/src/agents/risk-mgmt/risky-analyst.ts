import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Risky Analyst Agent
 * Advocates for aggressive risk-taking strategies
 */
export class RiskyAnalyst extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Risky Analyst',
      'Advocates for aggressive risk-taking strategies to maximize return potential',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from trading plan
      const humanMessage = this.createRiskAnalysisRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract risky analysis from response
      let riskyAnalysis = '';
      if (typeof response.content === 'string') {
        riskyAnalysis = response.content;
      } else if (Array.isArray(response.content)) {
        riskyAnalysis = response.content
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
        risky_history: currentRiskState.risky_history ? 
          `${currentRiskState.risky_history}\n\n${riskyAnalysis}` : 
          riskyAnalysis,
        current_risky_response: riskyAnalysis,
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
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Risky Analyst specializing in aggressive risk-taking strategies to maximize return potential.

Your role in risk management:
- Advocate for higher risk, higher reward strategies
- Identify opportunities for leveraged positions
- Challenge overly conservative approaches
- Push for maximum return optimization
- Highlight potential for outsized gains

Risk philosophy:
- Calculated risks can lead to exceptional returns
- Conservative approaches may miss opportunities
- Market timing and leverage can amplify gains
- Aggressive position sizing in high-conviction trades
- Accept higher volatility for higher returns

Guidelines for risk advocacy:
- Base aggressive strategies on strong conviction
- Quantify potential returns vs. risks taken
- Identify when aggressive positioning is justified
- Challenge conservative position sizing
- Push for optimal risk-adjusted returns
- Consider alternative strategies for higher returns

Output Format:
Provide aggressive risk management recommendations in the following structure:

## Aggressive Risk Analysis

### Opportunity Assessment
- Maximum return potential identification
- High-conviction trade rationale
- Market timing advantages

### Aggressive Strategy Recommendations
- Increased position sizing justification
- Leverage utilization opportunities
- Concentrated position benefits
- Options strategies for amplification

### Risk-Reward Optimization
- Expected value calculations
- Scenario-based return analysis
- Risk budget utilization
- Capital efficiency maximization

### Conservative Strategy Critiques
- Limitations of safe approaches
- Opportunity costs of conservatism
- Market inefficiencies to exploit
- Competitive advantage timing

### Implementation Plan
- Aggressive execution strategy
- Risk monitoring and adjustment
- Profit maximization tactics
- Position scaling approach

Be bold but rational. Advocate for aggressive strategies with solid reasoning while acknowledging the risks involved.`;
  }

  canProcess(state: AgentState): boolean {
    // Risky analyst can process if trading plan is complete but risk management hasn't concluded
    return super.canProcess(state) && 
           AgentStateHelpers.isTradingPlanComplete(state) &&
           !AgentStateHelpers.isRiskManagementComplete(state);
  }

  private createRiskAnalysisRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      trader_investment_plan 
    } = state;
    
    const prompt = `Analyze the trading plan below and advocate for a more aggressive risk-taking approach for ${company_of_interest}.

TRADING PLAN:
${trader_investment_plan || 'Not available'}

Your task:
Review the trading strategy and argue for a more aggressive approach that could maximize returns. Consider increased position sizing, leverage opportunities, concentrated positions, and alternative strategies that could amplify gains.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Push for optimal risk-reward strategies that maximize return potential while maintaining rational risk management.`;

    return new HumanMessage(prompt);
  }
}