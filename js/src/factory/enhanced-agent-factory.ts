import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LLMProviderFactory } from '../providers/llm-factory.js';
import { enhancedConfigLoader } from '../config/enhanced-loader.js';
import { AgentLLMConfig } from '../types/agent-config.js';

// Import available agent classes
import { MarketAnalyst } from '../agents/analysts/market-analyst.js';
import { NewsAnalyst } from '../agents/analysts/news-analyst.js';
import { FundamentalsAnalyst } from '../agents/analysts/fundamentals-analyst.js';
import { SocialAnalyst } from '../agents/analysts/social-analyst.js';
import { BullResearcher } from '../agents/researchers/bull-researcher.js';
import { BearResearcher } from '../agents/researchers/bear-researcher.js';
import { ResearchManager } from '../agents/managers/research-manager.js';
import { SafeAnalyst } from '../agents/risk-mgmt/safe-analyst.js';
import { RiskyAnalyst } from '../agents/risk-mgmt/risky-analyst.js';
import { NeutralAnalyst } from '../agents/risk-mgmt/neutral-analyst.js';
import { PortfolioManager } from '../agents/risk-mgmt/portfolio-manager.js';
import { Trader } from '../agents/trader/trader.js';

/**
 * Enhanced agent factory that creates agents with flexible LLM provider configurations
 */
export class EnhancedAgentFactory {
  /**
   * Create any agent with its specific LLM configuration
   */
  public static createAgent(agentType: string, tools?: any[]): any {
    const agentConfig = enhancedConfigLoader.getAgentConfig(agentType);
    const llm = LLMProviderFactory.createLLM(agentConfig);
    
    switch (agentType) {
      case 'market_analyst':
        return new MarketAnalyst(llm, tools || []);
      case 'news_analyst':
        return new NewsAnalyst(llm, tools || []);
      case 'fundamentals_analyst':
        return new FundamentalsAnalyst(llm, tools || []);
      case 'social_analyst':
      case 'social_media_analyst':
        return new SocialAnalyst(llm, tools || []);
      case 'bull_researcher':
        return new BullResearcher(llm, tools);
      case 'bear_researcher':
        return new BearResearcher(llm, tools);
      case 'research_manager':
        return new ResearchManager(llm, tools);
      case 'safe_analyst':
      case 'conservative_debator':
        return new SafeAnalyst(llm, tools);
      case 'risky_analyst':
      case 'aggressive_debator':
        return new RiskyAnalyst(llm, tools);
      case 'neutral_analyst':
      case 'neutral_debator':
        return new NeutralAnalyst(llm, tools);
      case 'portfolio_manager':
      case 'risk_manager':
        return new PortfolioManager(llm, tools);
      case 'trader':
        return new Trader(llm, tools);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Create multiple agents with their configurations
   */
  public static createAgents(agentTypes: string[], tools?: any[]): { [key: string]: any } {
    const agents: { [key: string]: any } = {};
    
    agentTypes.forEach(agentType => {
      agents[agentType] = this.createAgent(agentType, tools);
    });
    
    return agents;
  }

  /**
   * Create all available agents
   */
  public static createAllAgents(tools?: any[]): { [key: string]: any } {
    const allAgentTypes = [
      'market_analyst',
      'news_analyst', 
      'fundamentals_analyst',
      'social_analyst',
      'bull_researcher',
      'bear_researcher',
      'research_manager',
      'safe_analyst',
      'risky_analyst',
      'neutral_analyst',
      'portfolio_manager',
      'trader'
    ];
    
    return this.createAgents(allAgentTypes, tools);
  }

  /**
   * Get agent configuration without creating the agent
   */
  public static getAgentConfig(agentType: string): AgentLLMConfig {
    return enhancedConfigLoader.getAgentConfig(agentType);
  }

  /**
   * Get LLM instance for a specific agent type
   */
  public static createLLMForAgent(agentType: string): BaseChatModel {
    const agentConfig = enhancedConfigLoader.getAgentConfig(agentType);
    return LLMProviderFactory.createLLM(agentConfig);
  }

  /**
   * Update agent configuration at runtime
   */
  public static updateAgentConfig(agentType: string, updates: Partial<AgentLLMConfig>): void {
    enhancedConfigLoader.updateAgentConfig(agentType, updates);
  }

  /**
   * Test connection for a specific agent's LLM provider
   */
  public static async testAgentConnection(agentType: string): Promise<boolean> {
    const agentConfig = enhancedConfigLoader.getAgentConfig(agentType);
    return await LLMProviderFactory.testConnection(agentConfig);
  }

  /**
   * Test connections for all agents
   */
  public static async testAllConnections(): Promise<{ [agentType: string]: boolean }> {
    const results: { [agentType: string]: boolean } = {};
    
    const allAgentTypes = [
      'market_analyst',
      'news_analyst', 
      'fundamentals_analyst',
      'social_media_analyst',
      'bull_researcher',
      'bear_researcher',
      'research_manager',
      'conservative_debator',
      'aggressive_debator',
      'neutral_debator',
      'risk_manager',
      'trader'
    ];

    // Test connections in parallel
    const tests = allAgentTypes.map(async agentType => {
      const success = await this.testAgentConnection(agentType);
      return { agentType, success };
    });

    const testResults = await Promise.all(tests);
    
    testResults.forEach(({ agentType, success }) => {
      results[agentType] = success;
    });

    return results;
  }

  /**
   * Get a summary of all agent configurations
   */
  public static getConfigurationSummary(): string {
    return enhancedConfigLoader.getConfigSummary();
  }

  /**
   * Validate all agent configurations
   */
  public static validateConfigurations(): void {
    enhancedConfigLoader.validateConfiguration();
  }

  /**
   * Create agents by category
   */
  public static createAnalysts(tools?: any[]): { [key: string]: any } {
    return this.createAgents([
      'market_analyst',
      'news_analyst',
      'fundamentals_analyst',
      'social_analyst'
    ], tools);
  }

  public static createResearchers(tools?: any[]): { [key: string]: any } {
    return this.createAgents([
      'bull_researcher',
      'bear_researcher'
    ], tools);
  }

  public static createManagers(tools?: any[]): { [key: string]: any } {
    return this.createAgents([
      'research_manager',
      'portfolio_manager'
    ], tools);
  }

  public static createDebators(tools?: any[]): { [key: string]: any } {
    return this.createAgents([
      'safe_analyst',
      'risky_analyst',
      'neutral_analyst'
    ], tools);
  }

  public static createTrader(tools?: any[]): any {
    return this.createAgent('trader', tools);
  }
}