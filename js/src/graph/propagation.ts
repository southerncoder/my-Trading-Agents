/**
 * Propagation Logic for Trading Agents Graph
 * 
 * This module handles state initialization and propagation through the graph,
 * including creating initial state and configuring graph execution parameters.
 * 
 * Key responsibilities:
 * - Initialize agent state with ticker and trade date
 * - Set up debate states for research and risk management
 * - Configure graph execution parameters
 * - Handle state validation and error recovery
 */

import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState, InvestDebateState, RiskDebateState, AgentStateHelpers } from '../types/agent-states.js';

export interface PropagatorConfig {
  maxRecurLimit: number;
  streamMode: string;
}

/**
 * Propagator class handles state initialization and propagation through the graph
 */
export class Propagator {
  private maxRecurLimit: number;
  private streamMode: string;

  constructor(config: PropagatorConfig = { maxRecurLimit: 100, streamMode: 'values' }) {
    this.maxRecurLimit = config.maxRecurLimit;
    this.streamMode = config.streamMode;
  }

  /**
   * Create the initial state for the agent graph
   */
  createInitialState(companyName: string, tradeDate: string): AgentState {
    // Create initial human message
    const initialMessage = new HumanMessage(companyName);

    // Create initial debate states
    const initialInvestmentDebateState: InvestDebateState = {
      bull_history: '',
      bear_history: '',
      history: '',
      current_response: '',
      judge_decision: '',
      count: 0
    };

    const initialRiskDebateState: RiskDebateState = {
      risky_history: '',
      safe_history: '',
      neutral_history: '',
      history: '',
      latest_speaker: '',
      current_risky_response: '',
      current_safe_response: '',
      current_neutral_response: '',
      judge_decision: '',
      count: 0
    };

    // Create and return initial state
    return {
      messages: [initialMessage],
      company_of_interest: companyName,
      trade_date: tradeDate,
      investment_debate_state: initialInvestmentDebateState,
      risk_debate_state: initialRiskDebateState,
      market_report: '',
      fundamentals_report: '',
      sentiment_report: '',
      news_report: ''
    };
  }

  /**
   * Get arguments for the graph invocation
   */
  getGraphArgs(): Record<string, any> {
    return {
      stream_mode: this.streamMode,
      config: {
        recursion_limit: this.maxRecurLimit
      }
    };
  }

  /**
   * Update state with new data while preserving immutability
   */
  updateState(currentState: AgentState, updates: Partial<AgentState>): AgentState {
    const result: AgentState = {
      ...currentState,
      ...updates
    };

    // Handle messages array properly
    if (updates.messages) {
      result.messages = [...updates.messages];
    }

    // Handle debate states properly
    if (updates.investment_debate_state && currentState.investment_debate_state) {
      result.investment_debate_state = { 
        ...currentState.investment_debate_state, 
        ...updates.investment_debate_state 
      };
    } else if (updates.investment_debate_state) {
      result.investment_debate_state = updates.investment_debate_state;
    }

    if (updates.risk_debate_state && currentState.risk_debate_state) {
      result.risk_debate_state = { 
        ...currentState.risk_debate_state, 
        ...updates.risk_debate_state 
      };
    } else if (updates.risk_debate_state) {
      result.risk_debate_state = updates.risk_debate_state;
    }

    return result;
  }

  /**
   * Add a message to the state
   */
  addMessage(state: AgentState, message: BaseMessage): AgentState {
    return {
      ...state,
      messages: [...state.messages, message]
    };
  }

  /**
   * Clear messages from state (used in Python implementation for message cleanup)
   */
  clearMessages(state: AgentState): AgentState {
    return {
      ...state,
      messages: []
    };
  }

  /**
   * Validate state integrity
   */
  validateState(state: AgentState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!state.company_of_interest) {
      errors.push('Missing company_of_interest');
    }

    if (!state.trade_date) {
      errors.push('Missing trade_date');
    }

    if (!Array.isArray(state.messages)) {
      errors.push('Messages must be an array');
    }

    // Validate debate states structure
    if (state.investment_debate_state) {
      const requiredInvestFields = ['bull_history', 'bear_history', 'history', 'current_response', 'judge_decision', 'count'];
      for (const field of requiredInvestFields) {
        if (!(field in state.investment_debate_state)) {
          errors.push(`Missing field ${field} in investment_debate_state`);
        }
      }
    }

    if (state.risk_debate_state) {
      const requiredRiskFields = [
        'risky_history', 'safe_history', 'neutral_history', 'history', 
        'latest_speaker', 'current_risky_response', 'current_safe_response', 
        'current_neutral_response', 'judge_decision', 'count'
      ];
      for (const field of requiredRiskFields) {
        if (!(field in state.risk_debate_state)) {
          errors.push(`Missing field ${field} in risk_debate_state`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract state for logging (removing sensitive or unnecessary data)
   */
  extractLoggableState(state: AgentState): Record<string, any> {
    return {
      company_of_interest: state.company_of_interest,
      trade_date: state.trade_date,
      market_report: state.market_report,
      sentiment_report: state.sentiment_report,
      news_report: state.news_report,
      fundamentals_report: state.fundamentals_report,
      investment_debate_state: state.investment_debate_state ? {
        bull_history: state.investment_debate_state.bull_history,
        bear_history: state.investment_debate_state.bear_history,
        history: state.investment_debate_state.history,
        current_response: state.investment_debate_state.current_response,
        judge_decision: state.investment_debate_state.judge_decision,
        count: state.investment_debate_state.count
      } : undefined,
      trader_investment_plan: state.trader_investment_plan,
      risk_debate_state: state.risk_debate_state ? {
        risky_history: state.risk_debate_state.risky_history,
        safe_history: state.risk_debate_state.safe_history,
        neutral_history: state.risk_debate_state.neutral_history,
        history: state.risk_debate_state.history,
        latest_speaker: state.risk_debate_state.latest_speaker,
        judge_decision: state.risk_debate_state.judge_decision,
        count: state.risk_debate_state.count
      } : undefined,
      investment_plan: state.investment_plan,
      final_trade_decision: state.final_trade_decision
    };
  }

  /**
   * Create a deep copy of state to ensure immutability
   */
  cloneState(state: AgentState): AgentState {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Merge multiple state updates into current state
   */
  mergeStateUpdates(currentState: AgentState, ...updates: Partial<AgentState>[]): AgentState {
    let result = currentState;
    
    for (const update of updates) {
      result = this.updateState(result, update);
    }
    
    return result;
  }
}

/**
 * Create a new propagator instance with default configuration
 */
export function createPropagator(config?: Partial<PropagatorConfig>): Propagator {
  const defaultConfig: PropagatorConfig = {
    maxRecurLimit: 100,
    streamMode: 'values'
  };
  
  return new Propagator({ ...defaultConfig, ...config });
}