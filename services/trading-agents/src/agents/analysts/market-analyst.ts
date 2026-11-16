import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { fetchToolData, fetchError, pickKeys } from '../base/tool-data';
import { ENTRY_STANCE_LINE } from '../base/evidence';
import { AgentState } from '../../types/agent-states';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Market Analyst Agent
 * Analyzes market data, technical indicators, and price movements
 */
export class MarketAnalyst extends AbstractAgent {
  private readonly logger = createLogger('agent', 'MarketAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools: StructuredTool[]) {
    super(
      'Market Analyst',
      'Analyzes market data, technical indicators, and price movements for informed trading decisions',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'MarketAnalyst initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools.length > 0,
      toolCount: tools.length
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting market analysis process', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasMarketReport: !!state.market_report
    });

    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context
      // The price service treats endDate as exclusive, so ask for the day after to include the trade date's own bar.
      const tradeDay = new Date(state.trade_date + 'T00:00:00Z');
      const end = new Date(tradeDay);
      end.setUTCDate(end.getUTCDate() + 1);
      const start = new Date(tradeDay);
      start.setUTCDate(start.getUTCDate() - 90);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const calls: any[] = [
        { tool: 'get_historical_price_data', args: { symbol: state.company_of_interest, startDate: iso(start), endDate: iso(end) }, maxChars: 9000 }
      ];
      if (iso(tradeDay) >= iso(yesterday)) {
        calls.push({
          tool: 'get_current_quote',
          args: { symbol: state.company_of_interest },
          transform: pickKeys(['regularMarketPrice', 'regularMarketChangePercent', 'regularMarketVolume', 'averageDailyVolume3Month', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'fiftyDayAverage', 'twoHundredDayAverage', 'marketCap', 'trailingPE', 'forwardPE', 'epsTrailingTwelveMonths', 'regularMarketTime'])
        });
      }
      const dataBlock = await fetchToolData(this.tools, calls);
      // No price history means nothing to analyse. Say so explicitly instead of letting the model
      // invent levels; the data-quality guard then forces HOLD.
      const priceError = fetchError(dataBlock, 'get_historical_price_data');
      if (priceError) {
        this.logger.warn('process', 'Price history unavailable; skipping LLM analysis', { error: priceError, company: state.company_of_interest });
        return {
          messages: state.messages,
          market_report: `MARKET DATA UNAVAILABLE: price history could not be fetched (${priceError.slice(0, 160)})`,
          sender: this.name,
        };
      }
      const baseRequest = this.createAnalysisRequest(state);
      const humanMessage = new HumanMessage(baseRequest.content.toString() + '\n\n' + dataBlock);
      
      this.logger.debug('process', 'Prepared LLM messages for market analysis', {
        systemPromptLength: systemPrompt.length,
        humanMessageLength: humanMessage.content.toString().length
      });

      // Use resilient LLM wrapper for analysis
      const response = await withLLMResilience(
        'MarketAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(systemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      this.logger.info('process', 'LLM analysis completed successfully', {
        responseType: typeof response.content,
        hasToolCalls: response.tool_calls && response.tool_calls.length > 0
      });

      // Extract market report from response
      let marketReport = '';
      if (typeof response.content === 'string') {
        marketReport = response.content;
      } else if (Array.isArray(response.content)) {
        marketReport = response.content
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

      this.logger.info('process', 'Market analysis extracted successfully', {
        reportLength: marketReport.length,
        company: state.company_of_interest
      });

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        market_report: marketReport,
        sender: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.logger.error('process', `Market analysis failed for ${state.company_of_interest}`, {
        error: errorMsg,
        company: state.company_of_interest,
        tradeDate: state.trade_date,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      throw new Error(`${this.name} failed to process: ${errorMsg}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Market Analyst specializing in financial market analysis and technical indicators.

Your responsibilities include:
1. Analyzing stock price movements and trends
2. Evaluating technical indicators and chart patterns
3. Assessing market volume and momentum
4. Identifying support and resistance levels
5. Providing insights on market timing and entry/exit points

Guidelines for analysis:
- Use available market data tools to gather comprehensive information
- Focus on technical analysis and price action
- Consider both short-term and long-term trends
- Identify key technical levels and patterns
- Assess market volatility and risk factors
- Provide clear, actionable insights

Output Format:
Provide a comprehensive market analysis report in the following structure:

## Market Analysis Report

### Technical Overview
- Current price analysis and trend direction
- Key technical indicators (RSI, MACD, Moving averages, etc.)
- Volume analysis and momentum assessment

### Price Action
- Support and resistance levels
- Chart patterns and formations
- Breakout or breakdown potential

### Market Timing
- Entry and exit considerations
- Risk factors and volatility assessment
- Market sentiment indicators

### Conclusion
- Overall technical outlook (bullish/bearish/neutral)
- Key levels to watch
- Recommended trading approach

Keep your analysis fact-based, concise, and actionable. Use market data tools when available to support your analysis.`;
  }

  canProcess(state: AgentState): boolean {
    // Market analyst can process if basic state is valid and no market report exists yet
    const canProcess = super.canProcess(state) && !state.market_report;
    
    this.logger.debug('canProcess', 'Evaluating if MarketAnalyst can process state', {
      basicCanProcess: super.canProcess(state),
      hasMarketReport: !!state.market_report,
      finalCanProcess: canProcess,
      company: state.company_of_interest
    });
    
    return canProcess;
  }

  private createAnalysisRequest(state: AgentState): HumanMessage {
    const { company_of_interest, trade_date } = state;
    
    this.logger.debug('createAnalysisRequest', 'Creating market analysis request prompt', {
      company: company_of_interest,
      tradeDate: trade_date
    });
    
    const prompt = `Perform a comprehensive market analysis for ${company_of_interest} as of ${trade_date}.

Using ONLY the fetched data supplied below (never invent figures; write "not available" when a figure is missing), cover:
1. Recent price data and trading volume
2. Technical indicators and momentum signals  
3. Historical price patterns and trends
4. Market volatility and risk metrics

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Focus on providing actionable technical analysis that will inform trading decisions. Be thorough but concise in your analysis.`;

    return new HumanMessage(prompt + ENTRY_STANCE_LINE);
  }
}