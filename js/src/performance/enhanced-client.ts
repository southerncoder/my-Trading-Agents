import { performanceOptimizer } from './optimizer.js';
import { HealthMonitor } from '../monitoring/health.js';

interface LLMProvider {
  name: string;
  apiCall: (messages: any[]) => Promise<any>;
  rateLimitDelay?: number;
  maxRetries?: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

class PerformanceEnhancedLLMClient {
  private providers: Map<string, LLMProvider> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthMonitor: HealthMonitor;
  private failureThreshold = 5;
  private recoveryTimeout = 60000; // 1 minute

  constructor() {
    this.healthMonitor = new HealthMonitor();
  }

  public registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    this.circuitBreakers.set(provider.name, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed'
    });
  }

  public async makeRequest(
    providerName: string,
    model: string,
    messages: any[],
    options: {
      useCache?: boolean;
      maxRetries?: number;
      timeout?: number;
      fallbackProviders?: string[];
    } = {}
  ): Promise<any> {
    const startTime = performance.now();
    let lastError: Error | null = null;

    // Try primary provider
    try {
      const result = await this.executeRequest(providerName, model, messages, options);
      const duration = performance.now() - startTime;
      this.healthMonitor.recordRequest(true, duration, providerName);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Primary provider ${providerName} failed:`, error);
    }

    // Try fallback providers
    if (options.fallbackProviders && options.fallbackProviders.length > 0) {
      for (const fallbackProvider of options.fallbackProviders) {
        try {
          console.log(`Trying fallback provider: ${fallbackProvider}`);
          const result = await this.executeRequest(fallbackProvider, model, messages, options);
          const duration = performance.now() - startTime;
          this.healthMonitor.recordRequest(true, duration, fallbackProvider);
          return result;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Fallback provider ${fallbackProvider} failed:`, error);
        }
      }
    }

    // All providers failed
    const duration = performance.now() - startTime;
    this.healthMonitor.recordRequest(false, duration, providerName);
    throw lastError || new Error('All providers failed');
  }

  private async executeRequest(
    providerName: string,
    model: string,
    messages: any[],
    options: any
  ): Promise<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }

    // Check circuit breaker
    if (!this.isCircuitBreakerClosed(providerName)) {
      throw new Error(`Circuit breaker open for provider ${providerName}`);
    }

    // Check cache first if enabled
    if (options.useCache !== false) {
      const cacheKey = performanceOptimizer.generateCacheKey(providerName, model, messages);
      const cached = await performanceOptimizer.getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Execute with performance optimization
    try {
      const result = await performanceOptimizer.executeWithConcurrencyLimit(async () => {
        return await performanceOptimizer.optimizeResponseTime(
          () => provider.apiCall(messages),
          undefined, // No fallback function at this level
          options.timeout || 30000
        );
      });

      // Cache the result
      if (options.useCache !== false) {
        const cacheKey = performanceOptimizer.generateCacheKey(providerName, model, messages);
        performanceOptimizer.setCache(cacheKey, result);
      }

      // Reset circuit breaker on success
      this.resetCircuitBreaker(providerName);
      
      return result;
    } catch (error) {
      // Record failure in circuit breaker
      this.recordFailure(providerName);
      throw error;
    }
  }

  private isCircuitBreakerClosed(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return true;

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        // Check if recovery timeout has passed
        if (now - breaker.lastFailureTime > this.recoveryTimeout) {
          breaker.state = 'half-open';
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return true;
    }
  }

  private recordFailure(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.failureThreshold) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for provider ${providerName}`);
    }
  }

  private resetCircuitBreaker(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  // Batch processing for multiple requests
  public async batchRequests(
    requests: Array<{
      providerName: string;
      model: string;
      messages: any[];
      options?: any;
    }>
  ): Promise<any[]> {
    // Group by provider and model for optimal batching
    const groups = new Map<string, typeof requests>();
    
    requests.forEach(req => {
      const key = `${req.providerName}:${req.model}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(req);
    });

    // Process each group concurrently
    const groupPromises = Array.from(groups.entries()).map(async ([key, groupRequests]) => {
      const [providerName, model] = key.split(':');
      
      return Promise.all(groupRequests.map(req => 
        this.makeRequest(req.providerName, req.model, req.messages, req.options)
      ));
    });

    const groupResults = await Promise.all(groupPromises);
    
    // Flatten results back to original order
    const results: any[] = [];
    let groupIndex = 0;
    let itemIndex = 0;
    
    requests.forEach((_, index) => {
      const currentGroup = groupResults[groupIndex];
      if (currentGroup && itemIndex >= currentGroup.length) {
        groupIndex++;
        itemIndex = 0;
      }
      const nextGroup = groupResults[groupIndex];
      if (nextGroup) {
        results[index] = nextGroup[itemIndex];
        itemIndex++;
      }
    });

    return results;
  }

  // Performance monitoring
  public getPerformanceMetrics() {
    return {
      optimizer: performanceOptimizer.getMetrics(),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      providers: Array.from(this.providers.keys())
    };
  }

  // Memory optimization
  public optimizeMemory(): void {
    performanceOptimizer.optimizeMemory();
  }

  // Preload common requests
  public async preloadCommonRequests(): Promise<void> {
    const commonRequests = [
      {
        key: 'market-sentiment-template',
        loader: async () => {
          // This would be a common market sentiment analysis template
          return { template: 'market-sentiment', cached: true };
        },
        priority: 10
      },
      {
        key: 'risk-assessment-template',
        loader: async () => {
          // Common risk assessment template
          return { template: 'risk-assessment', cached: true };
        },
        priority: 9
      }
    ];

    await performanceOptimizer.preloadCache(commonRequests);
  }

  // Cleanup
  public cleanup(): void {
    performanceOptimizer.cleanup();
    if (this.healthMonitor) {
      this.healthMonitor.stop();
    }
  }
}

// Retry mechanism with exponential backoff
class RetryMechanism {
  public static async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const finalDelay = delay + jitter;
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(finalDelay)}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }
    
    throw lastError!;
  }
}

// Rate limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  public async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requestTimes = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= limit) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    validRequests.push(now);
    return true;
  }
  
  public async waitForRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<void> {
    while (!(await this.checkLimit(key, limit, windowMs))) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export { 
  PerformanceEnhancedLLMClient, 
  RetryMechanism, 
  RateLimiter,
  LLMProvider,
  CircuitBreakerState
};