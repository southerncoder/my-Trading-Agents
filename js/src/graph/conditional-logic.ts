/**
 * Conditional Logic for Trading Agents Graph
 * 
 * This module handles conditional logic for determining graph flow,
 * including when to continue analysis, move to next agent, or end workflows.
 * 
 * Key responsibilities:
 * - Determine if analysts should continue with tool calls
 * - Control debate rounds between bull/bear researchers
 * - Manage risk analysis discussion rounds
 * - Route agent execution based on current state
 */

import { AgentState } from '../types/agent-states.js';

export interface ConditionalLogicConfig {
  maxDebateRounds: number;
  maxRiskDiscussRounds: number;
}

/**
 * ConditionalLogic class handles routing decisions and flow control
 * for the trading agents graph execution, matching the Python implementation.
 */
export class ConditionalLogic {
  private maxDebateRounds: number;
  private maxRiskDiscussRounds: number;

  constructor(config: ConditionalLogicConfig = { maxDebateRounds: 1, maxRiskDiscussRounds: 1 }) {
    this.maxDebateRounds = config.maxDebateRounds;
    this.maxRiskDiscussRounds = config.maxRiskDiscussRounds;
  }

  /**
   * Determine if market analysis should continue
   */
  shouldContinueMarket(state: AgentState): string {
    const messages = state.messages;
    if (!messages || messages.length === 0) {
      return "Msg Clear Market";
    }

    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message has tool calls
    if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      return "tools_market";
    }
    
    return "Msg Clear Market";
  }

  /**
   * Determine if social media analysis should continue
   */
  shouldContinueSocial(state: AgentState): string {
    const messages = state.messages;
    if (!messages || messages.length === 0) {
      return "Msg Clear Social";
    }

    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message has tool calls
    if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      return "tools_social";
    }
    
    return "Msg Clear Social";
  }

  /**
   * Determine if news analysis should continue
   */
  shouldContinueNews(state: AgentState): string {
    const messages = state.messages;
    if (!messages || messages.length === 0) {
      return "Msg Clear News";
    }

    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message has tool calls
    if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      return "tools_news";
    }
    
    return "Msg Clear News";
  }

  /**
   * Determine if fundamentals analysis should continue
   */
  shouldContinueFundamentals(state: AgentState): string {
    const messages = state.messages;
    if (!messages || messages.length === 0) {
      return "Msg Clear Fundamentals";
    }

    const lastMessage = messages[messages.length - 1];
    
    // Check if the last message has tool calls
    if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
      return "tools_fundamentals";
    }
    
    return "Msg Clear Fundamentals";
  }

  /**
   * Determine if debate between bull and bear researchers should continue
   */
  shouldContinueDebate(state: AgentState): string {
    const debateState = state.investment_debate_state;
    
    if (!debateState) {
      return "Research Manager";
    }

    // End debate if we've reached the maximum rounds
    if (debateState.count >= 2 * this.maxDebateRounds) {
      return "Research Manager";
    }

    // Alternate between Bull and Bear based on current response
    if (debateState.current_response && debateState.current_response.startsWith("Bull")) {
      return "Bear Researcher";
    }
    
    return "Bull Researcher";
  }

  /**
   * Determine if risk analysis discussion should continue
   */
  shouldContinueRiskAnalysis(state: AgentState): string {
    const riskState = state.risk_debate_state;
    
    if (!riskState) {
      return "Risk Judge";
    }

    // End discussion if we've reached the maximum rounds
    if (riskState.count >= 3 * this.maxRiskDiscussRounds) {
      return "Risk Judge";
    }

    // Route based on the latest speaker
    if (riskState.latest_speaker) {
      if (riskState.latest_speaker.startsWith("Risky")) {
        return "Safe Analyst";
      }
      if (riskState.latest_speaker.startsWith("Safe")) {
        return "Neutral Analyst";
      }
    }
    
    return "Risky Analyst";
  }

  /**
   * Get all conditional logic functions for LangGraph
   */
  getConditionalFunctions() {
    return {
      shouldContinueMarket: this.shouldContinueMarket.bind(this),
      shouldContinueSocial: this.shouldContinueSocial.bind(this),
      shouldContinueNews: this.shouldContinueNews.bind(this),
      shouldContinueFundamentals: this.shouldContinueFundamentals.bind(this),
      shouldContinueDebate: this.shouldContinueDebate.bind(this),
      shouldContinueRiskAnalysis: this.shouldContinueRiskAnalysis.bind(this)
    };
  }

  /**
   * Validate state for debugging purposes
   */
  validateState(state: AgentState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!state.company_of_interest) {
      errors.push("Missing company_of_interest in state");
    }
    
    if (!state.trade_date) {
      errors.push("Missing trade_date in state");
    }
    
    if (!state.messages) {
      errors.push("Missing messages array in state");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Create a new conditional logic instance with default configuration
 */
export function createConditionalLogic(config?: Partial<ConditionalLogicConfig>): ConditionalLogic {
  const defaultConfig: ConditionalLogicConfig = {
    maxDebateRounds: 1,
    maxRiskDiscussRounds: 1
  };
  
  return new ConditionalLogic({ ...defaultConfig, ...config });
}