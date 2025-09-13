import { createLogger } from '../../../utils/enhanced-logger';

/**
 * Fundamentals Logger Service
 * Handles logging and monitoring for fundamentals analysis
 */
export class FundamentalsLoggerService {
  private logger = createLogger('agent', 'fundamentals-logger-service');

  /**
   * Log constructor initialization
   */
  logConstructorInitialization(learningEnabled: boolean, supervisedEnabled: boolean, unsupervisedEnabled: boolean, reinforcementEnabled: boolean): void {
    this.logger.info('constructor', 'LearningFundamentalsAnalyst initialized', {
      learningEnabled,
      supervisedEnabled,
      unsupervisedEnabled,
      reinforcementEnabled
    });
  }

  /**
   * Log enhanced processing start
   */
  logProcessingStart(company: string, tradeDate: string, hasFundamentalsReport: boolean): void {
    this.logger.info('processWithLearning', 'Starting enhanced fundamentals analysis', {
      company,
      tradeDate,
      hasFundamentalsReport
    });
  }

  /**
   * Log enhanced processing preparation
   */
  logProcessingPreparation(insightsUsed: number, highConfidenceInsights: number): void {
    this.logger.debug('processWithLearning', 'Prepared enhanced fundamentals analysis request', {
      insightsUsed,
      highConfidenceInsights
    });
  }

  /**
   * Log enhanced processing completion
   */
  logProcessingCompletion(reportLength: number, company: string): void {
    this.logger.info('processWithLearning', 'Enhanced fundamentals analysis completed', {
      reportLength,
      company
    });
  }

  /**
   * Log processing error
   */
  logProcessingError(error: string, company: string): void {
    this.logger.error('processWithLearning', 'Enhanced fundamentals analysis failed', {
      error,
      company
    });
  }

  /**
   * Log learned adaptations application
   */
  logLearnedAdaptations(insightsCount: number, company: string): void {
    this.logger.info('applyLearnedAdaptations', 'Applying learned adaptations to fundamentals analysis', {
      insightsCount,
      company
    });
  }

  /**
   * Log basic analysis performance
   */
  logBasicAnalysis(company: string, tradeDate: string): void {
    this.logger.info('performBasicAnalysis', 'Performing basic fundamentals analysis', {
      company,
      tradeDate
    });
  }

  /**
   * Log enhanced analysis execution
   */
  logEnhancedAnalysisExecution(company: string, tradeDate: string): void {
    this.logger.info('executeEnhancedAnalysis', 'Executing enhanced fundamentals analysis', {
      company,
      tradeDate
    });
  }

  /**
   * Log enhanced analysis completion
   */
  logEnhancedAnalysisCompletion(reportLength: number, company: string): void {
    this.logger.info('executeEnhancedAnalysis', 'Enhanced fundamentals analysis completed', {
      reportLength,
      company
    });
  }
}

/**
 * Factory function to create FundamentalsLoggerService instance
 */
export function createFundamentalsLoggerService(): FundamentalsLoggerService {
  return new FundamentalsLoggerService();
}