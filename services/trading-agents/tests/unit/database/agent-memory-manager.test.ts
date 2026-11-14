/**
 * Unit Tests for AgentMemoryManager
 * 
 * Tests CRUD operations and memory types for PostgreSQL-based agent memory
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool, PoolClient } from 'pg';
import { AgentMemoryManager } from '../../../src/database/agent-memory-manager';
import {
  EpisodicMemory,
  SemanticMemory,
  WorkingMemory,
  ProceduralMemory,
  EpisodicQuery,
  SemanticQuery,
  ProceduralQuery,
  BatchMemoryOperation,
  BatchResult,
  SemanticEmbeddingUpdate,
  UserPreferences
} from '../../../src/database/types';

jest.mock('pg');
jest.mock('../../../src/utils/enhanced-logger');

describe('AgentMemoryManager', () => {
  let memoryManager: AgentMemoryManager;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  const createTestEpisodicMemory = (): EpisodicMemory => ({
    id: 'episodic-1',
    sessionId: 'session-123',
    userId: 'user-456',
    agentId: 'market-analyst',
    timestamp: new Date(),
    interactionType: 'analysis_request',
    context: {
      symbol: 'AAPL',
      marketConditions: 'bullish',
      requestType: 'technical_analysis'
    },
    input: 'Analyze AAPL technical indicators',
    output: 'AAPL shows strong momentum with RSI at 65 and MACD bullish crossover',
    metadata: {
      confidence: 0.85,
      executionTime: 1250,
      marketConditions: {
        trend: 'bullish',
        volatility: 'moderate'
      }
    }
  });

  const createTestSemanticMemory = (): SemanticMemory => ({
    id: 'semantic-1',
    factType: 'market_knowledge',
    content: 'RSI above 70 typically indicates overbought conditions',
    embedding: Array.from({ length: 1536 }, () => Math.random()),
    confidence: 0.9,
    source: 'technical_analysis_rules',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['RSI', 'overbought', 'technical_analysis'],
    relatedEntities: ['RSI', 'technical_indicators']
  });

  const createTestWorkingMemory = (): WorkingMemory => ({
    id: 'working-1',
    sessionId: 'session-123',
    agentId: 'market-analyst',
    contextType: 'active_analysis',
    data: {
      currentSymbol: 'AAPL',
      analysisStage: 'technical_indicators',
      pendingCalculations: ['RSI', 'MACD', 'Bollinger_Bands']
    },
    priority: 1,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    createdAt: new Date()
  });

  const createTestProceduralMemory = (): ProceduralMemory => ({
    id: 'procedural-1',
    userId: 'user-456',
    patternType: 'trading_preference',
    pattern: {
      preferredTimeframe: '1D',
      riskTolerance: 'moderate',
      preferredIndicators: ['RSI', 'MACD', 'SMA'],
      maxPositionSize: 0.05
    },
    frequency: 15,
    confidence: 0.8,
    lastUsed: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Pool and Client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);

    memoryManager = new AgentMemoryManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with connection pool', async () => {
      await memoryManager.initialize(mockPool);

      expect(mockPool).toBeDefined();
    });

    test('should handle initialization errors', async () => {
      const failingPool = {
        ...mockPool,
        connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as any;

      await expect(memoryManager.initialize(failingPool))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('episodic memory operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should store episodic memory', async () => {
      const memory = createTestEpisodicMemory();
      mockClient.query.mockResolvedValue({ rows: [{ id: memory.id }] } as any);

      await memoryManager.storeEpisodicMemory(memory);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO episodic_memory'),
        expect.arrayContaining([
          memory.sessionId,
          memory.userId,
          memory.agentId,
          memory.interactionType,
          JSON.stringify(memory.context),
          memory.input,
          memory.output,
          JSON.stringify(memory.metadata)
        ])
      );
    });

    test('should retrieve episodic memory by query', async () => {
      const query: EpisodicQuery = {
        sessionId: 'session-123',
        agentId: 'market-analyst',
        limit: 10
      };

      const mockMemory = createTestEpisodicMemory();
      mockClient.query.mockResolvedValue({
        rows: [{
          id: mockMemory.id,
          session_id: mockMemory.sessionId,
          user_id: mockMemory.userId,
          agent_id: mockMemory.agentId,
          timestamp: mockMemory.timestamp,
          interaction_type: mockMemory.interactionType,
          context: mockMemory.context,
          input: mockMemory.input,
          output: mockMemory.output,
          metadata: mockMemory.metadata,
          created_at: mockMemory.timestamp
        }]
      } as any);

      const results = await memoryManager.retrieveEpisodicMemory(query);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe(query.sessionId);
      expect(results[0].agentId).toBe(query.agentId);
    });

    test('should batch store episodic memories', async () => {
      const memories = [
        createTestEpisodicMemory(),
        { ...createTestEpisodicMemory(), id: 'episodic-2', sessionId: 'session-456' }
      ];

      mockClient.query.mockResolvedValue({ rowCount: 2 } as any);

      await memoryManager.batchStoreEpisodicMemory(memories);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO episodic_memory'),
        expect.any(Array)
      );
    });

    test('should handle episodic memory storage errors', async () => {
      const memory = createTestEpisodicMemory();
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(memoryManager.storeEpisodicMemory(memory))
        .rejects.toThrow('Database error');
    });

    test('should filter episodic memory by date range', async () => {
      const query: EpisodicQuery = {
        userId: 'user-456',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 50
      };

      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await memoryManager.retrieveEpisodicMemory(query);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp BETWEEN'),
        expect.arrayContaining([query.startDate, query.endDate])
      );
    });
  });

  describe('semantic memory operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should store semantic memory with embeddings', async () => {
      const memory = createTestSemanticMemory();
      mockClient.query.mockResolvedValue({ rows: [{ id: memory.id }] } as any);

      await memoryManager.storeSemanticMemory(memory);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO semantic_memory'),
        expect.arrayContaining([
          memory.factType,
          memory.content,
          JSON.stringify(memory.embedding),
          memory.confidence,
          memory.source,
          memory.tags,
          memory.relatedEntities
        ])
      );
    });

    test('should retrieve semantic memory by query', async () => {
      const query: SemanticQuery = {
        factType: 'market_knowledge',
        tags: ['RSI'],
        limit: 5
      };

      const mockMemory = createTestSemanticMemory();
      mockClient.query.mockResolvedValue({
        rows: [{
          id: mockMemory.id,
          fact_type: mockMemory.factType,
          content: mockMemory.content,
          embedding: mockMemory.embedding,
          confidence: mockMemory.confidence,
          source: mockMemory.source,
          tags: mockMemory.tags,
          related_entities: mockMemory.relatedEntities,
          created_at: mockMemory.createdAt,
          updated_at: mockMemory.updatedAt
        }]
      } as any);

      const results = await memoryManager.retrieveSemanticMemory(query);

      expect(results).toHaveLength(1);
      expect(results[0].factType).toBe(query.factType);
      expect(results[0].tags).toContain('RSI');
    });

    test('should search semantic memory by similarity', async () => {
      const embedding = Array.from({ length: 1536 }, () => Math.random());
      const threshold = 0.8;

      const mockMemory = createTestSemanticMemory();
      mockClient.query.mockResolvedValue({
        rows: [{
          id: mockMemory.id,
          fact_type: mockMemory.factType,
          content: mockMemory.content,
          embedding: mockMemory.embedding,
          confidence: mockMemory.confidence,
          source: mockMemory.source,
          tags: mockMemory.tags,
          related_entities: mockMemory.relatedEntities,
          created_at: mockMemory.createdAt,
          updated_at: mockMemory.updatedAt,
          similarity: 0.85
        }]
      } as any);

      const results = await memoryManager.searchSemanticSimilarity(embedding, threshold);

      expect(results).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('embedding <=> $1'),
        expect.arrayContaining([JSON.stringify(embedding)])
      );
    });

    test('should batch update embeddings', async () => {
      const updates: SemanticEmbeddingUpdate[] = [
        {
          id: 'semantic-1',
          embedding: Array.from({ length: 1536 }, () => Math.random())
        },
        {
          id: 'semantic-2',
          embedding: Array.from({ length: 1536 }, () => Math.random())
        }
      ];

      mockClient.query.mockResolvedValue({ rowCount: 2 } as any);

      await memoryManager.batchUpdateEmbeddings(updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE semantic_memory SET embedding'),
        expect.any(Array)
      );
    });

    test('should handle semantic memory with missing embeddings', async () => {
      const memory = {
        ...createTestSemanticMemory(),
        embedding: undefined as any
      };

      await expect(memoryManager.storeSemanticMemory(memory))
        .rejects.toThrow('Embedding is required for semantic memory');
    });
  });

  describe('working memory operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should store working memory with TTL', async () => {
      const memory = createTestWorkingMemory();
      const ttl = 3600; // 1 hour
      mockClient.query.mockResolvedValue({ rows: [{ id: memory.id }] } as any);

      await memoryManager.storeWorkingMemory(memory, ttl);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO working_memory'),
        expect.arrayContaining([
          memory.sessionId,
          memory.agentId,
          memory.contextType,
          JSON.stringify(memory.data),
          memory.priority,
          expect.any(Date) // expiresAt should be calculated
        ])
      );
    });

    test('should retrieve working memory by session', async () => {
      const sessionId = 'session-123';
      const mockMemory = createTestWorkingMemory();

      mockClient.query.mockResolvedValue({
        rows: [{
          id: mockMemory.id,
          session_id: mockMemory.sessionId,
          agent_id: mockMemory.agentId,
          context_type: mockMemory.contextType,
          data: mockMemory.data,
          priority: mockMemory.priority,
          expires_at: mockMemory.expiresAt,
          created_at: mockMemory.createdAt
        }]
      } as any);

      const results = await memoryManager.retrieveWorkingMemory(sessionId);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe(sessionId);
    });

    test('should expire working memory by session', async () => {
      const sessionId = 'session-123';
      mockClient.query.mockResolvedValue({ rowCount: 3 } as any);

      await memoryManager.expireWorkingMemory(sessionId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM working_memory WHERE session_id'),
        [sessionId]
      );
    });

    test('should cleanup expired working memory', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 5 } as any);

      const cleanedCount = await memoryManager.cleanupExpiredMemory();

      expect(cleanedCount).toBe(5);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM working_memory WHERE expires_at < NOW()'),
        []
      );
    });

    test('should handle working memory priority ordering', async () => {
      const sessionId = 'session-123';
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await memoryManager.retrieveWorkingMemory(sessionId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY priority DESC, created_at DESC'),
        [sessionId]
      );
    });
  });

  describe('procedural memory operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should store procedural memory', async () => {
      const memory = createTestProceduralMemory();
      mockClient.query.mockResolvedValue({ rows: [{ id: memory.id }] } as any);

      await memoryManager.storeProceduralMemory(memory);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO procedural_memory'),
        expect.arrayContaining([
          memory.userId,
          memory.patternType,
          JSON.stringify(memory.pattern),
          memory.frequency,
          memory.confidence
        ])
      );
    });

    test('should retrieve procedural memory by query', async () => {
      const query: ProceduralQuery = {
        userId: 'user-456',
        patternType: 'trading_preference',
        minConfidence: 0.7
      };

      const mockMemory = createTestProceduralMemory();
      mockClient.query.mockResolvedValue({
        rows: [{
          id: mockMemory.id,
          user_id: mockMemory.userId,
          pattern_type: mockMemory.patternType,
          pattern: mockMemory.pattern,
          frequency: mockMemory.frequency,
          confidence: mockMemory.confidence,
          last_used: mockMemory.lastUsed,
          created_at: mockMemory.createdAt,
          updated_at: mockMemory.updatedAt
        }]
      } as any);

      const results = await memoryManager.retrieveProceduralMemory(query);

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(query.userId);
      expect(results[0].confidence).toBeGreaterThanOrEqual(query.minConfidence!);
    });

    test('should update user preferences', async () => {
      const userId = 'user-456';
      const preferences: UserPreferences = {
        riskTolerance: 'aggressive',
        preferredTimeframes: ['1H', '4H', '1D'],
        maxPositionSize: 0.10,
        preferredIndicators: ['RSI', 'MACD', 'Bollinger_Bands'],
        notificationSettings: {
          email: true,
          push: false,
          sms: true
        }
      };

      mockClient.query.mockResolvedValue({ rowCount: 1 } as any);

      await memoryManager.updateUserPreferences(userId, preferences);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO procedural_memory'),
        expect.arrayContaining([
          userId,
          'user_preferences',
          JSON.stringify(preferences)
        ])
      );
    });

    test('should increment pattern frequency', async () => {
      const patternId = 'procedural-1';
      mockClient.query.mockResolvedValue({ rowCount: 1 } as any);

      await memoryManager.incrementPatternFrequency(patternId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE procedural_memory SET frequency = frequency + 1'),
        [patternId]
      );
    });

    test('should handle procedural memory pattern evolution', async () => {
      const query: ProceduralQuery = {
        userId: 'user-456',
        patternType: 'trading_preference',
        orderBy: 'frequency',
        limit: 1
      };

      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await memoryManager.retrieveProceduralMemory(query);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY frequency DESC'),
        expect.any(Array)
      );
    });
  });

  describe('batch operations', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should execute batch memory operations', async () => {
      const operations: BatchMemoryOperation[] = [
        {
          type: 'insert',
          table: 'episodic_memory',
          data: createTestEpisodicMemory()
        },
        {
          type: 'insert',
          table: 'semantic_memory',
          data: createTestSemanticMemory()
        },
        {
          type: 'update',
          table: 'procedural_memory',
          data: { id: 'procedural-1', frequency: 20 }
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 } as any) // episodic insert
        .mockResolvedValueOnce({ rowCount: 1 } as any) // semantic insert
        .mockResolvedValueOnce({ rowCount: 1 } as any); // procedural update

      const result = await memoryManager.executeBatchOperations(operations);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle partial batch failures', async () => {
      const operations: BatchMemoryOperation[] = [
        {
          type: 'insert',
          table: 'episodic_memory',
          data: createTestEpisodicMemory()
        },
        {
          type: 'insert',
          table: 'semantic_memory',
          data: createTestSemanticMemory()
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 } as any) // success
        .mockRejectedValueOnce(new Error('Constraint violation')); // failure

      const result = await memoryManager.executeBatchOperations(operations);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Constraint violation');
    });

    test('should use transactions for batch operations', async () => {
      const operations: BatchMemoryOperation[] = [
        {
          type: 'insert',
          table: 'episodic_memory',
          data: createTestEpisodicMemory()
        }
      ];

      mockClient.query.mockResolvedValue({ rowCount: 1 } as any);

      await memoryManager.executeBatchOperations(operations);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should rollback on batch operation failure', async () => {
      const operations: BatchMemoryOperation[] = [
        {
          type: 'insert',
          table: 'episodic_memory',
          data: createTestEpisodicMemory()
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1 } as any) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      await memoryManager.executeBatchOperations(operations);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('connection management', () => {
    test('should handle connection pool exhaustion', async () => {
      await memoryManager.initialize(mockPool);
      
      mockPool.connect.mockRejectedValue(new Error('Pool exhausted'));

      await expect(memoryManager.storeEpisodicMemory(createTestEpisodicMemory()))
        .rejects.toThrow('Pool exhausted');
    });

    test('should release connections properly', async () => {
      await memoryManager.initialize(mockPool);
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await memoryManager.retrieveEpisodicMemory({ sessionId: 'test' });

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle connection errors gracefully', async () => {
      await memoryManager.initialize(mockPool);
      
      mockClient.query.mockRejectedValue(new Error('Connection lost'));

      await expect(memoryManager.storeEpisodicMemory(createTestEpisodicMemory()))
        .rejects.toThrow('Connection lost');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('performance optimization', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should handle large batch operations efficiently', async () => {
      const largeBatch: BatchMemoryOperation[] = Array.from({ length: 1000 }, (_, i) => ({
        type: 'insert',
        table: 'episodic_memory',
        data: {
          ...createTestEpisodicMemory(),
          id: `episodic-${i}`,
          sessionId: `session-${i}`
        }
      }));

      mockClient.query.mockResolvedValue({ rowCount: 1 } as any);

      const startTime = Date.now();
      const result = await memoryManager.executeBatchOperations(largeBatch);
      const duration = Date.now() - startTime;

      expect(result.successful).toBe(1000);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should use prepared statements for repeated operations', async () => {
      const memories = Array.from({ length: 100 }, (_, i) => ({
        ...createTestEpisodicMemory(),
        id: `episodic-${i}`
      }));

      mockClient.query.mockResolvedValue({ rowCount: 100 } as any);

      await memoryManager.batchStoreEpisodicMemory(memories);

      // Should use batch insert instead of individual inserts
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should optimize similarity search queries', async () => {
      const embedding = Array.from({ length: 1536 }, () => Math.random());
      mockClient.query.mockResolvedValue({ rows: [] } as any);

      await memoryManager.searchSemanticSimilarity(embedding, 0.8);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.any(Array)
      );
    });
  });

  describe('data validation', () => {
    beforeEach(async () => {
      await memoryManager.initialize(mockPool);
    });

    test('should validate episodic memory structure', async () => {
      const invalidMemory = {
        ...createTestEpisodicMemory(),
        sessionId: null // Invalid null value
      };

      await expect(memoryManager.storeEpisodicMemory(invalidMemory as any))
        .rejects.toThrow('Session ID is required');
    });

    test('should validate semantic memory embeddings', async () => {
      const invalidMemory = {
        ...createTestSemanticMemory(),
        embedding: Array.from({ length: 100 }, () => Math.random()) // Wrong dimension
      };

      await expect(memoryManager.storeSemanticMemory(invalidMemory))
        .rejects.toThrow('Invalid embedding dimensions');
    });

    test('should validate working memory TTL', async () => {
      const memory = createTestWorkingMemory();
      const invalidTTL = -3600; // Negative TTL

      await expect(memoryManager.storeWorkingMemory(memory, invalidTTL))
        .rejects.toThrow('TTL must be positive');
    });

    test('should validate procedural memory confidence', async () => {
      const invalidMemory = {
        ...createTestProceduralMemory(),
        confidence: 1.5 // Invalid confidence > 1
      };

      await expect(memoryManager.storeProceduralMemory(invalidMemory))
        .rejects.toThrow('Confidence must be between 0 and 1');
    });
  });
});