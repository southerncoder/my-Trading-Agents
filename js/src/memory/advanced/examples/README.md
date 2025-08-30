# Quickstart: Running the Example

This folder contains a runnable example for the Advanced Memory & Learning System using Zep Graphiti as the backend knowledge graph.

## Example: `run-advanced-memory-example.ts`

- Demonstrates how to:
  - Configure the ZepAdapter for your Zep Graphiti instance
  - Initialize the `AdvancedMemoryLearningSystem`
  - Submit a trading intelligence request and print the response

### Prerequisites
- Node.js 18+
- Zep Graphiti running locally or remotely (set `ZEP_GRAPHITI_URL` and `ZEP_API_KEY` in your `.env.local`)
- Install dependencies:
  ```sh
  cd js
  npm install
  ```

### Running the Example
From the `js` directory:
```sh
npx tsx src/memory/advanced/examples/run-advanced-memory-example.ts
```

### What it does
- Connects to Zep Graphiti using the adapter
- Initializes the advanced memory system with a sample config
- Sends a sample trading intelligence request (for AAPL)
- Prints the structured response (market intelligence, risk, confidence, learning insights)

---
# Advanced Memory & Learning System

## Overview

The Advanced Memory & Learning System is a sophisticated institutional trading intelligence platform that leverages Zep Graphiti's temporal knowledge graphs to provide continuous learning capabilities for trading agents.

## System Architecture

The system consists of 5 integrated components:

### 1. Market Entity Modeling (`market-entities.ts`)
- **Purpose**: Core financial entity schemas and Zep Graphiti configuration
- **Key Features**: 
  - Comprehensive entity types (StockEntity, SectorEntity, EconomicIndicator, MarketRegime)
  - Temporal relationship modeling (MarketRelationship, AnalysisOutcome)
  - Zod schema validation for type safety
  - Zep Graphiti integration configuration

### 2. Temporal Relationship Mapping (`temporal-relationship-mapper.ts`)
- **Purpose**: Advanced temporal analysis and relationship mapping
- **Key Features**:
  - Market condition similarity analysis
  - Relationship evolution tracking over time
  - Emerging relationship discovery
  - Historical pattern recognition

### 3. Context Retrieval System (`context-retrieval-system.ts`)
- **Purpose**: Intelligent context retrieval for similar historical scenarios
- **Key Features**:
  - Multi-dimensional similarity search
  - Vector similarity analysis
  - Regime-based filtering
  - Temporal pattern matching

### 4. Memory Consolidation Layer (`memory-consolidation-layer.ts`)
- **Purpose**: Learning system for pattern consolidation and institutional memory
- **Key Features**:
  - Pattern learning and validation
  - Agent performance tracking
  - Institutional memory formation
  - Learning trajectory analysis

### 5. Agent Performance Learning (`agent-performance-learning.ts`)
- **Purpose**: Dynamic confidence scoring and performance optimization
- **Key Features**:
  - Confidence calibration based on historical accuracy
  - Performance metrics tracking
  - Learning from outcomes
  - Dynamic confidence adjustment

### 6. Integration Layer (`index.ts`)
- **Purpose**: Unified interface orchestrating all components
- **Key Features**:
  - Request processing and routing
  - Component coordination
  - System analytics
  - Performance monitoring

## Installation and Setup

```typescript
import { AdvancedMemoryLearningSystem } from './src/memory/advanced/index';
import { AdvancedMemoryConfig } from './src/memory/advanced/market-entities';

// Configuration
const config: AdvancedMemoryConfig = {
  memory_config: {
    entity_types: ['stock', 'sector', 'economic_indicator', 'market_regime'],
    relationship_types: ['correlation', 'causation', 'influence', 'similarity'],
    temporal_granularity: 'daily',
    retention_period_days: 365,
    max_entities_per_type: 10000
  },
  learning_config: {
    learning_rate: 0.01,
    memory_retention_days: 90,
    pattern_validation_threshold: 0.7,
    performance_window_days: 30,
    confidence_decay_rate: 0.05
  },
  retrieval_config: {
    similarity_threshold: 0.6,
    max_results: 50,
    temporal_weight: 0.3,
    entity_weight: 0.4,
    relationship_weight: 0.3
  }
};

// Initialize system
const zepClient = /* Your Zep Graphiti client */;
const memorySystem = new AdvancedMemoryLearningSystem(config, zepClient, console);
await memorySystem.initialize();
```

## Key Features

### Temporal Knowledge Graphs
- Leverages Zep Graphiti for sophisticated temporal relationship modeling
- Tracks market conditions and entity relationships over time
- Supports complex temporal queries and pattern recognition

### Institutional Learning
- Continuous learning from trading outcomes
- Performance tracking and confidence calibration
- Pattern consolidation for institutional memory
- Agent performance optimization

### Market Intelligence
- Historical scenario matching
- Market regime analysis
- Sector and entity relationship tracking
- Economic indicator correlation analysis

### Advanced Similarity Search
- Multi-dimensional similarity analysis
- Vector-based pattern matching
- Temporal weight consideration
- Configurable similarity thresholds

## API Interface

### Primary Methods

#### `processIntelligenceRequest(request)`
Process market intelligence requests with historical context retrieval.

#### `recordOutcome(outcome)`
Record trading outcomes for continuous learning and performance tracking.

#### `getSystemAnalytics()`
Retrieve comprehensive system analytics and performance metrics.

#### `initialize()`
Initialize all system components and prepare for operation.

## Integration with Trading Agents

The system is designed to integrate seamlessly with trading agents, providing:

1. **Historical Context**: Find similar market conditions from the past
2. **Risk Assessment**: Analyze potential risks based on historical patterns
3. **Confidence Scoring**: Dynamic confidence calibration based on agent performance
4. **Learning Loop**: Continuous improvement from trading outcomes
5. **Pattern Recognition**: Identify emerging market patterns and relationships

## Technical Specifications

- **Language**: TypeScript with comprehensive type safety
- **Validation**: Zod schemas for runtime type checking
- **Storage**: Zep Graphiti temporal knowledge graphs
- **Architecture**: Modular component-based design
- **Performance**: Optimized for institutional-scale trading operations

## Dependencies

- **Zod**: Schema validation and type safety
- **Zep Graphiti**: Temporal knowledge graph storage and retrieval
- **TypeScript**: Type safety and development experience

## File Structure

```
js/src/memory/advanced/
├── market-entities.ts          # Entity schemas and configurations
├── temporal-relationship-mapper.ts  # Temporal analysis and mapping
├── context-retrieval-system.ts      # Historical context retrieval
├── memory-consolidation-layer.ts    # Pattern learning and consolidation
├── agent-performance-learning.ts    # Performance tracking and learning
├── index.ts                    # Integration layer and main API
└── examples/
    └── README.md              # This documentation file
```

## Status

✅ **COMPLETED**: All 5 components implemented with full TypeScript compliance
✅ **VALIDATED**: Zero compilation errors across all system files
✅ **INTEGRATED**: Unified API interface with comprehensive orchestration
✅ **DOCUMENTED**: Complete system documentation and specifications

The Advanced Memory & Learning System is ready for integration with institutional trading agents and provides a sophisticated foundation for continuous learning and market intelligence.