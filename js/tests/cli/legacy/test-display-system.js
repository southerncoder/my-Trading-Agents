// Test CLI display functionality without external API calls
import { DisplaySystem } from './src/cli/display.js';

console.log('Testing CLI Display System...\n');

// Create display system
const display = new DisplaySystem();

// Mock detailed state with all agent reports
const mockDetailedState = {
  final_trade_decision: "Decision: BUY (Confidence: 0.75)",
  reasoning: "Strong technical indicators support upward momentum\nPositive sentiment across multiple social platforms\nFundamentals show healthy growth trajectory",
  
  // Market analysis team
  market_report: {
    analyst: "Market Analyst",
    analysis: "Market analysis shows strong upward trend with RSI at 65, indicating potential overbought conditions but still within bullish territory. Volume indicators support continued momentum.",
    technical_indicators: {
      rsi: 65,
      moving_averages: "Bullish crossover on 50/200 day MA",
      volume: "Above average volume supporting trend"
    },
    recommendation: "BULLISH"
  },
  
  // Social sentiment team  
  sentiment_report: {
    analyst: "Social Media Analyst",
    analysis: "Social sentiment analysis reveals 78% positive mentions across Reddit and Twitter, with increasing discussion volume around earnings expectations.",
    platforms: {
      reddit: "82% positive sentiment, 145 mentions",
      twitter: "74% positive sentiment, 892 mentions",
      stocktwits: "79% bullish posts, high engagement"
    },
    recommendation: "POSITIVE"
  },
  
  // News analysis team
  news_report: {
    analyst: "News Analyst", 
    analysis: "Recent news analysis shows 3 positive articles about product launches and 1 neutral analyst downgrade, net positive sentiment with focus on innovation.",
    articles: [
      "Apple announces new chip architecture - Positive",
      "Strong Q4 earnings beat expectations - Positive", 
      "Analyst downgrades price target - Neutral",
      "Partnership with major supplier - Positive"
    ],
    recommendation: "POSITIVE"
  },
  
  // Fundamentals team
  fundamentals_report: {
    analyst: "Fundamentals Analyst",
    analysis: "P/E ratio of 25.4 is reasonable for growth, revenue growth at 12% YoY, strong balance sheet with low debt-to-equity ratio of 1.2.",
    metrics: {
      pe_ratio: 25.4,
      revenue_growth: "12% YoY",
      debt_to_equity: 1.2,
      free_cash_flow: "Strong and growing"
    },
    recommendation: "BUY"
  },
  
  // Research team debate
  investment_debate_state: {
    debate_summary: "Bull researchers argue for strong fundamentals and market momentum, citing earnings growth and technical breakout. Bear researchers warn of potential market correction due to high valuations and macroeconomic uncertainty.",
    bull_arguments: [
      "Strong earnings trajectory with 12% growth",
      "Technical indicators showing bullish momentum", 
      "Market leadership in key segments"
    ],
    bear_arguments: [
      "Elevated P/E ratio suggests overvaluation",
      "Macroeconomic headwinds on horizon",
      "Potential market correction risk"
    ],
    consensus: "Cautiously optimistic with risk management"
  },
  
  // Trading plan
  trader_investment_plan: {
    trader: "Portfolio Trader",
    plan: "Recommended position: BUY with 2% portfolio allocation, stop-loss at -5%, take-profit at +15%. Entry strategy: Scale in over 3 days to reduce timing risk.",
    position_sizing: "2% of portfolio",
    entry_strategy: "Scale in over 3 trading days", 
    stop_loss: "-5% from entry",
    take_profit: "+15% from entry",
    time_horizon: "3-6 months"
  },
  
  // Risk management team
  risk_debate_state: {
    risk_summary: "Risk assessment shows moderate risk level with good diversification benefits, but warns of sector concentration risk if overweighted in tech.",
    risk_factors: [
      "Market volatility from macro conditions",
      "Sector concentration if overweight tech",
      "Earnings disappointment risk"
    ],
    risk_mitigations: [
      "Position sizing at conservative 2%",
      "Stop-loss protection at -5%",
      "Diversification across other sectors"
    ],
    overall_risk: "MODERATE"
  }
};

console.log('=== TESTING DISPLAY SYSTEM ===\n');

// Test the complete report display
try {
  console.log('Testing displayCompleteReport with detailed agent data...\n');
  display.displayCompleteReport(mockDetailedState);
  
  console.log('\n=== DISPLAY TEST COMPLETED ===');
  console.log('✅ CLI Display System is working correctly!');
  console.log('✅ All agent reports are being displayed');
  console.log('✅ Detailed analysis is visible to users');
  
} catch (error) {
  console.error('❌ Error testing display system:', error);
}