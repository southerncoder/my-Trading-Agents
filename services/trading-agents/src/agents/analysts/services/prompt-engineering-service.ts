import { HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../../../types/agent-states';

/**
 * Prompt Engineering Service
 * Handles prompt creation and enhancement for fundamentals analysis
 */
export class PromptEngineeringService {
  /**
   * Get enhanced system prompt with learning context
   */
  getSystemPrompt(): string {
    return `You are a Fundamentals Analyst with advanced learning capabilities specializing in financial statement analysis and company valuation.

Your responsibilities include:
1. Analyzing financial statements (income, balance sheet, cash flow)
2. Evaluating key financial metrics and ratios
3. Assessing company valuation and intrinsic value
4. Comparing performance against industry peers
5. Identifying fundamental strengths and weaknesses

LEARNING CAPABILITIES:
- Valuation Pattern Recognition: You learn from successful valuation predictions
- Financial Health Clustering: You detect patterns in financial metrics
- Analysis Strategy Optimization: You adapt your valuation methodology based on historical accuracy

ANALYSIS FRAMEWORK:
1. Financial Performance: Revenue growth, profitability trends, key ratios
2. Balance Sheet Analysis: Asset quality, debt levels, capital structure
3. Cash Flow Evaluation: Operating cash flow, free cash flow, liquidity
4. Valuation Assessment: Multiples, DCF, peer comparison
5. Risk Assessment: Financial stability, competitive positioning

OUTPUT FORMAT:
Provide a comprehensive fundamental analysis report in a structured format with:
- Financial Performance Summary
- Balance Sheet Analysis
- Valuation Assessment
- Growth Prospects
- Risk Factors
- Investment Recommendation

Remember: Your analysis improves over time through learning from market outcomes and valuation accuracy.`;
  }

  /**
   * Create enhanced system prompt with learned insights
   */
  createEnhancedSystemPrompt(highConfidenceInsights: any[]): string {
    let basePrompt = this.getSystemPrompt();

    if (highConfidenceInsights.length > 0) {
      basePrompt += '\n\nLEARNED INSIGHTS TO CONSIDER:\n';
      for (const insight of highConfidenceInsights.slice(0, 3)) { // Limit to top 3
        basePrompt += `- ${insight.description} (Confidence: ${(insight.confidence_score * 100).toFixed(1)}%)\n`;
      }
    }

    return basePrompt;
  }

  /**
   * Create enhanced analysis request with learning context
   */
  createEnhancedAnalysisRequest(state: AgentState, learnedInsights: any[]): HumanMessage {
    const baseRequest = `Perform a comprehensive fundamental analysis for ${state.company_of_interest} as of ${state.trade_date}.

Consider the following context:
- Company: ${state.company_of_interest}
- Analysis Date: ${state.trade_date}
- Previous Analysis: ${state.fundamentals_report || 'None'}`;

    let enhancedRequest = baseRequest;

    // Add relevant learned insights
    const relevantInsights = learnedInsights.filter(i =>
      i.description.toLowerCase().includes(state.company_of_interest.toLowerCase()) ||
      i.description.toLowerCase().includes('valuation') ||
      i.description.toLowerCase().includes('fundamental') ||
      i.description.toLowerCase().includes('financial')
    );

    if (relevantInsights.length > 0) {
      enhancedRequest += '\n\nRelevant Learned Patterns:';
      for (const insight of relevantInsights.slice(0, 2)) {
        enhancedRequest += `\n- ${insight.description}`;
      }
    }

    return new HumanMessage(enhancedRequest);
  }
}

/**
 * Factory function to create PromptEngineeringService instance
 */
export function createPromptEngineeringService(): PromptEngineeringService {
  return new PromptEngineeringService();
}