// Legacy configuration exports (maintaining existing API)
export { DEFAULT_CONFIG, createConfig } from './default.js';

// Enhanced configuration system
export { enhancedConfigLoader, EnhancedConfigLoader } from './enhanced-loader.js';
export { 
  backwardCompatibleConfig, 
  BackwardCompatibleConfig,
  DEFAULT_CONFIG as ENHANCED_DEFAULT_CONFIG,
  createConfig as createEnhancedConfig
} from './backward-compatible.js';

// Provider factories
export { LLMProviderFactory } from '../providers/llm-factory.js';
export { EmbeddingProviderFactory } from '../providers/memory-provider.js';
export { EnhancedAgentFactory } from '../factory/enhanced-agent-factory.js';

// Type exports
export * from '../types/config.js';
export * from '../types/agent-config.js';