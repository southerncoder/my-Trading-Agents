
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Neutral Analyst Agent
 * Provides balanced risk assessment between aggressive and conservative approaches
 */
export class NeutralAnalyst extends AbstractAgent {
  private readonly logger = createLogger('agent', 'NeutralAnalyst');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Neutral Analyst',
      'Provides balanced risk assessment and mediates between aggressive and conservative approaches',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'NeutralAnalyst initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting neutral analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasTradingPlan: !!state.trader_investment_plan,
      hasRiskyResponse: !!state.risk_debate_state?.current_risky_response,
      hasSafeResponse: !!state.risk_debate_state?.current_safe_response,
      riskDebateCount: state.risk_debate_state?.count || 0
    });

    return await withLLMResilience(
      'neutral_analysis',
      async () => {
        // Create system prompt
        const systemPrompt = this.getSystemPrompt();
        
        // Create human message with context from trading plan and both risk analyses
        const humanMessage = this.createRiskAnalysisRequest(state);
        
        this.logger.debug('process', 'Invoking resilient LLM for neutral analysis', {
          systemPromptLength: systemPrompt.length,
          humanMessageLength: typeof humanMessage.content === 'string' ? humanMessage.content.length : 0
        });
        
        // Invoke resilient LLM
        const response = await this.resilientLLM.invoke([
          new SystemMessage(systemPrompt),
          humanMessage,
        ]);

        // Extract neutral analysis from response
        let neutralAnalysis = '';
        if (typeof response.content === 'string') {
          neutralAnalysis = response.content;
        } else if (Array.isArray(response.content)) {
          neutralAnalysis = response.content
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

        this.logger.info('process', 'Neutral analysis completed', {
          analysisLength: neutralAnalysis.length,
          company: state.company_of_interest
        });

        // Update risk debate state
        const currentRiskState = state.risk_debate_state || AgentStateHelpers.createInitialRiskDebateState();
        
        const updatedRiskState = {
          ...currentRiskState,
          neutral_history: currentRiskState.neutral_history ? 
            `${currentRiskState.neutral_history}\n\n${neutralAnalysis}` : 
            neutralAnalysis,
          current_neutral_response: neutralAnalysis,
          latest_speaker: this.name,
          count: currentRiskState.count + 1,
        };

        // Add response message to state
        const updatedMessages = [...state.messages, response];

        return {
          messages: updatedMessages,
          risk_debate_state: updatedRiskState,
          sender: this.name,
        };
      },
      OPENAI_LLM_CONFIG
    );
  }  getSystemPrompt(): string {
    return `You are a Neutral Analyst specializing in balanced risk assessment and finding optimal risk-reward equilibrium.

Your role in risk management:
- Provide balanced perspective between aggressive and conservative views
- Identify optimal risk-reward balance points
- Mediate between conflicting risk philosophies
- Synthesize best elements from both approaches
- Focus on rational, evidence-based risk decisions

Risk philosophy:
- Balance risk and reward based on evidence
- Neither excessive caution nor reckless aggression
- Adapt risk level to market conditions
- Optimize for long-term risk-adjusted returns
- Use data-driven risk assessment

Guidelines for balanced analysis:
- Evaluate merits of both aggressive and conservative approaches
- Find middle ground that optimizes risk-reward
- Consider market conditions and timing
- Balance conviction level with position sizing
- Focus on sustainable risk management
- Use quantitative risk metrics where possible

Output Format:
Provide balanced risk management recommendations in the following structure:

## Balanced Risk Analysis

### Risk-Reward Assessment
- Objective evaluation of opportunity vs. risk
- Optimal position sizing based on conviction
- Risk-adjusted return expectations
- Market condition considerations

### Balanced Strategy Synthesis
- Best elements from aggressive approach
- Best elements from conservative approach
- Optimal middle-ground positioning
- Adaptive risk management plan

### Evidence-Based Recommendations
- Data-driven risk assessment
- Quantitative risk metrics
- Historical precedent analysis
- Probability-weighted scenarios

### Mediation of Extremes
- Where aggressive approach goes too far
- Where conservative approach is too cautious
- Rational middle path identification
- Balanced implementation strategy

### Optimal Implementation
- Balanced execution approach
- Dynamic risk adjustment plan
- Monitoring and rebalancing strategy
- Scenario-based positioning

Be objective and analytical. Find the optimal balance between risk and reward based on evidence and rational analysis.`;
  }

  canProcess(state: AgentState): boolean {
    // Neutral analyst can process if both risky and safe analysts have provided input
    return super.canProcess(state) && 
           AgentStateHelpers.isTradingPlanComplete(state) &&
           !!(state.risk_debate_state?.current_risky_response) &&
           !!(state.risk_debate_state?.current_safe_response) &&
           !AgentStateHelpers.isRiskManagementComplete(state);
  }

  private createRiskAnalysisRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      trader_investment_plan,
      risk_debate_state
    } = state;
    
    const prompt = `Provide a balanced risk assessment by synthesizing the trading plan and risk analyst recommendations below for ${company_of_interest}.

TRADING PLAN:
${trader_investment_plan || 'Not available'}

RISKY ANALYST RECOMMENDATIONS:
${risk_debate_state?.current_risky_response || 'Not available'}

SAFE ANALYST RECOMMENDATIONS:
${risk_debate_state?.current_safe_response || 'Not available'}

Your task:
Analyze all perspectives and provide a balanced risk management approach that optimizes the risk-reward balance. Find the optimal middle ground between aggressive and conservative strategies based on evidence and rational analysis.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Create a balanced risk management strategy that incorporates the best elements from both aggressive and conservative approaches.`;

    return new HumanMessage(prompt);
  }
}