-- Alert System Database Schema
-- 
-- This schema supports the comprehensive alerting and notification system
-- for the TradingAgents framework, including alert configurations, triggered alerts,
-- notification tracking, and performance metrics.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Alert Configurations Table
-- Stores the configuration for each alert rule
CREATE TABLE IF NOT EXISTS alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Alert condition configuration
    condition JSONB NOT NULL,
    threshold DECIMAL NOT NULL,
    timeframe INTEGER NOT NULL, -- minutes
    
    -- Notification configuration
    channels JSONB NOT NULL, -- Array of notification channel configs
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cooldown_period INTEGER NOT NULL DEFAULT 15, -- minutes
    
    -- Escalation configuration
    escalation_rules JSONB DEFAULT '[]',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_timeframe CHECK (timeframe > 0),
    CONSTRAINT valid_cooldown CHECK (cooldown_period >= 0)
);

-- Triggered Alerts Table
-- Stores instances of alerts that have been triggered
CREATE TABLE IF NOT EXISTS triggered_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
    strategy_id VARCHAR(255), -- Optional strategy identifier
    
    -- Alert details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Condition and values
    condition JSONB NOT NULL,
    actual_value JSONB, -- Can be number, string, or object
    threshold DECIMAL NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'escalated')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Acknowledgment tracking
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    
    -- Resolution tracking
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    
    -- Escalation tracking
    escalation_level INTEGER NOT NULL DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '[]',
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_escalation_level CHECK (escalation_level >= 0),
    CONSTRAINT acknowledged_fields_consistent CHECK (
        (acknowledged_by IS NULL AND acknowledged_at IS NULL) OR
        (acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
    )
);

-- Notification Log Table
-- Tracks all notification attempts and their results
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES triggered_alerts(id) ON DELETE CASCADE,
    
    -- Notification details
    channel_type VARCHAR(50) NOT NULL,
    channel_config JSONB NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    
    -- Message details
    subject VARCHAR(500),
    message TEXT NOT NULL,
    
    -- Delivery tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Error tracking
    error_message TEXT,
    last_attempt_at TIMESTAMPTZ,
    
    -- Provider response
    provider_response JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_attempts CHECK (attempts >= 0)
);

-- Alert Performance Metrics Table
-- Stores performance metrics for alert system monitoring
CREATE TABLE IF NOT EXISTS alert_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Alert volume metrics
    total_alerts INTEGER NOT NULL DEFAULT 0,
    alerts_by_severity JSONB NOT NULL DEFAULT '{}',
    alerts_by_strategy JSONB NOT NULL DEFAULT '{}',
    
    -- Response time metrics
    avg_acknowledgment_time INTERVAL,
    avg_resolution_time INTERVAL,
    
    -- Escalation metrics
    escalation_count INTEGER NOT NULL DEFAULT 0,
    escalation_rate DECIMAL(5,2),
    
    -- Notification metrics
    total_notifications INTEGER NOT NULL DEFAULT 0,
    successful_notifications INTEGER NOT NULL DEFAULT 0,
    failed_notifications INTEGER NOT NULL DEFAULT 0,
    notification_success_rate DECIMAL(5,2),
    
    -- System metrics
    false_positive_rate DECIMAL(5,2),
    alert_accuracy DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end > period_start),
    CONSTRAINT valid_rates CHECK (
        escalation_rate >= 0 AND escalation_rate <= 100 AND
        notification_success_rate >= 0 AND notification_success_rate <= 100 AND
        false_positive_rate >= 0 AND false_positive_rate <= 100 AND
        alert_accuracy >= 0 AND alert_accuracy <= 100
    )
);

-- Alert Configuration History Table
-- Tracks changes to alert configurations for audit purposes
CREATE TABLE IF NOT EXISTS alert_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
    
    -- Change tracking
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'enabled', 'disabled')),
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Configuration snapshot
    config_snapshot JSONB NOT NULL,
    
    -- Change details
    changes JSONB, -- Specific fields that changed
    reason TEXT
);

-- System Health Metrics Table
-- Stores system-wide health metrics for alert condition evaluation
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Performance metrics
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- System metrics
    system_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Market metrics
    market_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Strategy-specific metrics
    strategy_metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    source VARCHAR(100) NOT NULL DEFAULT 'system',
    version VARCHAR(50),
    
    -- Retention constraint (keep only recent data)
    CONSTRAINT recent_metrics CHECK (timestamp > NOW() - INTERVAL '30 days')
);

-- ==================== INDEXES ====================

-- Alert Configs Indexes
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON alert_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_configs_severity ON alert_configs(severity);
CREATE INDEX IF NOT EXISTS idx_alert_configs_created_by ON alert_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_alert_configs_tags ON alert_configs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_alert_configs_condition ON alert_configs USING GIN(condition);

-- Triggered Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_config_id ON triggered_alerts(config_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_strategy_id ON triggered_alerts(strategy_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_status ON triggered_alerts(status);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_severity ON triggered_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_timestamp ON triggered_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_acknowledged ON triggered_alerts(acknowledged_by, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_resolved ON triggered_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_escalation ON triggered_alerts(escalation_level);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_metadata ON triggered_alerts USING GIN(metadata);

-- Notification Log Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_alert_id ON notification_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel_type ON notification_log(channel_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);

-- Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_alert_performance_period ON alert_performance_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_alert_performance_created ON alert_performance_metrics(created_at DESC);

-- Config History Indexes
CREATE INDEX IF NOT EXISTS idx_alert_config_history_config_id ON alert_config_history(config_id);
CREATE INDEX IF NOT EXISTS idx_alert_config_history_changed_at ON alert_config_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_config_history_changed_by ON alert_config_history(changed_by);

-- System Health Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_source ON system_health_metrics(source);
CREATE INDEX IF NOT EXISTS idx_system_health_performance ON system_health_metrics USING GIN(performance_metrics);
CREATE INDEX IF NOT EXISTS idx_system_health_system ON system_health_metrics USING GIN(system_metrics);

-- ==================== TRIGGERS ====================

-- Update timestamp trigger for alert_configs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alert_configs_updated_at 
    BEFORE UPDATE ON alert_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Alert configuration change history trigger
CREATE OR REPLACE FUNCTION log_alert_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO alert_config_history (config_id, change_type, changed_by, config_snapshot)
        VALUES (NEW.id, 'created', NEW.created_by, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO alert_config_history (config_id, change_type, changed_by, config_snapshot, changes)
        VALUES (NEW.id, 'updated', NEW.created_by, row_to_json(NEW), 
                jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO alert_config_history (config_id, change_type, changed_by, config_snapshot)
        VALUES (OLD.id, 'deleted', 'system', row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER alert_config_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON alert_configs
    FOR EACH ROW EXECUTE FUNCTION log_alert_config_changes();

-- ==================== VIEWS ====================

-- Active Alerts View
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    ta.*,
    ac.name as config_name,
    ac.cooldown_period,
    ac.escalation_rules,
    EXTRACT(EPOCH FROM (NOW() - ta.timestamp))/60 as age_minutes
FROM triggered_alerts ta
JOIN alert_configs ac ON ta.config_id = ac.id
WHERE ta.status IN ('active', 'acknowledged', 'escalated')
ORDER BY ta.severity DESC, ta.timestamp DESC;

-- Alert Summary View
CREATE OR REPLACE VIEW alert_summary AS
SELECT 
    COUNT(*) as total_alerts,
    COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
    COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_alerts,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
    COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_alerts,
    COUNT(*) FILTER (WHERE severity = 'low') as low_alerts,
    AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp))/60) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes
FROM triggered_alerts
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Notification Performance View
CREATE OR REPLACE VIEW notification_performance AS
SELECT 
    channel_type,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE status = 'sent') as successful_notifications,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_notifications,
    ROUND(COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*), 2) as success_rate,
    AVG(attempts) as avg_attempts,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FILTER (WHERE sent_at IS NOT NULL) as avg_delivery_time_seconds
FROM notification_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel_type;

-- ==================== FUNCTIONS ====================

-- Function to get alert statistics for a time period
CREATE OR REPLACE FUNCTION get_alert_statistics(
    start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_alerts BIGINT,
    alerts_by_severity JSONB,
    alerts_by_strategy JSONB,
    avg_resolution_time INTERVAL,
    escalation_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_alerts,
        jsonb_object_agg(severity, severity_count) as alerts_by_severity,
        jsonb_object_agg(COALESCE(strategy_id, 'system'), strategy_count) as alerts_by_strategy,
        AVG(resolved_at - timestamp) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time,
        ROUND(COUNT(*) FILTER (WHERE escalation_level > 0) * 100.0 / COUNT(*), 2) as escalation_rate
    FROM (
        SELECT 
            severity,
            strategy_id,
            resolved_at,
            timestamp,
            escalation_level,
            COUNT(*) OVER (PARTITION BY severity) as severity_count,
            COUNT(*) OVER (PARTITION BY COALESCE(strategy_id, 'system')) as strategy_count
        FROM triggered_alerts
        WHERE timestamp BETWEEN start_time AND end_time
    ) subq;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_alert_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old resolved alerts
    DELETE FROM triggered_alerts 
    WHERE status = 'resolved' 
    AND resolved_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old notification logs
    DELETE FROM notification_log 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Delete old performance metrics
    DELETE FROM alert_performance_metrics 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Delete old system health metrics (keep only 30 days)
    DELETE FROM system_health_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== SAMPLE DATA ====================

-- Insert sample alert configurations (for testing)
INSERT INTO alert_configs (name, description, condition, threshold, timeframe, channels, severity, created_by)
VALUES 
    (
        'High Drawdown Alert',
        'Triggers when strategy drawdown exceeds threshold',
        '{"type": "threshold", "metric": "performance.maxDrawdown", "operator": "gt"}',
        0.15,
        60,
        '[{"type": "email", "config": {"to": ["admin@example.com"]}, "enabled": true, "retryAttempts": 3, "retryDelay": 5}]',
        'high',
        'system'
    ),
    (
        'Critical System Error Rate',
        'Triggers when system error rate is too high',
        '{"type": "threshold", "metric": "system.errorRate", "operator": "gt"}',
        0.05,
        15,
        '[{"type": "slack", "config": {"webhookUrl": "https://hooks.slack.com/...", "channel": "#alerts"}, "enabled": true, "retryAttempts": 2, "retryDelay": 3}]',
        'critical',
        'system'
    )
ON CONFLICT DO NOTHING;

-- Create a scheduled job to cleanup old data (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-alert-data', '0 2 * * *', 'SELECT cleanup_old_alert_data(90);');

COMMENT ON TABLE alert_configs IS 'Configuration for alert rules and notification settings';
COMMENT ON TABLE triggered_alerts IS 'Instances of alerts that have been triggered';
COMMENT ON TABLE notification_log IS 'Log of all notification attempts and their results';
COMMENT ON TABLE alert_performance_metrics IS 'Performance metrics for the alert system';
COMMENT ON TABLE alert_config_history IS 'Audit trail of changes to alert configurations';
COMMENT ON TABLE system_health_metrics IS 'System health metrics for alert condition evaluation';