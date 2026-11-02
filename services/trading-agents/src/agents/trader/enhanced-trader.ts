/**
 * Enhanced Trader Agent with Position Sizing Integration
 * 
 * This enhanced trader integrates position sizing algorithms with the existing
 * trading workflow to provide comprehensive trading recommendations including
 * optimal position sizes, risk management, and portfolio-level considerations.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Trader } from './trader';
import { AgentState } from '../../types/agent-states';
import { TradingSignal, SignalType, SignalStrength, RiskLevel } from '../../strategies/base-strategy';
import { 
  PositionSizingWorkflowIntegration,
  EnhancedTradingSignal,
  PositionSizingRecommendation,
  PositionSizingContext
} from '../../portfolio/position-sizing-integration';
import { PositionSizingConfig, PortfolioRiskLimits } from '../../portfolio/position-sizer';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Enhanced Trader with Position Sizing Capabilities
 */
export class EnhancedTrader extends Trader {
  private readonly enhancedLogger = createLogger('agent', 'EnhancedTrader');
  private readonly positionSizingIntegration: PositionSizingWorkflowIntegration;
  private readonly enhancedResilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools?: StructuredTool[],
    positionSizingConfig?: Partial<PositionSizingConfig>,
    riskLimits?: Partial<PortfolioRiskLimits>
  ) {
    super(llm, tools);
    
    this.positionSizingIntegration = new PositionSizingWorkflowIntegration(
      positionSizingConfig,
      riskLimits
    );
    
    this.enhancedResilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.enhancedLogger.info('EnhancedTrader initialized with position sizing integration', {
      hasPositionSizing: !!this.positionSizingIntegration,
      llmType: llm.constructor.name
    });
  }

  /**
   * Enhanced processing with position sizing integration
   */
  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.enhancedLogger.info('Starting enhanced trading process with position sizing', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasInvestmentPlan: !!state.investment_plan
    });

    try {
      // First, run the base trader process to get initial trading plan
      const baseResult = await super.process(state);
      
      // Extract trading signals from the base result
      const tradingSignals = this.extractTradingSignals(baseResult.trader_investment_plan || '');
      
      if (tradingSignals.length === 0) {
        this.enhancedLogger.warn('No trading signals extracted from base trader result', {
          company: state.company_of_interest
        });
        return baseResult;
      }

      // Integrate position sizing with the signals
      const positionSizingResult = await this.positionSizingIntegration.integrateWithAgentState(
        { ...state, ...baseResult },
        tradingSignals
      );

      // Generate enhanced trading plan with position sizing
      const enhancedTradingPlan = await this.generateEnhancedTradingPlan(
        baseResult.trader_investment_plan || '',
        tradingSignals,
        positionSizingResult.metadata?.positionSizing
      );

      this.enhancedLogger.info('Enhanced trading process completed successfully', {
        company: state.company_of_interest,
        signalsProcessed: tradingSignals.length,
        hasPositionSizing: !!positionSizingResult.metadata?.positionSizing
      });

      return {
        ...baseResult,
        ...positionSizingResult,
        trader_investment_plan: enhancedTradingPlan,
        sender: 'Enhanced Trader'
      };

    } catch (error) {
      this.enhancedLogger.error('Enhanced trading process failed', {
        company: state.company_of_interest,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to base trader result
      return await super.process(state);
    }
  }

  /**
   * Get enhanced system prompt that includes position sizing guidance
   */
  getSystemPrompt(): string {
    const basePrompt = super.getSystemPrompt();
    
    const positionSizingAddendum = `

ENHANCED POSITION SIZING CAPABILITIES:
You now have access to advanced position sizing algorithms and portfolio risk management:

Position Sizing Algorithms:
- Kelly Criterion: Optimal position sizing based on win rate and risk-reward ratio
- Risk Parity: Equal risk contribution across portfolio positions
- Volatility-Adjusted: Position size inversely related to asset volatility
- Confidence-Based: Position size scaled by signal confidence and historical accuracy

Portfolio Risk Management:
- Concentration limits: Maximum position and sector allocations
- Correlation analysis: Reduce position sizes for highly correlated assets
- Diversification rules: Maintain minimum number of positions
- Risk limit enforcement: Portfolio volatility and VaR constraints

Integration Guidelines:
1. Always consider portfolio-level impact when recommending position sizes
2. Adjust position sizes based on correlation with existing holdings
3. Respect risk limits and concentration constraints
4. Provide reasoning for position sizing recommendations
5. Include alternative position sizes for different risk tolerances

Enhanced Output Format:
In addition to the standard trading plan, include:

### Position Sizing Analysis
- Recommended position size with algorithm used
- Portfolio impact assessment (risk, correlation, concentration)
- Risk-adjusted alternatives (conservative, moderate, aggressive)
- Approval requirements and reasoning

### Portfolio Integration
- Current portfolio context and constraints
- Rebalancing recommendations if needed
- Risk limit compliance status
- Diversification impact analysis

Remember: Position sizing is as important as signal generation for successful trading outcomes.`;

    return basePrompt + positionSizingAddendum;
  }

  /**
   * Extract trading signals from trading plan text
   */
  private extractTradingSignals(tradingPlan: string): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    try {
      // Parse trading plan to extract signals
      // This is a simplified extraction - in practice would use more sophisticated parsing
      
      const lines = tradingPlan.split('\n');
      let currentSignal: Partial<TradingSignal> = {};
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        
        // Extract action
        if (lowerLine.includes('buy') || lowerLine.includes('long')) {
          currentSignal.signal = SignalType.BUY;
        } else if (lowerLine.includes('sell') || lowerLine.includes('short')) {
          currentSignal.signal = SignalType.SELL;
        } else if (lowerLine.includes('hold')) {
          currentSignal.signal = SignalType.HOLD;
        }
        
        // Extract confidence (look for percentages)
        const confidenceMatch = line.match(/(\d+)%/);
        if (confidenceMatch) {
          currentSignal.confidence = parseInt(confidenceMatch[1]);
        }
        
        // Extract price (look for dollar amounts)
        const priceMatch = line.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          currentSignal.price = parseFloat(priceMatch[1]);
        }
        
        // If we have enough information, create a signal
        if (currentSignal.signal && currentSignal.price) {
          const signal: TradingSignal = {
            symbol: 'UNKNOWN', // Would extract from context
            signal: currentSignal.signal,
            strength: SignalStrength.MODERATE,
            confidence: currentSignal.confidence || 70,
            timestamp: new Date(),
            price: currentSignal.price,
            reasoning: tradingPlan,
            riskLevel: RiskLevel.MODERATE,
            metadata: { source: 'enhanced-trader' }
          };
          
          signals.push(signal);
          currentSignal = {}; // Reset for next signal
        }
      }
      
      // If no signals were extracted, create a default signal
      if (signals.length === 0) {
        signals.push({
          symbol: 'DEFAULT',
          signal: SignalType.HOLD,
          strength: SignalStrength.MODERATE,
          confidence: 50,
          timestamp: new Date(),
          price: 100, // Placeholder
          reasoning: 'Default signal from trading plan analysis',
          riskLevel: RiskLevel.MODERATE,
          metadata: { source: 'enhanced-trader-default' }
        });
      }

    } catch (error) {
      this.enhancedLogger.error('Failed to extract trading signals', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return signals;
  }

  /**
   * Generate enhanced trading plan with position sizing information
   */
  private async generateEnhancedTradingPlan(
    basePlan: string,
    signals: TradingSignal[],
    positionSizingData?: any
  ): Promise<string> {
    
    this.enhancedLogger.info('Generating enhanced trading plan', {
      basePlanLength: basePlan.length,
      signalsCount: signals.length,
      hasPositionSizing: !!positionSizingData
    });

    try {
      if (!positionSizingData) {
        return basePlan; // Return base plan if no position sizing data
      }

      const { enhancedSignals, recommendations, portfolioContext, riskAssessment } = positionSizingData;

      // Create enhanced plan with position sizing information
      const enhancedSections: string[] = [];
      
      enhancedSections.push('# Enhanced Trading Plan with Position Sizing\n');
      enhancedSections.push('## Base Trading Analysis');
      enhancedSections.push(basePlan);
      enhancedSections.push('\n## Position Sizing Analysis\n');

      // Add position sizing recommendations for each signal
      for (let i = 0; i < recommendations.length; i++) {
        const recommendation = recommendations[i];
        const enhancedSignal = enhancedSignals[i];
        
        enhancedSections.push(`### Signal ${i + 1}: ${recommendation.signal.symbol}`);
        enhancedSections.push(`- **Action**: ${recommendation.signal.signal}`);
        enhancedSections.push(`- **Recommended Position Size**: ${(recommendation.positionSize.portfolioPercentage * 100).toFixed(2)}% of portfolio`);
        enhancedSections.push(`- **Dollar Amount**: $${recommendation.positionSize.dollarAmount.toFixed(2)}`);
        enhancedSections.push(`- **Shares**: ${recommendation.positionSize.shares}`);
        enhancedSections.push(`- **Algorithm Used**: ${recommendation.positionSize.algorithm}`);
        enhancedSections.push(`- **Confidence**: ${(recommendation.positionSize.confidence * 100).toFixed(1)}%`);
        enhancedSections.push(`- **Risk Adjustment**: ${recommendation.positionSize.riskAdjustment.toFixed(2)}x`);
        enhancedSections.push(`- **Approval Required**: ${recommendation.approvalRequired ? 'Yes' : 'No'}`);
        enhancedSections.push(`- **Reasoning**: ${recommendation.reasoning}`);
        
        if (recommendation.alternatives && recommendation.alternatives.length > 0) {
          enhancedSections.push('- **Alternatives**:');
          recommendation.alternatives.forEach((alt, idx) => {
            enhancedSections.push(`  - Option ${idx + 1}: ${(alt.portfolioPercentage * 100).toFixed(2)}% (${alt.algorithm})`);
          });
        }
        
        enhancedSections.push('');
      }

      // Add portfolio context
      enhancedSections.push('## Portfolio Context');
      enhancedSections.push(`- **Total Portfolio Value**: $${portfolioContext.portfolio.totalValue.toFixed(2)}`);
      enhancedSections.push(`- **Available Cash**: $${portfolioContext.availableCash.toFixed(2)}`);
      enhancedSections.push(`- **Risk Tolerance**: ${portfolioContext.riskTolerance}`);
      enhancedSections.push(`- **Investment Horizon**: ${portfolioContext.investmentHorizon}`);
      enhancedSections.push(`- **Market Conditions**: ${portfolioContext.marketConditions}`);
      enhancedSections.push('');

      // Add risk assessment
      if (riskAssessment) {
        enhancedSections.push('## Risk Assessment');
        enhancedSections.push(`- **Compliant**: ${riskAssessment.compliant ? 'Yes' : 'No'}`);
        
        if (riskAssessment.violations && riskAssessment.violations.length > 0) {
          enhancedSections.push('- **Violations**:');
          riskAssessment.violations.forEach((violation: string) => {
            enhancedSections.push(`  - ${violation}`);
          });
        }
        
        if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
          enhancedSections.push('- **Recommendations**:');
          riskAssessment.recommendations.forEach((rec: string) => {
            enhancedSections.push(`  - ${rec}`);
          });
        }
      }

      const enhancedPlan = enhancedSections.join('\n');

      this.enhancedLogger.info('Enhanced trading plan generated successfully', {
        originalLength: basePlan.length,
        enhancedLength: enhancedPlan.length,
        sectionsAdded: enhancedSections.length
      });

      return enhancedPlan;

    } catch (error) {
      this.enhancedLogger.error('Failed to generate enhanced trading plan', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return basePlan; // Return base plan as fallback
    }
  }
}

/**
 * Factory function for creating EnhancedTrader
 */
export function createEnhancedTrader(
  llm: BaseChatModel,
  tools?: StructuredTool[],
  positionSizingConfig?: Partial<PositionSizingConfig>,
  riskLimits?: Partial<PortfolioRiskLimits>
): EnhancedTrader {
  return new EnhancedTrader(llm, tools, positionSizingConfig, riskLimits);
}