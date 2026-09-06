/**
 * Integration Example: AgentMemoryManager with Trading Agents
 * 
 * Demonstrates how to integrate the async PostgreSQL-based agent memory system
 * with the existing trading agents workflow.
 */

import { Pool } from 'pg';
import { AgentMemoryManager, EpisodicMemory, SemanticMemory, WorkingMemory, ProceduralMemory } from './agent-memory-manager.js';
import { DatabaseManager, getDefaultDatabaseConfig } from './database-manager.js';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'memory-integration');

/**
 * Example integration class showing how to use AgentMemoryManager
 * in the context of trading agents
 */
export class TradingAgentMemoryIntegration {
    private memoryManager: AgentMemoryManager;
    private databaseManager: DatabaseManager;
    private pool: Pool | null = null;

    constructor() {
        this.memoryManager = new AgentMemoryManager();
        this.databaseManager = new DatabaseManager(getDefaultDatabaseConfig());
    }

    /**
     * Initialize the memory system
     */
    async initialize(): Promise<void> {
        try {
            logger.info('memory-integration', 'Initializing trading agent memory system');

            // Initialize database manager
            await this.databaseManager.initializeConnections();
            this.pool = this.databaseManager.getPostgreSQLPool();

            // Initialize memory manager
            await this.memoryManager.initialize(this.pool);

            logger.info('memory-integration', 'Memory system initialized successfully');

        } catch (error) {
            logger.error('memory-integration', 'Failed to initialize memory system', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Example: Store agent interaction in episodic memory
     */
    async recordAgentInteraction(
        sessionId: string,
        userId: string,
        agentId: string,
        input: string,
        output: string,
        context: Record<string, any>,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        try {
            const episodicMemory: EpisodicMemory = {
                id: `${agentId}_${sessionId}_${Date.now()}`,
                sessionId,
                userId,
                agentId,
                timestamp: new Date(),
                interactionType: this.determineInteractionType(agentId),
                context,
                input,
                output,
                metadata
            };

            await this.memoryManager.storeEpisodicMemory(episodicMemory);

            logger.debug('memory-integration', 'Agent interaction recorded', {
                agentId,
                sessionId,
                interactionType: episodicMemory.interactionType
            });

        } catch (error) {
            logger.error('memory-integration', 'Failed to record agent interaction', {
                error: (error as Error).message,
                agentId,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Example: Store market insights in semantic memory
     */
    async storeMarketInsight(
        content: string,
        confidence: number,
        source: string,
        tags: string[] = [],
        relatedEntities: string[] = [],
        embedding?: number[]
    ): Promise<void> {
        try {
            const semanticMemory: SemanticMemory = {
                id: `market_insight_${Date.now()}`,
                factType: 'market_knowledge',
                content,
                embedding: embedding || await this.generateEmbedding(content),
                confidence,
                source,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags,
                relatedEntities
            };

            await this.memoryManager.storeSemanticMemory(semanticMemory);

            logger.debug('memory-integration', 'Market insight stored', {
                content: content.substring(0, 100),
                confidence,
                tags
            });

        } catch (error) {
            logger.error('memory-integration', 'Failed to store market insight', {
                error: (error as Error).message,
                content: content.substring(0, 50)
            });
            throw error;
        }
    }

    /**
     * Example: Manage working memory for active analysis
     */
    async setActiveAnalysisContext(
        sessionId: string,
        agentId: string,
        analysisData: Record<string, any>,
        ttlSeconds: number = 3600
    ): Promise<void> {
        try {
            const workingMemory: WorkingMemory = {
                id: `active_analysis_${sessionId}_${agentId}`,
                sessionId,
                agentId,
                contextType: 'active_analysis',
                data: analysisData,
                priority: 1,
                expiresAt: new Date(Date.now() + ttlSeconds * 1000),
                createdAt: new Date()
            };

            await this.memoryManager.storeWorkingMemory(workingMemory, ttlSeconds);

            logger.debug('memory-integration', 'Active analysis context set', {
                sessionId,
                agentId,
                ttlSeconds
            });

        } catch (error) {
            logger.error('memory-integration', 'Failed to set analysis context', {
                error: (error as Error).message,
                sessionId,
                agentId
            });
            throw error;
        }
    }

    /**
     * Example: Update user trading preferences
     */
    async updateUserTradingPreferences(
        userId: string,
        preferences: {
            riskTolerance: 'conservative' | 'moderate' | 'aggressive';
            tradingStyle: 'day_trading' | 'swing_trading' | 'position_trading';
            preferredAssets: string[];
            notificationSettings: Record<string, boolean>;
        }
    ): Promise<void> {
        try {
            await this.memoryManager.updateUserPreferences(userId, {
                ...preferences,
                analysisDepth: 'standard'
            });

            logger.info('memory-integration', 'User trading preferences updated', {
                userId,
                riskTolerance: preferences.riskTolerance,
                tradingStyle: preferences.tradingStyle
            });

        } catch (error) {
            logger.error('memory-integration', 'Failed to update user preferences', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Example: Retrieve relevant context for agent decision making
     */
    async getRelevantContext(
        sessionId: string,
        agentId: string,
        query: string,
        limit: number = 5
    ): Promise<{
        episodicMemory: EpisodicMemory[];
        semanticMemory: SemanticMemory[];
        workingMemory: WorkingMemory[];
    }> {
        try {
            // Get recent episodic memory for this session and agent
            const episodicMemory = await this.memoryManager.retrieveEpisodicMemory({
                sessionId,
                agentId,
                limit,
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            });

            // Get semantically similar knowledge
            const queryEmbedding = await this.generateEmbedding(query);
            const semanticMemory = await this.memoryManager.searchSemanticSimilarity(
                queryEmbedding,
                0.7, // Similarity threshold
                limit
            );

            // Get active working memory
            const workingMemory = await this.memoryManager.retrieveWorkingMemory(sessionId);

            logger.debug('memory-integration', 'Retrieved relevant context', {
                sessionId,
                agentId,
                episodicCount: episodicMemory.length,
                semanticCount: semanticMemory.length,
                workingCount: workingMemory.length
            });

            return {
                episodicMemory,
                semanticMemory,
                workingMemory
            };

        } catch (error) {
            logger.error('memory-integration', 'Failed to retrieve relevant context', {
                error: (error as Error).message,
                sessionId,
                agentId
            });
            throw error;
        }
    }

    /**
     * Example: Batch store multiple agent interactions
     */
    async batchStoreAgentInteractions(interactions: Array<{
        sessionId: string;
        userId: string;
        agentId: string;
        input: string;
        output: string;
        context: Record<string, any>;
        metadata?: Record<string, any>;
    }>): Promise<void> {
        try {
            const episodicMemories: EpisodicMemory[] = interactions.map(interaction => ({
                id: `${interaction.agentId}_${interaction.sessionId}_${Date.now()}_${Math.random()}`,
                sessionId: interaction.sessionId,
                userId: interaction.userId,
                agentId: interaction.agentId,
                timestamp: new Date(),
                interactionType: this.determineInteractionType(interaction.agentId),
                context: interaction.context,
                input: interaction.input,
                output: interaction.output,
                metadata: interaction.metadata || {}
            }));

            await this.memoryManager.batchStoreEpisodicMemory(episodicMemories);

            logger.info('memory-integration', 'Batch stored agent interactions', {
                count: interactions.length
            });

        } catch (error) {
            logger.error('memory-integration', 'Failed to batch store interactions', {
                error: (error as Error).message,
                count: interactions.length
            });
            throw error;
        }
    }

    /**
     * Example: Perform scheduled memory maintenance
     */
    async performScheduledMaintenance(): Promise<void> {
        try {
            logger.info('memory-integration', 'Starting scheduled memory maintenance');

            // Check connection health
            const health = await this.memoryManager.checkConnectionHealth();
            if (!health.connected) {
                throw new Error(`Memory system unhealthy: ${health.lastError}`);
            }

            // Perform automatic cleanup
            const cleanupResults = await this.memoryManager.performAutomaticCleanup();
            
            // Get memory statistics
            const stats = await this.memoryManager.getMemoryStatistics();

            logger.info('memory-integration', 'Scheduled maintenance completed', {
                health: health.poolStats,
                cleanup: cleanupResults,
                stats: {
                    episodicTotal: stats.episodicMemory.total,
                    semanticTotal: stats.semanticMemory.total,
                    workingActive: stats.workingMemory.active,
                    proceduralTotal: stats.proceduralMemory.total
                }
            });

        } catch (error) {
            logger.error('memory-integration', 'Scheduled maintenance failed', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        try {
            await this.memoryManager.shutdown();
            await this.databaseManager.closeConnections();
            
            logger.info('memory-integration', 'Memory integration shutdown completed');

        } catch (error) {
            logger.error('memory-integration', 'Error during shutdown', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Determine interaction type based on agent ID
     */
    private determineInteractionType(agentId: string): EpisodicMemory['interactionType'] {
        if (agentId.includes('analyst')) {
            return 'analysis_request';
        } else if (agentId.includes('risk')) {
            return 'risk_assessment';
        } else if (agentId.includes('trader')) {
            return 'strategy_execution';
        } else {
            return 'user_feedback';
        }
    }

    /**
     * Generate embedding for text (placeholder - integrate with actual embedding service)
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        // This is a placeholder - in real implementation, you would:
        // 1. Use OpenAI embeddings API
        // 2. Use a local embedding model
        // 3. Use the existing embedding service in the trading system
        
        // For now, return a dummy embedding
        const dummyEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
        
        logger.debug('memory-integration', 'Generated embedding', {
            textLength: text.length,
            embeddingDimensions: dummyEmbedding.length
        });
        
        return dummyEmbedding;
    }
}

/**
 * Example usage function
 */
export async function exampleUsage(): Promise<void> {
    const integration = new TradingAgentMemoryIntegration();

    try {
        // Initialize the system
        await integration.initialize();

        // Example 1: Record a market analyst interaction
        await integration.recordAgentInteraction(
            'session-123',
            'user-456',
            'market-analyst',
            'Analyze AAPL stock for potential investment',
            'AAPL shows strong technical indicators with RSI at 45 and MACD showing bullish crossover. Recommend BUY with target price $180.',
            {
                symbol: 'AAPL',
                currentPrice: 175.50,
                marketCondition: 'bullish',
                analysisType: 'technical'
            },
            {
                confidence: 0.85,
                executionTime: 2500,
                dataSourcesUsed: ['yahoo_finance', 'alpha_vantage']
            }
        );

        // Example 2: Store market insight
        await integration.storeMarketInsight(
            'Technology stocks typically outperform during Q4 due to holiday sales and year-end corporate spending',
            0.9,
            'historical_analysis',
            ['technology', 'seasonal', 'Q4', 'performance'],
            ['AAPL', 'MSFT', 'GOOGL', 'AMZN']
        );

        // Example 3: Set active analysis context
        await integration.setActiveAnalysisContext(
            'session-123',
            'market-analyst',
            {
                currentSymbol: 'AAPL',
                analysisStage: 'technical_analysis',
                indicators: ['RSI', 'MACD', 'Bollinger_Bands'],
                timeframe: '1D'
            },
            1800 // 30 minutes TTL
        );

        // Example 4: Update user preferences
        await integration.updateUserTradingPreferences(
            'user-456',
            {
                riskTolerance: 'moderate',
                tradingStyle: 'swing_trading',
                preferredAssets: ['AAPL', 'MSFT', 'TSLA'],
                notificationSettings: {
                    email: true,
                    sms: false,
                    push: true
                }
            }
        );

        // Example 5: Get relevant context for decision making
        const context = await integration.getRelevantContext(
            'session-123',
            'market-analyst',
            'AAPL technical analysis',
            5
        );

        console.log('Retrieved context:', {
            episodicMemories: context.episodicMemory.length,
            semanticMemories: context.semanticMemory.length,
            workingMemories: context.workingMemory.length
        });

        // Example 6: Perform maintenance
        await integration.performScheduledMaintenance();

        // Shutdown
        await integration.shutdown();

        logger.info('memory-integration', 'Example usage completed successfully');

    } catch (error) {
        logger.error('memory-integration', 'Example usage failed', {
            error: (error as Error).message
        });
        
        // Ensure cleanup
        await integration.shutdown();
        throw error;
    }
}

// TradingAgentMemoryIntegration is already exported above