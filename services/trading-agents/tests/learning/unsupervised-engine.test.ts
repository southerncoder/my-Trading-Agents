/**
 * Unit Tests for Unsupervised Learning Engine
 *
 * Tests the LLM-powered unsupervised learning functionality
 */

import { UnsupervisedLearningEngine } from '../../src/learning/unsupervised-engine';
import { LearningExample } from '../../src/learning/learning-types';

// Add Jest globals for TypeScript
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

describe('UnsupervisedLearningEngine', () => {
  let engine: UnsupervisedLearningEngine;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    engine = new UnsupervisedLearningEngine(mockLogger);
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      const health = engine.getHealth();
      expect(health).toBe(true);
    });
  });

  describe('Clustering Analysis', () => {
    it('should perform clustering on market data', async () => {
      const examples: LearningExample[] = [
        {
          id: '1',
          features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
          target: 0.05,
          timestamp: '2025-09-07T10:00:00Z',
          market_conditions: { volatility: 'medium', trend: 'bullish' },
          outcome: {
            realized_return: 0.03,
            risk_adjusted_return: 0.025,
            holding_period: 5,
            confidence_score: 0.8
          }
        },
        {
          id: '2',
          features: { rsi: 75, volume: 0.8, sentiment: 0.6 },
          target: -0.02,
          timestamp: '2025-09-07T11:00:00Z',
          market_conditions: { volatility: 'high', trend: 'bearish' },
          outcome: {
            realized_return: -0.02,
            risk_adjusted_return: -0.025,
            holding_period: 3,
            confidence_score: 0.7
          }
        },
        {
          id: '3',
          features: { rsi: 45, volume: 1.0, sentiment: 0.4 },
          target: 0.01,
          timestamp: '2025-09-07T12:00:00Z',
          market_conditions: { volatility: 'low', trend: 'sideways' },
          outcome: {
            realized_return: 0.01,
            risk_adjusted_return: 0.008,
            holding_period: 7,
            confidence_score: 0.6
          }
        }
      ];

      const result = await engine.performClustering(examples, 2, 'kmeans');

      expect(result).toHaveProperty('clusters');
      expect(result).toHaveProperty('silhouette_score');
      expect(Array.isArray(result.clusters)).toBe(true);
      expect(result.clusters.length).toBe(2);

      // Check cluster structure
      result.clusters.forEach((cluster: any) => {
        expect(cluster).toHaveProperty('cluster_id');
        expect(cluster).toHaveProperty('centroid');
        expect(cluster).toHaveProperty('members');
        expect(cluster).toHaveProperty('size');
        expect(Array.isArray(cluster.members)).toBe(true);
      });
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalies in market data', async () => {
      const examples: LearningExample[] = [
        {
          id: '1',
          features: { rsi: 50, volume: 1.0, sentiment: 0.5 },
          target: 0.02,
          timestamp: '2025-09-07T10:00:00Z',
          market_conditions: { volatility: 'medium' },
          outcome: {
            realized_return: 0.02,
            risk_adjusted_return: 0.015,
            holding_period: 5,
            confidence_score: 0.8
          }
        },
        {
          id: '2',
          features: { rsi: 95, volume: 3.0, sentiment: 0.9 }, // Anomalous
          target: 0.15,
          timestamp: '2025-09-07T11:00:00Z',
          market_conditions: { volatility: 'extreme' },
          outcome: {
            realized_return: 0.15,
            risk_adjusted_return: 0.12,
            holding_period: 2,
            confidence_score: 0.9
          }
        }
      ];

      const result = await engine.detectAnomalies(examples);

      expect(Array.isArray(result.anomalies)).toBe(true);
      if (result.anomalies.length > 0) {
        result.anomalies.forEach((anomaly: any) => {
          expect(anomaly).toHaveProperty('id');
          expect(anomaly).toHaveProperty('features');
          expect(anomaly).toHaveProperty('outcome');
          expect(typeof anomaly.id).toBe('string');
        });
      }
    });
  });
});