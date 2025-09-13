import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentState } from '../../../types/agent-states';
import { createLogger } from '../../../utils/enhanced-logger';
import { withLLMResilience, OPENAI_LLM_CONFIG } from '../../../utils/resilient-llm';

/**
 * Fundamentals Analysis Service
 * Handles core fundamentals analysis operations
 */
export class FundamentalsAnalysisService {
  private logger = createLogger('agent', 'fundamentals-analysis-service');
  private resilientLLM: BaseChatModel;

  constructor(llm: BaseChatModel) {
    this.resilientLLM = llm;
  }

  /**
   * Extract fundamentals report from LLM response
   */
  extractFundamentalsReport(response: any): string {
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      return response.content
        .map((item: any) => typeof item === 'string' ? item : item.text || '')
        .filter((text: string) => text.length > 0)
        .join('\n');
    }
    return 'Analysis completed but report extraction failed';
  }

  /**
   * Perform basic fundamentals analysis (fallback)
   */
  async performBasicAnalysis(
    state: AgentState,
    systemPrompt: string,
    analystName: string
  ): Promise<Partial<AgentState>> {
    this.logger.info('performBasicAnalysis', 'Performing basic fundamentals analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date
    });

    const response = await this.resilientLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze the fundamentals for ${state.company_of_interest} on ${state.trade_date}.`)
    ]);

    return {
      messages: [...state.messages, response],
      fundamentals_report: this.extractFundamentalsReport(response),
      sender: analystName
    };
  }

  /**
   * Execute enhanced fundamentals analysis with learning context
   */
  async executeEnhancedAnalysis(
    state: AgentState,
    enhancedSystemPrompt: string,
    humanMessage: HumanMessage,
    analystName: string
  ): Promise<Partial<AgentState>> {
    this.logger.info('executeEnhancedAnalysis', 'Executing enhanced fundamentals analysis', {
      company: state.company_of_interest,
      tradeDate: state.trade_date
    });

    const response = await withLLMResilience(
      'FundamentalsAnalysisService.analyze',
      async () => {
        return await this.resilientLLM.invoke([
          new SystemMessage(enhancedSystemPrompt),
          humanMessage,
        ]);
      },
      OPENAI_LLM_CONFIG
    );

    const fundamentalsReport = this.extractFundamentalsReport(response);
    const updatedMessages = [...state.messages, response];

    this.logger.info('executeEnhancedAnalysis', 'Enhanced fundamentals analysis completed', {
      reportLength: fundamentalsReport.length,
      company: state.company_of_interest
    });

    return {
      messages: updatedMessages,
      fundamentals_report: fundamentalsReport,
      sender: analystName
    };
  }
}

/**
 * Factory function to create FundamentalsAnalysisService instance
 */
export function createFundamentalsAnalysisService(llm: BaseChatModel): FundamentalsAnalysisService {
  return new FundamentalsAnalysisService(llm);
}