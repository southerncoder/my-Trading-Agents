/**
 * Mock Providers for Testing Failover Behavior
 * 
 * Provides configurable mock providers to test failover scenarios
 * Requirements: 7.1, 7.2, 7.3
 */

import {
  DataProvider,
  NewsProvider,
  SocialProvider,
  HealthStatus,
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types/data-providers';
import { MarketDataGenerator, NewsDataGenerator, SentimentDataGenerator } from './test-data-generators';

export interface MockProviderConfig {
  name: string;
  responseDelay?: number;
  failureRate?: number;
  shouldFail?: boolean;
  healthStatus?: 'healthy' | 'degraded' | 'failed';
  customResponses?: Map<string, any>;
}

/**
 * Configurable mock market data provider
 */
export class MockMarketDataProvider implements DataProvider {
  name: string;
  private config: MockProviderConfig;
  private requestCount = 0;
  private failureCount = 0;

  constructor(config: MockProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    this.requestCount++;
    
    // Simulate response delay
    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
    
    // Check for custom responses
    if (this.config.customResponses?.has(symbol)) {
      return this.config.customResponses.get(symbol);
    }
    
    // Simulate failures
    if (this.config.shouldFail || 
        (this.config.failureRate && Math.random() < this.config.failureRate)) {
      this.failureCount++;
      throw new Error(`${this.name} failed to fetch data for ${symbol}`);
    }
    
    // Generate mock data
    const marketData = MarketDataGenerator.generateBullMarket(symbol, 1, 100 + Math.random() * 100);
    return marketData[0];
  }

  async checkHealth(): Promise<HealthStatus> {
    const errorRate = this.requestCount > 0 ? this.failureCount / this.requestCount : 0;
    
    let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
    if (this.config.healthStatus) {
      status = this.config.healthStatus;
    } else if (errorRate > 0.5) {
      status = 'failed';
    } else if (errorRate > 0.2) {
      status = 'degraded';
    }
    
    return {
      provider: this.name,
      status,
      responseTime: this.config.responseDelay || 50,
      errorRate,
      lastCheck: new Date()
    };
  }

  // Test utilities
  getRequestCount(): number {
    return this.requestCount;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  resetCounters(): void {
    this.requestCount = 0;
    this.failureCount = 0;
  }

  updateConfig(updates: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setCustomResponse(symbol: string, response: MarketData): void {
    if (!this.config.customResponses) {
      this.config.customResponses = new Map();
    }
    this.config.customResponses.set(symbol, response);
  }
}

/**
 * Configurable mock news provider
 */
export class MockNewsProvider implements NewsProvider {
  name: string;
  private config: MockProviderConfig;
  private requestCount = 0;
  private failureCount = 0;

  constructor(config: MockProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async getNewsData(symbol: string): Promise<NewsData[]> {
    this.requestCount++;
    
    // Simulate response delay
    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
    
    // Check for custom responses
    if (this.config.customResponses?.has(symbol)) {
      return this.config.customResponses.get(symbol);
    }
    
    // Simulate failures
    if (this.config.shouldFail || 
        (this.config.failureRate && Math.random() < this.config.failureRate)) {
      this.failureCount++;
      throw new Error(`${this.name} failed to fetch news for ${symbol}`);
    }
    
    // Generate mock news data
    return NewsDataGenerator.generateMixedNews(symbol, 3 + Math.floor(Math.random() * 5));
  }

  async checkHealth(): Promise<HealthStatus> {
    const errorRate = this.requestCount > 0 ? this.failureCount / this.requestCount : 0;
    
    let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
    if (this.config.healthStatus) {
      status = this.config.healthStatus;
    } else if (errorRate > 0.5) {
      status = 'failed';
    } else if (errorRate > 0.2) {
      status = 'degraded';
    }
    
    return {
      provider: this.name,
      status,
      responseTime: this.config.responseDelay || 100,
      errorRate,
      lastCheck: new Date()
    };
  }

  // Test utilities
  getRequestCount(): number {
    return this.requestCount;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  resetCounters(): void {
    this.requestCount = 0;
    this.failureCount = 0;
  }

  updateConfig(updates: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setCustomResponse(symbol: string, response: NewsData[]): void {
    if (!this.config.customResponses) {
      this.config.customResponses = new Map();
    }
    this.config.customResponses.set(symbol, response);
  }
}

/**
 * Configurable mock social provider
 */
export class MockSocialProvider implements SocialProvider {
  name: string;
  private config: MockProviderConfig;
  private requestCount = 0;
  private failureCount = 0;

  constructor(config: MockProviderConfig) {
    this.name = config.name;
    this.config = config;
  }

  async getSocialSentiment(symbol: string): Promise<SentimentData> {
    this.requestCount++;
    
    // Simulate response delay
    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
    
    // Check for custom responses
    if (this.config.customResponses?.has(symbol)) {
      return this.config.customResponses.get(symbol);
    }
    
    // Simulate failures
    if (this.config.shouldFail || 
        (this.config.failureRate && Math.random() < this.config.failureRate)) {
      this.failureCount++;
      throw new Error(`${this.name} failed to fetch sentiment for ${symbol}`);
    }
    
    // Generate mock sentiment data
    return SentimentDataGenerator.generateNeutralSentiment(symbol);
  }

  async checkHealth(): Promise<HealthStatus> {
    const errorRate = this.requestCount > 0 ? this.failureCount / this.requestCount : 0;
    
    let status: 'healthy' | 'degraded' | 'failed' = 'healthy';
    if (this.config.healthStatus) {
      status = this.config.healthStatus;
    } else if (errorRate > 0.5) {
      status = 'failed';
    } else if (errorRate > 0.2) {
      status = 'degraded';
    }
    
    return {
      provider: this.name,
      status,
      responseTime: this.config.responseDelay || 150,
      errorRate,
      lastCheck: new Date()
    };
  }

  // Test utilities
  getRequestCount(): number {
    return this.requestCount;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  resetCounters(): void {
    this.requestCount = 0;
    this.failureCount = 0;
  }

  updateConfig(updates: Partial<MockProviderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setCustomResponse(symbol: string, response: SentimentData): void {
    if (!this.config.customResponses) {
      this.config.customResponses = new Map();
    }
    this.config.customResponses.set(symbol, response);
  }
}

/**
 * Factory for creating mock provider scenarios
 */
export class MockProviderFactory {
  /**
   * Create a healthy provider
   */
  static createHealthyProvider(name: string, type: 'market' | 'news' | 'social', responseDelay: number = 50) {
    const config: MockProviderConfig = {
      name,
      responseDelay,
      failureRate: 0,
      healthStatus: 'healthy'
    };
    
    switch (type) {
      case 'market':
        return new MockMarketDataProvider(config);
      case 'news':
        return new MockNewsProvider(config);
      case 'social':
        return new MockSocialProvider(config);
    }
  }

  /**
   * Create an unreliable provider
   */
  static createUnreliableProvider(
    name: string, 
    type: 'market' | 'news' | 'social', 
    failureRate: number = 0.3,
    responseDelay: number = 200
  ) {
    const config: MockProviderConfig = {
      name,
      responseDelay,
      failureRate,
      healthStatus: 'degraded'
    };
    
    switch (type) {
      case 'market':
        return new MockMarketDataProvider(config);
      case 'news':
        return new MockNewsProvider(config);
      case 'social':
        return new MockSocialProvider(config);
    }
  }

  /**
   * Create a failing provider
   */
  static createFailingProvider(name: string, type: 'market' | 'news' | 'social') {
    const config: MockProviderConfig = {
      name,
      shouldFail: true,
      healthStatus: 'failed'
    };
    
    switch (type) {
      case 'market':
        return new MockMarketDataProvider(config);
      case 'news':
        return new MockNewsProvider(config);
      case 'social':
        return new MockSocialProvider(config);
    }
  }

  /**
   * Create a slow provider
   */
  static createSlowProvider(
    name: string, 
    type: 'market' | 'news' | 'social', 
    responseDelay: number = 5000
  ) {
    const config: MockProviderConfig = {
      name,
      responseDelay,
      failureRate: 0,
      healthStatus: 'degraded'
    };
    
    switch (type) {
      case 'market':
        return new MockMarketDataProvider(config);
      case 'news':
        return new MockNewsProvider(config);
      case 'social':
        return new MockSocialProvider(config);
    }
  }

  /**
   * Create a provider that recovers over time
   */
  static createRecoveringProvider(
    name: string, 
    type: 'market' | 'news' | 'social',
    initialFailureRate: number = 0.8,
    recoverySteps: number = 10
  ) {
    const config: MockProviderConfig = {
      name,
      failureRate: initialFailureRate,
      responseDelay: 100,
      healthStatus: 'failed'
    };
    
    let provider: MockMarketDataProvider | MockNewsProvider | MockSocialProvider;
    
    switch (type) {
      case 'market':
        provider = new MockMarketDataProvider(config);
        break;
      case 'news':
        provider = new MockNewsProvider(config);
        break;
      case 'social':
        provider = new MockSocialProvider(config);
        break;
    }
    
    // Set up recovery mechanism
    let step = 0;
    const recoveryInterval = setInterval(() => {
      step++;
      const newFailureRate = Math.max(0, initialFailureRate - (step / recoverySteps));
      const newStatus = newFailureRate > 0.5 ? 'failed' : (newFailureRate > 0.2 ? 'degraded' : 'healthy');
      
      provider.updateConfig({
        failureRate: newFailureRate,
        healthStatus: newStatus
      });
      
      if (step >= recoverySteps) {
        clearInterval(recoveryInterval);
      }
    }, 1000);
    
    return provider;
  }
}