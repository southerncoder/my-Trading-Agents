import { OpenAI } from 'openai';
import { TradingAgentsConfig } from '@/types/config';

/**
 * Interface for memory match results
 */
export interface MemoryMatch {
  matchedSituation: string;
  recommendation: string;
  similarityScore: number;
}

/**
 * Simple in-memory vector store for financial situations and advice
 * In production, this could be replaced with ChromaDB, Pinecone, or similar
 */
export class FinancialSituationMemory {
  private name: string;
  private config: TradingAgentsConfig;
  private client: OpenAI;
  private embeddingModel: string;
  private memories: Array<{
    id: string;
    situation: string;
    recommendation: string;
    embedding: number[];
  }>;

  constructor(name: string, config: TradingAgentsConfig) {
    this.name = name;
    this.config = config;
    this.memories = [];
    
    // Determine embedding model based on backend
    this.embeddingModel = config.backendUrl === 'http://localhost:11434/v1' 
      ? 'nomic-embed-text' 
      : 'text-embedding-3-small';

    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required for memory system');
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.backendUrl,
    });
  }

  /**
   * Get OpenAI embedding for a text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      
      if (!response.data[0]?.embedding) {
        throw new Error('Failed to get embedding from OpenAI');
      }
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embedding:', error);
      throw error;
    }
  }

  /**
   * Add financial situations and their corresponding advice
   */
  async addSituations(situationsAndAdvice: Array<[string, string]>): Promise<void> {
    const startId = this.memories.length;

    for (let i = 0; i < situationsAndAdvice.length; i++) {
      const item = situationsAndAdvice[i];
      if (!item) continue;
      
      const [situation, recommendation] = item;
      const embedding = await this.getEmbedding(situation);
      
      this.memories.push({
        id: (startId + i).toString(),
        situation,
        recommendation,
        embedding,
      });
    }
  }

  /**
   * Find matching recommendations using cosine similarity
   */
  async getMemories(currentSituation: string, nMatches: number = 1): Promise<MemoryMatch[]> {
    if (this.memories.length === 0) {
      return [];
    }

    const queryEmbedding = await this.getEmbedding(currentSituation);
    
    // Calculate cosine similarity for each memory
    const similarities = this.memories.map((memory) => {
      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
      return {
        matchedSituation: memory.situation,
        recommendation: memory.recommendation,
        similarityScore: similarity,
      };
    });

    // Sort by similarity score and return top n matches
    similarities.sort((a, b) => b.similarityScore - a.similarityScore);
    return similarities.slice(0, nMatches);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i];
      const b = vecB[i];
      if (a === undefined || b === undefined) continue;
      
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get the number of stored memories
   */
  count(): number {
    return this.memories.length;
  }

  /**
   * Clear all memories
   */
  reset(): void {
    this.memories = [];
  }

  /**
   * Get all memories (for debugging/inspection)
   */
  getAllMemories(): Array<{ situation: string; recommendation: string }> {
    return this.memories.map(m => ({
      situation: m.situation,
      recommendation: m.recommendation,
    }));
  }
}

/**
 * Factory function to create pre-populated financial memories
 */
export async function createPrePopulatedMemory(name: string, config: TradingAgentsConfig): Promise<FinancialSituationMemory> {
  const memory = new FinancialSituationMemory(name, config);

  // Add some example financial situations and advice
  const exampleData: Array<[string, string]> = [
    [
      'High inflation rate with rising interest rates and declining consumer spending',
      'Consider defensive sectors like consumer staples and utilities. Review fixed-income portfolio duration.',
    ],
    [
      'Tech sector showing high volatility with increasing institutional selling pressure',
      'Reduce exposure to high-growth tech stocks. Look for value opportunities in established tech companies with strong cash flows.',
    ],
    [
      'Strong dollar affecting emerging markets with increasing forex volatility',
      'Hedge currency exposure in international positions. Consider reducing allocation to emerging market debt.',
    ],
    [
      'Market showing signs of sector rotation with rising yields',
      'Rebalance portfolio to maintain target allocations. Consider increasing exposure to sectors benefiting from higher rates.',
    ],
    [
      'Economic uncertainty with increasing market volatility and flight to quality assets',
      'Increase allocation to treasury bonds and dividend-paying stocks. Consider reducing leverage and maintaining higher cash positions.',
    ],
    [
      'Bull market conditions with low volatility and strong earnings growth',
      'Consider increasing equity allocation within risk tolerance. Look for growth opportunities but maintain disciplined valuation approach.',
    ],
  ];

  await memory.addSituations(exampleData);
  return memory;
}