/**
 * Lazy Loading Factory for Trading Agents
 * 
 * Provides lazy initialization of agents and dataflows to reduce memory footprint
 * and startup time. Components are only created when first accessed.
 */

import { TradingAgentsConfig } from '@/types/config';
import { EnhancedAgentFactory } from '../factory/enhanced-agent-factory';
import { CachedDataflowsFactory } from '../dataflows/cached-dataflows';
import { LLMProvider } from '../models/index';
import { createLogger } from '../utils/enhanced-logger';

const logger = createLogger('system', 'lazy-factory');

// Define AgentNode interface locally since setup types might not be available
export interface AgentNode {
  name: string;
  agent: any;
  type: 'analyst' | 'researcher' | 'manager' | 'trader' | 'risk' | 'unknown';
}

export interface LazyFactoryConfig {
  config: TradingAgentsConfig;
  quickThinkingLLM: LLMProvider;
  deepThinkingLLM: LLMProvider;
  enableCache: boolean;
}

/**
 * Lazy factory that creates agents and dataflows on-demand
 */
export class LazyFactory {
  private factoryConfig: LazyFactoryConfig;
  private agentCache = new Map<string, AgentNode>();
  private dataflowCache = new Map<string, any>();
  private dataflowsFactory?: CachedDataflowsFactory | undefined;

  // Lazy initialization flags
  private dataflowsInitialized = false;
  private agentInitializationTimes = new Map<string, number>();
  private dataflowInitializationTimes = new Map<string, number>();

  constructor(factoryConfig: LazyFactoryConfig) {
    this.factoryConfig = factoryConfig;
    
    logger.info('constructor', 'Lazy factory initialized', {
      cacheEnabled: factoryConfig.enableCache
    });
  }

  /**
   * Get agent by type (lazy initialization)
   */
  getAgent(agentType: string, tools?: any[]): AgentNode {
    if (this.agentCache.has(agentType)) {
      const cached = this.agentCache.get(agentType)!;
      logger.debug('getAgent', 'Agent retrieved from cache', {
        agentType,
        name: cached.name
      });
      return cached;
    }

    logger.debug('getAgent', 'Creating agent lazily', { agentType });
    const startTime = Date.now();

    try {
      const agent = this.createAgentLazily(agentType, tools);
      const duration = Date.now() - startTime;
      
      this.agentCache.set(agentType, agent);
      this.agentInitializationTimes.set(agentType, duration);

      logger.info('getAgent', 'Agent created and cached', {
        agentType,
        name: agent.name,
        duration,
        cacheSize: this.agentCache.size
      });

      return agent;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('getAgent', 'Failed to create agent', {
        agentType,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get multiple agents by type (lazy initialization)
   */
  getAgents(agentTypes: string[], tools?: any[]): Record<string, AgentNode> {
    const agents: Record<string, AgentNode> = {};
    
    logger.debug('getAgents', 'Getting multiple agents lazily', {
      agentTypes,
      count: agentTypes.length
    });

    for (const agentType of agentTypes) {
      agents[agentType] = this.getAgent(agentType, tools);
    }

    return agents;
  }

  /**
   * Get dataflow API by type (lazy initialization)
   */
  getDataflow<T>(dataflowType: 'yahoo' | 'finnhub' | 'reddit' | 'google'): T {
    if (this.dataflowCache.has(dataflowType)) {
      const cached = this.dataflowCache.get(dataflowType);
      logger.debug('getDataflow', 'Dataflow retrieved from cache', { dataflowType });
      return cached;
    }

    logger.debug('getDataflow', 'Creating dataflow lazily', { dataflowType });
    const startTime = Date.now();

    try {
      this.ensureDataflowsFactory();
      const dataflow = this.createDataflowLazily(dataflowType);
      const duration = Date.now() - startTime;
      
      this.dataflowCache.set(dataflowType, dataflow);
      this.dataflowInitializationTimes.set(dataflowType, duration);

      logger.info('getDataflow', 'Dataflow created and cached', {
        dataflowType,
        duration,
        cacheSize: this.dataflowCache.size
      });

      return dataflow;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('getDataflow', 'Failed to create dataflow', {
        dataflowType,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Pre-warm specific agents (background initialization)
   */
  async preWarmAgents(agentTypes: string[], tools?: any[]): Promise<void> {
    logger.info('preWarmAgents', 'Starting agent pre-warming', {
      agentTypes,
      count: agentTypes.length
    });

    const promises = agentTypes.map(async (agentType) => {
      try {
        this.getAgent(agentType, tools);
      } catch (error) {
        logger.warn('preWarmAgents', 'Failed to pre-warm agent', {
          agentType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(promises);
    
    logger.info('preWarmAgents', 'Agent pre-warming completed', {
      agentTypes,
      cacheSize: this.agentCache.size
    });
  }

  /**
   * Pre-warm specific dataflows (background initialization)
   */
  async preWarmDataflows(dataflowTypes: string[]): Promise<void> {
    logger.info('preWarmDataflows', 'Starting dataflow pre-warming', {
      dataflowTypes,
      count: dataflowTypes.length
    });

    const promises = dataflowTypes.map(async (dataflowType) => {
      try {
        this.getDataflow(dataflowType as any);
      } catch (error) {
        logger.warn('preWarmDataflows', 'Failed to pre-warm dataflow', {
          dataflowType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(promises);
    
    logger.info('preWarmDataflows', 'Dataflow pre-warming completed', {
      dataflowTypes,
      cacheSize: this.dataflowCache.size
    });
  }

  /**
   * Get lazy loading statistics
   */
  getStats() {
    const agentStats = Array.from(this.agentInitializationTimes.entries()).map(([type, time]) => ({
      type,
      initializationTime: time,
      cached: true
    }));

    const dataflowStats = Array.from(this.dataflowInitializationTimes.entries()).map(([type, time]) => ({
      type,
      initializationTime: time,
      cached: true
    }));

    return {
      agents: {
        cached: this.agentCache.size,
        stats: agentStats,
        totalInitTime: Array.from(this.agentInitializationTimes.values()).reduce((sum, time) => sum + time, 0)
      },
      dataflows: {
        cached: this.dataflowCache.size,
        stats: dataflowStats,
        totalInitTime: Array.from(this.dataflowInitializationTimes.values()).reduce((sum, time) => sum + time, 0)
      },
      memoryFootprint: {
        agentsCached: this.agentCache.size,
        dataflowsCached: this.dataflowCache.size,
        dataflowsFactoryInitialized: this.dataflowsInitialized
      }
    };
  }

  /**
   * Clear specific cache entries
   */
  clearCache(type?: 'agents' | 'dataflows'): void {
    if (!type || type === 'agents') {
      const agentCount = this.agentCache.size;
      this.agentCache.clear();
      this.agentInitializationTimes.clear();
      logger.info('clearCache', 'Agent cache cleared', { clearedCount: agentCount });
    }

    if (!type || type === 'dataflows') {
      const dataflowCount = this.dataflowCache.size;
      this.dataflowCache.clear();
      this.dataflowInitializationTimes.clear();
      this.dataflowsFactory = undefined;
      this.dataflowsInitialized = false;
      logger.info('clearCache', 'Dataflow cache cleared', { clearedCount: dataflowCount });
    }
  }

  /**
   * Dispose of all cached resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('dispose', 'Lazy factory disposed');
  }

  /**
   * Create agent with appropriate type mapping
   */
  private createAgentLazily(agentType: string, tools?: any[]): AgentNode {
    // Map agent type to factory method
    const agentTypeMapping: Record<string, string> = {
      'market': 'market_analyst',
      'social': 'social_analyst',
      'news': 'news_analyst',
      'fundamentals': 'fundamentals_analyst',
      'bull_researcher': 'bull_researcher',
      'bear_researcher': 'bear_researcher',
      'research_manager': 'research_manager',
      'trader': 'trader',
      'risky_analyst': 'risky_analyst',
      'safe_analyst': 'safe_analyst',
      'neutral_analyst': 'neutral_analyst',
      'portfolio_manager': 'portfolio_manager'
    };

    const factoryAgentType = agentTypeMapping[agentType] || agentType;
    const agent = EnhancedAgentFactory.createAgent(factoryAgentType, tools);

    // Map agent type to display name and category
    const agentMetadata: Record<string, { name: string; type: AgentNode['type'] }> = {
      'market': { name: 'Market Analyst', type: 'analyst' },
      'social': { name: 'Social Analyst', type: 'analyst' },
      'news': { name: 'News Analyst', type: 'analyst' },
      'fundamentals': { name: 'Fundamentals Analyst', type: 'analyst' },
      'bull_researcher': { name: 'Bull Researcher', type: 'researcher' },
      'bear_researcher': { name: 'Bear Researcher', type: 'researcher' },
      'research_manager': { name: 'Research Manager', type: 'manager' },
      'trader': { name: 'Trader', type: 'trader' },
      'risky_analyst': { name: 'Risky Analyst', type: 'risk' },
      'safe_analyst': { name: 'Safe Analyst', type: 'risk' },
      'neutral_analyst': { name: 'Neutral Analyst', type: 'risk' },
      'portfolio_manager': { name: 'Portfolio Manager', type: 'manager' }
    };

    const metadata = agentMetadata[agentType] || { name: agentType, type: 'unknown' as any };

    return {
      name: metadata.name,
      agent,
      type: metadata.type
    };
  }

  /**
   * Create dataflow with appropriate factory method
   */
  private createDataflowLazily(dataflowType: string): any {
    switch (dataflowType) {
      case 'yahoo':
        return this.dataflowsFactory!.createYahooFinanceAPI();
      case 'finnhub':
        return this.dataflowsFactory!.createFinnhubAPI();
      case 'reddit':
        return this.dataflowsFactory!.createRedditAPI();
      case 'google':
        return this.dataflowsFactory!.createGoogleNewsAPI();
      default:
        throw new Error(`Unknown dataflow type: ${dataflowType}`);
    }
  }

  /**
   * Ensure dataflows factory is initialized
   */
  private ensureDataflowsFactory(): void {
    if (!this.dataflowsInitialized) {
      logger.debug('ensureDataflowsFactory', 'Initializing dataflows factory');
      this.dataflowsFactory = new CachedDataflowsFactory(
        this.factoryConfig.config,
        this.factoryConfig.enableCache
      );
      this.dataflowsInitialized = true;
    }
  }
}

/**
 * Enhanced GraphSetup with lazy loading
 */
export class LazyGraphSetup {
  private lazyFactory: LazyFactory;

  constructor(factoryConfig: LazyFactoryConfig) {
    this.lazyFactory = new LazyFactory(factoryConfig);
    
    logger.info('constructor', 'Lazy graph setup initialized');
  }

  /**
   * Get agents for selected analysts (lazy loading)
   */
  setupAgents(selectedAnalysts: string[]): Record<string, AgentNode> {
    if (selectedAnalysts.length === 0) {
      throw new Error('Trading Agents Graph Setup Error: no analysts selected!');
    }

    logger.info('setupAgents', 'Setting up agents with lazy loading', {
      selectedAnalysts,
      count: selectedAnalysts.length
    });

    // Define all required agent types
    const allAgentTypes = [
      ...selectedAnalysts,
      'bull_researcher',
      'bear_researcher', 
      'research_manager',
      'trader',
      'risky_analyst',
      'safe_analyst',
      'neutral_analyst',
      'portfolio_manager'
    ];

    return this.lazyFactory.getAgents(allAgentTypes);
  }

  /**
   * Get dataflow APIs (lazy loading)
   */
  getDataflows() {
    return {
      yahoo: this.lazyFactory.getDataflow('yahoo'),
      finnhub: this.lazyFactory.getDataflow('finnhub'),
      reddit: this.lazyFactory.getDataflow('reddit'),
      google: this.lazyFactory.getDataflow('google')
    };
  }

  /**
   * Pre-warm common agents in background
   */
  async preWarmCommonAgents(selectedAnalysts: string[]): Promise<void> {
    // Pre-warm analysts first (most commonly used)
    await this.lazyFactory.preWarmAgents(selectedAnalysts);
    
    // Pre-warm other agents in background
    const otherAgents = ['bull_researcher', 'bear_researcher', 'research_manager'];
    await this.lazyFactory.preWarmAgents(otherAgents);
  }

  /**
   * Pre-warm dataflows in background
   */
  async preWarmDataflows(): Promise<void> {
    await this.lazyFactory.preWarmDataflows(['yahoo', 'finnhub', 'reddit', 'google']);
  }

  /**
   * Get lazy loading statistics
   */
  getStats() {
    return this.lazyFactory.getStats();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.lazyFactory.dispose();
  }
}