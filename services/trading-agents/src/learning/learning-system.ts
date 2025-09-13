import { ReinforcementLearningEngine } from './reinforcement-engine';
import { SupervisedLearningEngine } from './supervised-engine';
import { UnsupervisedLearningEngine } from './unsupervised-engine';

// SupervisedLearningEngine moved to supervised-engine.ts
// UnsupervisedLearningEngine moved to unsupervised-engine.ts

/**
 * Advanced Learning System Orchestrator
 *
 * Coordinates multiple learning engines for comprehensive market analysis
 */
export class AdvancedLearningSystem {
  public supervisedEngine: SupervisedLearningEngine;
  public unsupervisedEngine: UnsupervisedLearningEngine;
  public reinforcementEngine: ReinforcementLearningEngine;
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
    this.supervisedEngine = new SupervisedLearningEngine(logger);
    this.unsupervisedEngine = new UnsupervisedLearningEngine(logger);
    this.reinforcementEngine = new ReinforcementLearningEngine(undefined, logger);
  }

  /**
   * Generate comprehensive learning insights from all engines
   */
  async generateInsights(): Promise<Array<{
    type: 'supervised' | 'unsupervised' | 'reinforcement';
    insight: string;
    confidence: number;
    timestamp: Date;
  }>> {
    const insights: Array<{
      type: 'supervised' | 'unsupervised' | 'reinforcement';
      insight: string;
      confidence: number;
      timestamp: Date;
    }> = [];

    try {
      // Get insights from supervised learning (requires examples)
      const supervisedExamples: any[] = []; // Would need actual examples in real implementation
      if (supervisedExamples.length > 0) {
        const supervisedInsights = await this.supervisedEngine.getInsights(supervisedExamples);
        insights.push(...supervisedInsights.map((insight: any) => ({
          type: 'supervised' as const,
          insight: insight.description || 'Supervised learning insight',
          confidence: insight.confidence_score || 0.5,
          timestamp: insight.timestamp ? new Date(insight.timestamp) : new Date()
        })));
      }

      // Get insights from unsupervised learning (use clustering results)
      const unsupervisedExamples: any[] = []; // Would need actual examples in real implementation
      if (unsupervisedExamples.length > 0) {
        const clusteringResult = await this.unsupervisedEngine.performClustering(unsupervisedExamples, 3);
        insights.push({
          type: 'unsupervised' as const,
          insight: `Identified ${clusteringResult.clusters.length} market clusters with silhouette score ${clusteringResult.silhouette_score.toFixed(3)}`,
          confidence: Math.max(0.3, clusteringResult.silhouette_score),
          timestamp: new Date()
        });
      }

      // Get insights from reinforcement learning (requires states)
      const reinforcementStates: any[] = []; // Would need actual states in real implementation
      if (reinforcementStates.length > 0) {
        const reinforcementInsights = await this.reinforcementEngine.getInsights(reinforcementStates);
        insights.push(...reinforcementInsights.map((insight: any) => ({
          type: 'reinforcement' as const,
          insight: insight.description || 'Reinforcement learning insight',
          confidence: insight.confidence || 0.5,
          timestamp: new Date()
        })));
      }

      // If no examples provided, return basic health insights
      if (insights.length === 0) {
        const health = this.getSystemHealth();
        insights.push({
          type: 'supervised' as const,
          insight: `Learning system health: ${health.overall_health}`,
          confidence: health.overall_health === 'healthy' ? 0.8 : 0.5,
          timestamp: new Date()
        });
      }

      this.logger.info('generateInsights', `Generated ${insights.length} insights from all learning engines`);
      return insights;

    } catch (error) {
      this.logger.error('generateInsights', 'Failed to generate insights', { error });
      // Return basic fallback insights
      return [{
        type: 'supervised' as const,
        insight: 'Learning system operational but no specific insights available',
        confidence: 0.5,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Get system health and performance metrics
   */
  getSystemHealth(): {
    supervised_engine: boolean;
    unsupervised_engine: boolean;
    reinforcement_engine: boolean;
    overall_health: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const supervisedHealth = this.supervisedEngine.getHealth();
    const unsupervisedHealth = this.unsupervisedEngine.getHealth();
    const reinforcementHealth = this.reinforcementEngine.getHealth();

    const healthyCount = [supervisedHealth, unsupervisedHealth, reinforcementHealth]
      .filter(health => health === true).length;

    let overall_health: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === 3) {
      overall_health = 'healthy';
    } else if (healthyCount >= 1) {
      overall_health = 'degraded';
    } else {
      overall_health = 'unhealthy';
    }

    return {
      supervised_engine: supervisedHealth,
      unsupervised_engine: unsupervisedHealth,
      reinforcement_engine: reinforcementHealth,
      overall_health
    };
  }
}

/**
 * Factory function to create a learning system instance
 */
export function createLearningSystem(logger?: any): AdvancedLearningSystem {
  return new AdvancedLearningSystem(logger);
}