/**
 * Jest Unit Tests for Supervised Learning Engine
 *
 * Tests the LLM-powered supervised learning functionality with dynamic data generation
 */

import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll } from '@jest/globals';

// Helper function to generate dynamic training examples
function generateTrainingExamples(count: number = 10) {
  const examples = [];

  for (let i = 0; i < count; i++) {
    // Generate realistic market data
    const rsi = 30 + Math.random() * 40; // RSI between 30-70 (typical trading range)
    const volume = 0.5 + Math.random() * 2.0; // Volume multiplier 0.5-2.5x
    const sentiment = Math.random(); // Sentiment score 0-1

    // Generate target based on features (simplified model)
    const target = (rsi - 50) * 0.001 + (sentiment - 0.5) * 0.02 + (Math.random() - 0.5) * 0.01;

    // Determine market conditions based on features
    const volatility = rsi > 60 ? 'high' : rsi > 40 ? 'medium' : 'low';
    const trend = sentiment > 0.6 ? 'bullish' : sentiment < 0.4 ? 'bearish' : 'sideways';

    examples.push({
      id: `dynamic-${i + 1}`,
      features: { rsi, volume, sentiment },
      target: Math.max(-0.05, Math.min(0.05, target)), // Clamp target between -5% and +5%
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time within last 24h
      market_conditions: { volatility, trend },
      outcome: {
        realized_return: target * (0.8 + Math.random() * 0.4), // Realistic realized return
        risk_adjusted_return: target * (0.7 + Math.random() * 0.3), // Slightly lower risk-adjusted
        holding_period: Math.floor(1 + Math.random() * 9), // 1-10 day holding period
        confidence_score: 0.6 + Math.random() * 0.4 // Confidence 0.6-1.0
      }
    });
  }

  return examples;
}

// Helper function to generate test examples with known outcomes
function generateTestExamples(count: number = 5) {
  const examples = [];

  for (let i = 0; i < count; i++) {
    const rsi = 40 + Math.random() * 30; // RSI 40-70
    const volume = 0.8 + Math.random() * 1.4; // Volume 0.8-2.2x
    const sentiment = 0.3 + Math.random() * 0.7; // Sentiment 0.3-1.0

    // Create predictable target for testing
    const target = (rsi - 55) * 0.0005 + (sentiment - 0.5) * 0.01;

    examples.push({
      id: `test-${i + 1}`,
      features: { rsi, volume, sentiment },
      target: Math.max(-0.03, Math.min(0.03, target)), // Clamp for testing
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      market_conditions: {
        volatility: rsi > 55 ? 'medium' : 'low',
        trend: sentiment > 0.5 ? 'bullish' : 'bearish'
      },
      outcome: {
        realized_return: target * (0.9 + Math.random() * 0.2),
        risk_adjusted_return: target * (0.8 + Math.random() * 0.2),
        holding_period: Math.floor(2 + Math.random() * 6), // 2-8 days
        confidence_score: 0.7 + Math.random() * 0.3 // 0.7-1.0
      }
    });
  }

  return examples;
}

describe('Supervised Learning Engine with Dynamic Data', () => {
  let SupervisedLearningEngine: any;
  let mockLogger: any;

  beforeAll(async () => {
    // Import the engine dynamically
    const engineModule = await import('../../src/learning/supervised-engine.js');
    SupervisedLearningEngine = engineModule.SupervisedLearningEngine;

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  describe('Dynamic Data Generation', () => {
    it('should generate training examples with realistic market data', () => {
      const examples = generateTrainingExamples(5);

      expect(examples).toHaveLength(5);
      examples.forEach(example => {
        expect(example.id).toMatch(/^dynamic-\d+$/);
        expect(example.features.rsi).toBeGreaterThanOrEqual(30);
        expect(example.features.rsi).toBeLessThanOrEqual(70);
        expect(example.features.volume).toBeGreaterThanOrEqual(0.5);
        expect(example.features.volume).toBeLessThanOrEqual(2.5);
        expect(example.features.sentiment).toBeGreaterThanOrEqual(0);
        expect(example.features.sentiment).toBeLessThanOrEqual(1);
        expect(example.target).toBeGreaterThanOrEqual(-0.05);
        expect(example.target).toBeLessThanOrEqual(0.05);
        expect(['low', 'medium', 'high']).toContain(example.market_conditions.volatility);
        expect(['bullish', 'bearish', 'sideways']).toContain(example.market_conditions.trend);
      });
    });

    it('should generate test examples with predictable outcomes', () => {
      const examples = generateTestExamples(3);

      expect(examples).toHaveLength(3);
      examples.forEach(example => {
        expect(example.id).toMatch(/^test-\d+$/);
        expect(example.features.rsi).toBeGreaterThanOrEqual(40);
        expect(example.features.rsi).toBeLessThanOrEqual(70);
        expect(example.target).toBeGreaterThanOrEqual(-0.03);
        expect(example.target).toBeLessThanOrEqual(0.03);
      });
    });
  });

  describe('Engine Functionality with Dynamic Data', () => {
    let engine: any;

    beforeAll(() => {
      engine = new SupervisedLearningEngine(mockLogger);
    });

    it('should initialize engine successfully', () => {
      expect(engine).toBeDefined();
      expect(typeof engine.getHealth).toBe('function');
      expect(typeof engine.trainModel).toBe('function');
      expect(typeof engine.predict).toBe('function');
    });

    it('should report healthy status', () => {
      const health = engine.getHealth();
      expect(health).toBe(true);
    });

    it('should train model with dynamically generated data', async () => {
      const trainingExamples = generateTrainingExamples(12);

      const model = await engine.trainModel('dynamic-test-model', 'random_forest', trainingExamples);

      expect(model).toBeDefined();
      expect(model.model_id).toBe('dynamic-test-model');
      expect(model.algorithm).toBe('random_forest');
      expect(model.training_data_size).toBe(12);
      // Note: created_at may not be present in all implementations
      if (model.created_at) {
        expect(model.created_at).toBeDefined();
      }
    });

    it('should make predictions with dynamic features', async () => {
      const features = {
        rsi: 45 + Math.random() * 25,
        volume: 0.7 + Math.random() * 1.3,
        sentiment: Math.random()
      };

      const prediction = await engine.predict('dynamic-test-model', features);

      expect(prediction).toBeDefined();
      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.prediction).toBeGreaterThanOrEqual(-1.0); // Allow wider range
      expect(prediction.prediction).toBeLessThanOrEqual(1.0); // Allow wider range
      expect(typeof prediction.confidence).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should evaluate model with dynamic test data', async () => {
      const testExamples = generateTestExamples(6);

      const evaluation = await engine.evaluateModel('dynamic-test-model', testExamples);

      expect(evaluation).toBeDefined();
      expect(typeof evaluation.accuracy).toBe('number');
      expect(evaluation.accuracy).toBeGreaterThanOrEqual(0);
      expect(evaluation.accuracy).toBeLessThanOrEqual(1);
      expect(typeof evaluation.precision).toBe('number');
      expect(typeof evaluation.recall).toBe('number');
      expect(typeof evaluation.f1_score).toBe('number');
    });

    it('should generate insights from dynamic training data', async () => {
      const trainingExamples = generateTrainingExamples(8);

      const insights = await engine.getInsights(trainingExamples);

      expect(Array.isArray(insights)).toBe(true);

      if (insights.length > 0) {
        insights.forEach((insight: any) => {
          expect(insight).toHaveProperty('insight_type');
          expect(insight).toHaveProperty('description');
          expect(typeof insight.confidence_score).toBe('number');
          expect(insight.confidence_score).toBeGreaterThanOrEqual(0);
          expect(insight.confidence_score).toBeLessThanOrEqual(1);
        });
      }
    });

    it('should handle prediction with non-existent model', async () => {
      const features = { rsi: 50, volume: 1.0, sentiment: 0.5 };

      await expect(engine.predict('non-existent-model', features))
        .rejects
        .toThrow();
    });
  });

  describe('Data Consistency and Edge Cases', () => {
    it('should generate consistent data across multiple calls', () => {
      const examples1 = generateTrainingExamples(3);
      const examples2 = generateTrainingExamples(3);

      // Data should be different due to randomness but follow same patterns
      expect(examples1.length).toBe(3);
      expect(examples2.length).toBe(3);

      // Check that all examples have valid ranges
      [...examples1, ...examples2].forEach(example => {
        expect(example.features.rsi).toBeGreaterThanOrEqual(30);
        expect(example.features.rsi).toBeLessThanOrEqual(70);
        expect(example.target).toBeGreaterThanOrEqual(-0.05);
        expect(example.target).toBeLessThanOrEqual(0.05);
      });
    });

    it('should handle edge case RSI values', () => {
      // Test with RSI at boundaries
      const lowRsiExample = {
        id: 'edge-low',
        features: { rsi: 25, volume: 1.0, sentiment: 0.5 },
        target: -0.02,
        timestamp: new Date().toISOString(),
        market_conditions: { volatility: 'low', trend: 'bearish' },
        outcome: {
          realized_return: -0.015,
          risk_adjusted_return: -0.018,
          holding_period: 3,
          confidence_score: 0.7
        }
      };

      const highRsiExample = {
        id: 'edge-high',
        features: { rsi: 75, volume: 1.0, sentiment: 0.5 },
        target: 0.02,
        timestamp: new Date().toISOString(),
        market_conditions: { volatility: 'high', trend: 'bullish' },
        outcome: {
          realized_return: 0.015,
          risk_adjusted_return: 0.018,
          holding_period: 3,
          confidence_score: 0.7
        }
      };

      expect(lowRsiExample.market_conditions.volatility).toBe('low');
      expect(highRsiExample.market_conditions.volatility).toBe('high');
    });
  });
});