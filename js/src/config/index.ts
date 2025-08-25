// Legacy configuration exports (maintaining existing API)
export { DEFAULT_CONFIG, createConfig } from './default';

// Enhanced configuration system
export { enhancedConfigLoader, EnhancedConfigLoader } from './enhanced-loader';
export { 
  backwardCompatibleConfig, 
  BackwardCompatibleConfig,
  DEFAULT_CONFIG as ENHANCED_DEFAULT_CONFIG,
  createConfig as createEnhancedConfig
} from './backward-compatible';

// Provider factories
export { LLMProviderFactory } from '../providers/llm-factory';
export { EmbeddingProviderFactory } from '../providers/memory-provider';
export { EnhancedAgentFactory } from '../factory/enhanced-agent-factory';

// Type exports
export * from '../types/config';
export * from '../types/agent-config';