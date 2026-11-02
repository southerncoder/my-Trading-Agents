/**
 * Test Data Generators for Market Scenarios
 * 
 * Provides utilities for generating realistic test data for various market scenarios
 * Requirements: 7.1, 7.2, 7.3
 */

import {
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types/data-providers';

export interface MarketScenarioConfig {
  symbol: string;
  startDate: Date;
  days: number;
  initialPrice: number;
  scenario: 'bull' | 'bear' | 'sideways' | 'volatile' | 'crash' | 'recovery';
  volatility?: number;
  trend?: number;
  frequency?: 'daily' | 'hourly' | 'minute';
}

export interface NewsScenarioConfig {
  symbol: string;
  count: number;
  sentimentBias?: 'positive' | 'negative' | 'neutral' | 'mixed';
  relevanceRange?: [number, number];
  timeSpread?: number; // hours
}

export interface SentimentScenarioConfig {
  symbol: string;
  scenario: 'bullish' | 'bearish' | 'neutral' | 'volatile' | 'mixed';
  confidence?: number;
  volume?: number;
}

/**
 * Generates realistic market data for various scenarios
 */
export class MarketDataGenerator {
  /**
   * Generate market data for a specific scenario
   */
  static generateScenario(config: MarketScenarioConfig): MarketData[] {
    const data: MarketData[] = [];
    let price = config.initialPrice;
    
    const intervals = this.getIntervals(config.days, config.frequency || 'daily');
    const intervalMs = this.getIntervalMs(config.frequency || 'daily');
    
    for (let i = 0; i < intervals; i++) {
      const timestamp = new Date(config.startDate.getTime() + i * intervalMs);
      
      const dailyReturn = this.calculateDailyReturn(config, i, intervals);
      price *= (1 + dailyReturn);
      
      const { open, high, low, volume } = this.generateOHLV(price, config);
      
      data.push({
        symbol: config.symbol,
        timestamp,
        open,
        high,
        low,
        close: price,
        volume,
        adjustedClose: price
      });
    }
    
    return data;
  }

  private static getIntervals(days: number, frequency: string): number {
    switch (frequency) {
      case 'minute': return days * 24 * 60;
      case 'hourly': return days * 24;
      default: return days;
    }
  }

  private static getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'minute': return 60 * 1000;
      case 'hourly': return 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private static calculateDailyReturn(
    config: MarketScenarioConfig, 
    index: number, 
    totalIntervals: number
  ): number {
    const baseVolatility = config.volatility || 0.02;
    const baseTrend = config.trend || 0;
    
    switch (config.scenario) {
      case 'bull':
        return baseTrend + 0.001 + Math.random() * baseVolatility;
      
      case 'bear':
        return baseTrend - 0.001 - Math.random() * baseVolatility;
      
      case 'sideways':
        const meanReversion = -((index / totalIntervals) - 0.5) * 0.001;
        return baseTrend + meanReversion + (Math.random() - 0.5) * baseVolatility;
      
      case 'volatile':
        const volatileReturn = (Math.random() - 0.5) * baseVolatility * 3;
        return baseTrend + volatileReturn;
      
      case 'crash':
        if (index < totalIntervals * 0.7) {
          return baseTrend + (Math.random() - 0.5) * baseVolatility;
        } else {
          return baseTrend - 0.05 - Math.random() * 0.1; // Severe decline
        }
      
      case 'recovery':
        if (index < totalIntervals * 0.3) {
          return baseTrend - 0.02 - Math.random() * baseVolatility;
        } else {
          return baseTrend + 0.003 + Math.random() * baseVolatility * 1.5;
        }
      
      default:
        return baseTrend + (Math.random() - 0.5) * baseVolatility;
    }
  }  pr
ivate static generateOHLV(close: number, config: MarketScenarioConfig) {
    const volatility = config.volatility || 0.02;
    const intraday = volatility * 0.5;
    
    const open = close * (0.999 + Math.random() * 0.002);
    const high = close * (1 + Math.random() * intraday);
    const low = close * (1 - Math.random() * intraday);
    
    // Volume varies with scenario
    let baseVolume = 1000000;
    switch (config.scenario) {
      case 'volatile':
      case 'crash':
        baseVolume *= 2; // Higher volume during volatile periods
        break;
      case 'sideways':
        baseVolume *= 0.7; // Lower volume during sideways markets
        break;
    }
    
    const volume = baseVolume + Math.random() * baseVolume;
    
    return { open, high, low, volume };
  }

  /**
   * Generate bull market data
   */
  static generateBullMarket(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'bull',
      volatility: 0.02,
      trend: 0.001
    });
  }

  /**
   * Generate bear market data
   */
  static generateBearMarket(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'bear',
      volatility: 0.025,
      trend: -0.001
    });
  }

  /**
   * Generate sideways market data
   */
  static generateSidewaysMarket(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'sideways',
      volatility: 0.015
    });
  }

  /**
   * Generate volatile market data
   */
  static generateVolatileMarket(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'volatile',
      volatility: 0.05
    });
  }

  /**
   * Generate market crash scenario
   */
  static generateMarketCrash(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'crash',
      volatility: 0.03
    });
  }

  /**
   * Generate market recovery scenario
   */
  static generateMarketRecovery(symbol: string, days: number, startPrice: number = 100): MarketData[] {
    return this.generateScenario({
      symbol,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      days,
      initialPrice: startPrice,
      scenario: 'recovery',
      volatility: 0.025
    });
  }
}

/**
 * Generates realistic news data for testing
 */
export class NewsDataGenerator {
  private static newsTemplates = {
    positive: [
      '{symbol} reports strong quarterly earnings',
      '{symbol} announces breakthrough innovation',
      '{symbol} stock upgraded by analysts',
      '{symbol} expands into new markets',
      '{symbol} beats revenue expectations'
    ],
    negative: [
      '{symbol} faces regulatory challenges',
      '{symbol} reports disappointing earnings',
      '{symbol} stock downgraded by analysts',
      '{symbol} CEO announces departure',
      '{symbol} faces supply chain disruptions'
    ],
    neutral: [
      '{symbol} announces quarterly results',
      '{symbol} provides business update',
      '{symbol} schedules earnings call',
      '{symbol} files regulatory documents',
      '{symbol} announces board meeting'
    ]
  };

  private static sources = [
    'Reuters', 'Bloomberg', 'Financial Times', 'Wall Street Journal',
    'CNBC', 'MarketWatch', 'Yahoo Finance', 'Seeking Alpha'
  ];

  /**
   * Generate news data for a scenario
   */
  static generateScenario(config: NewsScenarioConfig): NewsData[] {
    const news: NewsData[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const sentimentType = this.getSentimentType(config.sentimentBias || 'mixed');
      const template = this.getRandomTemplate(sentimentType);
      const title = template.replace('{symbol}', config.symbol);
      
      const sentiment = this.generateSentiment(sentimentType);
      const relevance = this.generateRelevance(config.relevanceRange || [0.5, 1.0]);
      const timestamp = this.generateTimestamp(config.timeSpread || 24);
      
      news.push({
        title,
        content: this.generateContent(title, sentimentType),
        source: this.sources[Math.floor(Math.random() * this.sources.length)],
        timestamp,
        url: `https://example.com/news/${i}`,
        sentiment,
        relevance
      });
    }
    
    return news.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }  priv
ate static getSentimentType(bias: string): 'positive' | 'negative' | 'neutral' {
    if (bias === 'mixed') {
      const rand = Math.random();
      if (rand < 0.4) return 'positive';
      if (rand < 0.8) return 'negative';
      return 'neutral';
    }
    return bias as 'positive' | 'negative' | 'neutral';
  }

  private static getRandomTemplate(sentimentType: 'positive' | 'negative' | 'neutral'): string {
    const templates = this.newsTemplates[sentimentType];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private static generateSentiment(sentimentType: 'positive' | 'negative' | 'neutral'): number {
    switch (sentimentType) {
      case 'positive':
        return 0.3 + Math.random() * 0.7; // 0.3 to 1.0
      case 'negative':
        return -0.3 - Math.random() * 0.7; // -1.0 to -0.3
      default:
        return (Math.random() - 0.5) * 0.6; // -0.3 to 0.3
    }
  }

  private static generateRelevance(range: [number, number]): number {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  private static generateTimestamp(hoursSpread: number): Date {
    const hoursAgo = Math.random() * hoursSpread;
    return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  }

  private static generateContent(title: string, sentimentType: string): string {
    const baseContent = `${title}. `;
    const additionalSentences = Math.floor(Math.random() * 5) + 3; // 3-7 sentences
    
    let content = baseContent;
    for (let i = 0; i < additionalSentences; i++) {
      content += this.generateSentence(sentimentType) + ' ';
    }
    
    return content.trim();
  }

  private static generateSentence(sentimentType: string): string {
    const sentences = {
      positive: [
        'The company showed strong performance across all metrics.',
        'Analysts are optimistic about future growth prospects.',
        'Market conditions remain favorable for expansion.',
        'Revenue growth exceeded expectations significantly.'
      ],
      negative: [
        'The company faces significant headwinds in the current market.',
        'Analysts express concerns about future profitability.',
        'Market conditions present challenges for growth.',
        'Revenue declined compared to previous quarters.'
      ],
      neutral: [
        'The company provided updates on its business operations.',
        'Management discussed strategic initiatives during the call.',
        'The quarterly report included standard financial metrics.',
        'Industry trends continue to evolve as expected.'
      ]
    };
    
    const sentenceList = sentences[sentimentType as keyof typeof sentences] || sentences.neutral;
    return sentenceList[Math.floor(Math.random() * sentenceList.length)];
  }

  /**
   * Generate positive news
   */
  static generatePositiveNews(symbol: string, count: number = 5): NewsData[] {
    return this.generateScenario({
      symbol,
      count,
      sentimentBias: 'positive',
      relevanceRange: [0.7, 1.0]
    });
  }

  /**
   * Generate negative news
   */
  static generateNegativeNews(symbol: string, count: number = 5): NewsData[] {
    return this.generateScenario({
      symbol,
      count,
      sentimentBias: 'negative',
      relevanceRange: [0.7, 1.0]
    });
  }

  /**
   * Generate mixed news
   */
  static generateMixedNews(symbol: string, count: number = 10): NewsData[] {
    return this.generateScenario({
      symbol,
      count,
      sentimentBias: 'mixed',
      relevanceRange: [0.5, 1.0]
    });
  }
}

/**
 * Generates realistic social sentiment data for testing
 */
export class SentimentDataGenerator {
  private static sources = ['reddit', 'twitter', 'stocktwits', 'discord', 'telegram'];
  private static subreddits = ['investing', 'stocks', 'SecurityAnalysis', 'ValueInvesting', 'wallstreetbets'];

  /**
   * Generate sentiment data for a scenario
   */
  static generateScenario(config: SentimentScenarioConfig): SentimentData {
    const sentiment = this.calculateSentiment(config.scenario);
    const confidence = config.confidence || (0.6 + Math.random() * 0.3);
    const volume = config.volume || Math.floor(50 + Math.random() * 500);
    
    const breakdown = this.generateBreakdown(sentiment, volume);
    
    return {
      symbol: config.symbol,
      sentiment,
      confidence,
      volume,
      timestamp: new Date(),
      sources: this.generateSources(),
      breakdown
    };
  }

  private static calculateSentiment(scenario: string): number {
    switch (scenario) {
      case 'bullish':
        return 0.4 + Math.random() * 0.6; // 0.4 to 1.0
      case 'bearish':
        return -0.4 - Math.random() * 0.6; // -1.0 to -0.4
      case 'volatile':
        return (Math.random() - 0.5) * 1.8; // -0.9 to 0.9
      case 'mixed':
        return (Math.random() - 0.5) * 1.0; // -0.5 to 0.5
      default: // neutral
        return (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
    }
  }

  private static generateBreakdown(sentiment: number, volume: number) {
    let positive: number, neutral: number, negative: number;
    
    if (sentiment > 0.2) {
      positive = 40 + Math.random() * 40; // 40-80%
      negative = 5 + Math.random() * 15; // 5-20%
      neutral = 100 - positive - negative;
    } else if (sentiment < -0.2) {
      negative = 40 + Math.random() * 40; // 40-80%
      positive = 5 + Math.random() * 15; // 5-20%
      neutral = 100 - positive - negative;
    } else {
      neutral = 40 + Math.random() * 30; // 40-70%
      positive = Math.random() * (100 - neutral);
      negative = 100 - positive - neutral;
    }
    
    return {
      positive: Math.round(positive),
      neutral: Math.round(neutral),
      negative: Math.round(negative)
    };
  }

  private static generateSources(): string[] {
    const sourceCount = 1 + Math.floor(Math.random() * 3); // 1-3 sources
    const selectedSources: string[] = [];
    
    for (let i = 0; i < sourceCount; i++) {
      const source = this.sources[Math.floor(Math.random() * this.sources.length)];
      if (!selectedSources.includes(source)) {
        selectedSources.push(source);
      }
    }
    
    return selectedSources;
  }

  /**
   * Generate bullish sentiment
   */
  static generateBullishSentiment(symbol: string): SentimentData {
    return this.generateScenario({
      symbol,
      scenario: 'bullish',
      confidence: 0.8,
      volume: 200 + Math.floor(Math.random() * 300)
    });
  }

  /**
   * Generate bearish sentiment
   */
  static generateBearishSentiment(symbol: string): SentimentData {
    return this.generateScenario({
      symbol,
      scenario: 'bearish',
      confidence: 0.8,
      volume: 200 + Math.floor(Math.random() * 300)
    });
  }

  /**
   * Generate neutral sentiment
   */
  static generateNeutralSentiment(symbol: string): SentimentData {
    return this.generateScenario({
      symbol,
      scenario: 'neutral',
      confidence: 0.6,
      volume: 50 + Math.floor(Math.random() * 150)
    });
  }

  /**
   * Generate volatile sentiment
   */
  static generateVolatileSentiment(symbol: string): SentimentData {
    return this.generateScenario({
      symbol,
      scenario: 'volatile',
      confidence: 0.5,
      volume: 300 + Math.floor(Math.random() * 500)
    });
  }
}