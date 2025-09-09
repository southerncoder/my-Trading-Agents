import { TradingAgentsConfig } from '@/types/config';
import { FinancialStatement } from '@/types/dataflows';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

/**
 * SimFin API wrapper for financial statements
 * Reads from SimFin CSV files or uses SimFin API if configured
 */
export class SimFinAPI {
  private config: TradingAgentsConfig;
  private dataPath: string;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    // Default to a data directory, can be configured
    this.dataPath = config.simfinDataPath || path.join(process.cwd(), 'data', 'simfin');
  }

  /**
   * Get balance sheet data
   */
  async getBalanceSheet(ticker: string, freq: 'annual' | 'quarterly', currDate: string): Promise<string> {
    try {
      // Fetch financial statement using real CSV data or SimFin API integration
      
      const statement = await this.fetchFinancialStatement(ticker, freq, currDate, 'balance-sheet');
      
      if (!statement) {
        return `No balance sheet data available for ${ticker}. Please ensure SimFin API key is configured or CSV data files are present.`;
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
        return `No cash flow statement data available for ${ticker}. Please ensure SimFin API key is configured or CSV data files are present.`;
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
        return `No income statement data available for ${ticker}. Please ensure SimFin API key is configured or CSV data files are present.`;
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
   * Fetch financial statement data from CSV files or API
   */
  private async fetchFinancialStatement(ticker: string, freq: 'annual' | 'quarterly', currDate: string, statementType: string): Promise<FinancialStatement | null> {
    try {
      // First try to read from CSV files if they exist
      const csvFile = this.getCSVFilePath(statementType, freq);
      
      if (fs.existsSync(csvFile)) {
        const statement = await this.readFromCSV(csvFile, ticker, currDate);
        if (statement) {
          return statement;
        }
      }

      // If CSV doesn't exist or no data found, try SimFin API
      if (process.env.SIMFIN_API_KEY) {
        return await this.fetchFromSimFinAPI(ticker, freq, currDate, statementType);
      }

      // No data sources available - return null instead of mock data
      return null;
    } catch (error) {
      console.error(`Error fetching ${statementType} for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get CSV file path for statement type
   */
  private getCSVFilePath(statementType: string, freq: 'annual' | 'quarterly'): string {
    const fileMap: Record<string, string> = {
      'balance-sheet': `balance-sheet-${freq}.csv`,
      'cashflow': `cashflow-${freq}.csv`,
      'income': `income-${freq}.csv`
    };
    
    const fileName = fileMap[statementType] || `${statementType}-${freq}.csv`;
    return path.join(this.dataPath, fileName);
  }

  /**
   * Read financial data from CSV file
   */
  private async readFromCSV(csvFile: string, ticker: string, currDate: string): Promise<FinancialStatement | null> {
    return new Promise((resolve) => {
      const results: any[] = [];
      const targetDate = new Date(currDate);

      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (data: any) => {
          // Filter by ticker and date
          if (data.Ticker && data.Ticker.toUpperCase() === ticker.toUpperCase()) {
            const reportDate = new Date(data['Report Date'] || data.reportDate || data.date);
            if (reportDate <= targetDate) {
              results.push(data);
            }
          }
        })
        .on('end', () => {
          if (results.length === 0) {
            resolve(null);
            return;
          }

          // Get the most recent statement before currDate
          const sortedResults = results.sort((a, b) => {
            const dateA = new Date(a['Report Date'] || a.reportDate || a.date);
            const dateB = new Date(b['Report Date'] || b.reportDate || b.date);
            return dateB.getTime() - dateA.getTime();
          });

          const latestData = sortedResults[0];
          resolve(this.parseCSVRowToStatement(latestData, ticker));
        })
        .on('error', () => {
          resolve(null);
        });
    });
  }

  /**
   * Parse CSV row to FinancialStatement
   */
  private parseCSVRowToStatement(row: any, ticker: string): FinancialStatement {
    return {
      reportDate: row['Report Date'] || row.reportDate || row.date,
      publishDate: row['Publish Date'] || row.publishDate || row['Report Date'] || row.reportDate,
      ticker: ticker,
      currency: row.Currency || row.currency || 'USD',
      revenue: this.parseNumber(row.Revenue || row.revenue || row['Total Revenue']),
      netIncome: this.parseNumber(row['Net Income'] || row.netIncome || row['Net Income Common']),
      totalAssets: this.parseNumber(row['Total Assets'] || row.totalAssets),
      totalLiabilities: this.parseNumber(row['Total Liabilities'] || row.totalLiabilities),
      shareholderEquity: this.parseNumber(row['Total Equity'] || row.shareholderEquity || row['Shareholders Equity']),
      // Add other common fields
      ...this.parseAdditionalFields(row)
    };
  }

  /**
   * Parse number from string, handling various formats
   */
  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Parse additional fields from CSV
   */
  private parseAdditionalFields(row: any): Record<string, any> {
    const additional: Record<string, any> = {};
    
    // Common financial metrics
    const fieldMappings: Record<string, string[]> = {
      operatingIncome: ['Operating Income', 'operatingIncome', 'Operating Income Loss'],
      grossProfit: ['Gross Profit', 'grossProfit', 'Gross Profit Loss'],
      totalDebt: ['Total Debt', 'totalDebt', 'Total Debt Long Term'],
      cash: ['Cash', 'cash', 'Cash And Cash Equivalents'],
      currentAssets: ['Current Assets', 'currentAssets', 'Total Current Assets'],
      currentLiabilities: ['Current Liabilities', 'currentLiabilities', 'Total Current Liabilities']
    };

    for (const [key, possibleNames] of Object.entries(fieldMappings)) {
      for (const name of possibleNames) {
        if (row[name] !== undefined) {
          additional[key] = this.parseNumber(row[name]);
          break;
        }
      }
    }

    return additional;
  }

  /**
   * Fetch from SimFin API (if API key is available)
   */
  private async fetchFromSimFinAPI(ticker: string, freq: 'annual' | 'quarterly', currDate: string, statementType: string): Promise<FinancialStatement | null> {
    try {
      const apiKey = process.env.SIMFIN_API_KEY;
      if (!apiKey) return null;

      const baseUrl = 'https://simfin.com/api/v2/companies';
      const period = freq === 'annual' ? 'fy' : 'q1,q2,q3,q4';
      
      // This is a simplified API call - actual SimFin API has more complex endpoints
      const response = await fetch(`${baseUrl}/statements?ticker=${ticker}&statement=${statementType}&period=${period}&api-key=${apiKey}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.parseSimFinAPIResponse(data, ticker, currDate);
    } catch (error) {
      console.error('Error fetching from SimFin API:', error);
      return null;
    }
  }

  /**
   * Parse SimFin API response
   */
  private parseSimFinAPIResponse(data: any, ticker: string, currDate: string): FinancialStatement | null {
    if (!data || !data.data || data.data.length === 0) {
      return null;
    }

    // Find the most recent statement before currDate
    const targetDate = new Date(currDate);
    const validStatements = data.data.filter((stmt: any) => {
      const reportDate = new Date(stmt.reportDate || stmt.filingDate);
      return reportDate <= targetDate;
    });

    if (validStatements.length === 0) {
      return null;
    }

    const latest = validStatements.sort((a: any, b: any) => {
      return new Date(b.reportDate || b.filingDate).getTime() - new Date(a.reportDate || a.filingDate).getTime();
    })[0];

    return {
      reportDate: latest.reportDate || latest.filingDate,
      publishDate: latest.publishDate || latest.filingDate,
      ticker: ticker,
      currency: latest.currency || 'USD',
      revenue: latest.revenue || latest.totalRevenue || 0,
      netIncome: latest.netIncome || latest.netIncomeCommon || 0,
      totalAssets: latest.totalAssets || 0,
      totalLiabilities: latest.totalLiabilities || 0,
      shareholderEquity: latest.totalEquity || latest.shareholderEquity || 0,
      ...latest // Include all other fields
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