/**
 * Analytics Service for Enhanced Trading Graph
 *
 * Handles analytics, statistics, and reporting operations.
 */

import { createLogger } from '../../utils/enhanced-logger';

export interface AnalyticsServiceConfig {
  enableAnalytics: boolean;
}

/**
 * Service for managing analytics and statistics
 */
export class AnalyticsService {
  private logger: any;
  private enableAnalytics: boolean;
  private analytics: Map<string, any>;

  constructor(config: AnalyticsServiceConfig) {
    this.logger = createLogger('graph', 'analytics-service');
    this.enableAnalytics = config.enableAnalytics;
    this.analytics = new Map();
  }

  /**
   * Record analytics event
   */
  recordEvent(eventType: string, data: any): void {
    if (!this.enableAnalytics) {
      return;
    }

    try {
      const event = {
        timestamp: new Date().toISOString(),
        type: eventType,
        data: data
      };

      if (!this.analytics.has(eventType)) {
        this.analytics.set(eventType, []);
      }

      const events = this.analytics.get(eventType);
      events.push(event);

      // Keep only last 1000 events per type to prevent memory issues
      if (events.length > 1000) {
        events.shift();
      }

      this.logger.debug('recordEvent', `Analytics event recorded: ${eventType}`, { data });
    } catch (error) {
      this.logger.warn('recordEvent', 'Failed to record analytics event', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): any {
    if (!this.enableAnalytics) {
      return { message: 'Analytics not enabled' };
    }

    try {
      const summary: any = {
        totalEvents: 0,
        eventTypes: {},
        timeRange: {
          earliest: null,
          latest: null
        }
      };

      for (const [eventType, events] of this.analytics.entries()) {
        summary.eventTypes[eventType] = events.length;
        summary.totalEvents += events.length;

        // Update time range
        if (events.length > 0) {
          const timestamps = events.map((e: any) => e.timestamp);
          const earliest = Math.min(...timestamps.map((t: string) => new Date(t).getTime()));
          const latest = Math.max(...timestamps.map((t: string) => new Date(t).getTime()));

          if (!summary.timeRange.earliest || earliest < new Date(summary.timeRange.earliest).getTime()) {
            summary.timeRange.earliest = new Date(earliest).toISOString();
          }
          if (!summary.timeRange.latest || latest > new Date(summary.timeRange.latest).getTime()) {
            summary.timeRange.latest = new Date(latest).toISOString();
          }
        }
      }

      return summary;
    } catch (error) {
      this.logger.error('getAnalyticsSummary', 'Failed to generate analytics summary', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { error: 'Failed to generate analytics summary' };
    }
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 100): any[] {
    if (!this.enableAnalytics) {
      return [];
    }

    try {
      const events = this.analytics.get(eventType) || [];
      return events.slice(-limit); // Return most recent events
    } catch (error) {
      this.logger.warn('getEventsByType', 'Failed to get events by type', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    if (!this.enableAnalytics) {
      return;
    }

    try {
      this.analytics.clear();
      this.logger.info('clearAnalytics', 'Analytics data cleared');
    } catch (error) {
      this.logger.warn('clearAnalytics', 'Failed to clear analytics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if analytics is available
   */
  isAnalyticsAvailable(): boolean {
    return this.enableAnalytics;
  }
}

/**
 * Factory function to create AnalyticsService instance
 */
export function createAnalyticsService(config: AnalyticsServiceConfig): AnalyticsService {
  return new AnalyticsService(config);
}