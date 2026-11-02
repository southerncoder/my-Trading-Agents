/**
 * Anomaly Detection System for Trading Performance
 * 
 * Provides statistical anomaly detection, pattern recognition for unusual behavior,
 * and automated performance issue diagnosis for trading strategies.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { PerformanceMetrics, PerformanceMonitor, Anomaly, PerformanceAlert } from './performance-monitor.js';
import { DatabaseManager } from '../database/database-manager.js';

const logger = createLogger('system', 'anomaly-detector');

export interface AnomalyDetectionConfig {
  // Statistical thresholds
  zScoreThreshold: number; // Standard deviations from mean
  percentileThreshold: number; // Percentile for outlier detection
  rollingWindowSize: number; // Days for rolling statistics
  
  // Performance thresholds
  maxDrawdownThreshold: number; // Maximum acceptable drawdown
  sharpeRatioThreshold: number; // Minimum acceptable Sharpe ratio
  volatilityThreshold: number; // Maximum acceptable volatility
  returnThreshold: number; // Minimum acceptable return
  
  // Pattern detection
  consecutiveNegativeReturns: number; // Alert after N consecutive losses
  correlationBreakThreshold: number; // Correlation change threshold
  volumeAnomalyThreshold: number; // Volume deviation threshold
  
  // Alert settings
  enableRealTimeAlerts: boolean;
  alertCooldownPeriod: number; // Minutes between similar alerts
  maxAlertsPerHour: number;
}

export interface StatisticalAnomaly {
  type: 'z_score' | 'percentile' | 'iqr' | 'isolation_forest';
  metric: string;
  value: number;
  threshold: number;
  zScore: number;
  percentile: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface PatternAnomaly {
  type: 'consecutive_losses' | 'correlation_break' | 'regime_change' | 'volume_spike';
  description: string;
  pattern: any[];
  duration: number; // in hours
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface PerformanceDiagnosis {
  strategyId: string;
  timestamp: Date;
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: DiagnosticIssue[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DiagnosticIssue {
  category: 'performance' | 'risk' | 'execution' | 'market_conditions';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: Record<string, number>;
  possibleCauses: string[];
  suggestedActions: string[];
}

export interface AnomalyDetectionResult {
  strategyId: string;
  timestamp: Date;
  anomalies: Anomaly[];
  statisticalAnomalies: StatisticalAnomaly[];
  patternAnomalies: PatternAnomaly[];
  alerts: PerformanceAlert[];
  diagnosis: PerformanceDiagnosis;
}

/**
 * Comprehensive Anomaly Detection System
 */
export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private dbManager: DatabaseManager;
  private performanceMonitor: PerformanceMonitor;
  private alertHistory: Map<string, Date[]> = new Map();
  private statisticalBaselines: Map<string, StatisticalBaseline> = new Map();
  private isInitialized = false;

  constructor(
    config: AnomalyDetectionConfig,
    dbManager: DatabaseManager,
    performanceMonitor: PerformanceMonitor
  ) {
    this.config = config;
    this.dbManager = dbManager;
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Initialize the anomaly detection system
   */
  async initialize(): Promise<void> {
    try {
      if (!this.dbManager.initialized) {
        await this.dbManager.initializeConnections();
      }

      if (!this.performanceMonitor) {
        throw new Error('PerformanceMonitor is required for anomaly detection');
      }

      // Initialize statistical baselines for existing strategies
      await this.initializeStatisticalBaselines();

      this.isInitialized = true;
      logger.info('anomaly-detector', 'Anomaly detection system initialized successfully');

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to initialize anomaly detection system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Detect anomalies in performance metrics
   */
  async detectPerformanceAnomalies(performance: PerformanceMetrics[]): Promise<Anomaly[]> {
    this.ensureInitialized();

    if (performance.length === 0) return [];

    try {
      const anomalies: Anomaly[] = [];
      const latestMetrics = performance[performance.length - 1];
      if (!latestMetrics) return [];

      // Statistical anomaly detection
      const statisticalAnomalies = await this.detectStatisticalAnomalies(performance);
      
      // Convert statistical anomalies to performance anomalies
      for (const statAnomaly of statisticalAnomalies) {
        if (statAnomaly.severity === 'high' || statAnomaly.severity === 'critical') {
          anomalies.push({
            id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            strategyId: 'unknown', // Will be set by caller
            type: this.mapStatisticalAnomalyType(statAnomaly.type),
            severity: statAnomaly.severity,
            description: `${statAnomaly.metric} anomaly detected: ${statAnomaly.value.toFixed(4)} (threshold: ${statAnomaly.threshold.toFixed(4)})`,
            timestamp: new Date(),
            metrics: { [statAnomaly.metric]: statAnomaly.value },
            threshold: statAnomaly.threshold,
            actualValue: statAnomaly.value,
            confidence: statAnomaly.confidence
          });
        }
      }

      // Performance degradation detection
      if (latestMetrics.sharpeRatio < this.config.sharpeRatioThreshold) {
        anomalies.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId: 'unknown',
          type: 'performance_degradation',
          severity: latestMetrics.sharpeRatio < this.config.sharpeRatioThreshold * 0.5 ? 'critical' : 'high',
          description: `Sharpe ratio below threshold: ${latestMetrics.sharpeRatio.toFixed(4)} < ${this.config.sharpeRatioThreshold}`,
          timestamp: new Date(),
          metrics: { sharpeRatio: latestMetrics.sharpeRatio },
          threshold: this.config.sharpeRatioThreshold,
          actualValue: latestMetrics.sharpeRatio,
          confidence: 0.9
        });
      }

      // Drawdown spike detection
      if (Math.abs(latestMetrics.maxDrawdown) > this.config.maxDrawdownThreshold) {
        anomalies.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId: 'unknown',
          type: 'drawdown_spike',
          severity: Math.abs(latestMetrics.maxDrawdown) > this.config.maxDrawdownThreshold * 1.5 ? 'critical' : 'high',
          description: `Maximum drawdown exceeded threshold: ${latestMetrics.maxDrawdown.toFixed(4)} > ${this.config.maxDrawdownThreshold}`,
          timestamp: new Date(),
          metrics: { maxDrawdown: latestMetrics.maxDrawdown },
          threshold: this.config.maxDrawdownThreshold,
          actualValue: Math.abs(latestMetrics.maxDrawdown),
          confidence: 0.95
        });
      }

      // Volatility spike detection
      if (latestMetrics.volatility > this.config.volatilityThreshold) {
        anomalies.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId: 'unknown',
          type: 'unusual_volatility',
          severity: latestMetrics.volatility > this.config.volatilityThreshold * 1.5 ? 'critical' : 'medium',
          description: `Volatility spike detected: ${latestMetrics.volatility.toFixed(4)} > ${this.config.volatilityThreshold}`,
          timestamp: new Date(),
          metrics: { volatility: latestMetrics.volatility },
          threshold: this.config.volatilityThreshold,
          actualValue: latestMetrics.volatility,
          confidence: 0.85
        });
      }

      logger.debug('anomaly-detector', 'Performance anomalies detected', {
        anomalyCount: anomalies.length,
        criticalCount: anomalies.filter(a => a.severity === 'critical').length
      });

      return anomalies;

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to detect performance anomalies', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Recognize patterns in unusual trading behavior
   */
  async recognizeUnusualPatterns(strategyId: string, performance: PerformanceMetrics[]): Promise<PatternAnomaly[]> {
    this.ensureInitialized();

    if (performance.length < 5) return []; // Need minimum data for pattern recognition

    try {
      const patterns: PatternAnomaly[] = [];

      // Consecutive losses pattern
      const consecutiveLosses = this.detectConsecutiveLosses(performance);
      if (consecutiveLosses.count >= this.config.consecutiveNegativeReturns) {
        patterns.push({
          type: 'consecutive_losses',
          description: `${consecutiveLosses.count} consecutive negative returns detected`,
          pattern: consecutiveLosses.returns,
          duration: consecutiveLosses.duration,
          severity: consecutiveLosses.count >= this.config.consecutiveNegativeReturns * 1.5 ? 'critical' : 'high',
          confidence: Math.min(0.9, 0.5 + (consecutiveLosses.count / 10))
        });
      }

      // Volume anomaly detection
      const volumeAnomaly = await this.detectVolumeAnomalies(strategyId, performance);
      if (volumeAnomaly.detected) {
        patterns.push({
          type: 'volume_spike',
          description: `Unusual trading volume detected: ${volumeAnomaly.currentVolume.toFixed(0)} vs avg ${volumeAnomaly.averageVolume.toFixed(0)}`,
          pattern: volumeAnomaly.volumeHistory,
          duration: volumeAnomaly.duration,
          severity: volumeAnomaly.zScore > this.config.volumeAnomalyThreshold * 2 ? 'critical' : 'medium',
          confidence: Math.min(0.9, 0.6 + Math.abs(volumeAnomaly.zScore) / 10)
        });
      }

      // Correlation break pattern (requires historical data)
      const correlationBreak = await this.detectCorrelationBreak(strategyId, performance);
      if (correlationBreak.detected) {
        patterns.push({
          type: 'correlation_break',
          description: `Strategy correlation with market changed significantly: ${correlationBreak.change.toFixed(4)}`,
          pattern: correlationBreak.correlations,
          duration: correlationBreak.duration,
          severity: Math.abs(correlationBreak.change) > 0.5 ? 'critical' : 'medium',
          confidence: correlationBreak.confidence
        });
      }

      // Regime change detection
      const regimeChange = this.detectRegimeChange(performance);
      if (regimeChange.detected) {
        patterns.push({
          type: 'regime_change',
          description: `Market regime change detected: ${regimeChange.oldRegime} -> ${regimeChange.newRegime}`,
          pattern: regimeChange.indicators,
          duration: regimeChange.duration,
          severity: 'medium',
          confidence: regimeChange.confidence
        });
      }

      logger.debug('anomaly-detector', 'Pattern anomalies detected', {
        strategyId,
        patternCount: patterns.length
      });

      return patterns;

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to recognize unusual patterns', {
        strategyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Create threshold-based alerts for performance degradation
   */
  async createPerformanceAlerts(strategyId: string, performance: PerformanceMetrics): Promise<PerformanceAlert[]> {
    this.ensureInitialized();

    try {
      const alerts: PerformanceAlert[] = [];
      const now = new Date();

      // Check alert cooldown
      if (!this.canCreateAlert(strategyId)) {
        return alerts;
      }

      // Performance degradation alert
      if (performance.sharpeRatio < this.config.sharpeRatioThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId,
          type: 'performance',
          severity: performance.sharpeRatio < this.config.sharpeRatioThreshold * 0.5 ? 'critical' : 'high',
          message: `Strategy ${strategyId} Sharpe ratio below threshold: ${performance.sharpeRatio.toFixed(4)}`,
          timestamp: now,
          metrics: { sharpeRatio: performance.sharpeRatio },
          threshold: this.config.sharpeRatioThreshold,
          actualValue: performance.sharpeRatio
        });
      }

      // Risk alert for excessive drawdown
      if (Math.abs(performance.maxDrawdown) > this.config.maxDrawdownThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId,
          type: 'risk',
          severity: Math.abs(performance.maxDrawdown) > this.config.maxDrawdownThreshold * 1.5 ? 'critical' : 'high',
          message: `Strategy ${strategyId} maximum drawdown exceeded: ${performance.maxDrawdown.toFixed(4)}%`,
          timestamp: now,
          metrics: { maxDrawdown: performance.maxDrawdown },
          threshold: this.config.maxDrawdownThreshold,
          actualValue: Math.abs(performance.maxDrawdown)
        });
      }

      // Volatility alert
      if (performance.volatility > this.config.volatilityThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          strategyId,
          type: 'risk',
          severity: performance.volatility > this.config.volatilityThreshold * 2 ? 'critical' : 'medium',
          message: `Strategy ${strategyId} volatility spike detected: ${performance.volatility.toFixed(4)}`,
          timestamp: now,
          metrics: { volatility: performance.volatility },
          threshold: this.config.volatilityThreshold,
          actualValue: performance.volatility
        });
      }

      // Record alert creation
      if (alerts.length > 0) {
        this.recordAlertCreation(strategyId);
      }

      logger.info('anomaly-detector', 'Performance alerts created', {
        strategyId,
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length
      });

      return alerts;

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to create performance alerts', {
        strategyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Build automated performance issue diagnosis
   */
  async diagnosePerformanceIssues(strategyId: string, performance: PerformanceMetrics[]): Promise<PerformanceDiagnosis> {
    this.ensureInitialized();

    try {
      const latestMetrics = performance[performance.length - 1];
      const issues: DiagnosticIssue[] = [];
      const recommendations: string[] = [];

      if (!latestMetrics) {
        return {
          strategyId,
          timestamp: new Date(),
          overallHealth: 'healthy',
          issues: [],
          recommendations: [],
          riskLevel: 'low'
        };
      }

      // Analyze performance metrics
      if (latestMetrics.sharpeRatio < this.config.sharpeRatioThreshold) {
        issues.push({
          category: 'performance',
          severity: latestMetrics.sharpeRatio < 0 ? 'critical' : 'high',
          description: 'Poor risk-adjusted returns',
          metrics: { sharpeRatio: latestMetrics.sharpeRatio },
          possibleCauses: [
            'High volatility relative to returns',
            'Inconsistent trading performance',
            'Market regime change',
            'Strategy parameter drift'
          ],
          suggestedActions: [
            'Review position sizing',
            'Analyze recent trades for patterns',
            'Consider strategy parameter optimization',
            'Evaluate market conditions'
          ]
        });
        recommendations.push('Consider reducing position sizes or pausing strategy until performance improves');
      }

      // Analyze drawdown
      if (Math.abs(latestMetrics.maxDrawdown) > this.config.maxDrawdownThreshold) {
        issues.push({
          category: 'risk',
          severity: Math.abs(latestMetrics.maxDrawdown) > this.config.maxDrawdownThreshold * 2 ? 'critical' : 'high',
          description: 'Excessive maximum drawdown',
          metrics: { maxDrawdown: latestMetrics.maxDrawdown },
          possibleCauses: [
            'Inadequate risk management',
            'Position sizes too large',
            'Correlated positions during market stress',
            'Stop-loss levels too wide'
          ],
          suggestedActions: [
            'Implement stricter stop-loss rules',
            'Reduce position sizes',
            'Diversify across uncorrelated assets',
            'Review risk management parameters'
          ]
        });
        recommendations.push('Immediately review and tighten risk management controls');
      }

      // Analyze volatility
      if (latestMetrics.volatility > this.config.volatilityThreshold) {
        issues.push({
          category: 'execution',
          severity: 'medium',
          description: 'High strategy volatility',
          metrics: { volatility: latestMetrics.volatility },
          possibleCauses: [
            'Frequent trading',
            'Large position changes',
            'Market microstructure effects',
            'Execution timing issues'
          ],
          suggestedActions: [
            'Smooth position changes over time',
            'Implement volatility targeting',
            'Review execution algorithms',
            'Consider transaction cost analysis'
          ]
        });
        recommendations.push('Consider implementing volatility targeting to smooth returns');
      }

      // Analyze win rate
      if (latestMetrics.winRate < 0.4) {
        issues.push({
          category: 'performance',
          severity: latestMetrics.winRate < 0.3 ? 'high' : 'medium',
          description: 'Low win rate',
          metrics: { winRate: latestMetrics.winRate },
          possibleCauses: [
            'Strategy not suited to current market conditions',
            'Entry/exit timing issues',
            'Insufficient signal quality',
            'Market regime change'
          ],
          suggestedActions: [
            'Analyze signal quality and timing',
            'Review entry/exit criteria',
            'Consider market regime filters',
            'Evaluate strategy performance by market condition'
          ]
        });
        recommendations.push('Analyze trade timing and signal quality to improve win rate');
      }

      // Determine overall health
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const highIssues = issues.filter(i => i.severity === 'high').length;

      let overallHealth: 'healthy' | 'warning' | 'critical';
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';

      if (criticalIssues > 0) {
        overallHealth = 'critical';
        riskLevel = 'critical';
      } else if (highIssues > 0) {
        overallHealth = 'warning';
        riskLevel = 'high';
      } else if (issues.length > 0) {
        overallHealth = 'warning';
        riskLevel = 'medium';
      } else {
        overallHealth = 'healthy';
        riskLevel = 'low';
      }

      const diagnosis: PerformanceDiagnosis = {
        strategyId,
        timestamp: new Date(),
        overallHealth,
        issues,
        recommendations,
        riskLevel
      };

      logger.info('anomaly-detector', 'Performance diagnosis completed', {
        strategyId,
        overallHealth,
        riskLevel,
        issueCount: issues.length
      });

      return diagnosis;

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to diagnose performance issues', {
        strategyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Detect statistical anomalies using various methods
   */
  private async detectStatisticalAnomalies(performance: PerformanceMetrics[]): Promise<StatisticalAnomaly[]> {
    const anomalies: StatisticalAnomaly[] = [];

    if (performance.length < 10) return anomalies; // Need sufficient data

    // Extract time series for different metrics
    const returns = performance.map(p => p.totalReturn);
    const sharpeRatios = performance.map(p => p.sharpeRatio);
    const volatilities = performance.map(p => p.volatility);

    // Z-score based detection
    anomalies.push(...this.detectZScoreAnomalies('totalReturn', returns));
    anomalies.push(...this.detectZScoreAnomalies('sharpeRatio', sharpeRatios));
    anomalies.push(...this.detectZScoreAnomalies('volatility', volatilities));

    // Percentile based detection
    anomalies.push(...this.detectPercentileAnomalies('totalReturn', returns));
    anomalies.push(...this.detectPercentileAnomalies('sharpeRatio', sharpeRatios));
    anomalies.push(...this.detectPercentileAnomalies('volatility', volatilities));

    return anomalies;
  }

  /**
   * Detect anomalies using Z-score method
   */
  private detectZScoreAnomalies(metric: string, values: number[]): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];
    
    if (values.length < 5) return anomalies;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);

    const latestValue = values[values.length - 1];
    if (latestValue === undefined) return anomalies;
    
    const zScore = stdDev === 0 ? 0 : (latestValue - mean) / stdDev;

    if (Math.abs(zScore) > this.config.zScoreThreshold) {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (Math.abs(zScore) > this.config.zScoreThreshold * 2) {
        severity = 'critical';
      } else if (Math.abs(zScore) > this.config.zScoreThreshold * 1.5) {
        severity = 'high';
      } else {
        severity = 'medium';
      }

      anomalies.push({
        type: 'z_score',
        metric,
        value: latestValue,
        threshold: this.config.zScoreThreshold,
        zScore,
        percentile: this.calculatePercentile(values, latestValue),
        severity,
        confidence: Math.min(0.95, 0.5 + Math.abs(zScore) / 10)
      });
    }

    return anomalies;
  }

  /**
   * Detect anomalies using percentile method
   */
  private detectPercentileAnomalies(metric: string, values: number[]): StatisticalAnomaly[] {
    const anomalies: StatisticalAnomaly[] = [];
    
    if (values.length < 5) return anomalies;

    const latestValue = values[values.length - 1];
    if (latestValue === undefined) return anomalies;
    
    const percentile = this.calculatePercentile(values, latestValue);

    if (percentile > this.config.percentileThreshold || percentile < (100 - this.config.percentileThreshold)) {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (percentile > 99 || percentile < 1) {
        severity = 'critical';
      } else if (percentile > 97 || percentile < 3) {
        severity = 'high';
      } else {
        severity = 'medium';
      }

      anomalies.push({
        type: 'percentile',
        metric,
        value: latestValue,
        threshold: this.config.percentileThreshold,
        zScore: 0, // Not applicable for percentile method
        percentile,
        severity,
        confidence: 0.8
      });
    }

    return anomalies;
  }

  /**
   * Calculate percentile of a value in a dataset
   */
  private calculatePercentile(values: number[], target: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex(val => val >= target);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  /**
   * Detect volume anomalies in trading patterns
   */
  private async detectVolumeAnomalies(strategyId: string, performance: PerformanceMetrics[]): Promise<{
    detected: boolean;
    currentVolume: number;
    averageVolume: number;
    zScore: number;
    volumeHistory: number[];
    duration: number;
  }> {
    try {
      // Get recent trading volume data from performance metrics
      // Note: This assumes tradesCount represents volume proxy
      const volumes = performance.map(p => p.tradesCount || 0);
      
      if (volumes.length < 10) {
        return { detected: false, currentVolume: 0, averageVolume: 0, zScore: 0, volumeHistory: [], duration: 0 };
      }

      const currentVolume = volumes[volumes.length - 1];
      if (currentVolume === undefined) {
        return { detected: false, currentVolume: 0, averageVolume: 0, zScore: 0, volumeHistory: [], duration: 0 };
      }
      
      const historicalVolumes = volumes.slice(0, -1);
      
      // Calculate statistical measures
      const averageVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
      const variance = historicalVolumes.reduce((sum, vol) => sum + Math.pow(vol - averageVolume, 2), 0) / (historicalVolumes.length - 1);
      const stdDev = Math.sqrt(variance);
      
      const zScore = stdDev === 0 ? 0 : (currentVolume - averageVolume) / stdDev;
      const detected = Math.abs(zScore) > this.config.volumeAnomalyThreshold;

      logger.debug('anomaly-detector', 'Volume anomaly analysis', {
        strategyId,
        currentVolume,
        averageVolume,
        zScore,
        detected
      });

      return {
        detected,
        currentVolume,
        averageVolume,
        zScore,
        volumeHistory: volumes.slice(-10), // Last 10 periods
        duration: detected ? 24 : 0 // Assume daily data
      };

    } catch (error) {
      logger.error('anomaly-detector', 'Failed to detect volume anomalies', {
        strategyId,
        error: (error as Error).message
      });
      return { detected: false, currentVolume: 0, averageVolume: 0, zScore: 0, volumeHistory: [], duration: 0 };
    }
  }

  /**
   * Detect consecutive losses pattern
   */
  private detectConsecutiveLosses(performance: PerformanceMetrics[]): {
    count: number;
    returns: number[];
    duration: number;
  } {
    let consecutiveCount = 0;
    let maxConsecutiveCount = 0;
    let consecutiveReturns: number[] = [];
    let maxConsecutiveReturns: number[] = [];
    let duration = 0;

    for (let i = performance.length - 1; i >= 0; i--) {
      const performanceItem = performance[i];
      if (!performanceItem) continue;
      
      const returns = performanceItem.totalReturn;
      
      if (returns < 0) {
        consecutiveCount++;
        consecutiveReturns.unshift(returns);
        duration += 24; // Assume daily data, 24 hours per day
      } else {
        if (consecutiveCount > maxConsecutiveCount) {
          maxConsecutiveCount = consecutiveCount;
          maxConsecutiveReturns = [...consecutiveReturns];
        }
        consecutiveCount = 0;
        consecutiveReturns = [];
        break; // Only check most recent consecutive losses
      }
    }

    // Check if current streak is the longest
    if (consecutiveCount > maxConsecutiveCount) {
      maxConsecutiveCount = consecutiveCount;
      maxConsecutiveReturns = [...consecutiveReturns];
    }

    return {
      count: maxConsecutiveCount,
      returns: maxConsecutiveReturns,
      duration
    };
  }

  /**
   * Detect correlation break with market
   */
  private async detectCorrelationBreak(strategyId: string, performance: PerformanceMetrics[]): Promise<{
    detected: boolean;
    change: number;
    correlations: number[];
    duration: number;
    confidence: number;
  }> {
    const returns = performance.map(p => p.totalReturn);
    
    if (returns.length < 20) {
      return { detected: false, change: 0, correlations: [], duration: 0, confidence: 0 };
    }

    try {
      // Try to get real market benchmark data
      const marketReturns = await this.getMarketBenchmarkReturns(returns.length);
      
      // Split into two periods
      const midPoint = Math.floor(returns.length / 2);
      const firstHalf = returns.slice(0, midPoint);
      const secondHalf = returns.slice(midPoint);
      const marketFirstHalf = marketReturns.slice(0, midPoint);
      const marketSecondHalf = marketReturns.slice(midPoint);

      // Calculate correlations for each period
      const firstCorr = this.calculateCorrelation(firstHalf, marketFirstHalf);
      const secondCorr = this.calculateCorrelation(secondHalf, marketSecondHalf);

      const correlationChange = Math.abs(secondCorr - firstCorr);
      const detected = correlationChange > this.config.correlationBreakThreshold;

      logger.debug('anomaly-detector', 'Correlation break analysis', {
        strategyId,
        firstCorr,
        secondCorr,
        correlationChange,
        detected
      });

      return {
        detected,
        change: secondCorr - firstCorr,
        correlations: [firstCorr, secondCorr],
        duration: secondHalf.length * 24, // Assume daily data
        confidence: detected ? 0.8 : 0.4 // Higher confidence with real market data
      };

    } catch (error) {
      logger.warn('anomaly-detector', 'Failed to get market benchmark data, using synthetic', {
        strategyId,
        error: (error as Error).message
      });

      // Fallback to synthetic market data
      const marketReturns = this.generateSyntheticMarketReturns(returns.length);
      const midPoint = Math.floor(returns.length / 2);
      const firstHalf = returns.slice(0, midPoint);
      const secondHalf = returns.slice(midPoint);

      const firstCorr = this.calculateCorrelation(firstHalf, marketReturns.slice(0, midPoint));
      const secondCorr = this.calculateCorrelation(secondHalf, marketReturns.slice(midPoint));

      const correlationChange = Math.abs(secondCorr - firstCorr);
      const detected = correlationChange > this.config.correlationBreakThreshold;

      return {
        detected,
        change: secondCorr - firstCorr,
        correlations: [firstCorr, secondCorr],
        duration: secondHalf.length * 24,
        confidence: detected ? 0.6 : 0.3 // Lower confidence with synthetic data
      };
    }
  }

  /**
   * Get market benchmark returns (e.g., S&P 500) for correlation analysis
   */
  private async getMarketBenchmarkReturns(length: number): Promise<number[]> {
    try {
      // Try to get benchmark data from database or external source
      // This is a simplified implementation - in practice, you'd integrate with
      // your existing data providers (Yahoo Finance, Alpha Vantage, etc.)
      
      const query = `
        SELECT daily_return 
        FROM market_benchmark 
        WHERE symbol = 'SPY' 
        ORDER BY date DESC 
        LIMIT $1
      `;
      
      const result = await this.dbManager.executeQuery<{ daily_return: number }>(query, [length]);
      
      if (result.length >= length * 0.8) { // At least 80% of requested data
        return result.map(row => row.daily_return).reverse(); // Reverse to get chronological order
      } else {
        throw new Error('Insufficient benchmark data available');
      }

    } catch (error) {
      // Fallback to synthetic data if real data unavailable
      logger.debug('anomaly-detector', 'Using synthetic market data for correlation analysis', {
        error: (error as Error).message
      });
      return this.generateSyntheticMarketReturns(length);
    }
  }

  /**
   * Detect regime change in market conditions
   */
  private detectRegimeChange(performance: PerformanceMetrics[]): {
    detected: boolean;
    oldRegime: string;
    newRegime: string;
    indicators: any[];
    duration: number;
    confidence: number;
  } {
    if (performance.length < 10) {
      return {
        detected: false,
        oldRegime: 'unknown',
        newRegime: 'unknown',
        indicators: [],
        duration: 0,
        confidence: 0
      };
    }

    // Simplified regime detection based on volatility and returns
    const midPoint = Math.floor(performance.length / 2);
    const firstHalf = performance.slice(0, midPoint);
    const secondHalf = performance.slice(midPoint);

    const firstVolatility = firstHalf.reduce((sum, p) => sum + p.volatility, 0) / firstHalf.length;
    const secondVolatility = secondHalf.reduce((sum, p) => sum + p.volatility, 0) / secondHalf.length;

    const firstReturns = firstHalf.reduce((sum, p) => sum + p.totalReturn, 0) / firstHalf.length;
    const secondReturns = secondHalf.reduce((sum, p) => sum + p.totalReturn, 0) / secondHalf.length;

    const volatilityChange = (secondVolatility - firstVolatility) / firstVolatility;
    const returnsChange = secondReturns - firstReturns;

    let oldRegime = 'normal';
    let newRegime = 'normal';

    // Classify regimes based on volatility and returns
    if (firstVolatility > 0.2) oldRegime = 'high_volatility';
    else if (firstReturns > 0.1) oldRegime = 'bull_market';
    else if (firstReturns < -0.1) oldRegime = 'bear_market';

    if (secondVolatility > 0.2) newRegime = 'high_volatility';
    else if (secondReturns > 0.1) newRegime = 'bull_market';
    else if (secondReturns < -0.1) newRegime = 'bear_market';

    const detected = oldRegime !== newRegime && Math.abs(volatilityChange) > 0.3;

    return {
      detected,
      oldRegime,
      newRegime,
      indicators: [
        { metric: 'volatility_change', value: volatilityChange },
        { metric: 'returns_change', value: returnsChange }
      ],
      duration: secondHalf.length * 24,
      confidence: detected ? 0.6 : 0.2
    };
  }

  /**
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const xVal = x[i];
      const yVal = y[i];
      if (xVal === undefined || yVal === undefined) continue;
      
      const deltaX = xVal - meanX;
      const deltaY = yVal - meanY;
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate synthetic market returns for correlation analysis
   */
  private generateSyntheticMarketReturns(length: number): number[] {
    const returns: number[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
      const randomReturn = (Math.random() - 0.5) * 0.04; // ±2% daily return
      price *= (1 + randomReturn);
      returns.push(randomReturn);
    }

    return returns;
  }

  /**
   * Map statistical anomaly type to performance anomaly type
   */
  private mapStatisticalAnomalyType(type: string): 'performance_degradation' | 'unusual_volatility' | 'correlation_break' | 'drawdown_spike' {
    switch (type) {
      case 'z_score':
      case 'percentile':
        return 'performance_degradation';
      default:
        return 'unusual_volatility';
    }
  }

  /**
   * Check if an alert can be created (respects cooldown)
   */
  private canCreateAlert(strategyId: string): boolean {
    const now = new Date();
    const alertHistory = this.alertHistory.get(strategyId) || [];
    
    // Remove old alerts outside cooldown period
    const cooldownMs = this.config.alertCooldownPeriod * 60 * 1000;
    const recentAlerts = alertHistory.filter(alertTime => 
      now.getTime() - alertTime.getTime() < cooldownMs
    );

    // Check hourly limit
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const alertsInLastHour = recentAlerts.filter(alertTime => alertTime > hourAgo);

    return alertsInLastHour.length < this.config.maxAlertsPerHour;
  }

  /**
   * Record alert creation for cooldown tracking
   */
  private recordAlertCreation(strategyId: string): void {
    const now = new Date();
    const alertHistory = this.alertHistory.get(strategyId) || [];
    alertHistory.push(now);
    
    // Keep only recent alerts
    const cooldownMs = this.config.alertCooldownPeriod * 60 * 1000;
    const recentAlerts = alertHistory.filter(alertTime => 
      now.getTime() - alertTime.getTime() < cooldownMs
    );
    
    this.alertHistory.set(strategyId, recentAlerts);
  }

  /**
   * Initialize statistical baselines for existing strategies
   */
  private async initializeStatisticalBaselines(): Promise<void> {
    try {
      // Load historical performance data from database
      const strategies = await this.loadExistingStrategies();
      
      for (const strategyId of strategies) {
        const historicalData = await this.loadHistoricalPerformance(strategyId);
        
        if (historicalData.length >= 10) {
          const baseline = this.calculateStatisticalBaseline(historicalData);
          this.statisticalBaselines.set(strategyId, baseline);
          
          logger.debug('anomaly-detector', 'Statistical baseline calculated', {
            strategyId,
            dataPoints: historicalData.length,
            mean: baseline.mean,
            stdDev: baseline.stdDev
          });
        }
      }

      logger.info('anomaly-detector', 'Statistical baselines initialized', {
        strategiesProcessed: strategies.length,
        baselinesCreated: this.statisticalBaselines.size
      });

    } catch (error) {
      logger.warn('anomaly-detector', 'Failed to initialize statistical baselines, using defaults', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Load existing strategy IDs from database
   */
  private async loadExistingStrategies(): Promise<string[]> {
    try {
      if (!this.dbManager.initialized) {
        return [];
      }

      const query = `
        SELECT DISTINCT strategy_id 
        FROM performance_metrics 
        WHERE created_at > NOW() - INTERVAL '90 days'
        ORDER BY strategy_id
      `;
      
      const result = await this.dbManager.executeQuery<{ strategy_id: string }>(query);
      return result.map(row => row.strategy_id);

    } catch (error) {
      logger.warn('anomaly-detector', 'Failed to load existing strategies', {
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Load historical performance data for a strategy
   */
  private async loadHistoricalPerformance(strategyId: string): Promise<PerformanceMetrics[]> {
    try {
      if (!this.dbManager.initialized) {
        return [];
      }

      const query = `
        SELECT 
          total_return,
          annualized_return,
          volatility,
          sharpe_ratio,
          sortino_ratio,
          max_drawdown,
          win_rate,
          trades_count,
          created_at
        FROM performance_metrics 
        WHERE strategy_id = $1 
          AND created_at > NOW() - INTERVAL '90 days'
        ORDER BY created_at ASC
      `;
      
      const result = await this.dbManager.executeQuery<any>(query, [strategyId]);
      
      return result.map(row => ({
        totalReturn: row.total_return || 0,
        annualizedReturn: row.annualized_return || 0,
        volatility: row.volatility || 0,
        sharpeRatio: row.sharpe_ratio || 0,
        sortinoRatio: row.sortino_ratio || 0,
        calmarRatio: 0, // Not stored in this simplified version
        maxDrawdown: row.max_drawdown || 0,
        winRate: row.win_rate || 0,
        profitFactor: 0, // Not stored in this simplified version
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        tradesCount: row.trades_count || 0,
        averageHoldingPeriod: 0
      }));

    } catch (error) {
      logger.warn('anomaly-detector', 'Failed to load historical performance', {
        strategyId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Calculate statistical baseline from historical data
   */
  private calculateStatisticalBaseline(data: PerformanceMetrics[]): StatisticalBaseline {
    const returns = data.map(d => d.totalReturn);
    const sharpeRatios = data.map(d => d.sharpeRatio);
    const volatilities = data.map(d => d.volatility);

    // Calculate means
    const returnMean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const sharpeMean = sharpeRatios.reduce((sum, val) => sum + val, 0) / sharpeRatios.length;
    const volatilityMean = volatilities.reduce((sum, val) => sum + val, 0) / volatilities.length;

    // Calculate standard deviations
    const returnStdDev = Math.sqrt(returns.reduce((sum, val) => sum + Math.pow(val - returnMean, 2), 0) / (returns.length - 1));
    const sharpeStdDev = Math.sqrt(sharpeRatios.reduce((sum, val) => sum + Math.pow(val - sharpeMean, 2), 0) / (sharpeRatios.length - 1));
    const volatilityStdDev = Math.sqrt(volatilities.reduce((sum, val) => sum + Math.pow(val - volatilityMean, 2), 0) / (volatilities.length - 1));

    // Calculate percentiles
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const percentiles: Record<number, number> = {};
    [5, 10, 25, 50, 75, 90, 95].forEach(p => {
      const index = Math.floor((p / 100) * (sortedReturns.length - 1));
      const value = sortedReturns[index];
      if (value !== undefined) {
        percentiles[p] = value;
      }
    });

    return {
      mean: returnMean,
      stdDev: returnStdDev,
      percentiles,
      lastUpdated: new Date()
    };
  }

  /**
   * Ensure the detector is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AnomalyDetector not initialized. Call initialize() first.');
    }
  }
}

interface StatisticalBaseline {
  mean: number;
  stdDev: number;
  percentiles: Record<number, number>;
  lastUpdated: Date;
}

/**
 * Create anomaly detector instance
 */
export function createAnomalyDetector(
  config: AnomalyDetectionConfig,
  dbManager: DatabaseManager,
  performanceMonitor: PerformanceMonitor
): AnomalyDetector {
  return new AnomalyDetector(config, dbManager, performanceMonitor);
}

/**
 * Default anomaly detection configuration
 */
export function getDefaultAnomalyDetectionConfig(): AnomalyDetectionConfig {
  return {
    zScoreThreshold: 2.5,
    percentileThreshold: 95,
    rollingWindowSize: 30,
    maxDrawdownThreshold: 0.15, // 15%
    sharpeRatioThreshold: 0.5,
    volatilityThreshold: 0.25, // 25%
    returnThreshold: -0.1, // -10%
    consecutiveNegativeReturns: 5,
    correlationBreakThreshold: 0.3,
    volumeAnomalyThreshold: 2.0,
    enableRealTimeAlerts: true,
    alertCooldownPeriod: 30, // 30 minutes
    maxAlertsPerHour: 5
  };
}