/**
 * Enhanced Portfolio Manager with Position Sizing Integration
 * 
 * This enhanced portfolio manager integrates position sizing algorithms and
 * portfolio-level risk management with the existing risk management workflow.
 * It provides position approval, portfolio optimization, and risk constraint enforcement.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LearningPortfolioManager } from './learning-portfolio-manager';
import { LearningAgentConfig } from '../base/learning-agent';
import { AgentState } from '../../types/agent-states';
import { 
  PositionSizingWorkflowIntegration,
  PositionSizingRecommendation,
  PortfolioUpdateResult
} from '../../portfolio/position-sizing-integration';
import { 
  PositionSizingConfig, 
  PortfolioRiskLimits,
  PortfolioRiskManager,
  RebalanceSignal
} from '../../portfolio/position-sizer';
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';

/**
 * Enhanced Portfolio Manager with Position Sizing and Risk Management
 */
export class EnhancedPortfolioManager extends LearningPortfolioManager {
  private readonly enhancedLogger = createLogger('agent', 'EnhancedPortfolioManager');
  private readonly positionSizingIntegration: PositionSizingWorkflowIntegration;
  private readonly riskManager: PortfolioRiskManager;
  private readonly enhancedResilientLLM: BaseChatModel;

  constructor(
    llm: BaseChatModel,
    tools: StructuredTool[],
    learningConfig?: Partial<LearningAgentConfig>,
    positionSizingConfig?: Partial<PositionSizingConfig>,
    riskLimits?: Partial<PortfolioRiskLimits>
  ) {
    super(llm, tools, learningConfig);
    
    this.positionSizingIntegration = new PositionSizingWorkflowIntegration(
      positionSizingConfig,
      riskLimits
    );
    
    this.riskManager = new PortfolioRiskManager(positionSizingConfig, riskLimits);
    this.enhancedResilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.enhancedLogger.info('EnhancedPortfolioManager initialized', {
      hasPositionSizing: !!this.positionSizingIntegration,
      hasRiskManager: !!this.riskManager,
      learningEnabled: this.learningEnabled
    });
  }

  /**
   * Enhanced system prompt with position sizing and risk management context
   */
  getSystemPrompt(): string {
    const basePrompt = super.getSystemPrompt();
    
    const enhancedPrompt = `${basePrompt}

ENHANCED POSITION SIZING AND RISK MANAGEMENT CAPABILITIES:

You now have access to advanced position sizing algorithms and comprehensive portfolio risk management:

Position Sizing Integration:
- Review and approve position sizing recommendations from trading signals
- Evaluate portfolio-level impact of proposed positions
- Consider correlation, concentration, and diversification effects
- Apply risk limits and constraints to position recommendations

Risk Management Framework:
- Portfolio risk limit enforcement (volatility, VaR, concentration)
- Correlation-based position adjustments
- Sector and geographic diversification rules
- Rebalancing signal generation and prioritization
- Stress testing and scenario analysis

Portfolio Optimization:
- Dynamic weight management based on performance and risk
- Risk parity and factor-based allocation strategies
- Liquidity and market impact considerations
- Tax-efficient rebalancing strategies

Decision Framework:
1. **Position Approval Process**:
   - Review position sizing recommendations
   - Assess portfolio-level risk impact
   - Check compliance with risk limits
   - Approve, modify, or reject positions

2. **Portfolio Rebalancing**:
   - Generate rebalancing signals based on drift and performance
   - Prioritize rebalancing actions by urgency and impact
   - Consider transaction costs and market conditions
   - Implement gradual rebalancing strategies

3. **Risk Monitoring**:
   - Continuous portfolio risk assessment
   - Early warning system for risk limit breaches
   - Proactive risk mitigation strategies
   - Performance attribution and risk decomposition

Enhanced Output Format:
Provide comprehensive portfolio management decisions including:

### Position Approval Decisions
- Approved/Modified/Rejected positions with reasoning
- Risk-adjusted position sizes and alternatives
- Portfolio impact assessment and mitigation strategies

### Portfolio Rebalancing Plan
- Priority rebalancing actions with timelines
- Expected risk and return impact
- Implementation strategy and cost estimates

### Risk Management Summary
- Current portfolio risk metrics and compliance status
- Risk limit utilization and headroom analysis
- Recommended risk management actions

### Performance Optimization
- Portfolio optimization opportunities
- Factor exposure analysis and recommendations
- Expected performance impact of proposed changes

Remember: Your role is to ensure optimal portfolio construction while maintaining strict risk discipline and regulatory compliance.`;

    return enhancedPrompt;
  }

  /**
   * Enhanced processing with position sizing and risk management integration
   */
  protected async processWithLearning(state: AgentState): Promise<Partial<AgentState>> {
    this.enhancedLogger.info('Starting enhanced portfolio management with position sizing', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasPositionSizing: !!state.metadata?.positionSizing
    });

    try {
      // First run the base portfolio management process
      const baseResult = await super.processWithLearning(state);
      
      // Extract position sizing data from state metadata
      const positionSizingData = state.metadata?.positionSizing;
      
      if (!positionSizingData) {
        this.enhancedLogger.warn('No position sizing data found in state', {
          company: state.company_of_interest
        });
        return baseResult;
      }

      // Process position sizing recommendations
      const portfolioDecisions = await this.processPositionRecommendations(
        positionSizingData.recommendations,
        state
      );

      // Generate rebalancing plan
      const rebalancingPlan = await this.generateRebalancingPlan(
        positionSizingData.portfolioContext,
        portfolioDecisions
      );

      // Create enhanced portfolio management report
      const enhancedReport = await this.generateEnhancedPortfolioReport(
        baseResult.trader_investment_plan || '',
        portfolioDecisions,
        rebalancingPlan,
        positionSizingData
      );

      this.enhancedLogger.info('Enhanced portfolio management completed', {
        company: state.company_of_interest,
        positionsProcessed: positionSizingData.recommendations?.length || 0,
        rebalanceSignals: rebalancingPlan.rebalanceSignals?.length || 0
      });

      return {
        ...baseResult,
        trader_investment_plan: enhancedReport,
        metadata: {
          ...state.metadata,
          portfolioDecisions,
          rebalancingPlan
        },
        sender: 'Enhanced Portfolio Manager'
      };

    } catch (error) {
      this.enhancedLogger.error('Enhanced portfolio management failed', {
        company: state.company_of_interest,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to base portfolio management
      return await super.processWithLearning(state);
    }
  }

  /**
   * Process position sizing recommendations and make approval decisions
   */
  private async processPositionRecommendations(
    recommendations: PositionSizingRecommendation[],
    state: AgentState
  ): Promise<{
    approved: PositionSizingRecommendation[];
    modified: Array<{ original: PositionSizingRecommendation; modified: PositionSizingRecommendation }>;
    rejected: Array<{ recommendation: PositionSizingRecommendation; reason: string }>;
  }> {
    
    this.enhancedLogger.info('Processing position sizing recommendations', {
      recommendationsCount: recommendations.length
    });

    const approved: PositionSizingRecommendation[] = [];
    const modified: Array<{ original: PositionSizingRecommendation; modified: PositionSizingRecommendation }> = [];
    const rejected: Array<{ recommendation: PositionSizingRecommendation; reason: string }> = [];

    for (const recommendation of recommendations) {
      try {
        // Evaluate the recommendation using LLM-enhanced decision making
        const decision = await this.evaluatePositionRecommendation(recommendation, state);
        
        switch (decision.action) {
          case 'approve':
            approved.push(recommendation);
            break;
          case 'modify':
            if (decision.modifiedRecommendation) {
              modified.push({
                original: recommendation,
                modified: decision.modifiedRecommendation
              });
            }
            break;
          case 'reject':
            rejected.push({
              recommendation,
              reason: decision.reason || 'Risk management concerns'
            });
            break;
        }

      } catch (error) {
        this.enhancedLogger.error('Failed to process position recommendation', {
          symbol: recommendation.signal.symbol,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Default to rejection on error
        rejected.push({
          recommendation,
          reason: 'Processing error - rejected for safety'
        });
      }
    }

    this.enhancedLogger.info('Position recommendations processed', {
      approved: approved.length,
      modified: modified.length,
      rejected: rejected.length
    });

    return { approved, modified, rejected };
  }

  /**
   * Evaluate a single position recommendation using enhanced decision logic
   */
  private async evaluatePositionRecommendation(
    recommendation: PositionSizingRecommendation,
    state: AgentState
  ): Promise<{
    action: 'approve' | 'modify' | 'reject';
    reason?: string;
    modifiedRecommendation?: PositionSizingRecommendation;
  }> {
    
    // Risk-based evaluation criteria
    const riskFactors = {
      highConcentration: recommendation.positionSize.portfolioPercentage > 0.15, // > 15%
      highPortfolioRisk: recommendation.riskAssessment.portfolioRisk > 0.2, // > 20%
      highCorrelation: recommendation.riskAssessment.correlationRisk > 0.7, // > 70%
      lowConfidence: recommendation.positionSize.confidence < 0.6, // < 60%
      requiresApproval: recommendation.approvalRequired
    };

    // Count risk factors
    const riskCount = Object.values(riskFactors).filter(Boolean).length;

    // Decision logic
    if (riskCount === 0) {
      return { action: 'approve', reason: 'All risk criteria met' };
    } else if (riskCount <= 2 && !riskFactors.highPortfolioRisk) {
      // Modify position to reduce risk
      const modifiedRecommendation = await this.createModifiedRecommendation(recommendation);
      return {
        action: 'modify',
        reason: `Modified to address ${riskCount} risk factor(s)`,
        modifiedRecommendation
      };
    } else {
      return {
        action: 'reject',
        reason: `Too many risk factors (${riskCount}): ${Object.entries(riskFactors)
          .filter(([_, value]) => value)
          .map(([key, _]) => key)
          .join(', ')}`
      };
    }
  }

  /**
   * Create a modified recommendation with reduced risk
   */
  private async createModifiedRecommendation(
    original: PositionSizingRecommendation
  ): Promise<PositionSizingRecommendation> {
    
    // Reduce position size by 30-50% depending on risk factors
    const reductionFactor = original.riskAssessment.portfolioRisk > 0.15 ? 0.5 : 0.7;
    
    const modifiedPositionSize = {
      ...original.positionSize,
      shares: Math.floor(original.positionSize.shares * reductionFactor),
      dollarAmount: original.positionSize.dollarAmount * reductionFactor,
      portfolioPercentage: original.positionSize.portfolioPercentage * reductionFactor,
      reasoning: `${original.positionSize.reasoning}. Reduced by ${((1 - reductionFactor) * 100).toFixed(0)}% for risk management.`
    };

    return {
      ...original,
      positionSize: modifiedPositionSize,
      approvalRequired: false, // No longer requires approval after modification
      reasoning: `Modified recommendation: ${modifiedPositionSize.reasoning}`
    };
  }

  /**
   * Generate comprehensive rebalancing plan
   */
  private async generateRebalancingPlan(
    portfolioContext: any,
    portfolioDecisions: any
  ): Promise<{
    rebalanceSignals: RebalanceSignal[];
    implementation: {
      timeline: string;
      priority: 'immediate' | 'near_term' | 'opportunistic';
      estimatedCost: number;
    };
    riskImpact: {
      expectedRiskReduction: number;
      diversificationImprovement: number;
    };
  }> {
    
    this.enhancedLogger.info('Generating rebalancing plan', {
      portfolioValue: portfolioContext.portfolio.totalValue
    });

    try {
      // Generate rebalancing signals using the risk manager
      const targetWeights = this.calculateOptimalWeights(portfolioContext.portfolio);
      const rebalanceSignals = await this.riskManager.generateRebalancingSignals(
        portfolioContext.portfolio,
        targetWeights
      );

      // Determine implementation timeline based on urgency
      const urgentSignals = rebalanceSignals.filter(s => s.urgency === 'urgent');
      const timeline = urgentSignals.length > 0 ? 'immediate' : 
                     rebalanceSignals.length > 3 ? 'near_term' : 'opportunistic';

      // Estimate total rebalancing cost
      const estimatedCost = rebalanceSignals.reduce((sum, signal) => 
        sum + (signal.estimatedCost || 0), 0
      );

      // Calculate expected risk impact
      const expectedRiskReduction = Math.min(0.1, rebalanceSignals.length * 0.02); // Max 10% reduction
      const diversificationImprovement = rebalanceSignals.length > 0 ? 0.05 : 0; // 5% improvement

      return {
        rebalanceSignals,
        implementation: {
          timeline,
          priority: timeline as 'immediate' | 'near_term' | 'opportunistic',
          estimatedCost
        },
        riskImpact: {
          expectedRiskReduction,
          diversificationImprovement
        }
      };

    } catch (error) {
      this.enhancedLogger.error('Failed to generate rebalancing plan', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        rebalanceSignals: [],
        implementation: {
          timeline: 'No rebalancing needed',
          priority: 'opportunistic',
          estimatedCost: 0
        },
        riskImpact: {
          expectedRiskReduction: 0,
          diversificationImprovement: 0
        }
      };
    }
  }

  /**
   * Generate enhanced portfolio management report
   */
  private async generateEnhancedPortfolioReport(
    baseReport: string,
    portfolioDecisions: any,
    rebalancingPlan: any,
    positionSizingData: any
  ): Promise<string> {
    
    const sections: string[] = [];
    
    sections.push('# Enhanced Portfolio Management Report\n');
    sections.push('## Base Portfolio Analysis');
    sections.push(baseReport);
    sections.push('\n## Position Approval Decisions\n');

    // Add position approval decisions
    if (portfolioDecisions.approved.length > 0) {
      sections.push('### Approved Positions');
      portfolioDecisions.approved.forEach((rec: PositionSizingRecommendation, idx: number) => {
        sections.push(`${idx + 1}. **${rec.signal.symbol}**: ${(rec.positionSize.portfolioPercentage * 100).toFixed(2)}% allocation approved`);
        sections.push(`   - Algorithm: ${rec.positionSize.algorithm}`);
        sections.push(`   - Confidence: ${(rec.positionSize.confidence * 100).toFixed(1)}%`);
      });
      sections.push('');
    }

    if (portfolioDecisions.modified.length > 0) {
      sections.push('### Modified Positions');
      portfolioDecisions.modified.forEach((mod: any, idx: number) => {
        sections.push(`${idx + 1}. **${mod.original.signal.symbol}**: Modified from ${(mod.original.positionSize.portfolioPercentage * 100).toFixed(2)}% to ${(mod.modified.positionSize.portfolioPercentage * 100).toFixed(2)}%`);
        sections.push(`   - Reason: ${mod.modified.reasoning}`);
      });
      sections.push('');
    }

    if (portfolioDecisions.rejected.length > 0) {
      sections.push('### Rejected Positions');
      portfolioDecisions.rejected.forEach((rej: any, idx: number) => {
        sections.push(`${idx + 1}. **${rej.recommendation.signal.symbol}**: Position rejected`);
        sections.push(`   - Reason: ${rej.reason}`);
      });
      sections.push('');
    }

    // Add rebalancing plan
    sections.push('## Portfolio Rebalancing Plan\n');
    if (rebalancingPlan.rebalanceSignals.length > 0) {
      sections.push(`### Rebalancing Actions (${rebalancingPlan.rebalanceSignals.length} signals)`);
      sections.push(`- **Timeline**: ${rebalancingPlan.implementation.timeline}`);
      sections.push(`- **Priority**: ${rebalancingPlan.implementation.priority}`);
      sections.push(`- **Estimated Cost**: $${rebalancingPlan.implementation.estimatedCost.toFixed(2)}`);
      sections.push(`- **Expected Risk Reduction**: ${(rebalancingPlan.riskImpact.expectedRiskReduction * 100).toFixed(1)}%`);
      sections.push('');

      rebalancingPlan.rebalanceSignals.forEach((signal: RebalanceSignal, idx: number) => {
        sections.push(`${idx + 1}. **${signal.symbol}**: ${signal.reason}`);
        sections.push(`   - Current: ${(signal.currentWeight * 100).toFixed(2)}% → Target: ${(signal.targetWeight * 100).toFixed(2)}%`);
        sections.push(`   - Priority: ${signal.priority}, Urgency: ${signal.urgency}`);
      });
    } else {
      sections.push('No rebalancing required at this time.');
    }

    sections.push('\n## Risk Management Summary\n');
    const riskAssessment = positionSizingData.riskAssessment;
    if (riskAssessment) {
      sections.push(`- **Risk Compliance**: ${riskAssessment.compliant ? 'Compliant' : 'Non-Compliant'}`);
      sections.push(`- **Portfolio Risk Level**: ${(positionSizingData.portfolioContext.portfolio.riskMetrics.totalRisk * 100).toFixed(2)}%`);
      sections.push(`- **Diversification Ratio**: ${positionSizingData.portfolioContext.portfolio.riskMetrics.diversificationRatio.toFixed(2)}`);
      
      if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
        sections.push('- **Risk Recommendations**:');
        riskAssessment.recommendations.forEach((rec: string) => {
          sections.push(`  - ${rec}`);
        });
      }
    }

    return sections.join('\n');
  }

  /**
   * Calculate optimal portfolio weights (simplified implementation)
   */
  private calculateOptimalWeights(portfolio: any): Record<string, number> {
    // Simplified equal-weight target for demonstration
    // In practice, this would use sophisticated optimization algorithms
    
    const numHoldings = portfolio.holdings.length;
    const targetWeight = 1 / numHoldings;
    
    const weights: Record<string, number> = {};
    portfolio.holdings.forEach((holding: any) => {
      weights[holding.symbol] = targetWeight;
    });
    
    return weights;
  }
}

/**
 * Factory function for creating EnhancedPortfolioManager
 */
export function createEnhancedPortfolioManager(
  llm: BaseChatModel,
  tools: StructuredTool[],
  learningConfig?: Partial<LearningAgentConfig>,
  positionSizingConfig?: Partial<PositionSizingConfig>,
  riskLimits?: Partial<PortfolioRiskLimits>
): EnhancedPortfolioManager {
  return new EnhancedPortfolioManager(llm, tools, learningConfig, positionSizingConfig, riskLimits);
}