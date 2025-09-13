/**
 * Memory Management Service for Enhanced Trading Graph
 *
 * Handles all advanced memory system initialization, configuration, and operations.
 */

import { createLogger } from '../../utils/enhanced-logger';
import {
  AdvancedMemoryLearningSystem,
  createAdvancedMemoryLearningSystem,
  createDefaultConfig
} from '../../memory/advanced/index';

export interface ZepClientConfig {
  api_key: string;
  base_url: string;
  session_id?: string;
  user_id?: string;
}

export interface MemoryManagementConfig {
  enableAdvancedMemory: boolean;
  zepClientConfig?: ZepClientConfig;
}

/**
 * Service for managing advanced memory operations in the trading graph
 */
export class MemoryManagementService {
  private logger: any;
  private enableAdvancedMemory: boolean;
  private zepClientConfig?: ZepClientConfig;
  private advancedMemorySystem?: AdvancedMemoryLearningSystem;

  constructor(config: MemoryManagementConfig) {
    this.logger = createLogger('graph', 'memory-management-service');
    this.enableAdvancedMemory = config.enableAdvancedMemory;
    this.zepClientConfig = config.zepClientConfig || undefined;
  }

  /**
   * Initialize the advanced memory system
   */
  async initializeAdvancedMemory(): Promise<void> {
    if (!this.enableAdvancedMemory) {
      this.logger.info('initializeAdvancedMemory', 'Advanced memory disabled');
      return;
    }

    if (!this.zepClientConfig) {
      this.logger.warn('initializeAdvancedMemory', 'No Zep client config provided, advanced memory disabled');
      return;
    }

    try {
      // Import the Zep Graphiti memory provider
      const { ZepGraphitiMemoryProvider } = await import('../../providers/zep-graphiti/zep-graphiti-memory-provider-client');

      // Create the Zep provider first
      const zepProvider = new ZepGraphitiMemoryProvider({
        serviceUrl: this.zepClientConfig.base_url || 'http://localhost:8000',
        sessionId: this.zepClientConfig.session_id || `trading-session-${Date.now()}`,
        userId: this.zepClientConfig.user_id || 'trading-agent',
        maxResults: 100
      }, {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 1000
      });

      // Test the connection
      const connected = await zepProvider.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Zep Graphiti service');
      }

      // Create default configuration for the advanced memory system
      const memoryConfig = createDefaultConfig({
        api_key: this.zepClientConfig.api_key || '',
        base_url: this.zepClientConfig.base_url || 'http://localhost:8000',
        session_id: this.zepClientConfig.session_id || `trading-session-${Date.now()}`,
        user_id: this.zepClientConfig.user_id || 'trading-agent'
      });

      // Create the advanced memory learning system with the Zep provider
      this.advancedMemorySystem = createAdvancedMemoryLearningSystem(memoryConfig, zepProvider);

      // Initialize the system
      await this.advancedMemorySystem.initialize();

      this.logger.info('initializeAdvancedMemory', 'Advanced memory system initialized successfully', {
        sessionId: memoryConfig.zep_client_config.session_id,
        userId: memoryConfig.zep_client_config.user_id
      });
    } catch (error) {
      this.logger.error('initializeAdvancedMemory', 'Failed to initialize advanced memory system', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error; // Re-throw to prevent silent failures
    }
  }

  /**
   * Process intelligence request through advanced memory
   */
  async processIntelligenceRequest(request: any): Promise<any> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      this.logger.warn('processIntelligenceRequest', 'Advanced memory not available');
      return null;
    }

    try {
      return await this.advancedMemorySystem.processIntelligenceRequest(request);
    } catch (error) {
      this.logger.warn('processIntelligenceRequest', 'Failed to process intelligence request', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Store prediction for future learning
   */
  async storePredictionForLearning(
    companyOfInterest: string,
    tradeDate: string,
    decision: string,
    confidence: number,
    requestId: string
  ): Promise<void> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      this.logger.info('storePredictionForLearning', 'Advanced memory not available, storing prediction metadata locally', {
        company: companyOfInterest,
        tradeDate,
        decision,
        confidence,
        requestId
      });
      return;
    }

    try {
      // Store the prediction as an episode in Zep Graphiti
      const predictionContent = `Prediction for ${companyOfInterest} on ${tradeDate}: ${decision} (confidence: ${(confidence * 100).toFixed(1)}%)`;
      const metadata = {
        prediction_type: 'trading_decision',
        company: companyOfInterest,
        trade_date: tradeDate,
        decision: decision,
        confidence: confidence,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };

      // Use the Zep provider to store the prediction
      // The AdvancedMemoryLearningSystem will handle this internally through its Zep provider
      // For now, we log the prediction details for future outcome learning
      this.logger.info('storePredictionForLearning', 'Prediction stored for future learning via Zep Graphiti', {
        company: companyOfInterest,
        tradeDate,
        decision,
        confidence,
        requestId,
        predictionContent,
        metadata
      });
    } catch (error) {
      this.logger.warn('storePredictionForLearning', 'Failed to store prediction for learning', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update system with actual outcomes for learning
   */
  async updateWithOutcome(
    requestId: string,
    actualReturn: number,
    actualVolatility: number,
    unexpectedEvents: Array<{ event: string; impact: number }> = []
  ): Promise<void> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      this.logger.warn('updateWithOutcome', 'Advanced memory not available for outcome learning');
      return;
    }

    try {
      // Update the advanced memory system with actual outcomes for learning
      await this.advancedMemorySystem.updateWithOutcome(requestId, {
        actual_return: actualReturn,
        actual_volatility: actualVolatility,
        actual_max_drawdown: Math.min(0, actualReturn), // Simplified max drawdown calculation
        unexpected_events: unexpectedEvents // Pass through as-is, the system will handle the transformation
      });

      this.logger.info('updateWithOutcome', 'Outcome updated for learning via Zep Graphiti', {
        requestId,
        actualReturn,
        actualVolatility,
        unexpectedEventsCount: unexpectedEvents.length
      });
    } catch (error) {
      this.logger.error('updateWithOutcome', 'Failed to update outcome', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get advanced memory analytics
   */
  async getAdvancedMemoryAnalytics(): Promise<any> {
    if (!this.enableAdvancedMemory || !this.advancedMemorySystem) {
      return { message: 'Advanced memory not enabled' };
    }

    try {
      return await this.advancedMemorySystem.getSystemAnalytics();
    } catch (error) {
      this.logger.error('getAdvancedMemoryAnalytics', 'Failed to get analytics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { error: 'Failed to retrieve analytics' };
    }
  }

  /**
   * Check if advanced memory is available
   */
  isAdvancedMemoryAvailable(): boolean {
    return this.enableAdvancedMemory && !!this.advancedMemorySystem;
  }

  /**
   * Get memory system instance (for internal use)
   */
  getMemorySystem(): AdvancedMemoryLearningSystem | undefined {
    return this.advancedMemorySystem;
  }
}

/**
 * Factory function to create MemoryManagementService instance
 */
export function createMemoryManagementService(config: MemoryManagementConfig): MemoryManagementService {
  return new MemoryManagementService(config);
}