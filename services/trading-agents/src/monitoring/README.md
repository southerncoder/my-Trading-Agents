# Trading Agents Monitoring System

## Overview

The Trading Agents Monitoring System provides comprehensive real-time monitoring, alerting, and analytics for the trading system. It integrates seamlessly with existing infrastructure including Winston logging, health monitoring, PostgreSQL storage, and Zep Graphiti memory.

## Features

### 🔍 Performance Monitoring
- Real-time strategy performance tracking
- Rolling window calculations (30d, 90d, 1y)
- Risk-adjusted metrics (Sharpe, Sortino, Calmar ratios)
- Drawdown analysis and attribution
- Strategy comparison and ranking

### 🚨 Intelligent Alerting
- Configurable alert rules and thresholds
- Multiple notification channels (email, Slack, webhooks, SMS)
- Alert acknowledgment and escalation workflows
- Cooldown periods and rate limiting
- Alert dashboard and management interface

### 🔬 Anomaly Detection
- Statistical anomaly detection (Z-score, percentile-based)
- Pattern recognition for unusual trading behavior
- Performance degradation detection
- Correlation break analysis
- Automated diagnosis and recommendations

### 💾 Data Storage & Memory
- PostgreSQL integration for time-series data
- Zep Graphiti integration for graph relationships
- Agent memory system (episodic, semantic, working, procedural)
- Vector similarity search with pgvector
- Automated data retention and cleanup

### 📊 Health Monitoring
- System health tracking and reporting
- Service dependency monitoring
- Circuit breaker patterns for resilience
- Resource usage monitoring
- Automatic failover and recovery

## Architecture

The monitoring system integrates with existing infrastructure while adding PostgreSQL for time-series monitoring data:

```
┌─────────────────────────────────────────────────────────────┐
│                 Integrated Monitoring System                │
├─────────────────────────────────────────────────────────────┤
│  Performance Monitor │ Alert Manager │ Anomaly Detector    │
├─────────────────────────────────────────────────────────────┤
│              Database Manager (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────┤
│  Winston Logging │ Health Monitor │ Resilience Manager     │
├─────────────────────────────────────────────────────────────┤
│     Zep Graphiti     │     Redis Cache     │    Neo4j       │
│   (Graph Memory)     │    (Caching)        │ (Knowledge)    │
│                      │                     │                │
│   PostgreSQL (NEW)   │                     │                │
│  (Time-series Data)  │                     │                │
└─────────────────────────────────────────────────────────────┘
```

### Database Usage Strategy

- **Neo4j**: Knowledge graphs and agent relationships (existing)
- **Redis**: Caching and session data (existing)  
- **Zep Graphiti**: Enhanced memory and AI processing (existing)
- **PostgreSQL**: Time-series monitoring data, alerts, and performance metrics (new)

## Quick Start

### 1. Environment Setup

Set up monitoring secrets and configuration:

```bash
# Option 1: Use the setup script (recommended)
./scripts/setup-monitoring-secrets.sh

# Option 2: Manual setup
cp .env.monitoring.example .env.local
# Edit .env.local with your configuration
```

The setup script will:
- Create a secure PostgreSQL password
- Set up Docker secrets
- Update your `.env.local` file

Manual configuration example:
```bash
# Database (PostgreSQL for monitoring data)
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=postgresql
POSTGRES_PORT=5432
POSTGRES_DB=trading_agents
POSTGRES_USER=postgres

# Monitoring
MONITORING_ENABLED=true
MONITORING_PERFORMANCE_ENABLED=true
MONITORING_ALERTS_ENABLED=true

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
ALERT_EMAIL_TO=admin@yourcompany.com
```

### 2. Docker Deployment

The monitoring extension adds PostgreSQL to the existing infrastructure:

```bash
# Start with monitoring enabled (adds PostgreSQL for time-series data)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Or start just the base system (uses existing Neo4j/Redis only)
docker compose up -d
```

**Important**: The monitoring system adds PostgreSQL as a **new service** specifically for time-series monitoring data. This complements (does not replace) the existing infrastructure:

- **Existing**: Neo4j (knowledge graphs), Redis (caching), Zep Graphiti (AI memory)
- **New**: PostgreSQL (performance metrics, alerts, anomaly detection data)

Each database serves a specific purpose and they work together to provide comprehensive functionality.

### 3. Programmatic Usage

```typescript
import { initializeMonitoringSystem } from './monitoring';

// Initialize for production
const result = await initializeMonitoringSystem({
  environment: 'production',
  enablePerformanceMonitoring: true,
  enableAnomalyDetection: true,
  enableAlerting: true,
  waitForDependencies: true
});

if (result.success) {
  console.log('Monitoring system initialized successfully');
  const status = await result.monitoringSystem.getSystemStatus();
  console.log('System health:', status.metrics.systemHealth);
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITORING_ENABLED` | `true` | Enable/disable monitoring system |
| `MONITORING_PERFORMANCE_ENABLED` | `true` | Enable performance tracking |
| `MONITORING_PERFORMANCE_INTERVAL` | `30000` | Performance tracking interval (ms) |
| `MONITORING_ALERTS_ENABLED` | `true` | Enable alerting system |
| `MONITORING_ANOMALY_DETECTION_ENABLED` | `true` | Enable anomaly detection |
| `MONITORING_SHARPE_THRESHOLD` | `0.5` | Sharpe ratio alert threshold |
| `MONITORING_DRAWDOWN_THRESHOLD` | `0.2` | Max drawdown alert threshold |
| `MONITORING_VOLATILITY_THRESHOLD` | `0.3` | Volatility alert threshold |
| `MONITORING_LOG_LEVEL` | `info` | Logging level |

### Database Configuration

```typescript
const config = {
  postgresql: {
    host: 'localhost',
    port: 5432,
    database: 'trading_agents',
    username: 'postgres',
    password: 'password',
    ssl: false,
    poolSize: 10
  },
  pgvector: {
    enabled: true,
    embeddingDimensions: 1536,
    similarityThreshold: 0.8
  }
};
```

### Alert Configuration

```typescript
const alertConfig = {
  name: 'Low Sharpe Ratio Alert',
  condition: {
    type: 'threshold',
    metric: 'sharpeRatio',
    operator: 'lt'
  },
  threshold: 0.5,
  channels: [
    {
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#trading-alerts'
      }
    }
  ],
  severity: 'medium'
};
```

## API Reference

### IntegratedMonitoringSystem

```typescript
class IntegratedMonitoringSystem {
  async initialize(): Promise<void>
  async getSystemStatus(): Promise<MonitoringSystemStatus>
  async collectIntegratedMetrics(): Promise<IntegratedMetrics>
  async processSystemAlerts(): Promise<void>
  async generateDashboardData(): Promise<any>
  async shutdown(): Promise<void>
}
```

### PerformanceMonitor

```typescript
class PerformanceMonitor {
  async trackStrategyPerformance(strategyId: string, performance: PerformanceMetrics): Promise<void>
  async calculateRollingMetrics(strategyId: string, window: number): Promise<RollingMetrics>
  async compareStrategies(strategyIds: string[], timeframe: TimeFrame): Promise<StrategyComparison>
}
```

### AlertManager

```typescript
class AlertManager {
  async createAlert(config: AlertConfig): Promise<string>
  async checkAlerts(currentMetrics: SystemMetrics): Promise<TriggeredAlert[]>
  async acknowledgeAlert(alertId: string, userId: string): Promise<void>
  async getAlertDashboard(): Promise<AlertDashboard>
}
```

### AnomalyDetector

```typescript
class AnomalyDetector {
  async detectPerformanceAnomalies(performance: PerformanceMetrics[]): Promise<Anomaly[]>
  async recognizeUnusualPatterns(strategyId: string, performance: PerformanceMetrics[]): Promise<PatternAnomaly[]>
  async diagnosePerformanceIssues(strategyId: string, performance: PerformanceMetrics[]): Promise<PerformanceDiagnosis>
}
```

## Database Schema

The monitoring system uses PostgreSQL with the following key tables:

- `performance_metrics` - Time-series performance data
- `alert_configs` - Alert configuration rules
- `triggered_alerts` - Alert history and status
- `detected_anomalies` - Statistical anomalies
- `pattern_anomalies` - Pattern-based anomalies
- `system_health_snapshots` - System health history
- `episodic_memory` - Agent conversation history
- `semantic_memory` - Knowledge with vector embeddings
- `working_memory` - Active context with TTL
- `procedural_memory` - Learned patterns and preferences

### Vector Search

The system uses pgvector for semantic similarity search:

```sql
-- Find similar trading patterns
SELECT content, 1 - (embedding <=> $1) AS similarity
FROM semantic_memory
WHERE fact_type = 'trading_pattern'
ORDER BY embedding <=> $1
LIMIT 10;
```

## Notification Channels

### Slack Integration

```typescript
const slackChannel = {
  type: 'slack',
  config: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    channel: '#trading-alerts',
    username: 'Trading Agents',
    iconEmoji: ':warning:'
  }
};
```

### Email Integration

```typescript
const emailChannel = {
  type: 'email',
  config: {
    to: ['admin@company.com', 'trader@company.com'],
    subject: 'Trading Alert',
    template: 'alert_email'
  }
};
```

### Webhook Integration

```typescript
const webhookChannel = {
  type: 'webhook',
  config: {
    url: 'https://your-endpoint.com/alerts',
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' }
  }
};
```

## Monitoring Dashboards

### System Health Dashboard

```typescript
const dashboard = await monitoringSystem.generateDashboardData();

console.log('System Overview:', {
  health: dashboard.overview.systemHealth,
  uptime: dashboard.overview.uptime,
  activeAlerts: dashboard.overview.activeAlerts,
  strategiesTracked: dashboard.overview.strategiesTracked
});
```

### Performance Analytics

```typescript
const comparison = await performanceMonitor.compareStrategies(
  ['strategy1', 'strategy2', 'strategy3'],
  { start: new Date('2024-01-01'), end: new Date(), period: '1y' }
);

console.log('Top Performer:', comparison.riskAdjustedRanking[0]);
console.log('Correlation Matrix:', comparison.correlationMatrix);
```

## Best Practices

### 1. Configuration Management

- Use environment-specific configurations
- Validate configuration before deployment
- Keep sensitive data in environment variables
- Use Docker secrets for production

### 2. Alert Management

- Set appropriate thresholds to avoid alert fatigue
- Use escalation rules for critical alerts
- Implement cooldown periods
- Test notification channels regularly

### 3. Performance Optimization

- Use connection pooling for database access
- Implement caching for frequently accessed data
- Monitor resource usage and adjust limits
- Use batch operations for bulk data processing

### 4. Security

- Enable SSL/TLS for database connections
- Use strong passwords and API keys
- Implement proper access controls
- Encrypt sensitive data at rest

### 5. Data Retention

- Set appropriate retention periods
- Implement automated cleanup procedures
- Archive historical data for compliance
- Monitor storage usage and costs

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL status
   docker compose logs postgresql
   
   # Test connection
   psql -h localhost -U postgres -d trading_agents
   ```

2. **High Memory Usage**
   ```bash
   # Monitor memory usage
   docker stats trading-agents-cli
   
   # Adjust memory limits in docker-compose.monitoring.yml
   ```

3. **Alert Delivery Issues**
   ```bash
   # Check notification logs
   docker compose logs trading-agents-cli | grep notification
   
   # Test webhook endpoints
   curl -X POST https://your-webhook-url.com/test
   ```

4. **Performance Issues**
   ```sql
   -- Check database performance
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   
   -- Monitor query performance
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC;
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=trading-agents:monitoring*
export MONITORING_LOG_LEVEL=debug
export MONITORING_DEBUG_MODE=true
```

### Health Checks

```typescript
// Check monitoring system health
const health = await checkMonitoringSystemHealth(monitoringSystem);
if (!health.healthy) {
  console.error('Health issues:', health.issues);
}

// Get comprehensive status
const status = await getMonitoringSystemStatus(monitoringSystem);
console.log('System status:', status);
```

## Development

### Running Tests

```bash
# Unit tests
npm run test:monitoring

# Integration tests
npm run test:monitoring:integration

# Performance tests
npm run test:monitoring:performance
```

### Local Development

```bash
# Start local PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=trading_agents \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Initialize monitoring
npm run monitoring:init

# Start monitoring system
npm run monitoring:start
```

### Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Use structured logging for debugging
5. Implement proper error handling

## License

This monitoring system is part of the Trading Agents framework and follows the same license terms.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review logs for error messages
- Test individual components in isolation
- Verify configuration and environment variables