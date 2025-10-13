/**
 * Async PostgreSQL-based Agent Memory System
 * 
 * Provides comprehensive memory management for trading agents including
 * episodic, semantic, working, and procedural memory with full async support.
 */

import { Pool, PoolClient } from 'pg';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'agent-memory-manager');

export interface EpisodicMemory {
    id: string;
    sessionId: string;
    userId: string;
    agentId: string;
    timestamp: Date;
    interactionType: 'analysis_request' | 'strategy_execution' | 'risk_assessment' | 'user_feedback';
    context: Record<string, any>; // JSONB for flexible schema
    input: string;
    output: string;
    metadata: {
        marketConditions?: MarketCondition;
        performanceMetrics?: PerformanceMetrics;
        confidence?: number;
        executionTime?: number;
    };
}

export interface SemanticMemory {
    id: string;
    factType: 'market_knowledge' | 'strategy_rule' | 'risk_principle' | 'user_insight';
    content: string;
    embedding: number[]; // Vector embedding for similarity search
    confidence: number;
    source: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    relatedEntities: string[]; // Stock symbols, strategy names, etc.
}

export interface WorkingMemory {
    id: string;
    sessionId: string;
    agentId: string;
    contextType: 'active_analysis' | 'pending_decision' | 'recent_interaction';
    data: Record<string, any>; // JSONB for flexible context
    priority: number;
    expiresAt: Date;
    createdAt: Date;
}

export interface ProceduralMemory {
    id: string;
    userId: string;
    patternType: 'trading_preference' | 'risk_tolerance' | 'analysis_style' | 'notification_preference';
    pattern: Record<string, any>; // JSONB for flexible rules
    frequency: number; // How often this pattern has been observed
    confidence: number;
    lastUsed: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface MarketCondition {
    volatility: 'low' | 'medium' | 'high';
    trend: 'bullish' | 'bearish' | 'sideways';
    volume: 'low' | 'normal' | 'high';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PerformanceMetrics {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    volatility: number;
}

export interface UserPreferences {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    tradingStyle: 'day_trading' | 'swing_trading' | 'position_trading';
    preferredAssets: string[];
    notificationSettings: Record<string, boolean>;
    analysisDepth: 'quick' | 'standard' | 'comprehensive';
}

export interface EpisodicQuery {
    sessionId?: string;
    userId?: string;
    agentId?: string;
    interactionType?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
}

export interface SemanticQuery {
    factType?: string;
    content?: string;
    tags?: string[];
    relatedEntities?: string[];
    minConfidence?: number;
    limit?: number;
    offset?: number;
}

export interface ProceduralQuery {
    userId?: string;
    patternType?: string;
    minFrequency?: number;
    minConfidence?: number;
    limit?: number;
    offset?: number;
}

export interface BatchMemoryOperation {
    type: 'insert' | 'update' | 'delete';
    table: 'episodic_memory' | 'semantic_memory' | 'working_memory' | 'procedural_memory';
    data: any;
}

export interface BatchResult {
    successful: number;
    failed: number;
    errors: string[];
}

export interface SemanticEmbeddingUpdate {
    id: string;
    embedding: number[];
}

/**
 * Comprehensive Agent Memory Manager with full async PostgreSQL support
 */
export class AgentMemoryManager {
    private pool: Pool | null = null;
    private isInitialized = false;

    /**
     * Initialize with PostgreSQL connection pool
     */
    async initialize(pool: Pool): Promise<void> {
        try {
            this.pool = pool;
            await this.initializeSchema();
            this.isInitialized = true;

            logger.info('agent-memory-manager', 'Agent memory system initialized successfully');

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to initialize agent memory system', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    // ==================== EPISODIC MEMORY ====================

    /**
     * Store episodic memory (conversation history and interactions)
     */
    async storeEpisodicMemory(memory: EpisodicMemory): Promise<void> {
        this.ensureInitialized();

        try {
            const query = `
        INSERT INTO episodic_memory (
          id, session_id, user_id, agent_id, timestamp, interaction_type,
          context, input, output, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

            const params = [
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
            ];

            await this.executeQuery(query, params);

            logger.debug('agent-memory-manager', 'Episodic memory stored', {
                id: memory.id,
                agentId: memory.agentId,
                interactionType: memory.interactionType
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to store episodic memory', {
                error: (error as Error).message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    /**
     * Retrieve episodic memory with query filters
     */
    async retrieveEpisodicMemory(query: EpisodicQuery): Promise<EpisodicMemory[]> {
        this.ensureInitialized();

        try {
            let sql = `
        SELECT id, session_id, user_id, agent_id, timestamp, interaction_type,
               context, input, output, metadata, created_at
        FROM episodic_memory
        WHERE 1=1
      `;
            const params: any[] = [];
            let paramIndex = 1;

            if (query.sessionId) {
                sql += ` AND session_id = $${paramIndex}`;
                params.push(query.sessionId);
                paramIndex++;
            }

            if (query.userId) {
                sql += ` AND user_id = $${paramIndex}`;
                params.push(query.userId);
                paramIndex++;
            }

            if (query.agentId) {
                sql += ` AND agent_id = $${paramIndex}`;
                params.push(query.agentId);
                paramIndex++;
            }

            if (query.interactionType) {
                sql += ` AND interaction_type = $${paramIndex}`;
                params.push(query.interactionType);
                paramIndex++;
            }

            if (query.startTime) {
                sql += ` AND timestamp >= $${paramIndex}`;
                params.push(query.startTime);
                paramIndex++;
            }

            if (query.endTime) {
                sql += ` AND timestamp <= $${paramIndex}`;
                params.push(query.endTime);
                paramIndex++;
            }

            sql += ` ORDER BY timestamp DESC`;

            if (query.limit) {
                sql += ` LIMIT $${paramIndex}`;
                params.push(query.limit);
                paramIndex++;
            }

            if (query.offset) {
                sql += ` OFFSET $${paramIndex}`;
                params.push(query.offset);
            }

            const results = await this.executeQuery<any>(sql, params);

            return results.map(row => ({
                id: row.id,
                sessionId: row.session_id,
                userId: row.user_id,
                agentId: row.agent_id,
                timestamp: row.timestamp,
                interactionType: row.interaction_type,
                context: row.context,
                input: row.input,
                output: row.output,
                metadata: row.metadata
            }));

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to retrieve episodic memory', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Batch store episodic memories for high-performance inserts
     */
    async batchStoreEpisodicMemory(memories: EpisodicMemory[]): Promise<void> {
        this.ensureInitialized();

        if (memories.length === 0) return;

        try {
            const client = await this.pool!.connect();

            try {
                await client.query('BEGIN');

                const query = `
          INSERT INTO episodic_memory (
            id, session_id, user_id, agent_id, timestamp, interaction_type,
            context, input, output, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

                for (const memory of memories) {
                    const params = [
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
                    ];

                    await client.query(query, params);
                }

                await client.query('COMMIT');

                logger.info('agent-memory-manager', 'Batch episodic memory stored', {
                    count: memories.length
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to batch store episodic memory', {
                error: (error as Error).message,
                count: memories.length
            });
            throw error;
        }
    }

    // ==================== SEMANTIC MEMORY ====================

    /**
     * Store semantic memory (long-term facts and knowledge)
     */
    async storeSemanticMemory(memory: SemanticMemory): Promise<void> {
        this.ensureInitialized();

        try {
            const query = `
        INSERT INTO semantic_memory (
          id, fact_type, content, embedding, confidence, source,
          tags, related_entities, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          confidence = EXCLUDED.confidence,
          tags = EXCLUDED.tags,
          related_entities = EXCLUDED.related_entities,
          updated_at = EXCLUDED.updated_at
      `;

            const params = [
                memory.id,
                memory.factType,
                memory.content,
                `[${memory.embedding.join(',')}]`, // Store as pgvector format
                memory.confidence,
                memory.source,
                memory.tags,
                memory.relatedEntities,
                memory.createdAt,
                memory.updatedAt
            ];

            await this.executeQuery(query, params);

            logger.debug('agent-memory-manager', 'Semantic memory stored', {
                id: memory.id,
                factType: memory.factType,
                confidence: memory.confidence
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to store semantic memory', {
                error: (error as Error).message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    /**
     * Retrieve semantic memory with query filters
     */
    async retrieveSemanticMemory(query: SemanticQuery): Promise<SemanticMemory[]> {
        this.ensureInitialized();

        try {
            let sql = `
        SELECT id, fact_type, content, embedding, confidence, source,
               tags, related_entities, created_at, updated_at
        FROM semantic_memory
        WHERE 1=1
      `;
            const params: any[] = [];
            let paramIndex = 1;

            if (query.factType) {
                sql += ` AND fact_type = $${paramIndex}`;
                params.push(query.factType);
                paramIndex++;
            }

            if (query.content) {
                sql += ` AND content ILIKE $${paramIndex}`;
                params.push(`%${query.content}%`);
                paramIndex++;
            }

            if (query.tags && query.tags.length > 0) {
                sql += ` AND tags && $${paramIndex}`;
                params.push(query.tags);
                paramIndex++;
            }

            if (query.relatedEntities && query.relatedEntities.length > 0) {
                sql += ` AND related_entities && $${paramIndex}`;
                params.push(query.relatedEntities);
                paramIndex++;
            }

            if (query.minConfidence) {
                sql += ` AND confidence >= $${paramIndex}`;
                params.push(query.minConfidence);
                paramIndex++;
            }

            sql += ` ORDER BY confidence DESC, updated_at DESC`;

            if (query.limit) {
                sql += ` LIMIT $${paramIndex}`;
                params.push(query.limit);
                paramIndex++;
            }

            if (query.offset) {
                sql += ` OFFSET $${paramIndex}`;
                params.push(query.offset);
            }

            const results = await this.executeQuery<any>(sql, params);

            return results.map(row => ({
                id: row.id,
                factType: row.fact_type,
                content: row.content,
                embedding: row.embedding ? this.parseVectorEmbedding(row.embedding) : [],
                confidence: row.confidence,
                source: row.source,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                tags: row.tags,
                relatedEntities: row.related_entities
            }));

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to retrieve semantic memory', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Search semantic memory by similarity using pgvector
     */
    async searchSemanticSimilarity(embedding: number[], threshold: number, limit: number = 10): Promise<SemanticMemory[]> {
        this.ensureInitialized();

        try {
            const embeddingVector = `[${embedding.join(',')}]`;
            
            const query = `
        SELECT id, fact_type, content, embedding, confidence, source,
               tags, related_entities, created_at, updated_at,
               1 - (embedding <=> $1::vector) as similarity
        FROM semantic_memory
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;

            const results = await this.executeQuery<any>(query, [embeddingVector, threshold, limit]);

            logger.debug('agent-memory-manager', 'Semantic similarity search completed', {
                resultCount: results.length,
                threshold,
                limit
            });

            return results.map(row => ({
                id: row.id,
                factType: row.fact_type,
                content: row.content,
                embedding: this.parseVectorEmbedding(row.embedding),
                confidence: row.confidence,
                source: row.source,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                tags: row.tags,
                relatedEntities: row.related_entities
            }));

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to search semantic similarity', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Batch update embeddings for semantic memories
     */
    async batchUpdateEmbeddings(updates: SemanticEmbeddingUpdate[]): Promise<void> {
        this.ensureInitialized();

        if (updates.length === 0) return;

        try {
            const client = await this.pool!.connect();

            try {
                await client.query('BEGIN');

                const query = `
          UPDATE semantic_memory 
          SET embedding = $2, updated_at = NOW()
          WHERE id = $1
        `;

                for (const update of updates) {
                    const embeddingVector = `[${update.embedding.join(',')}]`;
                    await client.query(query, [update.id, embeddingVector]);
                }

                await client.query('COMMIT');

                logger.info('agent-memory-manager', 'Batch embedding updates completed', {
                    count: updates.length
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to batch update embeddings', {
                error: (error as Error).message,
                count: updates.length
            });
            throw error;
        }
    }

    // ==================== WORKING MEMORY ====================

    /**
     * Store working memory with TTL expiration
     */
    async storeWorkingMemory(memory: WorkingMemory, ttl: number): Promise<void> {
        this.ensureInitialized();

        try {
            const expiresAt = new Date(Date.now() + ttl * 1000); // TTL in seconds

            const query = `
        INSERT INTO working_memory (
          id, session_id, agent_id, context_type, data, priority, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          priority = EXCLUDED.priority,
          expires_at = EXCLUDED.expires_at
      `;

            const params = [
                memory.id,
                memory.sessionId,
                memory.agentId,
                memory.contextType,
                JSON.stringify(memory.data),
                memory.priority,
                expiresAt,
                memory.createdAt
            ];

            await this.executeQuery(query, params);

            logger.debug('agent-memory-manager', 'Working memory stored', {
                id: memory.id,
                sessionId: memory.sessionId,
                ttl,
                expiresAt
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to store working memory', {
                error: (error as Error).message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    /**
     * Retrieve working memory for a session
     */
    async retrieveWorkingMemory(sessionId: string): Promise<WorkingMemory[]> {
        this.ensureInitialized();

        try {
            const query = `
        SELECT id, session_id, agent_id, context_type, data, priority, expires_at, created_at
        FROM working_memory
        WHERE session_id = $1 AND expires_at > NOW()
        ORDER BY priority DESC, created_at DESC
      `;

            const results = await this.executeQuery<any>(query, [sessionId]);

            return results.map(row => ({
                id: row.id,
                sessionId: row.session_id,
                agentId: row.agent_id,
                contextType: row.context_type,
                data: row.data,
                priority: row.priority,
                expiresAt: row.expires_at,
                createdAt: row.created_at
            }));

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to retrieve working memory', {
                error: (error as Error).message,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Expire working memory for a session
     */
    async expireWorkingMemory(sessionId: string): Promise<void> {
        this.ensureInitialized();

        try {
            const query = `
        UPDATE working_memory 
        SET expires_at = NOW() 
        WHERE session_id = $1
      `;

            await this.executeQuery(query, [sessionId]);

            logger.debug('agent-memory-manager', 'Working memory expired', {
                sessionId
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to expire working memory', {
                error: (error as Error).message,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Clean up expired working memory
     */
    async cleanupExpiredMemory(): Promise<number> {
        this.ensureInitialized();

        try {
            const query = `
        DELETE FROM working_memory 
        WHERE expires_at <= NOW()
      `;

            const result = await this.executeQuery(query);
            const deletedCount = result.length;

            logger.info('agent-memory-manager', 'Expired working memory cleaned up', {
                deletedCount
            });

            return deletedCount;

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to cleanup expired memory', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    // ==================== PROCEDURAL MEMORY ====================

    /**
     * Store procedural memory (learned patterns and preferences)
     */
    async storeProceduralMemory(memory: ProceduralMemory): Promise<void> {
        this.ensureInitialized();

        try {
            const query = `
        INSERT INTO procedural_memory (
          id, user_id, pattern_type, pattern, frequency, confidence,
          last_used, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          pattern = EXCLUDED.pattern,
          frequency = EXCLUDED.frequency,
          confidence = EXCLUDED.confidence,
          last_used = EXCLUDED.last_used,
          updated_at = EXCLUDED.updated_at
      `;

            const params = [
                memory.id,
                memory.userId,
                memory.patternType,
                JSON.stringify(memory.pattern),
                memory.frequency,
                memory.confidence,
                memory.lastUsed,
                memory.createdAt,
                memory.updatedAt
            ];

            await this.executeQuery(query, params);

            logger.debug('agent-memory-manager', 'Procedural memory stored', {
                id: memory.id,
                userId: memory.userId,
                patternType: memory.patternType
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to store procedural memory', {
                error: (error as Error).message,
                memoryId: memory.id
            });
            throw error;
        }
    }

    /**
     * Retrieve procedural memory with query filters
     */
    async retrieveProceduralMemory(query: ProceduralQuery): Promise<ProceduralMemory[]> {
        this.ensureInitialized();

        try {
            let sql = `
        SELECT id, user_id, pattern_type, pattern, frequency, confidence,
               last_used, created_at, updated_at
        FROM procedural_memory
        WHERE 1=1
      `;
            const params: any[] = [];
            let paramIndex = 1;

            if (query.userId) {
                sql += ` AND user_id = $${paramIndex}`;
                params.push(query.userId);
                paramIndex++;
            }

            if (query.patternType) {
                sql += ` AND pattern_type = $${paramIndex}`;
                params.push(query.patternType);
                paramIndex++;
            }

            if (query.minFrequency) {
                sql += ` AND frequency >= $${paramIndex}`;
                params.push(query.minFrequency);
                paramIndex++;
            }

            if (query.minConfidence) {
                sql += ` AND confidence >= $${paramIndex}`;
                params.push(query.minConfidence);
                paramIndex++;
            }

            sql += ` ORDER BY frequency DESC, confidence DESC, last_used DESC`;

            if (query.limit) {
                sql += ` LIMIT $${paramIndex}`;
                params.push(query.limit);
                paramIndex++;
            }

            if (query.offset) {
                sql += ` OFFSET $${paramIndex}`;
                params.push(query.offset);
            }

            const results = await this.executeQuery<any>(sql, params);

            return results.map(row => ({
                id: row.id,
                userId: row.user_id,
                patternType: row.pattern_type,
                pattern: row.pattern,
                frequency: row.frequency,
                confidence: row.confidence,
                lastUsed: row.last_used,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to retrieve procedural memory', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Update user preferences
     */
    async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
        this.ensureInitialized();

        try {
            const memory: ProceduralMemory = {
                id: `user_preferences_${userId}`,
                userId,
                patternType: 'trading_preference',
                pattern: preferences,
                frequency: 1,
                confidence: 1.0,
                lastUsed: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.storeProceduralMemory(memory);

            logger.info('agent-memory-manager', 'User preferences updated', {
                userId
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to update user preferences', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Increment pattern frequency
     */
    async incrementPatternFrequency(patternId: string): Promise<void> {
        this.ensureInitialized();

        try {
            const query = `
        UPDATE procedural_memory 
        SET frequency = frequency + 1, last_used = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

            await this.executeQuery(query, [patternId]);

            logger.debug('agent-memory-manager', 'Pattern frequency incremented', {
                patternId
            });

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to increment pattern frequency', {
                error: (error as Error).message,
                patternId
            });
            throw error;
        }
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Execute batch memory operations with transaction support
     */
    async executeBatchOperations(operations: BatchMemoryOperation[]): Promise<BatchResult> {
        this.ensureInitialized();

        const result: BatchResult = {
            successful: 0,
            failed: 0,
            errors: []
        };

        if (operations.length === 0) return result;

        const client = await this.pool!.connect();

        try {
            await client.query('BEGIN');

            for (const operation of operations) {
                try {
                    await this.executeBatchOperation(client, operation);
                    result.successful++;
                } catch (error) {
                    result.failed++;
                    result.errors.push(`${operation.type} on ${operation.table}: ${(error as Error).message}`);
                    logger.error('agent-memory-manager', 'Batch operation failed', {
                        operation: operation.type,
                        table: operation.table,
                        error: (error as Error).message
                    });
                }
            }

            await client.query('COMMIT');

            logger.info('agent-memory-manager', 'Batch operations completed', {
                total: operations.length,
                successful: result.successful,
                failed: result.failed
            });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('agent-memory-manager', 'Batch operations transaction failed', {
                error: (error as Error).message
            });
            throw error;
        } finally {
            client.release();
        }

        return result;
    }

    /**
     * Execute individual batch operation
     */
    private async executeBatchOperation(client: PoolClient, operation: BatchMemoryOperation): Promise<void> {
        switch (operation.table) {
            case 'episodic_memory':
                if (operation.type === 'insert') {
                    await this.batchInsertEpisodic(client, operation.data);
                }
                break;
            case 'semantic_memory':
                if (operation.type === 'insert') {
                    await this.batchInsertSemantic(client, operation.data);
                }
                break;
            case 'working_memory':
                if (operation.type === 'insert') {
                    await this.batchInsertWorking(client, operation.data);
                }
                break;
            case 'procedural_memory':
                if (operation.type === 'insert') {
                    await this.batchInsertProcedural(client, operation.data);
                }
                break;
            default:
                throw new Error(`Unsupported batch operation: ${operation.type} on ${operation.table}`);
        }
    }

    /**
     * Batch insert episodic memory
     */
    private async batchInsertEpisodic(client: PoolClient, data: EpisodicMemory): Promise<void> {
        const query = `
      INSERT INTO episodic_memory (
        id, session_id, user_id, agent_id, timestamp, interaction_type,
        context, input, output, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

        const params = [
            data.id,
            data.sessionId,
            data.userId,
            data.agentId,
            data.timestamp,
            data.interactionType,
            JSON.stringify(data.context),
            data.input,
            data.output,
            JSON.stringify(data.metadata)
        ];

        await client.query(query, params);
    }

    /**
     * Batch insert semantic memory
     */
    private async batchInsertSemantic(client: PoolClient, data: SemanticMemory): Promise<void> {
        const query = `
      INSERT INTO semantic_memory (
        id, fact_type, content, embedding, confidence, source,
        tags, related_entities, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

        const params = [
            data.id,
            data.factType,
            data.content,
            `[${data.embedding.join(',')}]`,
            data.confidence,
            data.source,
            data.tags,
            data.relatedEntities,
            data.createdAt,
            data.updatedAt
        ];

        await client.query(query, params);
    }

    /**
     * Batch insert working memory
     */
    private async batchInsertWorking(client: PoolClient, data: WorkingMemory): Promise<void> {
        const query = `
      INSERT INTO working_memory (
        id, session_id, agent_id, context_type, data, priority, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

        const params = [
            data.id,
            data.sessionId,
            data.agentId,
            data.contextType,
            JSON.stringify(data.data),
            data.priority,
            data.expiresAt,
            data.createdAt
        ];

        await client.query(query, params);
    }

    /**
     * Batch insert procedural memory
     */
    private async batchInsertProcedural(client: PoolClient, data: ProceduralMemory): Promise<void> {
        const query = `
      INSERT INTO procedural_memory (
        id, user_id, pattern_type, pattern, frequency, confidence,
        last_used, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

        const params = [
            data.id,
            data.userId,
            data.patternType,
            JSON.stringify(data.pattern),
            data.frequency,
            data.confidence,
            data.lastUsed,
            data.createdAt,
            data.updatedAt
        ];

        await client.query(query, params);
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Execute query with error handling
     */
    private async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
        if (!this.pool) {
            throw new Error('Database pool not initialized');
        }

        const client = await this.pool.connect();
        try {
            const result = await client.query(query, params);
            return result.rows as T[];
        } finally {
            client.release();
        }
    }

    /**
     * Initialize database schema for agent memory
     */
    private async initializeSchema(): Promise<void> {
        if (!this.pool) return;

        try {
            logger.info('agent-memory-manager', 'Initializing agent memory schema');

            // Enable pgvector extension
            await this.executeQuery('CREATE EXTENSION IF NOT EXISTS vector');

            // Episodic Memory table
            await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS episodic_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          agent_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          interaction_type VARCHAR(50) NOT NULL,
          context JSONB NOT NULL,
          input TEXT NOT NULL,
          output TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

            // Semantic Memory table with pgvector support
            await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS semantic_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fact_type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          embedding vector(1536), -- OpenAI embedding dimensions
          confidence DECIMAL(3,2) NOT NULL,
          source VARCHAR(255) NOT NULL,
          tags TEXT[] DEFAULT '{}',
          related_entities TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

            // Working Memory table
            await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS working_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(255) NOT NULL,
          agent_id VARCHAR(255) NOT NULL,
          context_type VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

            // Procedural Memory table
            await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS procedural_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          pattern_type VARCHAR(50) NOT NULL,
          pattern JSONB NOT NULL,
          frequency INTEGER NOT NULL DEFAULT 1,
          confidence DECIMAL(3,2) NOT NULL,
          last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

            // Create indexes for performance
            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_episodic_session_timestamp 
        ON episodic_memory(session_id, timestamp DESC)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_episodic_user_agent 
        ON episodic_memory(user_id, agent_id)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_episodic_interaction_type 
        ON episodic_memory(interaction_type)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_episodic_context_gin 
        ON episodic_memory USING GIN(context)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_semantic_fact_type 
        ON semantic_memory(fact_type)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_semantic_tags_gin 
        ON semantic_memory USING GIN(tags)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_semantic_entities_gin 
        ON semantic_memory USING GIN(related_entities)
      `);

            // Vector similarity index for embedding search
            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_semantic_embedding 
        ON semantic_memory USING ivfflat (embedding vector_cosine_ops)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_working_session_expires 
        ON working_memory(session_id, expires_at)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_working_expires 
        ON working_memory(expires_at)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_procedural_user_type 
        ON procedural_memory(user_id, pattern_type)
      `);

            await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_procedural_frequency 
        ON procedural_memory(frequency DESC)
      `);

            logger.info('agent-memory-manager', 'Agent memory schema initialized successfully');

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to initialize agent memory schema', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Ensure the manager is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.pool) {
            throw new Error('AgentMemoryManager not initialized. Call initialize() first.');
        }
    }

    /**
     * Parse vector embedding from PostgreSQL vector format
     */
    private parseVectorEmbedding(vectorString: string): number[] {
        if (!vectorString) return [];
        
        try {
            // Remove brackets and split by comma
            const cleanString = vectorString.replace(/[\[\]]/g, '');
            return cleanString.split(',').map(n => parseFloat(n.trim()));
        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to parse vector embedding', {
                error: (error as Error).message,
                vectorString: vectorString.substring(0, 100)
            });
            return [];
        }
    }

    /**
     * Check connection health and pool statistics
     */
    async checkConnectionHealth(): Promise<{
        connected: boolean;
        poolStats: {
            totalConnections: number;
            idleConnections: number;
            activeConnections: number;
        };
        lastError?: string;
    }> {
        const health: {
            connected: boolean;
            poolStats: {
                totalConnections: number;
                idleConnections: number;
                activeConnections: number;
            };
            lastError?: string;
        } = {
            connected: false,
            poolStats: {
                totalConnections: 0,
                idleConnections: 0,
                activeConnections: 0
            }
        };

        try {
            if (!this.pool) {
                throw new Error('Pool not initialized');
            }

            // Test connection with simple query
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();

            health.connected = true;
            health.poolStats = {
                totalConnections: this.pool.totalCount,
                idleConnections: this.pool.idleCount,
                activeConnections: this.pool.totalCount - this.pool.idleCount
            };

            logger.debug('agent-memory-manager', 'Connection health check passed', health.poolStats);

        } catch (error) {
            health.lastError = (error as Error).message;
            logger.error('agent-memory-manager', 'Connection health check failed', {
                error: (error as Error).message
            });
        }

        return health;
    }

    /**
     * Automatic cleanup procedures for expired and old data
     */
    async performAutomaticCleanup(): Promise<{
        expiredWorkingMemory: number;
        oldEpisodicMemory: number;
        lowConfidenceSemanticMemory: number;
    }> {
        this.ensureInitialized();

        const results = {
            expiredWorkingMemory: 0,
            oldEpisodicMemory: 0,
            lowConfidenceSemanticMemory: 0
        };

        try {
            logger.info('agent-memory-manager', 'Starting automatic cleanup procedures');

            // Clean up expired working memory
            results.expiredWorkingMemory = await this.cleanupExpiredMemory();

            // Clean up old episodic memory (older than 90 days)
            const oldEpisodicQuery = `
                DELETE FROM episodic_memory 
                WHERE created_at < NOW() - INTERVAL '90 days'
            `;
            const oldEpisodicResult = await this.executeQuery(oldEpisodicQuery);
            results.oldEpisodicMemory = oldEpisodicResult.length;

            // Clean up low confidence semantic memory (confidence < 0.3)
            const lowConfidenceQuery = `
                DELETE FROM semantic_memory 
                WHERE confidence < 0.3 AND created_at < NOW() - INTERVAL '30 days'
            `;
            const lowConfidenceResult = await this.executeQuery(lowConfidenceQuery);
            results.lowConfidenceSemanticMemory = lowConfidenceResult.length;

            logger.info('agent-memory-manager', 'Automatic cleanup completed', results);

        } catch (error) {
            logger.error('agent-memory-manager', 'Automatic cleanup failed', {
                error: (error as Error).message
            });
            throw error;
        }

        return results;
    }

    /**
     * Get memory statistics for monitoring
     */
    async getMemoryStatistics(): Promise<{
        episodicMemory: { total: number; byAgent: Record<string, number> };
        semanticMemory: { total: number; byFactType: Record<string, number> };
        workingMemory: { total: number; active: number; expired: number };
        proceduralMemory: { total: number; byPatternType: Record<string, number> };
    }> {
        this.ensureInitialized();

        try {
            // Episodic memory stats
            const episodicStats = await this.executeQuery<any>(`
                SELECT agent_id, COUNT(*) as count
                FROM episodic_memory
                GROUP BY agent_id
            `);

            const episodicTotal = await this.executeQuery<any>(`
                SELECT COUNT(*) as total FROM episodic_memory
            `);

            // Semantic memory stats
            const semanticStats = await this.executeQuery<any>(`
                SELECT fact_type, COUNT(*) as count
                FROM semantic_memory
                GROUP BY fact_type
            `);

            const semanticTotal = await this.executeQuery<any>(`
                SELECT COUNT(*) as total FROM semantic_memory
            `);

            // Working memory stats
            const workingStats = await this.executeQuery<any>(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active,
                    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired
                FROM working_memory
            `);

            // Procedural memory stats
            const proceduralStats = await this.executeQuery<any>(`
                SELECT pattern_type, COUNT(*) as count
                FROM procedural_memory
                GROUP BY pattern_type
            `);

            const proceduralTotal = await this.executeQuery<any>(`
                SELECT COUNT(*) as total FROM procedural_memory
            `);

            const stats = {
                episodicMemory: {
                    total: parseInt(episodicTotal[0]?.total || '0'),
                    byAgent: episodicStats.reduce((acc: Record<string, number>, row: any) => {
                        acc[row.agent_id] = parseInt(row.count);
                        return acc;
                    }, {})
                },
                semanticMemory: {
                    total: parseInt(semanticTotal[0]?.total || '0'),
                    byFactType: semanticStats.reduce((acc: Record<string, number>, row: any) => {
                        acc[row.fact_type] = parseInt(row.count);
                        return acc;
                    }, {})
                },
                workingMemory: {
                    total: parseInt(workingStats[0]?.total || '0'),
                    active: parseInt(workingStats[0]?.active || '0'),
                    expired: parseInt(workingStats[0]?.expired || '0')
                },
                proceduralMemory: {
                    total: parseInt(proceduralTotal[0]?.total || '0'),
                    byPatternType: proceduralStats.reduce((acc: Record<string, number>, row: any) => {
                        acc[row.pattern_type] = parseInt(row.count);
                        return acc;
                    }, {})
                }
            };

            logger.debug('agent-memory-manager', 'Memory statistics retrieved', stats);
            return stats;

        } catch (error) {
            logger.error('agent-memory-manager', 'Failed to get memory statistics', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Graceful shutdown with connection cleanup
     */
    async shutdown(): Promise<void> {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
            }
            
            this.isInitialized = false;
            logger.info('agent-memory-manager', 'Agent memory manager shutdown completed');

        } catch (error) {
            logger.error('agent-memory-manager', 'Error during shutdown', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get initialization status
     */
    get initialized(): boolean {
        return this.isInitialized;
    }
}

/**
 * Create agent memory manager instance
 */
export function createAgentMemoryManager(): AgentMemoryManager {
    return new AgentMemoryManager();
}