/**
 * Enhanced Trading Graph with Error Handling Integration
 * 
 * This module provides an enhanced version of the trading graph that integrates
 * the comprehensive error handling system throughout the workflow execution.
 */

import { TradingAgentsGraph } from '../graph/trading-graph.js';
import {
  TradingAgentError,
  ErrorType,
  ErrorSeverity,
  createErrorContext,
  globalErrorManager
} from './error-handler.js';
import {
  EnhancedAgentWrapper,
  EnhancedDataFlowWrapper,
  EnhancedLLMProviderWrapper,
  createGracefulHandler
} from './enhanced-error-integration.js';

/**
 * Enhanced Trading Graph with comprehensive error handling integration
 */
export class EnhancedTradingGraph extends TradingAgentsGraph {
  private agentWrappers: Map<string, EnhancedAgentWrapper> = new Map();
  private dataFlowWrappers: Map<string, EnhancedDataFlowWrapper> = new Map();
  private llmProviderWrappers: Map<string, EnhancedLLMProviderWrapper> = new Map();
  private executionMetrics: any = {};

  constructor(options: any = {}) {
    super(options);
    
    // Initialize error handling for the graph
    this.initializeErrorHandling();
  }

  private initializeErrorHandling(): void {
    // Register global error handlers for trading-specific scenarios
    globalErrorManager.getLogger().log(
      'info',
      'EnhancedTradingGraph',
      'initialize',
      'Initializing enhanced error handling for trading graph'
    );
  }

  /**
   * Enhanced workflow execution with comprehensive error handling
   */
  public async analyzeAndDecide(ticker: string, tradeDate: string): Promise<any> {
    const workflowCircuitBreaker = globalErrorManager.getCircuitBreaker(
      'enhanced-trading-workflow',
      {
        failureThreshold: 1,
        recoveryTimeout: 120000
      }
    );

    return await workflowCircuitBreaker.execute(async () => {
      const startTime = Date.now();
      let agentsExecuted: string[] = [];
      const partialResults: any = {};

      try {
        // Pre-execution health check
        await this.performHealthCheck();

        // Execute the workflow with enhanced error handling
        const result = await this.executeWorkflowWithErrorHandling(ticker, tradeDate);
        
        const executionTime = Date.now() - startTime;
        agentsExecuted = result.agentsExecuted || [];

        // Log successful execution
        globalErrorManager.getLogger().log(
          'info',
          'EnhancedTradingGraph',
          'analyzeAndDecide',
          `Enhanced workflow completed successfully for ${ticker}`,
          { 
            ticker, 
            tradeDate, 
            executionTime,
            agentsExecuted,
            totalAgents: agentsExecuted.length
          }
        );

        // Update metrics
        this.updateExecutionMetrics(ticker, tradeDate, executionTime, true);

        return {
          ...result,
          executionTime,
          enhanced: true,
          errorHandling: {
            circuitBreakerStats: workflowCircuitBreaker.getStats(),
            systemHealth: await this.getSystemHealth()
          }
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Update metrics for failed execution
        this.updateExecutionMetrics(ticker, tradeDate, executionTime, false);

        // Enhanced error handling with context
        const enhancedContext = createErrorContext('EnhancedTradingGraph', 'analyzeAndDecide', {
          ticker,
          metadata: { 
            tradeDate, 
            executionTime,
            agentsExecuted,
            partialResults: Object.keys(partialResults)
          }
        });

        // Attempt graceful degradation
        const degradedResult = await this.attemptGracefulDegradation(
          ticker,
          tradeDate,
          agentsExecuted,
          partialResults,
          error
        );

        if (degradedResult) {
          globalErrorManager.getLogger().log(
            'warn',
            'EnhancedTradingGraph',
            'analyzeAndDecide',
            `Workflow completed with graceful degradation for ${ticker}`,
            { ticker, tradeDate, degradedResult }
          );
          
          return {
            ...degradedResult,
            degraded: true,
            originalError: error instanceof Error ? error.message : String(error)
          };
        }

        throw await globalErrorManager.handleError(error, enhancedContext);
      }
    });
  }

  private async executeWorkflowWithErrorHandling(ticker: string, tradeDate: string): Promise<any> {
    // Execute with enhanced error handling - call parent method but with error handling
    const gracefulExecution = createGracefulHandler(
      () => super.propagate(ticker, tradeDate),
      { 
        finalState: {
          messages: [],
          company_of_interest: ticker,
          trade_date: tradeDate,
          final_trade_decision: 'HOLD - System Error'
        },
        processedSignal: 'HOLD',
        executionTime: 0,
        agentsExecuted: []
      },
      { 
        component: 'EnhancedTradingGraph', 
        operation: 'executeWorkflowWithErrorHandling',
        metadata: { ticker, tradeDate }
      }
    );

    return await gracefulExecution();
  }

  private async attemptGracefulDegradation(
    ticker: string,
    tradeDate: string,
    agentsExecuted: string[],
    partialResults: any,
    originalError: any
  ): Promise<any | null> {
    try {
      globalErrorManager.getLogger().log(
        'warn',
        'EnhancedTradingGraph',
        'attemptGracefulDegradation',
        `Attempting graceful degradation for ${ticker} after ${agentsExecuted.length} agents`,
        { ticker, tradeDate, agentsExecuted }
      );

      // If we have some results, try to generate a conservative decision
      if (agentsExecuted.length > 0) {
        return {
          finalState: {
            ...partialResults,
            final_trade_decision: 'HOLD - DEGRADED MODE',
            degradation_reason: 'Workflow execution incomplete due to errors'
          },
          processedSignal: 'HOLD',
          executionTime: Date.now(),
          agentsExecuted,
          degraded: true,
          degradationContext: {
            originalError: originalError instanceof Error ? originalError.message : String(originalError),
            completedAgents: agentsExecuted,
            partialData: Object.keys(partialResults)
          }
        };
      }

      // If no agents executed successfully, return null to indicate complete failure
      return null;

    } catch (degradationError) {
      globalErrorManager.getLogger().log(
        'error',
        'EnhancedTradingGraph',
        'attemptGracefulDegradation',
        'Graceful degradation failed',
        { ticker, tradeDate, degradationError }
      );
      return null;
    }
  }

  private getEnhancedDataFlow(): EnhancedDataFlowWrapper {
    const dataFlowKey = 'main-dataflow';
    if (!this.dataFlowWrappers.has(dataFlowKey)) {
      // Create enhanced data flow wrapper
      // Note: This would wrap the actual data flow instance
      const mockDataFlow = {
        fetchMarketData: async (ticker: string) => ({ ticker, price: 100, volume: 1000 }),
        fetchNewsData: async (_ticker: string) => [],
        fetchSocialData: async (_ticker: string) => ({}),
        fetchFundamentals: async (_ticker: string) => ({ pe: 15, eps: 5.2 })
      };
      
      this.dataFlowWrappers.set(dataFlowKey, new EnhancedDataFlowWrapper(mockDataFlow, dataFlowKey));
    }
    return this.dataFlowWrappers.get(dataFlowKey)!;
  }

  private async performHealthCheck(): Promise<void> {
    const healthContext = createErrorContext('EnhancedTradingGraph', 'healthCheck', {});
    
    try {
      // Check system health
      const systemHealth = await this.getSystemHealth();
      
      if (!systemHealth.healthy) {
        globalErrorManager.getLogger().log(
          'warn',
          'EnhancedTradingGraph',
          'healthCheck',
          'System health check detected issues',
          { healthIssues: systemHealth.issues }
        );
      }

      // Check if any critical circuit breakers are open
      const criticalBreakersOpen = systemHealth.circuitBreakers?.some(
        (cb: any) => cb.stats.state === 'OPEN' && cb.name.includes('critical')
      );

      if (criticalBreakersOpen) {
        throw new TradingAgentError(
          'Critical circuit breakers are open',
          ErrorType.SYSTEM_ERROR,
          ErrorSeverity.HIGH,
          healthContext
        );
      }

    } catch (error) {
      await globalErrorManager.handleError(error, healthContext);
      // Don't throw - let the workflow proceed with caution
    }
  }

  private async getSystemHealth(): Promise<any> {
    try {
      const stats = globalErrorManager.getStats();
      const errorStats = stats.errorStats || {};
      
      // Determine if system is healthy based on error rates
      const recentErrors = Object.values(errorStats)
        .filter((stat: any) => stat.timestamp && Date.now() - stat.timestamp < 300000) // Last 5 minutes
        .length;

      const healthy = recentErrors < 10; // Threshold for recent errors

      return {
        healthy,
        issues: healthy ? [] : [`High error rate: ${recentErrors} errors in last 5 minutes`],
        circuitBreakers: stats.circuitBreakers || [],
        errorStats,
        timestamp: new Date()
      };
    } catch {
      return {
        healthy: false,
        issues: ['Health check failed'],
        circuitBreakers: [],
        errorStats: {},
        timestamp: new Date()
      };
    }
  }

  private updateExecutionMetrics(ticker: string, tradeDate: string, executionTime: number, success: boolean): void {
    const key = `${ticker}-${tradeDate}`;
    this.executionMetrics[key] = {
      ticker,
      tradeDate,
      executionTime,
      success,
      timestamp: new Date()
    };

    // Log metrics
    globalErrorManager.getLogger().log(
      success ? 'info' : 'error',
      'EnhancedTradingGraph',
      'updateExecutionMetrics',
      `Execution ${success ? 'completed' : 'failed'} for ${ticker}`,
      { ticker, tradeDate, executionTime, success }
    );
  }

  /**
   * Get enhanced execution metrics and system status
   */
  public getEnhancedMetrics(): any {
    return {
      executionMetrics: this.executionMetrics,
      errorMetrics: globalErrorManager.getStats(),
      systemHealth: this.getSystemHealth(),
      circuitBreakers: Array.from(globalErrorManager['circuitBreakers']?.entries() || [])
        .map(([name, breaker]) => ({
          name,
          stats: breaker.getStats()
        }))
    };
  }

  /**
   * Enhanced health check endpoint
   */
  public async healthCheck(): Promise<any> {
    try {
      const systemHealth = await this.getSystemHealth();
      const metrics = this.getEnhancedMetrics();
      
      return {
        status: systemHealth.healthy ? 'healthy' : 'degraded',
        timestamp: new Date(),
        ...systemHealth,
        metrics: {
          totalExecutions: Object.keys(this.executionMetrics).length,
          successfulExecutions: Object.values(this.executionMetrics)
            .filter((metric: any) => metric.success).length,
          averageExecutionTime: this.calculateAverageExecutionTime(),
          errorRate: this.calculateErrorRate()
        },
        circuitBreakers: metrics.circuitBreakers
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        healthy: false
      };
    }
  }

  private calculateAverageExecutionTime(): number {
    const executions = Object.values(this.executionMetrics) as any[];
    if (executions.length === 0) return 0;
    
    const totalTime = executions.reduce((sum, exec) => sum + exec.executionTime, 0);
    return totalTime / executions.length;
  }

  private calculateErrorRate(): number {
    const executions = Object.values(this.executionMetrics) as any[];
    if (executions.length === 0) return 0;
    
    const failures = executions.filter(exec => !exec.success).length;
    return failures / executions.length;
  }

  /**
   * Reset error handling state (useful for testing)
   */
  public resetErrorHandlingState(): void {
    this.executionMetrics = {};
    globalErrorManager.getLogger().log(
      'info',
      'EnhancedTradingGraph',
      'resetErrorHandlingState',
      'Error handling state reset'
    );
  }
}