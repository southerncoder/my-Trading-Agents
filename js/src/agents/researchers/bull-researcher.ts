
import { logger } from '../../utils/enhanced-logger.js';import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Bull Researcher Agent
 * Argues for positive investment thesis based on analyst reports
 */
export class BullResearcher extends AbstractAgent {
  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Bull Researcher',
      'Develops bullish investment arguments and identifies growth opportunities based on analyst research',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from analyst reports
      const humanMessage = this.createResearchRequest(state);
      
      // Invoke LLM
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

      // Extract bull argument from response
      let bullArgument = '';
      if (typeof response.content === 'string') {
        bullArgument = response.content;
      } else if (Array.isArray(response.content)) {
        bullArgument = response.content
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
        bull_history: currentDebateState.bull_history ? 
          `${currentDebateState.bull_history}\n\n${bullArgument}` : 
          bullArgument,
        current_response: bullArgument,
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
      logger.error('agent', this.name, 'execution', `Error in ${this.name}`, { 
        error: error instanceof Error ? error.message : String(error),
        agentName: this.name,
        operation: 'processMessage'
      });
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Bull Researcher specializing in developing positive investment arguments and identifying growth opportunities.

Your role in the research team:
- Develop compelling bullish investment thesis
- Identify growth catalysts and positive trends
- Highlight competitive advantages and market opportunities
- Counter bearish arguments with strong evidence
- Focus on upside potential and value creation

Guidelines for bull research:
- Base arguments on solid analytical evidence
- Focus on fundamental growth drivers
- Identify technical support levels and momentum
- Highlight positive sentiment and news catalysts
- Consider both short-term and long-term opportunities
- Use data to support optimistic scenarios

Research Approach:
1. Review all analyst reports thoroughly
2. Extract the most compelling positive signals
3. Build a coherent bull case narrative
4. Address potential counterarguments proactively
5. Quantify upside potential where possible

Output Format:
Provide a compelling bull research argument in the following structure:

## Bull Investment Thesis

### Growth Catalysts
- Key drivers for revenue and earnings growth
- Market expansion opportunities
- Product innovation and competitive advantages

### Financial Strengths
- Strong fundamental metrics
- Improving profitability trends
- Solid balance sheet and cash position

### Market Positioning
- Technical momentum and support levels
- Positive sentiment trends
- Favorable news and developments

### Upside Potential
- Price target justification
- Scenario analysis for growth
- Risk-adjusted return expectations

### Counter to Bear Arguments
- Addressing potential concerns
- Evidence supporting optimistic view
- Risk mitigation factors

Be persuasive but fact-based. Use specific data points and examples from the analyst reports to support your bull thesis.`;
  }

  canProcess(state: AgentState): boolean {
    // Bull researcher can process if analyst reports are available but investment debate hasn't concluded
    return super.canProcess(state) && 
           AgentStateHelpers.areAnalystReportsComplete(state) &&
           !AgentStateHelpers.isInvestmentDebateComplete(state);
  }

  private createResearchRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      market_report, 
      sentiment_report, 
      news_report, 
      fundamentals_report 
    } = state;
    
    const prompt = `Develop a comprehensive bullish investment thesis for ${company_of_interest} based on the analyst reports below.

ANALYST REPORTS:

MARKET ANALYSIS:
${market_report || 'Not available'}

SOCIAL SENTIMENT:
${sentiment_report || 'Not available'}

NEWS ANALYSIS:
${news_report || 'Not available'}

FUNDAMENTALS ANALYSIS:
${fundamentals_report || 'Not available'}

Your task:
Create a compelling bull case that synthesizes the positive signals from all analyst reports. Focus on growth opportunities, competitive advantages, and upside catalysts. Be specific about why this is an attractive investment opportunity.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Develop strong arguments for why investors should be optimistic about this investment opportunity.`;

    return new HumanMessage(prompt);
  }
}