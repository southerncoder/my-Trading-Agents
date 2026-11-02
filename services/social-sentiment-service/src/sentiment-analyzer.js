/**
 * Simple sentiment analysis for social media content
 * Uses keyword-based approach for trading-relevant sentiment
 */
export class SentimentAnalyzer {
  constructor() {
    // Positive sentiment indicators for trading
    this.positiveKeywords = new Set([
      'bullish', 'moon', 'rocket', 'pump', 'green', 'gains', 'profit', 'buy', 'calls',
      'squeeze', 'breakout', 'rally', 'surge', 'spike', 'uptrend', 'momentum',
      'strong', 'support', 'resistance', 'target', 'bull', 'long', 'hodl',
      'diamond', 'hands', 'strength', 'confident', 'optimistic', 'undervalued'
    ]);

    // Negative sentiment indicators for trading
    this.negativeKeywords = new Set([
      'bearish', 'crash', 'dump', 'red', 'loss', 'sell', 'puts', 'short',
      'squeeze', 'breakdown', 'decline', 'drop', 'fall', 'downtrend', 'weak',
      'resistance', 'bear', 'panic', 'fear', 'overvalued', 'bubble',
      'correction', 'volatility', 'risk', 'uncertainty', 'concerned', 'worried'
    ]);

    // Trading-specific intensifiers
    this.intensifiers = new Set([
      'very', 'extremely', 'massive', 'huge', 'incredible', 'insane',
      'crazy', 'wild', 'epic', 'legendary', 'ultimate', 'perfect'
    ]);

    // Negation words that flip sentiment
    this.negations = new Set([
      'not', 'no', 'never', 'dont', "don't", 'cant', "can't", 'wont', "won't",
      'isnt', "isn't", 'wasnt', "wasn't", 'shouldnt', "shouldn't"
    ]);
  }

  /**
   * Analyze sentiment of text content
   * Returns sentiment score between -1 (very negative) and 1 (very positive)
   */
  analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
      return { score: 0, confidence: 0, classification: 'neutral' };
    }

    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    
    let score = 0;
    let totalWeight = 0;
    let hasNegation = false;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, ''); // Remove punctuation
      
      // Check for negation
      if (this.negations.has(word)) {
        hasNegation = true;
        continue;
      }

      // Check for sentiment words
      let wordScore = 0;
      let weight = 1;

      if (this.positiveKeywords.has(word)) {
        wordScore = 1;
      } else if (this.negativeKeywords.has(word)) {
        wordScore = -1;
      }

      // Apply intensifier if previous word was an intensifier
      if (i > 0 && this.intensifiers.has(words[i - 1].replace(/[^\w]/g, ''))) {
        weight = 1.5;
      }

      // Apply negation
      if (hasNegation && wordScore !== 0) {
        wordScore *= -1;
        hasNegation = false; // Reset negation after applying
      }

      if (wordScore !== 0) {
        score += wordScore * weight;
        totalWeight += weight;
      }
    }

    // Calculate final sentiment
    const finalScore = totalWeight > 0 ? score / totalWeight : 0;
    const confidence = Math.min(totalWeight / (words.length * 0.1), 1);
    
    let classification = 'neutral';
    if (finalScore > 0.2) classification = 'positive';
    else if (finalScore < -0.2) classification = 'negative';

    return {
      score: Math.max(-1, Math.min(1, finalScore)),
      confidence: Math.max(0, Math.min(1, confidence)),
      classification,
      details: {
        totalWords: words.length,
        sentimentWords: totalWeight,
        rawScore: score
      }
    };
  }

  /**
   * Analyze sentiment of multiple texts and return aggregate
   */
  analyzeMultiple(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return { score: 0, confidence: 0, classification: 'neutral', count: 0 };
    }

    const results = texts.map(text => this.analyzeSentiment(text));
    
    const totalScore = results.reduce((sum, result) => sum + result.score * result.confidence, 0);
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    
    const avgScore = totalConfidence > 0 ? totalScore / totalConfidence : 0;
    const avgConfidence = totalConfidence / results.length;

    let classification = 'neutral';
    if (avgScore > 0.1) classification = 'positive';
    else if (avgScore < -0.1) classification = 'negative';

    return {
      score: avgScore,
      confidence: avgConfidence,
      classification,
      count: texts.length,
      individual: results
    };
  }

  /**
   * Extract trading-relevant mentions from text
   */
  extractTradingMentions(text) {
    if (!text || typeof text !== 'string') {
      return { tickers: [], actions: [], timeframes: [] };
    }

    const normalizedText = text.toUpperCase();
    
    // Extract potential ticker symbols (3-5 uppercase letters)
    const tickerMatches = normalizedText.match(/\b[A-Z]{1,5}\b/g) || [];
    const tickers = [...new Set(tickerMatches.filter(match => 
      match.length >= 1 && match.length <= 5 && 
      !['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN'].includes(match)
    ))];

    // Extract trading actions
    const actionKeywords = ['BUY', 'SELL', 'HOLD', 'SHORT', 'LONG', 'CALL', 'PUT'];
    const actions = actionKeywords.filter(action => 
      normalizedText.includes(action)
    );

    // Extract timeframes
    const timeframePatterns = [
      /\b(\d+)\s*(DAY|WEEK|MONTH|YEAR)S?\b/g,
      /\b(TODAY|TOMORROW|NEXT\s+WEEK|NEXT\s+MONTH)\b/g
    ];
    
    const timeframes = [];
    timeframePatterns.forEach(pattern => {
      const matches = normalizedText.match(pattern);
      if (matches) timeframes.push(...matches);
    });

    return {
      tickers: tickers.slice(0, 10), // Limit to reasonable number
      actions: [...new Set(actions)],
      timeframes: [...new Set(timeframes)]
    };
  }
}