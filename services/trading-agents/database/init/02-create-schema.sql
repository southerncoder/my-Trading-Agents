-- Trading Agents Database Schema
-- Optimized for async operations with proper indexing

-- ============================================================================
-- AGENT MEMORY TABLES
-- ============================================================================

-- Episodic Memory: Conversation history and interaction logs
CREATE TABLE IF NOT EXISTS episodic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interaction_type VARCHAR(50) NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_episodic_session_timestamp ON episodic_memory(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_user_agent ON episodic_memory(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_episodic_interaction_type ON episodic_memory(interaction_type);
CREATE INDEX IF NOT EXISTS idx_episodic_context_gin ON episodic_memory USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_episodic_metadata_gin ON episodic_memory USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory(timestamp DESC);

-- Semantic Memory: Long-term facts and knowledge with embeddings
CREATE TABLE IF NOT EXISTS semantic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimensions
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(255) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    related_entities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity index for embedding search
CREATE INDEX IF NOT EXISTS idx_semantic_embedding ON semantic_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_semantic_fact_type ON semantic_memory(fact_type);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_gin ON semantic_memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_semantic_entities_gin ON semantic_memory USING GIN(related_entities);
CREATE INDEX IF NOT EXISTS idx_semantic_confidence ON semantic_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_updated ON semantic_memory(updated_at DESC);

-- Working Memory: Active context with TTL expiration
CREATE TABLE IF NOT EXISTS working_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    context_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for working memory
CREATE INDEX IF NOT EXISTS idx_working_session_agent ON working_memory(session_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_working_expires ON working_memory(expires_at);
CREATE INDEX IF NOT EXISTS idx_working_priority ON working_memory(priority DESC);
CREATE INDEX IF NOT EXISTS idx_working_context_type ON working_memory(context_type);
CREATE INDEX IF NOT EXISTS idx_working_data_gin ON working_memory USING GIN(data);

-- Procedural Memory: Learned patterns and preferences
CREATE TABLE IF NOT EXISTS procedural_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern JSONB NOT NULL DEFAULT '{}',
    frequency INTEGER NOT NULL DEFAULT 1,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for procedural memory
CREATE INDEX IF NOT EXISTS idx_procedural_user_pattern ON procedural_memory(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_procedural_frequency ON procedural_memory(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_procedural_confidence ON procedural_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_procedural_last_used ON procedural_memory(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_procedural_pattern_gin ON procedural_memory USING GIN(pattern);

-- ============================================================================
-- PERFORMANCE AND ANALYTICS TABLES
-- ============================================================================

-- Performance Metrics: Strategy and system performance tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decision VARCHAR(10) NOT NULL CHECK (decision IN ('BUY', 'SELL', 'HOLD')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    risk_score DECIMAL(5,3),
    position_size DECIMAL(10,4),
    actual_return DECIMAL(10,6),
    benchmark_return DECIMAL(10,6),
    execution_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_strategy_timestamp ON performance_metrics(strategy_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_symbol_timestamp ON performance_metrics(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_decision ON performance_metrics(decision);
CREATE INDEX IF NOT EXISTS idx_performance_confidence ON performance_metrics(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_performance_risk_score ON performance_metrics(risk_score);
CREATE INDEX IF NOT EXISTS idx_performance_metadata_gin ON performance_metrics USING GIN(metadata);

-- Backtesting Results: Historical backtesting data
CREATE TABLE IF NOT EXISTS backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backtest_id VARCHAR(255) NOT NULL,
    strategy_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(15,2) NOT NULL,
    final_capital DECIMAL(15,2) NOT NULL,
    total_return DECIMAL(10,6) NOT NULL,
    annualized_return DECIMAL(10,6) NOT NULL,
    volatility DECIMAL(10,6) NOT NULL,
    sharpe_ratio DECIMAL(10,6),
    max_drawdown DECIMAL(10,6),
    win_rate DECIMAL(5,4),
    total_trades INTEGER NOT NULL DEFAULT 0,
    profitable_trades INTEGER NOT NULL DEFAULT 0,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for backtest results
CREATE INDEX IF NOT EXISTS idx_backtest_strategy_symbol ON backtest_results(strategy_name, symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_date_range ON backtest_results(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_backtest_performance ON backtest_results(total_return DESC, sharpe_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_created ON backtest_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_config_gin ON backtest_results USING GIN(configuration);

-- Trade History: Individual trade records
CREATE TABLE IF NOT EXISTS trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backtest_id VARCHAR(255),
    strategy_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    commission DECIMAL(10,4) DEFAULT 0,
    slippage DECIMAL(10,6) DEFAULT 0,
    market_impact DECIMAL(10,6) DEFAULT 0,
    execution_timestamp TIMESTAMPTZ NOT NULL,
    pnl DECIMAL(15,4),
    cumulative_pnl DECIMAL(15,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for trade history
CREATE INDEX IF NOT EXISTS idx_trade_strategy_symbol ON trade_history(strategy_id, symbol);
CREATE INDEX IF NOT EXISTS idx_trade_execution_time ON trade_history(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trade_backtest ON trade_history(backtest_id);
CREATE INDEX IF NOT EXISTS idx_trade_pnl ON trade_history(pnl DESC);
CREATE INDEX IF NOT EXISTS idx_trade_metadata_gin ON trade_history USING GIN(metadata);

-- ============================================================================
-- SYSTEM MONITORING TABLES
-- ============================================================================

-- System Health: System performance and health metrics
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    unit VARCHAR(20),
    status VARCHAR(20) NOT NULL CHECK (status IN ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN')),
    threshold_warning DECIMAL(15,6),
    threshold_critical DECIMAL(15,6),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for system health
CREATE INDEX IF NOT EXISTS idx_health_component_timestamp ON system_health(component, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_metric_timestamp ON system_health(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_health_timestamp ON system_health(timestamp DESC);

-- Alert History: System alerts and notifications
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    component VARCHAR(100),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alert history
CREATE INDEX IF NOT EXISTS idx_alert_type_created ON alert_history(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_acknowledged ON alert_history(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alert_resolved ON alert_history(resolved);
CREATE INDEX IF NOT EXISTS idx_alert_component ON alert_history(component);

-- ============================================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to clean up expired working memory
CREATE OR REPLACE FUNCTION cleanup_expired_working_memory()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM working_memory WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old performance metrics
CREATE OR REPLACE FUNCTION archive_old_performance_metrics(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In a real implementation, this would move data to an archive table
    -- For now, we'll just count what would be archived
    SELECT COUNT(*) INTO archived_count
    FROM performance_metrics
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update semantic memory embeddings
CREATE OR REPLACE FUNCTION update_semantic_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update semantic memory timestamps
CREATE TRIGGER trigger_semantic_memory_updated
    BEFORE UPDATE ON semantic_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_semantic_memory_timestamp();

-- Function to increment procedural memory frequency
CREATE OR REPLACE FUNCTION increment_procedural_frequency(memory_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE procedural_memory 
    SET frequency = frequency + 1,
        last_used = NOW(),
        updated_at = NOW()
    WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql;

-- Log successful schema creation
DO $$
BEGIN
    RAISE NOTICE 'Trading Agents database schema created successfully';
    RAISE NOTICE 'Tables created: episodic_memory, semantic_memory, working_memory, procedural_memory';
    RAISE NOTICE 'Tables created: performance_metrics, backtest_results, trade_history';
    RAISE NOTICE 'Tables created: system_health, alert_history';
    RAISE NOTICE 'Functions created: cleanup_expired_working_memory, archive_old_performance_metrics';
END $$;