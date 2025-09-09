import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { MessageBuffer } from './message-buffer';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DisplaySystem {
  private spinner: Ora | undefined;
  private lastUpdate = 0;
  private updateInterval = 250; // Update every 250ms

  public displayWelcome(): void {
    try {
      // Try to read welcome file from relative path
      const welcomePath = join(process.cwd(), 'js', 'src', 'cli', 'static', 'welcome.txt');
      const welcomeAscii = readFileSync(welcomePath, 'utf-8');
      
      console.clear();
      console.log(chalk.green(welcomeAscii));
      console.log(chalk.bold.green('TradingAgents: Multi-Agents LLM Financial Trading Framework - CLI'));
      console.log();
      console.log(chalk.bold('Workflow Steps:'));
      console.log('I. Analyst Team → II. Research Team → III. Trader → IV. Risk Management → V. Portfolio Management');
      console.log();
      console.log(chalk.dim('Improved by Southerncoder (https://github.com/southerncoder)'));
      console.log();
    } catch (_error) {
      // Fallback if welcome file doesn't exist
      console.clear();
      console.log(chalk.bold.green('═══════════════════════════════════════════════════════════════'));
      console.log(chalk.bold.green('               TradingAgents CLI Framework                      '));
      console.log(chalk.bold.green('═══════════════════════════════════════════════════════════════'));
      console.log();
      console.log(chalk.bold('Workflow Steps:'));
      console.log('I. Analyst Team → II. Research Team → III. Trader → IV. Risk Management → V. Portfolio Management');
      console.log();
      console.log(chalk.dim('Improved by Southerncoder'));
      console.log();
    }
  }

  public createQuestionBox(title: string, prompt: string, defaultValue?: string): void {
    console.log(chalk.blue('┌─────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue('│') + ' ' + chalk.bold(title).padEnd(59) + chalk.blue('│'));
    console.log(chalk.blue('├─────────────────────────────────────────────────────────────┤'));
    console.log(chalk.blue('│') + ' ' + chalk.dim(prompt).padEnd(59) + chalk.blue('│'));
    if (defaultValue) {
      console.log(chalk.blue('│') + ' ' + chalk.dim(`Default: ${defaultValue}`).padEnd(59) + chalk.blue('│'));
    }
    console.log(chalk.blue('└─────────────────────────────────────────────────────────────┘'));
    console.log();
  }

  public startLiveDisplay(messageBuffer: MessageBuffer, ticker: string, analysisDate: string): void {
    console.clear();
    this.displayHeader();
    console.log(chalk.green(`Starting analysis for ${ticker} on ${analysisDate}...`));
    console.log();
    
    this.spinner = ora({
      text: 'Initializing agents...',
      color: 'cyan'
    }).start();

    // Start the live update loop
    this.startUpdateLoop(messageBuffer);
  }

  private displayHeader(): void {
    console.log(chalk.green('┌─────────────────────────────────────────────────────────────┐'));
    console.log(chalk.green('│') + ' ' + chalk.bold.green('Welcome to TradingAgents CLI').padEnd(59) + chalk.green('│'));
    console.log(chalk.green('│') + ' ' + chalk.dim('© Southerncoder (https://github.com/southerncoder)').padEnd(59) + chalk.green('│'));
    console.log(chalk.green('└─────────────────────────────────────────────────────────────┘'));
    console.log();
  }

  private startUpdateLoop(messageBuffer: MessageBuffer): void {
    const updateDisplay = () => {
      const now = Date.now();
      if (now - this.lastUpdate >= this.updateInterval) {
        this.updateLiveDisplay(messageBuffer);
        this.lastUpdate = now;
      }
    };

    // Update display every updateInterval
    const intervalId = setInterval(updateDisplay, this.updateInterval);
    
    // Store reference to clear interval later
    (this as any).intervalId = intervalId;
  }

  private updateLiveDisplay(messageBuffer: MessageBuffer): void {
    if (!this.spinner) return;

    // Update spinner text based on current agent
    if (messageBuffer.currentAgent) {
      this.spinner.text = `${messageBuffer.currentAgent} is working...`;
    }

    // You could add more sophisticated display updates here
    // For now, we'll keep it simple with the spinner
  }

  public updateProgress(messageBuffer: MessageBuffer): void {
    if (!this.spinner) return;

    const stats = messageBuffer.getStats();
    const completedAgents = Object.values(messageBuffer.agentStatus).filter(status => status === 'completed').length;
    const totalAgents = Object.keys(messageBuffer.agentStatus).length;
    
    this.spinner.text = `Progress: ${completedAgents}/${totalAgents} agents completed | ${stats.reports} reports generated`;
  }

  public displayProgress(messageBuffer: MessageBuffer): void {
    console.log('\n' + chalk.bold.cyan('Agent Progress:'));
    console.log(chalk.cyan('─'.repeat(80)));
    
    const teams = {
      'Analyst Team': ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst'],
      'Research Team': ['Bull Researcher', 'Bear Researcher', 'Research Manager'],
      'Trading Team': ['Trader'],
      'Risk Management': ['Risky Analyst', 'Neutral Analyst', 'Safe Analyst'],
      'Portfolio Management': ['Portfolio Manager']
    };

    for (const [teamName, agents] of Object.entries(teams)) {
      console.log(`\n${chalk.bold.magenta(teamName)}:`);
      
      for (const agent of agents) {
        const status = messageBuffer.agentStatus[agent];
        let statusColor;
        let statusIcon;
        
        switch (status) {
          case 'completed':
            statusColor = chalk.green;
            statusIcon = '✓';
            break;
          case 'in_progress':
            statusColor = chalk.yellow;
            statusIcon = '⟳';
            break;
          case 'error':
            statusColor = chalk.red;
            statusIcon = '✗';
            break;
          default:
            statusColor = chalk.gray;
            statusIcon = '○';
        }
        
        console.log(`  ${statusIcon} ${agent.padEnd(20)} ${statusColor(status)}`);
      }
    }
  }

  public displayCurrentReport(messageBuffer: MessageBuffer): void {
    if (messageBuffer.currentReport) {
      console.log('\n' + chalk.bold.green('Current Report:'));
      console.log(chalk.green('─'.repeat(80)));
      console.log(messageBuffer.currentReport);
    }
  }

  public displayStats(messageBuffer: MessageBuffer): void {
    const stats = messageBuffer.getStats();
    console.log('\n' + chalk.bold.blue('Statistics:'));
    console.log(chalk.blue('─'.repeat(50)));
    console.log(`Tool Calls: ${stats.toolCalls} | LLM Calls: ${stats.llmCalls} | Reports: ${stats.reports}`);
  }

  public displayCompleteReport(finalState: any): void {
    console.log('\n' + chalk.bold.green('═'.repeat(80)));
    console.log(chalk.bold.green('                    COMPLETE ANALYSIS REPORT'));
    console.log(chalk.bold.green('═'.repeat(80)));

    // I. Analyst Team Reports
    if (finalState.market_report || finalState.sentiment_report || 
        finalState.news_report || finalState.fundamentals_report) {
      console.log('\n' + chalk.bold.cyan('I. ANALYST TEAM REPORTS'));
      console.log(chalk.cyan('─'.repeat(60)));
      
      if (finalState.market_report) {
        console.log('\n' + chalk.bold.blue('Market Analyst:'));
        console.log(finalState.market_report);
      }
      
      if (finalState.sentiment_report) {
        console.log('\n' + chalk.bold.blue('Social Analyst:'));
        console.log(finalState.sentiment_report);
      }
      
      if (finalState.news_report) {
        console.log('\n' + chalk.bold.blue('News Analyst:'));
        console.log(finalState.news_report);
      }
      
      if (finalState.fundamentals_report) {
        console.log('\n' + chalk.bold.blue('Fundamentals Analyst:'));
        console.log(finalState.fundamentals_report);
      }
    }

    // II. Research Team Reports
    if (finalState.investment_debate_state) {
      console.log('\n' + chalk.bold.magenta('II. RESEARCH TEAM DECISION'));
      console.log(chalk.magenta('─'.repeat(60)));
      
      const debateState = finalState.investment_debate_state;
      
      if (debateState.bull_history) {
        console.log('\n' + chalk.bold.blue('Bull Researcher:'));
        console.log(debateState.bull_history);
      }
      
      if (debateState.bear_history) {
        console.log('\n' + chalk.bold.blue('Bear Researcher:'));
        console.log(debateState.bear_history);
      }
      
      if (debateState.judge_decision) {
        console.log('\n' + chalk.bold.blue('Research Manager:'));
        console.log(debateState.judge_decision);
      }
    }

    // III. Trading Team Reports
    if (finalState.trader_investment_plan) {
      console.log('\n' + chalk.bold.yellow('III. TRADING TEAM PLAN'));
      console.log(chalk.yellow('─'.repeat(60)));
      console.log(finalState.trader_investment_plan);
    }

    // IV. Risk Management Team Reports
    if (finalState.risk_debate_state) {
      console.log('\n' + chalk.bold.red('IV. RISK MANAGEMENT TEAM DECISION'));
      console.log(chalk.red('─'.repeat(60)));
      
      const riskState = finalState.risk_debate_state;
      
      if (riskState.risky_history) {
        console.log('\n' + chalk.bold.blue('Aggressive Analyst:'));
        console.log(riskState.risky_history);
      }
      
      if (riskState.safe_history) {
        console.log('\n' + chalk.bold.blue('Conservative Analyst:'));
        console.log(riskState.safe_history);
      }
      
      if (riskState.neutral_history) {
        console.log('\n' + chalk.bold.blue('Neutral Analyst:'));
        console.log(riskState.neutral_history);
      }
    }

    // V. Portfolio Manager Decision
    if (finalState.risk_debate_state?.judge_decision) {
      console.log('\n' + chalk.bold.green('V. PORTFOLIO MANAGER DECISION'));
      console.log(chalk.green('─'.repeat(60)));
      console.log(finalState.risk_debate_state.judge_decision);
    }

    console.log('\n' + chalk.bold.green('═'.repeat(80)));
  }

  public stopLiveDisplay(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
    
    if ((this as any).intervalId) {
      clearInterval((this as any).intervalId);
      (this as any).intervalId = undefined;
    }
  }

  public showSuccess(message: string): void {
    console.log(chalk.green('✓ ' + message));
  }

  public showError(message: string): void {
    console.log(chalk.red('✗ ' + message));
  }

  public showInfo(message: string): void {
    console.log(chalk.blue('ℹ ' + message));
  }

  public showWarning(message: string): void {
    console.log(chalk.yellow('⚠ ' + message));
  }
}