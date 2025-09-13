/**
 * Unit Tests for Reinforcement Learning Engine
 *
 * Tests the Q-learning and policy gradient functionality
 */

import { ReinforcementLearningEngine } from '../../src/learning/reinforcement-engine';
import { ReinforcementLearningState } from '../../src/learning/learning-types';

describe('ReinforcementLearningEngine', () => {
  let engine: ReinforcementLearningEngine;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    engine = new ReinforcementLearningEngine({
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.8,
      explorationDecay: 0.995,
      minExplorationRate: 0.01
    }, mockLogger);
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      const health = engine.getHealth();
      expect(health).toBe(true);
    });
  });

  describe('Q-Learning Experience', () => {
    it('should learn from trading experience', async () => {
      const currentState: ReinforcementLearningState = {
        state_id: 'state1',
        market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
        portfolio_state: { cash: 10000, positions: 5 },
        timestamp: '2025-09-07T10:00:00Z',
        reward: 0.05
      };

      const nextState: ReinforcementLearningState = {
        state_id: 'state2',
        market_features: { rsi: 68, volume: 1.1, sentiment: 0.7 },
        portfolio_state: { cash: 10150, positions: 5 },
        timestamp: '2025-09-07T10:05:00Z',
        reward: 0.03
      };

      await expect(engine.learnFromExperience(currentState, 'BUY', 150, nextState)).resolves.not.toThrow();
    });
  });

  describe('Action Selection', () => {
    it('should select an action from available actions', () => {
      const currentState: ReinforcementLearningState = {
        state_id: 'state1',
        market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
        portfolio_state: { cash: 10000, positions: 5 },
        timestamp: '2025-09-07T10:00:00Z'
      };

      const availableActions = ['BUY', 'SELL', 'HOLD'];
      const action = engine.chooseAction(currentState, availableActions);

      expect(availableActions).toContain(action);
    });
  });

  describe('Q-Value Retrieval', () => {
    it('should return Q-values for actions', () => {
      const currentState: ReinforcementLearningState = {
        state_id: 'state1',
        market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
        portfolio_state: { cash: 10000, positions: 5 },
        timestamp: '2025-09-07T10:00:00Z'
      };

      const qValue = engine.getQValue(currentState, 'BUY');
      expect(typeof qValue).toBe('number');
      expect(qValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Learning Statistics', () => {
    it('should provide learning statistics', () => {
      const stats = engine.getLearningStats();

      expect(stats).toHaveProperty('totalStates');
      expect(stats).toHaveProperty('totalActions');
      expect(stats).toHaveProperty('averageQValue');
      expect(stats).toHaveProperty('explorationRate');

      expect(typeof stats.totalStates).toBe('number');
      expect(typeof stats.totalActions).toBe('number');
      expect(typeof stats.averageQValue).toBe('number');
      expect(typeof stats.explorationRate).toBe('number');
    });
  });

  describe('Multiple Learning Experiences', () => {
    it('should handle multiple learning experiences', async () => {
      const availableActions = ['BUY', 'SELL', 'HOLD'];

      for (let i = 0; i < 3; i++) {
        const testState: ReinforcementLearningState = {
          state_id: `test_state_${i}`,
          market_features: {
            rsi: 60 + Math.random() * 20,
            volume: 0.8 + Math.random() * 0.8,
            sentiment: 0.4 + Math.random() * 0.6
          },
          portfolio_state: {
            cash: 10000 + Math.random() * 1000,
            positions: Math.floor(Math.random() * 10)
          },
          timestamp: new Date(Date.now() + i * 60000).toISOString()
        };

        const reward = (Math.random() - 0.5) * 200;
        await expect(engine.learnFromExperience(
          testState,
          availableActions[Math.floor(Math.random() * 3)],
          reward,
          testState
        )).resolves.not.toThrow();
      }
    });
  });

  describe('Insights Generation', () => {
    it('should generate insights from learning data', async () => {
      const states: ReinforcementLearningState[] = [
        {
          state_id: 'state1',
          market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
          portfolio_state: { cash: 10000, positions: 5 },
          timestamp: '2025-09-07T10:00:00Z'
        },
        {
          state_id: 'state2',
          market_features: { rsi: 68, volume: 1.1, sentiment: 0.7 },
          portfolio_state: { cash: 10150, positions: 5 },
          timestamp: '2025-09-07T10:05:00Z'
        }
      ];

      const insights = await engine.getInsights(states);

      expect(Array.isArray(insights)).toBe(true);
      if (insights.length > 0) {
        expect(insights[0]).toHaveProperty('insight_type');
        expect(insights[0]).toHaveProperty('description');
        expect(insights[0]).toHaveProperty('confidence_score');
      }
    });
  });
});