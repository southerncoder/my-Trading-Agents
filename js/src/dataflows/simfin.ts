import { TradingAgentsConfig } from '@/types/config';
import { FinancialStatement } from '@/types/dataflows';

/**
 * SimFin API wrapper for financial statements
 */
export class SimFinAPI {
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
  }

  /**
   * Get balance sheet data
   */
  async getBalanceSheet(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    try {
      // For now, return a placeholder - in production this would read from SimFin data files
      // or integrate with SimFin API
      
      const statement = await this.fetchFinancialStatement(ticker, freq, currDate, 'balance-sheet');
      
      if (!statement) {
        return 'No balance sheet available before the given current date.';
      }

      return `## ${freq} balance sheet for ${ticker} released on ${statement.publishDate}:\n` +
        this.formatFinancialStatement(statement) +
        '\n\nThis includes metadata like reporting dates and currency, share details, and a breakdown of assets, liabilities, and equity. Assets are grouped as current (liquid items like cash and receivables) and noncurrent (long-term investments and property). Liabilities are split between short-term obligations and long-term debts, while equity reflects shareholder funds such as paid-in capital and retained earnings. Together, these components ensure that total assets equal the sum of liabilities and equity.';
    } catch (error) {
      console.error(`Error fetching balance sheet for ${ticker}:`, error);
      return `Error fetching balance sheet for ${ticker}: ${error}`;
    }
  }

  /**
   * Get cash flow statement
   */
  async getCashflow(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    try {
      const statement = await this.fetchFinancialStatement(ticker, freq, currDate, 'cashflow');
      
      if (!statement) {
        return 'No cash flow statement available before the given current date.';
      }

      return `## ${freq} cash flow statement for ${ticker} released on ${statement.publishDate}:\n` +
        this.formatFinancialStatement(statement) +
        '\n\nThis includes metadata like reporting dates and currency, share details, and a breakdown of cash movements. Operating activities show cash generated from core business operations, including net income adjustments for non-cash items and working capital changes. Investing activities cover asset acquisitions/disposals and investments. Financing activities include debt transactions, equity issuances/repurchases, and dividend payments. The net change in cash represents the overall increase or decrease in the company\'s cash position during the reporting period.';
    } catch (error) {
      console.error(`Error fetching cash flow for ${ticker}:`, error);
      return `Error fetching cash flow for ${ticker}: ${error}`;
    }
  }

  /**
   * Get income statement
   */
  async getIncomeStatement(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    try {
      const statement = await this.fetchFinancialStatement(ticker, freq, currDate, 'income');
      
      if (!statement) {
        return 'No income statement available before the given current date.';
      }

      return `## ${freq} income statement for ${ticker} released on ${statement.publishDate}:\n` +
        this.formatFinancialStatement(statement) +
        '\n\nThis includes metadata like reporting dates and currency, share details, and a comprehensive breakdown of the company\'s financial performance. Starting with Revenue, it shows Cost of Revenue and resulting Gross Profit. Operating Expenses are detailed, including SG&A, R&D, and Depreciation. The statement then shows Operating Income, followed by non-operating items and Interest Expense, leading to Pretax Income. After accounting for Income Tax and any Extraordinary items, it concludes with Net Income, representing the company\'s bottom-line profit or loss for the period.';
    } catch (error) {
      console.error(`Error fetching income statement for ${ticker}:`, error);
      return `Error fetching income statement for ${ticker}: ${error}`;
    }
  }

  /**
   * Fetch financial statement data
   */
  private async fetchFinancialStatement(ticker: string, freq: 'annual' | 'quarterly', currDate: string, statementType: string): Promise<FinancialStatement | null> {
    // Placeholder implementation
    // In production, this would read from SimFin CSV files or API
    return {
      reportDate: '2024-12-31',
      publishDate: '2025-01-15',
      ticker: ticker,
      currency: 'USD',
      revenue: 100000000,
      netIncome: 10000000,
      totalAssets: 500000000,
      totalLiabilities: 300000000,
      shareholderEquity: 200000000,
    };
  }

  /**
   * Format financial statement for display
   */
  private formatFinancialStatement(statement: FinancialStatement): string {
    let formatted = '';
    for (const [key, value] of Object.entries(statement)) {
      formatted += `${key}: ${value}\n`;
    }
    return formatted;
  }
}