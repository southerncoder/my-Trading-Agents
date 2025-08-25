import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent, AgentType } from '../base';
import { AgentState } from '../../types/agent-states';

/**
 * News Analyst Agent  
 * Analyzes news events and their market impact
 */
export class NewsAnalyst extends AbstractAgent {
  constructor(llm: BaseChatModel, tools: StructuredTool[]) {
    super(
      'News Analyst',
      'Analyzes news events, market-moving announcements, and their potential impact on stock performance',
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

      // Extract news report from response
      let newsReport = '';
      if (typeof response.content === 'string') {
        newsReport = response.content;
      } else if (Array.isArray(response.content)) {
        newsReport = response.content
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
        news_report: newsReport,
        sender: this.name,
      };
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a News Analyst specializing in financial news analysis and market impact assessment.

Your responsibilities include:
1. Analyzing recent news events and announcements
2. Evaluating market-moving news and their potential impact
3. Assessing global events and their market implications
4. Identifying news-driven catalysts and risks
5. Providing context on news sentiment and market reactions

Guidelines for analysis:
- Use available news tools to gather comprehensive information
- Focus on market-relevant news and events
- Consider both company-specific and macro-economic news
- Evaluate news credibility and source reliability
- Assess timing and potential market impact
- Look for news correlation with price movements

Output Format:
Provide a comprehensive news analysis report in the following structure:

## News Analysis Report

### News Summary
- Key news events and announcements
- Market-moving headlines and developments
- News timeline and chronology

### Company-Specific News
- Earnings reports and guidance updates
- Management announcements and strategic updates
- Product launches, partnerships, and acquisitions
- Regulatory developments and legal matters

### Macro-Economic Context
- Industry trends and sector developments
- Economic indicators and policy changes
- Global events affecting the market
- Competitive landscape changes

### Market Impact Assessment
- Historical news impact on stock performance
- Expected market reaction and volatility
- News-driven catalyst identification
- Risk factors from negative news

### Conclusion
- Overall news outlook and sentiment
- Key catalysts and upcoming events
- News-based trading considerations

Keep your analysis objective, well-sourced, and focused on actionable news insights for trading decisions.`;
  }

  canProcess(state: AgentState): boolean {
    // News analyst can process if basic state is valid and no news report exists yet
    return super.canProcess(state) && !state.news_report;
  }

  private createAnalysisRequest(state: AgentState): HumanMessage {
    const { company_of_interest, trade_date } = state;
    
    const prompt = `Perform a comprehensive news analysis for ${company_of_interest} as of ${trade_date}.

Please use your available tools to gather the following news data:
1. Recent company-specific news and announcements
2. Industry and sector-related news developments
3. Global news events that could impact the market
4. Economic indicators and policy changes

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Focus on providing actionable news analysis that will inform trading decisions. Consider both positive and negative news impacts, and assess the credibility and market relevance of news sources.`;

    return new HumanMessage(prompt);
  }
}