import { ChatOpenAI } from '@langchain/openai';
import { TradingAgentsConfig } from '../types/config';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * OpenAI-powered data analysis API
 */
export class OpenAIDataAPI {
  private config: TradingAgentsConfig;
  private client: ChatOpenAI;
  private logger = createLogger('dataflow', 'openai-data-api');

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required for OpenAI data analysis');
    }

    this.client = new ChatOpenAI({
      modelName: config.quickThinkLlm,
      openAIApiKey: config.openaiApiKey,
      configuration: {
        baseURL: config.backendUrl,
      },
    });
  }

  /**
   * Get stock news using OpenAI web search
   */
  async getStockNews(ticker: string, currDate: string): Promise<string> {
    try {
      const beforeDate = new Date(currDate);
      beforeDate.setDate(beforeDate.getDate() - 7);
      const beforeDateStr = beforeDate.toISOString().split('T')[0];
      
      const prompt = `Search for recent social media discussions and sentiment about ${ticker} stock from ${beforeDateStr} to ${currDate}. 

Please find and analyze:
1. Recent social media mentions (Twitter, Reddit, financial forums)
2. Sentiment analysis (bullish, bearish, neutral)
3. Key discussion topics and concerns
4. Volume of mentions and engagement
5. Notable influencer or analyst opinions

Format the response as a comprehensive analysis with specific examples and sentiment scores.`;

      const response = await this.client.invoke([
        { role: 'user', content: prompt }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      return `## Social Media Analysis for ${ticker} around ${currDate}:\n\n${content}`;
    } catch (error) {
      this.logger.error('stock-news-error', `Error fetching stock news for ${ticker}`, {
        ticker,
        currDate,
        error: error instanceof Error ? error.message : String(error)
      });
      return `Error fetching stock news for ${ticker}: ${error}`;
    }
  }

  /**
   * Get global news using OpenAI web search
   */
  async getGlobalNews(currDate: string): Promise<string> {
    try {
      const beforeDate = new Date(currDate);
      beforeDate.setDate(beforeDate.getDate() - 7);
      const beforeDateStr = beforeDate.toISOString().split('T')[0];
      
      const prompt = `Search for and analyze global macroeconomic news and developments from ${beforeDateStr} to ${currDate} that would impact financial markets and trading decisions.

Please find and analyze:
1. Major economic announcements (GDP, inflation, employment data)
2. Central bank decisions and monetary policy changes
3. Geopolitical events affecting markets
4. Major corporate earnings or industry developments
5. Currency and commodity market movements
6. Market sentiment and risk factors

Format as a comprehensive trading-focused analysis with specific impact assessments.`;

      const response = await this.client.invoke([
        { role: 'user', content: prompt }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      return `## Global Economic News around ${currDate}:\n\n${content}`;
    } catch (error) {
      this.logger.error('global-news-error', 'Error fetching global news', {
        currDate,
        error: error instanceof Error ? error.message : String(error)
      });
      return `Error fetching global news: ${error}`;
    }
  }

  /**
   * Get fundamentals analysis using OpenAI web search
   */
  async getFundamentals(ticker: string, currDate: string): Promise<string> {
    try {
      const beforeDate = new Date(currDate);
      beforeDate.setMonth(beforeDate.getMonth() - 1);
      const beforeDateStr = beforeDate.toISOString().split('T')[0];
      
      const prompt = `Search for and analyze fundamental analysis discussions and data for ${ticker} stock from ${beforeDateStr} to ${currDate}.

Please find and compile:
1. Recent earnings reports and financial statements
2. Key financial ratios (P/E, P/S, P/B, EV/EBITDA, ROE, ROA)
3. Revenue and profit growth trends
4. Cash flow analysis and debt levels
5. Analyst price targets and recommendations
6. Company guidance and management commentary
7. Industry comparisons and competitive position

Format as a comprehensive table with financial metrics and detailed analysis of the company's fundamental health and valuation.`;

      const response = await this.client.invoke([
        { role: 'user', content: prompt }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      
      return `## Fundamental Analysis for ${ticker} around ${currDate}:\n\n${content}`;
    } catch (error) {
      this.logger.error('fundamentals-error', `Error fetching fundamentals for ${ticker}`, {
        ticker,
        currDate,
        error: error instanceof Error ? error.message : String(error)
      });
      return `Error fetching fundamentals for ${ticker}: ${error}`;
    }
  }
}