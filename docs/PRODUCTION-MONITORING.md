# Production Monitoring and Observability Guide

This guide covers the comprehensive production monitoring and observability system for the Trading Agents platform.

## Overview

The production monitoring system provides:

- **Production Logging**: Optimized logging with security, performance, and compliance features
- **Real-time Dashboards**: System health, performance, and trading metrics visualization
- **Intelligent Alerting**: Configurable alerts with escalation rules and multiple notification channels
- **Automated Backups**: Scheduled backups with retention policies and disaster recovery procedures
- **Government Data Monitoring**: Specialized monitoring for SEC, FRED, BLS, and Census APIs
- **Health Monitoring**: Comprehensive system health tracking and anomaly detection

## Quick Start

### 1. Environment Configuration

Copy the monitoring configuration template:

```bash
# Copy monitoring environment template
cp .env.monitoring.example .env.monitoring.local

# Edit configuration
nano .env.monitoring.local
```

### 2. Initialize Monitoring System

```typescript
import { DatabaseManager } from './database/database-manager.js';
import { initializeCompleteMonitoringSystem } from './monitoring/index.js';

// Initialize database manager
const dbManager = new DatabaseManager();
await dbManager.initializeConnections();

// Initialize monitoring system
const { integratedMonitoring, productionMonitoring } = await initializeCompleteMonitoringSystem(
  dbManager,
  {
    environment: 'production',
    enabled: true
  }
);
```

### 3. Start with Docker Compose

```bash
# Start with monitoring enabled
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

## Configuration

### Environment Variables

#### Core Monitoring Settings

```bash
# Enable/disable monitoring
MONITORING_ENABLED=true
MONITORING_PERFORMANCE_ENABLED=true
MONITORING_ALERTS_ENABLED=true
MONITORING_ANOMALY_DETECTION_ENABLED=true

# Monitoring intervals
MONITORING_PERFORMANCE_INTERVAL=30000  # 30 seconds
MONITORING_HEALTH_CHECK_INTERVAL=60000 # 1 minute

# Alert thresholds
MONITORING_SHARPE_THRESHOLD=0.5
MONITORING_DRAWDOWN_THRESHOLD=0.2
MONITORING_VOLATILITY_THRESHOLD=0.3
```

#### Production Logging

```bash
# Logging configuration
PRODUCTION_LOG_LEVEL=info
PRODUCTION_LOG_FORMAT=json
PRODUCTION_LOG_CONSOLE=true
PRODUCTION_LOG_FILE=true
PRODUCTION_LOG_CLOUD=false

# Security settings
PRODUCTION_LOG_SANITIZE_SECRETS=true
PRODUCTION_LOG_SANITIZE_PII=true
PRODUCTION_LOG_RATE_LIMIT=true
```

#### Backup Configuration

```bash
# Backup settings
BACKUP_ENABLED=true
BACKUP_LOCAL_PATH=./backups
BACKUP_MAX_SIZE=50GB

# Cloud backup (optional)
BACKUP_S3_ENABLED=false
BACKUP_S3_BUCKET=trading-agents-backups
BACKUP_S3_REGION=us-east-1
```

#### Government Data Monitoring

```bash
# Government data monitoring
GOVERNMENT_DATA_MONITORING_ENABLED=true
GOVERNMENT_DATA_MONITORING_INTERVAL=60000

# Rate limit monitoring
SEC_RATE_LIMIT_WARNING=8    # 8/10 requests per second
FRED_RATE_LIMIT_WARNING=96  # 96/120 requests per minute
BLS_RATE_LIMIT_WARNING=400  # 400/500 requests per minute
```

#### Notification Channels

```bash
# Email notifications
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=alerts@company.com
SMTP_PASSWORD=your_smtp_password
ALERT_EMAIL_TO=admin@company.com,oncall@company.com

# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#trading-alerts

# Webhook notifications
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
WEBHOOK_AUTH_TOKEN=your_webhook_token

# PagerDuty integration
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
```

## Production Logging

### Features

- **Security**: Automatic secret sanitization and PII redaction
- **Performance**: Async logging with buffering and rate limiting
- **Compliance**: Structured JSON logging for audit trails
- **Cloud Integration**: Support for AWS CloudWatch, GCP Cloud Logging, Azure Log Analytics
- **Monitoring**: Built-in log metrics and error threshold alerting

### Configuration Example

```typescript
import { createProductionLogger } from './monitoring/production-logging-config.js';

const logger = createProductionLogger({
  level: 'info',
  format: 'json',
  enableCloudLogging: true,
  security: {
    sanitizeSecrets: true,
    sanitizePersonalData: true,
    rateLimiting: {
      enabled: true,
      maxLogsPerSecond: 100
    }
  },
  cloudConfig: {
    provider: 'aws',
    logGroup: '/trading-agents/production',
    region: 'us-east-1'
  }
});
```

## Dashboard System

### Available Dashboards

1. **System Overview**: High-level system health and key metrics
2. **Performance Dashboard**: Trading strategy performance and analytics
3. **Health Dashboard**: Infrastructure health and resource usage
4. **Alerts Dashboard**: Active alerts and alert trends
5. **Trading Dashboard**: Live trading metrics and positions
6. **Infrastructure Dashboard**: Container, database, and API metrics

### Accessing Dashboards

```typescript
import { createProductionDashboardManager } from './monitoring/production-dashboards.js';

const dashboardManager = createProductionDashboardManager(dbManager, monitoringSystem);
await dashboardManager.start();

// Get complete dashboard data
const dashboardData = await dashboardManager.getDashboardData();

// Export dashboard data
const jsonExport = await dashboardManager.exportDashboardData('json');
const csvExport = await dashboardManager.exportDashboardData('csv');
const prometheusExport = await dashboardManager.exportDashboardData('prometheus');
```

## Alerting System

### Pre-configured Alert Templates

#### System Health Alerts
- System health critical
- Database connection lost
- High memory usage
- Service response time high

#### Performance Alerts
- Low Sharpe ratio
- High drawdown
- Strategy performance degradation
- Consecutive losses

#### Infrastructure Alerts
- API rate limit exceeded
- Service unavailability
- Data staleness

#### Security Alerts
- Authentication failures
- Unusual API activity

#### Government Data Alerts
- SEC API rate limit warnings
- FRED API service failures
- Data freshness alerts

### Custom Alert Configuration

```typescript
import { createAlertTemplateManager } from './monitoring/production-alerting-templates.js';

const alertManager = createAlertTemplateManager();

// Add custom alert template
const customAlert = {
  id: 'custom-performance-alert',
  name: 'Custom Performance Alert',
  category: 'performance',
  severity: 'high',
  condition: {
    type: 'threshold',
    metric: 'performance.customMetric',
    operator: 'lt',
    value: 0.1
  },
  threshold: 0.1,
  timeframe: 30,
  cooldownPeriod: 60,
  escalationRules: [
    {
      level: 1,
      delay: 0,
      channels: [
        {
          type: 'slack',
          name: 'performance_slack',
          config: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: '#trading-performance'
          },
          enabled: true,
          retryAttempts: 2,
          retryDelay: 15
        }
      ]
    }
  ],
  enabled: true,
  tags: ['custom', 'performance']
};

alertManager.addTemplate(customAlert);
```

## Backup and Recovery

### Automated Backup Schedule

- **Database Backup**: Daily at 2 AM
- **Logs Backup**: Daily at 1 AM  
- **Configuration Backup**: Weekly on Sunday at 3 AM
- **Full System Backup**: Weekly on Sunday at 4 AM

### Backup Types

1. **Database Backup**: PostgreSQL and Neo4j databases
2. **Logs Backup**: Application and system logs
3. **Configuration Backup**: Environment files, Docker configs, secrets
4. **Full System Backup**: Complete system state

### Manual Backup Operations

```typescript
import { createBackupRecoveryManager } from './monitoring/backup-recovery-procedures.js';

const backupManager = createBackupRecoveryManager(dbManager);
await backupManager.start();

// Perform manual backups
const dbBackup = await backupManager.backupDatabase();
const logsBackup = await backupManager.backupLogs();
const configBackup = await backupManager.backupConfiguration();
const fullBackup = await backupManager.fullBackup();

// List available backups
const backups = backupManager.listBackups();

// Restore from backup
await backupManager.restoreFromBackup(backupId, { dryRun: true });
await backupManager.restoreFromBackup(backupId, { force: true });
```

### Recovery Procedures

#### Database Recovery
1. Stop trading agents service
2. Verify backup integrity
3. Create pre-recovery backup
4. Restore PostgreSQL database
5. Restore Neo4j database
6. Start services
7. Verify system health

#### Full System Recovery
1. Stop all services
2. Verify all backup components
3. Restore configuration files
4. Restore databases
5. Start system
6. Verify system health

## Government Data Monitoring

### Monitored Services

1. **SEC (Securities and Exchange Commission)**
   - Rate limit: 10 requests/second
   - Compliance monitoring
   - Filing data freshness

2. **FRED (Federal Reserve Economic Data)**
   - Rate limit: 120 requests/minute
   - Economic data availability
   - Series data completeness

3. **BLS (Bureau of Labor Statistics)**
   - Rate limit: 500 requests/minute
   - Employment data monitoring
   - API version compliance

4. **Census Bureau**
   - Demographic data availability
   - Service health monitoring
   - Data quality validation

### Monitoring Features

```typescript
import { createGovernmentDataMonitor } from './monitoring/government-data-monitoring.js';

const govDataMonitor = createGovernmentDataMonitor(dbManager);
await govDataMonitor.start();

// Record API requests for rate limiting
govDataMonitor.recordAPIRequest('sec', true, 1200, '/company/tickers');
govDataMonitor.recordAPIRequest('fred', false, 5000, '/series/observations');

// Get current metrics
const metrics = govDataMonitor.getCurrentMetrics();

// Get service health status
const healthStatus = await govDataMonitor.getServiceHealthStatus();

// Generate dashboard data
const dashboardData = await govDataMonitor.generateDashboardData();
```

## Health Monitoring Integration

The production monitoring system integrates with the existing health monitoring infrastructure:

```typescript
import { healthMonitor, getSystemHealth } from '../utils/health-monitor.js';

// Start health monitoring
healthMonitor.start();

// Get current system health
const systemHealth = getSystemHealth();

// Check specific service health
const serviceHealth = await healthMonitor.performHealthCheck();
```

## Performance Optimization

### Logging Performance
- Async logging with buffering
- Rate limiting to prevent log flooding
- Sampling for high-volume logs
- Compression for log files

### Dashboard Performance
- Real-time data caching
- Configurable refresh intervals
- Data aggregation and summarization
- Efficient database queries

### Monitoring Performance
- Batch operations for metrics collection
- Connection pooling for database operations
- Circuit breakers for external services
- Intelligent caching strategies

## Security Considerations

### Log Security
- Automatic secret sanitization
- PII redaction
- Access logging
- Secure log transmission

### Backup Security
- Encrypted backups (optional)
- Secure cloud storage
- Access control for backup files
- Audit trails for backup operations

### Monitoring Security
- Secure API endpoints
- Authentication for dashboard access
- Encrypted communication channels
- Security event monitoring

## Troubleshooting

### Common Issues

#### Monitoring Not Starting
```bash
# Check configuration
docker compose logs trading-agents | grep monitoring

# Verify database connection
docker compose exec postgresql pg_isready

# Check environment variables
docker compose exec trading-agents env | grep MONITORING
```

#### High Memory Usage
```bash
# Check monitoring memory usage
docker stats trading-agents

# Reduce monitoring frequency
export MONITORING_PERFORMANCE_INTERVAL=60000

# Enable log sampling
export PRODUCTION_LOG_SAMPLING=true
export PRODUCTION_LOG_SAMPLING_RATE=0.1
```

#### Backup Failures
```bash
# Check backup directory permissions
ls -la ./backups

# Verify database connectivity
docker compose exec postgresql psql -U postgres -c "SELECT 1"

# Check backup logs
docker compose logs trading-agents | grep backup
```

#### Alert Delivery Issues
```bash
# Test email configuration
docker compose exec trading-agents node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
transporter.verify().then(console.log).catch(console.error);
"

# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from Trading Agents"}' \
  $SLACK_WEBHOOK_URL
```

## Best Practices

### Production Deployment
1. Use structured JSON logging
2. Enable log sanitization and PII redaction
3. Configure appropriate alert thresholds
4. Set up automated backups with retention policies
5. Monitor government API rate limits
6. Use multiple notification channels for critical alerts
7. Regularly test backup and recovery procedures

### Performance Optimization
1. Use appropriate monitoring intervals
2. Enable caching for dashboard data
3. Use connection pooling for database operations
4. Implement circuit breakers for external services
5. Monitor and optimize resource usage

### Security
1. Sanitize logs to remove secrets and PII
2. Use secure communication channels
3. Implement proper access controls
4. Monitor for security events
5. Regularly update monitoring components

### Maintenance
1. Regularly review and update alert thresholds
2. Clean up old monitoring data
3. Test backup and recovery procedures
4. Update monitoring configurations as needed
5. Monitor monitoring system performance

## API Reference

### Production Monitoring System

```typescript
interface ProductionMonitoringSystem {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getSystemStatus(): Promise<ProductionMonitoringStatus>;
  getDashboardData(): Promise<any>;
  performBackup(type?: string): Promise<any>;
  restoreFromBackup(backupId: string, options?: any): Promise<void>;
  getConfiguration(): ProductionMonitoringConfig;
  updateConfiguration(updates: Partial<ProductionMonitoringConfig>): Promise<void>;
}
```

### Dashboard Manager

```typescript
interface ProductionDashboardManager {
  start(): Promise<void>;
  stop(): void;
  getDashboardData(): Promise<DashboardData>;
  exportDashboardData(format: 'json' | 'csv' | 'prometheus'): Promise<string>;
  getConfig(): DashboardConfig;
  updateConfig(config: Partial<DashboardConfig>): void;
}
```

### Backup Manager

```typescript
interface BackupRecoveryManager {
  start(): Promise<void>;
  stop(): void;
  backupDatabase(): Promise<BackupMetadata>;
  backupLogs(): Promise<BackupMetadata>;
  backupConfiguration(): Promise<BackupMetadata>;
  fullBackup(): Promise<BackupMetadata[]>;
  restoreFromBackup(backupId: string, options?: any): Promise<void>;
  listBackups(type?: string): BackupMetadata[];
  deleteBackup(backupId: string): Promise<void>;
}
```

For more detailed API documentation, see the TypeScript interfaces in the source code.