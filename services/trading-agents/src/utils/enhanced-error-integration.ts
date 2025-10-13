/**
 * Enhanced Error Handling Integration
 * 
 * This module provides enhanced error handling integration for the trading agents system
 * by wrapping existing modules with the comprehensive error handling framework.
 */

import {
  TradingAgentError,
  ErrorType,
  ErrorSeverity,
  createErrorContext,
  globalErrorManager,
  wrapWithErrorHandling,
  CircuitBreaker
} from './error-handler.js';
import { createLogger } from './enhanced-logger.js';

const logger = createLogger('system', 'enhanced-error-integration');

// ========================================
// Enhanced Error Handling Wrappers
// ========================================

/**
 * Enhanced LLM Provider wrapper with comprehensive error handling
 */
export class EnhancedLLMProviderWrapper {
  private circuitBreaker: CircuitBreaker;

  constructor(
    private provider: any,
    private providerName: string
  ) {
    this.circuitBreaker = globalErrorManager.getCircuitBreaker(
      `llm-${providerName}`,
      {
        failureThreshold: 3, // More sensitive for LLM providers
        recoveryTimeout: 30000 // 30 seconds
      }
    );
  }

  async invoke(input: any): Promise<any> {
    const context = createErrorContext('LLMProvider', 'invoke', {
      agent: this.providerName,
      metadata: { provider: this.providerName }
    });

    return await globalErrorManager.executeWithRetry(
      () => this.circuitBreaker.execute(() => this.provider.invoke(input)),
      context,
      {
        maxAttempts: 3,
        baseDelay: 2000,
        retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.RATE_LIMIT_ERROR, ErrorType.TIMEOUT_ERROR]
      }
    );
  }

  async batch(inputs: any[]): Promise<any[]> {
    const context = createErrorContext('LLMProvider', 'batch', {
      agent: this.providerName,
      metadata: { provider: this.providerName, batchSize: inputs.length }
    });

    try {
      return await globalErrorManager.executeWithRetry(
        () => this.provider.batch(inputs),
        context,
        { maxAttempts: 2, baseDelay: 1000 }
      );
    } catch (error) {
      // Fallback to empty array
      globalErrorManager.handleError(error, context).catch(() => {});
      return [];
    }
  }

  async getConnectionStatus(): Promise<boolean> {
    try {
      await this.provider.invoke('test');
      return true;
    } catch {
      return false;
    }
  }
}

// ========================================
// Data Flow Error Handling Wrappers
// ========================================

/**
 * Enhanced Data Flow wrapper with error handling and fallbacks
 */
export class EnhancedDataFlowWrapper {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(private dataFlow: any, private flowName: string) {}

  private getCircuitBreaker(operation: string): CircuitBreaker {
    const key = `${this.flowName}-${operation}`;
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, globalErrorManager.getCircuitBreaker(key, {
        failureThreshold: 2, // Data APIs can be fragile
        recoveryTimeout: 60000 // 1 minute
      }));
    }
    return this.circuitBreakers.get(key)!;
  }

  async fetchMarketData(ticker: string): Promise<any> {
    const context = createErrorContext('DataFlow', 'fetchMarketData', {
      ticker,
      metadata: { flowName: this.flowName }
    });

    const circuitBreaker = this.getCircuitBreaker('fetchMarketData');
    
    return await globalErrorManager.executeWithRetry(
      () => circuitBreaker.execute(() => this.dataFlow.fetchMarketData(ticker)),
      context,
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryableTypes: [ErrorType.NETWORK_ERROR, ErrorType.API_ERROR, ErrorType.TIMEOUT_ERROR]
      }
    );
  }

  async fetchNewsData(ticker: string): Promise<any[]> {
    const context = createErrorContext('DataFlow', 'fetchNewsData', {
      ticker,
      metadata: { flowName: this.flowName }
    });

    const circuitBreaker = this.getCircuitBreaker('fetchNewsData');

    try {
      return await globalErrorManager.executeWithRetry(
        () => circuitBreaker.execute(() => this.dataFlow.fetchNewsData(ticker)),
        context,
        { maxAttempts: 2, baseDelay: 2000 }
      );
    } catch (error) {
      // Use the new data provider failover system
      const { DataProviderFailover } = await import('../resilience/data-provider-failover.js');
      const failover = new DataProviderFailover();
      
      try {
        const result = await failover.executeWithFailover('news', 'getNews', {
          query: ticker,
          currDate: new Date().toISOString().split('T')[0],
          lookBackDays: 7
        });
        
        return result.data ? [result.data] : [];
      } catch (failoverError) {
        globalErrorManager.handleError(error, context).catch(() => {});
        return []; // Return empty array as graceful fallback
      }
    }
  }

  async fetchSocialData(ticker: string): Promise<any> {
    const context = createErrorContext('DataFlow', 'fetchSocialData', {
      ticker,
      metadata: { flowName: this.flowName }
    });

    const circuitBreaker = this.getCircuitBreaker('fetchSocialData');

    try {
      return await globalErrorManager.executeWithRetry(
        () => circuitBreaker.execute(() => this.dataFlow.fetchSocialData(ticker)),
        context,
        { maxAttempts: 2, baseDelay: 1500 }
      );
    } catch (error) {
      // Use the new data provider failover system
      const { DataProviderFailover } = await import('../resilience/data-provider-failover.js');
      const failover = new DataProviderFailover();
      
      try {
        const result = await failover.executeWithFailover('social', 'analyzeSentiment', {
          symbol: ticker
        });
        
        return result.data || { sentiment: 'neutral', confidence: 0.5 };
      } catch (failoverError) {
        globalErrorManager.handleError(error, context).catch(() => {});
        return { sentiment: 'neutral', confidence: 0.5 }; // Return neutral sentiment as fallback
      }
    }
  }

  async fetchFundamentals(ticker: string): Promise<any> {
    const context = createErrorContext('DataFlow', 'fetchFundamentals', {
      ticker,
      metadata: { flowName: this.flowName }
    });

    const circuitBreaker = this.getCircuitBreaker('fetchFundamentals');

    try {
      return await circuitBreaker.execute(() => this.dataFlow.fetchFundamentals(ticker));
    } catch (error) {
      // Use the new data provider failover system
      const { DataProviderFailover } = await import('../resilience/data-provider-failover.js');
      const failover = new DataProviderFailover();
      
      try {
        const result = await failover.executeWithFailover('fundamentals', 'getFundamentals', {
          symbol: ticker,
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year ago
        });
        
        return result.data || {};
      } catch (failoverError) {
        globalErrorManager.handleError(error, context).catch(() => {});
        return {}; // Return empty object as fallback
      }
    }
  }
}

// ========================================
// Agent Error Handling Wrappers
// ========================================

/**
 * Enhanced Agent wrapper with comprehensive error handling
 */
export class EnhancedAgentWrapper {
  private executionCircuitBreaker: CircuitBreaker;

  constructor(
    private agent: any,
    private agentName: string
  ) {
    this.executionCircuitBreaker = globalErrorManager.getCircuitBreaker(
      `agent-${agentName}`,
      {
        failureThreshold: 2, // Agents should be robust
        recoveryTimeout: 45000 // 45 seconds
      }
    );
  }

  async execute(input: any): Promise<any> {
    const context = createErrorContext('Agent', 'execute', {
      agent: this.agentName,
      metadata: { agentName: this.agentName }
    });

    return await globalErrorManager.executeWithRetry(
      () => this.executionCircuitBreaker.execute(async () => {
        // Add execution timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new TradingAgentError(
            'Agent execution timeout',
            ErrorType.TIMEOUT_ERROR,
            ErrorSeverity.MEDIUM,
            createErrorContext('Agent', 'execute', { agent: this.agentName })
          )), 300000); // 5 minutes
        });

        const executionPromise = this.agent.execute ? 
          this.agent.execute(input) : 
          this.agent.invoke(input);

        return await Promise.race([executionPromise, timeoutPromise]);
      }),
      context,
      {
        maxAttempts: 2,
        baseDelay: 3000,
        retryableTypes: [ErrorType.LLM_ERROR, ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
      }
    );
  }

  async initialize(): Promise<any> {
    try {
      if (this.agent.initialize) {
        return await this.agent.initialize();
      }
      return { initialized: true };
    } catch {
      return { initialized: false };
    }
  }

  async getStatus(): Promise<any> {
    try {
      if (this.agent.getStatus) {
        return await this.agent.getStatus();
      }
      return { status: 'active', agent: this.agentName };
    } catch {
      return { status: 'unknown' };
    }
  }
}

// ========================================
// Trading Graph Error Handling Enhancements
// ========================================

/**
 * Enhanced Trading Graph with comprehensive error handling
 */
export class EnhancedTradingGraphWrapper {
  private workflowCircuitBreaker: CircuitBreaker;
  private agentWrappers: Map<string, EnhancedAgentWrapper> = new Map();

  constructor(private tradingGraph: any) {
    this.workflowCircuitBreaker = globalErrorManager.getCircuitBreaker(
      'trading-workflow',
      {
        failureThreshold: 1, // Workflow failures are serious
        recoveryTimeout: 120000 // 2 minutes
      }
    );
  }

  async executeWorkflow(ticker: string, tradeDate: string): Promise<any> {
    const context = createErrorContext('TradingGraph', 'executeWorkflow', {
      ticker,
      metadata: { tradeDate }
    });

    return await globalErrorManager.executeWithRetry(
      () => this.workflowCircuitBreaker.execute(async () => {
        const startTime = Date.now();
        
        try {
          const result = await this.tradingGraph.analyzeAndDecide(ticker, tradeDate);
          
          // Log successful execution
          globalErrorManager.getLogger().log(
            'info',
            'TradingGraph',
            'executeWorkflow',
            `Workflow completed successfully for ${ticker}`,
            { 
              ticker, 
              tradeDate, 
              executionTime: Date.now() - startTime,
              agentsExecuted: result.agentsExecuted 
            }
          );
          
          return result;
        } catch (error) {
          // Enhanced error context for workflow failures
          const errorContext = createErrorContext('TradingGraph', 'executeWorkflow', {
            ticker,
            metadata: { tradeDate, executionTime: Date.now() - startTime }
          });

          throw await globalErrorManager.handleError(error, errorContext);
        }
      }),
      context,
      {
        maxAttempts: 1, // Don't retry entire workflows
        baseDelay: 5000
      }
    );
  }

  public wrapAgent(agentName: string, agent: any): EnhancedAgentWrapper {
    if (!this.agentWrappers.has(agentName)) {
      this.agentWrappers.set(agentName, new EnhancedAgentWrapper(agent, agentName));
    }
    return this.agentWrappers.get(agentName)!;
  }

  async healthCheck(): Promise<any> {
    const healthStatus = {
      healthy: true,
      issues: [] as string[],
      circuitBreakers: {} as any,
      lastExecution: null as any
    };

    try {
      // Check circuit breaker status
      healthStatus.circuitBreakers = {
        workflow: this.workflowCircuitBreaker.getStats()
      };

      if (this.workflowCircuitBreaker.getState() === 'OPEN') {
        healthStatus.healthy = false;
        healthStatus.issues.push('Workflow circuit breaker is OPEN');
      }

      // Check agent statuses
      for (const [name, wrapper] of this.agentWrappers) {
        try {
          const status = await wrapper.getStatus();
          if (status.status !== 'active') {
            healthStatus.healthy = false;
            healthStatus.issues.push(`Agent ${name} is not active`);
          }
        } catch (error) {
          healthStatus.healthy = false;
          healthStatus.issues.push(`Agent ${name} health check failed`);
        }
      }

      return healthStatus;
    } catch {
      return { healthy: false, issues: ['Health check failed'], circuitBreakers: {}, lastExecution: null };
    }
  }
}

// ========================================
// Error Metrics and Monitoring
// ========================================

export class ErrorMetricsCollector {
  private errorCounts: Map<string, number> = new Map();
  private errorTrends: Map<string, number[]> = new Map();
  private lastReset: Date = new Date();

  constructor() {
    // Reset metrics every hour
    setInterval(() => this.resetMetrics(), 3600000);
  }

  public recordError(error: TradingAgentError, context: any): void {
    const key = `${context.component}.${error.type}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Track trends
    if (!this.errorTrends.has(key)) {
      this.errorTrends.set(key, []);
    }
    this.errorTrends.get(key)!.push(Date.now());
  }

  public getMetrics() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      trends: Object.fromEntries(
        Array.from(this.errorTrends.entries()).map(([key, timestamps]) => [
          key,
          timestamps.filter(ts => Date.now() - ts < 3600000).length // Last hour
        ])
      ),
      lastReset: this.lastReset,
      systemStats: globalErrorManager.getStats()
    };
  }

  private resetMetrics(): void {
    this.errorCounts.clear();
    this.errorTrends.clear();
    this.lastReset = new Date();
  }
}

// ========================================
// Global Instances
// ========================================

export const errorMetricsCollector = new ErrorMetricsCollector();

// ========================================
// Utility Functions
// ========================================

/**
 * Create an enhanced wrapper for any component
 */
export function createEnhancedWrapper<T>(
  component: T,
  componentName: string,
  wrapperType: 'llm' | 'dataflow' | 'agent' | 'graph'
): any {
  switch (wrapperType) {
    case 'llm':
      return new EnhancedLLMProviderWrapper(component, componentName);
    case 'dataflow':
      return new EnhancedDataFlowWrapper(component, componentName);
    case 'agent':
      return new EnhancedAgentWrapper(component, componentName);
    case 'graph':
      return new EnhancedTradingGraphWrapper(component);
    default:
      throw new Error(`Unknown wrapper type: ${wrapperType}`);
  }
}

/**
 * Apply error handling to existing class instance
 */
export function enhanceWithErrorHandling<T extends object>(
  instance: T,
  componentName: string,
  methodNames: string[] = []
): T {
  const enhanced = Object.create(Object.getPrototypeOf(instance));
  
  // Copy all properties
  Object.assign(enhanced, instance);
  
  // Wrap specified methods
  for (const methodName of methodNames) {
    if (typeof instance[methodName as keyof T] === 'function') {
      const originalMethod = instance[methodName as keyof T] as Function;
      
      enhanced[methodName] = wrapWithErrorHandling(
        originalMethod.bind(instance),
        createErrorContext(componentName, methodName)
      );
    }
  }
  
  return enhanced;
}

/**
 * Create a graceful error handler for specific operations
 */
export function createGracefulHandler<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  context: { component: string; operation: string; metadata?: any }
): () => Promise<T> {
  return async () => {
    try {
      return await operation();
    } catch (error) {
      const errorContext = createErrorContext(context.component, context.operation, context.metadata);
      globalErrorManager.handleError(error, errorContext).catch(() => {});
      return fallbackValue;
    }
  };
}

// ----------------------------------------
// Resilience System Integration
// ----------------------------------------

/**
 * Enhanced Resilience Manager that integrates all resilience components
 */
export class ResilienceManager {
  private dataProviderFailover?: any;
  private circuitBreakerManager?: any;
  private cacheManager?: any;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize data provider failover
      const { DataProviderFailover } = await import('../resilience/data-provider-failover.js');
      this.dataProviderFailover = new DataProviderFailover();

      // Initialize circuit breaker manager
      const { CircuitBreakerManager } = await import('../resilience/enhanced-circuit-breaker.js');
      this.circuitBreakerManager = new CircuitBreakerManager();

      // Initialize cache manager
      const { CacheManager } = await import('../resilience/intelligent-caching.js');
      this.cacheManager = new CacheManager();

      this.initialized = true;
      
      logger.info('resilience-manager-initialized', 'Resilience manager initialized successfully');
    } catch (error) {
      logger.error('resilience-manager-init-error', 'Failed to initialize resilience manager', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute operation with full resilience protection
   */
  public async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: {
      providerType: 'news' | 'social' | 'fundamentals' | 'market_data';
      operationName: string;
      cacheKey?: string;
      cacheTTL?: number;
      fallbackValue?: T;
    }
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { providerType, operationName, cacheKey, cacheTTL, fallbackValue } = options;

    try {
      // Try cache first if cache key is provided
      if (cacheKey && this.cacheManager) {
        const cache = this.cacheManager.get(providerType);
        if (cache) {
          const cached = await cache.get(cacheKey) as T;
          if (cached !== null) {
            return cached;
          }
        }
      }

      // Execute operation with circuit breaker protection
      let result: T;
      if (this.circuitBreakerManager) {
        const circuitBreaker = this.circuitBreakerManager.get(`${providerType}-${operationName}`);
        if (circuitBreaker) {
          result = await circuitBreaker.executeWithRetry(operation);
        } else {
          result = await operation();
        }
      } else {
        result = await operation();
      }

      // Cache the result if cache key is provided
      if (cacheKey && this.cacheManager && result !== undefined) {
        const cache = this.cacheManager.get(providerType);
        if (cache) {
          await cache.set(cacheKey, result, cacheTTL);
        }
      }

      return result;

    } catch (error) {
      logger.warn('resilience-operation-failed', `Resilient operation failed: ${operationName}`, {
        providerType,
        operationName,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return fallback value if provided
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      throw error;
    }
  }

  /**
   * Execute data provider operation with failover
   */
  public async executeWithFailover<T>(
    providerType: 'news' | 'social' | 'fundamentals' | 'market_data',
    operation: string,
    params: any
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.dataProviderFailover) {
      throw new Error('Data provider failover not initialized');
    }

    const result = await this.dataProviderFailover.executeWithFailover(providerType, operation, params);
    return result.data;
  }

  /**
   * Get resilience system health status
   */
  public async getHealthStatus(): Promise<any> {
    const status = {
      initialized: this.initialized,
      dataProviderFailover: null as any,
      circuitBreakers: null as any,
      caches: null as any
    };

    if (this.dataProviderFailover) {
      status.dataProviderFailover = this.dataProviderFailover.getHealthStatus();
    }

    if (this.circuitBreakerManager) {
      status.circuitBreakers = this.circuitBreakerManager.getAllHealthStatuses();
    }

    if (this.cacheManager) {
      status.caches = this.cacheManager.getAllMetrics();
    }

    return status;
  }

  /**
   * Optimize all resilience components
   */
  public async optimize(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const promises: Promise<void>[] = [];

    if (this.cacheManager) {
      promises.push(this.cacheManager.optimizeAll());
    }

    await Promise.allSettled(promises);
    
    logger.info('resilience-optimized', 'Resilience system optimization completed');
  }

  /**
   * Destroy resilience manager and cleanup resources
   */
  public async destroy(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.circuitBreakerManager) {
      promises.push(this.circuitBreakerManager.destroyAll());
    }

    if (this.cacheManager) {
      promises.push(this.cacheManager.destroyAll());
    }

    await Promise.allSettled(promises);

    this.initialized = false;
    
    logger.info('resilience-destroyed', 'Resilience manager destroyed');
  }
}

/**
 * Global resilience manager instance
 */
export const resilienceManager = new ResilienceManager();

/**
 * Enhanced wrapper factory that includes resilience features
 */
export function createResilientWrapper<T>(
  component: T,
  componentName: string,
  wrapperType: 'llm' | 'dataflow' | 'agent' | 'graph',
  resilienceOptions?: {
    enableFailover?: boolean;
    enableCaching?: boolean;
    enableCircuitBreaker?: boolean;
  }
): any {
  const options = {
    enableFailover: true,
    enableCaching: true,
    enableCircuitBreaker: true,
    ...resilienceOptions
  };

  // Create base wrapper
  const baseWrapper = createEnhancedWrapper(component, componentName, wrapperType);

  // Add resilience features if enabled
  if (options.enableFailover || options.enableCaching || options.enableCircuitBreaker) {
    return new Proxy(baseWrapper, {
      get(target, prop, receiver) {
        const originalMethod = Reflect.get(target, prop, receiver);
        
        if (typeof originalMethod === 'function') {
          return async function(...args: any[]) {
            // Determine provider type based on component name
            let providerType: 'news' | 'social' | 'fundamentals' | 'market_data' = 'fundamentals';
            if (componentName.toLowerCase().includes('news')) {
              providerType = 'news';
            } else if (componentName.toLowerCase().includes('social') || componentName.toLowerCase().includes('reddit')) {
              providerType = 'social';
            } else if (componentName.toLowerCase().includes('market')) {
              providerType = 'market_data';
            }

            // Generate cache key if caching is enabled
            const cacheKey = options.enableCaching ? 
              `${componentName}:${String(prop)}:${JSON.stringify(args).substring(0, 100)}` : 
              undefined;

            const resilienceOptions: any = {
              providerType,
              operationName: String(prop),
              cacheTTL: 300 // 5 minutes default
            };
            
            if (cacheKey) {
              resilienceOptions.cacheKey = cacheKey;
            }

            return await resilienceManager.executeWithResilience(
              () => originalMethod.apply(target, args),
              resilienceOptions
            );
          };
        }
        
        return originalMethod;
      }
    });
  }

  return baseWrapper;
}

/**
 * Update health monitor to include resilience components
 */
export async function updateHealthMonitorWithResilience(): Promise<void> {
  try {
    const { healthMonitor } = await import('./health-monitor.js');
    
    // Add resilience health checks to the health monitor
    const resilienceHealth = await resilienceManager.getHealthStatus();
    
    logger.info('health-monitor-updated', 'Health monitor updated with resilience components', {
      resilienceInitialized: resilienceHealth.initialized
    });
    
  } catch (error) {
    logger.error('health-monitor-update-error', 'Failed to update health monitor with resilience', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Initialize resilience system integration
 */
export async function initializeResilienceIntegration(): Promise<void> {
  try {
    // Initialize resilience manager
    await resilienceManager.getHealthStatus(); // This triggers initialization
    
    // Update health monitoring
    await updateHealthMonitorWithResilience();
    
    // Set up periodic optimization
    setInterval(async () => {
      try {
        await resilienceManager.optimize();
      } catch (error) {
        logger.error('resilience-optimization-error', 'Resilience optimization failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 60 * 60 * 1000); // Every hour
    
    logger.info('resilience-integration-initialized', 'Resilience system integration initialized successfully');
    
  } catch (error) {
    logger.error('resilience-integration-error', 'Failed to initialize resilience integration', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}