/**
 * Learning System Types and Schemas
 *
 * This module contains all the type definitions and Zod schemas used
 * throughout the learning system components.
 */

import { z } from 'zod';

// Learning system schemas
export const LearningExampleSchema = z.object({
  id: z.string(),
  features: z.record(z.string(), z.number()),
  target: z.number(),
  timestamp: z.string(),
  market_conditions: z.record(z.string(), z.any()),
  outcome: z.object({
    realized_return: z.number(),
    risk_adjusted_return: z.number(),
    holding_period: z.number(),
    confidence_score: z.number()
  })
});

export const ReinforcementLearningStateSchema = z.object({
  state_id: z.string(),
  market_features: z.record(z.string(), z.number()),
  portfolio_state: z.record(z.string(), z.number()),
  timestamp: z.string(),
  reward: z.number().optional(),
  next_state_id: z.string().optional()
});

export const LearningModelSchema = z.object({
  model_id: z.string(),
  model_type: z.enum(['reinforcement', 'supervised', 'unsupervised', 'transfer', 'meta']),
  algorithm: z.string(),
  hyperparameters: z.record(z.string(), z.any()),
  training_data_size: z.number(),
  performance_metrics: z.object({
    accuracy: z.number().optional(),
    precision: z.number().optional(),
    recall: z.number().optional(),
    f1_score: z.number().optional(),
    sharpe_ratio: z.number().optional(),
    max_drawdown: z.number().optional(),
    win_rate: z.number().optional()
  }),
  last_trained: z.string(),
  model_version: z.string()
});

export const LearningInsightSchema = z.object({
  insight_id: z.string(),
  insight_type: z.enum(['pattern', 'strategy', 'risk', 'opportunity', 'warning']),
  confidence_score: z.number().min(0).max(1),
  description: z.string(),
  supporting_evidence: z.array(z.string()),
  actionable_recommendations: z.array(z.string()),
  timestamp: z.string(),
  validity_period: z.object({
    start: z.string(),
    end: z.string()
  })
});

// Type exports
export type LearningExample = z.infer<typeof LearningExampleSchema>;
export type ReinforcementLearningState = z.infer<typeof ReinforcementLearningStateSchema>;
export type LearningModel = z.infer<typeof LearningModelSchema>;
export type LearningInsight = z.infer<typeof LearningInsightSchema>;