/**
 * State Optimization Service for Enhanced Trading Graph
 *
 * Handles state management, optimization, and caching operations.
 */

import { OptimizedStateManager, StateOptimizationConfig } from '../../performance/state-optimization';
import { createLogger } from '../../utils/enhanced-logger';

export interface StateOptimizationServiceConfig {
  enableStateOptimization: boolean;
  stateOptimizationConfig?: StateOptimizationConfig | undefined;
}

/**
 * Service for managing state optimization and caching
 */
export class StateOptimizationService {
  private logger: any;
  private enableStateOptimization: boolean;
  private stateManager?: OptimizedStateManager;

  constructor(config: StateOptimizationServiceConfig) {
    this.logger = createLogger('graph', 'state-optimization-service');
    this.enableStateOptimization = config.enableStateOptimization;

    if (this.enableStateOptimization) {
      const stateConfig: StateOptimizationConfig = config.stateOptimizationConfig || {
        enableDiffing: true,
        enableSnapshot: false, // Disabled for performance unless needed
        maxSnapshots: 5,
        compressionThreshold: 1024,
        enableWeakRefs: true
      };
      this.stateManager = new OptimizedStateManager(stateConfig);
    }
  }

  /**
   * Get state optimization statistics
   */
  getStateOptimizationStats(): any {
    if (!this.enableStateOptimization || !this.stateManager) {
      return { message: 'State optimization not enabled' };
    }
    return this.stateManager.getOptimizationStats();
  }

  /**
   * Optimized state update using state manager
   */
  async updateStateOptimized(currentState: any, updates: any): Promise<any> {
    if (!this.enableStateOptimization || !this.stateManager) {
      // Fallback to standard update
      return { ...currentState, ...updates };
    }

    const { newState, diff } = this.stateManager.updateState(currentState, updates);

    this.logger.info('updateStateOptimized', 'State updated with optimization', {
      diffSize: diff.size,
      changes: diff.modifications.length,
      additions: diff.additions.length,
      removals: diff.removals.length
    });

    return newState;
  }

  /**
   * Check if state optimization is available
   */
  isStateOptimizationAvailable(): boolean {
    return this.enableStateOptimization && !!this.stateManager;
  }

  /**
   * Get state manager instance (for internal use)
   */
  getStateManager(): OptimizedStateManager | undefined {
    return this.stateManager;
  }
}

/**
 * Factory function to create StateOptimizationService instance
 */
export function createStateOptimizationService(config: StateOptimizationServiceConfig): StateOptimizationService {
  return new StateOptimizationService(config);
}