/**
 * Enhanced Trading Graph with Error Handling Integration
 * 
 * This module provides an enhanced version of the trading graph that integrates
 * the comprehensive error handling system throughout the workflow execution.
 * 
 * TODO: Add real-time data streaming capabilities
 * TODO: Implement distributed graph execution across multiple nodes
 * TODO: Add advanced caching strategies for high-frequency data
 * TODO: Integrate machine learning-based prediction models
 * TODO: Add comprehensive monitoring and alerting system
 */

import { TradingAgentsGraph } from '../graph/trading-graph';
import { YahooFinanceAPI } from '../dataflows/yahoo-finance';
import { GoogleNewsAPI } from '../dataflows/google-news';
import { RedditAPI } from '../dataflows/reddit';
import { TechnicalIndicatorsAPI } from '../dataflows/technical-indicators';
import { TradingAgentsConfig } from '../types/config';
import {
  TradingAgentError,
  ErrorType,
  ErrorSeverity,
  createErrorContext,
  globalErrorManager
} from './error-handler';
import {
  EnhancedAgentWrapper,
  EnhancedDataFlowWrapper,
  EnhancedLLMProviderWrapper,
  createGracefulHandler
} from './enhanced-error-integration';

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
      // Create enhanced data flow wrapper with real data providers
      // TODO: Add connection pooling for high-frequency requests
      // TODO: Implement circuit breaker pattern for API resilience
      // TODO: Add data quality validation and cleansing
      // TODO: Implement real-time data streaming
      const realDataFlow = {
        fetchMarketData: async (ticker: string) => {
          try {
            // Create a basic config for API calls - in production, get from dependency injection
            const apiConfig: TradingAgentsConfig = {
              projectDir: './data',
              resultsDir: './results',
              dataDir: './data',
              dataCacheDir: './cache',
              exportsDir: './exports',
              logsDir: './logs',
              llmProvider: 'openai',
              deepThinkLlm: 'gpt-4',
              quickThinkLlm: 'gpt-3.5-turbo',
              backendUrl: 'http://localhost:8000',
              maxDebateRounds: 3,
              maxRiskDiscussRounds: 2,
              maxRecurLimit: 5,
              onlineTools: true
            };
            
            const yahooAPI = new YahooFinanceAPI(apiConfig);
            const currentDate = new Date().toISOString().split('T')[0] as string;
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string;
            
            // Fetch real historical data using the correct method signature
            const historicalData = await yahooAPI.getData(ticker, thirtyDaysAgo, currentDate, true);
            
            // Parse the data to extract latest values
            const lines = historicalData.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));
            const latestLine = lines[lines.length - 1];
            
            if (latestLine) {
              const [date, open, high, low, close, volume] = latestLine.split(',');
              return {
                ticker,
                price: close ? parseFloat(close) : 100,
                volume: volume ? parseInt(volume) : 1000000,
                data: historicalData,
                source: 'yahoo-finance-real',
                timestamp: new Date().toISOString()
              };
            }
            
            // TODO: Implement proper error handling with data provider failover
            throw new Error(`Market data not available for ${ticker}. Unable to parse API response - need to implement data validation and backup providers.`);
          } catch (error) {
            // Use proper error logging instead of console.error
            await globalErrorManager.handleError(
              error,
              createErrorContext('enhanced-trading-graph', 'fetchMarketData', { ticker })
            );
            
            // TODO: Implement comprehensive error handling with provider failover
            throw new Error(`Market data fetch failed for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}. Need to implement backup data providers.`);
          }
        },
        fetchNewsData: async (ticker: string) => {
          try {
            // Create a basic config for API calls
            const apiConfig: TradingAgentsConfig = {
              projectDir: './data',
              resultsDir: './results',
              dataDir: './data',
              dataCacheDir: './cache',
              exportsDir: './exports',
              logsDir: './logs',
              llmProvider: 'openai',
              deepThinkLlm: 'gpt-4',
              quickThinkLlm: 'gpt-3.5-turbo',
              backendUrl: 'http://localhost:8000',
              maxDebateRounds: 3,
              maxRiskDiscussRounds: 2,
              maxRecurLimit: 5,
              onlineTools: true
            };
            
            const newsAPI = new GoogleNewsAPI(apiConfig);
            const currentDate = new Date().toISOString().split('T')[0] as string;
            const lookBackDays = 7;
            
            // Fetch real news data using the correct method signature
            const newsData = await newsAPI.getNews(ticker, currentDate, lookBackDays);
            
            // Parse news data to extract articles
            const lines = newsData.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));
            const articles = lines.slice(0, 5).map((line: string) => {
              const parts = line.split(' - ');
              return {
                title: parts[0] || `News about ${ticker}`,
                source: parts[1] || 'News API',
                timestamp: new Date().toISOString()
              };
            });
            
            return { 
              ticker, 
              news: articles.length > 0 ? articles : [
                { title: `Market Analysis: ${ticker} Performance`, source: 'Financial Data Provider' }
              ], 
              source: 'newsapi-real',
              raw_data: newsData
            };
          } catch (error) {
            // Use proper error logging
            await globalErrorManager.handleError(
              error,
              createErrorContext('enhanced-trading-graph', 'fetchNewsData', { ticker })
            );
            
            // TODO: Implement news provider failover and caching system
            throw new Error(`News data fetch failed for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}. Need to implement backup news providers and caching.`);
          }
        },
        fetchSocialData: async (ticker: string) => {
          try {
            // Create a basic config for API calls
            const apiConfig: TradingAgentsConfig = {
              projectDir: './data',
              resultsDir: './results',
              dataDir: './data',
              dataCacheDir: './cache',
              exportsDir: './exports',
              logsDir: './logs',
              llmProvider: 'openai',
              deepThinkLlm: 'gpt-4',
              quickThinkLlm: 'gpt-3.5-turbo',
              backendUrl: 'http://localhost:8000',
              maxDebateRounds: 3,
              maxRiskDiscussRounds: 2,
              maxRecurLimit: 5,
              onlineTools: true
            };

            const redditAPI = new RedditAPI(apiConfig);
            const currentDate = new Date().toISOString().split('T')[0] as string;
            const lookBackDays = 7;

            // Fetch real Reddit data using the correct method signature
            const redditData = await redditAPI.getCompanyNews(ticker, currentDate, lookBackDays, 10);

            // Parse Reddit data to extract sentiment and mentions
            const lines = redditData.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));
            const posts: any[] = [];
            let totalScore = 0;
            let totalComments = 0;

            // Parse the Reddit news format
            for (const line of lines.slice(0, 10)) {
              if (line.includes('### ')) {
                const titleMatch = line.match(/### (.+?) \(/);
                const subredditMatch = line.match(/r\/([^,]+)/);
                const scoreMatch = line.match(/Score: (\d+)/);
                const commentsMatch = line.match(/Comments: (\d+)/);

                if (titleMatch) {
                  const post = {
                    title: titleMatch[1],
                    subreddit: subredditMatch ? subredditMatch[1] : 'investing',
                    score: scoreMatch ? parseInt(scoreMatch[1] || '0') : 0,
                    comments: commentsMatch ? parseInt(commentsMatch[1] || '0') : 0,
                    timestamp: new Date().toISOString()
                  };
                  posts.push(post);
                  totalScore += post.score;
                  totalComments += post.comments;
                }
              }
            }

            const totalPosts = posts.length;
            const avgScore = totalPosts > 0 ? totalScore / totalPosts : 0;

            // Simple sentiment analysis based on score distribution
            let sentiment = 'neutral';
            if (avgScore > 50) sentiment = 'bullish';
            else if (avgScore < -10) sentiment = 'bearish';

            return {
              ticker,
              sentiment,
              mentions: totalPosts,
              total_comments: totalComments,
              average_score: avgScore,
              posts: posts.length > 0 ? posts : [
                {
                  title: `Community Discussion: ${ticker} Analysis`,
                  subreddit: 'r/investing',
                  score: 15,
                  comments: 8
                }
              ],
              source: 'reddit-real',
              raw_data: redditData,
              sentiment_score: avgScore > 0 ? Math.min(avgScore / 100, 1) : Math.max(avgScore / 100, -1)
            };
          } catch (error) {
            // Use proper error logging without mock data fallback
            await globalErrorManager.handleError(
              error,
              createErrorContext('enhanced-trading-graph', 'fetchSocialData', { ticker })
            );

            // Log the failure and throw error instead of returning mock data
            globalErrorManager.getLogger().log(
              'error',
              'EnhancedTradingGraph',
              'fetchSocialData',
              `Reddit API failed for ${ticker} - no fallback data available`,
              { ticker, error: error instanceof Error ? error.message : String(error) }
            );

            // Throw error to indicate data unavailability rather than returning mock data
            throw new TradingAgentError(
              `Social sentiment data unavailable for ${ticker}`,
              ErrorType.MISSING_DATA,
              ErrorSeverity.MEDIUM,
              createErrorContext('enhanced-trading-graph', 'fetchSocialData', { ticker })
            );
          }
        },
        fetchFundamentals: async (ticker: string) => {
          try {
            // Import SimFin API dynamically to avoid circular dependencies
            const { SimFinAPI } = await import('../dataflows/simfin');

            // Create a basic config for API calls
            const apiConfig: TradingAgentsConfig = {
              projectDir: './data',
              resultsDir: './results',
              dataDir: './data',
              dataCacheDir: './cache',
              exportsDir: './exports',
              logsDir: './logs',
              llmProvider: 'openai',
              deepThinkLlm: 'gpt-4',
              quickThinkLlm: 'gpt-3.5-turbo',
              backendUrl: 'http://localhost:8000',
              maxDebateRounds: 3,
              maxRiskDiscussRounds: 2,
              maxRecurLimit: 5,
              onlineTools: true
            };

            const simfinAPI = new SimFinAPI(apiConfig);
            const currentDate = new Date().toISOString().split('T')[0] as string;

            // Fetch real financial statements
            const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
              simfinAPI.getBalanceSheet(ticker, 'annual', currentDate),
              simfinAPI.getIncomeStatement(ticker, 'annual', currentDate),
              simfinAPI.getCashflow(ticker, 'annual', currentDate)
            ]);

            // Parse and extract key financial metrics
            const fundamentals = await this.parseFundamentalsData(balanceSheet, incomeStatement, cashFlow, ticker);

            return {
              ticker,
              balance_sheet: fundamentals.balanceSheet,
              income_statement: fundamentals.incomeStatement,
              cash_flow: fundamentals.cashFlow,
              key_ratios: fundamentals.keyRatios,
              source: 'simfin-real',
              last_updated: currentDate,
              raw_data: {
                balance_sheet: balanceSheet,
                income_statement: incomeStatement,
                cash_flow: cashFlow
              }
            };
          } catch (error) {
            // Use proper error logging
            await globalErrorManager.handleError(
              error,
              createErrorContext('enhanced-trading-graph', 'fetchFundamentals', { ticker })
            );

            // Use proper error logging without mock data fallback
            globalErrorManager.getLogger().log(
              'error',
              'EnhancedTradingGraph',
              'fetchFundamentals',
              `Fundamentals API failed for ${ticker} - no fallback data available`,
              { ticker, error: error instanceof Error ? error.message : String(error) }
            );

            // Throw error to indicate data unavailability rather than returning mock data
            throw new TradingAgentError(
              `Financial fundamentals data unavailable for ${ticker}`,
              ErrorType.MISSING_DATA,
              ErrorSeverity.MEDIUM,
              createErrorContext('enhanced-trading-graph', 'fetchFundamentals', { ticker })
            );
          }
        }
      };
      
      this.dataFlowWrappers.set(dataFlowKey, new EnhancedDataFlowWrapper(realDataFlow, dataFlowKey));
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

  private async parseFundamentalsData(balanceSheet: string, incomeStatement: string, cashFlow: string, ticker: string): Promise<any> {
    try {
      // Parse balance sheet data
      const balanceSheetData = this.extractFinancialMetrics(balanceSheet);

      // Parse income statement data
      const incomeStatementData = this.extractFinancialMetrics(incomeStatement);

      // Parse cash flow data
      const cashFlowData = this.extractFinancialMetrics(cashFlow);

      // Calculate key ratios
      const keyRatios = await this.calculateKeyRatios(balanceSheetData, incomeStatementData, cashFlowData, ticker);

      return {
        balanceSheet: balanceSheetData,
        incomeStatement: incomeStatementData,
        cashFlow: cashFlowData,
        keyRatios
      };
    } catch (error) {
      globalErrorManager.getLogger().log(
        'error',
        'EnhancedTradingGraph',
        'parseFundamentalsData',
        `Error parsing fundamentals data for ${ticker}`,
        { ticker, error: error instanceof Error ? error.message : String(error) }
      );

      // Return default structure
      return {
        balanceSheet: {},
        incomeStatement: {},
        cashFlow: {},
        keyRatios: {}
      };
    }
  }

  private extractFinancialMetrics(statementText: string): Record<string, number> {
    const metrics: Record<string, number> = {};
    const lines = statementText.split('\n');

    for (const line of lines) {
      // Look for key-value pairs in the format "key: value"
      const match = line.match(/^([^:]+):\s*([0-9,.-]+)$/);
      if (match && match[1] && match[2]) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        const value = parseFloat(match[2].replace(/,/g, ''));
        if (!isNaN(value)) {
          metrics[key] = value;
        }
      }
    }

    return metrics;
  }

  private async calculateKeyRatios(
    balanceSheet: Record<string, number>,
    incomeStatement: Record<string, number>,
    cashFlow: Record<string, number>,
    ticker: string
  ): Promise<Record<string, number>> {
    const ratios: Record<string, number> = {};

    try {
      // Get current price data for P/E and P/B calculations
      let currentPrice = 0;
      let sharesOutstanding = 0;

      try {
        // Try to fetch current market data
        const marketData = await this.getEnhancedDataFlow().fetchMarketData(ticker);
        currentPrice = marketData.price || 0;

        // Estimate shares outstanding from market cap (rough approximation)
        // In a real implementation, this would come from financial data providers
        if (currentPrice > 0 && balanceSheet.shareholder_equity) {
          // Rough estimate: market cap ≈ 1.5-2x book value for most companies
          const estimatedMarketCap = balanceSheet.shareholder_equity * 1.75;
          sharesOutstanding = estimatedMarketCap / currentPrice;
        }
      } catch (error) {
        globalErrorManager.getLogger().log(
          'warn',
          'EnhancedTradingGraph',
          'calculateKeyRatios',
          `Could not fetch market data for ${ticker}, using fallback values`,
          { ticker, error: error instanceof Error ? error.message : String(error) }
        );
        // Use fallback values if market data is unavailable
        currentPrice = 100; // Fallback price
        sharesOutstanding = 1000000; // Fallback shares
      }

      // Price-to-Earnings ratio
      if (incomeStatement.net_income && incomeStatement.net_income > 0 && sharesOutstanding > 0) {
        const eps = incomeStatement.net_income / sharesOutstanding;
        ratios.pe_ratio = currentPrice / eps;
      } else {
        ratios.pe_ratio = 0; // Cannot calculate without positive earnings
      }

      // Price-to-Book ratio
      if (balanceSheet.shareholder_equity && balanceSheet.shareholder_equity > 0 && sharesOutstanding > 0) {
        const bookValuePerShare = balanceSheet.shareholder_equity / sharesOutstanding;
        ratios.pb_ratio = currentPrice / bookValuePerShare;
      } else {
        ratios.pb_ratio = 0; // Cannot calculate without positive equity
      }

      // Debt-to-Equity ratio
      if (balanceSheet.total_liabilities && balanceSheet.shareholder_equity) {
        ratios.debt_to_equity = balanceSheet.total_liabilities / balanceSheet.shareholder_equity;
      }

      // Return on Equity
      if (incomeStatement.net_income && balanceSheet.shareholder_equity) {
        ratios.roe = incomeStatement.net_income / balanceSheet.shareholder_equity;
      }

      // Return on Assets
      if (incomeStatement.net_income && balanceSheet.total_assets) {
        ratios.roa = incomeStatement.net_income / balanceSheet.total_assets;
      }

      // Current Ratio
      if (balanceSheet.current_assets && balanceSheet.current_liabilities) {
        ratios.current_ratio = balanceSheet.current_assets / balanceSheet.current_liabilities;
      }

      // Operating Cash Flow ratio
      if (cashFlow.operating_cash_flow && balanceSheet.current_liabilities) {
        ratios.operating_cash_flow_ratio = cashFlow.operating_cash_flow / balanceSheet.current_liabilities;
      }

      // Log calculated ratios for debugging
      globalErrorManager.getLogger().log(
        'debug',
        'EnhancedTradingGraph',
        'calculateKeyRatios',
        `Calculated key ratios for ${ticker}`,
        {
          ticker,
          currentPrice,
          sharesOutstanding,
          pe_ratio: ratios.pe_ratio,
          pb_ratio: ratios.pb_ratio,
          debt_to_equity: ratios.debt_to_equity,
          roe: ratios.roe
        }
      );

    } catch (error) {
      globalErrorManager.getLogger().log(
        'error',
        'EnhancedTradingGraph',
        'calculateKeyRatios',
        'Error calculating key ratios',
        { ticker, error: error instanceof Error ? error.message : String(error) }
      );
    }

    return ratios;
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