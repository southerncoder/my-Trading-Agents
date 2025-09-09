
import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base/index';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Research Manager Agent
 * Synthesizes research from bull and bear researchers and makes final investment decisions
 */
export class ResearchManager extends AbstractAgent {
  private readonly logger = createLogger('agent', 'ResearchManager');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Research Manager',
      'Synthesizes bull and bear research arguments to make balanced investment recommendations',
      llm,
      tools
    );
    
    // Create resilient LLM wrapper with OpenAI-optimized configuration
    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);
    
    this.logger.info('constructor', 'ResearchManager initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting research management synthesis process', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasBullHistory: !!(state.investment_debate_state?.bull_history),
      hasBearHistory: !!(state.investment_debate_state?.bear_history),
      hasJudgeDecision: !!(state.investment_debate_state?.judge_decision)
    });

    try {
      // Create system prompt
      const systemPrompt = this.getSystemPrompt();
      
      // Create human message with context from research debate
      const humanMessage = this.createManagementRequest(state);
      
      this.logger.debug('process', 'Prepared LLM messages for research synthesis', {
        systemPromptLength: systemPrompt.length,
        humanMessageLength: humanMessage.content.toString().length
      });

      // Use resilient LLM wrapper for research synthesis
      const response = await withLLMResilience(
        'ResearchManager.synthesize',
        async () => {
          return await this.resilientLLM.invoke([
            new SystemMessage(systemPrompt),
            humanMessage,
          ]);
        },
        OPENAI_LLM_CONFIG
      );

      this.logger.info('process', 'LLM research synthesis completed successfully', {
        responseType: typeof response.content,
        hasToolCalls: response.tool_calls && response.tool_calls.length > 0
      });

      // Extract management decision from response
      let managementDecision = '';
      if (typeof response.content === 'string') {
        managementDecision = response.content;
      } else if (Array.isArray(response.content)) {
        managementDecision = response.content
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

      this.logger.info('process', 'Research management decision extracted successfully', {
        decisionLength: managementDecision.length,
        company: state.company_of_interest
      });

      // Update investment debate state with final decision
      const currentDebateState = state.investment_debate_state || AgentStateHelpers.createInitialInvestDebateState();
      
      const updatedDebateState = {
        ...currentDebateState,
        judge_decision: managementDecision,
        history: `${currentDebateState.history}\n\nRESEARCH MANAGER DECISION:\n${managementDecision}`,
      };

      // Add response message to state
      const updatedMessages = [...state.messages, response];

      return {
        messages: updatedMessages,
        investment_debate_state: updatedDebateState,
        investment_plan: managementDecision,
        sender: this.name,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.logger.error('process', `Research synthesis failed for ${state.company_of_interest}`, {
        error: errorMsg,
        company: state.company_of_interest,
        tradeDate: state.trade_date,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      throw new Error(`${this.name} failed to process: ${errorMsg}`);
    }
  }

  getSystemPrompt(): string {
    return `You are a Research Manager responsible for synthesizing investment research and making balanced decisions.

Your role and responsibilities:
- Evaluate both bullish and bearish investment arguments
- Synthesize complex research findings into clear recommendations
- Make objective investment decisions based on evidence
- Balance optimism and caution in investment recommendations
- Provide clear rationale for investment decisions

Decision-making approach:
- Weigh the strength of bull vs. bear arguments objectively
- Consider risk-adjusted return potential
- Evaluate the quality and credibility of evidence presented
- Make decisions based on preponderance of evidence
- Acknowledge uncertainties and limitations in analysis

Output Format:
Provide your research management decision in the following structure:

## Research Management Decision

### Bull vs. Bear Analysis
- Summary of key bull arguments and their strength
- Summary of key bear arguments and their strength
- Comparative evaluation of argument quality

### Evidence Assessment
- Most compelling data points and evidence
- Areas of agreement between bull and bear cases
- Key disagreements and their resolution

### Investment Recommendation
- Clear recommendation (STRONG BUY/BUY/HOLD/SELL/STRONG SELL)
- Confidence level in the recommendation
- Time horizon for the investment thesis

### Risk-Reward Assessment
- Expected return potential and probability
- Key risk factors and mitigation strategies
- Scenario analysis (bull/base/bear cases)

### Rationale
- Primary reasons supporting the decision
- Key factors that tipped the balance
- Conditions that could change the recommendation

### Action Plan
- Specific investment approach recommended
- Timing considerations for entry/exit
- Position sizing and risk management guidance

Be decisive but balanced. Acknowledge the strength of opposing arguments while making a clear recommendation based on the weight of evidence.`;
  }

  canProcess(state: AgentState): boolean {
    // Research manager can process if both bull and bear researchers have provided input
    const canProcess = super.canProcess(state) && 
                      !!(state.investment_debate_state?.bull_history) &&
                      !!(state.investment_debate_state?.bear_history) &&
                      !AgentStateHelpers.isInvestmentDebateComplete(state);
    
    this.logger.debug('canProcess', 'Evaluating if ResearchManager can process state', {
      basicCanProcess: super.canProcess(state),
      hasBullHistory: !!(state.investment_debate_state?.bull_history),
      hasBearHistory: !!(state.investment_debate_state?.bear_history),
      isInvestmentDebateComplete: AgentStateHelpers.isInvestmentDebateComplete(state),
      finalCanProcess: canProcess,
      company: state.company_of_interest
    });
    
    return canProcess;
  }

  private createManagementRequest(state: AgentState): HumanMessage {
    const { 
      company_of_interest, 
      trade_date, 
      investment_debate_state 
    } = state;
    
    this.logger.debug('createManagementRequest', 'Creating research synthesis request prompt', {
      company: company_of_interest,
      tradeDate: trade_date,
      hasBullHistory: !!(investment_debate_state?.bull_history),
      hasBearHistory: !!(investment_debate_state?.bear_history)
    });
    
    const prompt = `As Research Manager, synthesize the bull and bear research arguments below and make a balanced investment decision for ${company_of_interest}.

RESEARCH DEBATE:

BULL RESEARCHER ARGUMENTS:
${investment_debate_state?.bull_history || 'Not available'}

BEAR RESEARCHER ARGUMENTS:
${investment_debate_state?.bear_history || 'Not available'}

Your responsibility:
Evaluate both arguments objectively and make a clear investment recommendation. Consider the strength of evidence, quality of analysis, and risk-adjusted return potential. Provide a balanced perspective that acknowledges both opportunities and risks.

Company: ${company_of_interest}
Analysis Date: ${trade_date}

Make a decisive but well-reasoned investment recommendation that will guide the trading strategy.`;

    return new HumanMessage(prompt);
  }
}