/**
 * Reflection System for Trading Agents Graph
 * 
 * This module handles reflection on trading decisions and updating memory
 * based on market outcomes. It provides post-trade analysis capabilities
 * for continuous learning and improvement.
 * 
 * Key responsibilities:
 * - Analyze trading outcomes vs. decisions
 * - Generate reflection insights for each agent type
 * - Update agent memories with lessons learned
 * - Provide improvement recommendations
 * - Track performance patterns over time
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentState } from '../types/agent-states.js';
import { FinancialSituationMemory } from '../agents/utils/memory.js';
import { createLogger } from '../utils/enhanced-logger.js';

export type LLMProvider = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

export interface ReflectionResult {
  component: string;
  analysis: string;
  lessons: string[];
  improvements: string[];
  confidence: number;
  timestamp: string;
}

/**
 * Reflector class handles post-trade analysis and memory updates
 */
export class Reflector {
  private llm: LLMProvider;
  private systemPrompt: string;
  private logger = createLogger('graph', 'reflector');

  constructor(llm: LLMProvider) {
    this.llm = llm;
    this.systemPrompt = this.getReflectionPrompt();
  }

  /**
   * Get the system prompt for reflection analysis
   */
  private getReflectionPrompt(): string {
    return `
You are an expert financial analyst tasked with reviewing trading decisions/analysis and providing a comprehensive, step-by-step analysis. 
Your goal is to deliver detailed insights into investment decisions and highlight opportunities for improvement, adhering strictly to the following guidelines:

1. Reasoning:
   - For each trading decision, determine whether it was correct or incorrect. A correct decision results in an increase in returns, while an incorrect decision does the opposite.
   - Analyze the contributing factors to each success or mistake. Consider:
     - Market intelligence.
     - Technical indicators.
     - Technical signals.
     - Price movement analysis.
     - Overall market data analysis 
     - News analysis.
     - Social media and sentiment analysis.
     - Fundamental data analysis.
     - Weight the importance of each factor in the decision-making process.

2. Improvement:
   - For any incorrect decisions, propose revisions to maximize returns.
   - Provide a detailed list of corrective actions or improvements, including specific recommendations (e.g., changing a decision from HOLD to BUY on a particular date).

3. Summary:
   - Summarize the lessons learned from the successes and mistakes.
   - Highlight how these lessons can be adapted for future trading scenarios and draw connections between similar situations to apply the knowledge gained.

4. Query:
   - Extract key insights from the summary into a concise sentence of no more than 1000 tokens.
   - Ensure the condensed sentence captures the essence of the lessons and reasoning for easy reference.

Adhere strictly to these instructions, and ensure your output is detailed, accurate, and actionable. You will also be given objective descriptions of the market from a price movements, technical indicator, news, and sentiment perspective to provide more context for your analysis.
`;
  }

  /**
   * Extract current market situation from state for context
   */
  private extractCurrentSituation(currentState: AgentState): string {
    const reports = [
      currentState.market_report || '',
      currentState.sentiment_report || '',
      currentState.news_report || '',
      currentState.fundamentals_report || ''
    ].filter(report => report.trim().length > 0);

    return reports.join('\n\n');
  }

  /**
   * Generate reflection for a specific component
   */
  private async reflectOnComponent(
    componentType: string,
    report: string,
    situation: string,
    returnsLosses: number | string
  ): Promise<string> {
    try {
      const messages: BaseMessage[] = [
        new SystemMessage(this.systemPrompt),
        new HumanMessage(
          `Returns: ${returnsLosses}\n\nAnalysis/Decision: ${report}\n\nObjective Market Reports for Reference: ${situation}`
        )
      ];

      const response = await this.llm.invoke(messages);
      return response.content as string;
    } catch (error) {
      this.logger.error('reflectOnComponent', `Error reflecting on ${componentType}`, {
        componentType,
        error: error instanceof Error ? error.message : String(error),
        returnsLosses
      });
      return `Unable to generate reflection for ${componentType}: ${error}`;
    }
  }

  /**
   * Reflect on bull researcher's analysis and update memory
   */
  async reflectBullResearcher(
    currentState: AgentState,
    returnsLosses: number | string,
    bullMemory: FinancialSituationMemory
  ): Promise<ReflectionResult> {
    const situation = this.extractCurrentSituation(currentState);
    const bullDebateHistory = currentState.investment_debate_state?.bull_history || '';

    const analysis = await this.reflectOnComponent(
      'BULL',
      bullDebateHistory,
      situation,
      returnsLosses
    );

    // Add to memory
    try {
      await bullMemory.addSituations([[situation, analysis]]);
    } catch (error) {
      this.logger.warn('reflectBullResearcher', 'Failed to update bull memory', {
        error: error instanceof Error ? error.message : String(error),
        situationLength: situation.length
      });
    }

    return this.createReflectionResult('Bull Researcher', analysis);
  }

  /**
   * Reflect on bear researcher's analysis and update memory
   */
  async reflectBearResearcher(
    currentState: AgentState,
    returnsLosses: number | string,
    bearMemory: FinancialSituationMemory
  ): Promise<ReflectionResult> {
    const situation = this.extractCurrentSituation(currentState);
    const bearDebateHistory = currentState.investment_debate_state?.bear_history || '';

    const analysis = await this.reflectOnComponent(
      'BEAR',
      bearDebateHistory,
      situation,
      returnsLosses
    );

    // Add to memory
    try {
      await bearMemory.addSituations([[situation, analysis]]);
    } catch (error) {
      this.logger.warn('reflectBearResearcher', 'Failed to update bear memory', {
        error: error instanceof Error ? error.message : String(error),
        situationLength: situation.length
      });
    }

    return this.createReflectionResult('Bear Researcher', analysis);
  }

  /**
   * Reflect on trader's decision and update memory
   */
  async reflectTrader(
    currentState: AgentState,
    returnsLosses: number | string,
    traderMemory: FinancialSituationMemory
  ): Promise<ReflectionResult> {
    const situation = this.extractCurrentSituation(currentState);
    const traderDecision = currentState.trader_investment_plan || '';

    const analysis = await this.reflectOnComponent(
      'TRADER',
      traderDecision,
      situation,
      returnsLosses
    );

    // Add to memory
    try {
      await traderMemory.addSituations([[situation, analysis]]);
    } catch (error) {
      this.logger.warn('reflectTrader', 'Failed to update trader memory', {
        error: error instanceof Error ? error.message : String(error),
        situationLength: situation.length
      });
    }

    return this.createReflectionResult('Trader', analysis);
  }

  /**
   * Reflect on investment judge's decision and update memory
   */
  async reflectInvestJudge(
    currentState: AgentState,
    returnsLosses: number | string,
    investJudgeMemory: FinancialSituationMemory
  ): Promise<ReflectionResult> {
    const situation = this.extractCurrentSituation(currentState);
    const judgeDecision = currentState.investment_debate_state?.judge_decision || '';

    const analysis = await this.reflectOnComponent(
      'INVEST JUDGE',
      judgeDecision,
      situation,
      returnsLosses
    );

    // Add to memory
    try {
      await investJudgeMemory.addSituations([[situation, analysis]]);
    } catch (error) {
      this.logger.warn('reflectInvestJudge', 'Failed to update investment judge memory', {
        error: error instanceof Error ? error.message : String(error),
        situationLength: situation.length
      });
    }

    return this.createReflectionResult('Investment Judge', analysis);
  }

  /**
   * Reflect on risk manager's decision and update memory
   */
  async reflectRiskManager(
    currentState: AgentState,
    returnsLosses: number | string,
    riskManagerMemory: FinancialSituationMemory
  ): Promise<ReflectionResult> {
    const situation = this.extractCurrentSituation(currentState);
    const judgeDecision = currentState.risk_debate_state?.judge_decision || '';

    const analysis = await this.reflectOnComponent(
      'RISK JUDGE',
      judgeDecision,
      situation,
      returnsLosses
    );

    // Add to memory
    try {
      await riskManagerMemory.addSituations([[situation, analysis]]);
    } catch (error) {
      this.logger.warn('reflectRiskManager', 'Failed to update risk manager memory', {
        error: error instanceof Error ? error.message : String(error),
        situationLength: situation.length
      });
    }

    return this.createReflectionResult('Risk Manager', analysis);
  }

  /**
   * Perform comprehensive reflection on all agents
   */
  async reflectAndRemember(
    currentState: AgentState,
    returnsLosses: number | string,
    memories: {
      bullMemory: FinancialSituationMemory;
      bearMemory: FinancialSituationMemory;
      traderMemory: FinancialSituationMemory;
      investJudgeMemory: FinancialSituationMemory;
      riskManagerMemory: FinancialSituationMemory;
    }
  ): Promise<ReflectionResult[]> {
    const reflections: ReflectionResult[] = [];

    try {
      // Run all reflections in parallel for efficiency
      const [
        bullReflection,
        bearReflection,
        traderReflection,
        judgeReflection,
        riskReflection
      ] = await Promise.all([
        this.reflectBullResearcher(currentState, returnsLosses, memories.bullMemory),
        this.reflectBearResearcher(currentState, returnsLosses, memories.bearMemory),
        this.reflectTrader(currentState, returnsLosses, memories.traderMemory),
        this.reflectInvestJudge(currentState, returnsLosses, memories.investJudgeMemory),
        this.reflectRiskManager(currentState, returnsLosses, memories.riskManagerMemory)
      ]);

      reflections.push(
        bullReflection,
        bearReflection,
        traderReflection,
        judgeReflection,
        riskReflection
      );
    } catch (error) {
      this.logger.error('reflectAndRemember', 'Error during comprehensive reflection', {
        error: error instanceof Error ? error.message : String(error),
        returnsLosses,
        hasState: !!currentState
      });
    }

    return reflections;
  }

  /**
   * Create a structured reflection result
   */
  private createReflectionResult(component: string, analysis: string): ReflectionResult {
    const lessons = this.extractLessons(analysis);
    const improvements = this.extractImprovements(analysis);
    const confidence = this.estimateConfidence(analysis);

    return {
      component,
      analysis,
      lessons,
      improvements,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract lessons learned from reflection analysis
   */
  private extractLessons(analysis: string): string[] {
    const lessons: string[] = [];
    
    // Look for lesson patterns
    const lessonPatterns = [
      /lesson[s]?\s*learned[:\s]+([^.]+)/gi,
      /key\s+insight[s]?[:\s]+([^.]+)/gi,
      /important[:\s]+([^.]+)/gi,
      /learned\s+that[:\s]+([^.]+)/gi
    ];

    for (const pattern of lessonPatterns) {
      let match;
      while ((match = pattern.exec(analysis)) !== null) {
        if (match[1]) {
          lessons.push(match[1].trim());
        }
      }
    }

    // If no explicit lessons found, extract key sentences
    if (lessons.length === 0) {
      const sentences = analysis.split('.').filter(s => s.trim().length > 20);
      lessons.push(...sentences.slice(0, 3).map(s => s.trim()));
    }

    return lessons.slice(0, 5); // Limit to 5 lessons
  }

  /**
   * Extract improvement recommendations from reflection analysis
   */
  private extractImprovements(analysis: string): string[] {
    const improvements: string[] = [];
    
    // Look for improvement patterns
    const improvementPatterns = [
      /improvement[s]?[:\s]+([^.]+)/gi,
      /recommend[s]?[:\s]+([^.]+)/gi,
      /should\s+([^.]+)/gi,
      /better\s+to\s+([^.]+)/gi,
      /next\s+time[:\s]+([^.]+)/gi
    ];

    for (const pattern of improvementPatterns) {
      let match;
      while ((match = pattern.exec(analysis)) !== null) {
        if (match[1]) {
          improvements.push(match[1].trim());
        }
      }
    }

    return improvements.slice(0, 5); // Limit to 5 improvements
  }

  /**
   * Estimate confidence level of the reflection analysis
   */
  private estimateConfidence(analysis: string): number {
    const positiveIndicators = [
      'clear', 'obvious', 'definitely', 'certainly', 'strong evidence',
      'compelling', 'conclusive', 'significant'
    ];

    const uncertainIndicators = [
      'unclear', 'uncertain', 'possibly', 'might', 'could be',
      'ambiguous', 'mixed signals', 'conflicting'
    ];

    const positiveCount = positiveIndicators.filter(indicator => 
      analysis.toLowerCase().includes(indicator)
    ).length;

    const uncertainCount = uncertainIndicators.filter(indicator => 
      analysis.toLowerCase().includes(indicator)
    ).length;

    if (positiveCount > uncertainCount) {
      return 0.8;
    } else if (uncertainCount > positiveCount) {
      return 0.4;
    } else {
      return 0.6;
    }
  }
}

/**
 * Create a new reflector instance
 */
export function createReflector(llm: LLMProvider): Reflector {
  return new Reflector(llm);
}