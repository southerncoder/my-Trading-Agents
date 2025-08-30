# Agent Specifications

## Overview

This document provides detailed specifications for all trading agents in the system. Each agent has specific responsibilities, inputs, outputs, and behavior patterns.

## Agent Architecture

### Base Agent Structure
All agents extend the `AbstractAgent` base class which provides:
- LLM integration with tool binding
- State validation and processing
- Error handling and logging
- Message creation and response formatting

### Agent Categories

1. **Analyst Team**: Parallel data gathering and analysis
2. **Research Team**: Debate-style investment research
3. **Trading Team**: Strategy creation and planning
4. **Risk Management Team**: Multi-perspective risk assessment

## Detailed Agent Specifications

### Analyst Team

#### Market Analyst
- **Purpose**: Technical analysis and market data interpretation
- **Input**: Company ticker, analysis date, market data tools
- **Output**: `market_report` with technical analysis
- **Key Responsibilities**:
  - Price movement and trend analysis
  - Technical indicator evaluation (RSI, MACD, moving averages)
  - Volume and momentum assessment
  - Support/resistance level identification
- **Tools Used**: Yahoo Finance API, Technical Indicators API
- **Processing Time**: Parallel with other analysts

#### Social Analyst
- **Purpose**: Social media sentiment and public opinion analysis
- **Input**: Company ticker, analysis date, social media tools
- **Output**: `sentiment_report` with social sentiment analysis
- **Key Responsibilities**:
  - Reddit discussion analysis
  - Social media sentiment tracking
  - Public opinion trend identification
  - Influencer impact assessment
- **Tools Used**: Reddit API, Social media APIs
- **Processing Time**: Parallel with other analysts

#### News Analyst
- **Purpose**: News event analysis and market impact assessment
- **Input**: Company ticker, analysis date, news tools
- **Output**: `news_report` with news impact analysis
- **Key Responsibilities**:
  - Recent news event analysis
  - Market-moving announcement identification
  - Global event impact assessment
  - News sentiment evaluation
- **Tools Used**: Google News API, Finnhub News API
- **Processing Time**: Parallel with other analysts

#### Fundamentals Analyst
- **Purpose**: Financial statement and company fundamental analysis
- **Input**: Company ticker, analysis date, financial data tools
- **Output**: `fundamentals_report` with financial analysis
- **Key Responsibilities**:
  - Financial statement analysis
  - Valuation metric evaluation
  - Industry comparison
  - Growth prospect assessment
- **Tools Used**: SimFin API, Finnhub Financial API
- **Processing Time**: Parallel with other analysts

### Research Team

#### Bull Researcher
- **Purpose**: Develop positive investment thesis
- **Input**: All analyst reports
- **Output**: Updates `investment_debate_state.bull_history`
- **Key Responsibilities**:
  - Identify growth catalysts
  - Highlight competitive advantages
  - Build bullish arguments
  - Counter bearish concerns
- **Processing Time**: After all analyst reports complete

#### Bear Researcher
- **Purpose**: Develop risk-focused investment thesis
- **Input**: All analyst reports + bull arguments
- **Output**: Updates `investment_debate_state.bear_history`
- **Key Responsibilities**:
  - Identify risk factors
  - Highlight potential threats
  - Build bearish arguments
  - Counter bullish assumptions
- **Processing Time**: After bull researcher completes

#### Research Manager
- **Purpose**: Synthesize research and make investment decision
- **Input**: Bull and bear research arguments
- **Output**: `investment_plan` and `investment_debate_state.judge_decision`
- **Key Responsibilities**:
  - Evaluate argument quality
  - Make balanced investment recommendation
  - Synthesize research findings
  - Provide clear rationale
- **Processing Time**: After both researchers complete

### Trading Team

#### Trader
- **Purpose**: Create concrete trading strategies
- **Input**: Investment plan from research team
- **Output**: `trader_investment_plan` with specific strategy
- **Key Responsibilities**:
  - Convert research into actionable trades
  - Set entry/exit points
  - Define position sizing
  - Create risk management rules
- **Processing Time**: After research team completes

### Risk Management Team

#### Risky Analyst
- **Purpose**: Advocate for aggressive risk-taking strategies
- **Input**: Trading plan
- **Output**: Updates `risk_debate_state.current_risky_response`
- **Key Responsibilities**:
  - Maximize return potential
  - Identify leverage opportunities
  - Challenge conservative approaches
  - Optimize for high returns
- **Processing Time**: After trader completes

#### Safe Analyst
- **Purpose**: Advocate for conservative risk management
- **Input**: Trading plan + risky analyst recommendations
- **Output**: Updates `risk_debate_state.current_safe_response`
- **Key Responsibilities**:
  - Prioritize capital preservation
  - Identify downside risks
  - Challenge aggressive approaches
  - Emphasize risk mitigation
- **Processing Time**: After risky analyst completes

#### Neutral Analyst
- **Purpose**: Provide balanced risk assessment
- **Input**: Trading plan + both risk perspectives
- **Output**: Updates `risk_debate_state.current_neutral_response`
- **Key Responsibilities**:
  - Balance risk and reward
  - Mediate between extremes
  - Provide objective analysis
  - Find optimal middle ground
- **Processing Time**: After both risk analysts complete

#### Portfolio Manager
- **Purpose**: Make final trading decisions
- **Input**: Trading plan + all risk analyses
- **Output**: `final_trade_decision` and `risk_debate_state.judge_decision`
- **Key Responsibilities**:
  - Make final approve/reject decision
  - Consider portfolio implications
  - Balance all risk perspectives
  - Provide implementation guidance
- **Processing Time**: After all risk analysts complete

## Agent Interaction Patterns

### State Flow
```
Initial State → Analysts (Parallel) → Researchers (Sequential) → Trader → Risk Team (Sequential) → Final Decision
```

### Data Dependencies
- **Analysts**: Independent, only need ticker and date
- **Researchers**: Depend on all analyst reports
- **Trader**: Depends on research team decision
- **Risk Team**: Depends on trading plan
- **Portfolio Manager**: Depends on all risk perspectives

### Error Handling
- Each agent validates input state before processing
- Agents return partial state updates on success
- Comprehensive error logging and recovery
- Graceful degradation when tools are unavailable

## Performance Characteristics

### Expected Processing Times
- **Analysts**: 30-60 seconds each (parallel)
- **Researchers**: 45-90 seconds each (sequential)
- **Trader**: 60-120 seconds
- **Risk Team**: 30-60 seconds each (sequential)
- **Total Workflow**: 5-10 minutes end-to-end

### Resource Requirements
- **Memory**: ~100MB per agent session
- **API Calls**: 20-50 per workflow execution
- **Token Usage**: 10K-50K tokens per workflow

### Scalability Considerations
- Parallel analyst execution reduces total time
- Agent state is immutable for thread safety
- Tools are stateless and cacheable
- Memory systems are isolated per workflow

---

**Last Updated**: August 24, 2025
**Version**: 1.0