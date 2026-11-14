-- Additional optimized indexes for concurrent access
-- These indexes are specifically designed for high-performance async operations

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Episodic memory composite indexes
CREATE INDEX IF NOT EXISTS idx_episodic_user_session_time ON episodic_memory(user_id, session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_agent_interaction_time ON episodic_memory(agent_id, interaction_type, timestamp DESC);

-- Semantic memory composite indexes
CREATE INDEX IF NOT EXISTS idx_semantic_type_confidence ON semantic_memory(fact_type, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_source_updated ON semantic_memory(source, updated_at DESC);

-- Performance metrics composite indexes
CREATE INDEX IF NOT EXISTS idx_performance_symbol_decision_time ON performance_metrics(symbol, decision, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_strategy_confidence ON performance_metrics(strategy_id, confidence DESC);

-- Backtest results composite indexes
CREATE INDEX IF NOT EXISTS idx_backtest_symbol_return ON backtest_results(symbol, total_return DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_strategy_sharpe ON backtest_results(strategy_name, sharpe_ratio DESC);

-- Trade history composite indexes
CREATE INDEX IF NOT EXISTS idx_trade_symbol_time_type ON trade_history(symbol, execution_timestamp DESC, trade_type);
CREATE INDEX IF NOT EXISTS idx_trade_strategy_pnl ON trade_history(strategy_id, pnl DESC);

-- ============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================================================

-- Index only unresolved alerts
CREATE INDEX IF NOT EXISTS idx_alert_unresolved ON alert_history(created_at DESC) WHERE resolved = FALSE;

-- Index only high-severity alerts
CREATE INDEX IF NOT EXISTS idx_alert_high_severity ON alert_history(created_at DESC) WHERE severity IN ('HIGH', 'CRITICAL');

-- Index only profitable trades
CREATE INDEX IF NOT EXISTS idx_trade_profitable ON trade_history(execution_timestamp DESC) WHERE pnl > 0;

-- Index only recent performance metrics (last 30 days)
CREATE INDEX IF NOT EXISTS idx_performance_recent ON performance_metrics(timestamp DESC) WHERE timestamp > NOW() - INTERVAL '30 days';

-- ============================================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- ============================================================================

-- Index for extracting specific JSONB fields
CREATE INDEX IF NOT EXISTS idx_episodic_context_symbol ON episodic_memory((context->>'symbol')) WHERE context ? 'symbol';
CREATE INDEX IF NOT EXISTS idx_performance_metadata_risk ON performance_metrics((metadata->>'risk_level')) WHERE metadata ? 'risk_level';

-- ============================================================================
-- CONCURRENT INDEX CREATION SETTINGS
-- ============================================================================

-- Set maintenance_work_mem for index creation (will be reset after)
SET maintenance_work_mem = '256MB';

-- Enable parallel index builds
SET max_parallel_maintenance_workers = 4;

-- ============================================================================
-- STATISTICS AND ANALYSIS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE episodic_memory;
ANALYZE semantic_memory;
ANALYZE working_memory;
ANALYZE procedural_memory;
ANALYZE performance_metrics;
ANALYZE backtest_results;
ANALYZE trade_history;
ANALYZE system_health;
ANALYZE alert_history;

-- Log successful index creation
DO $$
BEGIN
    RAISE NOTICE 'Optimized indexes created successfully';
    RAISE NOTICE 'Composite indexes: user_session_time, agent_interaction_time, type_confidence';
    RAISE NOTICE 'Partial indexes: unresolved_alerts, high_severity, profitable_trades';
    RAISE NOTICE 'Expression indexes: context_symbol, metadata_risk';
    RAISE NOTICE 'Table statistics updated for optimal query planning';
END $$;