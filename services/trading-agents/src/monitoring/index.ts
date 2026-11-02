/**
 * Production Monitoring and Observability System
 * 
 * Comprehensive monitoring system for production trading environments including:
 * - Production logging with security and performance optimizations
 * - Real-time dashboards for system health and performance
 * - Configurable alerting with escalation rules
 * - Automated backup and recovery procedures
 * - Government data service monitoring and compliance
 * - Integration with existing health monitoring infrastructure
 */

// Core monitoring system
export { IntegratedMonitoringSystem } from './integrated-monitoring-system.js';
export { MonitoringConfig } from './integrated-monitoring-system.js';

// Production logging
export {
  ProductionLogger,
  createProductionLogger,
  loadProductionLoggingConfig,
  ProductionLoggingConfig,
  DEFAULT_PRODUCTION_LOGGING_CONFIG
} from './production-logging-config.js';

// Dashboard management
export {
  ProductionDashboardManager,
  createProductionDashboardManager,
  DashboardConfig,
  DashboardData,
  SystemOverview,
  PerformanceDashboard,
  HealthDashboard,
  AlertsDashboard,
  TradingDashboard,
  InfrastructureDashboard
} from './production-dashboards.js';

// Alerting templates
export {
  AlertTemplateManager,
  createAlertTemplateManager,
  AlertTemplate,
  AlertCondition,
  EscalationRule,
  NotificationChannel,
  PRODUCTION_ALERT_TEMPLATES,
  GOVERNMENT_DATA_ALERT_TEMPLATES
} from './production-alerting-templates.js';

// Backup and recovery
export {
  BackupRecoveryManager,
  createBackupRecoveryManager,
  BackupConfig,
  BackupMetadata,
  RecoveryPlan,
  RecoveryStep,
  DEFAULT_BACKUP_CONFIG
} from './backup-recovery-procedures.js';

// Government data monitoring
export {
  GovernmentDataMonitor,
  createGovernmentDataMonitor,
  GovernmentDataConfig,
  GovernmentDataMetrics,
  GovernmentDataAlert,
  SECMetrics,
  FREDMetrics,
  BLSMetrics,
  CensusMetrics,
  DEFAULT_GOVERNMENT_DATA_CONFIG
} from './government-data-monitoring.js';

// Production monitoring integration
export {
  ProductionMonitoringSystem,
  createProductionMonitoringSystem,
  initializeProductionMonitoringFromEnvironment,
  ProductionMonitoringConfig,
  ProductionMonitoringStatus,
  DEFAULT_PRODUCTION_MONITORING_CONFIG
} from './production-monitoring-integration.js';

// Existing monitoring components
export { PerformanceMonitor, createPerformanceMonitor } from './performance-monitor.js';
export { AlertManager } from './alert-manager.js';
export { AnomalyDetector } from './anomaly-detector.js';

// Configuration integration
export { 
  loadMonitoringConfigFromEnvironment,
  validateMonitoringConfig,
  createDockerEnvironmentVariables,
  generateDockerComposeMonitoringConfig,
  createEnvironmentSpecificConfig,
  loadEnvironmentAwareConfig
} from './monitoring-config-integration.js';

// Monitoring initialization
export { initializeMonitoringSystem } from './monitoring-initialization.js';

/**
 * Create complete production monitoring system
 */
import { DatabaseManager } from '../database/database-manager.js';
import { IntegratedMonitoringSystem } from './integrated-monitoring-system.js';
import { createProductionMonitoringSystem, ProductionMonitoringConfig } from './production-monitoring-integration.js';
import { loadEnvironmentAwareConfig } from './monitoring-config-integration.js';

export async function createCompleteMonitoringSystem(
  dbManager: DatabaseManager,
  config?: Partial<ProductionMonitoringConfig>
): Promise<{
  integratedMonitoring: IntegratedMonitoringSystem;
  productionMonitoring: any; // ProductionMonitoringSystem
}> {
  // Load monitoring configuration
  const monitoringConfig = loadEnvironmentAwareConfig();
  
  // Create integrated monitoring system
  const integratedMonitoring = new IntegratedMonitoringSystem(monitoringConfig);
  
  // Create production monitoring system
  const productionMonitoring = createProductionMonitoringSystem(
    dbManager,
    integratedMonitoring,
    config
  );
  
  return {
    integratedMonitoring,
    productionMonitoring
  };
}

/**
 * Initialize complete monitoring system with automatic startup
 */
export async function initializeCompleteMonitoringSystem(
  dbManager: DatabaseManager,
  config?: Partial<ProductionMonitoringConfig>
): Promise<{
  integratedMonitoring: IntegratedMonitoringSystem;
  productionMonitoring: any; // ProductionMonitoringSystem
}> {
  const { integratedMonitoring, productionMonitoring } = await createCompleteMonitoringSystem(
    dbManager,
    config
  );
  
  // Initialize and start both systems
  await integratedMonitoring.initialize();
  await productionMonitoring.initialize();
  await productionMonitoring.start();
  
  return {
    integratedMonitoring,
    productionMonitoring
  };
}

/**
 * Gracefully shutdown monitoring system
 */
export async function shutdownMonitoringSystem(
  integratedMonitoring: IntegratedMonitoringSystem,
  productionMonitoring: any // ProductionMonitoringSystem
): Promise<void> {
  try {
    await productionMonitoring.stop();
    await integratedMonitoring.shutdown();
  } catch (error) {
    console.error('Error shutting down monitoring system:', error);
  }
}