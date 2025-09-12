import { ZepClient } from '@getzep/zep-cloud';
import { ContextRetrievalUtils } from '../utilities';
import { ContextRetrievalError } from './error';

export interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
}

export class ScenarioFinder {
  constructor(
    private zepClient: ExtendedZepClient,
    private logger: any,
    private utils: ContextRetrievalUtils
  ) {}

  async findSimilarScenarios(
    currentScenario: {
      market_conditions: any;
      technical_indicators: any;
      context_description: string;
    },
    options: {
      lookback_days?: number;
      min_similarity?: number;
      max_results?: number;
    } = {}
  ): Promise<Array<{
    scenario_id: string;
    similarity_score: number;
    historical_date: string;
    market_conditions: any;
    outcomes: any;
    lessons_learned: string[];
  }>> {
    try {
      const searchQuery = this.buildScenarioSearchQuery(currentScenario);
      const searchResults = await this.zepClient.searchMemory?.(searchQuery, {
        maxResults: options.max_results || 10
      }) || { facts: [] };
      const scenarios: Array<any> = [];
      for (const result of searchResults.facts || []) {
        const similarity = this.calculateScenarioSimilarity(currentScenario, result);
        if (similarity >= (options.min_similarity || 0.6)) {
          scenarios.push({
            scenario_id: result.fact_id || `scenario-${Date.now()}-${Math.random()}`,
            similarity_score: similarity,
            historical_date: result.created_at || new Date().toISOString(),
            market_conditions: this.extractMarketConditionsFromFact(result),
            outcomes: this.extractOutcomesFromFact(result),
            lessons_learned: this.utils.extractLessonsFromText(result.fact || '')
          });
        }
      }
      scenarios.sort((a, b) => b.similarity_score - a.similarity_score);
      this.logger.info('Similar scenarios found', {
        component: 'ScenarioFinder',
        total_scenarios: scenarios.length,
        avg_similarity:
          scenarios.reduce((sum: number, s: any) => sum + s.similarity_score, 0) / scenarios.length || 0
      });
      return scenarios;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Similar scenarios search failed', {
        component: 'ScenarioFinder',
        error: err.message,
        metadata: { currentScenario, options }
      });
      throw new ContextRetrievalError(
        'ScenarioFinder.findSimilarScenarios failed',
        'ScenarioFinder',
        err,
        { currentScenario, options }
      );
    }
  }

  // Build the search query for scenarios
  private buildScenarioSearchQuery(scenario: any): string {
    try {
      const parts: string[] = [];
      if (scenario.context_description) {
        parts.push(`scenario: ${scenario.context_description}`);
      }
      if (scenario.market_conditions) {
        const c = scenario.market_conditions;
        if (c.market_regime) parts.push(`market_regime:${c.market_regime}`);
        if (c.volatility) parts.push(`volatility:${c.volatility}`);
        if (c.trend_direction) parts.push(`trend:${c.trend_direction}`);
      }
      if (scenario.strategy_type) {
        parts.push(`strategy:${scenario.strategy_type}`);
      }
      if (scenario.time_horizon) {
        parts.push(`timeframe:${scenario.time_horizon}`);
      }
      if (scenario.risk_level) {
        parts.push(`risk:${scenario.risk_level}`);
      }
      return parts.join(' AND ');
    } catch (error) {
      this.logger.warn('Error building scenario query', { error, scenario });
      return scenario.context_description ? `scenario ${scenario.context_description}` : 'scenario';
    }
  }

  // Calculate similarity between current scenario and historical fact
  private calculateScenarioSimilarity(current: any, historical: any): number {
    try {
      let total = 0;
      let count = 0;
      if (current.market_conditions && historical.market_conditions) {
        total += this.compareMarketConditions(current.market_conditions, historical.market_conditions);
        count++;
      }
      if (current.strategy_type && historical.strategy_type) {
        total += current.strategy_type === historical.strategy_type ? 1.0 : 0.3;
        count++;
      }
      if (current.time_horizon && historical.time_horizon) {
        total += this.compareTimeHorizons(current.time_horizon, historical.time_horizon);
        count++;
      }
      if (current.risk_level && historical.risk_level) {
        total += this.compareRiskLevels(current.risk_level, historical.risk_level);
        count++;
      }
      if (current.outcomes && historical.outcomes) {
        total += this.compareOutcomes(current.outcomes, historical.outcomes);
        count++;
      }
      return count > 0 ? total / count : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating scenario similarity', { error, current, historical });
      return 0.5;
    }
  }

  // Extract market conditions from fact
  private extractMarketConditionsFromFact(fact: any): any {
    try {
      if (!fact) return {};
      return {
        market_regime: fact.market_regime || fact.market_conditions?.regime || 'unknown',
        volatility: fact.volatility || fact.market_conditions?.volatility,
        trend_direction: fact.trend_direction || fact.market_conditions?.trend
      };
    } catch (error) {
      this.logger.warn('Error extracting market conditions', { error, fact });
      return {};
    }
  }

  // Extract outcomes from fact
  private extractOutcomesFromFact(fact: any): any {
    try {
      if (!fact) return {};
      return {
        profit_loss: fact.profit_loss || fact.pnl || 0,
        success_rate: fact.success_rate || fact.win_rate || 0
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes', { error, fact });
      return {};
    }
  }

  // Comparison helpers
  private compareMarketConditions(current: any, historical: any): number {
    if (!current || !historical) return 0.5;
    let sim = 0;
    let f = 0;
    if (current.market_regime && historical.market_regime) {
      sim += current.market_regime === historical.market_regime ? 1.0 : 0.2;
      f++;
    }
    if (current.volatility && historical.volatility) {
      const d = Math.abs(current.volatility - historical.volatility);
      sim += Math.exp(-d * 2);
      f++;
    }
    return f > 0 ? sim / f : 0.5;
  }

  private compareTimeHorizons(current: string, historical: string): number {
    const map: Record<string, number> = { short:1, medium:2, long:3 };
    const cv = map[current] || 2;
    const hv = map[historical] || 2;
    return Math.max(0, 1 - Math.abs(cv - hv) / 3);
  }

  private compareRiskLevels(current: string, historical: string): number {
    const map: Record<string, number> = { low:1, medium:2, high:3 };
    const cv = map[current] || 2;
    const hv = map[historical] || 2;
    return Math.max(0, 1 - Math.abs(cv - hv) / 2);
  }

  private compareOutcomes(current: any, historical: any): number {
    if (!current || !historical) return 0.5;
    let sim = 0;
    let f = 0;
    if (current.success_rate !== null && historical.success_rate !== null) {
      const d = Math.abs(current.success_rate - historical.success_rate);
      sim += Math.exp(-d * 3);
      f++;
    }
    if (current.profit_loss !== null && historical.profit_loss !== null) {
      sim += (current.profit_loss > 0) === (historical.profit_loss > 0) ? 1.0 : 0.2;
      f++;
    }
    return f > 0 ? sim / f : 0.5;
  }

  private classifyVolatilityRegime(volatility?: number): string {
  if (volatility === null || volatility === undefined) {
    return 'unknown';
  }
  if (volatility < 0.15) {
    return 'low';
  }
  if (volatility < 0.25) {
    return 'medium';
  }
  return 'high';
  }

  private categorizeOutcome(fact: any): string {
    const profit = fact.profit_loss || fact.pnl || 0;
    if (profit > 0) {
      return 'successful';
    }
    if (profit < 0) {
      return 'unsuccessful';
    }
    return 'neutral';
  }
}
