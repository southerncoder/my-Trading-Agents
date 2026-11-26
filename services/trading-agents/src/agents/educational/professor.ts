import { createLogger } from '../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG, createResilientLLM } from '../../utils/resilient-llm';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AbstractAgent } from '../base';
import { AgentState, AgentStateHelpers } from '../../types/agent-states';

/**
 * Educational review returned by the Professor agent. Each field is designed to answer the
 * questions a novice investor is likely to have when reading a machine-generated trading call.
 */
export interface EducationalReview {
  /** One-paragraph plain-English summary of what the advice is and why. */
  summary: string;
  /** Why we are not acting *before* the trigger/stop/confirmation is reached. */
  why_not_before_flag: string;
  /** Definitions and relevance of the key figures used (MA50, MA200, target, range_pos, ATR, etc.). */
  figures_explained: string;
  /** Why "buy low, sell high" does not apply here, or what it means in context. */
  buy_low_sell_high: string;
  /** Which risk temperament this idea matches and why (aggressive / moderate / conservative). */
  risk_temperament: string;
  /** Which portfolio style this belongs in, or "none" if the idea is too speculative. */
  portfolio_fit: string;
}

export type CallTiming = 'now' | 'trigger' | 'exit' | 'wait';

/**
 * What the final decision asks the investor to do about timing, read from the Portfolio Manager's JSON
 * (action_now, then decision). The Professor's first question depends on it: "why wait for the trigger"
 * makes no sense for a buy-now call.
 */
export function callTiming(pmText: string): CallTiming {
  const action = /"action_now"\s*:\s*"([a-z_]+)"/i.exec(pmText)?.[1]?.toLowerCase() ?? '';
  const decision = /"decision"\s*:\s*"([a-z]+)"/i.exec(pmText)?.[1]?.toUpperCase() ?? '';
  if (/trigger/.test(action)) return 'trigger';
  if (/exit|trim|sell|reduce/.test(action) || decision === 'SELL') return 'exit';
  if (/enter|now|buy/.test(action)) return 'now';
  return decision === 'BUY' ? 'now' : 'wait';
}

const TIMING_QUESTION: Record<CallTiming, string> = {
  now: 'The call is to BUY NOW, with no trigger. In why_not_before_flag, explain why acting now rather than waiting for a lower price is the advice: what makes this the moment, and what waiting could cost or save. Do not describe a trigger or a wait.',
  trigger: 'The call is to WAIT FOR THE TRIGGER price before buying. In why_not_before_flag, explain why waiting for that price is better than buying right away, and what reaching it would show.',
  exit: 'The call is to SELL, TRIM or EXIT. In why_not_before_flag, explain why getting out now is the advice rather than holding for a rebound.',
  wait: 'The call is to WAIT or KEEP: do nothing new now. In why_not_before_flag, explain why acting now is not advised and what would change that.',
};

/** The raw shape the model is asked to emit inside its fenced JSON block. */
interface ProfessorJson {
  summary: string;
  why_not_before_flag: string;
  figures_explained: string;
  buy_low_sell_high: string;
  risk_temperament: string;
  portfolio_fit: string;
}

/**
 * Professor Agent
 *
 * A separate educational reviewer that looks at the final Portfolio Manager decision and the
 * evidence behind it, then writes a short, structured explanation for an investor who is still
 * learning how to read the advice.
 */
export class Professor extends AbstractAgent {
  private readonly logger = createLogger('agent', 'Professor');
  private readonly resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel, tools?: StructuredTool[]) {
    super(
      'Professor',
      'Translates the final trading decision into plain English, explains the figures, and clarifies why the timing and risk level are what they are',
      llm,
      tools
    );

    this.resilientLLM = createResilientLLM(llm, OPENAI_LLM_CONFIG);

    this.logger.info('constructor', 'Professor initialized with resilient LLM wrapper', {
      llmType: llm.constructor.name,
      hasTools: tools ? tools.length > 0 : false,
      toolCount: tools ? tools.length : 0
    });
  }

  canProcess(state: AgentState): boolean {
    return (
      super.canProcess(state) &&
      AgentStateHelpers.hasFinalDecision(state) &&
      !(state.metadata?.educational_review as EducationalReview | undefined)?.summary
    );
  }

  async process(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.info('process', 'Starting educational review', {
      company: state.company_of_interest,
      tradeDate: state.trade_date,
      hasFinalDecision: !!state.final_trade_decision,
      hasMarketReport: !!state.market_report,
      hasTraderPlan: !!state.trader_investment_plan
    });

    return await withLLMResilience(
      'educational_review',
      async () => {
        const systemPrompt = this.getSystemPrompt();
        const humanMessage = this.createRequest(state);

        this.logger.debug('process', 'Invoking resilient LLM for educational review', {
          systemPromptLength: systemPrompt.length,
          humanMessageLength: typeof humanMessage.content === 'string' ? humanMessage.content.length : 0
        });

        const response = await this.resilientLLM.invoke([
          new SystemMessage(systemPrompt),
          humanMessage
        ]);

        const text = this.extractText(response.content);
        const review = this.parseReview(text);

        this.logger.info('process', 'Educational review completed', {
          company: state.company_of_interest,
          reviewLength: text.length,
          portfolioFit: review.portfolio_fit
        });

        return {
          messages: [...state.messages, response],
          metadata: {
            ...state.metadata,
            educational_review: review
          },
          sender: this.name
        };
      },
      OPENAI_LLM_CONFIG
    );
  }

  getSystemPrompt(): string {
    return `You are a patient, experienced investing professor. Your only job is to help a beginner investor understand the machine-generated trading advice they just received.

You have the final decision (BUY, HOLD, or SELL), the price, the trigger (if any), the stop/walk-away price, the analyst figures, and the reasons. Do NOT second-guess the decision. Do translate it into plain English and explain *why* the advice is structured the way it is.

Explain these ideas simply, but accurately:
1. The timing of THIS call, as stated under CALL TIMING in the request (buy now, wait for a trigger, exit, or wait). Explain only that timing; never invent a trigger or a wait the call does not have.
2. What each figure means in this stock's context (MA50, MA200, target price, range position, ATR, confidence, etc.).
3. Why "buy low, sell high" is not the whole story here.
4. Whether this idea is aggressive, moderate, or conservative and why.
5. Which kind of portfolio it suits, or whether it belongs nowhere right now.

Keep paragraphs short. Avoid jargon unless you immediately define it. Be encouraging but honest about risk.

Output format:
Return ONLY the following JSON object inside a fenced json block. Do not add commentary outside the block.

\`\`\`json
{
  "summary": "string",
  "why_not_before_flag": "string",
  "figures_explained": "string",
  "buy_low_sell_high": "string",
  "risk_temperament": "string",
  "portfolio_fit": "string"
}
\`\`\`

Each value should be one to three sentences, except figures_explained which may be a short paragraph. Write plain text and numbers only, no markdown inside the strings.`;
  }

  private createRequest(state: AgentState): HumanMessage {
    const pmText = String(state.final_trade_decision ?? '');
    const risk = state.risk_debate_state;
    const plan = state.trader_investment_plan || 'Not available';
    const market = state.market_report || 'Not available';
    const news = state.news_report || 'Not available';
    const fundamentals = state.fundamentals_report || 'Not available';

    const timing = callTiming(pmText);
    const prompt = `The analysis is for ${state.company_of_interest} on ${state.trade_date}.

CALL TIMING: ${TIMING_QUESTION[timing]}

PORTFOLIO MANAGER FINAL DECISION:
${pmText}

TRADER'S PLAN:
${plan}

MARKET ANALYST REPORT:
${market}

NEWS REPORT:
${news}

FUNDAMENTALS REPORT:
${fundamentals}

RISK TEAM PERSPECTIVES:
Risky analyst: ${risk?.current_risky_response || 'Not available'}
Safe analyst: ${risk?.current_safe_response || 'Not available'}
Neutral analyst: ${risk?.current_neutral_response || 'Not available'}

Please produce the educational review JSON described in your instructions.`;

    return new HumanMessage(prompt);
  }

  private extractText(content: string | unknown[]): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null && 'text' in item) return (item as any).text;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return String(content ?? '');
  }

  private parseReview(text: string): EducationalReview {
    const fenced = [...text.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi)].pop();
    const raw = [...text.matchAll(/\{[^{}]*"summary"[^{}]*\}/g)].pop();
    const candidates = [fenced?.[1], raw?.[0]].filter(Boolean) as string[];

    for (const c of candidates) {
      if (!c) continue;
      try {
        const json = JSON.parse(c.replace(/\\(?!["\\/bfnrtu])/g, '')) as ProfessorJson;
        return {
          summary: String(json.summary || '').trim(),
          why_not_before_flag: String(json.why_not_before_flag || '').trim(),
          figures_explained: String(json.figures_explained || '').trim(),
          buy_low_sell_high: String(json.buy_low_sell_high || '').trim(),
          risk_temperament: String(json.risk_temperament || '').trim(),
          portfolio_fit: String(json.portfolio_fit || '').trim()
        };
      } catch {
        /* try next */
      }
    }

    this.logger.warn('parseReview', 'Could not parse Professor JSON; falling back to text summary', {
      textPreview: text.slice(0, 200)
    });

    return {
      summary: text.slice(0, 240).trim() || 'No educational review available.',
      why_not_before_flag: '',
      figures_explained: '',
      buy_low_sell_high: '',
      risk_temperament: '',
      portfolio_fit: ''
    };
  }
}
