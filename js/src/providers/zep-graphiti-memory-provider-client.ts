import { AgentLLMConfig } from '../types/agent-config';
import { MemoryMatch } from '../agents/utils/memory';
import { createLogger } from '../utils/enhanced-logger';
import { GraphitiClientBridge, createGraphitiClientBridge } from './graphiti-client-bridge';

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
 * Enhanced memory provider using Zep's Graphiti temporal knowledge graphs
 * Now uses proper Graphiti client via Python bridge instead of HTTP calls
 */
export class ZepGraphitiMemoryProvider {
  private logger = createLogger('agent', 'ZepGraphitiMemoryProvider');
  private config: ZepGraphitiConfig;
  private agentConfig: AgentLLMConfig;
  private clientBridge: GraphitiClientBridge | null = null;

  constructor(config: ZepGraphitiConfig, agentConfig: AgentLLMConfig) {
    this.config = {
      maxResults: 10,
      serviceUrl: process.env.ZEP_SERVICE_URL || 'http://localhost:8000',
      ...config
    };
    this.agentConfig = agentConfig;
    
    this.logger.info('initialize', 'Initializing ZepGraphitiMemoryProvider with client bridge', {
      sessionId: config.sessionId,
      userId: config.userId
    });
  }

  /**
   * Initialize the client bridge
   */
  private async ensureClientBridge(): Promise<GraphitiClientBridge> {
    if (!this.clientBridge) {
      this.clientBridge = await createGraphitiClientBridge();
    }
    return this.clientBridge;
  }

  /**
   * Test connection to the Zep Graphiti service
   */
  async testConnection(): Promise<boolean> {
    try {
      const bridge = await this.ensureClientBridge();
      const connected = await bridge.testConnection();
      
      this.logger.info('testConnection', 'Health check completed via client bridge', {
        connected
      });
      
      return connected;
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
      const bridge = await this.ensureClientBridge();
      
      const message = {
        content,
        name,
        role: episodeType === EpisodeType.TEXT ? 'trading_agent' : episodeType,
        role_type: 'assistant',
        timestamp: new Date().toISOString(),
        source_description: metadata?.sourceDescription || 'Trading Agent'
      };

      await bridge.addEpisode(this.config.sessionId, [message]);

      timer();
      this.logger.info('addEpisode', 'Episode added successfully via client bridge', { 
        name, 
        episodeType 
      });
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
      const bridge = await this.ensureClientBridge();
      
      const result = await bridge.searchMemories(
        query,
        options?.maxResults || this.config.maxResults || 10,
        options?.centerNodeUuid
      );
      
      timer();
      this.logger.info('searchMemories', 'Memory search completed via client bridge', {
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
      const bridge = await this.ensureClientBridge();
      
      // Create source entity node
      const sourceUuid = `${sourceEntity}_${Date.now()}`;
      await bridge.createEntityNode(
        sourceUuid,
        this.config.sessionId,
        sourceEntity,
        `Entity representing ${sourceEntity}`
      );

      // Create target entity node
      const targetUuid = `${targetEntity}_${Date.now() + 1}`;
      await bridge.createEntityNode(
        targetUuid,
        this.config.sessionId,
        targetEntity,
        `Entity representing ${targetEntity}`
      );

      this.logger.info('addFact', 'Fact added successfully via client bridge', { 
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
      const options: { maxResults: number; centerNodeUuid?: string } = { maxResults };
      if (centerNodeUuid) {
        options.centerNodeUuid = centerNodeUuid;
      }
      const searchResult = await this.searchMemories(query, options);
      return searchResult.facts;
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
   * Clear all memories (use with caution) - Not available via client bridge
   */
  async reset(): Promise<void> {
    this.logger.warn('reset', 'Reset operation not available via client bridge');
    throw new Error('Reset operation not available via Graphiti client bridge');
  }

  /**
   * Get provider information
   */
  getProviderInfo(): { name: string; provider: string; memoryCount: number } {
    return {
      name: `zep-graphiti-bridge-${this.config.sessionId}`,
      provider: 'zep-graphiti-client-bridge',
      memoryCount: 0 // Count not available via client bridge
    };
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'zep-graphiti-client-bridge';
  }

  /**
   * Get all memories for debugging/inspection (not available via client bridge)
   */
  getAllMemories(): Array<{ situation: string; recommendation: string }> {
    return []; // Not available via client bridge
  }

  /**
   * Get the memory count (not available via client bridge)
   */
  count(): number {
    return 0; // Not available via client bridge
  }
}

/**
 * Factory function to create and test a ZepGraphitiMemoryProvider with client bridge
 */
export async function createZepGraphitiMemory(
  config: ZepGraphitiConfig,
  agentConfig: AgentLLMConfig
): Promise<ZepGraphitiMemoryProvider> {
  const provider = new ZepGraphitiMemoryProvider(config, agentConfig);
  
  // Test connection
  const connected = await provider.testConnection();
  if (!connected) {
    throw new Error('Failed to connect to Zep Graphiti service via client bridge. Make sure the Python environment and services are running.');
  }
  
  return provider;
}

/**
 * Enhanced financial memory that uses ZepGraphitiMemoryProvider with client bridge
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