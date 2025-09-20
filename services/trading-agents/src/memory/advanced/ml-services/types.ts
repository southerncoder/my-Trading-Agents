/**
 * Shared types for ML Services
 */

export interface SimilarityResult {
  score: number;
  confidence: number;
  method: 'euclidean' | 'cosine' | 'weighted';
}

export interface ClusteringResult {
  clusters: Array<{
    centroid: any;
    members: any[];
    cluster_id: string;
    pattern_type: string;
    confidence: number;
  }>;
  clusterAssignments: Map<string, string>;
}

export interface FeatureVector {
  success_rate: number;
  profit_loss_ratio: number;
  volatility_adjusted_return: number;
  max_drawdown: number;
  sharpe_ratio: number;
  win_rate: number;
  avg_trade_duration: number;
  strategy_type: string;
  risk_profile: string;
  time_horizon: string;
}

export interface TradingOutcome {
  success_rate?: number;
  win_rate?: number;
  profit_loss?: number;
  pnl?: number;
  volatility?: number;
  std_dev?: number;
  max_drawdown?: number;
  drawdown?: number;
  sharpe_ratio?: number;
  risk_adjusted_return?: number;
  avg_trade_duration?: number;
  holding_period?: number;
  strategy_type?: string;
  risk_profile?: string;
  time_horizon?: string;
}

export interface ClusterConfig {
  maxIterations?: number;
  tolerance?: number;
  minClusters?: number;
  maxClusters?: number;
}

export interface SimilarityConfig {
  numericalFeatures?: string[];
  categoricalFeatures?: string[];
  weights?: Record<string, number>;
}