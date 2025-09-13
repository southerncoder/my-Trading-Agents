/**
 * Unit Tests for Supervised Learning Engine
 *
 * Tests the LLM-powered supervised learning functionality
 */

import { SupervisedLearningEngine } from '../../src/learning/supervised-engine.ts';
import { jest } from '@jest/globals';

describe('SupervisedLearningEngine', () => {
  let engine: SupervisedLearningEngine;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    engine = new SupervisedLearningEngine(mockLogger);
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      const health = engine.getHealth();
      expect(health).toBe(true);
    });
  });

  describe('Model Training', () => {
    it('should train a model successfully', async () => {
      const trainingExamples = [
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
          features: { rsi: 45, volume: 0.8, sentiment: 0.4 },
          target: -0.02,
          timestamp: '2025-09-07T11:00:00Z',
          market_conditions: { volatility: 'low', trend: 'bearish' },
          outcome: {
            realized_return: -0.015,
            risk_adjusted_return: -0.018,
            holding_period: 3,
            confidence_score: 0.7
          }
        }
      ];

      const model = await engine.trainModel('test-model', 'random_forest', trainingExamples);

      expect(model).toBeDefined();
      expect(model.model_id).toBe('test-model');
      expect(model.algorithm).toBe('random_forest');
      expect(model.training_data_size).toBe(trainingExamples.length);
    });
  });

  describe('Prediction', () => {
    it('should make predictions', async () => {
      // First train a model
      const trainingExamples = [
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
        }
      ];

      await engine.trainModel('test-model', 'random_forest', trainingExamples);

      const features = { rsi: 55, volume: 1.0, sentiment: 0.6 };
      const prediction = await engine.predict('test-model', features);

      expect(prediction).toBeDefined();
      expect(typeof prediction.prediction).toBe('number');
      expect(typeof prediction.confidence).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent model gracefully', async () => {
      const features = { rsi: 55, volume: 1.0, sentiment: 0.6 };

      await expect(engine.predict('non-existent-model', features))
        .rejects
        .toThrow();
    });
  });
});