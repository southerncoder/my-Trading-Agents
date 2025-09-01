import axios from 'axios';
import { TradingAgentsConfig } from '@/types/config';
import { NewsItem, InsiderSentiment, InsiderTransaction } from '@/types/dataflows';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Finnhub API wrapper for financial data
 */
export class FinnhubAPI {
  private config: TradingAgentsConfig;
  private apiKey: string;
  private logger = createLogger('dataflow', 'finnhub-api');

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.apiKey = config.finnhubApiKey || '';
  }

  /**
   * Get news for a ticker
   */
  async getNews(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.apiKey) {
      return 'Finnhub API key not configured';
    }

    try {
      const startDate = new Date(currDate);
      const before = new Date(startDate);
      before.setDate(before.getDate() - lookBackDays);

      const startTimestamp = Math.floor(before.getTime() / 1000);
      const endTimestamp = Math.floor(startDate.getTime() / 1000);

      const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${before.toISOString().split('T')[0]}&to=${currDate}&token=${this.apiKey}`;

      const response = await axios.get(url);
      const newsData = response.data as NewsItem[];

      if (!newsData || newsData.length === 0) {
        return '';
      }

      let combinedResult = '';
      for (const entry of newsData) {
        const currentNews = `### ${entry.headline} (${new Date(entry.date).toISOString().split('T')[0]})\n${entry.summary}`;
        combinedResult += currentNews + '\n\n';
      }

      return `## ${ticker} News, from ${before.toISOString().split('T')[0]} to ${currDate}:\n` + combinedResult;
    } catch (error) {
      this.logger.error('news-fetch-error', `Error fetching Finnhub news for ${ticker}`, {
        ticker,
        error: error instanceof Error ? error.message : String(error),
        apiKey: this.apiKey ? 'present' : 'missing'
      });
      return `Error fetching news for ${ticker}: ${error}`;
    }
  }

  /**
   * Get insider sentiment
   */
  async getInsiderSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.apiKey) {
      return 'Finnhub API key not configured';
    }

    try {
      const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${ticker}&token=${this.apiKey}`;
      const response = await axios.get(url);
      const data = response.data.data as InsiderSentiment[];

      if (!data || data.length === 0) {
        return '';
      }

      let resultStr = '';
      const seenEntries = new Set();

      for (const entry of data) {
        const key = `${entry.year}-${entry.month}`;
        if (!seenEntries.has(key)) {
          resultStr += `### ${entry.year}-${entry.month}:\nChange: ${entry.change}\nMonthly Share Purchase Ratio: ${entry.mspr}\n\n`;
          seenEntries.add(key);
        }
      }

      const dateObj = new Date(currDate);
      const before = new Date(dateObj);
      before.setDate(before.getDate() - lookBackDays);

      return `## ${ticker} Insider Sentiment Data for ${before.toISOString().split('T')[0]} to ${currDate}:\n` +
        resultStr +
        'The change field refers to the net buying/selling from all insiders\' transactions. The mspr field refers to monthly share purchase ratio.';
    } catch (error) {
      this.logger.error('insider-sentiment-error', `Error fetching insider sentiment for ${ticker}`, {
        ticker,
        error: error instanceof Error ? error.message : String(error),
        apiKey: this.apiKey ? 'present' : 'missing'
      });
      return `Error fetching insider sentiment for ${ticker}: ${error}`;
    }
  }

  /**
   * Get insider transactions
   */
  async getInsiderTransactions(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    if (!this.apiKey) {
      return 'Finnhub API key not configured';
    }

    try {
      const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${this.apiKey}`;
      const response = await axios.get(url);
      const data = response.data.data as InsiderTransaction[];

      if (!data || data.length === 0) {
        return '';
      }

      let resultStr = '';
      const seenEntries = new Set();

      for (const entry of data) {
        const key = `${entry.filingDate}-${entry.name}-${entry.change}`;
        if (!seenEntries.has(key)) {
          resultStr += `### Filing Date: ${entry.filingDate}, ${entry.name}:\nChange: ${entry.change}\nShares: ${entry.share}\nTransaction Price: ${entry.transactionPrice}\nTransaction Code: ${entry.transactionCode}\n\n`;
          seenEntries.add(key);
        }
      }

      const dateObj = new Date(currDate);
      const before = new Date(dateObj);
      before.setDate(before.getDate() - lookBackDays);

      return `## ${ticker} insider transactions from ${before.toISOString().split('T')[0]} to ${currDate}:\n` +
        resultStr +
        'The change field reflects the variation in share count—here a negative number indicates a reduction in holdings—while share specifies the total number of shares involved. The transactionPrice denotes the per-share price at which the trade was executed, and transactionDate marks when the transaction occurred. The name field identifies the insider making the trade, and transactionCode (e.g., S for sale) clarifies the nature of the transaction. FilingDate records when the transaction was officially reported, and the unique id links to the specific SEC filing, as indicated by the source. Additionally, the symbol ties the transaction to a particular company, isDerivative flags whether the trade involves derivative securities, and currency notes the currency context of the transaction.';
    } catch (error) {
      this.logger.error('insider-transactions-error', `Error fetching insider transactions for ${ticker}`, {
        ticker,
        error: error instanceof Error ? error.message : String(error),
        apiKey: this.apiKey ? 'present' : 'missing'
      });
      return `Error fetching insider transactions for ${ticker}: ${error}`;
    }
  }
}