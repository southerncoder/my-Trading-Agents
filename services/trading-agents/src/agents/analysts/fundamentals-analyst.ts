import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { AgentState } from '../../types/agent-states';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Fundamentals Analyst Agent
 * Analyzes company fundamentals and financial metrics
 */
export class FundamentalsAnalyst extends AbstractAgent {
  private readonly logger = createLogger('agent', 'FundamentalsAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools: StructuredTool[]) {
    super(
      'Fundamentals Analyst',
      'Analyzes company fundamentals, financial statements, and valuation metrics for investment decisions',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'FundamentalsAnalyst initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools.length > 0,
      toolCount: tools.length
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting fundamentals analysis process', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasFundamentalsReport: !!state.fundamentals_report
    });

    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context
      const humanMessage = this.createAnalysisRequest(state);
      
      this.logger.debug('process', 'Prepared LLM messages for fundamentals analysis', {
        systemPromptLength: systemPrompt.length,
        humanMessageLength: humanMessage.content.toString().length
      });

      // Use resilient LLM wrapper for analysis
      const response = await withLLMResilience(
        'FundamentalsAnalyst.analyze',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(systemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      this.logger.info('process', 'LLM fundamentals analysis completed successfully', {
        responseType: typeof response.content,
        hasToolCalls: response.tool_calls && response.tool_calls.length > 0
      });

      // Extract fundamentals report from response
      let fundamentalsReport = '';
      if (typeof response.content === 'string') {
        fundamentalsReport = response.content;
      } else if (Array.isArray(response.content)) {
        fundamentalsReport = response.content
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

      this.logger.info('process', 'Fundamentals analysis extracted successfully', {
        reportLength: fundamentalsReport.length,
        company: state.company_of_interest
      });

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        fundamentals_report: fundamentalsReport,
        sender: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.logger.error('process', `Fundamentals analysis failed for ${state.company_of_interest}`, {
        error: errorMsg,
        company: state.company_of_interest,
        tradeDate: state.trade_date,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      throw new Error(`${this.name} failed to process: ${errorMsg}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Fundamentals Analyst specializing in financial statement analysis and company valuation.

Your responsibilities include:
1. Analyzing financial statements (income, balance sheet, cash flow)
2. Evaluating key financial metrics and ratios
3. Assessing company valuation and intrinsic value
4. Comparing performance against industry peers
5. Identifying fundamental strengths and weaknesses

Guidelines for analysis:
- Use available fundamental data tools comprehensively
- Focus on financial health and performance trends
- Consider both quantitative metrics and qualitative factors
- Evaluate management effectiveness and corporate governance
- Assess competitive positioning and market dynamics
- Look for value opportunities and red flags

Output Format:
Provide a comprehensive fundamental analysis report in the following structure:

## Fundamental Analysis Report

### Financial Performance
- Revenue growth and profitability trends
- Key financial ratios (P/E, P/B, ROE, ROA, etc.)
- Margin analysis and operational efficiency
- Cash flow analysis and liquidity position

### Balance Sheet Strength
- Asset quality and composition
- Debt levels and capital structure
- Working capital management
- Financial stability indicators

### Valuation Assessment
- Current valuation vs. intrinsic value estimates
- Peer comparison and industry multiples
- DCF analysis and fair value estimation
- Value proposition and investment merit

### Growth Prospects
- Revenue and earnings growth outlook
- Market expansion opportunities
- Competitive advantages and moats
- Management guidance and strategic initiatives

### Risk Factors
- Financial risks and leverage concerns
- Industry and competitive risks
- Regulatory and operational risks
- Management and governance issues

### Conclusion
- Overall fundamental outlook (strong/moderate/weak)
- Investment recommendation rationale
- Key metrics to monitor
- Fundamental-based trading considerations

Keep your analysis thorough, data-driven, and focused on long-term fundamental value creation.`;
  }

  canProcess(state: AgentState): boolean {
    // Fundamentals analyst can process if basic state is valid and no fundamentals report exists yet
    const canProcess = super.canProcess(state) && !state.fundamentals_report;
    
    this.logger.debug('canProcess', 'Evaluating if FundamentalsAnalyst can process state', {
      basicCanProcess: super.canProcess(state),
      hasFundamentalsReport: !!state.fundamentals_report,
      finalCanProcess: canProcess,
      company: state.company_of_interest
    });
    
    return canProcess;
  }

  private createAnalysisRequest(state: AgentState): HumanMessage {
    const { company_of_interest, trade_date } = state;
    
    this.logger.debug('createAnalysisRequest', 'Creating fundamentals analysis request prompt', {
      company: company_of_interest,
      tradeDate: trade_date
    });
    
    const prompt = `Perform a comprehensive fundamental analysis for ${company_of_interest} as of ${trade_date}.

Please use your available tools to gather the following fundamental data:
1. Financial statements (income statement, balance sheet, cash flow)
2. Key financial ratios and valuation metrics
3. Company insider sentiment and transactions
4. Industry comparison and peer analysis
5. Management guidance and strategic updates

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Focus on providing actionable fundamental analysis that will inform investment decisions. Be thorough in your evaluation of financial health, growth prospects, and valuation attractiveness.`;

    return new HumanMessage(prompt);
  }
}