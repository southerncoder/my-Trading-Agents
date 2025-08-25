import axios from 'axios';
import { TradingAgentsConfig } from '@/types/config';

/**
 * Yahoo Finance API wrapper for stock data
 */
export class YahooFinanceAPI {
  private config: TradingAgentsConfig;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
  }

  /**
   * Get Yahoo Finance data for a symbol
   */
  async getData(symbol: string, startDate: string, endDate: string, online: boolean = true): Promise<string> {
    if (online) {
      return this.getDataOnline(symbol, startDate, endDate);
    } else {
      return this.getDataOffline(symbol, startDate, endDate);
    }
  }

  /**
   * Get data from Yahoo Finance API
   */
  private async getDataOnline(symbol: string, startDate: string, endDate: string): Promise<string> {
    try {
      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      // Yahoo Finance API URL
      const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol.toUpperCase()}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=history&includeAdjustedClose=true`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.status !== 200) {
        return `No data found for symbol '${symbol}' between ${startDate} and ${endDate}`;
      }

      // Add header information
      const header = `# Stock data for ${symbol.toUpperCase()} from ${startDate} to ${endDate}\n`;
      const timestamp = `# Data retrieved on: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n\n`;

      return header + timestamp + response.data;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
      return `Error fetching data for symbol '${symbol}': ${error}`;
    }
  }

  /**
   * Get data from local cache
   */
  private async getDataOffline(symbol: string, startDate: string, endDate: string): Promise<string> {
    // For now, return a placeholder - in production this would read from cached CSV files
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
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
      console.error(`Error reading offline data for ${symbol}:`, error);
      return `Error reading offline data for symbol '${symbol}': ${error}`;
    }
  }
}