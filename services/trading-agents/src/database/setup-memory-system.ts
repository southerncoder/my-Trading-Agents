/**
 * Setup Script for PostgreSQL-based Agent Memory System
 * 
 * This script initializes and configures the async PostgreSQL-based agent memory system
 * for use with the trading agents framework.
 */

import { Pool } from 'pg';
import { AgentMemoryManager } from './agent-memory-manager.js';
import { DatabaseManager, getDefaultDatabaseConfig } from './database-manager.js';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'memory-system');

/**
 * Setup and initialize the memory system
 */
export async function setupMemorySystem(): Promise<{
    databaseManager: DatabaseManager;
    memoryManager: AgentMemoryManager;
    pool: Pool;
}> {
    try {
        logger.info('setup-memory-system', 'Starting memory system setup');

        // Get database configuration from environment
        const dbConfig = getDefaultDatabaseConfig();
        
        logger.info('setup-memory-system', 'Database configuration loaded', {
            host: dbConfig.postgresql.host,
            port: dbConfig.postgresql.port,
            database: dbConfig.postgresql.database,
            poolSize: dbConfig.postgresql.poolSize,
            pgvectorEnabled: dbConfig.pgvector.enabled
        });

        // Initialize database manager
        const databaseManager = new DatabaseManager(dbConfig);
        await databaseManager.initializeConnections();

        // Get PostgreSQL pool
        const pool = databaseManager.getPostgreSQLPool();

        // Initialize agent memory manager
        const memoryManager = new AgentMemoryManager();
        await memoryManager.initialize(pool);

        // Verify setup
        const health = await memoryManager.checkConnectionHealth();
        if (!health.connected) {
            throw new Error(`Memory system health check failed: ${health.lastError}`);
        }

        logger.info('setup-memory-system', 'Memory system setup completed successfully', {
            poolStats: health.poolStats,
            pgvectorEnabled: dbConfig.pgvector.enabled
        });

        return {
            databaseManager,
            memoryManager,
            pool
        };

    } catch (error) {
        logger.error('setup-memory-system', 'Memory system setup failed', {
            error: (error as Error).message
        });
        throw error;
    }
}

/**
 * Verify memory system functionality
 */
export async function verifyMemorySystem(memoryManager: AgentMemoryManager): Promise<void> {
    try {
        logger.info('setup-memory-system', 'Starting memory system verification');

        // Test episodic memory
        const testEpisodic = {
            id: `test_episodic_${Date.now()}`,
            sessionId: 'test_session',
            userId: 'test_user',
            agentId: 'test_agent',
            timestamp: new Date(),
            interactionType: 'analysis_request' as const,
            context: { test: true },
            input: 'Test input',
            output: 'Test output',
            metadata: { confidence: 0.9 }
        };

        await memoryManager.storeEpisodicMemory(testEpisodic);
        const retrievedEpisodic = await memoryManager.retrieveEpisodicMemory({
            sessionId: 'test_session',
            limit: 1
        });

        if (retrievedEpisodic.length === 0) {
            throw new Error('Episodic memory test failed - no records retrieved');
        }

        // Test semantic memory
        const testSemantic = {
            id: `test_semantic_${Date.now()}`,
            factType: 'market_knowledge' as const,
            content: 'Test market knowledge',
            embedding: new Array(1536).fill(0.1),
            confidence: 0.9,
            source: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: ['test'],
            relatedEntities: ['TEST']
        };

        await memoryManager.storeSemanticMemory(testSemantic);
        const retrievedSemantic = await memoryManager.retrieveSemanticMemory({
            factType: 'market_knowledge',
            limit: 1
        });

        if (retrievedSemantic.length === 0) {
            throw new Error('Semantic memory test failed - no records retrieved');
        }

        // Test working memory
        const testWorking = {
            id: `test_working_${Date.now()}`,
            sessionId: 'test_session',
            agentId: 'test_agent',
            contextType: 'active_analysis' as const,
            data: { test: true },
            priority: 1,
            expiresAt: new Date(Date.now() + 3600000),
            createdAt: new Date()
        };

        await memoryManager.storeWorkingMemory(testWorking, 3600);
        const retrievedWorking = await memoryManager.retrieveWorkingMemory('test_session');

        if (retrievedWorking.length === 0) {
            throw new Error('Working memory test failed - no records retrieved');
        }

        // Test procedural memory
        const testProcedural = {
            id: `test_procedural_${Date.now()}`,
            userId: 'test_user',
            patternType: 'trading_preference' as const,
            pattern: { test: true },
            frequency: 1,
            confidence: 0.9,
            lastUsed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await memoryManager.storeProceduralMemory(testProcedural);
        const retrievedProcedural = await memoryManager.retrieveProceduralMemory({
            userId: 'test_user',
            limit: 1
        });

        if (retrievedProcedural.length === 0) {
            throw new Error('Procedural memory test failed - no records retrieved');
        }

        // Test vector similarity search
        const testEmbedding = new Array(1536).fill(0.1);
        const similarMemories = await memoryManager.searchSemanticSimilarity(testEmbedding, 0.5, 5);

        // Get memory statistics
        const stats = await memoryManager.getMemoryStatistics();

        logger.info('setup-memory-system', 'Memory system verification completed successfully', {
            episodicMemories: stats.episodicMemory.total,
            semanticMemories: stats.semanticMemory.total,
            workingMemories: stats.workingMemory.total,
            proceduralMemories: stats.proceduralMemory.total,
            similaritySearchResults: similarMemories.length
        });

    } catch (error) {
        logger.error('setup-memory-system', 'Memory system verification failed', {
            error: (error as Error).message
        });
        throw error;
    }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(memoryManager: AgentMemoryManager): Promise<void> {
    try {
        logger.info('setup-memory-system', 'Cleaning up test data');

        // Note: In a real implementation, you might want to add specific cleanup methods
        // For now, we'll rely on the automatic cleanup procedures
        await memoryManager.performAutomaticCleanup();

        logger.info('setup-memory-system', 'Test data cleanup completed');

    } catch (error) {
        logger.error('setup-memory-system', 'Test data cleanup failed', {
            error: (error as Error).message
        });
        // Don't throw - cleanup failure shouldn't break the setup
    }
}

/**
 * Main setup function
 */
export async function main(): Promise<void> {
    let databaseManager: DatabaseManager | null = null;
    let memoryManager: AgentMemoryManager | null = null;

    try {
        // Setup memory system
        const setup = await setupMemorySystem();
        databaseManager = setup.databaseManager;
        memoryManager = setup.memoryManager;

        // Verify functionality
        await verifyMemorySystem(memoryManager);

        // Clean up test data
        await cleanupTestData(memoryManager);

        logger.info('setup-memory-system', 'Memory system setup and verification completed successfully');

    } catch (error) {
        logger.error('setup-memory-system', 'Setup failed', {
            error: (error as Error).message
        });
        throw error;
    } finally {
        // Cleanup connections
        if (memoryManager) {
            await memoryManager.shutdown();
        }
        if (databaseManager) {
            await databaseManager.closeConnections();
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
}