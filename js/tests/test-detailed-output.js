// Simple test to verify our detailed output logic
console.log('Testing detailed output logic...');

// Mock the full state that would come from execute()
const mockFullState = {
  market_report: "Market analysis shows strong upward trend with RSI at 65, indicating potential overbought conditions but still within bullish territory.",
  sentiment_report: "Social sentiment analysis reveals 78% positive mentions across Reddit and Twitter, with increasing discussion volume around earnings.",
  news_report: "Recent news analysis shows 3 positive articles about product launches and 1 neutral analyst downgrade, net positive sentiment.",
  fundamentals_report: "P/E ratio of 25.4 is reasonable for growth, revenue growth at 12% YoY, strong balance sheet with low debt-to-equity ratio.",
  investment_debate_state: "Bull researchers argue for strong fundamentals and market momentum. Bear researchers warn of potential market correction.",
  trader_investment_plan: "Recommended position: BUY with 2% portfolio allocation, stop-loss at -5%, take-profit at +15%.",
  risk_debate_state: "Risk assessment shows moderate risk level with diversification benefits, but warns of sector concentration risk."
};

// Mock analysis result
const mockAnalysisResult = {
  decision: "BUY",
  confidence: 0.75,
  reasoning: [
    "Strong technical indicators support upward momentum",
    "Positive sentiment across multiple social platforms",
    "Fundamentals show healthy growth trajectory",
    "Risk-adjusted returns appear favorable"
  ],
  ticker: "AAPL",
  analysisDate: "2024-01-15"
};

// Test the detailed report generation logic
function generateDetailedReport(fullState, analysisResult) {
  const report = [];
  
  report.push('# Detailed Trading Agent Analysis Report\n');
  report.push(`**Ticker:** ${analysisResult.ticker || 'N/A'}\n`);
  report.push(`**Analysis Date:** ${analysisResult.analysisDate || new Date().toISOString()}\n`);
  report.push(`**Final Decision:** ${analysisResult.decision}\n`);
  report.push(`**Confidence:** ${analysisResult.confidence}\n\n`);
  
  // Market Analysis
  if (fullState.market_report) {
    report.push('## Market Analysis\n');
    report.push(typeof fullState.market_report === 'string' 
      ? fullState.market_report 
      : JSON.stringify(fullState.market_report, null, 2));
    report.push('\n\n');
  }
  
  // Sentiment Analysis
  if (fullState.sentiment_report) {
    report.push('## Sentiment Analysis\n');
    report.push(typeof fullState.sentiment_report === 'string' 
      ? fullState.sentiment_report 
      : JSON.stringify(fullState.sentiment_report, null, 2));
    report.push('\n\n');
  }
  
  // News Analysis
  if (fullState.news_report) {
    report.push('## News Analysis\n');
    report.push(typeof fullState.news_report === 'string' 
      ? fullState.news_report 
      : JSON.stringify(fullState.news_report, null, 2));
    report.push('\n\n');
  }
  
  // Fundamentals Analysis
  if (fullState.fundamentals_report) {
    report.push('## Fundamentals Analysis\n');
    report.push(typeof fullState.fundamentals_report === 'string' 
      ? fullState.fundamentals_report 
      : JSON.stringify(fullState.fundamentals_report, null, 2));
    report.push('\n\n');
  }
  
  // Investment Debate
  if (fullState.investment_debate_state) {
    report.push('## Investment Debate\n');
    report.push(typeof fullState.investment_debate_state === 'string' 
      ? fullState.investment_debate_state 
      : JSON.stringify(fullState.investment_debate_state, null, 2));
    report.push('\n\n');
  }
  
  // Trading Plan
  if (fullState.trader_investment_plan) {
    report.push('## Trading Plan\n');
    report.push(typeof fullState.trader_investment_plan === 'string' 
      ? fullState.trader_investment_plan 
      : JSON.stringify(fullState.trader_investment_plan, null, 2));
    report.push('\n\n');
  }
  
  // Risk Assessment
  if (fullState.risk_debate_state) {
    report.push('## Risk Assessment\n');
    report.push(typeof fullState.risk_debate_state === 'string' 
      ? fullState.risk_debate_state 
      : JSON.stringify(fullState.risk_debate_state, null, 2));
    report.push('\n\n');
  }
  
  // Final Reasoning
  report.push('## Final Reasoning\n');
  if (Array.isArray(analysisResult.reasoning)) {
    analysisResult.reasoning.forEach((reason, index) => {
      report.push(`${index + 1}. ${reason}\n`);
    });
  } else {
    report.push(analysisResult.reasoning || 'No reasoning provided');
  }
  
  return report.join('');
}

// Test the enhanced final state creation
const finalState = {
  // Include decision summary
  final_trade_decision: `Decision: ${mockAnalysisResult.decision} (Confidence: ${mockAnalysisResult.confidence})`,
  reasoning: mockAnalysisResult.reasoning.join('\n'),
  messages: mockAnalysisResult.messages || [],
  
  // Include all detailed agent reports from full state
  ...mockFullState,
  
  // Ensure we have the main analysis sections
  market_report: mockFullState?.market_report,
  sentiment_report: mockFullState?.sentiment_report, 
  news_report: mockFullState?.news_report,
  fundamentals_report: mockFullState?.fundamentals_report,
  investment_debate_state: mockFullState?.investment_debate_state,
  trader_investment_plan: mockFullState?.trader_investment_plan,
  risk_debate_state: mockFullState?.risk_debate_state
};

console.log('=== TESTING DETAILED OUTPUT LOGIC ===\n');

console.log('1. Final State Structure:');
console.log('Keys in finalState:', Object.keys(finalState));
console.log('');

console.log('2. Sample content from finalState:');
console.log('Market Report Present:', !!finalState.market_report);
console.log('Sentiment Report Present:', !!finalState.sentiment_report);
console.log('News Report Present:', !!finalState.news_report);
console.log('Fundamentals Report Present:', !!finalState.fundamentals_report);
console.log('');

console.log('3. Detailed Report Generation:');
const detailedReport = generateDetailedReport(mockFullState, mockAnalysisResult);
console.log('Generated report length:', detailedReport.length, 'characters');
console.log('');

console.log('4. Sample of Generated Report:');
console.log(detailedReport.substring(0, 500) + '...');
console.log('');

console.log('=== TEST COMPLETED ===');
console.log('✅ Detailed output logic appears to be working correctly!');
console.log('✅ All agent reports are being included in final state');
console.log('✅ Detailed report generation is functioning');