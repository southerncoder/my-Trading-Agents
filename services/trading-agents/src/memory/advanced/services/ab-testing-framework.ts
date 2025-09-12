import { createLogger } from '../../../utils/enhanced-logger';

/**
 * ABTestingFramework - A/B testing and relevance feedback functionality
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class ABTestingFramework {
  private logger: any;
  private abTestingData: {
    experiments: Map<string, any>;
    currentExperiment: any;
    metrics: {
      total_queries: number;
      method_performance: Map<string, any>;
      user_feedback: any[];
    };
  };
  private relevanceFeedbackData: {
    feedback_history: any[];
    improvement_suggestions: string[];
    performance_trends: Map<string, any>;
    last_improvement_check: number;
  };

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ABTestingFramework');

    // Initialize A/B testing data structure
    this.abTestingData = {
      experiments: new Map(),
      currentExperiment: null,
      metrics: {
        total_queries: 0,
        method_performance: new Map(),
        user_feedback: []
      }
    };

    // Initialize relevance feedback data structure
    this.relevanceFeedbackData = {
      feedback_history: [],
      improvement_suggestions: [],
      performance_trends: new Map(),
      last_improvement_check: Date.now()
    };
  }

  /**
   * Update A/B testing metrics for retrieval methods
   */
  updateABTestingMetrics(searchResults: any[], queryContext: any, totalTime: number): void {
    try {
      // Initialize A/B testing data structure if not exists
      if (!this.abTestingData) {
        this.abTestingData = {
          experiments: new Map(),
          currentExperiment: null,
          metrics: {
            total_queries: 0,
            method_performance: new Map(),
            user_feedback: []
          }
        };
      }

      // Update total queries
      this.abTestingData.metrics.total_queries++;

      // Track method performance
      const methodName = queryContext?.retrieval_method || 'default';
      const performance = this.abTestingData.metrics.method_performance.get(methodName) || {
        queries: 0,
        avg_relevance: 0,
        avg_time: 0,
        success_rate: 0
      };

      // Calculate metrics for this query
      const relevanceScores = searchResults.map(r => r.metadata?.relevance_score || 0);
      const avgRelevance = relevanceScores.length > 0
        ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length
        : 0;
      const successRate = relevanceScores.filter(score => score > 0.5).length / relevanceScores.length;

      // Update running averages
      const newQueries = performance.queries + 1;
      performance.queries = newQueries;
      performance.avg_relevance = (performance.avg_relevance * (newQueries - 1) + avgRelevance) / newQueries;
      performance.avg_time = (performance.avg_time * (newQueries - 1) + totalTime) / newQueries;
      performance.success_rate = (performance.success_rate * (newQueries - 1) + successRate) / newQueries;

      this.abTestingData.metrics.method_performance.set(methodName, performance);

      // Log A/B testing update
      this.logger.debug('A/B testing metrics updated', {
        method: methodName,
        avgRelevance: performance.avg_relevance.toFixed(3),
        avgTime: performance.avg_time.toFixed(0),
        successRate: performance.success_rate.toFixed(3)
      });

    } catch (error) {
      this.logger.warn('Error updating A/B testing metrics', { error });
    }
  }

  /**
   * Update relevance feedback loop for continuous improvement
   */
  updateRelevanceFeedback(searchResults: any[], queryContext: any): void {
    try {
      // Initialize relevance feedback data if not exists
      if (!this.relevanceFeedbackData) {
        this.relevanceFeedbackData = {
          feedback_history: [],
          improvement_suggestions: [],
          performance_trends: new Map(),
          last_improvement_check: Date.now()
        };
      }

      // Analyze current performance
      const currentPerformance = {
        timestamp: Date.now(),
        query_context: queryContext,
        results_count: searchResults.length,
        avg_relevance: searchResults.length > 0
          ? searchResults.reduce((sum, r) => sum + (r.metadata?.relevance_score || 0), 0) / searchResults.length
          : 0,
        top_relevance: searchResults.length > 0
          ? Math.max(...searchResults.map(r => r.metadata?.relevance_score || 0))
          : 0
      };

      // Add to feedback history
      this.relevanceFeedbackData.feedback_history.push(currentPerformance);

      // Keep only last 1000 feedback entries to prevent memory issues
      if (this.relevanceFeedbackData.feedback_history.length > 1000) {
        this.relevanceFeedbackData.feedback_history =
          this.relevanceFeedbackData.feedback_history.slice(-1000);
      }

      // Check for improvement opportunities every 100 queries
      if (this.relevanceFeedbackData.feedback_history.length % 100 === 0) {
        this.analyzeImprovementOpportunities();
      }

      // Update performance trends
      this.updatePerformanceTrends(currentPerformance);

      this.logger.debug('Relevance feedback updated', {
        historySize: this.relevanceFeedbackData.feedback_history.length,
        avgRelevance: currentPerformance.avg_relevance.toFixed(3),
        topRelevance: currentPerformance.top_relevance.toFixed(3)
      });

    } catch (error) {
      this.logger.warn('Error updating relevance feedback', { error });
    }
  }

  /**
   * Analyze improvement opportunities based on feedback history
   */
  analyzeImprovementOpportunities(): void {
    try {
      const history = this.relevanceFeedbackData.feedback_history;
      if (history.length < 50) return; // Need minimum data for analysis

      // Analyze recent performance trends
      const recent = history.slice(-50);
      const older = history.slice(-100, -50);

      const recentAvg = recent.reduce((sum, p) => sum + p.avg_relevance, 0) / recent.length;
      const olderAvg = older.reduce((sum, p) => sum + p.avg_relevance, 0) / older.length;

      const performanceChange = recentAvg - olderAvg;

      // Generate improvement suggestions based on analysis
      const suggestions: string[] = [];

      if (performanceChange < -0.05) {
        suggestions.push('Performance declining - consider updating similarity algorithms');
      } else if (performanceChange > 0.05) {
        suggestions.push('Performance improving - current approach is effective');
      }

      // Analyze query types for optimization opportunities
      const queryTypePerformance = new Map<string, number[]>();
      recent.forEach(performance => {
        const queryType = performance.query_context?.query_type || 'unknown';
        if (!queryTypePerformance.has(queryType)) {
          queryTypePerformance.set(queryType, []);
        }
        queryTypePerformance.get(queryType)!.push(performance.avg_relevance);
      });

      // Find underperforming query types
      for (const [queryType, scores] of queryTypePerformance) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (avgScore < 0.4) {
          suggestions.push(`Low performance for ${queryType} queries - consider specialized handling`);
        }
      }

      this.relevanceFeedbackData.improvement_suggestions = suggestions;

      this.logger.info('Improvement opportunities analyzed', {
        performanceChange: performanceChange.toFixed(3),
        suggestionsCount: suggestions.length,
        queryTypesAnalyzed: queryTypePerformance.size
      });

    } catch (error) {
      this.logger.warn('Error analyzing improvement opportunities', { error });
    }
  }

  /**
   * Update performance trends for monitoring
   */
  updatePerformanceTrends(currentPerformance: any): void {
    try {
      const trends = this.relevanceFeedbackData.performance_trends;

      // Update hourly trends
      const hourKey = Math.floor(currentPerformance.timestamp / (1000 * 60 * 60));
      const hourlyData = trends.get(`hour_${hourKey}`) || [];
      hourlyData.push(currentPerformance.avg_relevance);

      // Keep only last 24 hours of hourly data
      if (trends.size > 24) {
        const keys = Array.from(trends.keys()).sort();
        keys.slice(0, -24).forEach(key => trends.delete(key));
      }

      trends.set(`hour_${hourKey}`, hourlyData);

    } catch (error) {
      this.logger.warn('Error updating performance trends', { error });
    }
  }

  /**
   * Get A/B testing metrics
   */
  getABTestingMetrics(): any {
    try {
      return {
        total_queries: this.abTestingData.metrics.total_queries,
        method_performance: Object.fromEntries(this.abTestingData.metrics.method_performance),
        experiments: Object.fromEntries(this.abTestingData.experiments),
        current_experiment: this.abTestingData.currentExperiment
      };
    } catch (error) {
      this.logger.warn('Error getting A/B testing metrics', { error });
      return {};
    }
  }

  /**
   * Get relevance feedback data
   */
  getRelevanceFeedbackData(): any {
    try {
      return {
        feedback_history_size: this.relevanceFeedbackData.feedback_history.length,
        improvement_suggestions: this.relevanceFeedbackData.improvement_suggestions,
        performance_trends: Object.fromEntries(this.relevanceFeedbackData.performance_trends),
        last_improvement_check: this.relevanceFeedbackData.last_improvement_check
      };
    } catch (error) {
      this.logger.warn('Error getting relevance feedback data', { error });
      return {};
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    try {
      const history = this.relevanceFeedbackData.feedback_history;
      if (history.length === 0) {
        return { message: 'No performance data available' };
      }

      const recent = history.slice(-100); // Last 100 queries
      const avgRelevance = recent.reduce((sum, p) => sum + p.avg_relevance, 0) / recent.length;
      const avgResultsCount = recent.reduce((sum, p) => sum + p.results_count, 0) / recent.length;
      const topRelevance = Math.max(...recent.map(p => p.top_relevance));

      return {
        total_queries: history.length,
        recent_avg_relevance: avgRelevance,
        recent_avg_results_count: avgResultsCount,
        recent_top_relevance: topRelevance,
        improvement_suggestions: this.relevanceFeedbackData.improvement_suggestions
      };
    } catch (error) {
      this.logger.warn('Error getting performance summary', { error });
      return { error: 'Unable to generate performance summary' };
    }
  }

  /**
   * Reset A/B testing data
   */
  resetABTestingData(): void {
    try {
      this.abTestingData = {
        experiments: new Map(),
        currentExperiment: null,
        metrics: {
          total_queries: 0,
          method_performance: new Map(),
          user_feedback: []
        }
      };

      this.logger.info('A/B testing data reset');
    } catch (error) {
      this.logger.warn('Error resetting A/B testing data', { error });
    }
  }

  /**
   * Reset relevance feedback data
   */
  resetRelevanceFeedbackData(): void {
    try {
      this.relevanceFeedbackData = {
        feedback_history: [],
        improvement_suggestions: [],
        performance_trends: new Map(),
        last_improvement_check: Date.now()
      };

      this.logger.info('Relevance feedback data reset');
    } catch (error) {
      this.logger.warn('Error resetting relevance feedback data', { error });
    }
  }

  /**
   * Get health status of A/B testing framework
   */
  getHealthStatus(): any {
    try {
      return {
        ab_testing: {
          initialized: !!this.abTestingData,
          total_queries: this.abTestingData?.metrics?.total_queries || 0,
          methods_tracked: this.abTestingData?.metrics?.method_performance?.size || 0
        },
        relevance_feedback: {
          initialized: !!this.relevanceFeedbackData,
          feedback_history_size: this.relevanceFeedbackData?.feedback_history?.length || 0,
          improvement_suggestions_count: this.relevanceFeedbackData?.improvement_suggestions?.length || 0
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Error getting health status', { error });
      return { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }
}

/**
 * Factory function to create ABTestingFramework
 */
export function createABTestingFramework(logger?: any): ABTestingFramework {
  return new ABTestingFramework(logger);
}