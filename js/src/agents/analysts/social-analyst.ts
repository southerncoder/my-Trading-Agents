import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { AgentState } from '../../types/agent-states';
import { createLogger } from '../../utils/enhanced-logger';

/**
 * Social Analyst Agent
 * Analyzes social media sentiment and public opinion
 */
export class SocialAnalyst extends AbstractAgent {
  private readonly logger = createLogger('agent', 'SocialAnalyst');
  
  constructor(llm: BaseChatModel, tools: StructuredTool[]) {
    super(
      'Social Analyst',
      'Analyzes social media sentiment, Reddit discussions, and public opinion for market insights',
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

      // Extract sentiment report from response
      let sentimentReport = '';
      if (typeof response.content === 'string') {
        sentimentReport = response.content;
      } else if (Array.isArray(response.content)) {
        sentimentReport = response.content
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
        sentiment_report: sentimentReport,
        sender: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('process', `Error in ${this.name}: ${errorMsg}`);
      throw new Error(`${this.name} failed to process: ${error}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Social Analyst specializing in social media sentiment and public opinion analysis.

Your responsibilities include:
1. Analyzing social media sentiment and discussions
2. Evaluating Reddit conversations and community opinions
3. Tracking public perception and sentiment trends
4. Identifying social media-driven market movements
5. Assessing the impact of social sentiment on stock performance

Guidelines for analysis:
- Use available social media tools to gather comprehensive data
- Focus on sentiment trends and opinion shifts
- Consider both positive and negative sentiment drivers
- Identify influencers and key opinion leaders
- Assess the credibility and reach of social discussions
- Look for sentiment correlation with price movements

Output Format:
Provide a comprehensive social sentiment analysis report in the following structure:

## Social Sentiment Analysis Report

### Sentiment Overview
- Overall sentiment score and trend direction
- Key sentiment drivers (positive/negative themes)
- Sentiment momentum and volatility

### Social Media Analysis
- Reddit discussions and community sentiment
- Twitter/X mentions and engagement levels
- Platform-specific sentiment patterns

### Opinion Leaders & Influencers
- Key voices and their sentiment positions
- Influential posts or discussions
- Credibility assessment of major opinions

### Sentiment Correlation
- Historical sentiment vs. price correlation
- Sentiment-driven price movements
- Social momentum indicators

### Conclusion
- Overall social sentiment outlook
- Key themes and catalysts
- Social risk factors and opportunities

Keep your analysis balanced, fact-based, and focused on actionable social sentiment insights.`;
  }

  canProcess(state: AgentState): boolean {
    // Social analyst can process if basic state is valid and no sentiment report exists yet
    return super.canProcess(state) && !state.sentiment_report;
  }

  private createAnalysisRequest(state: AgentState): HumanMessage {
    const { company_of_interest, trade_date } = state;
    
    const prompt = `Perform a comprehensive social sentiment analysis for ${company_of_interest} as of ${trade_date}.

Please use your available tools to gather the following social media data:
1. Reddit discussions and community sentiment
2. Social media mentions and engagement
3. Sentiment trends and opinion shifts
4. Key influencer opinions and discussions

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Focus on providing actionable social sentiment analysis that will inform trading decisions. Consider both quantitative sentiment metrics and qualitative discussion themes.`;

    return new HumanMessage(prompt);
  }
}