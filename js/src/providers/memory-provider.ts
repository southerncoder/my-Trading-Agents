import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LLMProvider } from '../types/config';
import { AgentLLMConfig } from '../types/agent-config';

/**
 * Abstract interface for memory/embedding providers
 */
export interface MemoryProvider {
  /**
   * Generate embeddings for text
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts
   */
  embedTexts(texts: string[]): Promise<number[][]>;

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number;

  /**
   * Get the provider name
   */
  getProviderName(): string;
}

/**
 * Factory for creating embedding providers
 */
export class EmbeddingProviderFactory {
  /**
   * Create an embedding provider based on configuration
   * Prioritizes using OpenAI embeddings when the agent uses OpenAI as LLM provider
   */
  public static createProvider(config: AgentLLMConfig): MemoryProvider {
    switch (config.provider) {
      case 'openai':
      case 'openrouter':
        // Use OpenAI embeddings when the agent uses OpenAI-compatible providers
        // But only if API key is available
        if (config.apiKey || process.env.OPENAI_API_KEY) {
          try {
            return new OpenAIMemoryProvider(config);
          } catch (error) {
            // If OpenAI fails, fall back to intelligent fallback
            return this.createFallbackProvider(config, config.provider);
          }
        } else {
          return this.createFallbackProvider(config, config.provider);
        }
      case 'google':
        // Use Google embeddings for Google providers
        if (config.apiKey || process.env.GOOGLE_API_KEY) {
          try {
            return new GoogleMemoryProvider(config);
          } catch (error) {
            return this.createFallbackProvider(config, config.provider);
          }
        } else {
          return this.createFallbackProvider(config, config.provider);
        }
      case 'anthropic':
        // Anthropic doesn't provide embeddings, use intelligent fallback
        return this.createFallbackProvider(config, 'anthropic');
      case 'lm_studio':
      case 'ollama':
        // Local providers may not support embeddings, use intelligent fallback
        return this.createFallbackProvider(config, config.provider);
      default:
        return this.createFallbackProvider(config, 'unknown');
    }
  }

  /**
   * Create a fallback provider with intelligent provider selection
   */
  private static createFallbackProvider(config: AgentLLMConfig, originalProvider: string): MemoryProvider {
    // Try to use OpenAI embeddings if API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      const openaiConfig: AgentLLMConfig = {
        ...config,
        provider: 'openai',
        apiKey: openaiApiKey,
        model: 'text-embedding-3-small' // Use optimal embedding model
      };
      return new FallbackMemoryProvider(openaiConfig, originalProvider);
    }

    // Try Google if available
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      const googleConfig: AgentLLMConfig = {
        ...config,
        provider: 'google',
        apiKey: googleApiKey,
        model: 'embedding-001'
      };
      return new FallbackMemoryProvider(googleConfig, originalProvider);
    }

    // Fall back to local text-based embeddings
    return new LocalMemoryProvider(config, originalProvider);
  }

  /**
   * Get available embedding models for a provider
   */
  public static getAvailableEmbeddingModels(provider: LLMProvider): string[] {
    switch (provider) {
      case 'openai':
      case 'openrouter':
        return ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
      case 'google':
        return ['embedding-001', 'text-embedding-004'];
      case 'lm_studio':
      case 'ollama':
        return ['nomic-embed-text', 'all-minilm', 'sentence-transformers'];
      case 'anthropic':
        return []; // Anthropic doesn't provide embeddings
      default:
        return [];
    }
  }
}

/**
 * OpenAI-based memory provider
 */
export class OpenAIMemoryProvider implements MemoryProvider {
  private embeddings: OpenAIEmbeddings;

  constructor(config: AgentLLMConfig) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required for embeddings');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-small',
      batchSize: 512,
      stripNewLines: true
    });
  }

  async embedText(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return await this.embeddings.embedDocuments(texts);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilarity(embedding1, embedding2);
  }

  getProviderName(): string {
    return 'openai';
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * Google-based memory provider
 */
export class GoogleMemoryProvider implements MemoryProvider {
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor(config: AgentLLMConfig) {
    if (!config.apiKey) {
      throw new Error('Google API key is required for embeddings');
    }

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.apiKey,
      modelName: 'embedding-001'
    });
  }

  async embedText(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return await this.embeddings.embedDocuments(texts);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilarity(embedding1, embedding2);
  }

  getProviderName(): string {
    return 'google';
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * Local provider (LM Studio/Ollama) - uses simple text matching
 */
export class LocalMemoryProvider implements MemoryProvider {
  private originalProvider: string;

  constructor(private config: AgentLLMConfig, originalProvider?: string) {
    this.originalProvider = originalProvider || config.provider;
  }

  async embedText(text: string): Promise<number[]> {
    // Simple text-based embedding using character frequencies
    return this.createSimpleEmbedding(text);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.createSimpleEmbedding(text));
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilarity(embedding1, embedding2);
  }

  getProviderName(): string {
    return `local-${this.originalProvider}`;
  }

  private createSimpleEmbedding(text: string): number[] {
    // Create a simple embedding based on character frequencies and text features
    const embedding = new Array(384).fill(0); // Standard embedding size
    
    // Normalize text
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Character frequency features
    for (let i = 0; i < normalizedText.length && i < 100; i++) {
      const charCode = normalizedText.charCodeAt(i);
      embedding[charCode % 384] += 1;
    }
    
    // Text length features
    embedding[0] = text.length / 1000; // Normalize length
    embedding[1] = text.split(' ').length / 100; // Word count
    embedding[2] = text.split('.').length / 10; // Sentence count
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * Fallback provider for providers without embedding support (like Anthropic)
 */
export class FallbackMemoryProvider implements MemoryProvider {
  private provider: MemoryProvider;
  private originalProvider: string;

  constructor(config: AgentLLMConfig, originalProvider?: string) {
    this.originalProvider = originalProvider || config.provider;
    
    // Use the provided config which should already be set up for the fallback provider
    if (config.provider === 'openai') {
      this.provider = new OpenAIMemoryProvider(config);
    } else if (config.provider === 'google') {
      this.provider = new GoogleMemoryProvider(config);
    } else {
      // Ultimate fallback to local provider
      this.provider = new LocalMemoryProvider(config, this.originalProvider);
    }
  }

  async embedText(text: string): Promise<number[]> {
    return await this.provider.embedText(text);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return await this.provider.embedTexts(texts);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.provider.calculateSimilarity(embedding1, embedding2);
  }

  getProviderName(): string {
    return `${this.originalProvider}-fallback-${this.provider.getProviderName()}`;
  }
}