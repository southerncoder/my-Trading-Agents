/**
 * Signal Processing for Trading Agents Graph
 * 
 * This module processes trading signals to extract actionable decisions
 * from the comprehensive analysis provided by the agent network.
 * 
 * Key responsibilities:
 * - Extract core trading decisions (BUY, SELL, HOLD) from full signals
 * - Normalize signal format for downstream processing
 * - Validate signal integrity and completeness
 * - Handle edge cases and error scenarios
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

export type LLMProvider = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

/**
 * SignalProcessor class extracts actionable trading decisions from agent outputs
 */
export class SignalProcessor {
  private llm: LLMProvider;
  private systemPrompt: string;

  constructor(llm: LLMProvider) {
    this.llm = llm;
    this.systemPrompt = this.getSystemPrompt();
  }

  /**
   * Get the system prompt for signal processing
   */
  private getSystemPrompt(): string {
    return `You are an efficient assistant designed to analyze paragraphs or financial reports provided by a group of analysts. Your task is to extract the investment decision: SELL, BUY, or HOLD. Provide only the extracted decision (SELL, BUY, or HOLD) as your output, without adding any additional text or information.`;
  }

  /**
   * Process a full trading signal to extract the core decision
   */
  async processSignal(fullSignal: string): Promise<string> {
    try {
      if (!fullSignal || fullSignal.trim().length === 0) {
        console.warn('Empty signal provided to processor');
        return 'HOLD';
      }

      const messages: BaseMessage[] = [
        new SystemMessage(this.systemPrompt),
        new HumanMessage(fullSignal)
      ];

      const response = await this.llm.invoke(messages);
      const decision = this.normalizeDecision(response.content as string);
      
      return decision;
    } catch (error) {
      console.error('Error processing signal:', error);
      return 'HOLD'; // Default to HOLD on error
    }
  }

  /**
   * Normalize the LLM response to ensure valid trading decision
   */
  private normalizeDecision(rawDecision: string): string {
    const cleaned = rawDecision.trim().toUpperCase();
    
    // Check for exact matches first
    if (cleaned === 'BUY' || cleaned === 'SELL' || cleaned === 'HOLD') {
      return cleaned;
    }

    // Check for partial matches
    if (cleaned.includes('BUY')) {
      return 'BUY';
    }
    if (cleaned.includes('SELL')) {
      return 'SELL';
    }
    if (cleaned.includes('HOLD')) {
      return 'HOLD';
    }

    // Default to HOLD if no clear decision is found
    console.warn(`Could not extract clear decision from: "${rawDecision}", defaulting to HOLD`);
    return 'HOLD';
  }

  /**
   * Process multiple signals and return the most common decision
   */
  async processMultipleSignals(signals: string[]): Promise<string> {
    if (!signals || signals.length === 0) {
      return 'HOLD';
    }

    const decisions = await Promise.all(
      signals.map(signal => this.processSignal(signal))
    );

    return this.getMajorityDecision(decisions);
  }

  /**
   * Get the majority decision from a list of decisions
   */
  private getMajorityDecision(decisions: string[]): string {
    const counts = { BUY: 0, SELL: 0, HOLD: 0 };
    
    decisions.forEach(decision => {
      if (decision in counts) {
        counts[decision as keyof typeof counts]++;
      }
    });

    // Return the decision with the highest count
    let maxCount = 0;
    let majorityDecision = 'HOLD';
    
    for (const [decision, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityDecision = decision;
      }
    }

    return majorityDecision;
  }

  /**
   * Validate signal quality and completeness
   */
  validateSignal(signal: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!signal || signal.trim().length === 0) {
      issues.push('Signal is empty');
    }

    if (signal.length < 10) {
      issues.push('Signal is too short to be meaningful');
    }

    if (signal.length > 10000) {
      issues.push('Signal is unusually long and may contain excessive information');
    }

    // Check for presence of key financial terms
    const financialTerms = [
      'price', 'market', 'stock', 'trade', 'investment', 
      'analysis', 'recommendation', 'decision', 'risk'
    ];
    
    const hasFinancialContent = financialTerms.some(term => 
      signal.toLowerCase().includes(term)
    );

    if (!hasFinancialContent) {
      issues.push('Signal does not appear to contain financial content');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Extract confidence level from signal text (if available)
   */
  extractConfidence(signal: string): number {
    try {
      // Look for confidence patterns
      const confidencePatterns = [
        /confidence[:\s]+(\d+)%/i,
        /(\d+)%\s+confident/i,
        /certainty[:\s]+(\d+)%/i,
        /probability[:\s]+(\d+)%/i
      ];

      for (const pattern of confidencePatterns) {
        const match = signal.match(pattern);
        if (match && match[1]) {
          const confidence = parseInt(match[1], 10);
          if (confidence >= 0 && confidence <= 100) {
            return confidence / 100; // Return as decimal
          }
        }
      }

      // Default confidence based on signal strength
      return this.estimateConfidenceFromSignal(signal);
    } catch (error) {
      console.warn('Error extracting confidence:', error);
      return 0.5; // Default neutral confidence
    }
  }

  /**
   * Estimate confidence based on signal content analysis
   */
  private estimateConfidenceFromSignal(signal: string): number {
    const strongIndicators = [
      'strongly recommend', 'highly confident', 'clear indication',
      'definitive', 'certain', 'obvious', 'compelling evidence'
    ];

    const weakIndicators = [
      'might', 'could', 'possibly', 'uncertain', 'unclear',
      'mixed signals', 'conflicting', 'moderate'
    ];

    const strongMatches = strongIndicators.filter(indicator => 
      signal.toLowerCase().includes(indicator)
    ).length;

    const weakMatches = weakIndicators.filter(indicator => 
      signal.toLowerCase().includes(indicator)
    ).length;

    if (strongMatches > weakMatches) {
      return 0.8; // High confidence
    } else if (weakMatches > strongMatches) {
      return 0.3; // Low confidence
    } else {
      return 0.5; // Neutral confidence
    }
  }

  /**
   * Create a structured signal summary
   */
  createSignalSummary(signal: string, decision: string, confidence: number): {
    decision: string;
    confidence: number;
    signalLength: number;
    isValid: boolean;
    issues: string[];
    timestamp: string;
  } {
    const validation = this.validateSignal(signal);
    
    return {
      decision,
      confidence,
      signalLength: signal.length,
      isValid: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a new signal processor instance
 */
export function createSignalProcessor(llm: LLMProvider): SignalProcessor {
  return new SignalProcessor(llm);
}