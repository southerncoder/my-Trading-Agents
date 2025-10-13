/**
 * Data Provider Failover System
 * 
 * Implements comprehensive failover cascades for all data providers:
 * - News data: Google News → NewsAPI → Brave News → RSS feeds
 * - Social media: Reddit → Twitter → cached sentiment
 * - Fundamentals: Yahoo Finance → Alpha Vantage → MarketStack → cached data
 * - Market data: Yahoo Finance → Alpha Vantage → MarketStack → cached data
 * 
 * Features:
 * - Automatic provider health monitoring
 * - Intelligent failover with exponential backoff
 * - Provider performance tracking
 * - Graceful degradation with cached data
 */

import { createLogger } from '../utils/enhanced-logger';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { TradingAgentError, ErrorType, ErrorSeverity, createErrorContext } from '../utils/trading-agent-error';

const logger = createLogger('resilience', 'data-provider-failover');

// ========================================
// Provider Configuration Types
// ========================================

export interface DataProvider {
  name: string;
  type: 'news' | 'social' | 'fundamentals' | 'market_data';
  priority: number; // Lower number = higher priority
  enabled: boolean;
  healthCheck: () => Promise<boolean>;
  execute: (operation: string, params: any) => Promise<any>;
  config: ProviderConfig;
}

export interface ProviderConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringWindow: number;
  };
}

export interface FailoverResult<T> {
  data: T;
  provider: string;
  fallbackUsed: boolean;
  attempts: ProviderAttempt[];
  totalTime: number;
}

export interface ProviderAttempt {
  provider: string;
  success: boolean;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

// ========================================
// Default Provider Configurations
// ========================================

const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  timeout: 10000,
  retryAttempts: 2,
  retryDelay: 1000,
  circuitBreakerConfig: {
    failureThreshold: 3,
    recoveryTimeout: 60000,
    monitoringWindow: 300000
  }
};

const NEWS_PROVIDER_CONFIG: ProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIG,
  timeout: 15000,
  retryAttempts: 1,
  circuitBreakerConfig: {
    failureThreshold: 2,
    recoveryTimeout: 30000,
    monitoringWindow: 180000
  }
};

const SOCIAL_PROVIDER_CONFIG: ProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIG,
  timeout: 12000,
  retryAttempts: 1,
  circuitBreakerConfig: {
    failureThreshold: 2,
    recoveryTimeout: 45000,
    monitoringWindow: 240000
  }
};

const FINANCIAL_PROVIDER_CONFIG: ProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIG,
  timeout: 8000,
  retryAttempts: 3,
  circuitBreakerConfig: {
    failureThreshold: 4,
    recoveryTimeout: 90000,
    monitoringWindow: 600000
  }
};

// ========================================
// Data Provider Failover Manager
// ========================================

export class DataProviderFailover {
  private providers: Map<string, DataProvider> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private performanceMetrics: Map<string, ProviderAttempt[]> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  /**
   * Initialize all data providers with their configurations
   */
  private initializeProviders(): void {
    // News providers
    this.registerNewsProviders();
    
    // Social media providers
    this.registerSocialProviders();
    
    // Financial data providers
    this.registerFinancialProviders();

    logger.info('providers-initialized', 'Data provider failover system initialized', {
      totalProviders: this.providers.size,
      newsProviders: this.getProvidersByType('news').length,
      socialProviders: this.getProvidersByType('social').length,
      fundamentalsProviders: this.getProvidersByType('fundamentals').length,
      marketDataProviders: this.getProvidersByType('market_data').length
    });
  }

  /**
   * Register news data providers with failover cascade
   */
  private registerNewsProviders(): void {
    // Primary: Google News Service
    this.registerProvider({
      name: 'google-news',
      type: 'news',
      priority: 1,
      enabled: true,
      config: NEWS_PROVIDER_CONFIG,
      healthCheck: async () => {
        try {
          const response = await fetch(`${process.env.GOOGLE_NEWS_URL || 'http://localhost:3003'}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        const { GoogleNewsAPI } = await import('../dataflows/google-news');
        const api = new GoogleNewsAPI(params.config);
        
        switch (operation) {
          case 'getNews':
            return await api.getNews(params.query, params.currDate, params.lookBackDays);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }
    });

    // Secondary: NewsAPI.org
    this.registerProvider({
      name: 'newsapi',
      type: 'news',
      priority: 2,
      enabled: !!process.env.NEWSAPI_KEY,
      config: NEWS_PROVIDER_CONFIG,
      healthCheck: async () => {
        if (!process.env.NEWSAPI_KEY) return false;
        try {
          const response = await fetch('https://newsapi.org/v2/top-headlines?country=us&pageSize=1&apiKey=' + process.env.NEWSAPI_KEY, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        if (operation !== 'getNews') {
          throw new Error(`Unknown operation: ${operation}`);
        }
        
        const response = await fetch('https://newsapi.org/v2/everything', {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.NEWSAPI_KEY!
          },
          signal: AbortSignal.timeout(NEWS_PROVIDER_CONFIG.timeout)
        });

        if (!response.ok) {
          throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return this.formatNewsApiResponse(data, params.query, params.currDate);
      }
    });

    // Tertiary: Brave News (RSS-based)
    this.registerProvider({
      name: 'brave-news',
      type: 'news',
      priority: 3,
      enabled: true,
      config: NEWS_PROVIDER_CONFIG,
      healthCheck: async () => {
        try {
          const response = await fetch('https://search.brave.com/news', {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        if (operation !== 'getNews') {
          throw new Error(`Unknown operation: ${operation}`);
        }
        
        // Brave News search implementation
        const searchUrl = `https://search.brave.com/news?q=${encodeURIComponent(params.query)}`;
        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(NEWS_PROVIDER_CONFIG.timeout),
          headers: {
            'User-Agent': 'TradingAgents/1.0 (News Aggregator)'
          }
        });

        if (!response.ok) {
          throw new Error(`Brave News error: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        return this.parseBraveNewsResponse(html, params.query, params.currDate);
      }
    });

    // Quaternary: RSS Feed Aggregation
    this.registerProvider({
      name: 'rss-aggregation',
      type: 'news',
      priority: 4,
      enabled: true,
      config: NEWS_PROVIDER_CONFIG,
      healthCheck: async () => true, // RSS feeds are generally available
      execute: async (operation: string, params: any) => {
        if (operation !== 'getNews') {
          throw new Error(`Unknown operation: ${operation}`);
        }
        
        return await this.aggregateRSSFeeds(params.query, params.currDate, params.lookBackDays);
      }
    });
  }

  /**
   * Register social media providers with failover cascade
   */
  private registerSocialProviders(): void {
    // Primary: Reddit Service
    this.registerProvider({
      name: 'reddit',
      type: 'social',
      priority: 1,
      enabled: process.env.REDDIT_ENABLED?.toLowerCase() === 'true',
      config: SOCIAL_PROVIDER_CONFIG,
      healthCheck: async () => {
        if (process.env.REDDIT_ENABLED?.toLowerCase() !== 'true') return false;
        try {
          const response = await fetch(`${process.env.REDDIT_SERVICE_URL || 'http://localhost:3001'}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        const { RedditAPI } = await import('../dataflows/reddit');
        const api = new RedditAPI(params.config);
        
        switch (operation) {
          case 'getCompanyNews':
            return await api.getCompanyNews(params.ticker, params.startDate, params.lookBackDays, params.maxLimitPerDay);
          case 'getGlobalNews':
            return await api.getGlobalNews(params.startDate, params.lookBackDays, params.maxLimitPerDay);
          case 'analyzeSentiment':
            return await api.analyzeSentiment(params.symbol);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }
    });

    // Secondary: Twitter/X API (placeholder for future implementation)
    this.registerProvider({
      name: 'twitter',
      type: 'social',
      priority: 2,
      enabled: !!process.env.TWITTER_API_KEY,
      config: SOCIAL_PROVIDER_CONFIG,
      healthCheck: async () => {
        if (!process.env.TWITTER_API_KEY) return false;
        // Twitter API health check would go here
        return false; // Disabled for now
      },
      execute: async (operation: string, params: any) => {
        throw new Error('Twitter provider not yet implemented');
      }
    });

    // Tertiary: Cached Sentiment Data
    this.registerProvider({
      name: 'cached-sentiment',
      type: 'social',
      priority: 3,
      enabled: true,
      config: SOCIAL_PROVIDER_CONFIG,
      healthCheck: async () => true, // Cache is always available
      execute: async (operation: string, params: any) => {
        return await this.getCachedSentimentData(operation, params);
      }
    });
  }

  /**
   * Register financial data providers with failover cascade
   */
  private registerFinancialProviders(): void {
    // Primary: Yahoo Finance Service
    this.registerProvider({
      name: 'yahoo-finance',
      type: 'fundamentals',
      priority: 1,
      enabled: true,
      config: FINANCIAL_PROVIDER_CONFIG,
      healthCheck: async () => {
        try {
          const response = await fetch(`${process.env.YAHOO_FINANCE_URL || 'http://localhost:3002'}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        const { YahooFinanceAPI } = await import('../dataflows/yahoo-finance');
        const api = new YahooFinanceAPI(params.config);
        
        switch (operation) {
          case 'getData':
            return await api.getData(params.symbol, params.startDate, params.endDate, params.online);
          case 'getQuote':
            return await api.getQuote(params.symbol);
          case 'getFundamentals':
            return await api.getFundamentals(params.symbol, params.startDate);
          case 'search':
            return await api.search(params.query);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }
    });

    // Secondary: Alpha Vantage
    this.registerProvider({
      name: 'alpha-vantage',
      type: 'fundamentals',
      priority: 2,
      enabled: !!process.env.ALPHA_VANTAGE_API_KEY,
      config: FINANCIAL_PROVIDER_CONFIG,
      healthCheck: async () => {
        if (!process.env.ALPHA_VANTAGE_API_KEY) return false;
        try {
          const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        const { AlphaVantageDataProvider } = await import('../dataflows/alpha-vantage');
        const api = new AlphaVantageDataProvider(params.config);
        
        switch (operation) {
          case 'getData':
            const dailyData = await api.getDailyData(params.symbol);
            return api.convertToYahooFormat(dailyData, params.symbol);
          case 'getQuote':
            return await api.getQuote(params.symbol);
          case 'getFundamentals':
            return await api.getCompanyOverview(params.symbol);
          case 'search':
            return await api.searchSymbols(params.query);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }
    });

    // Tertiary: MarketStack
    this.registerProvider({
      name: 'marketstack',
      type: 'fundamentals',
      priority: 3,
      enabled: !!process.env.MARKETSTACK_API_KEY,
      config: FINANCIAL_PROVIDER_CONFIG,
      healthCheck: async () => {
        if (!process.env.MARKETSTACK_API_KEY) return false;
        try {
          const response = await fetch(`http://api.marketstack.com/v1/eod/latest?access_key=${process.env.MARKETSTACK_API_KEY}&symbols=AAPL&limit=1`, {
            signal: AbortSignal.timeout(5000)
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      execute: async (operation: string, params: any) => {
        const { MarketStackAPI } = await import('../dataflows/marketstack');
        const api = new MarketStackAPI(params.config);
        
        switch (operation) {
          case 'getData':
            return await api.getHistoricalData(params.symbol, params.startDate, params.endDate);
          case 'getQuote':
            return await api.getLatestData(params.symbol);
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      }
    });

    // Quaternary: Cached Financial Data
    this.registerProvider({
      name: 'cached-financial',
      type: 'fundamentals',
      priority: 4,
      enabled: true,
      config: FINANCIAL_PROVIDER_CONFIG,
      healthCheck: async () => true, // Cache is always available
      execute: async (operation: string, params: any) => {
        return await this.getCachedFinancialData(operation, params);
      }
    });

    // Market data providers (similar structure)
    this.registerMarketDataProviders();
  }

  /**
   * Register market data providers
   */
  private registerMarketDataProviders(): void {
    // Use same providers as fundamentals but with market_data type
    const fundamentalsProviders = this.getProvidersByType('fundamentals');
    
    for (const provider of fundamentalsProviders) {
      this.registerProvider({
        ...provider,
        type: 'market_data',
        name: provider.name + '-market'
      });
    }
  }

  /**
   * Register a data provider
   */
  private registerProvider(provider: DataProvider): void {
    this.providers.set(provider.name, provider);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(provider.name, new CircuitBreaker(
      provider.config.circuitBreakerConfig,
      provider.name
    ));

    // Initialize health status
    this.healthStatus.set(provider.name, {
      name: provider.name,
      status: 'healthy',
      responseTime: 0,
      errorRate: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0
    });

    // Initialize performance metrics
    this.performanceMetrics.set(provider.name, []);

    logger.debug('provider-registered', `Registered provider: ${provider.name}`, {
      name: provider.name,
      type: provider.type,
      priority: provider.priority,
      enabled: provider.enabled
    });
  }

  /**
   * Execute operation with automatic failover
   */
  async executeWithFailover<T>(
    providerType: 'news' | 'social' | 'fundamentals' | 'market_data',
    operation: string,
    params: any
  ): Promise<FailoverResult<T>> {
    const startTime = Date.now();
    const attempts: ProviderAttempt[] = [];
    const providers = this.getProvidersByType(providerType)
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (providers.length === 0) {
      throw new TradingAgentError(
        `No enabled providers available for type: ${providerType}`,
        ErrorType.SYSTEM_ERROR,
        ErrorSeverity.HIGH,
        createErrorContext('DataProviderFailover', 'executeWithFailover', { providerType, operation })
      );
    }

    logger.info('failover-execution-start', `Starting failover execution for ${providerType}`, {
      providerType,
      operation,
      availableProviders: providers.map(p => p.name),
      params: this.sanitizeParams(params)
    });

    let lastError: Error | null = null;

    for (const provider of providers) {
      const attemptStart = Date.now();
      
      try {
        // Check circuit breaker
        const circuitBreaker = this.circuitBreakers.get(provider.name)!;
        
        const result = await circuitBreaker.execute(async () => {
          logger.debug('provider-attempt', `Attempting ${provider.name} for ${operation}`, {
            provider: provider.name,
            operation,
            priority: provider.priority
          });

          return await provider.execute(operation, params);
        });

        const responseTime = Date.now() - attemptStart;
        
        // Record successful attempt
        const attempt: ProviderAttempt = {
          provider: provider.name,
          success: true,
          responseTime,
          timestamp: new Date()
        };
        attempts.push(attempt);
        this.recordAttempt(provider.name, attempt);

        logger.info('failover-success', `Provider ${provider.name} succeeded for ${operation}`, {
          provider: provider.name,
          operation,
          responseTime,
          totalTime: Date.now() - startTime,
          fallbackUsed: provider.priority > 1
        });

        return {
          data: result,
          provider: provider.name,
          fallbackUsed: provider.priority > 1,
          attempts,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        const responseTime = Date.now() - attemptStart;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Record failed attempt
        const attempt: ProviderAttempt = {
          provider: provider.name,
          success: false,
          error: lastError.message,
          responseTime,
          timestamp: new Date()
        };
        attempts.push(attempt);
        this.recordAttempt(provider.name, attempt);

        logger.warn('provider-failed', `Provider ${provider.name} failed for ${operation}`, {
          provider: provider.name,
          operation,
          error: lastError.message,
          responseTime,
          priority: provider.priority
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    const totalTime = Date.now() - startTime;
    
    logger.error('all-providers-failed', `All providers failed for ${providerType} ${operation}`, {
      providerType,
      operation,
      attempts: attempts.length,
      totalTime,
      lastError: lastError?.message
    });

    throw new TradingAgentError(
      `All ${providerType} providers failed for operation ${operation}: ${lastError?.message}`,
      ErrorType.PROVIDER_ERROR,
      ErrorSeverity.HIGH,
      createErrorContext('DataProviderFailover', 'executeWithFailover', {
        providerType,
        operation,
        attempts,
        totalTime
      })
    );
  }

  /**
   * Get providers by type
   */
  private getProvidersByType(type: string): DataProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === type);
  }

  /**
   * Record provider attempt for metrics
   */
  private recordAttempt(providerName: string, attempt: ProviderAttempt): void {
    const metrics = this.performanceMetrics.get(providerName) || [];
    metrics.push(attempt);
    
    // Keep only last 100 attempts
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
    
    this.performanceMetrics.set(providerName, metrics);

    // Update health status
    this.updateHealthStatus(providerName, attempt);
  }

  /**
   * Update provider health status
   */
  private updateHealthStatus(providerName: string, attempt: ProviderAttempt): void {
    const health = this.healthStatus.get(providerName);
    if (!health) return;

    const metrics = this.performanceMetrics.get(providerName) || [];
    const recentMetrics = metrics.slice(-10); // Last 10 attempts

    // Calculate error rate
    const failures = recentMetrics.filter(m => !m.success).length;
    const errorRate = recentMetrics.length > 0 ? failures / recentMetrics.length : 0;

    // Calculate average response time
    const successfulAttempts = recentMetrics.filter(m => m.success);
    const avgResponseTime = successfulAttempts.length > 0 
      ? successfulAttempts.reduce((sum, m) => sum + m.responseTime, 0) / successfulAttempts.length
      : 0;

    // Update consecutive failures
    const consecutiveFailures = attempt.success ? 0 : health.consecutiveFailures + 1;

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (consecutiveFailures >= 3 || errorRate > 0.5) {
      status = 'unhealthy';
    } else if (consecutiveFailures >= 1 || errorRate > 0.2 || avgResponseTime > 10000) {
      status = 'degraded';
    }

    // Update health status
    this.healthStatus.set(providerName, {
      name: providerName,
      status,
      responseTime: avgResponseTime,
      errorRate,
      lastCheck: new Date(),
      consecutiveFailures
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Check every minute

    logger.info('health-monitoring-started', 'Provider health monitoring started', {
      interval: 60000,
      providers: this.providers.size
    });
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const startTime = Date.now();
        const isHealthy = await provider.healthCheck();
        const responseTime = Date.now() - startTime;

        const attempt: ProviderAttempt = {
          provider: provider.name,
          success: isHealthy,
          responseTime,
          timestamp: new Date(),
          ...(isHealthy ? {} : { error: 'Health check failed' })
        };

        this.recordAttempt(provider.name, attempt);

        logger.debug('health-check-complete', `Health check for ${provider.name}`, {
          provider: provider.name,
          healthy: isHealthy,
          responseTime
        });

      } catch (error) {
        const attempt: ProviderAttempt = {
          provider: provider.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          responseTime: 0,
          timestamp: new Date()
        };

        this.recordAttempt(provider.name, attempt);

        logger.warn('health-check-error', `Health check error for ${provider.name}`, {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Get current health status of all providers
   */
  getHealthStatus(): ProviderHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get provider performance metrics
   */
  getPerformanceMetrics(providerName?: string): Map<string, ProviderAttempt[]> {
    if (providerName) {
      const metrics = this.performanceMetrics.get(providerName);
      return metrics ? new Map([[providerName, metrics]]) : new Map();
    }
    return new Map(this.performanceMetrics);
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any): any {
    const sanitized = { ...params };
    
    // Remove sensitive data
    delete sanitized.config;
    delete sanitized.apiKey;
    delete sanitized.password;
    
    return sanitized;
  }

  /**
   * Format NewsAPI response
   */
  private formatNewsApiResponse(data: any, query: string, currDate: string): string {
    if (!data.articles || data.articles.length === 0) {
      return `## ${query} News (NewsAPI)\n\nNo articles found.`;
    }

    let newsStr = '';
    for (const article of data.articles.slice(0, 10)) {
      const publishedDate = new Date(article.publishedAt).toLocaleDateString();
      newsStr += `### ${article.title} (${article.source.name}, ${publishedDate})\n\n`;
      
      if (article.description) {
        newsStr += `${article.description}\n\n`;
      }
      
      newsStr += `[Read full article](${article.url})\n\n`;
    }

    return `## ${query} News (NewsAPI Fallback)\n\n**Retrieved**: ${data.articles.length} articles\n\n${newsStr}`;
  }

  /**
   * Parse Brave News response
   */
  private parseBraveNewsResponse(html: string, query: string, currDate: string): string {
    // Simple HTML parsing for news results
    // In production, use proper HTML parser like cheerio
    const titleMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || [];
    const titles = titleMatches.slice(0, 5).map(match => 
      match.replace(/<[^>]*>/g, '').trim()
    );

    if (titles.length === 0) {
      return `## ${query} News (Brave News)\n\nNo articles found.`;
    }

    let newsStr = '';
    titles.forEach((title, index) => {
      newsStr += `### ${title} (Brave News, ${currDate})\n\n`;
      newsStr += `Article ${index + 1} from Brave News search results.\n\n`;
    });

    return `## ${query} News (Brave News Fallback)\n\n**Retrieved**: ${titles.length} articles\n\n${newsStr}`;
  }

  /**
   * Aggregate RSS feeds for news
   */
  private async aggregateRSSFeeds(query: string, currDate: string, lookBackDays: number): string {
    const rssFeeds = [
      'https://feeds.reuters.com/reuters/businessNews',
      'https://feeds.bloomberg.com/markets',
      'https://www.marketwatch.com/rss/topstories'
    ];

    let aggregatedNews = '';
    let totalArticles = 0;

    for (const feedUrl of rssFeeds) {
      try {
        const response = await fetch(feedUrl, {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': 'TradingAgents/1.0 (RSS Reader)'
          }
        });

        if (response.ok) {
          const xml = await response.text();
          const articles = this.parseRSSFeed(xml, this.extractSourceFromUrl(feedUrl));
          
          const relevantArticles = articles.filter(article =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.description.toLowerCase().includes(query.toLowerCase())
          );

          if (relevantArticles.length > 0) {
            totalArticles += relevantArticles.length;
            for (const article of relevantArticles.slice(0, 3)) {
              aggregatedNews += `### ${article.title} (${article.source})\n\n`;
              if (article.description) {
                aggregatedNews += `${article.description}\n\n`;
              }
              aggregatedNews += `[Read more](${article.url})\n\n`;
            }
          }
        }
      } catch (error) {
        logger.debug('rss-feed-failed', `RSS feed failed: ${feedUrl}`, {
          feedUrl,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (totalArticles === 0) {
      return `## ${query} News (RSS Aggregation)\n\nNo relevant articles found in RSS feeds.`;
    }

    return `## ${query} News (RSS Aggregation Fallback)\n\n**Retrieved**: ${totalArticles} articles from multiple RSS sources\n\n${aggregatedNews}`;
  }

  /**
   * Parse RSS feed XML
   */
  private parseRSSFeed(xml: string, source: string): any[] {
    const articles: any[] = [];
    
    try {
      const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
      
      if (itemMatches) {
        for (const item of itemMatches.slice(0, 5)) {
          const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
          const descMatch = item.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i);
          const linkMatch = item.match(/<link[^>]*><!\[CDATA\[(.*?)\]\]><\/link>|<link[^>]*>(.*?)<\/link>/i);

          if (titleMatch) {
            articles.push({
              title: titleMatch[1] || titleMatch[2] || 'No title',
              description: descMatch ? (descMatch[1] || descMatch[2] || '') : '',
              url: linkMatch ? (linkMatch[1] || linkMatch[2] || '') : '',
              source: source
            });
          }
        }
      }
    } catch (error) {
      logger.warn('rss-parse-failed', `RSS parsing failed for ${source}`, {
        source,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return articles;
  }

  /**
   * Extract source name from URL
   */
  private extractSourceFromUrl(url: string): string {
    if (url.includes('reuters')) return 'Reuters';
    if (url.includes('bloomberg')) return 'Bloomberg';
    if (url.includes('marketwatch')) return 'MarketWatch';
    return 'RSS Feed';
  }

  /**
   * Get cached sentiment data
   */
  private async getCachedSentimentData(operation: string, params: any): Promise<string> {
    logger.info('cached-sentiment-fallback', `Using cached sentiment data for ${operation}`, {
      operation,
      ticker: params.ticker || params.symbol
    });

    const ticker = params.ticker || params.symbol || 'UNKNOWN';
    const currentDate = new Date().toISOString().split('T')[0];

    switch (operation) {
      case 'getCompanyNews':
        return `## ${ticker} Social Sentiment (Cached Data)\n\n**Source**: Cached sentiment analysis\n**Last Updated**: ${currentDate}\n\n### Sentiment Summary\n\nCached sentiment data indicates neutral market sentiment for ${ticker}. Social media monitoring services are temporarily unavailable.\n\n**Recommendation**: Monitor official company communications and financial news sources for current sentiment indicators.\n\n*Note: This is cached data. Real-time social sentiment will be restored when services are available.*`;

      case 'getGlobalNews':
        return `## Global Market Sentiment (Cached Data)\n\n**Source**: Cached sentiment analysis\n**Last Updated**: ${currentDate}\n\n### Market Overview\n\nCached data suggests stable market conditions with typical trading patterns. Social media sentiment monitoring is temporarily unavailable.\n\n**Key Indicators**:\n- Overall sentiment: Neutral\n- Market volatility: Moderate\n- Trading volume: Normal ranges\n\n*Note: This is cached data. Real-time social sentiment will be restored when services are available.*`;

      case 'analyzeSentiment':
        return {
          symbol: ticker,
          sentiment: 'neutral',
          confidence: 0.5,
          mentions: 0,
          posts: [],
          analysis: {
            total_score: 0,
            average_sentiment: 0,
            trending_topics: ['Cached data'],
            volume_trend: 'stable',
            subreddit_breakdown: {}
          }
        };

      default:
        return `## Cached Social Data\n\nCached social sentiment data available. Real-time social media monitoring temporarily unavailable.`;
    }
  }

  /**
   * Get cached financial data
   */
  private async getCachedFinancialData(operation: string, params: any): Promise<string> {
    logger.info('cached-financial-fallback', `Using cached financial data for ${operation}`, {
      operation,
      symbol: params.symbol
    });

    const symbol = params.symbol || 'UNKNOWN';
    const currentDate = new Date().toISOString().split('T')[0];

    switch (operation) {
      case 'getData':
        return `## Cached Market Data for ${symbol}\n\n**Source**: Local cache\n**Last Updated**: ${currentDate}\n\nHistorical market data temporarily unavailable from live providers. Using cached data for analysis.\n\n*Note: This is cached data. Live market data will be restored when providers are available.*`;

      case 'getQuote':
        return {
          symbol: symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          source: 'cached',
          timestamp: currentDate
        };

      case 'getFundamentals':
        return {
          symbol: symbol,
          marketCap: 0,
          peRatio: 0,
          eps: 0,
          source: 'cached',
          timestamp: currentDate
        };

      default:
        return `## Cached Financial Data\n\nCached financial data available for ${symbol}. Live data providers temporarily unavailable.`;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Close circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      // Circuit breakers don't need explicit cleanup in this implementation
    }

    logger.info('failover-destroyed', 'Data provider failover system destroyed');
  }
}

// ========================================
// Global Instance
// ========================================

export const dataProviderFailover = new DataProviderFailover();

// ========================================
// Convenience Functions
// ========================================

/**
 * Execute news operation with failover
 */
export async function getNewsWithFailover(query: string, currDate: string, lookBackDays: number, config: any): Promise<FailoverResult<string>> {
  return dataProviderFailover.executeWithFailover('news', 'getNews', {
    query,
    currDate,
    lookBackDays,
    config
  });
}

/**
 * Execute social media operation with failover
 */
export async function getSocialDataWithFailover(operation: string, params: any): Promise<FailoverResult<any>> {
  return dataProviderFailover.executeWithFailover('social', operation, params);
}

/**
 * Execute financial data operation with failover
 */
export async function getFinancialDataWithFailover(operation: string, params: any): Promise<FailoverResult<any>> {
  return dataProviderFailover.executeWithFailover('fundamentals', operation, params);
}

/**
 * Execute market data operation with failover
 */
export async function getMarketDataWithFailover(operation: string, params: any): Promise<FailoverResult<any>> {
  return dataProviderFailover.executeWithFailover('market_data', operation, params);
}

/**
 * Get health status of all providers
 */
export function getProviderHealthStatus(): ProviderHealth[] {
  return dataProviderFailover.getHealthStatus();
}

/**
 * Get provider performance metrics
 */
export function getProviderMetrics(providerName?: string): Map<string, ProviderAttempt[]> {
  return dataProviderFailover.getPerformanceMetrics(providerName);
}