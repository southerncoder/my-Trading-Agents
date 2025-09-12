import { createLogger } from '../../../utils/enhanced-logger';
import OpenAI from 'openai';

/**
 * SemanticProcessingService - Semantic similarity and embedding handling
 * Extracted from the monolithic context-retrieval-layer.ts file
 */
export class SemanticProcessingService {
  private logger: any;
  private openai: OpenAI | null = null;

  constructor(logger?: any, openaiApiKey?: string) {
    this.logger = logger || createLogger('system', 'SemanticProcessingService');

    // Initialize OpenAI client if API key is provided
    if (openaiApiKey) {
      try {
        this.openai = new OpenAI({
          apiKey: openaiApiKey,
          dangerouslyAllowBrowser: false // Ensure we're not in browser context
        });
        this.logger.info('OpenAI client initialized for semantic processing');
      } catch (error) {
        this.logger.warn('Failed to initialize OpenAI client', { error });
        this.openai = null;
      }
    } else {
      this.logger.warn('No OpenAI API key provided, using fallback methods');
    }
  }

  /**
   * Calculate semantic similarity between two texts using embeddings
   */
  async calculateSemanticSimilarity(text1: string, text2: string, embeddings?: Record<string, number[]>): Promise<number> {
    try {
      if (!text1 || !text2) return 0;

      // If embeddings are provided, use them directly
      if (embeddings && embeddings[text1] && embeddings[text2]) {
        return this.cosineSimilarity(embeddings[text1], embeddings[text2]);
      }

      // Try to generate embeddings if OpenAI is available
      if (this.openai && text1 && text2) {
        try {
          const generatedEmbeddings = await this.generateEmbeddings([text1, text2]);
          if (generatedEmbeddings[text1] && generatedEmbeddings[text2]) {
            return this.cosineSimilarity(generatedEmbeddings[text1], generatedEmbeddings[text2]);
          }
        } catch (error) {
          this.logger.warn('Failed to generate embeddings for similarity calculation', { error });
        }
      }

      // Otherwise, calculate simple semantic similarity
      return this.calculateSimpleSemanticSimilarity(text1, text2);
    } catch (error) {
      this.logger.warn('Error calculating semantic similarity', { error });
      return 0;
    }
  }

  /**
   * Calculate semantic similarity between query and result
   */
  async calculateQueryResultSimilarity(query: string, result: any, embeddings?: Record<string, number[]>): Promise<number> {
    try {
      if (!query || !result) return 0;

      // Extract text content from result
      const resultText = this.extractResultText(result);

      if (!resultText) return 0;

      return await this.calculateSemanticSimilarity(query, resultText, embeddings);
    } catch (error) {
      this.logger.warn('Error calculating query-result similarity', { error });
      return 0;
    }
  }

  /**
   * Generate embeddings for text content using OpenAI
   */
  async generateEmbeddings(texts: string[]): Promise<Record<string, number[]>> {
    try {
      if (!texts || texts.length === 0) return {};

      const embeddings: Record<string, number[]> = {};

      // Use OpenAI embeddings if available
      if (this.openai) {
        try {
          // Filter out empty texts and deduplicate
          const validTexts = [...new Set(texts.filter(text => text && text.trim().length > 0))];

          if (validTexts.length === 0) return {};

          // Generate embeddings in batches to avoid rate limits
          const batchSize = 100;
          for (let i = 0; i < validTexts.length; i += batchSize) {
            const batch = validTexts.slice(i, i + batchSize);

            const response = await this.openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: batch,
              encoding_format: 'float'
            });

            // Store embeddings by text
            for (let j = 0; j < batch.length; j++) {
              const text = batch[j];
              const embedding = response.data[j]?.embedding;
              if (embedding) {
                embeddings[text] = embedding;
              }
            }

            // Small delay between batches to respect rate limits
            if (i + batchSize < validTexts.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          this.logger.info('Generated embeddings using OpenAI', {
            textCount: validTexts.length,
            embeddingDimension: 1536 // text-embedding-3-small dimension
          });

        } catch (error) {
          this.logger.warn('Failed to generate OpenAI embeddings, falling back to simple method', { error });
          // Fall back to simple embeddings
          for (const text of texts) {
            if (text && text.trim().length > 0) {
              embeddings[text] = this.generateSimpleEmbedding(text);
            }
          }
        }
      } else {
        // Use simple embeddings as fallback
        this.logger.info('Using simple embeddings (OpenAI not available)');
        for (const text of texts) {
          if (text && text.trim().length > 0) {
            embeddings[text] = this.generateSimpleEmbedding(text);
          }
        }
      }

      return embeddings;
    } catch (error) {
      this.logger.warn('Error generating embeddings', { error });
      return {};
    }
  }

  /**
   * Find semantically similar results using embeddings
   */
  async findSemanticallySimilar(query: string, results: any[], embeddings?: Record<string, number[]>, threshold: number = 0.7): Promise<any[]> {
    try {
      if (!query || !results || results.length === 0) return [];

      const similarResults: any[] = [];

      for (const result of results) {
        const similarity = await this.calculateQueryResultSimilarity(query, result, embeddings);

        if (similarity >= threshold) {
          similarResults.push({
            ...result,
            semantic_similarity: similarity
          });
        }
      }

      // Sort by semantic similarity (descending)
      similarResults.sort((a, b) => (b.semantic_similarity || 0) - (a.semantic_similarity || 0));

      return similarResults;
    } catch (error) {
      this.logger.warn('Error finding semantically similar results', { error });
      return [];
    }
  }

  /**
   * Calculate semantic relevance score combining multiple factors
   */
  async calculateSemanticRelevance(query: string, result: any, embeddings?: Record<string, number[]>): Promise<number> {
    try {
      if (!query || !result) return 0;

      let relevanceScore = 0;
      let factors = 0;

      // Semantic similarity (primary factor)
      const semanticSim = await this.calculateQueryResultSimilarity(query, result, embeddings);
      relevanceScore += semanticSim * 0.6; // 60% weight
      factors += 0.6;

      // Keyword matching (secondary factor)
      const keywordSim = this.calculateKeywordSimilarity(query, result);
      relevanceScore += keywordSim * 0.3; // 30% weight
      factors += 0.3;

      // Context matching (tertiary factor)
      const contextSim = this.calculateContextSimilarity(query, result);
      relevanceScore += contextSim * 0.1; // 10% weight
      factors += 0.1;

      return factors > 0 ? relevanceScore / factors : 0;
    } catch (error) {
      this.logger.warn('Error calculating semantic relevance', { error });
      return 0;
    }
  }

  /**
   * Extract semantic features from text
   */
  extractSemanticFeatures(text: string): any {
    try {
      if (!text) return {};

      return {
        // Basic text features
        length: text.length,
        wordCount: this.countWords(text),
        sentenceCount: this.countSentences(text),

        // Semantic features
        hasNumbers: /\d/.test(text),
        hasCurrency: /\$|€|£|¥/.test(text),
        hasPercentages: /%/.test(text),
        hasDates: /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/.test(text),

        // Domain-specific features
        hasMarketTerms: this.hasMarketTerms(text),
        hasTechnicalTerms: this.hasTechnicalTerms(text),
        hasStrategyTerms: this.hasStrategyTerms(text),

        // Sentiment features
        sentiment: this.analyzeSentiment(text),

        // Readability features
        readability: this.calculateReadability(text)
      };
    } catch (error) {
      this.logger.warn('Error extracting semantic features', { error });
      return {};
    }
  }

  /**
   * Calculate semantic distance between two feature sets
   */
  calculateSemanticDistance(features1: any, features2: any): number {
    try {
      if (!features1 || !features2) return 1;

      let totalDistance = 0;
      let factors = 0;

      // Numerical features
      const numericalFeatures = ['length', 'wordCount', 'sentenceCount', 'sentiment', 'readability'];
      for (const feature of numericalFeatures) {
        const val1 = features1[feature] || 0;
        const val2 = features2[feature] || 0;
        const max = Math.max(Math.abs(val1), Math.abs(val2)) || 1;
        totalDistance += Math.abs(val1 - val2) / max;
        factors++;
      }

      // Boolean features
      const booleanFeatures = ['hasNumbers', 'hasCurrency', 'hasPercentages', 'hasDates', 'hasMarketTerms', 'hasTechnicalTerms', 'hasStrategyTerms'];
      for (const feature of booleanFeatures) {
        const val1 = features1[feature] ? 1 : 0;
        const val2 = features2[feature] ? 1 : 0;
        totalDistance += Math.abs(val1 - val2);
        factors++;
      }

      return factors > 0 ? totalDistance / factors : 1;
    } catch (error) {
      this.logger.warn('Error calculating semantic distance', { error });
      return 1;
    }
  }

  /**
   * Perform semantic clustering of results
   */
  async clusterSemantically(results: any[], embeddings?: Record<string, number[]>, numClusters: number = 3): Promise<any[]> {
    try {
      if (!results || results.length === 0) return [];

      // Extract embeddings or features for clustering
      const dataPoints = await this.prepareClusteringData(results, embeddings);

      // Perform K-means clustering
      const clusters = this.performKMeansClustering(dataPoints, numClusters);

      // Assign results to clusters
      const clusteredResults = results.map((result, index) => ({
        ...result,
        cluster: clusters[index],
        clusterData: dataPoints[index]
      }));

      return clusteredResults;
    } catch (error) {
      this.logger.warn('Error performing semantic clustering', { error });
      return results;
    }
  }

  /**
   * Calculate semantic coherence of a result set
   */
  async calculateSemanticCoherence(results: any[], embeddings?: Record<string, number[]>): Promise<number> {
    try {
      if (!results || results.length < 2) return 0;

      let totalSimilarity = 0;
      let pairs = 0;

      // Calculate pairwise similarities
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const similarity = await this.calculateQueryResultSimilarity(
            this.extractResultText(results[i]),
            results[j],
            embeddings
          );
          totalSimilarity += similarity;
          pairs++;
        }
      }

      return pairs > 0 ? totalSimilarity / pairs : 0;
    } catch (error) {
      this.logger.warn('Error calculating semantic coherence', { error });
      return 0;
    }
  }

  /**
   * Extract key semantic concepts from text
   */
  extractSemanticConcepts(text: string): string[] {
    try {
      if (!text) return [];

      const concepts: string[] = [];
      const lowerText = text.toLowerCase();

      // Market concepts
      const marketConcepts = ['bull market', 'bear market', 'volatility', 'liquidity', 'momentum', 'trend', 'breakout', 'reversal'];
      for (const concept of marketConcepts) {
        if (lowerText.includes(concept)) {
          concepts.push(concept);
        }
      }

      // Technical concepts
      const technicalConcepts = ['rsi', 'macd', 'moving average', 'support', 'resistance', 'fibonacci', 'bollinger bands'];
      for (const concept of technicalConcepts) {
        if (lowerText.includes(concept)) {
          concepts.push(concept);
        }
      }

      // Strategy concepts
      const strategyConcepts = ['scalping', 'day trading', 'swing trading', 'position trading', 'arbitrage', 'hedging'];
      for (const concept of strategyConcepts) {
        if (lowerText.includes(concept)) {
          concepts.push(concept);
        }
      }

      return [...new Set(concepts)]; // Remove duplicates
    } catch (error) {
      this.logger.warn('Error extracting semantic concepts', { error });
      return [];
    }
  }

  /**
   * Calculate concept overlap between texts
   */
  calculateConceptOverlap(text1: string, text2: string): number {
    try {
      const concepts1 = this.extractSemanticConcepts(text1);
      const concepts2 = this.extractSemanticConcepts(text2);

      if (concepts1.length === 0 && concepts2.length === 0) return 1;
      if (concepts1.length === 0 || concepts2.length === 0) return 0;

      const intersection = concepts1.filter(concept => concepts2.includes(concept));
      const union = [...new Set([...concepts1, ...concepts2])];

      return union.length > 0 ? intersection.length / union.length : 0;
    } catch (error) {
      this.logger.warn('Error calculating concept overlap', { error });
      return 0;
    }
  }

  // Private helper methods

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    try {
      if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) return 0;

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < vec1.length; i++) {
        const val1 = vec1[i] ?? 0;
        const val2 = vec2[i] ?? 0;
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
      }

      norm1 = Math.sqrt(norm1);
      norm2 = Math.sqrt(norm2);

      if (norm1 === 0 || norm2 === 0) return 0;

      return dotProduct / (norm1 * norm2);
    } catch (error) {
      this.logger.warn('Error calculating cosine similarity', { error });
      return 0;
    }
  }

  /**
   * Calculate simple semantic similarity without embeddings
   */
  private calculateSimpleSemanticSimilarity(text1: string, text2: string): number {
    try {
      if (!text1 || !text2) return 0;

      // Convert to lowercase and split into words
      const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(word => word.length > 2));
      const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(word => word.length > 2));

      // Calculate Jaccard similarity
      const intersection = new Set([...words1].filter(word => words2.has(word)));
      const union = new Set([...words1, ...words2]);

      if (union.size === 0) return 1;

      const jaccardSimilarity = intersection.size / union.size;

      // Calculate concept overlap
      const conceptOverlap = this.calculateConceptOverlap(text1, text2);

      // Combine similarities (weighted average)
      return (jaccardSimilarity * 0.7) + (conceptOverlap * 0.3);
    } catch (error) {
      this.logger.warn('Error calculating simple semantic similarity', { error });
      return 0;
    }
  }

  /**
   * Extract text content from result
   */
  private extractResultText(result: any): string {
    try {
      if (!result) return '';

      // Try different fields that might contain text content
      const textFields = ['content', 'fact', 'description', 'text', 'summary', 'analysis'];

      for (const field of textFields) {
        if (result[field] && typeof result[field] === 'string') {
          return result[field];
        }
      }

      // If no text field found, convert object to string
      return JSON.stringify(result);
    } catch (error) {
      this.logger.warn('Error extracting result text', { error });
      return '';
    }
  }

  /**
   * Calculate keyword similarity between query and result
   */
  private calculateKeywordSimilarity(query: string, result: any): number {
    try {
      if (!query || !result) return 0;

      const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(word => word.length > 2));
      const resultText = this.extractResultText(result).toLowerCase();

      if (queryWords.size === 0) return 0;

      let matches = 0;
      for (const word of queryWords) {
        if (resultText.includes(word)) {
          matches++;
        }
      }

      return matches / queryWords.size;
    } catch (error) {
      this.logger.warn('Error calculating keyword similarity', { error });
      return 0;
    }
  }

  /**
   * Calculate context similarity
   */
  private calculateContextSimilarity(query: string, result: any): number {
    try {
      if (!query || !result) return 0;

      // Extract context from query and result
      const queryContext = this.extractContextFromText(query);
      const resultContext = this.extractContextFromResult(result);

      // Compare contexts
      const contextMatches = queryContext.filter(ctx => resultContext.includes(ctx));

      return queryContext.length > 0 ? contextMatches.length / queryContext.length : 0;
    } catch (error) {
      this.logger.warn('Error calculating context similarity', { error });
      return 0;
    }
  }

  /**
   * Extract context keywords from text
   */
  private extractContextFromText(text: string): string[] {
    try {
      const contextKeywords = [
        'market', 'trading', 'stock', 'price', 'volume', 'trend', 'analysis',
        'strategy', 'risk', 'profit', 'loss', 'technical', 'fundamental',
        'bull', 'bear', 'volatility', 'momentum', 'breakout', 'reversal'
      ];

      const lowerText = text.toLowerCase();
      return contextKeywords.filter(keyword => lowerText.includes(keyword));
    } catch (error) {
      this.logger.warn('Error extracting context from text', { error });
      return [];
    }
  }

  /**
   * Extract context from result
   */
  private extractContextFromResult(result: any): string[] {
    try {
      const resultText = this.extractResultText(result);
      return this.extractContextFromText(resultText);
    } catch (error) {
      this.logger.warn('Error extracting context from result', { error });
      return [];
    }
  }

  /**
   * Generate simple embedding for text (placeholder)
   */
  private generateSimpleEmbedding(text: string): number[] {
    try {
      // Simple hash-based embedding (placeholder for real embedding service)
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(128).fill(0);

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;

        let hash = 0;
        for (let j = 0; j < word.length; j++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(j);
          hash = hash & hash; // Convert to 32-bit integer
        }

        const index = Math.abs(hash) % embedding.length;
        embedding[index] += 1;
      }

      // Normalize
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= norm;
        }
      }

      return embedding;
    } catch (error) {
      this.logger.warn('Error generating simple embedding', { error });
      return new Array(128).fill(0);
    }
  }

  /**
   * Prepare data for clustering
   */
  private async prepareClusteringData(results: any[], embeddings?: Record<string, number[]>): Promise<number[][]> {
    try {
      const dataPoints: number[][] = [];

      for (const result of results) {
        const resultText = this.extractResultText(result);

        if (embeddings && embeddings[resultText]) {
          // Use provided embeddings
          dataPoints.push(embeddings[resultText]);
        } else {
          // Use simple embedding
          dataPoints.push(this.generateSimpleEmbedding(resultText));
        }
      }

      return dataPoints;
    } catch (error) {
      this.logger.warn('Error preparing clustering data', { error });
      return [];
    }
  }

  /**
   * Perform K-means clustering
   */
  private performKMeansClustering(dataPoints: number[][], k: number): number[] {
    try {
      if (!dataPoints || dataPoints.length === 0) return [];
      if (k <= 0) k = 1;
      if (k > dataPoints.length) k = dataPoints.length;

      // Initialize centroids randomly
      const centroids = this.initializeCentroids(dataPoints, k);
      const assignments = new Array(dataPoints.length).fill(0);

      // Maximum iterations to prevent infinite loops
      const maxIterations = 100;
      let hasChanged = true;
      let iteration = 0;

      while (hasChanged && iteration < maxIterations) {
        hasChanged = false;
        iteration++;

        // Assign points to nearest centroid
        for (let i = 0; i < dataPoints.length; i++) {
          const point = dataPoints[i];
          if (!point) continue;

          const nearestCentroid = this.findNearestCentroid(point, centroids);
          if (assignments[i] !== nearestCentroid) {
            assignments[i] = nearestCentroid;
            hasChanged = true;
          }
        }

        // Update centroids
        this.updateCentroids(dataPoints, centroids, assignments);
      }

      return assignments;
    } catch (error) {
      this.logger.warn('Error performing K-means clustering', { error });
      return new Array(dataPoints.length).fill(0);
    }
  }

  /**
   * Initialize centroids randomly
   */
  private initializeCentroids(dataPoints: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    while (centroids.length < k && usedIndices.size < dataPoints.length) {
      const randomIndex = Math.floor(Math.random() * dataPoints.length);
      if (!usedIndices.has(randomIndex)) {
        const point = dataPoints[randomIndex];
        if (point) {
          centroids.push([...point]);
          usedIndices.add(randomIndex);
        }
      }
    }

    return centroids;
  }

  /**
   * Find nearest centroid for a data point
   */
  private findNearestCentroid(point: number[], centroids: number[][]): number {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      if (!centroid) continue;

      const distance = this.euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  /**
   * Update centroids based on current assignments
   */
  private updateCentroids(dataPoints: number[][], centroids: number[][], assignments: number[]): void {
    if (!centroids || centroids.length === 0 || !dataPoints || dataPoints.length === 0) return;

    const firstCentroid = centroids[0];
    if (!firstCentroid) return;

    const clusterSums = new Array(centroids.length).fill(null).map(() => new Array(firstCentroid.length).fill(0));
    const clusterCounts = new Array(centroids.length).fill(0);

    // Sum points in each cluster
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      if (!point) continue;

      const clusterIndex = assignments[i];
      if (typeof clusterIndex === 'number' && clusterIndex >= 0 && clusterIndex < clusterCounts.length) {
        clusterCounts[clusterIndex]++;

        const clusterSum = clusterSums[clusterIndex];
        if (clusterSum) {
          for (let j = 0; j < point.length && j < clusterSum.length; j++) {
            clusterSum[j] += point[j] ?? 0;
          }
        }
      }
    }

    // Calculate new centroids
    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      const clusterSum = clusterSums[i];
      const count = clusterCounts[i];

      if (centroid && clusterSum && count > 0) {
        for (let j = 0; j < centroid.length; j++) {
          centroid[j] = clusterSum[j] / count;
        }
      }
    }
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  private euclideanDistance(vec1: number[], vec2: number[]): number {
    try {
      if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) return Infinity;

      let sum = 0;
      for (let i = 0; i < vec1.length; i++) {
        const val1 = vec1[i] ?? 0;
        const val2 = vec2[i] ?? 0;
        const diff = val1 - val2;
        sum += diff * diff;
      }

      return Math.sqrt(sum);
    } catch (error) {
      this.logger.warn('Error calculating Euclidean distance', { error });
      return Infinity;
    }
  }

  // Text analysis helper methods
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  private hasMarketTerms(text: string): boolean {
    const marketTerms = ['market', 'stock', 'trading', 'bull', 'bear', 'volatility', 'trend', 'price', 'volume'];
    const lowerText = text.toLowerCase();
    return marketTerms.some(term => lowerText.includes(term));
  }

  private hasTechnicalTerms(text: string): boolean {
    const technicalTerms = ['rsi', 'macd', 'moving average', 'support', 'resistance', 'fibonacci', 'bollinger'];
    const lowerText = text.toLowerCase();
    return technicalTerms.some(term => lowerText.includes(term));
  }

  private hasStrategyTerms(text: string): boolean {
    const strategyTerms = ['scalping', 'day trading', 'swing trading', 'position trading', 'arbitrage', 'hedging'];
    const lowerText = text.toLowerCase();
    return strategyTerms.some(term => lowerText.includes(term));
  }

  private analyzeSentiment(text: string): number {
    try {
      const positiveWords = ['profit', 'gain', 'bullish', 'up', 'positive', 'good', 'strong', 'success'];
      const negativeWords = ['loss', 'decline', 'bearish', 'down', 'negative', 'bad', 'weak', 'failure'];

      const lowerText = text.toLowerCase();
      let sentiment = 0;

      for (const word of positiveWords) {
        if (lowerText.includes(word)) sentiment += 1;
      }

      for (const word of negativeWords) {
        if (lowerText.includes(word)) sentiment -= 1;
      }

      // Normalize to -1 to 1 range
      return Math.max(-1, Math.min(1, sentiment / 5));
    } catch (error) {
      this.logger.warn('Error analyzing sentiment', { error });
      return 0;
    }
  }

  private calculateReadability(text: string): number {
    try {
      const words = this.countWords(text);
      const sentences = this.countSentences(text);

      if (sentences === 0) return 0;

      // Simple readability score (average words per sentence)
      const avgWordsPerSentence = words / sentences;

      // Normalize to 0-1 scale (lower is more readable)
      return Math.max(0, Math.min(1, 1 - (avgWordsPerSentence - 10) / 20));
    } catch (error) {
      this.logger.warn('Error calculating readability', { error });
      return 0.5;
    }
  }
}

/**
 * Factory function to create SemanticProcessingService
 */
export function createSemanticProcessingService(logger?: any, openaiApiKey?: string): SemanticProcessingService {
  return new SemanticProcessingService(logger, openaiApiKey);
}