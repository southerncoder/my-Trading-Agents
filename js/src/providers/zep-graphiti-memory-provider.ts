import { AgentLLMConfig } from '../types/agent-config';
import { MemoryMatch } from '../agents/utils/memory';
import { createLogger } from '../utils/enhanced-logger';

/**
 * Configuration for Zep Graphiti memory provider
 */
export interface ZepGraphitiConfig {
  serviceUrl?: string;
  sessionId: string;
  userId?: string;
  maxResults?: number;
}

/**
 * Episode types for different kinds of memory storage
 */
export enum EpisodeType {
  TEXT = 'text',
  JSON = 'json',
  MESSAGE = 'message',
  EVENT = 'event',
  ANALYSIS = 'analysis',
  DECISION = 'decision'
}

/**
 * Memory fact structure for graph relationships
 */
export interface MemoryFact {
  fact: string;
  confidence: number;
  timestamp: string;
  source_entity?: string;
  target_entity?: string;
  metadata?: Record<string, any>;
}

/**
 * Graph search result structure
 */
export interface GraphSearchResult {
  facts: MemoryFact[];
  total_results: number;
  query: string;
  center_node_uuid?: string;
}

/**
 * HTTP request/response models
 */
interface EpisodeRequest {
  name: string;
  content: string;
  episode_type: string;
  source_description?: string;
  metadata?: Record<string, any>;
}

interface SearchRequest {
  query: string;
  max_results?: number;
  center_node_uuid?: string;
}

interface FactRequest {
  source_entity: string;
  target_entity: string;
  relationship: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface HealthResponse {
  status: string;
  graphiti_initialized: boolean;
  neo4j_connected: boolean;
}

/**
 * Enhanced memory provider using Zep's Graphiti temporal knowledge graphs
 * Connects to a Python service running the Graphiti library via HTTP API
 */
export class ZepGraphitiMemoryProvider {
  private logger = createLogger('agent', 'ZepGraphitiMemoryProvider');
  private config: ZepGraphitiConfig;
  private agentConfig: AgentLLMConfig;
  private serviceUrl: string;

  constructor(config: ZepGraphitiConfig, agentConfig: AgentLLMConfig) {
    this.config = {
      maxResults: 10,
      serviceUrl: 'http://localhost:8000',
      ...config
    };
    this.agentConfig = agentConfig;
    this.serviceUrl = this.config.serviceUrl!;
    
    this.logger.info('initialize', 'Initializing ZepGraphitiMemoryProvider', {
      serviceUrl: this.serviceUrl,
      sessionId: config.sessionId,
      userId: config.userId
    });
  }

  /**
   * Test connection to the Zep Graphiti service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/healthcheck`);
      const health = await response.json() as { status: string };
      
      this.logger.info('testConnection', 'Health check completed', {
        status: health.status
      });
      
      return health.status === 'healthy';
    } catch (error) {
      this.logger.error('testConnection', 'Health check failed', { error: String(error) });
      return false;
    }
  }

  /**
   * Add an episode (event/conversation/analysis) to the knowledge graph
   */
  async addEpisode(
    name: string,
    content: string,
    episodeType: EpisodeType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const timer = this.logger.startTimer('addEpisode');
    
    try {
      const request: EpisodeRequest = {
        name,
        content,
        episode_type: episodeType,
        source_description: metadata?.sourceDescription || 'Trading Agent',
        ...(metadata && { metadata })
      };

      const response = await fetch(`${this.serviceUrl}/memory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      timer();
      this.logger.info('addEpisode', 'Episode added successfully', { name, episodeType });
    } catch (error) {
      this.logger.error('addEpisode', 'Failed to add episode', { 
        name, 
        episodeType, 
        error: String(error) 
      });
      throw error;
    }
  }

  /**
   * Search for memories using semantic graph search
   */
  async searchMemories(
    query: string,
    options?: {
      maxResults?: number;
      centerNodeUuid?: string;
    }
  ): Promise<GraphSearchResult> {
    const timer = this.logger.startTimer('searchMemories');
    
    try {
      const searchRequest: SearchRequest = {
        query,
        max_results: options?.maxResults || this.config.maxResults || 10,
        ...(options?.centerNodeUuid && { center_node_uuid: options.centerNodeUuid })
      };

      const response = await fetch(`${this.serviceUrl}/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json() as GraphSearchResult;
      
      timer();
      this.logger.info('searchMemories', 'Memory search completed', {
        query,
        factsFound: result.facts.length,
        totalResults: result.total_results
      });

      return result;
    } catch (error) {
      this.logger.error('searchMemories', 'Memory search failed', { 
        query, 
        error: String(error) 
      });
      
      // Return empty result on error
      return {
        facts: [],
        total_results: 0,
        query
      };
    }
  }

  /**
   * Add a structured fact/relationship to the graph
   */
  async addFact(
    sourceEntity: string,
    targetEntity: string,
    relationship: string,
    confidence: number = 1.0,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const request: FactRequest = {
        source_entity: sourceEntity,
        target_entity: targetEntity,
        relationship,
        confidence,
        ...(metadata && { metadata })
      };

      const response = await fetch(`${this.serviceUrl}/memory/facts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      this.logger.info('addFact', 'Fact added successfully', { 
        sourceEntity, 
        targetEntity, 
        relationship 
      });
    } catch (error) {
      this.logger.error('addFact', 'Failed to add fact', { 
        sourceEntity, 
        targetEntity, 
        relationship, 
        error: String(error) 
      });
      throw error;
    }
  }

  /**
   * Search for specific facts in the knowledge graph
   */
  async searchFacts(
    query: string,
    maxResults: number = 10,
    centerNodeUuid?: string
  ): Promise<MemoryFact[]> {
    try {
      const params = new URLSearchParams({
        query,
        max_results: maxResults.toString()
      });
      
      if (centerNodeUuid) {
        params.append('center_node_uuid', centerNodeUuid);
      }

      const response = await fetch(`${this.serviceUrl}/memory/facts/search?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json() as { facts: MemoryFact[] };
      return result.facts || [];
    } catch (error) {
      this.logger.error('searchFacts', 'Fact search failed', { 
        query, 
        error: String(error) 
      });
      return [];
    }
  }

  /**
   * Convert graph search results to FinancialSituationMemory format for compatibility
   */
  async getMemories(currentSituation: string, nMatches: number = 1): Promise<MemoryMatch[]> {
    const searchResult = await this.searchMemories(currentSituation, { maxResults: nMatches });
    
    return searchResult.facts.map(fact => ({
      matchedSituation: fact.fact,
      recommendation: fact.metadata?.recommendation || 'Consider reviewing this information in context',
      similarityScore: fact.confidence
    }));
  }

  /**
   * Add financial situations and advice (compatible with FinancialSituationMemory)
   */
  async addSituations(situationsAndAdvice: Array<[string, string]>): Promise<void> {
    for (const [situation, advice] of situationsAndAdvice) {
      await this.addEpisode(
        'Financial Situation',
        situation,
        EpisodeType.ANALYSIS,
        { 
          recommendation: advice,
          type: 'financial-situation'
        }
      );
    }
  }

  /**
   * Clear all memories (use with caution)
   */
  async reset(): Promise<void> {
    this.logger.warn('reset', 'Resetting memory provider - this will clear all data');
    
    try {
      const response = await fetch(`${this.serviceUrl}/memory/clear`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      this.logger.info('reset', 'Memory provider reset completed');
    } catch (error) {
      this.logger.error('reset', 'Failed to reset memory provider', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo(): { name: string; provider: string; memoryCount: number } {
    return {
      name: `zep-graphiti-${this.config.sessionId}`,
      provider: 'zep-graphiti-http',
      memoryCount: 0 // Count not available via HTTP API
    };
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'zep-graphiti-http';
  }

  /**
   * Get all memories for debugging/inspection (not available via HTTP API)
   */
  getAllMemories(): Array<{ situation: string; recommendation: string }> {
    return []; // Not available via HTTP API
  }

  /**
   * Get the memory count (not available via HTTP API)
   */
  count(): number {
    return 0; // Not available via HTTP API
  }
}

/**
 * Factory function to create and test a ZepGraphitiMemoryProvider
 */
export async function createZepGraphitiMemory(
  config: ZepGraphitiConfig,
  agentConfig: AgentLLMConfig
): Promise<ZepGraphitiMemoryProvider> {
  const provider = new ZepGraphitiMemoryProvider(config, agentConfig);
  
  // Test connection
  const connected = await provider.testConnection();
  if (!connected) {
    throw new Error('Failed to connect to Zep Graphiti service. Make sure the service is running.');
  }
  
  return provider;
}

/**
 * Enhanced financial memory that uses ZepGraphitiMemoryProvider
 * Compatible with existing FinancialSituationMemory interface
 */
export class EnhancedFinancialMemory {
  private zepProvider: ZepGraphitiMemoryProvider;

  constructor(
    private name: string,
    private config: AgentLLMConfig,
    private zepConfig: ZepGraphitiConfig
  ) {
    this.zepProvider = new ZepGraphitiMemoryProvider(zepConfig, config);
  }

  /**
   * Initialize the enhanced memory system
   */
  async initialize(): Promise<void> {
    await this.zepProvider.testConnection();
  }

  /**
   * Add financial situations and their corresponding advice
   */
  async addSituations(situationsAndAdvice: Array<[string, string]>): Promise<void> {
    await this.zepProvider.addSituations(situationsAndAdvice);
  }

  /**
   * Find matching recommendations using graph-based semantic search
   */
  async getMemories(currentSituation: string, nMatches: number = 1): Promise<MemoryMatch[]> {
    return await this.zepProvider.getMemories(currentSituation, nMatches);
  }

  /**
   * Advanced graph-based search
   */
  async searchWithContext(
    query: string,
    maxResults: number = 10
  ): Promise<GraphSearchResult> {
    return await this.zepProvider.searchMemories(query, { maxResults });
  }

  /**
   * Add agent analysis results to memory
   */
  async addAnalysis(
    analysisType: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.zepProvider.addEpisode(
      `Analysis: ${analysisType}`,
      content,
      EpisodeType.ANALYSIS,
      { analysisType, ...metadata }
    );
  }

  // Compatibility methods with original FinancialSituationMemory
  count(): number {
    return this.zepProvider.count();
  }

  async reset(): Promise<void> {
    await this.zepProvider.reset();
  }

  getAllMemories(): Array<{ situation: string; recommendation: string }> {
    return this.zepProvider.getAllMemories();
  }

  getProviderInfo(): { name: string; provider: string; memoryCount: number } {
    return this.zepProvider.getProviderInfo();
  }

  getProviderName(): string {
    return this.zepProvider.getProviderName();
  }
}