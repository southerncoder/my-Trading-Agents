import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState } from '../../types/agent-states';
import { RiskyAnalyst } from './risky-analyst';
import { SafeAnalyst } from './safe-analyst';
import { NeutralAnalyst } from './neutral-analyst';
import { PortfolioManager } from './portfolio-manager';

/**
 * Risk Manager Agent
 * Orchestrates comprehensive risk analysis across multiple risk perspectives
 * and makes final risk-informed trading decisions
 */
export class RiskManager extends AbstractAgent {
  private readonly logger = createLogger('agent', 'RiskManager');
  private readonly resilientLLM: BaseChatModel;
  private riskyAnalyst: RiskyAnalyst;
  private safeAnalyst: SafeAnalyst;
  private neutralAnalyst: NeutralAnalyst;
  private portfolioManager: PortfolioManager;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Risk Manager',
      'Orchestrates comprehensive risk analysis and makes final risk-informed trading decisions',
      llm,
      tools
    );

    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    // Initialize risk analysis components
    this.riskyAnalyst = new RiskyAnalyst(llm, tools);
    this.safeAnalyst = new SafeAnalyst(llm, tools);
    this.neutralAnalyst = new NeutralAnalyst(llm, tools);
    this.portfolioManager = new PortfolioManager(llm, tools);
    
    this.logger.info('constructor', 'RiskManager initialized with all risk analysis components', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting comprehensive risk analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasTradingPlan: !!state.trader_investment_plan
    });

    return await withLLMResilience(
      'risk_management_orchestration',
      async () => {
        // Step 1: Run all risk perspective analyses in parallel
        this.logger.debug('process', 'Starting parallel risk analyses', {
          analysisSteps: ['risky', 'safe', 'neutral']
        });
        
        const [riskyAnalysis, safeAnalysis, neutralAnalysis] = await Promise.all([
          this.riskyAnalyst.process(state),
          this.safeAnalyst.process(state),
          this.neutralAnalyst.process(state)
        ]);

        this.logger.info('process', 'All risk analyses completed', {
          riskyComplete: !!riskyAnalysis,
          safeComplete: !!safeAnalysis,
          neutralComplete: !!neutralAnalysis
        });

        // Step 2: Create aggregated state with risk analyses
        const aggregatedState: AgentState = {
          ...state,
          messages: [
            ...state.messages,
            ...(riskyAnalysis.messages || []),
            ...(safeAnalysis.messages || []),
            ...(neutralAnalysis.messages || [])
          ]
        };

        // Step 3: Portfolio manager makes final decision
        this.logger.debug('process', 'Portfolio manager making final decision');
        const finalDecision = await this.portfolioManager.process(aggregatedState);

        // Step 4: Create risk synthesis
        const riskSynthesis = await this.synthesizeRiskAssessment(state, finalDecision);

        this.logger.info('process', 'Comprehensive risk analysis completed', {
          hasFinalDecision: !!finalDecision,
          hasSynthesis: !!riskSynthesis,
          company: state.company_of_interest
        });

        return {
          ...finalDecision,
          messages: [
            ...(finalDecision.messages || state.messages),
            new HumanMessage(riskSynthesis)
          ]
        };
      },
      OPENAI_LLM_CONFIG
    );
  }

  /**
   * Synthesize comprehensive risk assessment
   */
  private async synthesizeRiskAssessment(
    _originalState: AgentState,
    finalDecision: Partial<AgentState>
  ): Promise<string> {
    try {
      const systemPrompt = `You are a Risk Synthesis Expert. Create a comprehensive risk assessment summary.

Your role is to:
1. Provide clear risk-based justification for trading decisions
2. Identify key risk factors and mitigation strategies
3. Assess overall risk levels and confidence
4. Format as a structured risk synthesis report

Be concise but thorough in your risk analysis.`;

      const humanMessage = `Please synthesize the risk analysis:

COMPANY: ${_originalState.company_of_interest}
DATE: ${_originalState.trade_date}
FINAL DECISION: ${finalDecision.final_trade_decision || 'No decision recorded'}

Please provide:
1. Risk level assessment (Low/Medium/High)
2. Key risk factors identified
3. Confidence in the decision (1-10)
4. Risk mitigation recommendations`;

      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(humanMessage)
      ]);

      return response.content.toString();

    } catch (error) {
      this.logger.error('synthesizeRiskAssessment', 'Error synthesizing risk assessment', {
        error: error instanceof Error ? error.message : String(error),
        finalDecision: finalDecision.final_trade_decision || 'Unknown'
      });
      return `Risk synthesis error: ${error}. Decision: ${finalDecision.final_trade_decision || 'Unknown'}`;
    }
  }

  /**
   * Get system prompt for risk manager
   */
  getSystemPrompt(): string {
    return `You are the Risk Manager, the final authority on risk assessment and trading decisions.

Your role is to:
1. Orchestrate comprehensive risk analysis across multiple perspectives
2. Synthesize risk assessments from risky, safe, and neutral analysts
3. Make final risk-informed trading decisions
4. Ensure proper risk management protocols are followed
5. Provide clear justification for all decisions

Key Principles:
- Always prioritize capital preservation
- Require strong consensus for high-risk trades
- Clearly document risk rationale
- Consider portfolio-wide impact
- Maintain strict risk controls

You have access to analyses from:
- Risky Analyst (aggressive growth perspective)
- Safe Analyst (conservative protection perspective) 
- Neutral Analyst (balanced evaluation perspective)
- Portfolio Manager (portfolio-wide considerations)

Make decisions that balance opportunity with prudent risk management.`;
  }
}