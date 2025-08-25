/**
 * Data flow interface types for Trading Agents
 */

import { TradingAgentsConfig } from '@/types/config';

export interface DataFlowConfig {
  dataDir: string;
  dataCacheDir: string;
  onlineTools: boolean;
}

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export interface NewsItem {
  headline: string;
  summary: string;
  date: string;
  source?: string;
  url?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  score: number;
  numComments: number;
  createdUtc: string;
  url: string;
}

export interface InsiderSentiment {
  year: number;
  month: number;
  change: number;
  mspr: number; // Monthly Share Purchase Ratio
}

export interface InsiderTransaction {
  filingDate: string;
  name: string;
  change: number;
  share: number;
  transactionPrice: number;
  transactionCode: string;
  transactionDate?: string;
}

export interface FinancialStatement {
  reportDate: string;
  publishDate: string;
  ticker: string;
  currency: string;
  [key: string]: any; // For various financial metrics
}

export interface TechnicalIndicator {
  date: string;
  value: number;
  indicator: string;
}

// Tool function signatures matching Python interface
export interface DataFlowToolkit {
  // Yahoo Finance data
  getYFinData(symbol: string, startDate: string, endDate: string): Promise<string>;
  getYFinDataOnline(symbol: string, startDate: string, endDate: string): Promise<string>;
  
  // Technical indicators
  getStockstatsIndicatorsReport(symbol: string, currDate: string, lookBackDays: number): Promise<string>;
  getStockstatsIndicatorsReportOnline(symbol: string, currDate: string, lookBackDays: number): Promise<string>;
  
  // News data
  getFinnhubNews(ticker: string, currDate: string, lookBackDays: number): Promise<string>;
  getGoogleNews(query: string, currDate: string, lookBackDays: number): Promise<string>;
  getRedditNews(startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string>;
  
  // Social media
  getRedditStockInfo(ticker: string, startDate: string, lookBackDays: number, maxLimitPerDay: number): Promise<string>;
  
  // Insider data
  getFinnhubCompanyInsiderSentiment(ticker: string, currDate: string, lookBackDays: number): Promise<string>;
  getFinnhubCompanyInsiderTransactions(ticker: string, currDate: string, lookBackDays: number): Promise<string>;
  
  // Financial statements
  getSimfinBalanceSheet(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string>;
  getSimfinCashflow(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string>;
  getSimfinIncomeStmt(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string>;
  
  // OpenAI-powered tools
  getStockNewsOpenai(ticker: string, currDate: string): Promise<string>;
  getGlobalNewsOpenai(currDate: string): Promise<string>;
  getFundamentalsOpenai(ticker: string, currDate: string): Promise<string>;
}