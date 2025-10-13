/**
 * Test suite for AgentMemoryManager
 * 
 * Tests the async PostgreSQL-based agent memory system including
 * episodic, semantic, working, and procedural memory operations.
 */

import { Pool } from 'pg';
import { AgentMemoryManager, EpisodicMemory, SemanticMemory, WorkingMemory, ProceduralMemory } from './agent-memory-manager.js';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('test', 'agent-memory-manager-test');

// Mock pool for testing
const mockPool = {
    connect: jest.fn(),
    end: jest.fn(),
    totalCount: 10,
    idleCount: 5
} as unknown as Pool;

const mockClient = {
    query: jest.fn(),
    release: jest.fn()
};

describe('AgentMemoryManager', () => {
    let memoryManager: AgentMemoryManager;

    beforeEach(() => {
        memoryManager = new AgentMemoryManager();
        jest.clearAllMocks();
        
        // Setup mock client
        (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({ rows: [] });
    });

    describe('Initialization', () => {
        test('should initialize successfully with valid pool', async () => {
            await memoryManager.initialize(mockPool);
            
            expect(memoryManager.initialized).toBe(true);
            expect(mockPool.connect).toHaveBeenCalled();
        });

        test('should throw error when not initialized', async () => {
            const testMemory: EpisodicMemory = {
                id: 'test-1',
                sessionId: 'session-1',
                userId: 'user-1',
                agentId: 'market-analyst',
                timestamp: new Date(),
                interactionType: 'analysis_request',
                context: { symbol: 'AAPL' },
                input: 'Analyze AAPL',
                output: 'AAPL analysis complete',
                metadata: { confidence: 0.9 }
            };

            await expect(memoryManager.storeEpisodicMemory(testMemory))
                .rejects.toThrow('AgentMemoryManager not initialized');
        });
    });

    describe('Episodic Memory', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should store episodic memory successfully', async () => {
            const memory: EpisodicMemory = {
                id: 'episodic-1',
                sessionId: 'session-1',
                userId: 'user-1',
                agentId: 'market-analyst',
                timestamp: new Date(),
                interactionType: 'analysis_request',
                context: { symbol: 'AAPL', marketCondition: 'bullish' },
                input: 'Analyze AAPL stock',
                output: 'AAPL shows strong bullish signals',
                metadata: { confidence: 0.85, executionTime: 1500 }
            };

            await memoryManager.storeEpisodicMemory(memory);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO episodic_memory'),
                expect.arrayContaining([
                    memory.id,
                    memory.sessionId,
                    memory.userId,
                    memory.agentId,
                    memory.timestamp,
                    memory.interactionType,
                    JSON.stringify(memory.context),
                    memory.input,
                    memory.output,
                    JSON.stringify(memory.metadata)
                ])
            );
        });

        test('should retrieve episodic memory with filters', async () => {
            const mockResults = [{
                id: 'episodic-1',
                session_id: 'session-1',
                user_id: 'user-1',
                agent_id: 'market-analyst',
                timestamp: new Date(),
                interaction_type: 'analysis_request',
                context: { symbol: 'AAPL' },
                input: 'Analyze AAPL',
                output: 'Analysis complete',
                metadata: { confidence: 0.9 }
            }];

            mockClient.query.mockResolvedValueOnce({ rows: mockResults });

            const results = await memoryManager.retrieveEpisodicMemory({
                sessionId: 'session-1',
                agentId: 'market-analyst',
                limit: 10
            });

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('episodic-1');
            expect(results[0].agentId).toBe('market-analyst');
        });

        test('should batch store episodic memories', async () => {
            const memories: EpisodicMemory[] = [
                {
                    id: 'batch-1',
                    sessionId: 'session-1',
                    userId: 'user-1',
                    agentId: 'market-analyst',
                    timestamp: new Date(),
                    interactionType: 'analysis_request',
                    context: { symbol: 'AAPL' },
                    input: 'Analyze AAPL',
                    output: 'Analysis 1',
                    metadata: {}
                },
                {
                    id: 'batch-2',
                    sessionId: 'session-1',
                    userId: 'user-1',
                    agentId: 'risk-analyst',
                    timestamp: new Date(),
                    interactionType: 'risk_assessment',
                    context: { symbol: 'AAPL' },
                    input: 'Assess risk for AAPL',
                    output: 'Risk assessment complete',
                    metadata: {}
                }
            ];

            // Mock transaction
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // First insert
                .mockResolvedValueOnce({ rows: [] }) // Second insert
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await memoryManager.batchStoreEpisodicMemory(memories);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.query).toHaveBeenCalledTimes(4);
        });
    });

    describe('Semantic Memory', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should store semantic memory with vector embedding', async () => {
            const memory: SemanticMemory = {
                id: 'semantic-1',
                factType: 'market_knowledge',
                content: 'AAPL typically performs well in Q4',
                embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
                confidence: 0.8,
                source: 'historical_analysis',
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: ['AAPL', 'seasonal', 'Q4'],
                relatedEntities: ['AAPL', 'technology_sector']
            };

            await memoryManager.storeSemanticMemory(memory);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO semantic_memory'),
                expect.arrayContaining([
                    memory.id,
                    memory.factType,
                    memory.content,
                    '[0.1,0.2,0.3,0.4,0.5]', // Vector format
                    memory.confidence,
                    memory.source,
                    memory.tags,
                    memory.relatedEntities,
                    memory.createdAt,
                    memory.updatedAt
                ])
            );
        });

        test('should search semantic memory by similarity', async () => {
            const mockResults = [{
                id: 'semantic-1',
                fact_type: 'market_knowledge',
                content: 'AAPL performs well in Q4',
                embedding: '[0.1,0.2,0.3,0.4,0.5]',
                confidence: 0.8,
                source: 'analysis',
                tags: ['AAPL'],
                related_entities: ['AAPL'],
                created_at: new Date(),
                updated_at: new Date(),
                similarity: 0.95
            }];

            mockClient.query.mockResolvedValueOnce({ rows: mockResults });

            const queryEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
            const results = await memoryManager.searchSemanticSimilarity(queryEmbedding, 0.8, 5);

            expect(results).toHaveLength(1);
            expect(results[0].content).toBe('AAPL performs well in Q4');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('embedding <=> $1::vector'),
                expect.arrayContaining(['[0.1,0.2,0.3,0.4,0.5]', 0.8, 5])
            );
        });

        test('should batch update embeddings', async () => {
            const updates = [
                { id: 'semantic-1', embedding: [0.1, 0.2, 0.3] },
                { id: 'semantic-2', embedding: [0.4, 0.5, 0.6] }
            ];

            // Mock transaction
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // First update
                .mockResolvedValueOnce({ rows: [] }) // Second update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await memoryManager.batchUpdateEmbeddings(updates);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });

    describe('Working Memory', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should store working memory with TTL', async () => {
            const memory: WorkingMemory = {
                id: 'working-1',
                sessionId: 'session-1',
                agentId: 'market-analyst',
                contextType: 'active_analysis',
                data: { symbol: 'AAPL', analysis_stage: 'technical' },
                priority: 1,
                expiresAt: new Date(Date.now() + 3600000), // 1 hour
                createdAt: new Date()
            };

            const ttl = 3600; // 1 hour in seconds

            await memoryManager.storeWorkingMemory(memory, ttl);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO working_memory'),
                expect.arrayContaining([
                    memory.id,
                    memory.sessionId,
                    memory.agentId,
                    memory.contextType,
                    JSON.stringify(memory.data),
                    memory.priority,
                    expect.any(Date), // expiresAt calculated from TTL
                    memory.createdAt
                ])
            );
        });

        test('should retrieve active working memory', async () => {
            const mockResults = [{
                id: 'working-1',
                session_id: 'session-1',
                agent_id: 'market-analyst',
                context_type: 'active_analysis',
                data: { symbol: 'AAPL' },
                priority: 1,
                expires_at: new Date(Date.now() + 3600000),
                created_at: new Date()
            }];

            mockClient.query.mockResolvedValueOnce({ rows: mockResults });

            const results = await memoryManager.retrieveWorkingMemory('session-1');

            expect(results).toHaveLength(1);
            expect(results[0].sessionId).toBe('session-1');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('expires_at > NOW()'),
                ['session-1']
            );
        });

        test('should cleanup expired memory', async () => {
            mockClient.query.mockResolvedValueOnce({ rows: [1, 2, 3] }); // Mock 3 deleted rows

            const deletedCount = await memoryManager.cleanupExpiredMemory();

            expect(deletedCount).toBe(3);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM working_memory WHERE expires_at <= NOW()')
            );
        });
    });

    describe('Procedural Memory', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should store procedural memory', async () => {
            const memory: ProceduralMemory = {
                id: 'procedural-1',
                userId: 'user-1',
                patternType: 'trading_preference',
                pattern: { riskTolerance: 'moderate', preferredSectors: ['technology'] },
                frequency: 5,
                confidence: 0.9,
                lastUsed: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await memoryManager.storeProceduralMemory(memory);

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO procedural_memory'),
                expect.arrayContaining([
                    memory.id,
                    memory.userId,
                    memory.patternType,
                    JSON.stringify(memory.pattern),
                    memory.frequency,
                    memory.confidence,
                    memory.lastUsed,
                    memory.createdAt,
                    memory.updatedAt
                ])
            );
        });

        test('should increment pattern frequency', async () => {
            await memoryManager.incrementPatternFrequency('pattern-1');

            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE procedural_memory SET frequency = frequency + 1'),
                ['pattern-1']
            );
        });
    });

    describe('Health Monitoring', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should check connection health successfully', async () => {
            mockClient.query.mockResolvedValueOnce({ rows: [{ result: 1 }] });

            const health = await memoryManager.checkConnectionHealth();

            expect(health.connected).toBe(true);
            expect(health.poolStats.totalConnections).toBe(10);
            expect(health.poolStats.idleConnections).toBe(5);
            expect(health.poolStats.activeConnections).toBe(5);
        });

        test('should handle connection health check failure', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Connection failed'));

            const health = await memoryManager.checkConnectionHealth();

            expect(health.connected).toBe(false);
            expect(health.lastError).toBe('Connection failed');
        });
    });

    describe('Automatic Cleanup', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should perform automatic cleanup', async () => {
            // Mock cleanup results
            mockClient.query
                .mockResolvedValueOnce({ rows: [1, 2, 3] }) // Expired working memory
                .mockResolvedValueOnce({ rows: [1, 2] }) // Old episodic memory
                .mockResolvedValueOnce({ rows: [1] }); // Low confidence semantic memory

            const results = await memoryManager.performAutomaticCleanup();

            expect(results.expiredWorkingMemory).toBe(3);
            expect(results.oldEpisodicMemory).toBe(2);
            expect(results.lowConfidenceSemanticMemory).toBe(1);
        });
    });

    describe('Memory Statistics', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should get comprehensive memory statistics', async () => {
            // Mock statistics queries
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ agent_id: 'market-analyst', count: '5' }] }) // Episodic by agent
                .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // Episodic total
                .mockResolvedValueOnce({ rows: [{ fact_type: 'market_knowledge', count: '3' }] }) // Semantic by type
                .mockResolvedValueOnce({ rows: [{ total: '8' }] }) // Semantic total
                .mockResolvedValueOnce({ rows: [{ total: '15', active: '10', expired: '5' }] }) // Working stats
                .mockResolvedValueOnce({ rows: [{ pattern_type: 'trading_preference', count: '2' }] }) // Procedural by type
                .mockResolvedValueOnce({ rows: [{ total: '6' }] }); // Procedural total

            const stats = await memoryManager.getMemoryStatistics();

            expect(stats.episodicMemory.total).toBe(10);
            expect(stats.episodicMemory.byAgent['market-analyst']).toBe(5);
            expect(stats.semanticMemory.total).toBe(8);
            expect(stats.workingMemory.active).toBe(10);
            expect(stats.proceduralMemory.total).toBe(6);
        });
    });

    describe('Batch Operations', () => {
        beforeEach(async () => {
            await memoryManager.initialize(mockPool);
        });

        test('should execute batch operations successfully', async () => {
            const operations = [
                {
                    type: 'insert' as const,
                    table: 'episodic_memory' as const,
                    data: {
                        id: 'batch-1',
                        sessionId: 'session-1',
                        userId: 'user-1',
                        agentId: 'market-analyst',
                        timestamp: new Date(),
                        interactionType: 'analysis_request',
                        context: {},
                        input: 'test',
                        output: 'test',
                        metadata: {}
                    }
                }
            ];

            // Mock transaction
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Insert
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const result = await memoryManager.executeBatchOperations(operations);

            expect(result.successful).toBe(1);
            expect(result.failed).toBe(0);
            expect(result.errors).toHaveLength(0);
        });
    });
});