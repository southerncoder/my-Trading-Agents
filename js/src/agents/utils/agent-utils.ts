import { AgentState } from './agent-states';

/**
 * Common utilities for trading agents
 */
export class AgentUtils {
  /**
   * Format a date to YYYY-MM-DD string
   */
  static formatDate(date: Date): string {
    const isoString = date.toISOString();
    const datePart = isoString.split('T')[0];
    if (!datePart) {
      throw new Error('Invalid date format');
    }
    return datePart;
  }

  /**
   * Parse a date string to Date object
   */
  static parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get a date N days before the given date
   */
  static getDateNDaysAgo(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return this.formatDate(date);
  }

  /**
   * Validate if a string is a valid date in YYYY-MM-DD format
   */
  static isValidDate(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Truncate text to a maximum length with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Clean and format text for display
   */
  static cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n');
  }

  /**
   * Extract ticker symbol from various formats
   */
  static extractTicker(input: string): string {
    // Remove common prefixes and clean up
    const cleaned = input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10); // Limit to reasonable ticker length
    
    return cleaned;
  }

  /**
   * Format currency values
   */
  static formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format large numbers with K, M, B suffixes
   */
  static formatLargeNumber(value: number): string {
    if (Math.abs(value) >= 1e9) {
      return (value / 1e9).toFixed(1) + 'B';
    } else if (Math.abs(value) >= 1e6) {
      return (value / 1e6).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1e3) {
      return (value / 1e3).toFixed(1) + 'K';
    }
    return value.toString();
  }

  /**
   * Create a summary of the current analysis state
   */
  static createStateSummary(state: AgentState): string {
    const summary = [
      `Analysis for ${state.companyOfInterest} on ${state.tradeDate}`,
      '',
      'Completed Reports:',
    ];

    if (state.marketReport) summary.push('✓ Market Analysis');
    if (state.sentimentReport) summary.push('✓ Sentiment Analysis');
    if (state.newsReport) summary.push('✓ News Analysis');
    if (state.fundamentalsReport) summary.push('✓ Fundamentals Analysis');
    
    if (state.investmentPlan) summary.push('✓ Investment Research');
    if (state.traderInvestmentPlan) summary.push('✓ Trading Plan');
    if (state.finalTradeDecision) summary.push('✓ Final Decision');

    return summary.join('\n');
  }

  /**
   * Validate agent state for required fields
   */
  static validateState(state: AgentState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!state.companyOfInterest) {
      errors.push('Company of interest is required');
    }

    if (!state.tradeDate || !this.isValidDate(state.tradeDate)) {
      errors.push('Valid trade date is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a standardized error message
   */
  static createErrorMessage(agent: string, operation: string, error: any): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return `[${agent}] Error during ${operation}: ${errorMsg}`;
  }

  /**
   * Generate a unique identifier for tracking
   */
  static generateId(prefix: string = 'ta'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Check if the current time is within market hours (US Eastern Time)
   */
  static isMarketHours(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = easternTime.getHours();
    
    // Market is open Monday-Friday, 9:30 AM - 4:00 PM ET
    if (day === 0 || day === 6) return false; // Weekend
    if (hour < 9 || hour >= 16) return false; // Outside trading hours
    if (hour === 9 && easternTime.getMinutes() < 30) return false; // Before 9:30 AM
    
    return true;
  }

  /**
   * Get the next trading day (skip weekends)
   */
  static getNextTradingDay(dateStr: string): string {
    const date = new Date(dateStr);
    
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
    
    return this.formatDate(date);
  }

  /**
   * Get the previous trading day (skip weekends)
   */
  static getPreviousTradingDay(dateStr: string): string {
    const date = new Date(dateStr);
    
    do {
      date.setDate(date.getDate() - 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip weekends
    
    return this.formatDate(date);
  }
}