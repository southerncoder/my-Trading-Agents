// Types and interfaces for performance learning layer
import { ZepClient } from '@getzep/zep-cloud';

export interface ExtendedZepClient extends ZepClient {
  searchMemory?: (query: string, options?: { maxResults?: number }) => Promise<{ facts?: any[] }>;
  storePerformanceData?: (data: any) => Promise<{ id: string }>;
}

export interface AgentPerformanceRecord {
  agent_id: string;
  strategy_id: string;
  performance_period: {
    start_date: string;
    end_date: string;
    duration_days: number;
  };
  market_conditions: {
    market_regime: string;
    volatility: number;
    volume_ratio: number;
    trend_direction: string;
    market_stress: number;
  };
  trading_metrics: {
    total_trades: number;
    successful_trades: number;
    success_rate: number;
    total_return: number;
    avg_return_per_trade: number;
    max_profit: number;
    max_loss: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    win_loss_ratio: number;
  };
  decision_quality: {
    entry_timing_score: number;
    exit_timing_score: number;
    risk_management_score: number;
    pattern_recognition_accuracy: number;
    confidence_calibration: number;
  };
  learning_metrics: {
    adaptation_speed: number;
    pattern_learning_rate: number;
    error_correction_rate: number;
    knowledge_retention: number;
  };
  metadata: {
    recorded_at: string;
    validation_status: 'validated' | 'pending' | 'anomaly';
    data_quality_score: number;
    external_factors: string[];
  };
}

export interface PerformanceLearningInsights {
  agent_id: string;
  learning_period: {
    start_date: string;
    end_date: string;
    total_records_analyzed: number;
  };
  performance_evolution: {
    initial_performance: number;
    current_performance: number;
    improvement_rate: number;
    learning_trajectory: 'improving' | 'plateauing' | 'declining';
  };
  strength_areas: Array<{
    skill_area: string;
    competency_score: number;
    confidence_level: number;
    market_context: string[];
  }>;
  improvement_opportunities: Array<{
    skill_area: string;
    current_score: number;
    target_score: number;
    improvement_priority: 'high' | 'medium' | 'low';
    recommended_actions: string[];
  }>;
  adaptive_recommendations: {
    strategy_adjustments: Array<{
      parameter: string;
      current_value: number;
      recommended_value: number;
      confidence: number;
      expected_improvement: number;
    }>;
    market_specific_optimizations: Array<{
      market_condition: string;
      optimization_type: string;
      adjustment_details: any;
    }>;
  };
  performance_predictions: {
    next_period_performance: {
      expected_return: number;
      confidence_interval: [number, number];
      risk_metrics: {
        expected_volatility: number;
        max_drawdown_estimate: number;
        success_rate_prediction: number;
      };
    };
    scenario_analysis: Array<{
      scenario_name: string;
      market_conditions: any;
      predicted_performance: number;
      confidence: number;
    }>;
  };
}

export interface PerformanceMLModel {
  model_id: string;
  model_type: 'regression' | 'classification' | 'clustering' | 'reinforcement';
  training_data_size: number;
  accuracy_metrics: {
    mse?: number;
    r_squared?: number;
    mae?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
  };
  feature_importance: Array<{
    feature_name: string;
    importance_score: number;
  }>;
  last_trained: string;
  model_state: any;
}
