import { TradingAgentsConfig } from '@/types/config';
import { DataFlowToolkit } from '@/types/dataflows';
import { YahooFinanceAPI } from './yahoo-finance';
import { FinnhubAPI } from './finnhub';
import { GoogleNewsAPI } from './google-news';
import { RedditAPI } from './reddit';
import { SimFinAPI } from './simfin';
import { OpenAIDataAPI } from './openai-data';
import { TechnicalIndicatorsAPI } from './technical-indicators';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('dataflow', 'interface');

let globalConfig: TradingAgentsConfig | null = null;

/**
 * Set the global configuration for dataflows
 */
export function setConfig(config: TradingAgentsConfig): void {
  globalConfig = config;
}

/**
 * Get the global configuration for dataflows
 */
export function getConfig(): TradingAgentsConfig {
  if (!globalConfig) {
    throw new Error('Configuration not set. Call setConfig() first.');
  }
  return globalConfig;
}

/**
 * Main Toolkit class that provides access to all data sources
 */
export class Toolkit implements DataFlowToolkit {
  private config: TradingAgentsConfig;
  private yahooFinance: YahooFinanceAPI;
  private finnhub: FinnhubAPI;
  private googleNews: GoogleNewsAPI;
  private reddit: RedditAPI;
  private simfin: SimFinAPI;
  private openaiData: OpenAIDataAPI | null;
  private technicalIndicators: TechnicalIndicatorsAPI;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.yahooFinance = new YahooFinanceAPI(config);
    this.finnhub = new FinnhubAPI(config);
    this.googleNews = new GoogleNewsAPI(config);
    this.reddit = new RedditAPI(config);
    this.simfin = new SimFinAPI(config);
    
    // Only initialize OpenAI if API key is available
    try {
      this.openaiData = new OpenAIDataAPI(config);
    } catch (error) {
      logger.warn('constructor', 'OpenAI API not available', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      this.openaiData = null;
    }
    
    this.technicalIndicators = new TechnicalIndicatorsAPI(config);
  }

  // Yahoo Finance methods
  async getYFinData(symbol: string, startDate: string, endDate: string): Promise<string> {
    return this.yahooFinance.getData(symbol, startDate, endDate, false);
  }

  async getYFinDataOnline(symbol: string, startDate: string, endDate: string): Promise<string> {
    return this.yahooFinance.getData(symbol, startDate, endDate, true);
  }

  // Technical indicators
  async getStockstatsIndicatorsReport(symbol: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.technicalIndicators.getIndicatorsReport(symbol, currDate, lookBackDays, false);
  }

  async getStockstatsIndicatorsReportOnline(symbol: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.technicalIndicators.getIndicatorsReport(symbol, currDate, lookBackDays, true);
  }

  // News methods
  async getFinnhubNews(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.finnhub.getNews(ticker, currDate, lookBackDays);
  }

  async getGoogleNews(query: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.googleNews.getNews(query, currDate, lookBackDays);
  }

  async getRedditNews(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    return this.reddit.getGlobalNews(startDate, lookBackDays, maxLimitPerDay);
  }

  // Social media
  async getRedditStockInfo(ticker: string, startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string> {
    return this.reddit.getCompanyNews(ticker, startDate, lookBackDays, maxLimitPerDay);
  }

  // Insider data
  async getFinnhubCompanyInsiderSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.finnhub.getInsiderSentiment(ticker, currDate, lookBackDays);
  }

  async getFinnhubCompanyInsiderTransactions(ticker: string, currDate: string, lookBackDays: number): Promise<string> {
    return this.finnhub.getInsiderTransactions(ticker, currDate, lookBackDays);
  }

  // Financial statements
  async getSimfinBalanceSheet(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    return this.simfin.getBalanceSheet(ticker, freq, currDate);
  }

  async getSimfinCashflow(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    return this.simfin.getCashflow(ticker, freq, currDate);
  }

  async getSimfinIncomeStmt(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    return this.simfin.getIncomeStatement(ticker, freq, currDate);
  }

  // OpenAI-powered tools
  async getStockNewsOpenai(ticker: string, currDate: string): Promise<string> {
    if (!this.openaiData) {
      return 'OpenAI API not available. Please configure OPENAI_API_KEY.';
    }
    return this.openaiData.getStockNews(ticker, currDate);
  }

  async getGlobalNewsOpenai(currDate: string): Promise<string> {
    if (!this.openaiData) {
      return 'OpenAI API not available. Please configure OPENAI_API_KEY.';
    }
    return this.openaiData.getGlobalNews(currDate);
  }

  async getFundamentalsOpenai(ticker: string, currDate: string): Promise<string> {
    if (!this.openaiData) {
      return 'OpenAI API not available. Please configure OPENAI_API_KEY.';
    }
    return this.openaiData.getFundamentals(ticker, currDate);
  }
}