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
  private supervisedEngine: SupervisedLearningEngine;
  private unsupervisedEngine: UnsupervisedLearningEngine;
  private reinforcementEngine: ReinforcementLearningEngine;
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || console;
    this.supervisedEngine = new SupervisedLearningEngine(logger);
    this.unsupervisedEngine = new UnsupervisedLearningEngine(logger);
    this.reinforcementEngine = new ReinforcementLearningEngine(logger);
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