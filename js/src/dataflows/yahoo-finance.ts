import { TradingAgentsConfig } from '@/types/config';
import yahooFinance from 'yahoo-finance2';

/**
 * Yahoo Finance API wrapper using the official node-yahoo-finance2 library
 */
export class YahooFinanceAPI {
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    
    // Configure global settings for yahoo-finance2
    yahooFinance.setGlobalConfig({
      queue: {
        concurrency: 3, // Limit concurrent requests
        timeout: 10000  // 10 second timeout
      }
    });
  }

  /**
   * Get historical stock data using the official Yahoo Finance library
   */
  async getData(symbol: string, startDate: string, endDate: string, online: boolean = true): Promise<string> {
    if (online) {
      return this.getDataOnline(symbol, startDate, endDate);
    } else {
      return this.getDataOffline(symbol, startDate, endDate);
    }
  }

  /**
   * Get data using yahoo-finance2 library
   */
  private async getDataOnline(symbol: string, startDate: string, endDate: string): Promise<string> {
    try {
      // Use yahoo-finance2 historical endpoint
      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: '1d' as const
      };

      const result = await yahooFinance.historical(symbol, queryOptions);

      if (!result || result.length === 0) {
        return `No historical data found for ${symbol} between ${startDate} and ${endDate}`;
      }

      // Convert to CSV format with header
      const header = `# Stock data for ${symbol.toUpperCase()} from ${startDate} to ${endDate}\n`;
      const timestamp = `# Data retrieved on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
      let csvData = 'Date,Open,High,Low,Close,Adj Close,Volume\n';
      
      for (const row of result) {
        const date = row.date.toISOString().split('T')[0];
        csvData += `${date},${row.open},${row.high},${row.low},${row.close},${row.adjClose || row.close},${row.volume}\n`;
      }

      return header + timestamp + csvData;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
      
      // Fallback to cached data if API fails
      return this.getDataOffline(symbol, startDate, endDate);
    }
  }

  /**
   * Get quote data for a symbol
   */
  async getQuote(symbol: string): Promise<any> {
    try {
      const quote = await yahooFinance.quote(symbol);
      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getQuotes(symbols: string[]): Promise<any[]> {
    try {
      const quotes = await yahooFinance.quote(symbols);
      return Array.isArray(quotes) ? quotes : [quotes];
    } catch (error) {
      console.error(`Error fetching quotes for ${symbols.join(', ')}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive quote summary with additional data
   */
  async getQuoteSummary(symbol: string, modules: string[] = ['price', 'summaryDetail', 'defaultKeyStatistics']): Promise<any> {
    try {
      const summary = await yahooFinance.quoteSummary(symbol, {
        modules: modules as any
      });
      return summary;
    } catch (error) {
      console.error(`Error fetching quote summary for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for symbols
   */
  async search(query: string): Promise<any> {
    try {
      const results = await yahooFinance.search(query);
      return results;
    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
      throw error;
    }
  }

  /**
   * Get fundamental data time series
   */
  async getFundamentals(symbol: string, startDate: string): Promise<any> {
    try {
      const fundamentals = await yahooFinance.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryProfile', 'earningsHistory']
      });
      return fundamentals;
    } catch (error) {
      console.error(`Error fetching fundamentals for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get data from local cache (fallback method)
   */
  private async getDataOffline(symbol: string, startDate: string, endDate: string): Promise<string> {
    try {
      // Try to read from cached CSV files as fallback
      const fs = await import('fs/promises');
      const path = await import('path');

      const filePath = path.join(this.config.dataDir, 'market_data', 'price_data', `${symbol}-YFin-data-2015-01-01-2025-03-25.csv`);
      const data = await fs.readFile(filePath, 'utf-8');
      
      // Parse CSV and filter by date range
      const lines = data.split('\n');
      const headers = lines[0];
      const filteredLines = [headers];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line && line.trim()) {
          const dateMatch = line.match(/^([^,]+)/);
          if (dateMatch && dateMatch[1]) {
            const rowDate = dateMatch[1].slice(0, 10); // Extract YYYY-MM-DD
            if (rowDate >= startDate && rowDate <= endDate) {
              filteredLines.push(line);
            }
          }
        }
      }

      return `## Raw Market Data for ${symbol} from ${startDate} to ${endDate}:\n\n` + filteredLines.join('\n');
    } catch (error) {
      console.error(`Error reading cached data for ${symbol}:`, error);
      
      // Return minimal mock data as last resort
      return this.generateMockData(symbol, startDate, endDate);
    }
  }

  /**
   * Generate mock data as absolute fallback
   */
  private generateMockData(symbol: string, startDate: string, endDate: string): string {
    const basePrice = 100 + Math.random() * 200; // Random base price between 100-300
    
    const header = `# Mock data for ${symbol.toUpperCase()} from ${startDate} to ${endDate}\n`;
    const timestamp = `# Generated on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;
    let csvData = 'Date,Open,High,Low,Close,Adj Close,Volume\n';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentPrice = basePrice;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      const dateStr = d.toISOString().split('T')[0];
      const dailyChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
      
      const open = currentPrice;
      const close = currentPrice * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(500000 + Math.random() * 2000000);
      
      csvData += `${dateStr},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${close.toFixed(2)},${volume}\n`;
      
      currentPrice = close;
    }
    
    return header + timestamp + csvData;
  }
}