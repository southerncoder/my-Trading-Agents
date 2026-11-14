/**
 * Alert Dashboard
 * 
 * Provides a comprehensive dashboard interface for managing and viewing alerts,
 * including real-time statistics, alert management, and performance metrics.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { AlertManager, AlertDashboard, TriggeredAlert, AlertConfig } from './alert-manager.js';

const logger = createLogger('system', 'alert-dashboard');

export interface DashboardConfig {
  refreshInterval: number; // seconds
  maxRecentAlerts: number;
  enableRealTimeUpdates: boolean;
  alertRetentionDays: number;
}

export interface AlertFilter {
  severity?: string[];
  status?: string[];
  strategyId?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  acknowledgedAlerts: number;
  alertsByHour: number[];
  alertsByDay: number[];
  alertsByWeek: number[];
  topStrategies: Array<{
    strategyId: string;
    alertCount: number;
    criticalCount: number;
  }>;
  averageResolutionTime: number; // minutes
  escalationRate: number; // percentage
}

export class AlertDashboardManager {
  private alertManager: AlertManager;
  private config: DashboardConfig;
  private isInitialized = false;
  private refreshTimer?: NodeJS.Timeout | undefined;

  constructor(alertManager: AlertManager, config: DashboardConfig) {
    this.alertManager = alertManager;
    this.config = config;
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.enableRealTimeUpdates) {
        this.startRealTimeUpdates();
      }

      this.isInitialized = true;
      logger.info('alert-dashboard', 'Dashboard initialized', {
        refreshInterval: this.config.refreshInterval,
        realTimeUpdates: this.config.enableRealTimeUpdates
      });

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to initialize dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(filter?: AlertFilter): Promise<AlertDashboard> {
    this.ensureInitialized();

    try {
      const dashboard = await this.alertManager.getAlertDashboard();
      
      // Apply filters if provided
      if (filter) {
        dashboard.recentAlerts = this.applyFilters(dashboard.recentAlerts, filter);
      }

      // Enhance with additional statistics
      const enhancedDashboard = await this.enhanceDashboardData(dashboard);

      logger.debug('alert-dashboard', 'Dashboard data retrieved', {
        totalAlerts: dashboard.summary.totalAlerts,
        activeAlerts: dashboard.summary.activeAlerts,
        filterApplied: !!filter
      });

      return enhancedDashboard;

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to get dashboard data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get detailed alert statistics
   */
  async getAlertStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AlertStatistics> {
    this.ensureInitialized();

    try {
      // This would typically query the database for historical data
      // For now, we'll provide a basic implementation
      const dashboard = await this.alertManager.getAlertDashboard();
      
      const statistics: AlertStatistics = {
        totalAlerts: dashboard.summary.totalAlerts,
        activeAlerts: dashboard.summary.activeAlerts,
        resolvedAlerts: dashboard.summary.resolvedAlerts,
        acknowledgedAlerts: dashboard.summary.acknowledgedAlerts,
        alertsByHour: this.generateTimeSeriesData(24, timeRange),
        alertsByDay: this.generateTimeSeriesData(7, timeRange),
        alertsByWeek: this.generateTimeSeriesData(4, timeRange),
        topStrategies: this.calculateTopStrategies(dashboard),
        averageResolutionTime: this.calculateAverageResolutionTime(dashboard),
        escalationRate: this.calculateEscalationRate(dashboard)
      };

      logger.debug('alert-dashboard', 'Alert statistics calculated', {
        timeRange,
        totalAlerts: statistics.totalAlerts
      });

      return statistics;

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to get alert statistics', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get filtered alerts
   */
  async getFilteredAlerts(filter: AlertFilter, page = 1, pageSize = 20): Promise<{
    alerts: TriggeredAlert[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.ensureInitialized();

    try {
      const dashboard = await this.alertManager.getAlertDashboard();
      let filteredAlerts = this.applyFilters(dashboard.recentAlerts, filter);

      // Apply pagination
      const total = filteredAlerts.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      filteredAlerts = filteredAlerts.slice(startIndex, endIndex);

      logger.debug('alert-dashboard', 'Filtered alerts retrieved', {
        total,
        page,
        pageSize,
        totalPages
      });

      return {
        alerts: filteredAlerts,
        total,
        page,
        pageSize,
        totalPages
      };

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to get filtered alerts', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get alert configuration summary
   */
  async getAlertConfigSummary(): Promise<{
    totalConfigs: number;
    enabledConfigs: number;
    disabledConfigs: number;
    configsBySeverity: Record<string, number>;
    configsByType: Record<string, number>;
  }> {
    this.ensureInitialized();

    try {
      // This would query the database for alert configurations
      // For now, provide a mock implementation
      const summary = {
        totalConfigs: 15,
        enabledConfigs: 12,
        disabledConfigs: 3,
        configsBySeverity: {
          critical: 3,
          high: 5,
          medium: 4,
          low: 3
        },
        configsByType: {
          performance: 8,
          system: 4,
          market: 3
        }
      };

      logger.debug('alert-dashboard', 'Alert config summary retrieved', summary);

      return summary;

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to get alert config summary', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Export dashboard data
   */
  async exportDashboardData(format: 'json' | 'csv' = 'json'): Promise<string> {
    this.ensureInitialized();

    try {
      const dashboard = await this.getDashboardData();
      const statistics = await this.getAlertStatistics();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        dashboard,
        statistics,
        metadata: {
          exportFormat: format,
          generatedBy: 'TradingAgents Alert Dashboard'
        }
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      throw new Error(`Unsupported export format: ${format}`);

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to export dashboard data', {
        format,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Generate dashboard report
   */
  async generateReport(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<{
    summary: string;
    recommendations: string[];
    trends: string[];
    criticalIssues: string[];
  }> {
    this.ensureInitialized();

    try {
      const dashboard = await this.getDashboardData();
      const statistics = await this.getAlertStatistics(timeRange);

      const report = {
        summary: this.generateSummaryText(dashboard, statistics),
        recommendations: this.generateRecommendations(dashboard, statistics),
        trends: this.analyzeTrends(statistics),
        criticalIssues: this.identifyCriticalIssues(dashboard)
      };

      logger.info('alert-dashboard', 'Dashboard report generated', {
        timeRange,
        recommendationCount: report.recommendations.length,
        criticalIssueCount: report.criticalIssues.length
      });

      return report;

    } catch (error) {
      logger.error('alert-dashboard', 'Failed to generate dashboard report', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Apply filters to alerts
   */
  private applyFilters(alerts: TriggeredAlert[], filter: AlertFilter): TriggeredAlert[] {
    let filtered = [...alerts];

    if (filter.severity && filter.severity.length > 0) {
      filtered = filtered.filter(alert => filter.severity!.includes(alert.severity));
    }

    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(alert => filter.status!.includes(alert.status));
    }

    if (filter.strategyId && filter.strategyId.length > 0) {
      filtered = filtered.filter(alert => 
        alert.strategyId && filter.strategyId!.includes(alert.strategyId)
      );
    }

    if (filter.dateRange) {
      filtered = filtered.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= filter.dateRange!.start && alertDate <= filter.dateRange!.end;
      });
    }

    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.name.toLowerCase().includes(searchLower) ||
        alert.description.toLowerCase().includes(searchLower) ||
        (alert.strategyId && alert.strategyId.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }

  /**
   * Enhance dashboard data with additional statistics
   */
  private async enhanceDashboardData(dashboard: AlertDashboard): Promise<AlertDashboard> {
    // Add additional calculated fields
    const enhanced = { ...dashboard };

    // Calculate alert velocity (alerts per hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentAlertsCount = dashboard.recentAlerts.filter(
      alert => new Date(alert.timestamp) > oneHourAgo
    ).length;

    // Add to metadata or create new fields as needed
    (enhanced as any).alertVelocity = recentAlertsCount;
    (enhanced as any).lastUpdated = now.toISOString();

    return enhanced;
  }

  /**
   * Generate time series data for charts
   */
  private generateTimeSeriesData(periods: number, timeRange: string): number[] {
    // This would typically query historical data from the database
    // For now, generate mock data
    return Array.from({ length: periods }, () => Math.floor(Math.random() * 10));
  }

  /**
   * Calculate top strategies by alert count
   */
  private calculateTopStrategies(dashboard: AlertDashboard): Array<{
    strategyId: string;
    alertCount: number;
    criticalCount: number;
  }> {
    const strategies = Object.entries(dashboard.alertsByStrategy).map(([strategyId, count]) => ({
      strategyId,
      alertCount: count,
      criticalCount: dashboard.recentAlerts.filter(
        alert => alert.strategyId === strategyId && alert.severity === 'critical'
      ).length
    }));

    return strategies.sort((a, b) => b.alertCount - a.alertCount).slice(0, 5);
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(dashboard: AlertDashboard): number {
    const resolvedAlerts = dashboard.recentAlerts.filter(alert => alert.resolvedAt);
    
    if (resolvedAlerts.length === 0) return 0;

    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      const resolutionTime = new Date(alert.resolvedAt!).getTime() - new Date(alert.timestamp).getTime();
      return sum + resolutionTime;
    }, 0);

    return Math.round(totalResolutionTime / resolvedAlerts.length / (1000 * 60)); // Convert to minutes
  }

  /**
   * Calculate escalation rate
   */
  private calculateEscalationRate(dashboard: AlertDashboard): number {
    const totalAlerts = dashboard.recentAlerts.length;
    if (totalAlerts === 0) return 0;

    const escalatedAlerts = dashboard.recentAlerts.filter(alert => alert.escalationLevel > 0).length;
    return Math.round((escalatedAlerts / totalAlerts) * 100);
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion for alerts
    const alerts = data.dashboard.recentAlerts;
    const headers = ['ID', 'Name', 'Severity', 'Status', 'Strategy', 'Timestamp', 'Actual Value', 'Threshold'];
    
    const csvRows = [
      headers.join(','),
      ...alerts.map((alert: TriggeredAlert) => [
        alert.id,
        `"${alert.name}"`,
        alert.severity,
        alert.status,
        alert.strategyId || 'System',
        alert.timestamp,
        alert.actualValue,
        alert.threshold
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(dashboard: AlertDashboard, statistics: AlertStatistics): string {
    return `
Alert Dashboard Summary:
- Total Active Alerts: ${dashboard.summary.totalAlerts}
- Critical Alerts: ${dashboard.summary.criticalAlerts}
- Average Resolution Time: ${statistics.averageResolutionTime} minutes
- Escalation Rate: ${statistics.escalationRate}%
- Most Active Strategy: ${statistics.topStrategies[0]?.strategyId || 'None'}
    `.trim();
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(dashboard: AlertDashboard, statistics: AlertStatistics): string[] {
    const recommendations: string[] = [];

    if (dashboard.summary.criticalAlerts > 5) {
      recommendations.push('High number of critical alerts detected. Consider reviewing alert thresholds.');
    }

    if (statistics.escalationRate > 20) {
      recommendations.push('High escalation rate detected. Review alert acknowledgment processes.');
    }

    if (statistics.averageResolutionTime > 60) {
      recommendations.push('Long average resolution time. Consider improving alert response procedures.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Alert system is operating within normal parameters.');
    }

    return recommendations;
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(statistics: AlertStatistics): string[] {
    const trends: string[] = [];

    // Analyze daily trends
    const dailyAlerts = statistics.alertsByDay;
    const recentAvg = dailyAlerts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previousAvg = dailyAlerts.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    if (recentAvg > previousAvg * 1.2) {
      trends.push('Alert volume is trending upward over the past 3 days.');
    } else if (recentAvg < previousAvg * 0.8) {
      trends.push('Alert volume is trending downward over the past 3 days.');
    } else {
      trends.push('Alert volume is stable over the past week.');
    }

    return trends;
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(dashboard: AlertDashboard): string[] {
    const issues: string[] = [];

    if (dashboard.summary.criticalAlerts > 10) {
      issues.push('Excessive critical alerts may indicate system instability.');
    }

    const unacknowledgedCritical = dashboard.recentAlerts.filter(
      alert => alert.severity === 'critical' && alert.status === 'active'
    ).length;

    if (unacknowledgedCritical > 3) {
      issues.push(`${unacknowledgedCritical} critical alerts are unacknowledged.`);
    }

    return issues;
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    this.refreshTimer = setInterval(async () => {
      try {
        // Emit update event or refresh cached data
        logger.debug('alert-dashboard', 'Real-time update triggered');
      } catch (error) {
        logger.error('alert-dashboard', 'Real-time update failed', {
          error: (error as Error).message
        });
      }
    }, this.config.refreshInterval * 1000);
  }

  /**
   * Ensure dashboard is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AlertDashboardManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.isInitialized = false;
    logger.info('alert-dashboard', 'Dashboard cleanup completed');
  }
}

/**
 * Create alert dashboard manager
 */
export function createAlertDashboard(
  alertManager: AlertManager, 
  config: DashboardConfig
): AlertDashboardManager {
  return new AlertDashboardManager(alertManager, config);
}