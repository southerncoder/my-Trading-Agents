# Async PostgreSQL-based Agent Memory System

This directory contains the implementation of a comprehensive async PostgreSQL-based agent memory system for the Trading Agents framework. The system provides four types of memory with full async support, connection pooling, and pgvector integration for semantic similarity search.

## Overview

The agent memory system consists of:

- **AgentMemoryManager**: Main class providing async memory operations
- **DatabaseManager**: Connection pooling and database management
- **Four Memory Types**: Episodic, Semantic, Working, and Procedural memory
- **pgvector Integration**: Vector similarity search for semantic memory
- **Batch Operations**: High-performance bulk operations with transaction support
- **Health Monitoring**: Connection health checks and automatic cleanup

## Memory Types

### 1. Episodic Memory
Stores conversation history and agent interactions.

```typescript
interface EpisodicMemory {
  id: string;
  sessionId: string;
  userId: string;
  agentId: string;
  timestamp: Date;
  interactionType: 'analysis_request' | 'strategy_execution' | 'risk_assessment' | 'user_feedback';
  context: Record<string, any>;
  input: string;
  output: string;
  metadata: Record<string, any>;
}
```

**Use Cases:**
- Track agent conversation history
- Analyze interaction patterns
- Provide context for future interactions
- Debug agent behavior

### 2. Semantic Memory
Stores long-term facts and knowledge with vector embeddings for similarity search.

```typescript
interface SemanticMemory {
  id: string;
  factType: 'market_knowledge' | 'strategy_rule' | 'risk_principle' | 'user_insight';
  content: string;
  embedding: number[]; // Vector embedding for similarity search
  confidence: number;
  source: string;
  tags: string[];
  relatedEntities: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Use Cases:**
- Store market insights and knowledge
- Find similar information using vector search
- Build knowledge base over time
- Provide relevant context for analysis

### 3. Working Memory
Stores active context with TTL-based expiration.

```typescript
interface WorkingMemory {
  id: string;
  sessionId: string;
  agentId: string;
  contextType: 'active_analysis' | 'pending_decision' | 'recent_interaction';
  data: Record<string, any>;
  priority: number;
  expiresAt: Date;
  createdAt: Date;
}
```

**Use Cases:**
- Maintain active analysis context
- Store temporary decision state
- Cache frequently accessed data
- Manage session-specific information

### 4. Procedural Memory
Stores learned patterns and user preferences.

```typescript
interface ProceduralMemory {
  id: string;
  userId: string;
  patternType: 'trading_preference' | 'risk_tolerance' | 'analysis_style' | 'notification_preference';
  pattern: Record<string, any>;
  frequency: number;
  confidence: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Use Cases:**
- Store user trading preferences
- Learn from user behavior patterns
- Adapt agent responses to user style
- Maintain personalization settings

## Key Features

### Async Operations with Connection Pooling
All operations are fully async with proper connection pooling:

```typescript
const memoryManager = new AgentMemoryManager();
await memoryManager.initialize(pool);

// All operations are async
await memoryManager.storeEpisodicMemory(memory);
const memories = await memoryManager.retrieveEpisodicMemory(query);
```

### Vector Similarity Search
Semantic memory supports pgvector-based similarity search:

```typescript
// Store memory with embedding
const memory: SemanticMemory = {
  content: "AAPL performs well in Q4",
  embedding: [0.1, 0.2, 0.3, ...], // 1536-dimensional vector
  // ... other fields
};
await memoryManager.storeSemanticMemory(memory);

// Search by similarity
const queryEmbedding = [0.1, 0.2, 0.3, ...];
const similar = await memoryManager.searchSemanticSimilarity(
  queryEmbedding, 
  0.8, // similarity threshold
  10   // limit
);
```

### Batch Operations
High-performance batch operations with transaction support:

```typescript
// Batch store multiple memories
const memories: EpisodicMemory[] = [...];
await memoryManager.batchStoreEpisodicMemory(memories);

// Batch update embeddings
const updates: SemanticEmbeddingUpdate[] = [...];
await memoryManager.batchUpdateEmbeddings(updates);

// Generic batch operations
const operations: BatchMemoryOperation[] = [...];
const result = await memoryManager.executeBatchOperations(operations);
```

### Automatic Cleanup
Built-in cleanup procedures for data maintenance:

```typescript
// Automatic cleanup of expired and old data
const results = await memoryManager.performAutomaticCleanup();
console.log(results);
// {
//   expiredWorkingMemory: 15,
//   oldEpisodicMemory: 100,
//   lowConfidenceSemanticMemory: 5
// }
```

### Health Monitoring
Connection health monitoring and statistics:

```typescript
// Check connection health
const health = await memoryManager.checkConnectionHealth();
console.log(health);
// {
//   connected: true,
//   poolStats: {
//     totalConnections: 10,
//     idleConnections: 5,
//     activeConnections: 5
//   }
// }

// Get memory statistics
const stats = await memoryManager.getMemoryStatistics();
console.log(stats);
// {
//   episodicMemory: { total: 1000, byAgent: {...} },
//   semanticMemory: { total: 500, byFactType: {...} },
//   workingMemory: { total: 50, active: 30, expired: 20 },
//   proceduralMemory: { total: 25, byPatternType: {...} }
// }
```

## Database Schema

The system automatically creates the following PostgreSQL tables:

### episodic_memory
```sql
CREATE TABLE episodic_memory (
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
);
```

### semantic_memory
```sql
CREATE TABLE semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- pgvector for embeddings
  confidence DECIMAL(3,2) NOT NULL,
  source VARCHAR(255) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  related_entities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### working_memory
```sql
CREATE TABLE working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  context_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### procedural_memory
```sql
CREATE TABLE procedural_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL,
  pattern JSONB NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence DECIMAL(3,2) NOT NULL,
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Configuration

### Environment Variables
```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=trading_agents
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=false

# Connection Pool Settings
POSTGRES_POOL_SIZE=10
POSTGRES_CONNECTION_TIMEOUT=60000
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_MAX_USES=7500
POSTGRES_ALLOW_EXIT_ON_IDLE=true

# pgvector Configuration
PGVECTOR_ENABLED=true
PGVECTOR_DIMENSIONS=1536
PGVECTOR_SIMILARITY_THRESHOLD=0.8
```

### Database Setup
1. Install PostgreSQL 14+
2. Install pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```
3. Create database:
   ```sql
   CREATE DATABASE trading_agents;
   ```
4. Run the setup script:
   ```bash
   npm run setup:memory-system
   ```

## Usage Examples

### Basic Setup
```typescript
import { AgentMemoryManager } from './agent-memory-manager';
import { DatabaseManager, getDefaultDatabaseConfig } from './database-manager';

// Initialize
const dbConfig = getDefaultDatabaseConfig();
const databaseManager = new DatabaseManager(dbConfig);
await databaseManager.initializeConnections();

const pool = databaseManager.getPostgreSQLPool();
const memoryManager = new AgentMemoryManager();
await memoryManager.initialize(pool);
```

### Store Agent Interaction
```typescript
const interaction: EpisodicMemory = {
  id: 'interaction_123',
  sessionId: 'session_456',
  userId: 'user_789',
  agentId: 'market-analyst',
  timestamp: new Date(),
  interactionType: 'analysis_request',
  context: {
    symbol: 'AAPL',
    marketCondition: 'bullish'
  },
  input: 'Analyze AAPL stock',
  output: 'AAPL shows strong bullish signals...',
  metadata: {
    confidence: 0.85,
    executionTime: 2500
  }
};

await memoryManager.storeEpisodicMemory(interaction);
```

### Store Market Knowledge
```typescript
const knowledge: SemanticMemory = {
  id: 'knowledge_123',
  factType: 'market_knowledge',
  content: 'Technology stocks typically outperform in Q4',
  embedding: await generateEmbedding(content), // Your embedding function
  confidence: 0.9,
  source: 'historical_analysis',
  tags: ['technology', 'seasonal', 'Q4'],
  relatedEntities: ['AAPL', 'MSFT', 'GOOGL'],
  createdAt: new Date(),
  updatedAt: new Date()
};

await memoryManager.storeSemanticMemory(knowledge);
```

### Query Similar Knowledge
```typescript
const queryEmbedding = await generateEmbedding('Q4 technology performance');
const similarKnowledge = await memoryManager.searchSemanticSimilarity(
  queryEmbedding,
  0.8, // similarity threshold
  5    // limit
);
```

### Integration with Trading Agents
See `memory-integration-example.ts` for a complete example of integrating the memory system with the trading agents workflow.

## Testing

Run the test suite:
```bash
npm test -- agent-memory-manager.test.ts
```

Run the setup verification:
```bash
npm run setup:memory-system
```

## Performance Considerations

### Connection Pooling
- Default pool size: 10 connections
- Configurable timeouts and limits
- Automatic connection health monitoring

### Indexing
The system creates optimized indexes for:
- Session and timestamp queries
- Agent-specific queries
- Vector similarity search (ivfflat index)
- JSONB context and metadata queries

### Batch Operations
Use batch operations for high-throughput scenarios:
- Batch episodic memory storage
- Batch embedding updates
- Transaction-based consistency

### Cleanup Procedures
Automatic cleanup removes:
- Expired working memory
- Old episodic memory (90+ days)
- Low confidence semantic memory (< 0.3 confidence, 30+ days old)

## Monitoring and Observability

The system provides comprehensive logging and monitoring:
- Connection health metrics
- Memory usage statistics
- Operation performance tracking
- Error logging with context

## Security Considerations

- All database credentials via environment variables
- Connection pooling with proper cleanup
- SQL injection prevention through parameterized queries
- Graceful error handling without data exposure

## Future Enhancements

Potential improvements:
- Redis caching layer for frequently accessed memories
- Distributed memory across multiple PostgreSQL instances
- Advanced vector search with HNSW indexes
- Memory compression for long-term storage
- Integration with external embedding services