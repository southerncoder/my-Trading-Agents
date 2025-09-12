import { createLogger } from '../../../utils/enhanced-logger';

/**
 * ContextRetrievalUtils - Utility functions for context retrieval operations
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class ContextRetrievalUtils {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'ContextRetrievalUtils');
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

  /**
   * Generate performance-based insights
   */
  generatePerformanceInsights(result: any): string[] {
    try {
      const insights: string[] = [];

      // Extract basic performance data
      const successRate = this.extractSuccessRate(result);
      const volatility = this.extractVolatility(result);
      const maxDrawdown = this.extractDrawdown(result);
      const sharpeRatio = this.extractSharpeRatio(result);

      // Success rate insights
      if (successRate > 0.7) {
        insights.push('High success rate indicates strong strategy performance');
      } else if (successRate < 0.4) {
        insights.push('Low success rate suggests need for strategy refinement');
      }

      // Volatility insights
      if (volatility > 0.25) {
        insights.push('High volatility may require enhanced risk management');
      }

      // Drawdown insights
      if (maxDrawdown > 0.15) {
        insights.push('Significant drawdown indicates potential risk exposure');
      }

      // Sharpe ratio insights
      if (sharpeRatio > 1.5) {
        insights.push('Strong risk-adjusted returns indicate efficient strategy');
      } else if (sharpeRatio < 0.5) {
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

  /**
   * Extract success rate from result
   */
  private extractSuccessRate(result: any): number {
    try {
      if (!result) return 0;

      const successRate = result.success_rate ||
                         result.win_rate ||
                         result.accuracy ||
                         result.success ||
                         result.performance;

      if (typeof successRate === 'number') {
        return Math.max(0, Math.min(1, successRate));
      }

      if (typeof successRate === 'string') {
        const parsed = parseFloat(successRate.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed / 100));
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting success rate', { error });
      return 0;
    }
  }

  /**
   * Extract volatility from result
   */
  private extractVolatility(result: any): number {
    try {
      if (!result) return 0.15;

      const volatility = result.volatility ||
                        result.market_conditions?.volatility ||
                        result.technical_indicators?.volatility ||
                        result.volatility_level ||
                        result.vol;

      if (typeof volatility === 'number') {
        return Math.max(0, Math.min(1, volatility));
      }

      if (typeof volatility === 'string') {
        const parsed = parseFloat(volatility.replace('%', '')) / 100;
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed));
        }
      }

      return 0.15;
    } catch (error) {
      this.logger.warn('Error extracting volatility', { error });
      return 0.15;
    }
  }

  /**
   * Extract drawdown from result
   */
  private extractDrawdown(result: any): number {
    try {
      if (!result) return 0;

      const drawdown = result.drawdown ||
                      result.max_drawdown ||
                      result.drawdown_max ||
                      result.dd;

      if (typeof drawdown === 'number') {
        return Math.abs(drawdown);
      }

      if (typeof drawdown === 'string') {
        const parsed = parseFloat(drawdown.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.abs(parsed / 100);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting drawdown', { error });
      return 0;
    }
  }

  /**
   * Extract Sharpe ratio from result
   */
  private extractSharpeRatio(result: any): number {
    try {
      if (!result) return 0;

      const sharpeRatio = result.sharpe_ratio ||
                         result.sharpe ||
                         result.risk_adjusted_return ||
                         result.risk_adjusted;

      if (typeof sharpeRatio === 'number') {
        return sharpeRatio;
      }

      if (typeof sharpeRatio === 'string') {
        const parsed = parseFloat(sharpeRatio);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting Sharpe ratio', { error });
      return 0;
    }
  }

  /**
   * Calculate temporal similarity (more recent = higher score)
   */
  calculateTemporalSimilarity(result: any): number {
    if (!result.created_at) return 0.5;

    const resultDate = new Date(result.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

    // More recent memories are more relevant
    return Math.max(0, 1 - daysDiff / 365); // Decay over a year
  }

  /**
   * Calculate outcome similarity using basic comparison
   */
  async calculateOutcomeSimilarity(result: any, criteria: any): Promise<number> {
    try {
      if (!result || !criteria) return 0.5;

      let similarity = 0;
      let factors = 0;

      // Compare success rates
      if (result.success_rate !== undefined && criteria.target_success_rate !== undefined) {
        const successDiff = Math.abs(result.success_rate - criteria.target_success_rate);
        similarity += Math.max(0, 1 - successDiff);
        factors++;
      }

      // Compare risk levels
      if (result.risk_level && criteria.risk_tolerance) {
        const riskMatch = result.risk_level === criteria.risk_tolerance ? 1 : 0;
        similarity += riskMatch;
        factors++;
      }

      // Compare strategy types
      if (result.strategy_type && criteria.strategy_type) {
        const strategyMatch = result.strategy_type === criteria.strategy_type ? 1 : 0;
        similarity += strategyMatch;
        factors++;
      }

      return factors > 0 ? similarity / factors : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating outcome similarity', { error });
      return 0.5;
    }
  }

  /**
   * Build scenario search query from current scenario
   */
  buildScenarioSearchQuery(currentScenario: any): string {
    try {
      const queryParts = [];

      if (currentScenario.market_conditions?.market_regime) {
        queryParts.push(`market_regime:${currentScenario.market_conditions.market_regime}`);
      }

      if (currentScenario.technical_indicators) {
        if (currentScenario.technical_indicators.rsi) {
          queryParts.push(`rsi:${currentScenario.technical_indicators.rsi > 70 ? 'overbought' : currentScenario.technical_indicators.rsi < 30 ? 'oversold' : 'neutral'}`);
        }
        if (currentScenario.technical_indicators.trend_direction) {
          queryParts.push(`trend:${currentScenario.technical_indicators.trend_direction}`);
        }
      }

      if (currentScenario.context_description) {
        // Extract key terms from context description
        const keyTerms = this.extractKeyTerms(currentScenario.context_description);
        queryParts.push(...keyTerms.slice(0, 3)); // Limit to top 3 terms
      }

      return queryParts.length > 0 ? queryParts.join(' ') : 'trading pattern market';
    } catch (error) {
      this.logger.warn('Error building scenario search query', { error });
      return 'trading pattern market';
    }
  }

  /**
   * Extract key terms from text
   */
  private extractKeyTerms(text: string): string[] {
    try {
      if (!text || typeof text !== 'string') return [];

      // Simple keyword extraction - in a real implementation, this could use NLP
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3); // Filter out short words

      // Count word frequency
      const wordCount: Record<string, number> = {};
      for (const word of words) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }

      // Return most frequent words
      return Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
    } catch (error) {
      this.logger.warn('Error extracting key terms', { error });
      return [];
    }
  }

  /**
   * Calculate scenario similarity between current and historical scenarios
   */
  calculateScenarioSimilarity(currentScenario: any, historicalResult: any): number {
    try {
      let similarity = 0;
      let factors = 0;

      // Compare market conditions
      if (currentScenario.market_conditions && historicalResult.market_conditions) {
        const marketSim = this.calculateMarketConditionsSimilarity(
          currentScenario.market_conditions,
          historicalResult.market_conditions
        );
        similarity += marketSim;
        factors++;
      }

      // Compare technical indicators
      if (currentScenario.technical_indicators && historicalResult.technical_indicators) {
        const technicalSim = this.calculateTechnicalIndicatorsSimilarity(
          currentScenario.technical_indicators,
          historicalResult.technical_indicators
        );
        similarity += technicalSim;
        factors++;
      }

      // Compare context descriptions (simple text similarity)
      if (currentScenario.context_description && historicalResult.fact) {
        const textSim = this.calculateSimpleTextSimilarity(
          currentScenario.context_description,
          historicalResult.fact
        );
        similarity += textSim;
        factors++;
      }

      return factors > 0 ? similarity / factors : 0.5;
    } catch (error) {
      this.logger.warn('Error calculating scenario similarity', { error });
      return 0.5;
    }
  }

  /**
   * Calculate market conditions similarity
   */
  private calculateMarketConditionsSimilarity(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let totalSimilarity = 0;
    let factors = 0;

    // Market regime similarity
    if (current.market_regime && historical.market_regime) {
      totalSimilarity += current.market_regime === historical.market_regime ? 1 : 0;
      factors++;
    }

    // Volatility similarity
    if (current.volatility !== undefined && historical.volatility !== undefined) {
      const volDiff = Math.abs(current.volatility - historical.volatility);
      totalSimilarity += Math.max(0, 1 - volDiff / 0.1); // Normalize by 10% volatility
      factors++;
    }

    // Volume ratio similarity
    if (current.volume_ratio !== undefined && historical.volume_ratio !== undefined) {
      const volDiff = Math.abs(current.volume_ratio - historical.volume_ratio);
      totalSimilarity += Math.max(0, 1 - volDiff / 2); // Normalize by 2x volume ratio
      factors++;
    }

    return factors > 0 ? totalSimilarity / factors : 0.5;
  }

  /**
   * Calculate technical indicators similarity
   */
  private calculateTechnicalIndicatorsSimilarity(current: any, historical: any): number {
    if (!current || !historical) return 0.5;

    let totalSimilarity = 0;
    let factors = 0;

    // RSI similarity
    if (current.rsi !== undefined && historical.rsi !== undefined) {
      const rsiDiff = Math.abs(current.rsi - historical.rsi);
      totalSimilarity += Math.max(0, 1 - rsiDiff / 100);
      factors++;
    }

    // MACD similarity
    if (current.macd !== undefined && historical.macd !== undefined) {
      const macdDiff = Math.abs(current.macd - historical.macd);
      totalSimilarity += Math.max(0, 1 - macdDiff / 2);
      factors++;
    }

    return factors > 0 ? totalSimilarity / factors : 0.5;
  }

  /**
   * Calculate simple text similarity
   */
  private calculateSimpleTextSimilarity(text1: string, text2: string): number {
    try {
      if (!text1 || !text2) return 0.5;

      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      if (union.size === 0) return 1;

      return intersection.size / union.size;
    } catch (error) {
      this.logger.warn('Error calculating simple text similarity', { error });
      return 0.5;
    }
  }

  /**
   * Extract market conditions from fact
   */
  extractMarketConditionsFromFact(fact: any): any {
    try {
      if (!fact) return {};

      return {
        market_regime: fact.market_regime || fact.market_conditions?.regime,
        volatility: fact.volatility || fact.market_conditions?.volatility,
        trend_direction: fact.trend_direction || fact.market_conditions?.trend,
        volume_ratio: fact.volume_ratio || fact.market_data?.volume_ratio,
        price_level: fact.price_level || fact.market_data?.price
      };
    } catch (error) {
      this.logger.warn('Error extracting market conditions from fact', { error });
      return {};
    }
  }

  /**
   * Extract outcomes from fact
   */
  extractOutcomesFromFact(fact: any): any {
    try {
      if (!fact) return {};

      return {
        success_rate: fact.success_rate || fact.performance,
        profit_loss: fact.profit_loss || fact.pnl || fact.return,
        risk_level: fact.risk_level || fact.risk_outcome,
        strategy_type: fact.strategy_type || fact.trading_strategy,
        time_effectiveness: fact.time_effectiveness || fact.time_horizon
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes from fact', { error });
      return {};
    }
  }

  /**
   * Extract technical indicators from result
   */
  extractTechnicalIndicators(result: any): any {
    try {
      if (!result) return {};

      return {
        rsi: result.rsi || result.technical_indicators?.rsi,
        macd: result.macd || result.technical_indicators?.macd,
        bollinger_upper: result.bollinger_upper || result.technical_indicators?.bollinger_upper,
        bollinger_lower: result.bollinger_lower || result.technical_indicators?.bollinger_lower,
        momentum: result.momentum || result.technical_indicators?.momentum,
        volume: result.volume || result.market_data?.volume
      };
    } catch (error) {
      this.logger.warn('Error extracting technical indicators', { error });
      return {};
    }
  }

  /**
   * Extract conditions from result
   */
  extractConditions(result: any): any {
    try {
      if (!result) return {};

      return {
        market_regime: result.market_regime || result.market_conditions?.regime,
        volatility: result.volatility || result.market_conditions?.volatility,
        volume_ratio: result.volume_ratio || result.market_data?.volume_ratio,
        price_level: result.price_level || result.market_data?.price,
        trend_direction: result.trend_direction || result.market_conditions?.trend,
        momentum: result.momentum || result.market_conditions?.momentum,
        sector: result.sector || result.market_data?.sector,
        market_cap: result.market_cap || result.company_data?.market_cap,
        trading_volume: result.trading_volume || result.market_data?.volume,
        price_change: result.price_change || result.market_data?.price_change,
        volatility_regime: result.volatility_regime || result.vol_regime,
        liquidity: result.liquidity || result.market_data?.liquidity,
        market_sentiment: result.market_sentiment || result.sentiment
      };
    } catch (error) {
      this.logger.warn('Error extracting conditions from result', { error });
      return {};
    }
  }

  /**
   * Extract outcomes from result
   */
  extractOutcomes(result: any): any {
    try {
      if (!result) return {};

      return {
        strategy_type: result.strategy_type || result.trading_strategy,
        success_rate: result.success_rate || result.win_rate,
        profit_loss: result.profit_loss || result.pnl,
        risk_outcome: result.risk_outcome || result.risk_level,
        time_effectiveness: result.time_effectiveness || result.time_horizon,
        confidence_score: result.confidence_score || result.confidence,
        market_impact: result.market_impact || result.alpha,
        drawdown: result.drawdown || result.max_drawdown,
        sharpe_ratio: result.sharpe_ratio || result.sharpe,
        execution_quality: result.execution_quality || result.slippage,
        outcome_category: result.outcome_category || result.category,
        lessons_learned: result.lessons_learned || result.lessons,
        win_rate: result.win_rate || result.success_rate,
        avg_trade_duration: result.avg_trade_duration || result.holding_period,
        sample_size: result.sample_size || result.total_trades
      };
    } catch (error) {
      this.logger.warn('Error extracting outcomes from result', { error });
      return {};
    }
  }

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

      return {
        success_rate: this.extractSuccessRate(result) || 0.5,
        avg_return: this.extractProfitLoss(result) || 0,
        volatility: this.extractVolatility(result) || 0.15,
        max_drawdown: this.extractDrawdown(result) || 0.1,
        sharpe_ratio: this.extractSharpeRatio(result) || 0,
        win_rate: this.extractWinRate(result) || 0.5,
        total_trades: this.extractSampleSize(result) || 0,
        avg_trade_duration: this.extractAvgTradeDuration(result) || 1,
        strategy_type: result.strategy_type || 'unknown',
        risk_level: result.risk_level || 'medium'
      };
    } catch (error) {
      this.logger.warn('Error extracting performance data', { error });
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
      if (!result) return {};

      return {
        market_regime: result.market_regime || result.market_conditions?.regime,
        volatility: result.volatility || result.market_conditions?.volatility,
        volume_ratio: result.volume_ratio || result.market_data?.volume_ratio,
        trend_direction: result.trend_direction || result.market_conditions?.trend,
        sector: result.sector || result.market_data?.sector,
        time_period: result.time_period || result.time_horizon,
        market_sentiment: result.market_sentiment || result.sentiment,
        liquidity: result.liquidity || result.market_data?.liquidity,
        competition_level: result.competition_level || result.competition,
        regulatory_environment: result.regulatory_environment || result.regulation
      };
    } catch (error) {
      this.logger.warn('Error extracting context conditions', { error });
      return {};
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
      this.logger.warn('Error extracting key insights', { error });
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

  /**
   * Extract profit/loss from result
   */
  private extractProfitLoss(result: any): number {
    try {
      if (!result) return 0;

      const profitLoss = result.profit_loss ||
                        result.pnl ||
                        result.return ||
                        result.performance ||
                        result.profit ||
                        result.loss;

      if (typeof profitLoss === 'number') {
        return profitLoss;
      }

      if (typeof profitLoss === 'string') {
        const parsed = parseFloat(profitLoss.replace(/[$,]/g, ''));
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting profit loss', { error });
      return 0;
    }
  }

  /**
   * Extract win rate from result
   */
  private extractWinRate(result: any): number {
    try {
      if (!result) return 0;

      const winRate = result.win_rate ||
                     result.success_rate ||
                     result.accuracy ||
                     result.win_percentage;

      if (typeof winRate === 'number') {
        return Math.max(0, Math.min(1, winRate));
      }

      if (typeof winRate === 'string') {
        const parsed = parseFloat(winRate.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed / 100));
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting win rate', { error });
      return 0;
    }
  }

  /**
   * Extract average trade duration from result
   */
  private extractAvgTradeDuration(result: any): number {
    try {
      if (!result) return 1;

      const duration = result.avg_trade_duration ||
                      result.holding_period ||
                      result.duration ||
                      result.avg_duration ||
                      result.trade_duration;

      if (typeof duration === 'number') {
        return Math.max(0, duration);
      }

      if (typeof duration === 'string') {
        const parsed = this.parseDurationString(duration);
        if (parsed > 0) {
          return parsed;
        }
      }

      return 1;
    } catch (error) {
      this.logger.warn('Error extracting avg trade duration', { error });
      return 1;
    }
  }

  /**
   * Extract sample size from result
   */
  private extractSampleSize(result: any): number {
    try {
      if (!result) return 0;

      const sampleSize = result.sample_size ||
                        result.n ||
                        result.count ||
                        result.total_trades ||
                        result.num_trades;

      if (typeof sampleSize === 'number') {
        return Math.max(0, sampleSize);
      }

      if (typeof sampleSize === 'string') {
        const parsed = parseInt(sampleSize.replace(/,/g, ''));
        if (!isNaN(parsed)) {
          return Math.max(0, parsed);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting sample size', { error });
      return 0;
    }
  }

  /**
   * Parse duration string
   */
  private parseDurationString(durationStr: string): number {
    try {
      const str = durationStr.toLowerCase().trim();
      const match = str.match(/(\d+(?:\.\d+)?)\s*(day|week|month|year|hour|minute)s?/);

      if (match) {
        const value = parseFloat(match[1] || '0');
        const unit = match[2];

        switch (unit) {
          case 'day': return value;
          case 'week': return value * 7;
          case 'month': return value * 30;
          case 'year': return value * 365;
          case 'hour': return value / 24;
          case 'minute': return value / (24 * 60);
          default: return value;
        }
      }

      const parsed = parseFloat(str);
      if (!isNaN(parsed)) {
        return parsed;
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error parsing duration string', { error, durationStr });
      return 0;
    }
  }
}

/**
 * Factory function to create ContextRetrievalUtils
 */
export function createContextRetrievalUtils(logger?: any): ContextRetrievalUtils {
  return new ContextRetrievalUtils(logger);
}