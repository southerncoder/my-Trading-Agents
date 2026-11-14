
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { buildEvidenceBlock } from '../base/evidence';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Portfolio Manager Agent
 * Makes final trading decisions with comprehensive risk considerations
 */
export class PortfolioManager extends AbstractAgent {
  private readonly logger = createLogger('agent', 'PortfolioManager');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Portfolio Manager',
      'Makes final trading decisions by synthesizing all risk management perspectives and portfolio considerations',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'PortfolioManager initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting portfolio management decision', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasTradingPlan: !!state.trader_investment_plan,
      hasRiskyAnalysis: !!state.risk_debate_state?.current_risky_response,
      hasSafeAnalysis: !!state.risk_debate_state?.current_safe_response,
      hasNeutralAnalysis: !!state.risk_debate_state?.current_neutral_response,
      riskDebateCount: state.risk_debate_state?.count || 0
    });

    return await withLLMResilience(
      'portfolio_management',
      async () => {
        // Create system prompt
        const systemPrompt = this.getSystemPrompt();
        
        // Create human message with context from all risk analyses
        const humanMessage = this.createPortfolioManagementRequest(state);
        
        this.logger.debug('process', 'Invoking resilient LLM for portfolio decision', {
          systemPromptLength: systemPrompt.length,
          humanMessageLength: typeof humanMessage.content === 'string' ? humanMessage.content.length : 0
        });
        
        // Invoke resilient LLM
        const response = await this.resilientLLM.invoke([
          new SystemMessage(systemPrompt),
          humanMessage,
        ]);

        // Extract portfolio decision from response
        let portfolioDecision = '';
        if (typeof response.content === 'string') {
          portfolioDecision = response.content;
        } else if (Array.isArray(response.content)) {
          portfolioDecision = response.content
            .map(item => {
              if (typeof item === 'string') {
                return item;
              } else if (typeof item === 'object' && 'text' in item) {
                return (item as any).text;
              } else {
                return '';
              }
            })
            .filter(text => text.length > 0)
            .join('\n');
        }

        this.logger.info('process', 'Portfolio management decision completed', {
          decisionLength: portfolioDecision.length,
          company: state.company_of_interest
        });

        // Update risk debate state with final portfolio decision
        const currentRiskState = state.risk_debate_state || AgentStateHelpers.createInitialRiskDebateState();
        
        const updatedRiskState = {
          ...currentRiskState,
          judge_decision: portfolioDecision,
          history: `${currentRiskState.history}\n\nPORTFOLIO MANAGER DECISION:\n${portfolioDecision}`,
        };

        // Add response message to state
        const updatedMessages = [...state.messages, response];

        return {
          messages: updatedMessages,
          risk_debate_state: updatedRiskState,
          final_trade_decision: portfolioDecision,
          sender: this.name,
        };
      },
      OPENAI_LLM_CONFIG
    );
  }

  getSystemPrompt(): string {
    return `You are a Portfolio Manager responsible for making final trading decisions with comprehensive portfolio and risk considerations.

Your role and responsibilities:
- Make final trading decisions for the portfolio
- Balance individual trade merit with portfolio impact
- Consider overall portfolio risk and diversification
- Approve or reject trading recommendations
- Optimize portfolio-level risk-return characteristics

Decision-making framework:
- Evaluate trade merit within portfolio context
- Consider correlation with existing positions
- Assess portfolio concentration and diversification
- Balance risk budget allocation
- Optimize for portfolio-level objectives
- Make decisions based on total portfolio impact

Output Format:
Provide your final portfolio management decision in the following structure:

## Final Portfolio Management Decision

### Trade Decision
- APPROVED/REJECTED/MODIFIED with clear rationale
- Final position size and structure
- Implementation timeline and approach

### Portfolio Impact Analysis
- Effect on overall portfolio risk profile
- Diversification benefits or concentration concerns
- Correlation with existing positions
- Portfolio allocation optimization

### Risk Management Framework
- Final risk parameters and limits
- Stop-loss and take-profit levels
- Position monitoring requirements
- Risk budget allocation

### Risk Assessment Synthesis
- Evaluation of risky analyst recommendations
- Assessment of safe analyst concerns
- Integration of neutral analyst balance
- Final risk-reward optimization

### Implementation Plan
- Specific execution instructions
- Order types and timing requirements
- Market condition considerations
- Contingency planning

### Monitoring and Review
- Performance tracking metrics
- Review triggers and conditions
- Adjustment criteria and process
- Exit strategy refinement

### Portfolio Strategy Alignment
- Consistency with investment objectives
- Risk tolerance adherence
- Strategic asset allocation impact
- Long-term portfolio construction

Make decisive portfolio-level decisions that optimize overall portfolio performance while managing comprehensive risk considerations.`;
  }

  canProcess(state: AgentState): boolean {
    // Portfolio manager can process if all risk analysts have provided input
    return super.canProcess(state) && 
           AgentStateHelpers.isTradingPlanComplete(state) &&
           !!(state.risk_debate_state?.current_risky_response) &&
           !!(state.risk_debate_state?.current_safe_response) &&
           !!(state.risk_debate_state?.current_neutral_response) &&
           !AgentStateHelpers.isRiskManagementComplete(state);
  }

  private createPortfolioManagementRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      trader_investment_plan,
      risk_debate_state
    } = state;
    
    const prompt = `As Portfolio Manager, make the final trading decision for ${company_of_interest} based on all analyses below.

TRADING PLAN:
${trader_investment_plan || 'Not available'}

RISK MANAGEMENT ANALYSES:

RISKY ANALYST PERSPECTIVE:
${risk_debate_state?.current_risky_response || 'Not available'}

SAFE ANALYST PERSPECTIVE:
${risk_debate_state?.current_safe_response || 'Not available'}

NEUTRAL ANALYST PERSPECTIVE:
${risk_debate_state?.current_neutral_response || 'Not available'}

Your responsibility:
Decide the final action for this position: BUY, HOLD or SELL. Approving, rejecting or modifying the trading plan is part of your reasoning, but your final action must still be exactly one of BUY, HOLD or SELL. Consider portfolio-level implications, risk management requirements, and overall investment objectives. Provide specific implementation guidance.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Make a decisive portfolio management decision that optimizes risk-adjusted returns at the portfolio level.

CONFIDENCE RUBRIC (be honest; most real decisions fall between 0.40 and 0.70):
- 0.75 or higher: market, news and fundamentals independently agree, and a concrete near-term catalyst or trigger exists.
- 0.55 to 0.74: evidence mostly agrees but one report is weak, or key figures are missing.
- 0.35 to 0.54: signals conflict, or the main driver is unverified (for example, an unconfirmed headline).
- below 0.35: core data is missing. Any report marked UNAVAILABLE caps confidence at 0.60.

EVIDENCE RULES: use only the supplied evidence; tag each figure with its source in brackets, e.g. [market], [news], [fundamentals]; label news items you rely on as confirmed (primary source or several outlets) or unconfirmed. Never present an unconfirmed item as fact.

End your response with a single fenced JSON block, then these two lines, and nothing after them:
\`\`\`json
{"decision": "BUY|HOLD|SELL", "confidence": 0.00, "action_now": "enter_now|wait_for_trigger|hold_existing|reduce|exit", "rationale": "<=60 words", "key_risks": ["..."], "data_gaps": ["..."], "what_would_change_my_mind": "..."}
\`\`\`
FINAL DECISION: <exactly one word: BUY or HOLD or SELL>
CONFIDENCE: <a decimal between 0.00 and 1.00>
In the JSON, choose exactly one value for decision and for action_now (BUY means you would enter now; if you would wait for a trigger, the decision is HOLD). Replace all placeholders with real values; do not repeat the placeholder text.`;

    return new HumanMessage(prompt + buildEvidenceBlock(state));
  }
}