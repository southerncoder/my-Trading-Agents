import { MemoryProvider, EmbeddingProviderFactory } from '../../providers/memory-provider.js';
import { AgentLLMConfig } from '../../types/agent-config.js';

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
 * Uses abstracted memory providers to support multiple LLM backends
 */
export class FinancialSituationMemory {
  private name: string;
  private memoryProvider: MemoryProvider;
  private memories: Array<{
    id: string;
    situation: string;
    recommendation: string;
    embedding: number[];
  }>;

  constructor(name: string, config: AgentLLMConfig) {
    this.name = name;
    this.memories = [];
    this.memoryProvider = EmbeddingProviderFactory.createProvider(config);
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
      
      try {
        const embedding = await this.memoryProvider.embedText(situation);
        
        this.memories.push({
          id: (startId + i).toString(),
          situation,
          recommendation,
          embedding,
        });
      } catch (error) {
        // Skip this item if embedding fails, but continue with others
        continue;
      }
    }
  }

  /**
   * Find matching recommendations using cosine similarity
   */
  async getMemories(currentSituation: string, nMatches: number = 1): Promise<MemoryMatch[]> {
    if (this.memories.length === 0) {
      return [];
    }

    try {
      const queryEmbedding = await this.memoryProvider.embedText(currentSituation);
      
      // Calculate similarity for each memory
      const similarities = this.memories.map((memory) => {
        const similarity = this.memoryProvider.calculateSimilarity(queryEmbedding, memory.embedding);
        return {
          matchedSituation: memory.situation,
          recommendation: memory.recommendation,
          similarityScore: similarity,
        };
      });

      // Sort by similarity score and return top n matches
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);
      return similarities.slice(0, nMatches);
    } catch (error) {
      // Return empty array if embedding fails
      return [];
    }
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

  /**
   * Get memory provider information
   */
  getProviderInfo(): { name: string; provider: string; memoryCount: number } {
    return {
      name: this.name,
      provider: this.memoryProvider.getProviderName(),
      memoryCount: this.memories.length
    };
  }

  /**
   * Get the memory provider name
   */
  getProviderName(): string {
    return this.memoryProvider.getProviderName();
  }
}

/**
 * Factory function to create pre-populated financial memories
 */
export async function createPrePopulatedMemory(name: string, config: AgentLLMConfig): Promise<FinancialSituationMemory> {
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