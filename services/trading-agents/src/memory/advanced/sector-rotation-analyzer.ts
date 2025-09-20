/**
 * Sector Rotation Analyzer
 *
 * Specialized analyzer for sector rotation patterns and market phase transitions.
 * Provides insights into sector performance cycles and predictive analytics for
 * optimal sector allocation strategies.
 */

import { TemporalRelationshipMapper } from './temporal-relationship-mapper';

export class SectorRotationAnalyzer {
  private temporalMapper: TemporalRelationshipMapper;
  private logger: any;
  private zepClient: any; // Access to Zep Graphiti client through temporal mapper

  constructor(temporalMapper: TemporalRelationshipMapper, logger: any) {
    this.temporalMapper = temporalMapper;
    this.logger = logger;
    // Access zepClient through the temporal mapper
    this.zepClient = (temporalMapper as any).zepClient;
  }

  /**
   * Analyze current sector rotation phase and predict next moves
   */
  async analyzeSectorRotationPhase(): Promise<{
    current_phase: string;
    phase_confidence: number;
    predicted_next_phase: string;
    transition_probability: number;
    leading_indicators: Array<{
      indicator: string;
      signal_strength: number;
      historical_accuracy: number;
    }>;
    sector_rankings: Array<{
      sector: string;
      expected_performance: number;
      confidence: number;
      time_horizon_days: number;
    }>;
  }> {

    this.logger.info('Analyzing sector rotation phase', {
      component: 'SectorRotationAnalyzer',
      operation: 'analyzeSectorRotationPhase'
    });

    // Implementation would analyze sector performance patterns and predict rotation
    return {
      current_phase: "Growth to Value Transition",
      phase_confidence: 0.78,
      predicted_next_phase: "Value Leadership",
      transition_probability: 0.65,
      leading_indicators: [
        {
          indicator: "10Y-2Y Yield Curve Steepening",
          signal_strength: 0.82,
          historical_accuracy: 0.74
        }
      ],
      sector_rankings: [
        {
          sector: "Financials",
          expected_performance: 0.15,
          confidence: 0.71,
          time_horizon_days: 60
        }
      ]
    };
  }

  // ========================================================================
  // Utility Methods for Correlation Calculations
  // ========================================================================

  /**
   * Extract time series data from Zep facts
   */
  private extractTimeSeriesFromFacts(facts: any[], _entityId: string): Array<{ date: string; value: number }> {
    const timeSeriesData: Array<{ date: string; value: number }> = [];

    for (const fact of facts) {
      try {
        // Try to extract price/performance data from fact content
        const factText = fact.fact || '';
        const timestamp = fact.timestamp;

        // Look for price patterns in the fact text
        const priceMatch = factText.match(/price[:\s]+\$?(\d+\.?\d*)/i);
        const returnMatch = factText.match(/return[:\s]+(-?\d+\.?\d*)%?/i);
        const performanceMatch = factText.match(/performance[:\s]+(-?\d+\.?\d*)%?/i);

        let value = 0;
        if (priceMatch) {
          value = parseFloat(priceMatch[1]);
        } else if (returnMatch) {
          value = parseFloat(returnMatch[1]);
        } else if (performanceMatch) {
          value = parseFloat(performanceMatch[1]);
        }

        if (value !== 0 && timestamp) {
          timeSeriesData.push({
            date: timestamp,
            value: value
          });
        }
      } catch (_error) {
        // Skip invalid facts
        continue;
      }
    }

    // Sort by date
    return timeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get related entities for correlation analysis
   */
  private async getRelatedEntities(entityId: string): Promise<string[]> {
    try {
      // Query for entities in the same sector or correlated entities
      const query = `related entities to ${entityId} sector correlation`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 20 });

      const relatedEntities: Set<string> = new Set();

      if (searchResults?.facts) {
        for (const fact of searchResults.facts) {
          // Extract entity mentions from facts
          const factText = fact.fact || '';
          const entityMatches = factText.match(/\b[A-Z]{1,5}\b/g); // Stock symbols

          if (entityMatches) {
            for (const match of entityMatches) {
              if (match !== entityId && match.length >= 2) {
                relatedEntities.add(match);
              }
            }
          }
        }
      }

      // Add some common index/sector entities for broader correlation
      const commonEntities = ['SPY', 'QQQ', 'IWM', 'XLF', 'XLK', 'XLE', 'XLV'];
      for (const entity of commonEntities) {
        if (entity !== entityId) {
          relatedEntities.add(entity);
        }
      }

      return Array.from(relatedEntities).slice(0, 10); // Limit to top 10

    } catch (error) {
      this.logger.error('Failed to get related entities', {
        component: 'SectorRotationAnalyzer',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return ['SPY', 'QQQ']; // Default fallback
    }
  }

  /**
   * Get time series data for a specific entity
   */
  private async getEntityTimeSeriesData(entityId: string, windowDays: number): Promise<Array<{ date: string; value: number }>> {
    try {
      const query = `price data for ${entityId} last ${windowDays} days`;
      const searchResults = await this.zepClient.searchMemory?.(query, { maxResults: 30 });

      if (searchResults?.facts) {
        return this.extractTimeSeriesFromFacts(searchResults.facts, entityId);
      }

      return [];

    } catch (error) {
      this.logger.error('Failed to get entity time series data', {
        component: 'SectorRotationAnalyzer',
        entity_id: entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculate Pearson correlation coefficient between two time series
   */
  private calculatePearsonCorrelation(
    series1: Array<{ date: string; value: number }>,
    series2: Array<{ date: string; value: number }>
  ): number {

    if (series1.length === 0 || series2.length === 0) {
      return 0;
    }

    // Align the series by date (simple approach - match by position for now)
    const minLength = Math.min(series1.length, series2.length);
    if (minLength < 3) {
      return 0; // Need at least 3 points for meaningful correlation
    }

    const values1 = series1.slice(-minLength).map(d => d.value);
    const values2 = series2.slice(-minLength).map(d => d.value);

    // Calculate means
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

    // Calculate correlation components
    let numerator = 0;
    let sumSquares1 = 0;
    let sumSquares2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const val1 = values1[i];
      const val2 = values2[i];

      if (val1 !== undefined && val2 !== undefined) {
        const diff1 = val1 - mean1;
        const diff2 = val2 - mean2;

        numerator += diff1 * diff2;
        sumSquares1 += diff1 * diff1;
        sumSquares2 += diff2 * diff2;
      }
    }

    const denominator = Math.sqrt(sumSquares1 * sumSquares2);

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }
}