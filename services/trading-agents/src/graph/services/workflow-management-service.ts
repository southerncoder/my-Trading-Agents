/**
 * Workflow Management Service for Enhanced Trading Graph
 *
 * Handles LangGraph workflow initialization, execution, and testing.
 */

import { LangGraphSetup, AnalystType } from '../langgraph-working';
import { LazyGraphSetup } from '../../performance/lazy-factory';
import { createLogger } from '../../utils/enhanced-logger';

export interface WorkflowManagementConfig {
  enableLangGraph: boolean;
  enableLazyLoading: boolean;
  selectedAnalysts: AnalystType[];
  modelConfigs: any;
  config: any;
}

/**
 * Service for managing LangGraph workflows and lazy loading
 */
export class WorkflowManagementService {
  private logger: any;
  private enableLangGraph: boolean;
  private enableLazyLoading: boolean;
  private selectedAnalysts: AnalystType[];
  private modelConfigs: any;
  private config: any;
  private langGraphSetup?: LangGraphSetup;
  private lazyGraphSetup?: LazyGraphSetup;
  private workflow?: any;

  constructor(config: WorkflowManagementConfig) {
    this.logger = createLogger('graph', 'workflow-management-service');
    this.enableLangGraph = config.enableLangGraph;
    this.enableLazyLoading = config.enableLazyLoading;
    this.selectedAnalysts = config.selectedAnalysts;
    this.modelConfigs = config.modelConfigs;
    this.config = config.config;
  }

  /**
   * Initialize LangGraph setup
   */
  initializeLangGraph(): void {
    if (!this.enableLangGraph) {
      this.logger.info('initializeLangGraph', 'LangGraph disabled');
      return;
    }

    this.langGraphSetup = new LangGraphSetup({
      selectedAnalysts: this.selectedAnalysts,
      modelConfigs: this.modelConfigs,
      config: this.config
    });

    this.logger.info('initializeLangGraph', 'LangGraph setup initialized');
  }

  /**
   * Initialize lazy loading setup
   */
  initializeLazyLoading(): void {
    if (!this.enableLazyLoading) {
      this.logger.info('initializeLazyLoading', 'Lazy loading disabled');
      return;
    }

    // For now, lazy loading setup is deferred until workflow initialization
    // This avoids type conflicts with ModelProvider
    this.logger.info('initializeLazyLoading', 'Lazy loading enabled, will initialize on demand');
  }

  /**
   * Get lazy loading statistics
   */
  getLazyLoadingStats(): any {
    if (!this.lazyGraphSetup) {
      return { message: 'Lazy loading not yet initialized' };
    }
    return this.lazyGraphSetup.getStats();
  }

  /**
   * Pre-warm common components in background
   */
  async preWarmComponents(): Promise<void> {
    if (!this.enableLazyLoading || !this.lazyGraphSetup) {
      this.logger.info('preWarmComponents', 'Lazy loading not enabled, skipping pre-warming');
      return;
    }

    this.logger.info('preWarmComponents', 'Starting component pre-warming');

    const promises = [];

    // Pre-warm selected analysts
    promises.push(this.lazyGraphSetup.preWarmCommonAgents(this.selectedAnalysts));

    // Pre-warm dataflows
    promises.push(this.lazyGraphSetup.preWarmDataflows());

    await Promise.allSettled(promises);

    this.logger.info('preWarmComponents', 'Component pre-warming completed');
  }

  /**
   * Create and initialize the workflow
   */
  async initializeWorkflow(): Promise<void> {
    if (!this.enableLangGraph || !this.langGraphSetup) {
      throw new Error('LangGraph is not enabled or initialized');
    }

    try {
      this.logger.info('initializeWorkflow', 'Initializing trading workflow...');
      this.workflow = await this.langGraphSetup.createComprehensiveTradingWorkflow(this.selectedAnalysts);
      this.logger.info('initializeWorkflow', 'Trading workflow initialized successfully');
    } catch (error) {
      this.logger.error('initializeWorkflow', 'Error initializing workflow', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute the trading analysis workflow
   */
  async executeWorkflow(companyOfInterest: string, tradeDate: string): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    if (!this.workflow) {
      await this.initializeWorkflow();
    }

    try {
      this.logger.info('executeWorkflow', `Executing trading analysis for ${companyOfInterest} on ${tradeDate}...`, {
        company: companyOfInterest,
        tradeDate
      });

      const { HumanMessage } = await import('@langchain/core/messages');

      const initialMessage = new HumanMessage({
        content: `Analyze ${companyOfInterest} for trading on ${tradeDate}. Provide comprehensive analysis including market conditions, sentiment, news, and fundamentals.`
      });

      const result = await this.workflow.invoke({
        messages: [initialMessage]
      });

      this.logger.info('executeWorkflow', 'Trading analysis completed successfully', {
        company: companyOfInterest,
        resultType: typeof result
      });
      return { success: true, result };
    } catch (error) {
      this.logger.error('executeWorkflow', 'Error executing trading analysis', {
        company: companyOfInterest,
        tradeDate,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test the workflow connectivity
   */
  async testWorkflow(): Promise<{ success: boolean; error?: string }> {
    if (!this.langGraphSetup) {
      return { success: false, error: 'LangGraph not initialized' };
    }

    return await this.langGraphSetup.testWorkflow();
  }

  /**
   * Check if workflow is initialized
   */
  isWorkflowInitialized(): boolean {
    return !!this.workflow;
  }

  /**
   * Get workflow instance (for internal use)
   */
  getWorkflow(): any {
    return this.workflow;
  }

  /**
   * Get LangGraph setup instance (for internal use)
   */
  getLangGraphSetup(): LangGraphSetup | undefined {
    return this.langGraphSetup;
  }
}

/**
 * Factory function to create WorkflowManagementService instance
 */
export function createWorkflowManagementService(config: WorkflowManagementConfig): WorkflowManagementService {
  return new WorkflowManagementService(config);
}