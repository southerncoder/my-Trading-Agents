import { BaseMessage } from '@langchain/core/messages';

/**
 * Investment debate state for research team
 */
export interface InvestDebateState {
  bull_history: string;      // Bullish conversation history
  bear_history: string;      // Bearish conversation history  
  history: string;           // Full conversation history
  current_response: string;  // Latest response
  judge_decision: string;    // Final judge decision
  count: number;            // Length of conversation
}

/**
 * Risk debate state for risk management team
 */
export interface RiskDebateState {
  risky_history: string;           // Risky agent's conversation history
  safe_history: string;            // Safe agent's conversation history
  neutral_history: string;         // Neutral agent's conversation history
  history: string;                 // Full conversation history
  latest_speaker: string;          // Agent that spoke last
  current_risky_response: string;  // Latest response by risky analyst
  current_safe_response: string;   // Latest response by safe analyst
  current_neutral_response: string; // Latest response by neutral analyst
  judge_decision: string;          // Judge's decision
  count: number;                   // Length of conversation
}

/**
 * Main agent state that flows through the graph
 */
export interface AgentState {
  // Messages state
  messages: BaseMessage[];
  
  // Core identifiers
  company_of_interest: string;     // Company ticker/name being analyzed
  trade_date: string;             // Date of analysis (YYYY-MM-DD)
  sender?: string;                // Agent that sent the message
  
  // Analyst reports
  market_report?: string;         // Market analyst report
  sentiment_report?: string;      // Social media analyst report
  news_report?: string;           // News researcher report
  fundamentals_report?: string;   // Fundamentals researcher report
  
  // Research team outputs
  investment_debate_state?: InvestDebateState;  // Research debate state
  investment_plan?: string;                     // Final investment plan
  
  // Trading team outputs
  trader_investment_plan?: string;              // Trader's specific plan
  
  // Risk management outputs
  risk_debate_state?: RiskDebateState;          // Risk debate state
  final_trade_decision?: string;                // Final trading decision
}

/**
 * Helper class for agent state operations
 */
export class AgentStateHelpers {
  /**
   * Create an initial agent state
   */
  static createInitialState(
    company: string, 
    tradeDate: string, 
    initialMessages: BaseMessage[] = []
  ): AgentState {
    return {
      messages: initialMessages,
      company_of_interest: company,
      trade_date: tradeDate,
    };
  }

  /**
   * Add a message to the state
   */
  static addMessage(state: AgentState, message: BaseMessage): AgentState {
    return {
      ...state,
      messages: [...state.messages, message],
    };
  }

  /**
   * Update a specific field in the state
   */
  static updateField<K extends keyof AgentState>(
    state: AgentState,
    field: K,
    value: AgentState[K]
  ): AgentState {
    return {
      ...state,
      [field]: value,
    };
  }

  /**
   * Check if required analyst reports are complete
   */
  static areAnalystReportsComplete(state: AgentState): boolean {
    return !!(
      state.market_report &&
      state.sentiment_report &&
      state.news_report &&
      state.fundamentals_report
    );
  }

  /**
   * Check if investment debate is complete
   */
  static isInvestmentDebateComplete(state: AgentState): boolean {
    return !!(
      state.investment_debate_state?.judge_decision &&
      state.investment_plan
    );
  }

  /**
   * Check if trading plan is complete
   */
  static isTradingPlanComplete(state: AgentState): boolean {
    return !!state.trader_investment_plan;
  }

  /**
   * Check if risk management is complete
   */
  static isRiskManagementComplete(state: AgentState): boolean {
    return !!(
      state.risk_debate_state?.judge_decision &&
      state.final_trade_decision
    );
  }

  /**
   * Get the current analysis stage
   */
  static getAnalysisStage(state: AgentState): string {
    if (!this.areAnalystReportsComplete(state)) {
      return 'analyst_reports';
    }
    if (!this.isInvestmentDebateComplete(state)) {
      return 'investment_debate';
    }
    if (!this.isTradingPlanComplete(state)) {
      return 'trading_plan';
    }
    if (!this.isRiskManagementComplete(state)) {
      return 'risk_management';
    }
    return 'complete';
  }

  /**
   * Create initial investment debate state
   */
  static createInitialInvestDebateState(): InvestDebateState {
    return {
      bull_history: '',
      bear_history: '',
      history: '',
      current_response: '',
      judge_decision: '',
      count: 0,
    };
  }

  /**
   * Create initial risk debate state
   */
  static createInitialRiskDebateState(): RiskDebateState {
    return {
      risky_history: '',
      safe_history: '',
      neutral_history: '',
      history: '',
      latest_speaker: '',
      current_risky_response: '',
      current_safe_response: '',
      current_neutral_response: '',
      judge_decision: '',
      count: 0,
    };
  }
}