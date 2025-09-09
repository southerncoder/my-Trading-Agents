import { AgentLLMConfig } from '../types/agent-config';
import { MemoryProvider } from './memory-provider';
import { createLogger } from '../utils/enhanced-logger';
import LMStudioManager from '../models/lmstudio-manager';

/**
 * LM Studio API response types
 */
interface LMStudioEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface LMStudioBatchEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * LM Studio memory provider with model checking and locking behavior
 * Integrates with LMStudioManager to ensure models are loaded before use
 */
export class LMStudioMemoryProvider implements MemoryProvider {
  private logger = createLogger('agent', 'LMStudioMemoryProvider');
  private config: AgentLLMConfig;
  private baseUrl: string;

  constructor(config: AgentLLMConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';

    this.logger.info('initialize', 'LMStudioMemoryProvider initialized', {
      baseUrl: this.baseUrl,
      model: config.model
    });
  }

  /**
   * Embed a single text using LM Studio with model checking
   */
  async embedText(text: string): Promise<number[]> {
    const timer = this.logger.startTimer('embedText');

    try {
      // Ensure the required model is loaded before attempting embedding
      await this.ensureModelLoaded();

      // Use LM Studio's embedding API
      const response = await this.callEmbeddingAPI(text);

      timer();
      this.logger.info('embedText', 'Text embedded successfully', {
        textLength: text.length,
        embeddingSize: response.length
      });

      return response;
    } catch (error) {
      this.logger.error('embedText', 'Failed to embed text', {
        textLength: text.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Embed multiple texts using LM Studio with model checking
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    const timer = this.logger.startTimer('embedTexts');

    try {
      // Ensure the required model is loaded before attempting embedding
      await this.ensureModelLoaded();

      // Process texts in batches to avoid overwhelming the API
      const batchSize = 10;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await this.callBatchEmbeddingAPI(batch);
        results.push(...batchResults);
      }

      timer();
      this.logger.info('embedTexts', 'Batch embedding completed', {
        totalTexts: texts.length,
        batchesProcessed: Math.ceil(texts.length / batchSize)
      });

      return results;
    } catch (error) {
      this.logger.error('embedTexts', 'Failed to embed texts', {
        totalTexts: texts.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'lmstudio-memory';
  }

  /**
   * Ensure the required model is loaded and ready
   */
  private async ensureModelLoaded(): Promise<void> {
    const modelName = this.config.model || 'nomic-embed-text';

    try {
      await LMStudioManager.ensureModelLoaded(modelName, this.baseUrl, {
        pollIntervalMs: 1000,
        timeoutMs: 30000
      });

      this.logger.debug('ensureModelLoaded', 'Model verified as loaded', { modelName });
    } catch (error) {
      this.logger.error('ensureModelLoaded', 'Failed to ensure model is loaded', {
        modelName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`LM Studio model '${modelName}' could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Call LM Studio embedding API for single text
   */
  private async callEmbeddingAPI(text: string): Promise<number[]> {
    const modelName = this.config.model || 'nomic-embed-text';

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: modelName,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as LMStudioEmbeddingResponse;

      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response format from LM Studio embedding API');
      }

      return data.data[0].embedding;
    } catch (error) {
      this.logger.error('callEmbeddingAPI', 'Embedding API call failed', {
        modelName,
        textLength: text.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Call LM Studio embedding API for batch processing
   */
  private async callBatchEmbeddingAPI(texts: string[]): Promise<number[][]> {
    const modelName = this.config.model || 'nomic-embed-text';

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: modelName,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as LMStudioBatchEmbeddingResponse;

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from LM Studio batch embedding API');
      }

      return data.data.map((item) => {
        if (!item.embedding) {
          throw new Error('Missing embedding in batch response');
        }
        return item.embedding;
      });
    } catch (error) {
      this.logger.error('callBatchEmbeddingAPI', 'Batch embedding API call failed', {
        modelName,
        batchSize: texts.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}