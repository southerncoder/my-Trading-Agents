import { ZepClient } from '@getzep/zep-cloud';
import { ContextRetrievalUtils } from '../utilities';
import { ContextRetrievalError } from './error';

export interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
}

export class PerformanceContext {
  constructor(
    private zepClient: ExtendedZepClient,
    private logger: any,
    private utils: ContextRetrievalUtils
  ) {}

  async retrievePerformanceContext(
    agentId: string,
    performanceCriteria: {
      strategy_type?: string;
      market_conditions?: any;
      time_period?: string;
      performance_threshold?: number;
    }
  ): Promise<Array<{
    performance_id: string;
    agent_id: string;
    strategy_performance: {
      success_rate: number;
      avg_return: number;
      volatility: number;
      max_drawdown: number;
    };
    context_conditions: any;
    key_insights: string[];
    recommended_adjustments: string[];
  }>> {
    try {
      const searchQuery = `agent:${agentId} performance ${performanceCriteria.strategy_type || ''} ${performanceCriteria.time_period || ''}`;
      const searchResults = await this.zepClient.searchMemory?.(searchQuery, { maxResults: 15 }) || { facts: [] };
      const contexts: Array<any> = [];
      for (const result of searchResults.facts || []) {
        const performanceData = this.utils.extractPerformanceData(result);
        if (
          performanceData &&
          (!performanceCriteria.performance_threshold ||
            performanceData.success_rate >= performanceCriteria.performance_threshold)
        ) {
          contexts.push({
            performance_id: result.fact_id || `perf-${Date.now()}`,
            agent_id: agentId,
            strategy_performance: performanceData,
            context_conditions: this.utils.extractContextConditions(result),
            key_insights: this.utils.extractInsightsFromText(result.fact || ''),
            recommended_adjustments: this.utils.generateStrategyRecommendations(
              performanceCriteria.strategy_type || '',
              performanceData
            )
          });
        }
      }
      this.logger.info('Performance contexts retrieved', {
        component: 'PerformanceContext',
        total_contexts: contexts.length
      });
      return contexts;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Performance context retrieval failed', {
        component: 'PerformanceContext',
        error: err.message,
        metadata: { agentId, performanceCriteria }
      });
      throw new ContextRetrievalError(
        'PerformanceContext.retrievePerformanceContext failed',
        'PerformanceContext',
        err,
        { agentId, performanceCriteria }
      );
    }
  }
}
