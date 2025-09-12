import { createLogger } from '../../utils/enhanced-logger';

/**
 * Utilities Module
 *
 * This module contains all utility functions and helper methods
 * for the context retrieval system.
 */

export class ContextRetrievalUtils {

  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ContextRetrievalUtils');
  }

  // Text Processing Utilities

  /**
   * Extract lessons from text content
   */
  extractLessonsFromText(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') return [];

      const lessons: string[] = [];
      const lowerText = text.toLowerCase();

      // Look for lesson-related keywords and extract surrounding context
      const lessonKeywords = ['lesson', 'learned', 'insight', 'key takeaway', 'important', 'note'];

      for (const keyword of lessonKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          // Extract sentence containing the keyword
          const sentenceStart = text.lastIndexOf('.', index) + 1;
          const sentenceEnd = text.indexOf('.', index + keyword.length);
          if (sentenceEnd !== -1) {
            const sentence = text.substring(sentenceStart, sentenceEnd + 1).trim();
            if (sentence.length > 10) {
              lessons.push(sentence);
            }
          }
        }
      }

      return lessons;
    } catch (error) {
      this.logger.warn('Error extracting lessons from text', { error });
      return [];
    }
  }

  /**
   * Extract insights from text content
   */
  extractInsightsFromText(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') return [];

      const insights: string[] = [];
      const lowerText = text.toLowerCase();

      // Look for insight-related keywords and extract surrounding context
      const insightKeywords = ['insight', 'observation', 'finding', 'discovery', 'pattern', 'trend'];

      for (const keyword of insightKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
          // Extract sentence containing the keyword
          const sentenceStart = text.lastIndexOf('.', index) + 1;
          const sentenceEnd = text.indexOf('.', index + keyword.length);
          if (sentenceEnd !== -1) {
            const sentence = text.substring(sentenceStart, sentenceEnd + 1).trim();
            if (sentence.length > 10) {
              insights.push(sentence);
            }
          }
        }
      }

      return insights;
    } catch (error) {
      this.logger.warn('Error extracting insights from text', { error });
      return [];
    }
  }

  // Performance Analysis Utilities

  /**
   * Generate performance-based insights
   */
  generatePerformanceInsights(result: any): string[] {
    try {
      const insights: string[] = [];
      const performanceData = this.extractPerformanceData(result);

      // Success rate insights
      if (performanceData.success_rate > 0.7) {
        insights.push('High success rate indicates strong strategy performance');
      } else if (performanceData.success_rate < 0.4) {
        insights.push('Low success rate suggests need for strategy refinement');
      }

      // Volatility insights
      if (performanceData.volatility > 0.25) {
        insights.push('High volatility may require enhanced risk management');
      }

      // Drawdown insights
      if (performanceData.max_drawdown > 0.15) {
        insights.push('Significant drawdown indicates potential risk exposure');
      }

      // Sharpe ratio insights
      if (performanceData.sharpe_ratio > 1.5) {
        insights.push('Strong risk-adjusted returns indicate efficient strategy');
      } else if (performanceData.sharpe_ratio < 0.5) {
        insights.push('Poor risk-adjusted returns suggest strategy inefficiency');
      }

      return insights;
    } catch (error) {
      this.logger.warn('Error generating performance insights', { error });
      return [];
    }
  }

  /**
   * Generate strategy-specific recommendations
   */
  generateStrategyRecommendations(strategyType: string, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      switch (strategyType.toLowerCase()) {
        case 'momentum':
          if (performanceData.volatility > 0.2) {
            recommendations.push('Consider volatility filters for momentum strategy');
          }
          if (performanceData.success_rate < 0.6) {
            recommendations.push('Review momentum entry timing and strength thresholds');
          }
          break;

        case 'mean_reversion':
          if (performanceData.max_drawdown > 0.1) {
            recommendations.push('Implement tighter stop-losses for mean reversion');
          }
          if (performanceData.avg_trade_duration > 5) {
            recommendations.push('Consider shorter holding periods for mean reversion');
          }
          break;

        case 'breakout':
          if (performanceData.success_rate > 0.7) {
            recommendations.push('Strong breakout performance - consider scaling up');
          }
          if (performanceData.volatility < 0.15) {
            recommendations.push('Low volatility may reduce breakout opportunities');
          }
          break;

        case 'scalping':
          if (performanceData.avg_trade_duration > 0.1) {
            recommendations.push('Review scalping execution speed and slippage');
          }
          break;

        default:
          recommendations.push('Monitor strategy performance and adjust parameters as needed');
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating strategy recommendations', { error });
      return [];
    }
  }

  /**
   * Generate risk-based recommendations
   */
  generateRiskRecommendations(riskLevel: string, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      switch (riskLevel.toLowerCase()) {
        case 'high':
          if (performanceData.max_drawdown > 0.2) {
            recommendations.push('High risk strategy experiencing large drawdowns - consider risk reduction');
          }
          if (performanceData.volatility > 0.3) {
            recommendations.push('Extreme volatility in high-risk strategy - implement position sizing limits');
          }
          break;

        case 'medium':
          if (performanceData.success_rate < 0.5) {
            recommendations.push('Medium risk strategy underperforming - review risk/reward balance');
          }
          break;

        case 'low':
          if (performanceData.success_rate > 0.8) {
            recommendations.push('Conservative strategy performing well - consider slight risk increase');
          }
          if (performanceData.avg_return < 0.02) {
            recommendations.push('Low returns in conservative strategy - evaluate opportunity cost');
          }
          break;

        default:
          recommendations.push('Maintain appropriate risk management practices');
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating risk recommendations', { error });
      return [];
    }
  }

  /**
   * Generate market condition recommendations
   */
  generateMarketRecommendations(marketConditions: any, performanceData: any): string[] {
    try {
      const recommendations: string[] = [];

      if (marketConditions.market_regime === 'bull') {
        if (performanceData.success_rate < 0.6) {
          recommendations.push('Bull market performance below expectations - review bullish bias');
        }
      } else if (marketConditions.market_regime === 'bear') {
        if (performanceData.success_rate < 0.5) {
          recommendations.push('Bear market performance concerning - consider defensive measures');
        }
      }

      if (marketConditions.volatility > 0.25) {
        if (performanceData.max_drawdown > 0.15) {
          recommendations.push('High market volatility causing significant drawdowns - implement volatility-based position sizing');
        }
      }

      if (marketConditions.trend_direction === 'sideways') {
        if (performanceData.success_rate < 0.55) {
          recommendations.push('Poor performance in sideways market - consider range-bound strategies');
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.warn('Error generating market recommendations', { error });
      return [];
    }
  }

  // Data Extraction Utilities

  /**
   * Extract competition level from result
   */
  extractCompetitionLevel(result: any): string {
    try {
      if (!result) return 'unknown';

      const competition = result.competition_level ||
                         result.competition ||
                         result.market_competition ||
                         result.competitive_environment;

      if (competition) {
        if (typeof competition === 'string') {
          const normalized = competition.toLowerCase().trim();
          if (['high', 'intense', 'competitive'].includes(normalized)) return 'high';
          if (['medium', 'moderate', 'average'].includes(normalized)) return 'medium';
          if (['low', 'minimal', 'weak'].includes(normalized)) return 'low';
          return normalized;
        }

        if (typeof competition === 'number') {
          if (competition > 0.7) return 'high';
          if (competition > 0.3) return 'medium';
          return 'low';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting competition level', { error });
      return 'unknown';
    }
  }

  /**
   * Extract regulatory environment from result
   */
  extractRegulatoryEnvironment(result: any): string {
    try {
      if (!result) return 'unknown';

      const regulatory = result.regulatory_environment ||
                        result.regulation ||
                        result.regulatory ||
                        result.compliance_environment;

      if (regulatory) {
        if (typeof regulatory === 'string') {
          const normalized = regulatory.toLowerCase().trim();
          if (['strict', 'heavy', 'regulated'].includes(normalized)) return 'strict';
          if (['moderate', 'normal', 'standard'].includes(normalized)) return 'moderate';
          if (['light', 'minimal', 'flexible'].includes(normalized)) return 'light';
          return normalized;
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting regulatory environment', { error });
      return 'unknown';
    }
  }

  // Context Processing Utilities

  /**
   * Extract performance data from result
   */
  extractPerformanceData(result: any): any {
    try {
      if (!result) return {
        success_rate: 0.5,
        avg_return: 0,
        volatility: 0.15,
        max_drawdown: 0.1
      };

      // Extract performance data from various fact structures
      return {
        success_rate: this.extractSuccessRate(result) || 0.5,
        avg_return: this.extractProfitLoss(result) || 0,
        volatility: this.extractVolatility(result) || 0.15,
        max_drawdown: this.extractDrawdown(result) || 0.1,
        sharpe_ratio: this.extractSharpeRatio(result) || 0,
        win_rate: this.extractWinRate(result) || 0.5,
        total_trades: this.extractSampleSize(result) || 0,
        avg_trade_duration: this.extractAvgTradeDuration(result) || 1,
        strategy_type: this.extractStrategyType(result) || 'unknown',
        risk_level: this.extractRiskOutcome(result) || 'medium'
      };
    } catch (error) {
      this.logger.warn('Error extracting performance data', { error, result });
      return {
        success_rate: 0.5,
        avg_return: 0,
        volatility: 0.15,
        max_drawdown: 0.1
      };
    }
  }

  /**
   * Extract context conditions from result
   */
  extractContextConditions(result: any): any {
    try {
      if (!result) return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        trend_direction: 'unknown',
        sector: 'unknown',
        time_period: 'unknown',
        market_sentiment: 'neutral',
        liquidity: 'unknown',
        competition_level: 'unknown',
        regulatory_environment: 'unknown'
      };

      // Extract context conditions from various fact structures
      return {
        market_regime: this.extractMarketRegime(result),
        volatility: this.extractVolatility(result),
        volume_ratio: this.extractVolumeRatio(result),
        trend_direction: this.extractTrendDirection(result),
        sector: this.extractSector(result),
        time_period: this.extractTimeEffectiveness(result),
        market_sentiment: this.extractMarketSentiment(result),
        liquidity: this.extractLiquidity(result),
        competition_level: this.extractCompetitionLevel(result),
        regulatory_environment: this.extractRegulatoryEnvironment(result)
      };
    } catch (error) {
      this.logger.warn('Error extracting context conditions', { error, result });
      return {
        market_regime: 'unknown',
        volatility: 0.15,
        volume_ratio: 1,
        trend_direction: 'unknown',
        sector: 'unknown',
        time_period: 'unknown',
        market_sentiment: 'neutral',
        liquidity: 'unknown',
        competition_level: 'unknown',
        regulatory_environment: 'unknown'
      };
    }
  }

  /**
   * Extract key insights from result
   */
  extractKeyInsights(result: any): string[] {
    try {
      if (!result) return [];

      const insights: string[] = [];

      // Extract insights from various fact structures
      if (result.key_insights) {
        if (Array.isArray(result.key_insights)) {
          insights.push(...result.key_insights);
        } else if (typeof result.key_insights === 'string') {
          insights.push(result.key_insights);
        }
      }

      if (result.insights) {
        if (Array.isArray(result.insights)) {
          insights.push(...result.insights);
        } else if (typeof result.insights === 'string') {
          insights.push(result.insights);
        }
      }

      if (result.analysis) {
        if (Array.isArray(result.analysis)) {
          insights.push(...result.analysis);
        } else if (typeof result.analysis === 'string') {
          insights.push(result.analysis);
        }
      }

      // Extract insights from content text
      if (result.content || result.fact) {
        const content = result.content || result.fact;
        if (typeof content === 'string') {
          const extractedInsights = this.extractInsightsFromText(content);
          insights.push(...extractedInsights);
        }
      }

      // Generate insights from performance data
      const performanceInsights = this.generatePerformanceInsights(result);
      insights.push(...performanceInsights);

      // Remove duplicates and empty strings
      return [...new Set(insights.filter(insight => insight && insight.trim()))];
    } catch (error) {
      this.logger.warn('Error extracting key insights', { error, result });
      return [];
    }
  }

  /**
   * Generate recommendations based on performance data and criteria
   */
  generateRecommendations(performanceData: any, criteria: any): string[] {
    try {
      if (!performanceData) return ['Insufficient data for recommendations'];

      const recommendations: string[] = [];

      // Analyze success rate
      if (performanceData.success_rate > 0.7) {
        recommendations.push('Strategy performing well - consider increasing position size');
      } else if (performanceData.success_rate < 0.4) {
        recommendations.push('Strategy underperforming - review entry/exit criteria');
      }

      // Analyze volatility
      if (performanceData.volatility > 0.25) {
        recommendations.push('High volatility detected - consider risk management adjustments');
      }

      // Analyze drawdown
      if (performanceData.max_drawdown > 0.15) {
        recommendations.push('Significant drawdown - implement stop-loss measures');
      }

      // Strategy-specific recommendations
      if (performanceData.strategy_type) {
        const strategyRecs = this.generateStrategyRecommendations(performanceData.strategy_type, performanceData);
        recommendations.push(...strategyRecs);
      }

      // Risk-based recommendations
      if (performanceData.risk_level) {
        const riskRecs = this.generateRiskRecommendations(performanceData.risk_level, performanceData);
        recommendations.push(...riskRecs);
      }

      // Market condition recommendations
      if (criteria?.market_conditions) {
        const marketRecs = this.generateMarketRecommendations(criteria.market_conditions, performanceData);
        recommendations.push(...marketRecs);
      }

      return recommendations.length > 0 ? recommendations : ['Monitor performance and adjust as needed'];
    } catch (error) {
      this.logger.warn('Error generating recommendations', { error, performanceData });
      return ['Unable to generate recommendations due to data processing error'];
    }
  }

  // Placeholder methods for data extraction (to be implemented based on existing patterns)

  private extractSuccessRate(result: any): number {
    // Implementation would extract success rate from result
    return result?.success_rate || result?.win_rate || 0.5;
  }

  private extractProfitLoss(result: any): number {
    // Implementation would extract profit/loss from result
    return result?.profit_loss || result?.pnl || result?.return || 0;
  }

  private extractVolatility(result: any): number {
    // Implementation would extract volatility from result
    return result?.volatility || result?.std_dev || 0.15;
  }

  private extractDrawdown(result: any): number {
    // Implementation would extract drawdown from result
    return result?.drawdown || result?.max_drawdown || 0.1;
  }

  private extractSharpeRatio(result: any): number {
    // Implementation would extract Sharpe ratio from result
    return result?.sharpe_ratio || result?.risk_adjusted_return || 0;
  }

  private extractWinRate(result: any): number {
    // Implementation would extract win rate from result
    return result?.win_rate || result?.success_rate || 0.5;
  }

  private extractSampleSize(result: any): number {
    // Implementation would extract sample size from result
    return result?.sample_size || result?.total_trades || 0;
  }

  private extractAvgTradeDuration(result: any): number {
    // Implementation would extract average trade duration from result
    return result?.avg_trade_duration || result?.holding_period || 1;
  }

  private extractStrategyType(result: any): string {
    // Implementation would extract strategy type from result
    return result?.strategy_type || result?.trading_strategy || 'unknown';
  }

  private extractRiskOutcome(result: any): string {
    // Implementation would extract risk outcome from result
    return result?.risk_outcome || result?.risk_level || 'medium';
  }

  private extractMarketRegime(result: any): string {
    // Implementation would extract market regime from result
    return result?.market_regime || 'unknown';
  }

  private extractVolumeRatio(result: any): number {
    // Implementation would extract volume ratio from result
    return result?.volume_ratio || 1;
  }

  private extractTrendDirection(result: any): string {
    // Implementation would extract trend direction from result
    return result?.trend_direction || 'unknown';
  }

  private extractSector(result: any): string {
    // Implementation would extract sector from result
    return result?.sector || 'unknown';
  }

  private extractTimeEffectiveness(result: any): string {
    // Implementation would extract time effectiveness from result
    return result?.time_effectiveness || result?.time_horizon || 'unknown';
  }

  private extractMarketSentiment(result: any): string {
    // Implementation would extract market sentiment from result
    return result?.market_sentiment || 'neutral';
  }

  private extractLiquidity(result: any): string {
    // Implementation would extract liquidity from result
    return result?.liquidity || 'unknown';
  }

  // Static Utility Methods

  /**
   * Calculate similarity between two market condition objects (static method)
   */
  static calculateMarketSimilarity(conditions1: any, conditions2: any): number {
    if (!conditions1 || !conditions2) return 0;

    let similarity = 0;
    let factors = 0;

    // Compare each field
    for (const key of ['market_regime', 'volatility', 'volume_ratio', 'trend_direction']) {
      if (conditions1[key] !== undefined && conditions2[key] !== undefined) {
        if (typeof conditions1[key] === 'string') {
          similarity += conditions1[key] === conditions2[key] ? 1 : 0;
        } else {
          const diff = Math.abs(conditions1[key] - conditions2[key]);
          const normalizedDiff = Math.min(diff / Math.abs(conditions1[key] || 1), 1);
          similarity += 1 - normalizedDiff;
        }
        factors++;
      }
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Generate search keywords from market conditions (static method)
   */
  static generateSearchKeywords(conditions: any): string[] {
    const keywords = [];

    if (conditions.market_regime) {
      keywords.push(conditions.market_regime);
    }

    if (conditions.volatility !== undefined) {
      if (conditions.volatility > 0.05) {
        keywords.push('high_volatility');
      } else if (conditions.volatility < 0.02) {
        keywords.push('low_volatility');
      } else {
        keywords.push('normal_volatility');
      }
    }

    if (conditions.trend_direction) {
      keywords.push(conditions.trend_direction);
    }

    return keywords;
  }
}

/**
 * Factory function to create ContextRetrievalUtils
 */
export function createContextRetrievalUtils(logger?: any): ContextRetrievalUtils {
  return new ContextRetrievalUtils(logger);
}