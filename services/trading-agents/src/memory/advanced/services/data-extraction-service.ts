import { createLogger } from '../../../utils/enhanced-logger';

/**
 * DataExtractionService - Handles extraction of data from Zep facts
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class DataExtractionService {
  private logger: any;

  constructor(logger?: any) {
    this.logger = logger || createLogger('system', 'DataExtractionService');
  }

  /**
   * Extract market regime from result
   */
  extractMarketRegime(result: any): string {
    try {
      if (!result) return 'unknown';

      // Check various possible locations for market regime data
      const regime = result.market_regime ||
                    result.market_conditions?.regime ||
                    result.regime ||
                    result.market_state;

      if (regime) {
        // Normalize regime values
        const normalized = regime.toLowerCase().trim();
        if (['bull', 'bullish', 'uptrend', 'rising'].includes(normalized)) return 'bull';
        if (['bear', 'bearish', 'downtrend', 'falling'].includes(normalized)) return 'bear';
        if (['sideways', 'range', 'consolidation', 'neutral'].includes(normalized)) return 'sideways';
        if (['volatile', 'high_volatility', 'turbulent'].includes(normalized)) return 'high_volatility';
        return normalized;
      }

      // Try to infer from other data
      if (result.trend_direction) {
        const trend = result.trend_direction.toLowerCase();
        if (['up', 'bullish', 'rising'].includes(trend)) return 'bull';
        if (['down', 'bearish', 'falling'].includes(trend)) return 'bear';
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting market regime', { error });
      return 'unknown';
    }
  }

  /**
   * Extract volatility from result
   */
  extractVolatility(result: any): number {
    try {
      if (!result) return 0.15; // Default 15% volatility

      const volatility = result.volatility ||
                        result.market_conditions?.volatility ||
                        result.technical_indicators?.volatility ||
                        result.volatility_level ||
                        result.vol;

      if (typeof volatility === 'number') {
        return Math.max(0, Math.min(1, volatility)); // Ensure 0-1 range
      }

      if (typeof volatility === 'string') {
        // Try to parse percentage strings like "15%" or "0.15"
        const parsed = parseFloat(volatility.replace('%', '')) / 100;
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed));
        }
      }

      return 0.15; // Default
    } catch (error) {
      this.logger.warn('Error extracting volatility', { error });
      return 0.15;
    }
  }

  /**
   * Extract volume ratio from result
   */
  extractVolumeRatio(result: any): number {
    try {
      if (!result) return 1.0; // Normal volume

      const volumeRatio = result.volume_ratio ||
                         result.market_data?.volume_ratio ||
                         result.volume?.ratio ||
                         result.relative_volume;

      if (typeof volumeRatio === 'number') {
        return Math.max(0, volumeRatio);
      }

      return 1.0; // Default normal volume
    } catch (error) {
      this.logger.warn('Error extracting volume ratio', { error });
      return 1.0;
    }
  }

  /**
   * Extract price level from result
   */
  extractPriceLevel(result: any): number {
    try {
      if (!result) return 0;

      const price = result.price_level ||
                   result.market_data?.price ||
                   result.current_price ||
                   result.price ||
                   result.close ||
                   result.last_price;

      if (typeof price === 'number') {
        return Math.max(0, price);
      }

      if (typeof price === 'string') {
        const parsed = parseFloat(price.replace(/[$,]/g, ''));
        if (!isNaN(parsed)) {
          return Math.max(0, parsed);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting price level', { error });
      return 0;
    }
  }

  /**
   * Extract trend direction from result
   */
  extractTrendDirection(result: any): string {
    try {
      if (!result) return 'unknown';

      const trend = result.trend_direction ||
                   result.market_conditions?.trend ||
                   result.technical_indicators?.trend ||
                   result.trend ||
                   result.direction;

      if (trend) {
        const normalized = trend.toLowerCase().trim();
        if (['up', 'upward', 'bullish', 'rising', 'ascending'].includes(normalized)) return 'up';
        if (['down', 'downward', 'bearish', 'falling', 'descending'].includes(normalized)) return 'down';
        if (['sideways', 'flat', 'neutral', 'range'].includes(normalized)) return 'sideways';
        return normalized;
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting trend direction', { error });
      return 'unknown';
    }
  }

  /**
   * Extract momentum from result
   */
  extractMomentum(result: any): number {
    try {
      if (!result) return 0;

      const momentum = result.momentum ||
                      result.technical_indicators?.momentum ||
                      result.market_conditions?.momentum ||
                      result.momentum_indicator ||
                      result.mom;

      if (typeof momentum === 'number') {
        return Math.max(-1, Math.min(1, momentum)); // Ensure -1 to 1 range
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting momentum', { error });
      return 0;
    }
  }

  /**
   * Extract sector from result
   */
  extractSector(result: any): string {
    try {
      if (!result) return 'unknown';

      const sector = result.sector ||
                    result.market_data?.sector ||
                    result.industry ||
                    result.category;

      if (sector && typeof sector === 'string') {
        return sector.toLowerCase().trim();
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting sector', { error });
      return 'unknown';
    }
  }

  /**
   * Extract market cap from result
   */
  extractMarketCap(result: any): number {
    try {
      if (!result) return 0;

      const marketCap = result.market_cap ||
                       result.company_data?.market_cap ||
                       result.market_capitalization ||
                       result.cap;

      if (typeof marketCap === 'number') {
        return Math.max(0, marketCap);
      }

      if (typeof marketCap === 'string') {
        // Parse strings like "1.5B", "2.3T", etc.
        const parsed = this.parseMarketCapString(marketCap);
        if (parsed > 0) {
          return parsed;
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting market cap', { error });
      return 0;
    }
  }

  /**
   * Extract trading volume from result
   */
  extractTradingVolume(result: any): number {
    try {
      if (!result) return 0;

      const volume = result.trading_volume ||
                    result.market_data?.volume ||
                    result.volume ||
                    result.daily_volume;

      if (typeof volume === 'number') {
        return Math.max(0, volume);
      }

      if (typeof volume === 'string') {
        const parsed = parseFloat(volume.replace(/[$,]/g, ''));
        if (!isNaN(parsed)) {
          return Math.max(0, parsed);
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting trading volume', { error });
      return 0;
    }
  }

  /**
   * Extract price change from result
   */
  extractPriceChange(result: any): number {
    try {
      if (!result) return 0;

      const change = result.price_change ||
                    result.market_data?.price_change ||
                    result.change ||
                    result.daily_change ||
                    result.percent_change;

      if (typeof change === 'number') {
        return change; // Can be negative
      }

      if (typeof change === 'string') {
        const parsed = parseFloat(change.replace('%', ''));
        if (!isNaN(parsed)) {
          return parsed / 100; // Convert percentage to decimal
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting price change', { error });
      return 0;
    }
  }

  /**
   * Extract volatility regime from result
   */
  extractVolatilityRegime(result: any): string {
    try {
      if (!result) return 'unknown';

      const volRegime = result.volatility_regime ||
                       result.vol_regime ||
                       result.volatility_level;

      if (volRegime) {
        const normalized = volRegime.toLowerCase().trim();
        if (['low', 'calm', 'stable'].includes(normalized)) return 'low';
        if (['medium', 'moderate', 'normal'].includes(normalized)) return 'medium';
        if (['high', 'volatile', 'turbulent'].includes(normalized)) return 'high';
        return normalized;
      }

      // Infer from volatility value
      const volatility = this.extractVolatility(result);
      if (volatility < 0.1) return 'low';
      if (volatility < 0.25) return 'medium';
      return 'high';
    } catch (error) {
      this.logger.warn('Error extracting volatility regime', { error });
      return 'unknown';
    }
  }

  /**
   * Extract liquidity from result
   */
  extractLiquidity(result: any): number {
    try {
      if (!result) return 0.5; // Default medium liquidity

      const liquidity = result.liquidity ||
                       result.market_data?.liquidity ||
                       result.liquidity_score ||
                       result.liquidity_ratio;

      if (typeof liquidity === 'number') {
        return Math.max(0, Math.min(1, liquidity)); // Ensure 0-1 range
      }

      // Infer from volume and market cap
      const volume = this.extractTradingVolume(result);
      const marketCap = this.extractMarketCap(result);

      if (volume > 0 && marketCap > 0) {
        // Simple liquidity proxy: volume / market_cap
        const inferredLiquidity = Math.min(1, volume / marketCap * 1000000); // Scale factor
        return Math.max(0, Math.min(1, inferredLiquidity));
      }

      return 0.5; // Default
    } catch (error) {
      this.logger.warn('Error extracting liquidity', { error });
      return 0.5;
    }
  }

  /**
   * Extract market sentiment from result
   */
  extractMarketSentiment(result: any): string {
    try {
      if (!result) return 'neutral';

      const sentiment = result.market_sentiment ||
                       result.sentiment ||
                       result.market_mood ||
                       result.sentiment_score;

      if (sentiment) {
        if (typeof sentiment === 'string') {
          const normalized = sentiment.toLowerCase().trim();
          if (['positive', 'bullish', 'optimistic', 'good'].includes(normalized)) return 'positive';
          if (['negative', 'bearish', 'pessimistic', 'bad'].includes(normalized)) return 'negative';
          if (['neutral', 'mixed', 'balanced'].includes(normalized)) return 'neutral';
          return normalized;
        }

        if (typeof sentiment === 'number') {
          if (sentiment > 0.2) return 'positive';
          if (sentiment < -0.2) return 'negative';
          return 'neutral';
        }
      }

      return 'neutral';
    } catch (error) {
      this.logger.warn('Error extracting market sentiment', { error });
      return 'neutral';
    }
  }

  /**
   * Extract strategy type from result
   */
  extractStrategyType(result: any): string {
    try {
      if (!result) return 'unknown';

      const strategy = result.strategy_type ||
                      result.trading_strategy ||
                      result.approach ||
                      result.strategy ||
                      result.method;

      if (strategy && typeof strategy === 'string') {
        const normalized = strategy.toLowerCase().trim();
        // Normalize common strategy types
        if (['momentum', 'trend', 'trend_following'].includes(normalized)) return 'momentum';
        if (['mean_reversion', 'reversion', 'mr'].includes(normalized)) return 'mean_reversion';
        if (['breakout', 'break_out'].includes(normalized)) return 'breakout';
        if (['scalping', 'scalp'].includes(normalized)) return 'scalping';
        if (['swing', 'swing_trading'].includes(normalized)) return 'swing';
        if (['position', 'position_trading'].includes(normalized)) return 'position';
        if (['arbitrage', 'arb'].includes(normalized)) return 'arbitrage';
        return normalized;
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting strategy type', { error });
      return 'unknown';
    }
  }

  /**
   * Extract success rate from result
   */
  extractSuccessRate(result: any): number {
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
   * Extract profit/loss from result
   */
  extractProfitLoss(result: any): number {
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
   * Extract risk outcome from result
   */
  extractRiskOutcome(result: any): string {
    try {
      if (!result) return 'unknown';

      const riskOutcome = result.risk_outcome ||
                         result.risk_level ||
                         result.risk_assessment ||
                         result.risk ||
                         result.volatility;

      if (riskOutcome) {
        if (typeof riskOutcome === 'string') {
          const normalized = riskOutcome.toLowerCase().trim();
          if (['low', 'conservative', 'safe'].includes(normalized)) return 'low';
          if (['medium', 'moderate', 'balanced'].includes(normalized)) return 'medium';
          if (['high', 'aggressive', 'risky'].includes(normalized)) return 'high';
          return normalized;
        }

        if (typeof riskOutcome === 'number') {
          if (riskOutcome < 0.15) return 'low';
          if (riskOutcome < 0.25) return 'medium';
          return 'high';
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting risk outcome', { error });
      return 'unknown';
    }
  }

  /**
   * Extract time effectiveness from result
   */
  extractTimeEffectiveness(result: any): string {
    try {
      if (!result) return 'unknown';

      const timeEffectiveness = result.time_effectiveness ||
                               result.time_horizon ||
                               result.holding_period ||
                               result.duration ||
                               result.timeframe;

      if (timeEffectiveness) {
        if (typeof timeEffectiveness === 'string') {
          const normalized = timeEffectiveness.toLowerCase().trim();
          if (['short', 'intraday', 'day'].includes(normalized)) return 'short';
          if (['medium', 'swing', 'week'].includes(normalized)) return 'medium';
          if (['long', 'position', 'month', 'year'].includes(normalized)) return 'long';
          return normalized;
        }

        if (typeof timeEffectiveness === 'number') {
          if (timeEffectiveness <= 1) return 'short'; // 1 day or less
          if (timeEffectiveness <= 30) return 'medium'; // Up to 1 month
          return 'long'; // More than 1 month
        }
      }

      return 'unknown';
    } catch (error) {
      this.logger.warn('Error extracting time effectiveness', { error });
      return 'unknown';
    }
  }

  /**
   * Extract confidence from result
   */
  extractConfidence(result: any): number {
    try {
      if (!result) return 0.5; // Default confidence for missing data

      let confidence = 0.5; // Base confidence
      let factors = 0;

      // Extract confidence from various possible fields
      const confidenceFields = [
        'confidence_score',
        'confidence',
        'certainty',
        'reliability_score',
        'source_reliability',
        'data_quality_score',
        'trust_score',
        'credibility'
      ];

      // Check direct confidence fields
      for (const field of confidenceFields) {
        if (result[field] !== undefined && typeof result[field] === 'number') {
          confidence += this.normalizeConfidenceValue(result[field]);
          factors++;
        }
      }

      // Check nested confidence fields
      if (result.metadata?.confidence_score !== undefined) {
        confidence += this.normalizeConfidenceValue(result.metadata.confidence_score);
        factors++;
      }

      if (result.metadata?.source_reliability !== undefined) {
        confidence += this.normalizeConfidenceValue(result.metadata.source_reliability);
        factors++;
      }

      // Check content-based confidence indicators
      if (result.content && typeof result.content === 'string') {
        confidence += this.calculateContentConfidence(result.content);
        factors++;
      }

      // Check timestamp-based confidence (recency)
      if (result.timestamp || result.created_at) {
        confidence += this.calculateTemporalConfidence(result.timestamp || result.created_at);
        factors++;
      }

      // Check data completeness
      confidence += this.calculateCompletenessConfidence(result);
      factors++;

      // Check source quality indicators
      if (result.source || result.provider) {
        confidence += this.calculateSourceConfidence(result.source || result.provider);
        factors++;
      }

      // Calculate final confidence score
      const finalConfidence = factors > 0 ? confidence / factors : 0.5;

      // Apply bounds and return
      return Math.max(0.1, Math.min(1.0, finalConfidence));

    } catch (error) {
      this.logger.warn('Error extracting confidence from result', { error, resultId: result?.id });
      return 0.5; // Conservative fallback
    }
  }

  /**
   * Extract market impact from result
   */
  extractMarketImpact(result: any): number {
    try {
      if (!result) return 0;

      const marketImpact = result.market_impact ||
                          result.alpha ||
                          result.beta ||
                          result.market_effect ||
                          result.impact;

      if (typeof marketImpact === 'number') {
        return marketImpact;
      }

      if (typeof marketImpact === 'string') {
        const parsed = parseFloat(marketImpact.replace('%', ''));
        if (!isNaN(parsed)) {
          return parsed / 100; // Convert percentage to decimal
        }
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error extracting market impact', { error });
      return 0;
    }
  }

  /**
   * Extract drawdown from result
   */
  extractDrawdown(result: any): number {
    try {
      if (!result) return 0;

      const drawdown = result.drawdown ||
                      result.max_drawdown ||
                      result.drawdown_max ||
                      result.dd;

      if (typeof drawdown === 'number') {
        return Math.abs(drawdown); // Ensure positive
      }

      if (typeof drawdown === 'string') {
        const parsed = parseFloat(drawdown.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.abs(parsed / 100); // Convert percentage to decimal
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
  extractSharpeRatio(result: any): number {
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
   * Extract execution quality from result
   */
  extractExecutionQuality(result: any): number {
    try {
      if (!result) return 0.5;

      const executionQuality = result.execution_quality ||
                              result.slippage ||
                              result.fill_rate ||
                              result.execution ||
                              result.quality;

      if (typeof executionQuality === 'number') {
        return Math.max(0, Math.min(1, executionQuality));
      }

      if (typeof executionQuality === 'string') {
        const normalized = executionQuality.toLowerCase().trim();
        if (['excellent', 'perfect', 'best'].includes(normalized)) return 0.9;
        if (['good', 'high'].includes(normalized)) return 0.8;
        if (['average', 'medium'].includes(normalized)) return 0.6;
        if (['poor', 'low', 'bad'].includes(normalized)) return 0.3;

        const parsed = parseFloat(executionQuality.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed / 100));
        }
      }

      return 0.5;
    } catch (error) {
      this.logger.warn('Error extracting execution quality', { error });
      return 0.5;
    }
  }

  /**
   * Extract win rate from result
   */
  extractWinRate(result: any): number {
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
  extractAvgTradeDuration(result: any): number {
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
        // Try to parse duration strings like "5 days", "2 weeks", etc.
        const parsed = this.parseDurationString(duration);
        if (parsed > 0) {
          return parsed;
        }
      }

      return 1; // Default 1 day
    } catch (error) {
      this.logger.warn('Error extracting avg trade duration', { error });
      return 1;
    }
  }

  /**
   * Extract sample size from result
   */
  extractSampleSize(result: any): number {
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
   * Extract lessons from fact
   */
  extractLessonsFromFact(fact: any): string[] {
    try {
      if (!fact) return [];

      const lessons: string[] = [];

      // Extract lessons from various fact structures
      if (fact.lessons_learned) {
        if (Array.isArray(fact.lessons_learned)) {
          lessons.push(...fact.lessons_learned);
        } else if (typeof fact.lessons_learned === 'string') {
          lessons.push(fact.lessons_learned);
        }
      }

      if (fact.lessons) {
        if (Array.isArray(fact.lessons)) {
          lessons.push(...fact.lessons);
        } else if (typeof fact.lessons === 'string') {
          lessons.push(fact.lessons);
        }
      }

      if (fact.insights) {
        if (Array.isArray(fact.insights)) {
          lessons.push(...fact.insights);
        } else if (typeof fact.insights === 'string') {
          lessons.push(fact.insights);
        }
      }

      if (fact.notes) {
        if (Array.isArray(fact.notes)) {
          lessons.push(...fact.notes);
        } else if (typeof fact.notes === 'string') {
          lessons.push(fact.notes);
        }
      }

      // Extract lessons from content text
      if (fact.content || fact.fact) {
        const content = fact.content || fact.fact;
        if (typeof content === 'string') {
          const extractedLessons = this.extractLessonsFromText(content);
          lessons.push(...extractedLessons);
        }
      }

      // Remove duplicates and empty strings
      return [...new Set(lessons.filter(lesson => lesson && lesson.trim()))];
    } catch (error) {
      this.logger.warn('Error extracting lessons from fact', { error });
      return [];
    }
  }

  /**
   * Extract lessons from text content
   */
  private extractLessonsFromText(text: string): string[] {
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

  // Private helper methods

  /**
   * Parse market cap string
   */
  private parseMarketCapString(marketCapStr: string): number {
    try {
      const str = marketCapStr.toUpperCase().trim();
      let multiplier = 1;

      if (str.includes('T')) {
        multiplier = 1000000000000; // Trillion
      } else if (str.includes('B')) {
        multiplier = 1000000000; // Billion
      } else if (str.includes('M')) {
        multiplier = 1000000; // Million
      } else if (str.includes('K')) {
        multiplier = 1000; // Thousand
      }

      const numericPart = parseFloat(str.replace(/[^0-9.-]/g, ''));
      if (!isNaN(numericPart)) {
        return numericPart * multiplier;
      }

      return 0;
    } catch (error) {
      this.logger.warn('Error parsing market cap string', { error, marketCapStr });
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
          case 'month': return value * 30; // Approximate
          case 'year': return value * 365; // Approximate
          case 'hour': return value / 24;
          case 'minute': return value / (24 * 60);
          default: return value;
        }
      }

      // Try simple number parsing
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

  /**
   * Normalize confidence value to 0-1 range
   */
  private normalizeConfidenceValue(value: number): number {
    try {
      // Handle different confidence scales (0-1, 0-100, 0-10, etc.)
      if (value >= 0 && value <= 1) {
        return value; // Already in 0-1 range
      } else if (value >= 0 && value <= 10) {
        return value / 10; // Scale 0-10 to 0-1
      } else if (value >= 0 && value <= 100) {
        return value / 100; // Scale 0-100 to 0-1
      } else if (value > 1 && value <= 5) {
        return (value - 1) / 4; // Scale 1-5 to 0-1
      } else {
        // For out-of-range values, apply sigmoid normalization
        return 1 / (1 + Math.exp(-value));
      }
    } catch (error) {
      this.logger.warn('Error normalizing confidence value', { error, value });
      return 0.5;
    }
  }

  /**
   * Calculate confidence based on content quality and structure
   */
  private calculateContentConfidence(content: string): number {
    try {
      if (!content || typeof content !== 'string') return 0.3;

      let confidence = 0.5; // Base confidence
      const length = content.length;

      // Length-based confidence
      if (length > 1000) confidence += 0.2; // Substantial content
      else if (length > 500) confidence += 0.1; // Good content length
      else if (length > 100) confidence += 0.05; // Minimal content
      else confidence -= 0.1; // Very short content

      // Structure-based confidence
      const hasSentences = content.includes('.') || content.includes('!') || content.includes('?');
      const hasNumbers = /\d/.test(content);
      const hasStructure = content.includes('\n') || content.includes('-') || content.includes(':');

      if (hasSentences) confidence += 0.1;
      if (hasNumbers) confidence += 0.05;
      if (hasStructure) confidence += 0.05;

      // Language quality indicators
      const wordCount = content.split(/\s+/).length;
      const avgWordLength = length / wordCount;

      if (avgWordLength > 4 && avgWordLength < 8) confidence += 0.1; // Natural word length
      if (wordCount > 50) confidence += 0.05; // Substantial word count

      return Math.max(0.1, Math.min(1.0, confidence));

    } catch (error) {
      this.logger.warn('Error calculating content confidence', { error });
      return 0.5;
    }
  }

  /**
   * Calculate confidence based on temporal factors (recency)
   */
  private calculateTemporalConfidence(timestamp: string | number | Date): number {
    try {
      if (!timestamp) return 0.5;

      const now = new Date();
      let resultDate: Date;

      if (timestamp instanceof Date) {
        resultDate = timestamp;
      } else if (typeof timestamp === 'number') {
        resultDate = new Date(timestamp);
      } else {
        resultDate = new Date(timestamp);
      }

      if (isNaN(resultDate.getTime())) return 0.5; // Invalid date

      const ageInHours = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60);

      // Exponential decay: newer data has higher confidence
      // Half-life of 30 days for temporal confidence
      const decayRate = Math.log(2) / (30 * 24); // Half-life in hours
      let temporalConfidence = Math.exp(-decayRate * ageInHours);

      // Boost very recent data
      if (ageInHours < 24) temporalConfidence += 0.1; // Last 24 hours
      if (ageInHours < 1) temporalConfidence += 0.1; // Last hour

      return Math.max(0.1, Math.min(1.0, temporalConfidence));

    } catch (error) {
      this.logger.warn('Error calculating temporal confidence', { error, timestamp });
      return 0.5;
    }
  }

  /**
   * Calculate confidence based on data completeness
   */
  private calculateCompletenessConfidence(result: any): number {
    try {
      if (!result) return 0.1;

      let completenessScore = 0;
      let totalFields = 0;

      // Core content fields
      const coreFields = ['content', 'title', 'description', 'summary'];
      for (const field of coreFields) {
        totalFields++;
        if (result[field] && typeof result[field] === 'string' && result[field].trim().length > 0) {
          completenessScore += 1;
        }
      }

      // Metadata fields
      const metadataFields = ['timestamp', 'created_at', 'updated_at', 'source', 'author'];
      for (const field of metadataFields) {
        totalFields++;
        if (result[field] !== undefined && result[field] !== null) {
          completenessScore += 0.8; // Metadata less critical than content
        }
      }

      // Technical indicator fields (for trading data)
      const technicalFields = ['price', 'volume', 'rsi', 'macd', 'bollinger_upper'];
      for (const field of technicalFields) {
        totalFields++;
        if (result[field] !== undefined && typeof result[field] === 'number') {
          completenessScore += 0.9; // Technical data highly valuable
        }
      }

      // Outcome/performance fields
      const outcomeFields = ['success_rate', 'profit_loss', 'win_rate', 'sharpe_ratio'];
      for (const field of outcomeFields) {
        totalFields++;
        if (result[field] !== undefined && typeof result[field] === 'number') {
          completenessScore += 1; // Performance data critical
        }
      }

      // Calculate completeness ratio
      const completenessRatio = totalFields > 0 ? completenessScore / totalFields : 0;

      // Apply non-linear transformation for better discrimination
      // Low completeness = very low confidence, high completeness = high confidence
      const transformedConfidence = Math.pow(completenessRatio, 0.7); // Slightly convex

      return Math.max(0.1, Math.min(1.0, transformedConfidence));

    } catch (error) {
      this.logger.warn('Error calculating completeness confidence', { error });
      return 0.5;
    }
  }

  /**
   * Calculate confidence based on source quality
   */
  private calculateSourceConfidence(source: string): number {
    try {
      if (!source || typeof source !== 'string') return 0.5;

      const sourceLower = source.toLowerCase().trim();
      let confidence = 0.5; // Base confidence

      // High-confidence sources
      const highConfidenceSources = ['bloomberg', 'reuters', 'cnbc', 'wsj', 'ft', 'nytimes'];
      if (highConfidenceSources.some(s => sourceLower.includes(s))) {
        confidence += 0.3;
      }

      // Medium-confidence sources
      const mediumConfidenceSources = ['yahoo', 'marketwatch', 'investing.com', 'seekingalpha'];
      if (mediumConfidenceSources.some(s => sourceLower.includes(s))) {
        confidence += 0.2;
      }

      // Low-confidence sources
      const lowConfidenceSources = ['reddit', 'twitter', 'facebook', 'tiktok'];
      if (lowConfidenceSources.some(s => sourceLower.includes(s))) {
        confidence -= 0.2;
      }

      // Academic or research sources
      if (sourceLower.includes('arxiv') || sourceLower.includes('research') || sourceLower.includes('paper')) {
        confidence += 0.2;
      }

      // Official sources
      if (sourceLower.includes('sec') || sourceLower.includes('fed') || sourceLower.includes('ecb')) {
        confidence += 0.4;
      }

      return Math.max(0.1, Math.min(1.0, confidence));

    } catch (error) {
      this.logger.warn('Error calculating source confidence', { error, source });
      return 0.5;
    }
  }
}

/**
 * Factory function to create DataExtractionService
 */
export function createDataExtractionService(logger?: any): DataExtractionService {
  return new DataExtractionService(logger);
}