# Trading System Enhancement - API Documentation

## Overview

This document provides comprehensive API documentation for the enhanced Trading Agents system, including all new components added in the trading system enhancement project.

## Table of Contents

1. [Enhanced Trading Graph](#enhanced-trading-graph)
2. [Backtesting Framework](#backtesting-framework)
3. [Risk Management Engine](#risk-management-engine)
4. [Strategy Ensemble System](#strategy-ensemble-system)
5. [Position Sizing](#position-sizing)
6. [Data Provider Resilience](#data-provider-resilience)
7. [Performance Monitoring](#performance-monitoring)
8. [Database Management](#database-management)
9. [Agent Memory Management](#agent-memory-management)
10. [Government Data Integration](#government-data-integration)

---

## Enhanced Trading Graph

The `EnhancedTradingAgentsGraph` is the main orchestration class that integrates all enhanced components.

### Constructor

```typescript
constructor(graphConfig: TradingGraphConfig)
```

#### TradingGraphConfig Interface

```typescript
interface TradingGraphConfig {
  config: TradingAgentsConfig;
  selectedAnalysts?: AnalystType[];
  enableLangGraph?: boolean;
  enableLazyLoading?: boolean;
  enableStateOptimization?: boolean;
  enableBacktesting?: boolean;
  enableRiskManagement?: boolean;
  enableStrategyEnsemble?: boolean;
  enablePositionSizing?: boolean;
  enableDataResilience?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableGovernmentData?: boolean;
  zepClientConfig?: ZepClientConfig;
  databaseConfig?: DatabaseConfig;
}
```

### Key Methods

#### analyzeAndDecide()

Executes comprehensive analysis with all enhanced components.

```typescript
async analyzeAndDecide(companyOfInterest: string, tradeDate: string): Promise<{
  decision: string;
  reasoning: string[];
  confidence: number;
  messages: any[];
  memoryInsights?: any;
  riskAssessment?: any;
  ensembleSignal?: any;
  positionSize?: any;
  governmentData?: any;
}>
```

**Parameters:**
- `companyOfInterest`: Stock symbol to analyze
- `tradeDate`: Date for analysis (YYYY-MM-DD format)

**Returns:**
- `decision`: Trading decision (BUY, SELL, HOLD)
- `reasoning`: Array of reasoning strings from analysis
- `confidence`: Confidence level (0-1)
- `messages`: Raw analysis messages
- `memoryInsights`: Advanced memory analysis results
- `riskAssessment`: Risk analysis from RiskManagementEngine
- `ensembleSignal`: Aggregated signal from StrategyEnsemble
- `positionSize`: Calculated position size
- `governmentData`: Government data insights

#### runBacktest()

Runs backtesting on a strategy.

```typescript
async runBacktest(
  strategyConfig: any, 
  symbol: string, 
  startDate: string, 
  endDate: string
): Promise<BacktestResult>
```

#### getSystemStatus()

Returns comprehensive system status.

```typescript
getSystemStatus(): {
  components: Record<string, boolean>;
  database: boolean;
  memory: boolean;
  performance: any;
}
```

---

## Backtesting Framework

### BacktestEngine

Main class for running strategy backtests.

```typescript
class BacktestEngine {
  constructor(config: TradingAgentsConfig);
  
  async runBacktest(config: BacktestConfig): Promise<BacktestResult>;
  async validateStrategy(strategy: ITradingStrategy): Promise<ValidationResult>;
}
```

#### BacktestConfig Interface

```typescript
interface BacktestConfig {
  strategy: ITradingStrategy;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number;
  slippage: number;
  marketImpact: boolean;
}
```

#### BacktestResult Interface

```typescript
interface BacktestResult {
  trades: Trade[];
  performance: PerformanceMetrics;
  equity: EquityCurve;
  drawdowns: DrawdownAnalysis;
  riskMetrics: RiskAnalysis;
}
```

### TradeSimulator

Simulates realistic trade execution.

```typescript
class TradeSimulator {
  async simulateTrade(order: Order, marketData: MarketData): Promise<ExecutedTrade>;
  applySlippage(price: number, volume: number): number;
  calculateCommission(trade: Trade): number;
  simulateMarketImpact(order: Order, marketData: MarketData): number;
}
```

### WalkForwardAnalyzer

Performs walk-forward analysis for overfitting detection.

```typescript
class WalkForwardAnalyzer {
  async performWalkForward(config: WalkForwardConfig): Promise<WalkForwardResult>;
  async optimizeParameters(strategy: ITradingStrategy, data: MarketData[]): Promise<OptimizedParameters>;
  detectOverfitting(inSample: PerformanceMetrics, outOfSample: PerformanceMetrics): OverfittingAnalysis;
}
```

---

## Risk Management Engine

### RiskManagementEngine

Comprehensive risk assessment and management.

```typescript
class RiskManagementEngine {
  constructor(config: TradingAgentsConfig);
  
  async assessTechnicalIndicatorRisk(symbol: string, indicators: TechnicalIndicators): Promise<RiskAssessment>;
  async calculateQuantitativeRisk(symbol: string, fundamentals: FundamentalData): Promise<QuantitativeRisk>;
  async evaluateSectorSentiment(symbol: string, sector: string): Promise<SectorSentiment>;
  async analyzeVolatility(symbol: string, priceHistory: PriceData[]): Promise<VolatilityAnalysis>;
  async calculateVaR(portfolio: Portfolio, confidence: number): Promise<number>;
  async calculateCVaR(portfolio: Portfolio, confidence: number): Promise<number>;
}
```

#### RiskAssessment Interface

```typescript
interface RiskAssessment {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technicalRisk: TechnicalIndicatorRisk;
  quantitativeRisk: QuantitativeRisk;
  volatilityRisk: VolatilityAnalysis;
  sectorRisk: SectorSentiment;
}
```

#### TechnicalIndicatorRisk Interface

```typescript
interface TechnicalIndicatorRisk {
  rsiExtremeZones: boolean;
  macdDivergence: boolean;
  bollingerSqueeze: boolean;
  overallRiskScore: number;
  riskFactors: string[];
}
```

---

## Strategy Ensemble System

### StrategyEnsemble

Aggregates signals from multiple strategies.

```typescript
class StrategyEnsemble {
  constructor(config: TradingAgentsConfig);
  
  async aggregateSignals(signals: TradingSignal[]): Promise<AggregatedSignal>;
  async resolveConflicts(conflictingSignals: TradingSignal[]): Promise<TradingSignal>;
  async updateWeights(performanceData: StrategyPerformance[]): Promise<void>;
  addStrategy(strategy: ITradingStrategy, weight: number): void;
  removeStrategy(strategyId: string): void;
}
```

#### AggregatedSignal Interface

```typescript
interface AggregatedSignal extends TradingSignal {
  contributingStrategies: string[];
  confidenceWeights: Record<string, number>;
  consensusStrength: number;
  conflictResolution?: ConflictResolution;
}
```

#### ConflictResolution Interface

```typescript
interface ConflictResolution {
  method: 'correlation_analysis' | 'performance_weighting' | 'confidence_voting';
  resolution: TradingSignal;
  reasoning: string;
}
```

---

## Position Sizing

### PositionSizer

Calculates optimal position sizes using various algorithms.

```typescript
class PositionSizer {
  constructor(config: TradingAgentsConfig);
  
  async calculateKellySize(signal: TradingSignal, portfolio: Portfolio): Promise<PositionSize>;
  async calculateRiskParitySize(portfolio: Portfolio, newPosition: Position): Promise<PositionSize>;
  async calculateVolatilityAdjustedSize(signal: TradingSignal, volatility: number): Promise<PositionSize>;
  async enforceRiskLimits(proposedPosition: Position, portfolio: Portfolio): Promise<Position>;
}
```

#### PositionSize Interface

```typescript
interface PositionSize {
  shares: number;
  dollarAmount: number;
  portfolioPercentage: number;
  riskAdjustment: number;
  reasoning: string;
}
```

---

## Data Provider Resilience

### DataProviderFailover

Manages failover between multiple data providers.

```typescript
class DataProviderFailover {
  constructor(config: TradingAgentsConfig);
  
  async getMarketData(symbol: string, providers: DataProvider[]): Promise<MarketData>;
  async getNewsData(symbol: string, providers: NewsProvider[]): Promise<NewsData[]>;
  async getSocialSentiment(symbol: string, providers: SocialProvider[]): Promise<SentimentData>;
  async checkProviderHealth(provider: DataProvider): Promise<HealthStatus>;
}
```

#### HealthStatus Interface

```typescript
interface HealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'failed';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}
```

### IntelligentCaching

Multi-level caching system.

```typescript
class IntelligentCaching {
  async cacheMarketData(symbol: string, data: MarketData, ttl: number): Promise<void>;
  async getCachedData(symbol: string, maxAge: number): Promise<MarketData | null>;
  async invalidateCache(symbol: string, reason: string): Promise<void>;
  async prefetchData(symbols: string[], priority: 'high' | 'medium' | 'low'): Promise<void>;
}
```

---

## Performance Monitoring

### PerformanceMonitor

Real-time performance tracking and analytics.

```typescript
class PerformanceMonitor {
  constructor(databaseManager: DatabaseManager);
  
  async trackStrategyPerformance(strategyId: string, performance: PerformanceMetrics): Promise<void>;
  async calculateRollingMetrics(strategyId: string, window: number): Promise<RollingMetrics>;
  async compareStrategies(strategyIds: string[], timeframe: TimeFrame): Promise<StrategyComparison>;
  async detectPerformanceAnomalies(performance: PerformanceMetrics[]): Promise<Anomaly[]>;
}
```

#### PerformanceMetrics Interface

```typescript
interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}
```

### AlertManager

Configurable alerting system.

```typescript
class AlertManager {
  async createAlert(config: AlertConfig): Promise<string>;
  async updateAlert(alertId: string, config: Partial<AlertConfig>): Promise<void>;
  async checkAlerts(currentMetrics: SystemMetrics): Promise<TriggeredAlert[]>;
  async sendAlert(alert: TriggeredAlert, channels: NotificationChannel[]): Promise<void>;
}
```

---

## Database Management

### DatabaseManager

Async PostgreSQL database management with connection pooling.

```typescript
class DatabaseManager {
  constructor(config: DatabaseConfig);
  
  async initializeConnections(): Promise<void>;
  getPostgreSQLPool(): Pool;
  async executeQuery<T>(query: string, params?: any[]): Promise<T[]>;
  async executeTransaction<T>(queries: TransactionQuery[]): Promise<T>;
  async checkConnectionHealth(): Promise<DatabaseHealthStatus>;
}
```

#### DatabaseConfig Interface

```typescript
interface DatabaseConfig {
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    poolSize: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  storageStrategy: StorageStrategy;
  pgvector: PgVectorConfig;
}
```

---

## Agent Memory Management

### AgentMemoryManager

Manages different types of agent memory with async operations.

```typescript
class AgentMemoryManager {
  async initialize(pool: Pool): Promise<void>;
  
  // Episodic Memory
  async storeEpisodicMemory(memory: EpisodicMemory): Promise<void>;
  async retrieveEpisodicMemory(query: EpisodicQuery): Promise<EpisodicMemory[]>;
  async batchStoreEpisodicMemory(memories: EpisodicMemory[]): Promise<void>;
  
  // Semantic Memory
  async storeSemanticMemory(memory: SemanticMemory): Promise<void>;
  async retrieveSemanticMemory(query: SemanticQuery): Promise<SemanticMemory[]>;
  async searchSemanticSimilarity(embedding: number[], threshold: number): Promise<SemanticMemory[]>;
  
  // Working Memory
  async storeWorkingMemory(memory: WorkingMemory, ttl: number): Promise<void>;
  async retrieveWorkingMemory(sessionId: string): Promise<WorkingMemory[]>;
  async expireWorkingMemory(sessionId: string): Promise<void>;
  
  // Procedural Memory
  async storeProceduralMemory(memory: ProceduralMemory): Promise<void>;
  async retrieveProceduralMemory(query: ProceduralQuery): Promise<ProceduralMemory[]>;
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void>;
}
```

#### Memory Types

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
  metadata: MemoryMetadata;
}

interface SemanticMemory {
  id: string;
  factType: 'market_knowledge' | 'strategy_rule' | 'risk_principle' | 'user_insight';
  content: string;
  embedding: number[];
  confidence: number;
  source: string;
  tags: string[];
  relatedEntities: string[];
}

interface WorkingMemory {
  id: string;
  sessionId: string;
  agentId: string;
  contextType: 'active_analysis' | 'pending_decision' | 'recent_interaction';
  data: Record<string, any>;
  priority: number;
  expiresAt: Date;
}

interface ProceduralMemory {
  id: string;
  userId: string;
  patternType: 'trading_preference' | 'risk_tolerance' | 'analysis_style' | 'notification_preference';
  pattern: Record<string, any>;
  frequency: number;
  confidence: number;
  lastUsed: Date;
}
```

---

## Government Data Integration

### GovernmentDataClient

Integrates with government data services for fundamental analysis.

```typescript
class GovernmentDataClient {
  constructor(baseUrl?: string);
  
  async getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  async getSECFilings(symbol: string, filingType?: string): Promise<SECFiling[]>;
  async getEconomicIndicators(indicators: string[]): Promise<EconomicData>;
  async getFREDData(seriesId: string, startDate?: string, endDate?: string): Promise<FREDSeries>;
  async getBLSData(seriesId: string, startDate?: string, endDate?: string): Promise<BLSSeries>;
}
```

#### Government Data Types

```typescript
interface CompanyProfile {
  symbol: string;
  companyName: string;
  cik: string;
  secFilings: SECFiling[];
  economicIndicators: EconomicData;
  lastUpdated: Date;
}

interface SECFiling {
  filingType: string;
  filingDate: Date;
  reportDate: Date;
  documentUrl: string;
  facts: FinancialFacts;
}

interface EconomicData {
  gdp: number;
  unemployment: number;
  inflation: number;
  treasuryRates: TreasuryRates;
  lastUpdated: Date;
}
```

---

## Error Handling

All API methods use consistent error handling patterns:

```typescript
// Standard error types
class TradingSystemError extends Error {
  constructor(
    public component: string,
    public errorType: string,
    message: string,
    public details?: any
  );
}

class BacktestError extends TradingSystemError {}
class RiskManagementError extends TradingSystemError {}
class DataProviderError extends TradingSystemError {}
class DatabaseError extends TradingSystemError {}
```

## Configuration

### Environment Variables

All sensitive configuration is handled through environment variables:

```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=trading_agents
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=false
POSTGRES_POOL_SIZE=20

# pgvector Configuration
PGVECTOR_ENABLED=true
PGVECTOR_EMBEDDING_DIMENSIONS=1536
PGVECTOR_SIMILARITY_THRESHOLD=0.8

# Government Data Configuration
GOVERNMENT_DATA_URL=http://localhost:3005
FRED_API_KEY=your_fred_api_key
BLS_API_KEY=your_bls_api_key

# Storage Strategy Configuration
STORAGE_PERFORMANCE_METRICS=postgresql
STORAGE_BACKTEST_RESULTS=postgresql
STORAGE_AGENT_MEMORY=postgresql
```

## Rate Limits and Quotas

- **Database Connections**: Limited by `POSTGRES_POOL_SIZE` (default: 20)
- **Government Data API**: 120 requests/minute for FRED, 500 requests/day for BLS
- **Memory Operations**: Batch operations recommended for > 100 records
- **Backtesting**: Limited by available memory and CPU resources

## Best Practices

1. **Database Operations**: Always use connection pooling and transactions for multi-step operations
2. **Memory Management**: Use batch operations for bulk memory storage/retrieval
3. **Error Handling**: Implement proper retry logic with exponential backoff
4. **Performance**: Use async/await patterns consistently
5. **Security**: Never log sensitive data; use structured logging with correlation IDs
6. **Monitoring**: Implement health checks for all external dependencies

## Support and Troubleshooting

For issues with the enhanced trading system:

1. Check system status using `getSystemStatus()`
2. Review logs for error patterns
3. Verify database connectivity and migrations
4. Test individual components in isolation
5. Monitor performance metrics and alerts

---

*This documentation is automatically generated and updated with each release.*