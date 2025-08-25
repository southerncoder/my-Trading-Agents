/**
 * State Management Optimization
 * 
 * Implements efficient state diffing, minimal object copying, and optimized state transitions
 * to reduce memory usage and improve performance during agent workflow execution.
 */

import { BaseMessage } from '@langchain/core/messages';
import { AgentState, InvestDebateState, RiskDebateState } from '../types/agent-states';
import { createLogger } from '../utils/enhanced-logger';

export interface StateSnapshot {
  timestamp: number;
  checksum: string;
  size: number;
  version: number;
}

export interface StateDiff {
  changes: Record<string, any>;
  additions: string[];
  removals: string[];
  modifications: string[];
  size: number;
  timestamp: number;
}

export interface StateOptimizationConfig {
  enableDiffing: boolean;
  enableSnapshot: boolean;
  maxSnapshots: number;
  compressionThreshold: number;
  enableWeakRefs: boolean;
}

/**
 * Optimized State Manager with efficient diffing and minimal copying
 */
export class OptimizedStateManager {
  private readonly logger = createLogger('graph', 'OptimizedStateManager');
  private snapshots = new Map<number, StateSnapshot>();
  private diffs = new Map<number, StateDiff>();
  private weakRefs = new WeakSet<object>();
  private version = 0;

  constructor(private config: StateOptimizationConfig) {
    this.logger.info('constructor', 'Initializing optimized state manager', { 
      config 
    });
  }

  /**
   * Efficiently diff two states to identify minimal changes
   */
  public diffStates(oldState: AgentState, newState: AgentState): StateDiff {
    const startTime = Date.now();
    const changes: Record<string, any> = {};
    const additions: string[] = [];
    const removals: string[] = [];
    const modifications: string[] = [];

    // Compare all keys in both states
    const allKeys = new Set([
      ...Object.keys(oldState),
      ...Object.keys(newState)
    ]);

    for (const key of allKeys) {
      const oldValue = (oldState as any)[key];
      const newValue = (newState as any)[key];

      if (oldValue === undefined && newValue !== undefined) {
        additions.push(key);
        changes[key] = newValue;
      } else if (oldValue !== undefined && newValue === undefined) {
        removals.push(key);
        changes[key] = undefined;
      } else if (!this.deepEqual(oldValue, newValue)) {
        modifications.push(key);
        changes[key] = newValue;
      }
    }

    const diff: StateDiff = {
      changes,
      additions,
      removals,
      modifications,
      size: JSON.stringify(changes).length,
      timestamp: Date.now()
    };

    const diffTime = Date.now() - startTime;
    this.logger.info('diffStates', 'State diff completed', {
      additions: additions.length,
      removals: removals.length,
      modifications: modifications.length,
      diffSize: diff.size,
      diffTime: `${diffTime}ms`
    });

    return diff;
  }

  /**
   * Apply a diff to a state efficiently
   */
  public applyDiff(state: AgentState, diff: StateDiff): AgentState {
    const startTime = Date.now();
    
    // Use minimal copying - only copy changed properties
    const result = { ...state };
    
    for (const [key, value] of Object.entries(diff.changes)) {
      if (value === undefined) {
        delete (result as any)[key];
      } else {
        (result as any)[key] = value;
      }
    }

    const applyTime = Date.now() - startTime;
    this.logger.info('applyDiff', 'Diff applied to state', {
      changesApplied: Object.keys(diff.changes).length,
      applyTime: `${applyTime}ms`
    });

    return result;
  }

  /**
   * Create optimized state update with minimal copying
   */
  public updateState(
    state: AgentState,
    updates: Partial<AgentState>
  ): { newState: AgentState; diff: StateDiff } {
    const startTime = Date.now();

    // Create new state with minimal copying
    const newState = this.mergeStateEfficiently(state, updates);
    
    // Generate diff for tracking
    const diff = this.config.enableDiffing ? 
      this.diffStates(state, newState) : 
      this.createMinimalDiff(updates);

    // Manage snapshots
    if (this.config.enableSnapshot) {
      this.createSnapshot(newState);
    }

    const updateTime = Date.now() - startTime;
    this.logger.info('updateState', 'State updated optimally', {
      updateKeys: Object.keys(updates).length,
      diffSize: diff.size,
      updateTime: `${updateTime}ms`,
      version: this.version
    });

    return { newState, diff };
  }

  /**
   * Efficiently merge states with smart copying strategies
   */
  private mergeStateEfficiently(
    baseState: AgentState, 
    updates: Partial<AgentState>
  ): AgentState {
    // Use object spread for shallow copy (efficient for flat properties)
    const result = { ...baseState };

    // Handle each update with optimized strategies
    for (const [key, value] of Object.entries(updates)) {
      const typedKey = key as keyof AgentState;
      
      if (value === undefined) {
        delete result[typedKey];
        continue;
      }

      // Special handling for different property types
      switch (typedKey) {
        case 'messages':
          // For arrays, check if we're appending vs replacing
          result[typedKey] = this.optimizeMessageArray(
            baseState[typedKey] || [], 
            value as BaseMessage[]
          );
          break;

        case 'investment_debate_state':
        case 'risk_debate_state':
          // For nested objects, use shallow merge if possible
          result[typedKey] = this.optimizeNestedObject(
            baseState[typedKey] as any,
            value as any
          );
          break;

        default:
          // For primitive values, direct assignment
          (result as any)[typedKey] = value;
      }
    }

    return result;
  }

  /**
   * Optimize message array updates (common operation)
   */
  private optimizeMessageArray(
    existing: BaseMessage[], 
    updated: BaseMessage[]
  ): BaseMessage[] {
    // If we're just appending, reuse existing array reference
    if (updated.length > existing.length && 
        updated.slice(0, existing.length).every((msg, i) => msg === existing[i])) {
      // Appending case - more efficient
      return updated;
    }
    
    // Otherwise, create new array
    return [...updated];
  }

  /**
   * Optimize nested object updates
   */
  private optimizeNestedObject<T extends object>(
    existing: T | undefined,
    updated: T
  ): T {
    if (!existing) {
      return updated;
    }

    // Check if objects are identical (reference equality)
    if (existing === updated) {
      return existing;
    }

    // Shallow merge for nested objects
    const result = { ...existing };
    for (const [key, value] of Object.entries(updated)) {
      (result as any)[key] = value;
    }

    return result;
  }

  /**
   * Create minimal diff for simple updates
   */
  private createMinimalDiff(updates: Partial<AgentState>): StateDiff {
    return {
      changes: updates,
      additions: Object.keys(updates).filter(k => (updates as any)[k] !== undefined),
      removals: Object.keys(updates).filter(k => (updates as any)[k] === undefined),
      modifications: Object.keys(updates),
      size: JSON.stringify(updates).length,
      timestamp: Date.now()
    };
  }

  /**
   * Create state snapshot for rollback/debugging
   */
  private createSnapshot(state: AgentState): StateSnapshot {
    this.version++;
    
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      checksum: this.createChecksum(state),
      size: JSON.stringify(state).length,
      version: this.version
    };

    this.snapshots.set(this.version, snapshot);

    // Cleanup old snapshots
    if (this.snapshots.size > this.config.maxSnapshots) {
      const oldestVersion = Math.min(...this.snapshots.keys());
      this.snapshots.delete(oldestVersion);
    }

    return snapshot;
  }

  /**
   * Deep equality check optimized for state objects
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (typeof a !== typeof b) return false;
    
    if (a === null || b === null) return a === b;
    
    if (typeof a !== 'object') return a === b;
    
    // For arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }
    
    // For objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => this.deepEqual(a[key], b[key]));
  }

  /**
   * Create simple checksum for state
   */
  private createChecksum(state: AgentState): string {
    const stateString = JSON.stringify(state, Object.keys(state).sort());
    return this.simpleHash(stateString);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats() {
    return {
      version: this.version,
      snapshots: this.snapshots.size,
      diffs: this.diffs.size,
      totalSnapshots: this.snapshots.size,
      snapshotSizes: Array.from(this.snapshots.values()).map(s => s.size),
      averageSnapshotSize: Array.from(this.snapshots.values())
        .reduce((sum, s) => sum + s.size, 0) / this.snapshots.size || 0
    };
  }

  /**
   * Clear optimization data
   */
  public clear(): void {
    this.snapshots.clear();
    this.diffs.clear();
    this.version = 0;
    this.logger.info('clear', 'State manager cleared');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.clear();
    this.logger.info('dispose', 'State manager disposed');
  }
}

/**
 * Optimized state utilities for common operations
 */
export class StateOptimizationUtils {
  private static readonly logger = createLogger('graph', 'StateOptimizationUtils');

  /**
   * Add message to state efficiently
   */
  static addMessageOptimized(
    state: AgentState, 
    message: BaseMessage
  ): AgentState {
    // Reuse existing messages array and append
    const messages = state.messages ? [...state.messages, message] : [message];
    
    return {
      ...state,
      messages
    };
  }

  /**
   * Update analyst report efficiently
   */
  static updateAnalystReportOptimized(
    state: AgentState,
    reportType: 'market_report' | 'sentiment_report' | 'news_report' | 'fundamentals_report',
    report: string
  ): AgentState {
    return {
      ...state,
      [reportType]: report
    };
  }

  /**
   * Update debate state efficiently with partial updates
   */
  static updateDebateStateOptimized(
    state: AgentState,
    debateType: 'investment_debate_state' | 'risk_debate_state',
    updates: Partial<InvestDebateState | RiskDebateState>
  ): AgentState {
    const currentDebateState = state[debateType] as any;
    const newDebateState = currentDebateState ? 
      { ...currentDebateState, ...updates } : 
      updates;

    return {
      ...state,
      [debateType]: newDebateState
    };
  }

  /**
   * Calculate state memory footprint
   */
  static calculateStateSize(state: AgentState): number {
    return JSON.stringify(state).length;
  }

  /**
   * Compress state for storage (removes undefined values)
   */
  static compressState(state: AgentState): AgentState {
    const compressed: any = {};
    
    for (const [key, value] of Object.entries(state)) {
      if (value !== undefined && value !== null && value !== '') {
        compressed[key] = value;
      }
    }
    
    return compressed as AgentState;
  }

  /**
   * Create state summary for logging/debugging
   */
  static createStateSummary(state: AgentState): string {
    const summary = {
      company: state.company_of_interest,
      date: state.trade_date,
      messages: state.messages?.length || 0,
      reports: {
        market: !!state.market_report,
        sentiment: !!state.sentiment_report,
        news: !!state.news_report,
        fundamentals: !!state.fundamentals_report
      },
      investment: !!state.investment_plan,
      trading: !!state.trader_investment_plan,
      risk: !!state.final_trade_decision,
      size: this.calculateStateSize(state)
    };
    
    return JSON.stringify(summary);
  }
}