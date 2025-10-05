import 'dotenv/config';
import { config } from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';

// Load local environment configuration
config({ path: '.env.local' });
import { 
  getTicker, 
  getAnalysisDate, 
  selectAnalysts, 
  selectResearchDepth, 
  selectLLMProvider, 
  selectShallowThinkingAgent, 
  selectDeepThinkingAgent 
} from './utils';
import { UserSelections, AnalystType } from './types';
import { LLMProvider } from '../types/config';
import { MessageBuffer } from './message-buffer';
import { DisplaySystem } from './display';
import { EnhancedTradingAgentsGraph } from '../graph/enhanced-trading-graph';
// import { DEFAULT_CONFIG } from '../config/default';
import { resolveLLMProviderConfig } from '../utils/llm-provider-utils';
import { ConfigManager } from './config-manager';
import { ExportManager } from './export-manager';
import { HistoricalAnalyzer } from './historical-analyzer';
import { LoggingManager, configureVerboseLogging, logSystemInfo, createOperationTimer } from './logging-manager';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { select, confirm, Separator } from '@inquirer/prompts';

export class TradingAgentsCLI {
  private display: DisplaySystem;
  private messageBuffer: MessageBuffer;
  private configManager: ConfigManager;
  private exportManager: ExportManager;
  private historicalAnalyzer: HistoricalAnalyzer;

  constructor() {
    this.display = new DisplaySystem();
    this.messageBuffer = new MessageBuffer();
    this.configManager = new ConfigManager();
    this.exportManager = new ExportManager();
    this.historicalAnalyzer = new HistoricalAnalyzer();
  }

  public async showMainMenu(): Promise<void> {
    this.display.displayWelcome();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: '🚀 Run New Analysis - Analyze a stock with LLM agents', value: 'analyze' },
        { name: '📊 Historical Analysis - Review and analyze past results', value: 'historical' },
        { name: '📤 Export Results - Export analysis data in various formats', value: 'export' },
        { name: '⚙️  Manage Configurations - Save and load analysis configurations', value: 'config' },
        { name: '🔧 Configure Verbose Logging - Set up detailed logging for debugging', value: 'logging' },
        new Separator(),
        { name: '❌ Exit', value: 'exit' }
      ],
      pageSize: 10
    });

    switch (action) {
      case 'analyze':
        await this.runAnalysis();
        break;
      case 'historical':
        await this.historicalAnalyzer.analyzeHistorical();
        break;
      case 'export':
        await this.exportManager.exportResults();
        break;
      case 'config':
        await this.configManager.manageConfigs();
        break;
      case 'logging':
        await configureVerboseLogging(true);
        break;
      case 'exit':
        console.log(chalk.green('👋 Thank you for using TradingAgents!'));
        process.exit(0);
        break;
    }

    // Return to main menu after action completes
    console.log(chalk.gray('\nReturning to main menu...\n'));
    await this.showMainMenu();
  }

  public async getUserSelections(): Promise<UserSelections> {
    // First check if user wants to load a saved configuration
    const useConfig = await select({
      message: 'Configuration Options:',
      choices: [
        { name: '📋 Load Saved Configuration', value: 'load' },
        { name: '🚀 Use Default Configuration (if available)', value: 'default' },
        { name: '⚙️  Create New Configuration', value: 'new' }
      ]
    });

    let selections: UserSelections | null = null;

    if (useConfig === 'load') {
      selections = await this.configManager.loadConfig();
    } else if (useConfig === 'default') {
      selections = await this.configManager.getDefaultConfig();
      if (!selections) {
        console.log(chalk.yellow('No default configuration found. Creating new configuration...'));
      }
    }

    if (selections) {
      // Show loaded configuration for confirmation
      console.log(chalk.green('\n✓ Loaded configuration:'));
      console.log(chalk.gray(`  Ticker: ${selections.ticker}`));
      console.log(chalk.gray(`  Provider: ${selections.llmProvider}`));
      console.log(chalk.gray(`  Analysts: ${selections.analysts.join(', ')}`));
      
      const useLoaded = await confirm({
        message: 'Use this configuration?',
        default: true
      });

      if (useLoaded) {
        // Update date to today by default, but allow user to change
        const updateDate = await confirm({
          message: 'Update analysis date to today?',
          default: true
        });

        if (updateDate) {
          selections.analysisDate = new Date().toISOString().split('T')[0]!;
        }

        // Allow ticker override
        const changeTicker = await confirm({
          message: 'Change ticker symbol?',
          default: false
        });

        if (changeTicker) {
          this.display.createQuestionBox(
            "Ticker Symbol", 
            "Enter the ticker symbol to analyze", 
            selections.ticker
          );
          selections.ticker = await getTicker();
        }

        return selections;
      }
    }

    // Create new configuration interactively
    return await this.createNewConfiguration();
  }

  private async createNewConfiguration(): Promise<UserSelections> {
    // Display ASCII art welcome message
    this.display.displayWelcome();

    // Step 1: Ticker symbol
    this.display.createQuestionBox(
      "Step 1: Ticker Symbol", 
      "Enter the ticker symbol to analyze", 
      "SPY"
    );
    const ticker = await getTicker();

    // Step 2: Analysis date
    const defaultDate = new Date().toISOString().split('T')[0]!;
    this.display.createQuestionBox(
      "Step 2: Analysis Date",
      "Enter the analysis date (YYYY-MM-DD)",
      defaultDate
    );
    const analysisDate = await getAnalysisDate();

    // Step 3: Select analysts
    this.display.createQuestionBox(
      "Step 3: Analysts Team", 
      "Select your LLM analyst agents for the analysis"
    );
    const analysts = await selectAnalysts();
    console.log(chalk.green(`Selected analysts: ${analysts.join(', ')}`));

    // Step 4: Research depth
    this.display.createQuestionBox(
      "Step 4: Research Depth", 
      "Select your research depth level"
    );
    const researchDepth = await selectResearchDepth();

    // Step 5: LLM Provider
    this.display.createQuestionBox(
      "Step 5: LLM Provider", 
      "Select which service to talk to"
    );
    const { provider } = await selectLLMProvider();

    // Step 6: Thinking agents
    this.display.createQuestionBox(
      "Step 6: Thinking Agents", 
      "Select your thinking agents for analysis"
    );
    const shallowThinker = await selectShallowThinkingAgent(provider);
    const deepThinker = await selectDeepThinkingAgent(provider);

    const selections: UserSelections = {
      ticker,
      analysisDate,
      analysts,
      researchDepth,
      llmProvider: provider.toLowerCase(),
      shallowThinker,
      deepThinker
    };

    // Ask if user wants to save this configuration
    const saveConfig = await confirm({
      message: 'Save this configuration for future use?',
      default: true
    });

    if (saveConfig) {
      await this.configManager.saveConfig(selections);
    }

    return selections;
  }

  public async runAnalysis(ticker?: string, analysisDate?: string): Promise<void> {
    const timer = createOperationTimer('runAnalysis');
    
    try {
      console.log(chalk.blue('\n🚀 Starting Trading Analysis...'));
      
      // Get all user selections - use CLI args if provided, otherwise prompt
      let selections: UserSelections;
      
      if (ticker && analysisDate) {
        console.log('🔍 DEBUG: Using command-line arguments');
        // Use default selections with CLI arguments
        selections = {
          ticker: ticker.toUpperCase(),
          analysisDate,
          analysts: [AnalystType.MARKET, AnalystType.SOCIAL, AnalystType.NEWS, AnalystType.FUNDAMENTALS], // Default analysts
          researchDepth: 1, // Default depth
          llmProvider: 'remote_lmstudio', // Default provider - should be specified in config.json
          shallowThinker: process.env.QUICK_THINK_LLM || 'microsoft/phi-4-reasoning-plus',
          deepThinker: process.env.DEEP_THINK_LLM || 'microsoft/phi-4-reasoning-plus'
        };
        console.log('🔍 DEBUG: Using selections:', selections);
      } else {
        console.log('🔍 DEBUG: Getting interactive user selections');
        selections = await this.getUserSelections();
      }
      
      logSystemInfo();

      // Load config.json directly from the correct location
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // Go up from dist/cli/ or src/cli/ to the services/trading-agents root
      const configPath = path.join(__dirname, '..', '..', 'config.json');
      const configRaw = fs.readFileSync(configPath, 'utf-8');
      const cliConfig = JSON.parse(configRaw);
      // Patch in CLI selections for ticker, analysts, models, etc.
      if (cliConfig.analysis) {
        cliConfig.analysis.defaultTicker = selections.ticker;
        cliConfig.analysis.defaultAnalysts = selections.analysts;
        cliConfig.analysis.defaultResearchDepth = selections.researchDepth;
        if (cliConfig.analysis.models) {
          cliConfig.analysis.models.quickThinking.model = selections.shallowThinker;
          cliConfig.analysis.models.deepThinking.model = selections.deepThinker;
        }
      }
      // If using LM Studio, start a background preload of the quick/deep models (non-blocking)
      // Use selections values (user's choice) instead of config.json defaults
      const quickModel = selections.shallowThinker || cliConfig.analysis?.models?.quickThinking?.model;
      const deepModel = selections.deepThinker || cliConfig.analysis?.models?.deepThinking?.model;
      const llmProvider = selections.llmProvider || cliConfig.analysis?.models?.quickThinking?.provider;
      if (llmProvider === 'local_lmstudio' || llmProvider === 'remote_lmstudio') {
        try {
          const lmStudioConfig = resolveLLMProviderConfig(llmProvider as LLMProvider);
          this.display.showInfo(`Preloading LM Studio models in background: ${quickModel}${deepModel ? ', ' + deepModel : ''}`);
          import('../models/provider').then(async (mod) => {
            try {
              const tasks: Promise<void>[] = [];
              if (quickModel) tasks.push(mod.ModelProvider.preloadModel({ provider: llmProvider as LLMProvider, modelName: quickModel, baseURL: lmStudioConfig.baseUrl }));
              if (deepModel) tasks.push(mod.ModelProvider.preloadModel({ provider: llmProvider as LLMProvider, modelName: deepModel, baseURL: lmStudioConfig.baseUrl }));
              await Promise.all(tasks);
              this.display.showInfo('LM Studio model preload completed (background)');
            } catch (err: any) {
              this.display.showError(`LM Studio model preload failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }).catch(err => {
            this.display.showError(`Failed to start LM Studio preload: ${err instanceof Error ? err.message : String(err)}`);
          });
        } catch (err: any) {
          this.display.showError(`LM Studio preload error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Initialize the enhanced graph with config.json (all flow/logging fields included)
      // Add top-level model fields for backward compatibility with ModelProvider.createFromConfig
      // CRITICAL: Use selections values (user's saved config) instead of config.json defaults
      const enhancedConfig = {
        ...cliConfig,
        quickThinkLlm: selections.shallowThinker || cliConfig.analysis?.models?.quickThinking?.model,
        deepThinkLlm: selections.deepThinker || cliConfig.analysis?.models?.deepThinking?.model,
        llmProvider: selections.llmProvider || cliConfig.analysis?.models?.quickThinking?.provider
      };
      
      console.log('🔍 DEBUG: About to create EnhancedTradingAgentsGraph with config:', {
        quickThinkLlm: enhancedConfig.quickThinkLlm,
        deepThinkLlm: enhancedConfig.deepThinkLlm,
        llmProvider: enhancedConfig.llmProvider,
        runMode: cliConfig.flow?.runMode,
        timeout: cliConfig.flow?.timeout,
        parallelism: cliConfig.flow?.parallelism,
        maxTokens: cliConfig.flow?.maxTokens,
        temperature: cliConfig.flow?.temperature,
        logLevel: cliConfig.logging?.logLevel
      });
      const graph = new EnhancedTradingAgentsGraph({
        config: enhancedConfig,
        selectedAnalysts: selections.analysts,
        enableLangGraph: true
      });
      console.log('🔍 DEBUG: EnhancedTradingAgentsGraph created successfully');

      // Create result directories
      const resultsDir = join(process.cwd(), enhancedConfig.resultsDir || 'results', selections.ticker, selections.analysisDate);
      mkdirSync(resultsDir, { recursive: true });
      const reportDir = join(resultsDir, 'reports');
      mkdirSync(reportDir, { recursive: true });
      const logFile = join(resultsDir, 'message_tool.log');

      // Reset message buffer for new analysis
      this.messageBuffer.reset();

      // Start live display
      this.display.startLiveDisplay(this.messageBuffer, selections.ticker, selections.analysisDate);

      // Add initial messages
      this.messageBuffer.addMessage("System", `Selected ticker: ${selections.ticker}`);
      this.messageBuffer.addMessage("System", `Analysis date: ${selections.analysisDate}`);
      this.messageBuffer.addMessage("System", `Selected analysts: ${selections.analysts.join(', ')}`);

      // Update agent status to in_progress for the first analyst
      const firstAnalyst = `${this.capitalizeFirst(selections.analysts[0]!)} Analyst`;
      this.messageBuffer.updateAgentStatus(firstAnalyst, "in_progress");

      // Stream the analysis
      this.display.showInfo('Starting analysis workflow...');
      
      try {
        console.log('🔍 DEBUG: About to initialize workflow...');
        // Initialize the workflow first
        await graph.initializeWorkflow();
        console.log('🔍 DEBUG: Workflow initialized successfully');
        
        console.log('🔍 DEBUG: About to execute analysis for ticker:', selections.ticker, 'date:', selections.analysisDate);
        // Execute the full analysis to get detailed state
        const executionResult = await graph.execute(selections.ticker, selections.analysisDate);
        console.log('🔍 DEBUG: Execution completed. Success:', executionResult.success);
        
        if (!executionResult.success) {
          throw new Error(executionResult.error || 'Analysis execution failed');
        }

        // Get the full detailed state from execution result
        const fullState = executionResult.result;
        
        // Also get the simplified analysis result for decision extraction
        const analysisResult = await graph.analyzeAndDecide(selections.ticker, selections.analysisDate);
        
        // Simulate streaming by processing the result
        this.handleAnalysisResult(analysisResult, selections, logFile, reportDir);

        // Process final signal if available
        const decision = analysisResult.decision;

        // Update all agent statuses to completed
        for (const agent of Object.keys(this.messageBuffer.agentStatus)) {
          this.messageBuffer.updateAgentStatus(agent, "completed");
        }

        this.messageBuffer.addMessage("Analysis", `Completed analysis for ${selections.analysisDate}`);

        // Create enhanced final state with all detailed agent reports
        const finalState = {
          // Include decision summary
          final_trade_decision: `Decision: ${analysisResult.decision} (Confidence: ${analysisResult.confidence})`,
          reasoning: analysisResult.reasoning.join('\n'),
          messages: analysisResult.messages,
          
          // Include all detailed agent reports from full state
          ...fullState,
          
          // Ensure we have the main analysis sections
          market_report: fullState?.market_report,
          sentiment_report: fullState?.sentiment_report, 
          news_report: fullState?.news_report,
          fundamentals_report: fullState?.fundamentals_report,
          investment_debate_state: fullState?.investment_debate_state,
          trader_investment_plan: fullState?.trader_investment_plan,
          risk_debate_state: fullState?.risk_debate_state
        };

        // Stop live display and show complete report with all agent details
        this.display.stopLiveDisplay();
        this.display.displayCompleteReport(finalState);

        // Save final report
        if (this.messageBuffer.finalReport) {
          writeFileSync(join(reportDir, 'final_report.md'), this.messageBuffer.finalReport);
        }

        // Save detailed state report
        const detailedReport = this.generateDetailedReport(finalState, analysisResult);
        writeFileSync(join(reportDir, 'detailed_agent_report.md'), detailedReport);

        // Show final decision
        this.display.showSuccess(`Final trading decision: ${decision} (Confidence: ${analysisResult.confidence})`);
        this.display.showSuccess('Analysis completed successfully!');
        
        // Complete operation timer
        const duration = timer();
        console.log(chalk.green(`\n✅ Analysis completed in ${duration}ms`));

      } catch (error: any) {
        timer(); // Complete timer on error
        this.display.stopLiveDisplay();
        console.error('🔍 DEBUG: Analysis error caught:', error);
        console.error('🔍 DEBUG: Error stack:', error?.stack);
        this.display.showError(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }

    } catch (error) {
      console.error('🔍 DEBUG: CLI error caught:', error);
      console.error('🔍 DEBUG: Error details:', error instanceof Error ? error.stack : String(error));
      this.display.showError(`CLI error: ${error instanceof Error ? error.message : String(error)}`);
      // Don't exit, return to menu for debugging
      return;
    }
  }

  private handleAnalysisResult(analysisResult: any, selections: UserSelections, logFile: string, reportDir: string): void {
    // Add analysis messages to buffer
    for (const reasoning of analysisResult.reasoning) {
      this.messageBuffer.addMessage("Reasoning", reasoning);
      
      // Log to file
      try {
        const cleanContent = reasoning.replace(/\n/g, ' ');
        writeFileSync(logFile, `${new Date().toLocaleTimeString()} [Reasoning] ${cleanContent}\n`, { flag: 'a' });
      } catch {
        // Ignore file write errors
      }
    }

    // Simulate agent progress updates
    this.simulateAgentProgress(selections);
    
    // Save analysis report
    try {
      const reportContent = `# Trading Analysis Report\n\n## Decision: ${analysisResult.decision}\n\n## Confidence: ${analysisResult.confidence}\n\n## Reasoning:\n${analysisResult.reasoning.join('\n\n')}`;
      writeFileSync(join(reportDir, 'analysis_report.md'), reportContent);
    } catch {
      // Ignore file write errors
    }
  }

  private simulateAgentProgress(selections: UserSelections): void {
    // Mark all selected analysts as completed
    for (const analystType of selections.analysts) {
      const analystName = `${this.capitalizeFirst(analystType)} Analyst`;
      this.messageBuffer.updateAgentStatus(analystName, "completed");
    }
    
    // Mark research team as completed
    this.updateResearchTeamStatus("completed");
    
    // Mark risk management team as completed
    const riskTeam = ["Risky Analyst", "Neutral Analyst", "Safe Analyst", "Portfolio Manager"];
    for (const agent of riskTeam) {
      this.messageBuffer.updateAgentStatus(agent, "completed");
    }
  }

  private handleAnalysisChunk(chunk: any, selections: UserSelections, logFile: string, reportDir: string): void {
    // Handle messages
    if (chunk.messages && Array.isArray(chunk.messages)) {
      for (const message of chunk.messages) {
        let content: string;
        let msgType: string;

        if (typeof message === 'object' && message !== null) {
          if ('content' in message) {
            content = this.extractContentString(message.content);
            msgType = "Reasoning";
          } else {
            content = JSON.stringify(message);
            msgType = "System";
          }
        } else {
          content = String(message);
          msgType = "System";
        }

        this.messageBuffer.addMessage(msgType, content);

        // Handle tool calls
        if (typeof message === 'object' && message !== null && 'tool_calls' in message) {
          const toolCalls = message.tool_calls as any[];
          for (const toolCall of toolCalls) {
            if (typeof toolCall === 'object' && toolCall !== null) {
              const name = toolCall.name || 'unknown';
              const args = toolCall.args || {};
              this.messageBuffer.addToolCall(name, args);
            }
          }
        }

        // Log to file
        try {
          const cleanContent = content.replace(/\n/g, ' ');
          writeFileSync(logFile, `${new Date().toLocaleTimeString()} [${msgType}] ${cleanContent}\n`, { flag: 'a' });
        } catch {
          // Ignore file write errors
        }
      }
    }

    // Update reports and agent status based on chunk content
    this.updateAgentProgress(chunk, selections);
    this.saveReportSections(chunk, reportDir);
  }

  private updateAgentProgress(chunk: any, selections: UserSelections): void {
    // Analyst Team Reports
    if (chunk.market_report) {
      this.messageBuffer.updateReportSection("market_report", chunk.market_report);
      this.messageBuffer.updateAgentStatus("Market Analyst", "completed");
      this.setNextAnalystInProgress(selections.analysts, AnalystType.MARKET);
    }

    if (chunk.sentiment_report) {
      this.messageBuffer.updateReportSection("sentiment_report", chunk.sentiment_report);
      this.messageBuffer.updateAgentStatus("Social Analyst", "completed");
      this.setNextAnalystInProgress(selections.analysts, AnalystType.SOCIAL);
    }

    if (chunk.news_report) {
      this.messageBuffer.updateReportSection("news_report", chunk.news_report);
      this.messageBuffer.updateAgentStatus("News Analyst", "completed");
      this.setNextAnalystInProgress(selections.analysts, AnalystType.NEWS);
    }

    if (chunk.fundamentals_report) {
      this.messageBuffer.updateReportSection("fundamentals_report", chunk.fundamentals_report);
      this.messageBuffer.updateAgentStatus("Fundamentals Analyst", "completed");
      this.updateResearchTeamStatus("in_progress");
    }

    // Research Team
    if (chunk.investment_debate_state) {
      this.handleInvestmentDebateState(chunk.investment_debate_state);
    }

    // Trading Team
    if (chunk.trader_investment_plan) {
      this.messageBuffer.updateReportSection("trader_investment_plan", chunk.trader_investment_plan);
      this.messageBuffer.updateAgentStatus("Risky Analyst", "in_progress");
    }

    // Risk Management Team
    if (chunk.risk_debate_state) {
      this.handleRiskDebateState(chunk.risk_debate_state);
    }
  }

  private setNextAnalystInProgress(analysts: AnalystType[], currentAnalyst: AnalystType): void {
    const analystNames = {
      [AnalystType.MARKET]: "Market Analyst",
      [AnalystType.SOCIAL]: "Social Analyst", 
      [AnalystType.NEWS]: "News Analyst",
      [AnalystType.FUNDAMENTALS]: "Fundamentals Analyst"
    };

    const analystOrder = [AnalystType.MARKET, AnalystType.SOCIAL, AnalystType.NEWS, AnalystType.FUNDAMENTALS];
    const currentIndex = analystOrder.indexOf(currentAnalyst);
    
    if (currentIndex !== -1 && currentIndex < analystOrder.length - 1) {
      const nextAnalyst = analystOrder[currentIndex + 1];
      if (nextAnalyst && analysts.includes(nextAnalyst)) {
        this.messageBuffer.updateAgentStatus(analystNames[nextAnalyst], "in_progress");
      }
    }
  }

  private updateResearchTeamStatus(status: 'pending' | 'in_progress' | 'completed' | 'error'): void {
    const researchTeam = ["Bull Researcher", "Bear Researcher", "Research Manager", "Trader"];
    for (const agent of researchTeam) {
      this.messageBuffer.updateAgentStatus(agent, status);
    }
  }

  private handleInvestmentDebateState(debateState: any): void {
    this.updateResearchTeamStatus("in_progress");

    if (debateState.bull_history) {
      const bullResponses = debateState.bull_history.split('\n');
      const latestBull = bullResponses[bullResponses.length - 1];
      if (latestBull) {
        this.messageBuffer.addMessage("Reasoning", latestBull);
        this.messageBuffer.updateReportSection("investment_plan", `### Bull Researcher Analysis\n${latestBull}`);
      }
    }

    if (debateState.bear_history) {
      const bearResponses = debateState.bear_history.split('\n');
      const latestBear = bearResponses[bearResponses.length - 1];
      if (latestBear) {
        this.messageBuffer.addMessage("Reasoning", latestBear);
        const currentReport = this.messageBuffer.reportSections.investment_plan || '';
        this.messageBuffer.updateReportSection("investment_plan", `${currentReport}\n\n### Bear Researcher Analysis\n${latestBear}`);
      }
    }

    if (debateState.judge_decision) {
      this.messageBuffer.addMessage("Reasoning", `Research Manager: ${debateState.judge_decision}`);
      const currentReport = this.messageBuffer.reportSections.investment_plan || '';
      this.messageBuffer.updateReportSection("investment_plan", `${currentReport}\n\n### Research Manager Decision\n${debateState.judge_decision}`);
      this.updateResearchTeamStatus("completed");
      this.messageBuffer.updateAgentStatus("Risky Analyst", "in_progress");
    }
  }

  private handleRiskDebateState(riskState: any): void {
    if (riskState.current_risky_response) {
      this.messageBuffer.updateAgentStatus("Risky Analyst", "in_progress");
      this.messageBuffer.addMessage("Reasoning", `Risky Analyst: ${riskState.current_risky_response}`);
      this.messageBuffer.updateReportSection("final_trade_decision", `### Risky Analyst Analysis\n${riskState.current_risky_response}`);
    }

    if (riskState.current_safe_response) {
      this.messageBuffer.updateAgentStatus("Safe Analyst", "in_progress");
      this.messageBuffer.addMessage("Reasoning", `Safe Analyst: ${riskState.current_safe_response}`);
      this.messageBuffer.updateReportSection("final_trade_decision", `### Safe Analyst Analysis\n${riskState.current_safe_response}`);
    }

    if (riskState.current_neutral_response) {
      this.messageBuffer.updateAgentStatus("Neutral Analyst", "in_progress");
      this.messageBuffer.addMessage("Reasoning", `Neutral Analyst: ${riskState.current_neutral_response}`);
      this.messageBuffer.updateReportSection("final_trade_decision", `### Neutral Analyst Analysis\n${riskState.current_neutral_response}`);
    }

    if (riskState.judge_decision) {
      this.messageBuffer.updateAgentStatus("Portfolio Manager", "in_progress");
      this.messageBuffer.addMessage("Reasoning", `Portfolio Manager: ${riskState.judge_decision}`);
      this.messageBuffer.updateReportSection("final_trade_decision", `### Portfolio Manager Decision\n${riskState.judge_decision}`);
      
      // Mark risk analysts as completed
      this.messageBuffer.updateAgentStatus("Risky Analyst", "completed");
      this.messageBuffer.updateAgentStatus("Safe Analyst", "completed");
      this.messageBuffer.updateAgentStatus("Neutral Analyst", "completed");
      this.messageBuffer.updateAgentStatus("Portfolio Manager", "completed");
    }
  }

  private saveReportSections(chunk: any, reportDir: string): void {
    const reportMapping = {
      market_report: 'market_report.md',
      sentiment_report: 'sentiment_report.md',
      news_report: 'news_report.md',
      fundamentals_report: 'fundamentals_report.md',
      investment_plan: 'investment_plan.md',
      trader_investment_plan: 'trader_investment_plan.md',
      final_trade_decision: 'final_trade_decision.md'
    };

    for (const [chunkKey, fileName] of Object.entries(reportMapping)) {
      if (chunk[chunkKey]) {
        try {
          writeFileSync(join(reportDir, fileName), chunk[chunkKey]);
        } catch {
          // Ignore file write errors
        }
      }
    }
  }

  private extractContentString(content: any): string {
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      const textParts: string[] = [];
      for (const item of content) {
        if (typeof item === 'object' && item !== null) {
          if (item.type === 'text') {
            textParts.push(item.text || '');
          } else if (item.type === 'tool_use') {
            textParts.push(`[Tool: ${item.name || 'unknown'}]`);
          }
        } else {
          textParts.push(String(item));
        }
      }
      return textParts.join(' ');
    } else {
      return String(content);
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate a detailed report from the full state and analysis result
   */
  private generateDetailedReport(fullState: any, analysisResult: any): string {
    const report = [];
    
    report.push('# Detailed Trading Agent Analysis Report\n');
    report.push(`**Ticker:** ${analysisResult.ticker || 'N/A'}\n`);
    report.push(`**Analysis Date:** ${analysisResult.analysisDate || new Date().toISOString()}\n`);
    report.push(`**Final Decision:** ${analysisResult.decision}\n`);
    report.push(`**Confidence:** ${analysisResult.confidence}\n\n`);
    
    // Market Analysis
    if (fullState.market_report) {
      report.push('## Market Analysis\n');
      report.push(typeof fullState.market_report === 'string' 
        ? fullState.market_report 
        : JSON.stringify(fullState.market_report, null, 2));
      report.push('\n\n');
    }
    
    // Sentiment Analysis
    if (fullState.sentiment_report) {
      report.push('## Sentiment Analysis\n');
      report.push(typeof fullState.sentiment_report === 'string' 
        ? fullState.sentiment_report 
        : JSON.stringify(fullState.sentiment_report, null, 2));
      report.push('\n\n');
    }
    
    // News Analysis
    if (fullState.news_report) {
      report.push('## News Analysis\n');
      report.push(typeof fullState.news_report === 'string' 
        ? fullState.news_report 
        : JSON.stringify(fullState.news_report, null, 2));
      report.push('\n\n');
    }
    
    // Fundamentals Analysis
    if (fullState.fundamentals_report) {
      report.push('## Fundamentals Analysis\n');
      report.push(typeof fullState.fundamentals_report === 'string' 
        ? fullState.fundamentals_report 
        : JSON.stringify(fullState.fundamentals_report, null, 2));
      report.push('\n\n');
    }
    
    // Investment Debate
    if (fullState.investment_debate_state) {
      report.push('## Investment Debate\n');
      report.push(typeof fullState.investment_debate_state === 'string' 
        ? fullState.investment_debate_state 
        : JSON.stringify(fullState.investment_debate_state, null, 2));
      report.push('\n\n');
    }
    
    // Trading Plan
    if (fullState.trader_investment_plan) {
      report.push('## Trading Plan\n');
      report.push(typeof fullState.trader_investment_plan === 'string' 
        ? fullState.trader_investment_plan 
        : JSON.stringify(fullState.trader_investment_plan, null, 2));
      report.push('\n\n');
    }
    
    // Risk Assessment
    if (fullState.risk_debate_state) {
      report.push('## Risk Assessment\n');
      report.push(typeof fullState.risk_debate_state === 'string' 
        ? fullState.risk_debate_state 
        : JSON.stringify(fullState.risk_debate_state, null, 2));
      report.push('\n\n');
    }
    
    // Final Reasoning
    report.push('## Final Reasoning\n');
    if (Array.isArray(analysisResult.reasoning)) {
      analysisResult.reasoning.forEach((reason: string, index: number) => {
        report.push(`${index + 1}. ${reason}\n`);
      });
    } else {
      report.push(analysisResult.reasoning || 'No reasoning provided');
    }
    
    return report.join('');
  }
}

export async function createCLI(): Promise<Command> {
  const program = new Command();
  
  program
    .name('tradingagents')
    .description('TradingAgents CLI: Multi-Agents LLM Financial Trading Framework')
    .version('1.0.0')
    .option('-v, --verbose', 'Enable verbose logging output')
    .option('-l, --log-level <level>', 'Set log level (debug, info, warn, error, critical)', 'info')
    .option('--log-to-console', 'Show logs in console output (useful with debug level)')
    .option('--no-file-logging', 'Disable file logging')
    .hook('preAction', async (thisCommand) => {
      const options = thisCommand.opts();
      
      // Configure verbose logging based on command line options
      if (options.verbose || options.logLevel !== 'info') {
        const loggingManager = LoggingManager.getInstance();
        loggingManager.applyLoggingConfiguration({
          verboseLogging: options.verbose || options.logLevel === 'debug',
          logLevel: options.logLevel,
          logToConsole: options.logToConsole || false,
          enableFileLogging: options.fileLogging !== false
        });

        // Log system info if debug level
        if (options.logLevel === 'debug') {
          logSystemInfo();
        }
      }
    });

  program
    .command('analyze')
    .description('Run a complete trading analysis')
    .argument('[ticker]', 'Stock ticker symbol (e.g., AAPL)')
    .argument('[date]', 'Analysis date (YYYY-MM-DD format)')
    .action(async (ticker?: string, date?: string) => {
      const cli = new TradingAgentsCLI();
      await cli.runAnalysis(ticker, date);
    });

  program
    .command('menu')
    .description('Show interactive main menu with all options')
    .action(async () => {
      const cli = new TradingAgentsCLI();
      await cli.showMainMenu();
    });

  program
    .command('export')
    .description('Export analysis results')
    .action(async () => {
      const exportManager = new ExportManager();
      await exportManager.exportResults();
    });

  program
    .command('historical')
    .description('Analyze historical data and trends')
    .action(async () => {
      const analyzer = new HistoricalAnalyzer();
      await analyzer.analyzeHistorical();
    });

  program
    .command('config')
    .description('Manage saved configurations')
    .action(async () => {
      const configManager = new ConfigManager();
      await configManager.manageConfigs();
    });

  program
    .command('lmstudio:preload')
    .description('Preload a model on an LM Studio instance')
    .requiredOption('-m, --model <name>', 'Model name to preload')
    .requiredOption('-h, --host <url>', 'LM Studio base URL (e.g., http://your-lm-studio-server:1234/v1)')
    .action(async (opts: { model: string; host: string }) => {
      try {
        const { ModelProvider } = await import('../models/provider');
        console.log(`Preloading model ${opts.model} at ${opts.host}...`);
        await ModelProvider.preloadModel({ provider: 'remote_lmstudio', modelName: opts.model, baseURL: opts.host });
        console.log('Model preload requested successfully.');
      } catch (err: any) {
        console.error('Failed to preload model:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('lmstudio:unload')
    .description('Request unload of a model on an LM Studio admin endpoint')
    .requiredOption('-m, --model <name>', 'Model name to unload')
    .option('-a, --admin <url>', 'LM Studio admin URL (falls back to LM_STUDIO_ADMIN_URL env var)')
    .action(async (opts: { model: string; admin?: string }) => {
      try {
        const { default: LMStudioManager } = await import('../models/lmstudio-manager');
        console.log(`Requesting unload of model ${opts.model} via admin ${opts.admin || process.env.LM_STUDIO_ADMIN_URL}...`);
        const success = await LMStudioManager.requestModelUnload(opts.model, opts.admin);
        if (success) {
          console.log('Model unload requested successfully.');
          process.exit(0);
        } else {
          console.error('Model unload request failed. Check admin URL and permissions.');
          process.exit(2);
        }
      } catch (err: any) {
        console.error('Failed to request model unload:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('lmstudio:switch')
    .description('Switch LM Studio instance to a different model (load target, optionally unload previous)')
    .requiredOption('-t, --to <model>', 'Target model to switch to')
    .option('-f, --from <model>', 'Previous model to unload after switch')
    .requiredOption('-h, --host <url>', 'LM Studio base URL (used to poll availability)')
    .option('-a, --admin <url>', 'LM Studio admin URL (falls back to LM_STUDIO_ADMIN_URL env var)')
    .option('--no-unload', 'Do not attempt to unload the previous model')
    .action(async (opts: { to: string; from?: string; host: string; admin?: string; unload?: boolean }) => {
      try {
        const { default: LMStudioManager } = await import('../models/lmstudio-manager');
        console.log(`Switching LM Studio at ${opts.host} to model ${opts.to}...`);
        const switchOpts: { adminUrl?: string; unloadPrevious?: boolean; previousModel?: string; pollIntervalMs?: number; timeoutMs?: number } = {};
        if (opts.admin) switchOpts.adminUrl = opts.admin;
        // NOTE: opts.unload is true when user sets the flag; when undefined, do not include to preserve defaults
        if (typeof opts.unload !== 'undefined') switchOpts.unloadPrevious = !!opts.unload;
        if (opts.from) switchOpts.previousModel = opts.from;
        await LMStudioManager.requestModelSwitch(opts.to, opts.host, switchOpts);
        console.log('Model switch completed (request submitted and availability confirmed).');
        process.exit(0);
      } catch (err: any) {
        console.error('Model switch failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  program
    .command('lmstudio:metrics')
    .description('Print LM Studio manager metrics snapshot')
    .action(async () => {
      try {
        const { default: LMStudioManager } = await import('../models/lmstudio-manager');
        const metrics = LMStudioManager.getMetrics();
        console.log('LM Studio Metrics:');
        console.log(JSON.stringify(metrics, null, 2));
        process.exit(0);
      } catch (err: any) {
        console.error('Failed to retrieve LM Studio metrics:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // Default action - show main menu
  program.action(async () => {
    const cli = new TradingAgentsCLI();
    await cli.showMainMenu();
  });

  return program;
}

// Export for direct usage

// Main execution when run directly
if (process.argv[1] && (import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) || process.argv[1].endsWith('src/cli/main.ts'))) {
  console.log('🔍 DEBUG: CLI main execution starting');
  console.log('🔍 DEBUG: Process arguments:', process.argv);
  createCLI().then(program => {
    console.log('🔍 DEBUG: CLI created, parsing arguments...');
    program.parse(process.argv);
    console.log('🔍 DEBUG: Arguments parsed');
  }).catch(error => {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  });
}