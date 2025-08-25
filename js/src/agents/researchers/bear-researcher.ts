import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Bear Researcher Agent
 * Argues for negative investment thesis based on analyst reports
 */
export class BearResearcher extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Bear Researcher',
      'Develops bearish investment arguments and identifies potential risks based on analyst research',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from analyst reports and bull arguments
      const humanMessage = this.createResearchRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract bear argument from response
      let bearArgument = '';
      if (typeof response.content === 'string') {
        bearArgument = response.content;
      } else if (Array.isArray(response.content)) {
        bearArgument = response.content
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

      // Update investment debate state
      const currentDebateState = state.investment_debate_state || AgentStateHelpers.createInitialInvestDebateState();
      
      const updatedDebateState = {
        ...currentDebateState,
        bear_history: currentDebateState.bear_history ? 
          `${currentDebateState.bear_history}\n\n${bearArgument}` : 
          bearArgument,
        current_response: bearArgument,
        count: currentDebateState.count + 1,
      };

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        investment_debate_state: updatedDebateState,
        sender: this.name,
      };
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Bear Researcher specializing in developing cautionary investment arguments and identifying potential risks.

Your role in the research team:
- Develop compelling bearish investment thesis
- Identify risk factors and negative catalysts
- Highlight potential weaknesses and concerns
- Counter bullish arguments with critical analysis
- Focus on downside protection and risk mitigation

Guidelines for bear research:
- Base arguments on thorough risk analysis
- Focus on fundamental weakness indicators
- Identify technical resistance levels and negative momentum
- Highlight concerning sentiment and news developments
- Consider both short-term and long-term risks
- Use data to support cautionary scenarios

Research Approach:
1. Review all analyst reports with critical lens
2. Extract concerning signals and risk factors
3. Build a coherent bear case narrative
4. Address bullish counterarguments with evidence
5. Quantify downside risks where possible

Output Format:
Provide a compelling bear research argument in the following structure:

## Bear Investment Thesis

### Risk Factors
- Key threats to revenue and earnings
- Market headwinds and competitive pressures
- Operational and strategic risks

### Financial Concerns
- Weak fundamental indicators
- Deteriorating profitability trends
- Balance sheet vulnerabilities

### Market Headwinds
- Technical resistance and negative momentum
- Concerning sentiment trends
- Negative news and developments

### Downside Potential
- Price target concerns
- Scenario analysis for decline
- Risk factors for underperformance

### Counter to Bull Arguments
- Challenging optimistic assumptions
- Evidence supporting cautious view
- Risk factors overlooked by bulls

Be analytical and fact-based. Use specific data points and examples from the analyst reports to support your bear thesis while maintaining objectivity.`;
  }

  canProcess(state: AgentState): boolean {
    // Bear researcher can process if analyst reports are available and bull researcher has responded
    return super.canProcess(state) && 
           AgentStateHelpers.areAnalystReportsComplete(state) &&
           !!(state.investment_debate_state?.bull_history) &&
           !AgentStateHelpers.isInvestmentDebateComplete(state);
  }

  private createResearchRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      market_report, 
      sentiment_report, 
      news_report, 
      fundamentals_report,
      investment_debate_state
    } = state;
    
    const prompt = `Develop a comprehensive bearish investment thesis for ${company_of_interest} based on the analyst reports and bull arguments below.

ANALYST REPORTS:

MARKET ANALYSIS:
${market_report || 'Not available'}

SOCIAL SENTIMENT:
${sentiment_report || 'Not available'}

NEWS ANALYSIS:
${news_report || 'Not available'}

FUNDAMENTALS ANALYSIS:
${fundamentals_report || 'Not available'}

BULL RESEARCHER ARGUMENT:
${investment_debate_state?.bull_history || 'Not yet available'}

Your task:
Create a compelling bear case that identifies risks and concerns from all analyst reports. Challenge the bull thesis with critical analysis and highlight potential downsides. Be specific about why investors should be cautious about this investment.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Develop strong arguments for why investors should be concerned about the risks and potential downsides of this investment opportunity.`;

    return new HumanMessage(prompt);
  }
}