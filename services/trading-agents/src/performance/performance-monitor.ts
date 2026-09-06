/**
 * Comprehensive Performance Monitoring System
 * 
 * Real-time performance tracking, regression testing, and optimization
 * for web-based workloads with CI/CD integration.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { createLogger } from '../utils/enhanced-logger';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';
import { globalCache } from './advanced-caching';
import { getDatabaseOptimizer } from './database-optimization';

const logger = createLogger('system', 'performance-monitor');

export interface PerformanceMetrics {
    timestamp: Date;
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    memory: {
        used: number;
        free: number;
        total: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    eventLoop: {
        delay: number;
        utilization: number;
    };
    gc: {
        collections: number;
        duration: number;
        type: string;
    }[];
    network: {
        bytesReceived: number;
        bytesSent: number;
        connectionsActive: number;
    };
    database: {
        activeConnections: number;
        queryTime: number;
        slowQueries: number;
    };
    cache: {
        hitRate: number;
        size: number;
        operations: number;
    };
    api: {
        requestsPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
    };
}

export interface PerformanceThresholds {
    cpu: {
        warning: number;
        critical: number;
    };
    memory: {
        warning: number;
        critical: number;
    };
    eventLoop: {
        delayWarning: number;
        delayCritical: number;
    };
    database: {
        queryTimeWarning: number;
        queryTimeCritical: number;
    };
    api: {
        responseTimeWarning: number;
        responseTimeCritical: number;
        errorRateWarning: number;
        errorRateCritical: number;
    };
}

export interface PerformanceAlert {
    id: string;
    timestamp: Date;
    severity: 'warning' | 'critical';
    metric: string;
    value: number;
    threshold: number;
    message: string;
    resolved?: boolean;
    resolvedAt?: Date;
}

export interface PerformanceBenchmark {
    name: string;
    timestamp: Date;
    duration: number;
    throughput: number;
    memoryUsage: number;
    success: boolean;
    metadata?: Record<string, any>;
}

/**
 * Comprehensive performance monitoring and alerting system
 */
export class PerformanceMonitor {
    private metrics: PerformanceMetrics[] = [];
    private alerts: PerformanceAlert[] = [];
    private benchmarks: PerformanceBenchmark[] = [];
    private thresholds: PerformanceThresholds;
    private monitoringInterval?: NodeJS.Timeout;
    private gcObserver?: any;
    private eventLoopMonitor?: any;

    // Performance counters
    private requestCount = 0;
    private responseTimeSum = 0;
    private errorCount = 0;
    private lastRequestTime = Date.now();

    // OpenTelemetry metrics
    private cpuGauge?: any;
    private memoryGauge?: any;
    private eventLoopGauge?: any;
    private responseTimeHistogram?: any;
    private requestCounter?: any;
    private errorCounter?: any;

    constructor(thresholds?: Partial<PerformanceThresholds>) {
        this.thresholds = {
            cpu: {
                warning: thresholds?.cpu?.warning || 70,
                critical: thresholds?.cpu?.critical || 90
            },
            memory: {
                warning: thresholds?.memory?.warning || 80,
                critical: thresholds?.memory?.critical || 95
            },
            eventLoop: {
                delayWarning: thresholds?.eventLoop?.delayWarning || 10,
                delayCritical: thresholds?.eventLoop?.delayCritical || 50
            },
            database: {
                queryTimeWarning: thresholds?.database?.queryTimeWarning || 1000,
                queryTimeCritical: thresholds?.database?.queryTimeCritical || 5000
            },
            api: {
                responseTimeWarning: thresholds?.api?.responseTimeWarning || 500,
                responseTimeCritical: thresholds?.api?.responseTimeCritical || 2000,
                errorRateWarning: thresholds?.api?.errorRateWarning || 5,
                errorRateCritical: thresholds?.api?.errorRateCritical || 10
            }
        };

        this.initializeMetrics();
        this.startMonitoring();

        logger.info('performance-monitor', 'Performance monitoring initialized', {
            thresholds: this.thresholds
        });
    }

    private initializeMetrics(): void {
        if (ENABLE_OTEL) {
            try {
                const meter = getMeter('trading-agents-performance');

                this.cpuGauge = meter.createUpDownCounter('system_cpu_usage_percent', {
                    description: 'CPU usage percentage'
                });

                this.memoryGauge = meter.createUpDownCounter('system_memory_usage_bytes', {
                    description: 'Memory usage in bytes'
                });

                this.eventLoopGauge = meter.createUpDownCounter('nodejs_eventloop_delay_ms', {
                    description: 'Event loop delay in milliseconds'
                });

                this.responseTimeHistogram = meter.createHistogram('http_request_duration_ms', {
                    description: 'HTTP request duration in milliseconds'
                });

                this.requestCounter = meter.createCounter('http_requests_total', {
                    description: 'Total number of HTTP requests'
                });

                this.errorCounter = meter.createCounter('http_errors_total', {
                    description: 'Total number of HTTP errors'
                });
            } catch (error) {
                logger.warn('performance-monitor', 'Failed to initialize OpenTelemetry metrics', { error });
            }
        }
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        // Collect metrics every 10 seconds
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 10000);

        // Monitor garbage collection
        this.setupGCMonitoring();

        // Monitor event loop
        this.setupEventLoopMonitoring();

        logger.info('performance-monitor', 'Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.gcObserver) {
            this.gcObserver.disconnect();
        }

        if (this.eventLoopMonitor) {
            clearInterval(this.eventLoopMonitor);
        }

        logger.info('performance-monitor', 'Performance monitoring stopped');
    }

    /**
     * Record API request metrics
     */
    recordRequest(responseTime: number, success: boolean = true): void {
        this.requestCount++;
        this.responseTimeSum += responseTime;

        if (!success) {
            this.errorCount++;
        }

        // Record OpenTelemetry metrics
        if (this.requestCounter) {
            this.requestCounter.add(1, { success: success.toString() });
        }

        if (this.responseTimeHistogram) {
            this.responseTimeHistogram.record(responseTime);
        }

        if (!success && this.errorCounter) {
            this.errorCounter.add(1);
        }
    }

    /**
     * Run performance benchmark
     */
    async runBenchmark(
        name: string,
        testFunction: () => Promise<void>,
        iterations: number = 100
    ): Promise<PerformanceBenchmark> {
        const startTime = Date.now();
        const initialMemory = process.memoryUsage().heapUsed;
        let success = true;

        try {
            for (let i = 0; i < iterations; i++) {
                await testFunction();
            }
        } catch (error) {
            success = false;
            logger.error('performance-monitor', 'Benchmark failed', { name, error });
        }

        const duration = Date.now() - startTime;
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryUsage = finalMemory - initialMemory;
        const throughput = success ? (iterations / duration) * 1000 : 0; // operations per second

        const benchmark: PerformanceBenchmark = {
            name,
            timestamp: new Date(),
            duration,
            throughput,
            memoryUsage,
            success,
            metadata: {
                iterations,
                averageTime: duration / iterations
            }
        };

        this.benchmarks.push(benchmark);

        logger.info('performance-monitor', 'Benchmark completed', {
            name,
            duration,
            throughput,
            memoryUsage,
            success
        });

        return benchmark;
    }

    /**
     * Get current performance metrics
     */
    getCurrentMetrics(): PerformanceMetrics {
        return this.collectMetrics();
    }

    /**
     * Get historical metrics
     */
    getHistoricalMetrics(limit: number = 100): PerformanceMetrics[] {
        return this.metrics.slice(-limit);
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(): PerformanceAlert[] {
        return this.alerts.filter(alert => !alert.resolved);
    }

    /**
     * Get recent benchmarks
     */
    getRecentBenchmarks(limit: number = 50): PerformanceBenchmark[] {
        return this.benchmarks.slice(-limit);
    }

    /**
     * Check for performance regressions
     */
    checkRegressions(baselineBenchmarks: PerformanceBenchmark[]): {
        regressions: Array<{
            benchmark: string;
            current: number;
            baseline: number;
            regression: number;
        }>;
        improvements: Array<{
            benchmark: string;
            current: number;
            baseline: number;
            improvement: number;
        }>;
    } {
        const regressions: any[] = [];
        const improvements: any[] = [];

        for (const baseline of baselineBenchmarks) {
            const current = this.benchmarks
                .filter(b => b.name === baseline.name)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

            if (current) {
                const performanceChange = ((current.throughput - baseline.throughput) / baseline.throughput) * 100;

                if (performanceChange < -10) { // 10% regression threshold
                    regressions.push({
                        benchmark: baseline.name,
                        current: current.throughput,
                        baseline: baseline.throughput,
                        regression: Math.abs(performanceChange)
                    });
                } else if (performanceChange > 10) { // 10% improvement threshold
                    improvements.push({
                        benchmark: baseline.name,
                        current: current.throughput,
                        baseline: baseline.throughput,
                        improvement: performanceChange
                    });
                }
            }
        }

        return { regressions, improvements };
    }

    /**
     * Generate performance report
     */
    generateReport(): {
        summary: {
            averageCpuUsage: number;
            averageMemoryUsage: number;
            averageResponseTime: number;
            errorRate: number;
            cacheHitRate: number;
        };
        alerts: PerformanceAlert[];
        benchmarks: PerformanceBenchmark[];
        recommendations: string[];
    } {
        const recentMetrics = this.metrics.slice(-100);
        const activeAlerts = this.getActiveAlerts();
        const recentBenchmarks = this.getRecentBenchmarks(20);

        const summary = {
            averageCpuUsage: recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length || 0,
            averageMemoryUsage: recentMetrics.reduce((sum, m) => sum + (m.memory.used / m.memory.total) * 100, 0) / recentMetrics.length || 0,
            averageResponseTime: this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
            cacheHitRate: globalCache.getStats().l1.hitRate * 100
        };

        const recommendations = this.generateRecommendations(summary, activeAlerts);

        return {
            summary,
            alerts: activeAlerts,
            benchmarks: recentBenchmarks,
            recommendations
        };
    }

    private collectMetrics(): PerformanceMetrics {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Calculate CPU usage percentage (simplified)
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

        // Get cache stats
        const cacheStats = globalCache.getStats();

        // Get database stats
        let dbStats = { activeConnections: 0, queryTime: 0, slowQueries: 0 };
        try {
            const dbOptimizer = getDatabaseOptimizer();
            const dbMetrics = dbOptimizer.getStats();
            dbStats = {
                activeConnections: dbMetrics.active,
                queryTime: dbMetrics.averageQueryTime,
                slowQueries: dbMetrics.slowQueries
            };
        } catch (error) {
            // Database optimizer not initialized
        }

        const metrics: PerformanceMetrics = {
            timestamp: new Date(),
            cpu: {
                usage: Math.min(cpuPercent, 100),
                loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
            },
            memory: {
                used: memUsage.rss,
                free: require('os').freemem(),
                total: require('os').totalmem(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            },
            eventLoop: {
                delay: this.getEventLoopDelay(),
                utilization: this.getEventLoopUtilization()
            },
            gc: this.getGCMetrics(),
            network: {
                bytesReceived: 0, // Would need network monitoring
                bytesSent: 0,
                connectionsActive: 0
            },
            database: dbStats,
            cache: {
                hitRate: cacheStats.l1.hitRate,
                size: cacheStats.l1.size,
                operations: cacheStats.performance.totalOperations
            },
            api: {
                requestsPerSecond: this.calculateRequestsPerSecond(),
                averageResponseTime: this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0,
                errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
            }
        };

        this.metrics.push(metrics);

        // Keep only last 1000 metrics
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }

        // Check thresholds and generate alerts
        this.checkThresholds(metrics);

        // Update OpenTelemetry metrics
        this.updateOpenTelemetryMetrics(metrics);

        return metrics;
    }

    private checkThresholds(metrics: PerformanceMetrics): void {
        const alerts: PerformanceAlert[] = [];

        // CPU usage alerts
        if (metrics.cpu.usage > this.thresholds.cpu.critical) {
            alerts.push(this.createAlert('critical', 'cpu_usage', metrics.cpu.usage, this.thresholds.cpu.critical, 'Critical CPU usage detected'));
        } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
            alerts.push(this.createAlert('warning', 'cpu_usage', metrics.cpu.usage, this.thresholds.cpu.warning, 'High CPU usage detected'));
        }

        // Memory usage alerts
        const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
        if (memoryUsagePercent > this.thresholds.memory.critical) {
            alerts.push(this.createAlert('critical', 'memory_usage', memoryUsagePercent, this.thresholds.memory.critical, 'Critical memory usage detected'));
        } else if (memoryUsagePercent > this.thresholds.memory.warning) {
            alerts.push(this.createAlert('warning', 'memory_usage', memoryUsagePercent, this.thresholds.memory.warning, 'High memory usage detected'));
        }

        // Event loop delay alerts
        if (metrics.eventLoop.delay > this.thresholds.eventLoop.delayCritical) {
            alerts.push(this.createAlert('critical', 'event_loop_delay', metrics.eventLoop.delay, this.thresholds.eventLoop.delayCritical, 'Critical event loop delay detected'));
        } else if (metrics.eventLoop.delay > this.thresholds.eventLoop.delayWarning) {
            alerts.push(this.createAlert('warning', 'event_loop_delay', metrics.eventLoop.delay, this.thresholds.eventLoop.delayWarning, 'High event loop delay detected'));
        }

        // API response time alerts
        if (metrics.api.averageResponseTime > this.thresholds.api.responseTimeCritical) {
            alerts.push(this.createAlert('critical', 'api_response_time', metrics.api.averageResponseTime, this.thresholds.api.responseTimeCritical, 'Critical API response time detected'));
        } else if (metrics.api.averageResponseTime > this.thresholds.api.responseTimeWarning) {
            alerts.push(this.createAlert('warning', 'api_response_time', metrics.api.averageResponseTime, this.thresholds.api.responseTimeWarning, 'High API response time detected'));
        }

        // Add new alerts
        this.alerts.push(...alerts);

        // Log alerts
        for (const alert of alerts) {
            logger.warn('performance-monitor', 'Performance alert generated', {
                severity: alert.severity,
                metric: alert.metric,
                value: alert.value,
                threshold: alert.threshold
            });
        }
    }

    private createAlert(
        severity: 'warning' | 'critical',
        metric: string,
        value: number,
        threshold: number,
        message: string
    ): PerformanceAlert {
        return {
            id: `${metric}_${Date.now()}`,
            timestamp: new Date(),
            severity,
            metric,
            value,
            threshold,
            message
        };
    }

    private updateOpenTelemetryMetrics(metrics: PerformanceMetrics): void {
        if (this.cpuGauge) {
            this.cpuGauge.add(metrics.cpu.usage);
        }

        if (this.memoryGauge) {
            this.memoryGauge.add(metrics.memory.used, { type: 'used' });
            this.memoryGauge.add(metrics.memory.free, { type: 'free' });
        }

        if (this.eventLoopGauge) {
            this.eventLoopGauge.add(metrics.eventLoop.delay);
        }
    }

    private setupGCMonitoring(): void {
        try {
            const { PerformanceObserver } = require('perf_hooks');
            this.gcObserver = new PerformanceObserver((list: any) => {
                const entries = list.getEntries();
                // GC metrics would be processed here
            });
            this.gcObserver.observe({ entryTypes: ['gc'] });
        } catch (error) {
            logger.warn('performance-monitor', 'GC monitoring not available', { error });
        }
    }

    private setupEventLoopMonitoring(): void {
        // Simple event loop delay monitoring
        let start = process.hrtime.bigint();
        this.eventLoopMonitor = setInterval(() => {
            const delta = process.hrtime.bigint() - start;
            start = process.hrtime.bigint();
            // Event loop delay calculation would be more sophisticated in production
        }, 1000);
    }

    private getEventLoopDelay(): number {
        // Simplified event loop delay calculation
        return 0;
    }

    private getEventLoopUtilization(): number {
        // Simplified event loop utilization calculation
        return 0;
    }

    private getGCMetrics(): PerformanceMetrics['gc'] {
        // Simplified GC metrics
        return [];
    }

    private calculateRequestsPerSecond(): number {
        const now = Date.now();
        const timeDiff = (now - this.lastRequestTime) / 1000;
        return timeDiff > 0 ? this.requestCount / timeDiff : 0;
    }

    private generateRecommendations(
        summary: any,
        alerts: PerformanceAlert[]
    ): string[] {
        const recommendations: string[] = [];

        if (summary.averageCpuUsage > 80) {
            recommendations.push('Consider optimizing CPU-intensive operations or scaling horizontally');
        }

        if (summary.averageMemoryUsage > 85) {
            recommendations.push('Memory usage is high - consider implementing memory optimization or increasing available memory');
        }

        if (summary.averageResponseTime > 1000) {
            recommendations.push('API response times are slow - consider implementing caching or optimizing database queries');
        }

        if (summary.errorRate > 5) {
            recommendations.push('Error rate is elevated - investigate and fix underlying issues');
        }

        if (summary.cacheHitRate < 70) {
            recommendations.push('Cache hit rate is low - consider adjusting cache TTL or improving cache key strategies');
        }

        if (alerts.some(a => a.severity === 'critical')) {
            recommendations.push('Critical performance issues detected - immediate attention required');
        }

        return recommendations;
    }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();