-- =====================================================================================
-- Trading Agents Monitoring System Database Schema
-- =====================================================================================
-- This schema extends the existing PostgreSQL database with monitoring-specific tables
-- for performance tracking, alerting, anomaly detection, and system health monitoring.
-- 
-- Compatible with existing database structure and pgvector extension.
-- =====================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For semantic similarity search

-- =====================================================================================
-- PERFORMANCE MONITORING TABLES
-- =====================================================================================

-- Enhanced performance metrics table with time-series optimization
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metrics JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance optimization indexes
    CONSTRAINT performance_metrics_timestamp_check CHECK (timestamp <= NOW() + INTERVAL '1 hour')
);

-- Partitioning for performance metrics (monthly partitions)
-- This will be created dynamically by the application

-- Time-series indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_strategy_timestamp 
ON performance_metrics(strategy_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp_only 
ON performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_metrics_gin 
ON performance_metrics USING GIN(metrics);

-- =====================================================================================
-- ALERT MANAGEMENT TABLES
-- =====================================================================================

-- Alert configurations table
CREATE TABLE IF NOT EXISTS alert_configs (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    condition JSONB NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    timeframe INTEGER NOT NULL, -- minutes
    channels JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cooldown_period INTEGER NOT NULL DEFAULT 15, -- minutes
    escalation_rules JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT alert_configs_name_unique UNIQUE (name),
    CONSTRAINT alert_configs_threshold_positive CHECK (threshold >= 0),
    CONSTRAINT alert_configs_timeframe_positive CHECK (timeframe > 0),
    CONSTRAINT alert_configs_cooldown_positive CHECK (cooldown_period >= 0)
);

-- Triggered alerts table
CREATE TABLE IF NOT EXISTS triggered_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
    strategy_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    condition JSONB NOT NULL,
    actual_value DOUBLE PRECISION NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'escalated')),
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    notifications_sent JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT triggered_alerts_escalation_level_check CHECK (escalation_level >= 0),
    CONSTRAINT triggered_alerts_acknowledged_check CHECK (
        (status = 'acknowledged' AND acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL) OR
        (status != 'acknowledged')
    ),
    CONSTRAINT triggered_alerts_resolved_check CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL) OR
        (status != 'resolved')
    )
);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON alert_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_configs_severity ON alert_configs(severity);
CREATE INDEX IF NOT EXISTS idx_alert_configs_tags_gin ON alert_configs USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_triggered_alerts_config_id ON triggered_alerts(config_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_strategy_id ON triggered_alerts(strategy_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_status_timestamp ON triggered_alerts(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_severity_timestamp ON triggered_alerts(severity, timestamp DESC);

-- =====================================================================================
-- ANOMALY DETECTION TABLES
-- =====================================================================================

-- Detected anomalies table
CREATE TABLE IF NOT EXISTS detected_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id VARCHAR(255) NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN (
        'performance_degradation', 'unusual_volatility', 'correlation_break', 'drawdown_spike',
        'z_score', 'percentile', 'iqr', 'isolation_forest'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metrics JSONB NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    actual_value DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT detected_anomalies_confidence_range CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT detected_anomalies_resolved_check CHECK (
        (resolved = true AND resolved_at IS NOT NULL) OR
        (resolved = false)
    )
);

-- Pattern anomalies table
CREATE TABLE IF NOT EXISTS pattern_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
        'consecutive_losses', 'correlation_break', 'regime_change', 'volume_spike'
    )),
    description TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    duration INTEGER NOT NULL, -- hours
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT pattern_anomalies_duration_positive CHECK (duration > 0),
    CONSTRAINT pattern_anomalies_confidence_range CHECK (confidence BETWEEN 0 AND 1)
);

-- Anomaly indexes
CREATE INDEX IF NOT EXISTS idx_detected_anomalies_strategy_timestamp 
ON detected_anomalies(strategy_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_detected_anomalies_type_severity 
ON detected_anomalies(anomaly_type, severity);

CREATE INDEX IF NOT EXISTS idx_detected_anomalies_resolved 
ON detected_anomalies(resolved, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_anomalies_strategy_timestamp 
ON pattern_anomalies(strategy_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_anomalies_type_severity 
ON pattern_anomalies(pattern_type, severity);

-- =====================================================================================
-- SYSTEM HEALTH MONITORING TABLES
-- =====================================================================================

-- System health snapshots
CREATE TABLE IF NOT EXISTS system_health_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    uptime BIGINT NOT NULL, -- milliseconds
    services JSONB NOT NULL,
    performance_metrics JSONB NOT NULL,
    alerts JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT system_health_uptime_positive CHECK (uptime >= 0)
);

-- Service health history
CREATE TABLE IF NOT EXISTS service_health_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time INTEGER, -- milliseconds
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT service_health_response_time_positive CHECK (response_time IS NULL OR response_time >= 0)
);

-- Health monitoring indexes
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_timestamp 
ON system_health_snapshots(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_status 
ON system_health_snapshots(overall_status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_service_health_history_service_timestamp 
ON service_health_history(service_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_service_health_history_status 
ON service_health_history(status, timestamp DESC);

-- =====================================================================================
-- INTEGRATED METRICS TABLES
-- =====================================================================================

-- Comprehensive integrated metrics table
CREATE TABLE IF NOT EXISTS integrated_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    system_metrics JSONB NOT NULL,
    performance_metrics JSONB NOT NULL,
    database_metrics JSONB NOT NULL,
    resilience_metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-series data table for general metrics
CREATE TABLE IF NOT EXISTS time_series_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    metric VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrated metrics indexes
CREATE INDEX IF NOT EXISTS idx_integrated_metrics_timestamp 
ON integrated_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_time_series_metric_timestamp 
ON time_series_data(metric, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_time_series_tags_gin 
ON time_series_data USING GIN(tags);

-- =====================================================================================
-- AGENT MEMORY TABLES (Enhanced for Monitoring)
-- =====================================================================================

-- Episodic Memory: Conversation history and interaction logs
CREATE TABLE IF NOT EXISTS episodic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
        'analysis_request', 'strategy_execution', 'risk_assessment', 'user_feedback',
        'performance_review', 'alert_response', 'anomaly_investigation'
    )),
    context JSONB NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semantic Memory: Long-term facts and knowledge with embeddings
CREATE TABLE IF NOT EXISTS semantic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_type VARCHAR(50) NOT NULL CHECK (fact_type IN (
        'market_knowledge', 'strategy_rule', 'risk_principle', 'user_insight',
        'performance_pattern', 'anomaly_signature', 'alert_resolution'
    )),
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimensions
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(255) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    related_entities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Working Memory: Active context with TTL expiration
CREATE TABLE IF NOT EXISTS working_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
        'active_analysis', 'pending_decision', 'recent_interaction',
        'monitoring_context', 'alert_context', 'performance_context'
    )),
    data JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT working_memory_priority_range CHECK (priority >= 0 AND priority <= 10),
    CONSTRAINT working_memory_expires_future CHECK (expires_at > created_at)
);

-- Procedural Memory: Learned patterns and preferences
CREATE TABLE IF NOT EXISTS procedural_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
        'trading_preference', 'risk_tolerance', 'analysis_style', 'notification_preference',
        'alert_preference', 'monitoring_preference', 'performance_expectation'
    )),
    pattern JSONB NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT procedural_memory_frequency_positive CHECK (frequency > 0)
);

-- Agent memory indexes
CREATE INDEX IF NOT EXISTS idx_episodic_session_timestamp 
ON episodic_memory(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_episodic_user_agent 
ON episodic_memory(user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_episodic_interaction_type 
ON episodic_memory(interaction_type);

CREATE INDEX IF NOT EXISTS idx_episodic_context_gin 
ON episodic_memory USING GIN(context);

-- Vector similarity index for embedding search
CREATE INDEX IF NOT EXISTS idx_semantic_embedding 
ON semantic_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_semantic_fact_type 
ON semantic_memory(fact_type);

CREATE INDEX IF NOT EXISTS idx_semantic_tags_gin 
ON semantic_memory USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_working_memory_session_expires 
ON working_memory(session_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_working_memory_agent_context 
ON working_memory(agent_id, context_type);

CREATE INDEX IF NOT EXISTS idx_working_memory_priority 
ON working_memory(priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_procedural_memory_user_pattern 
ON procedural_memory(user_id, pattern_type);

CREATE INDEX IF NOT EXISTS idx_procedural_memory_frequency 
ON procedural_memory(frequency DESC, last_used DESC);

-- =====================================================================================
-- MONITORING VIEWS FOR ANALYTICS
-- =====================================================================================

-- Performance summary view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    strategy_id,
    DATE_TRUNC('day', timestamp) as date,
    COUNT(*) as metric_count,
    AVG((metrics->>'sharpeRatio')::DOUBLE PRECISION) as avg_sharpe_ratio,
    AVG((metrics->>'totalReturn')::DOUBLE PRECISION) as avg_total_return,
    AVG((metrics->>'maxDrawdown')::DOUBLE PRECISION) as avg_max_drawdown,
    AVG((metrics->>'volatility')::DOUBLE PRECISION) as avg_volatility,
    AVG((metrics->>'winRate')::DOUBLE PRECISION) as avg_win_rate
FROM performance_metrics 
WHERE metrics ? 'sharpeRatio' 
GROUP BY strategy_id, DATE_TRUNC('day', timestamp)
ORDER BY date DESC, strategy_id;

-- Alert summary view
CREATE OR REPLACE VIEW alert_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    severity,
    status,
    COUNT(*) as alert_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, acknowledged_at, NOW()) - timestamp))/60) as avg_resolution_time_minutes
FROM triggered_alerts 
GROUP BY DATE_TRUNC('day', timestamp), severity, status
ORDER BY date DESC, severity;

-- System health summary view
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    overall_status,
    COUNT(*) as snapshot_count,
    AVG(uptime) as avg_uptime,
    AVG((performance_metrics->>'memoryUsage')::DOUBLE PRECISION) as avg_memory_usage
FROM system_health_snapshots 
GROUP BY DATE_TRUNC('hour', timestamp), overall_status
ORDER BY hour DESC, overall_status;

-- =====================================================================================
-- MONITORING FUNCTIONS
-- =====================================================================================

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Clean up old performance metrics
    DELETE FROM performance_metrics WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old system health snapshots
    DELETE FROM system_health_snapshots WHERE created_at < cutoff_date;
    
    -- Clean up old service health history
    DELETE FROM service_health_history WHERE created_at < cutoff_date;
    
    -- Clean up old integrated metrics
    DELETE FROM integrated_metrics WHERE created_at < cutoff_date;
    
    -- Clean up old time series data
    DELETE FROM time_series_data WHERE created_at < cutoff_date;
    
    -- Clean up resolved anomalies older than retention period
    DELETE FROM detected_anomalies WHERE resolved = true AND resolved_at < cutoff_date;
    DELETE FROM pattern_anomalies WHERE resolved = true AND resolved_at < cutoff_date;
    
    -- Clean up resolved alerts older than retention period
    DELETE FROM triggered_alerts WHERE status = 'resolved' AND resolved_at < cutoff_date;
    
    -- Clean up expired working memory
    DELETE FROM working_memory WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitoring statistics
CREATE OR REPLACE FUNCTION get_monitoring_statistics()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.n_tup_ins - t.n_tup_del as row_count,
        pg_total_relation_size(c.oid) as size_bytes
    FROM pg_stat_user_tables t
    JOIN pg_class c ON c.relname = t.relname
    WHERE t.schemaname = 'public' 
    AND t.relname IN (
        'performance_metrics', 'alert_configs', 'triggered_alerts',
        'detected_anomalies', 'pattern_anomalies', 'system_health_snapshots',
        'service_health_history', 'integrated_metrics', 'time_series_data',
        'episodic_memory', 'semantic_memory', 'working_memory', 'procedural_memory'
    )
    ORDER BY size_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- MONITORING TRIGGERS
-- =====================================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_alert_configs_updated_at 
    BEFORE UPDATE ON alert_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semantic_memory_updated_at 
    BEFORE UPDATE ON semantic_memory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procedural_memory_updated_at 
    BEFORE UPDATE ON procedural_memory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================================================

-- Insert default alert configurations
INSERT INTO alert_configs (
    id, name, description, condition, threshold, timeframe, channels, severity, created_by
) VALUES 
(
    uuid_generate_v4(),
    'Low Sharpe Ratio Alert',
    'Alert when strategy Sharpe ratio falls below threshold',
    '{"type": "threshold", "metric": "sharpeRatio", "operator": "lt"}',
    0.5,
    60,
    '[{"type": "console", "config": {"logLevel": "warn"}, "enabled": true, "retryAttempts": 1, "retryDelay": 0}]',
    'medium',
    'system'
),
(
    uuid_generate_v4(),
    'High Drawdown Alert',
    'Alert when maximum drawdown exceeds threshold',
    '{"type": "threshold", "metric": "maxDrawdown", "operator": "gt"}',
    0.2,
    30,
    '[{"type": "console", "config": {"logLevel": "error"}, "enabled": true, "retryAttempts": 1, "retryDelay": 0}]',
    'high',
    'system'
),
(
    uuid_generate_v4(),
    'System Health Critical',
    'Alert when system health becomes critical',
    '{"type": "threshold", "metric": "systemHealth", "operator": "eq", "value": "unhealthy"}',
    1,
    5,
    '[{"type": "console", "config": {"logLevel": "error"}, "enabled": true, "retryAttempts": 1, "retryDelay": 0}]',
    'critical',
    'system'
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE performance_metrics IS 'Stores time-series performance metrics for trading strategies';
COMMENT ON TABLE alert_configs IS 'Configuration for monitoring alerts and notification rules';
COMMENT ON TABLE triggered_alerts IS 'History of triggered alerts and their resolution status';
COMMENT ON TABLE detected_anomalies IS 'Statistical anomalies detected in performance metrics';
COMMENT ON TABLE pattern_anomalies IS 'Pattern-based anomalies in trading behavior';
COMMENT ON TABLE system_health_snapshots IS 'Periodic snapshots of overall system health';
COMMENT ON TABLE service_health_history IS 'Historical health status of individual services';
COMMENT ON TABLE integrated_metrics IS 'Comprehensive system metrics combining all monitoring data';
COMMENT ON TABLE time_series_data IS 'General-purpose time-series data storage';
COMMENT ON TABLE episodic_memory IS 'Agent conversation history and interaction logs';
COMMENT ON TABLE semantic_memory IS 'Long-term knowledge with vector embeddings for similarity search';
COMMENT ON TABLE working_memory IS 'Active context with automatic expiration';
COMMENT ON TABLE procedural_memory IS 'Learned patterns and user preferences';

COMMENT ON FUNCTION cleanup_old_monitoring_data IS 'Removes monitoring data older than specified retention period';
COMMENT ON FUNCTION get_monitoring_statistics IS 'Returns row counts and storage sizes for monitoring tables';

-- =====================================================================================
-- SCHEMA VERSION AND METADATA
-- =====================================================================================

-- Create metadata table for schema versioning
CREATE TABLE IF NOT EXISTS monitoring_schema_metadata (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    checksum VARCHAR(64)
);

-- Insert current schema version
INSERT INTO monitoring_schema_metadata (version, description, checksum) 
VALUES (
    '1.0.0', 
    'Initial monitoring system schema with performance tracking, alerting, anomaly detection, and agent memory',
    'monitoring_schema_v1_0_0'
) ON CONFLICT (version) DO NOTHING;

-- =====================================================================================
-- END OF SCHEMA
-- =====================================================================================