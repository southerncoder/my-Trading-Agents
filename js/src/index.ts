import 'dotenv/config';
import { readDockerSecrets } from './utils/docker-secrets';

// Read Docker secrets and set environment variables before anything else
readDockerSecrets();

// Re-export main classes and functions for library usage
export { TradingAgentsGraph, createTradingAgentsGraph } from './graph/trading-graph';
export { EnhancedTradingAgentsGraph } from './graph/enhanced-trading-graph';
export { createConfig, DEFAULT_CONFIG } from './config/index';
export { Toolkit } from './dataflows/index';

// Basic type exports
export type {
  TradingAgentsConfig,
  LLMProvider,
  AnalystConfig,
  AnalystType,
  MemoryConfig
} from './types/config';

// Observability shutdown helper: apps can call this on process exit
export { shutdown as shutdownObservability } from './observability/opentelemetry-setup';