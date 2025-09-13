/**
 * Learning System Integration Tests
 *
 * Tests the integration of all learning engines
 */

import { SupervisedLearningEngine } from '../../src/learning/supervised-engine';
import { UnsupervisedLearningEngine } from '../../src/learning/unsupervised-engine';
import { ReinforcementLearningEngine } from '../../src/learning/reinforcement-engine';
import { LearningExample, ReinforcementLearningState } from '../../src/learning/learning-types';

// Add Jest globals for TypeScript
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

describe('Learning System Integration', () => {
  let supervisedEngine: SupervisedLearningEngine;
  let unsupervisedEngine: UnsupervisedLearningEngine;
  let reinforcementEngine: ReinforcementLearningEngine;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    supervisedEngine = new SupervisedLearningEngine(mockLogger);

    unsupervisedEngine = new UnsupervisedLearningEngine(mockLogger);

    reinforcementEngine = new ReinforcementLearningEngine({
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.8,
      explorationDecay: 0.995,
      minExplorationRate: 0.01
    }, mockLogger);
  });

  describe('Engine Health Checks', () => {
    it('should have all engines healthy', () => {
      expect(supervisedEngine.getHealth()).toBe(true);
      expect(unsupervisedEngine.getHealth()).toBe(true);
      expect(reinforcementEngine.getHealth()).toBe(true);
    });
  });

  describe('Supervised Learning Integration', () => {
    it('should train and predict with supervised engine', async () => {
      const trainingData: LearningExample[] = [
        {
          id: '1',
          features: { rsi: 30, volume: 1.2, sentiment: 0.3 },
          target: 0.05,
          timestamp: '2025-09-07T10:00:00Z',
          market_conditions: { volatility: 0.15, trend: 'bullish' },
          outcome: {
            realized_return: 0.05,
            risk_adjusted_return: 0.03,
            holding_period: 5,
            confidence_score: 0.8
          }
        },
        {
          id: '2',
          features: { rsi: 70, volume: 0.8, sentiment: 0.7 },
          target: -0.03,
          timestamp: '2025-09-07T11:00:00Z',
          market_conditions: { volatility: 0.12, trend: 'bearish' },
          outcome: {
            realized_return: -0.03,
            risk_adjusted_return: -0.05,
            holding_period: 3,
            confidence_score: 0.75
          }
        }
      ];

      await expect(supervisedEngine.trainModel('test_model', 'linear_regression', trainingData)).resolves.not.toThrow();

      const prediction = await supervisedEngine.predict('test_model', {
        rsi: 50,
        volume: 1.0,
        sentiment: 0.5
      });

      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.prediction).toBeGreaterThanOrEqual(-1);
      expect(prediction.prediction).toBeLessThanOrEqual(1);
    });
  });

  describe('Unsupervised Learning Integration', () => {
    it('should cluster data with unsupervised engine', async () => {
      const data = [
        { rsi: 30, volume: 1.2, sentiment: 0.3 },
        { rsi: 70, volume: 0.8, sentiment: 0.7 },
        { rsi: 45, volume: 1.0, sentiment: 0.5 },
        { rsi: 25, volume: 1.5, sentiment: 0.2 },
        { rsi: 75, volume: 0.7, sentiment: 0.8 }
      ];

      const learningExamples: LearningExample[] = data.map((item: any, index: number) => ({
        id: `example_${index}`,
        features: item,
        target: Math.random() * 0.1 - 0.05, // Random target between -5% and +5%
        timestamp: new Date(Date.now() - index * 60000).toISOString(),
        market_conditions: { volatility: 0.1 + Math.random() * 0.2 },
        outcome: {
          realized_return: Math.random() * 0.2 - 0.1,
          risk_adjusted_return: Math.random() * 0.15 - 0.075,
          holding_period: Math.floor(Math.random() * 10) + 1,
          confidence_score: 0.5 + Math.random() * 0.4
        }
      }));

      const clusteringResult = await unsupervisedEngine.performClustering(learningExamples, 3, 'kmeans');
      expect(clusteringResult.clusters).toBeDefined();
      expect(Array.isArray(clusteringResult.clusters)).toBe(true);
      expect(clusteringResult.clusters.length).toBe(3); // Should have 3 clusters

      // Check that all clusters have required properties
      clusteringResult.clusters.forEach((cluster: any) => {
        expect(cluster).toHaveProperty('cluster_id');
        expect(cluster).toHaveProperty('centroid');
        expect(cluster).toHaveProperty('members');
        expect(cluster).toHaveProperty('size');
      });
    });
  });

  describe('Reinforcement Learning Integration', () => {
    it('should learn from experience with reinforcement engine', async () => {
      const state: ReinforcementLearningState = {
        state_id: 'test_state',
        market_features: { rsi: 50, volume: 1.0, sentiment: 0.5 },
        portfolio_state: { cash: 10000, positions: 5 },
        timestamp: '2025-09-07T10:00:00Z',
        reward: 0.02
      };

      await expect(reinforcementEngine.learnFromExperience(state, 'BUY', 100, state)).resolves.not.toThrow();

      const action = reinforcementEngine.chooseAction(state, ['BUY', 'SELL', 'HOLD']);
      expect(['BUY', 'SELL', 'HOLD']).toContain(action);
    });
  });

  describe('Cross-Engine Statistics', () => {
    it('should have all engines properly initialized', () => {
      expect(supervisedEngine.getHealth()).toBe(true);
      expect(unsupervisedEngine.getHealth()).toBe(true);
      expect(reinforcementEngine.getHealth()).toBe(true);
    });
  });

  describe('Engine Insights Generation', () => {
    it('should generate insights from learning data', async () => {
      const states: ReinforcementLearningState[] = [
        {
          state_id: 'state1',
          market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
          portfolio_state: { cash: 10000, positions: 5 },
          timestamp: '2025-09-07T10:00:00Z'
        }
      ];

      const insights = await reinforcementEngine.getInsights(states);
      expect(Array.isArray(insights)).toBe(true);
    });
  });
});