import { createLogger } from '../../../utils/enhanced-logger';
import { ContextRetrievalCriteria } from '../context-retrieval/types';

/**
 * ConfidenceScoringService - Handles confidence calculation and scoring for context retrieval
 *
 * This service provides comprehensive confidence assessment for search results and data quality,
 * including multi-factor confidence scoring, temporal decay, source reliability, and content analysis.
 */
export class ConfidenceScoringService {
  private logger = createLogger('system', 'ConfidenceScoringService');

  /**
   * Extract overall confidence score from a result
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
   * Extract confidence score from result (simplified version)
   */
  extractConfidenceScore(result: any): number {
    try {
      if (!result) return 0.5;

      const confidence = result.confidence_score ||
                        result.confidence ||
                        result.certainty ||
                        result.confidence_level;

      if (typeof confidence === 'number') {
        return Math.max(0, Math.min(1, confidence));
      }

      if (typeof confidence === 'string') {
        const normalized = confidence.toLowerCase().trim();
        if (['high', 'very_high', 'strong'].includes(normalized)) return 0.8;
        if (['medium', 'moderate', 'average'].includes(normalized)) return 0.6;
        if (['low', 'weak', 'uncertain'].includes(normalized)) return 0.3;

        const parsed = parseFloat(confidence.replace('%', ''));
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(1, parsed / 100));
        }
      }

      return 0.5;
    } catch (error) {
      this.logger.warn('Error extracting confidence score', { error });
      return 0.5;
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
      return 0.5; // Conservative fallback
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
      const highConfidenceSources = [
        'bloomberg', 'reuters', 'cnbc', 'wsj', 'ft', 'nytimes',
        'federal reserve', 'sec.gov', 'ecb.europa.eu',
        'official', 'government', 'regulatory'
      ];

      for (const trustedSource of highConfidenceSources) {
        if (sourceLower.includes(trustedSource)) {
          confidence += 0.3;
          break;
        }
      }

      // Medium-confidence sources
      const mediumConfidenceSources = [
        'yahoo finance', 'marketwatch', 'investopedia', 'seeking alpha',
        'morningstar', 'zacks', 'fool.com', 'barrons'
      ];

      for (const mediumSource of mediumConfidenceSources) {
        if (sourceLower.includes(mediumSource)) {
          confidence += 0.15;
          break;
        }
      }

      // Low-confidence sources (reduce confidence)
      const lowConfidenceSources = [
        'reddit', 'twitter', 'facebook', 'tiktok',
        'anonymous', 'unverified', 'rumor'
      ];

      for (const lowSource of lowConfidenceSources) {
        if (sourceLower.includes(lowSource)) {
          confidence -= 0.2;
          break;
        }
      }

      // Source format indicators
      if (sourceLower.includes('.gov') || sourceLower.includes('government')) {
        confidence += 0.2; // Government sources
      }

      if (sourceLower.includes('.edu') || sourceLower.includes('university')) {
        confidence += 0.15; // Educational sources
      }

      if (sourceLower.includes('.org') && !sourceLower.includes('nonprofit')) {
        confidence += 0.1; // Organizational sources
      }

      // Length and format quality
      if (source.length > 20) confidence += 0.05; // Detailed source name
      if (source.includes(' ')) confidence += 0.05; // Proper formatting

      return Math.max(0.1, Math.min(1.0, confidence));

    } catch (error) {
      this.logger.warn('Error calculating source confidence', { error, source });
      return 0.5;
    }
  }

  /**
   * Calculate outcome confidence based on data quality
   */
  calculateOutcomeConfidence(outcomes: any): number {
    try {
      let confidence = 0.5; // Base confidence
      let factors = 0;

      // Data completeness factor
      const requiredFields = ['success_rate', 'profit_loss', 'strategy_type'];
      const presentFields = requiredFields.filter(field => outcomes[field] !== undefined);
      confidence += (presentFields.length / requiredFields.length) * 0.3;
      factors++;

      // Data consistency factor
      if (outcomes.success_rate && outcomes.win_rate) {
        const consistency = 1 - Math.abs(outcomes.success_rate - outcomes.win_rate);
        confidence += consistency * 0.2;
        factors++;
      }

      // Historical performance factor
      if (outcomes.confidence_score !== undefined) {
        confidence += outcomes.confidence_score * 0.3;
        factors++;
      }

      // Sample size factor (if available)
      if (outcomes.sample_size) {
        const sampleConfidence = Math.min(outcomes.sample_size / 100, 1) * 0.2;
        confidence += sampleConfidence;
        factors++;
      }

      return factors > 0 ? confidence / factors : 0.5;

    } catch (error) {
      this.logger.warn('Error calculating outcome confidence', { error });
      return 0.5;
    }
  }

  /**
   * Calculate prediction accuracy score based on historical performance
   */
  calculatePredictionAccuracyScore(outcomes: any, criteria: ContextRetrievalCriteria): number {
    try {
      let accuracyScore = 0.5; // Base accuracy
      let factors = 0;

      // Factor 1: Historical success rate consistency
      if (outcomes.success_rate !== undefined) {
        const successRate = outcomes.success_rate;
        // Higher success rates indicate more accurate predictions
        if (successRate > 0.7) accuracyScore += 0.2;
        else if (successRate > 0.5) accuracyScore += 0.1;
        else if (successRate < 0.3) accuracyScore -= 0.1;
        factors++;
      }

      // Factor 2: Sharpe ratio as risk-adjusted accuracy measure
      if (outcomes.sharpe_ratio !== undefined) {
        const sharpeRatio = outcomes.sharpe_ratio;
        // Positive Sharpe ratio indicates better risk-adjusted performance
        if (sharpeRatio > 1.0) accuracyScore += 0.15;
        else if (sharpeRatio > 0.5) accuracyScore += 0.1;
        else if (sharpeRatio < 0) accuracyScore -= 0.1;
        factors++;
      }

      // Factor 3: Maximum drawdown assessment
      if (outcomes.max_drawdown !== undefined) {
        const maxDrawdown = Math.abs(outcomes.max_drawdown);
        // Lower drawdown indicates more stable/accurate predictions
        if (maxDrawdown < 0.1) accuracyScore += 0.15;
        else if (maxDrawdown < 0.2) accuracyScore += 0.1;
        else if (maxDrawdown > 0.3) accuracyScore -= 0.1;
        factors++;
      }

      // Factor 4: Sample size consideration
      if (outcomes.sample_size !== undefined) {
        const sampleSize = outcomes.sample_size;
        // Larger sample sizes provide more reliable accuracy estimates
        if (sampleSize > 100) accuracyScore += 0.1;
        else if (sampleSize > 50) accuracyScore += 0.05;
        else if (sampleSize < 20) accuracyScore -= 0.1;
        factors++;
      }

      // Factor 5: Strategy type alignment with criteria
      if (criteria.strategy_type && outcomes.strategy_type) {
        const strategyMatch = criteria.strategy_type.toLowerCase() === outcomes.strategy_type.toLowerCase();
        if (strategyMatch) accuracyScore += 0.1;
        factors++;
      }

      // Factor 6: Risk profile alignment
      if (criteria.risk_tolerance && outcomes.risk_profile) {
        const riskMatch = criteria.risk_tolerance.toLowerCase() === outcomes.risk_profile.toLowerCase();
        if (riskMatch) accuracyScore += 0.1;
        factors++;
      }

      // Calculate final accuracy score
      const finalAccuracy = factors > 0 ? accuracyScore / factors : 0.5;

      // Apply bounds and return
      return Math.max(0.1, Math.min(1.0, finalAccuracy + 0.5)); // Center around 0.5

    } catch (error) {
      this.logger.warn('Error calculating prediction accuracy score', { error });
      return 0.5;
    }
  }

  /**
   * Apply confidence adjustment to similarity score
   */
  applyConfidenceAdjustment(similarity: number, confidence: number): number {
    // Higher confidence increases similarity, lower confidence decreases it
    const adjustment = (confidence - 0.5) * 0.2; // ±0.2 adjustment range
    return Math.max(0, Math.min(1, similarity + adjustment));
  }

  /**
   * Calculate temporal decay for older outcomes
   */
  calculateTemporalDecay(result: any): number {
    try {
      if (!result.created_at) return 0.8; // Default decay for unknown age

      const resultDate = new Date(result.created_at);
      const now = new Date();
      const ageInDays = (now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: newer data has higher weight
      // Half-life of 180 days (6 months)
      const decayRate = Math.log(2) / 180;
      const decay = Math.exp(-decayRate * ageInDays);

      return Math.max(0.1, decay); // Minimum decay of 0.1

    } catch (error) {
      this.logger.warn('Error calculating temporal decay', { error });
      return 0.8;
    }
  }

  /**
   * Calculate technical confidence score
   */
  calculateTechnicalConfidence(fact: any): number {
    let confidence = 0.5;
    let indicators = 0;

    // Check each major indicator group
    if (fact.rsi || fact.technical_indicators?.rsi) { confidence += 0.1; indicators++; }
    if (fact.macd || fact.technical_indicators?.macd) { confidence += 0.1; indicators++; }
    if (fact.bollinger_upper || fact.technical_indicators?.bollinger) { confidence += 0.1; indicators++; }
    if (fact.sma_20 || fact.technical_indicators?.sma) { confidence += 0.1; indicators++; }
    if (fact.stochastic_k || fact.technical_indicators?.stochastic) { confidence += 0.1; indicators++; }
    if (fact.adx || fact.technical_indicators?.adx) { confidence += 0.1; indicators++; }

    // Adjust confidence based on data completeness
    if (indicators > 0) {
      confidence = confidence / indicators;
    }

    // Boost confidence for comprehensive data
    if (indicators >= 4) confidence += 0.2;
    if (indicators >= 6) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }
}