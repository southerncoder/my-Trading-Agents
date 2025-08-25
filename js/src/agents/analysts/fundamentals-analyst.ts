import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState } from '../../types/agent-states';

/**
 * Fundamentals Analyst Agent
 * Analyzes company fundamentals and financial metrics
 */
export class FundamentalsAnalyst extends AbstractAgent {
  constructor(llm: BaseChatModel, tools: StructuredTool[]) {
    super(
      'Fundamentals Analyst',
      'Analyzes company fundamentals, financial statements, and valuation metrics for investment decisions',
      llm,
      tools
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context
      const humanMessage = this.createAnalysisRequest(state);
      
      // Invoke LLM with tools
      const response = await this.invokeLLM([
        new SystemMessage(systemPrompt),
        humanMessage,
      ]);

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

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        fundamentals_report: fundamentalsReport,
        sender: this.name,
      };
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`${this.name} failed to process: ${error}`);
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
    return super.canProcess(state) && !state.fundamentals_report;
  }

  private createAnalysisRequest(state: AgentState): HumanMessage {
    const { company_of_interest, trade_date } = state;
    
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