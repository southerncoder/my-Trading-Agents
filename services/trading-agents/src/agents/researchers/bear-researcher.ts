
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Bear Researcher Agent
 * Argues for negative investment thesis based on analyst reports
 */
export class BearResearcher extends AbstractAgent {
  private readonly logger = createLogger('agent', 'BearResearcher');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Bear Researcher',
      'Develops bearish investment arguments and identifies potential risks based on analyst research',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'BearResearcher initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting bear research process', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasMarketReport: !!state.market_report,
      hasSentimentReport: !!state.sentiment_report,
      hasNewsReport: !!state.news_report,
      hasFundamentalsReport: !!state.fundamentals_report,
      currentDebateCount: state.investment_debate_state?.count || 0,
      hasBullHistory: !!(state.investment_debate_state?.bull_history)
    });

    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from analyst reports and bull arguments
      const humanMessage = this.createResearchRequest(state);
      
      this.logger.debug('process', 'Prepared LLM messages for bear research', {
        systemPromptLength: systemPrompt.length,
        humanMessageLength: humanMessage.content.toString().length
      });

      // Use resilient LLM wrapper for bear research
      const response = await withLLMResilience(
        'BearResearcher.research',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(systemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      this.logger.info('process', 'LLM bear research completed successfully', {
        responseType: typeof response.content,
        hasToolCalls: response.tool_calls && response.tool_calls.length > 0
      });

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

      this.logger.info('process', 'Bear research argument extracted successfully', {
        argumentLength: bearArgument.length,
        company: state.company_of_interest
      });

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
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.logger.error('process', `Bear research failed for ${state.company_of_interest}`, {
        error: errorMsg,
        company: state.company_of_interest,
        tradeDate: state.trade_date,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      throw new Error(`${this.name} failed to process: ${errorMsg}`);
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