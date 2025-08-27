import chalk from 'chalk';
import { input, select, checkbox, Separator } from '@inquirer/prompts';
import { createLogger } from '../utils/enhanced-logger';
import { AnalysisResult, ExportManager } from './export-manager';

const logger = createLogger('cli', 'historical-analyzer');

export interface HistoricalSummary {
  totalAnalyses: number;
  uniqueTickers: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
  decisionBreakdown: Record<string, number>;
  confidenceStats: {
    average: number;
    distribution: Record<string, number>;
  };
  performanceByTicker: Record<string, {
    count: number;
    decisions: Record<string, number>;
    avgConfidence: number;
  }>;
  recentActivity: AnalysisResult[];
}

export interface TrendAnalysis {
  ticker: string;
  chronologicalResults: AnalysisResult[];
  trends: {
    decisionTrend: Array<{ date: string; decision: string; confidence: string }>;
    confidenceTrend: Array<{ date: string; confidence: number }>;
    consistencyScore: number;
  };
  insights: string[];
}

export class HistoricalAnalyzer {
  private resultsDir: string;
  private exportManager: ExportManager;

  constructor(resultsDir: string = './results') {
    this.resultsDir = resultsDir;
    this.exportManager = new ExportManager(resultsDir);
  }

  public async analyzeHistorical(): Promise<void> {
    try {
      console.log(chalk.blue('📊 Starting historical analysis...'));
      
      const results = await this.loadAllResults();
      
      if (results.length === 0) {
        console.log(chalk.yellow('No historical data found.'));
        return;
      }

      const analysisType = await select({
        message: 'Select analysis type:',
        choices: [
          { name: '📈 Overall Summary - High-level statistics', value: 'summary' },
          { name: '📊 Ticker Performance - Individual ticker analysis', value: 'ticker' },
          { name: '🔄 Trend Analysis - Decision patterns over time', value: 'trends' },
          { name: '📋 Comparative Analysis - Compare multiple tickers', value: 'compare' },
          { name: '📅 Time Period Analysis - Analyze specific date ranges', value: 'period' },
          new Separator(),
          { name: '🔙 Back to main menu', value: 'back' }
        ]
      });

      switch (analysisType) {
        case 'summary':
          await this.showOverallSummary(results);
          break;
        case 'ticker':
          await this.analyzeByTicker(results);
          break;
        case 'trends':
          await this.analyzeTrends(results);
          break;
        case 'compare':
          await this.compareAnalysis(results);
          break;
        case 'period':
          await this.analyzePeriod(results);
          break;
        case 'back':
          return;
      }

    } catch (error) {
      logger.error('analyze_historical', `Historical analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log(chalk.red(`✗ Analysis failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async loadAllResults(): Promise<AnalysisResult[]> {
    // Reuse the ExportManager's scanning logic
    return await (this.exportManager as any).scanAnalysisResults();
  }

  private async showOverallSummary(results: AnalysisResult[]): Promise<void> {
    const summary = this.generateSummary(results);
    
    console.log(chalk.bold('\n📊 Historical Analysis Summary'));
    console.log('='.repeat(50));
    
    console.log(chalk.blue(`\n📈 Overview:`));
    console.log(`  Total Analyses: ${chalk.green(summary.totalAnalyses)}`);
    console.log(`  Unique Tickers: ${chalk.green(summary.uniqueTickers.length)} (${summary.uniqueTickers.join(', ')})`);
    console.log(`  Date Range: ${chalk.green(summary.dateRange.earliest)} to ${chalk.green(summary.dateRange.latest)}`);
    
    console.log(chalk.blue(`\n🎯 Decision Breakdown:`));
    Object.entries(summary.decisionBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([decision, count]) => {
        const percentage = ((count / summary.totalAnalyses) * 100).toFixed(1);
        console.log(`  ${decision}: ${chalk.green(count)} (${percentage}%)`);
      });
    
    console.log(chalk.blue(`\n🎲 Confidence Statistics:`));
    console.log(`  Average Confidence: ${chalk.green(summary.confidenceStats.average.toFixed(1))}`);
    
    if (Object.keys(summary.confidenceStats.distribution).length > 0) {
      console.log(`  Confidence Distribution:`);
      Object.entries(summary.confidenceStats.distribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([range, count]) => {
          const percentage = ((count / summary.totalAnalyses) * 100).toFixed(1);
          console.log(`    ${range}: ${chalk.green(count)} (${percentage}%)`);
        });
    }
    
    console.log(chalk.blue(`\n📊 Performance by Ticker:`));
    Object.entries(summary.performanceByTicker)
      .sort(([,a], [,b]) => b.count - a.count)
      .forEach(([ticker, stats]) => {
        console.log(`  ${chalk.cyan(ticker)}: ${stats.count} analyses, avg confidence: ${stats.avgConfidence.toFixed(1)}`);
        const topDecision = Object.entries(stats.decisions)
          .sort(([,a], [,b]) => b - a)[0];
        if (topDecision) {
          console.log(`    Most common: ${topDecision[0]} (${topDecision[1]} times)`);
        }
      });
    
    if (summary.recentActivity.length > 0) {
      console.log(chalk.blue(`\n🕒 Recent Activity (Last 5):`));
      summary.recentActivity.slice(0, 5).forEach((result, index) => {
        console.log(`  ${index + 1}. ${chalk.cyan(result.ticker)} on ${result.analysisDate}: ${chalk.green(result.decision)} (${result.confidence})`);
      });
    }

    await this.promptForActions(results, 'summary');
  }

  private generateSummary(results: AnalysisResult[]): HistoricalSummary {
    const uniqueTickers = [...new Set(results.map(r => r.ticker))];
    const dates = results.map(r => r.analysisDate).sort();
    
    // Decision breakdown
    const decisionBreakdown: Record<string, number> = {};
    const confidenceValues: number[] = [];
    const confidenceDistribution: Record<string, number> = {};
    
    results.forEach(result => {
      // Decision breakdown
      decisionBreakdown[result.decision] = (decisionBreakdown[result.decision] || 0) + 1;
      
      // Confidence analysis
      const confMatch = result.confidence.match(/(\d+(?:\.\d+)?)/);
      if (confMatch) {
        const confValue = parseFloat(confMatch[1]!);
        confidenceValues.push(confValue);
        
        // Confidence distribution
        let range: string;
        if (confValue >= 90) range = '90-100%';
        else if (confValue >= 80) range = '80-89%';
        else if (confValue >= 70) range = '70-79%';
        else if (confValue >= 60) range = '60-69%';
        else range = '<60%';
        
        confidenceDistribution[range] = (confidenceDistribution[range] || 0) + 1;
      }
    });
    
    // Performance by ticker
    const performanceByTicker: Record<string, any> = {};
    uniqueTickers.forEach(ticker => {
      const tickerResults = results.filter(r => r.ticker === ticker);
      const tickerDecisions: Record<string, number> = {};
      const tickerConfidences: number[] = [];
      
      tickerResults.forEach(result => {
        tickerDecisions[result.decision] = (tickerDecisions[result.decision] || 0) + 1;
        
        const confMatch = result.confidence.match(/(\d+(?:\.\d+)?)/);
        if (confMatch) {
          tickerConfidences.push(parseFloat(confMatch[1]!));
        }
      });
      
      performanceByTicker[ticker] = {
        count: tickerResults.length,
        decisions: tickerDecisions,
        avgConfidence: tickerConfidences.length > 0 ? 
          tickerConfidences.reduce((a, b) => a + b, 0) / tickerConfidences.length : 0
      };
    });
    
    return {
      totalAnalyses: results.length,
      uniqueTickers,
      dateRange: {
        earliest: dates[0] || '',
        latest: dates[dates.length - 1] || ''
      },
      decisionBreakdown,
      confidenceStats: {
        average: confidenceValues.length > 0 ? 
          confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : 0,
        distribution: confidenceDistribution
      },
      performanceByTicker,
      recentActivity: results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    };
  }

  private async analyzeByTicker(results: AnalysisResult[]): Promise<void> {
    const tickers = [...new Set(results.map(r => r.ticker))].sort();
    
    if (tickers.length === 0) {
      console.log(chalk.yellow('No tickers found.'));
      return;
    }

    const selectedTicker = await select({
      message: 'Select ticker to analyze:',
      choices: tickers.map(ticker => {
        const count = results.filter(r => r.ticker === ticker).length;
        return { name: `${ticker} (${count} analyses)`, value: ticker };
      })
    });

    const tickerResults = results.filter(r => r.ticker === selectedTicker);
    const trendAnalysis = this.analyzeTrendForTicker(selectedTicker, tickerResults);
    
    console.log(chalk.bold(`\n📊 Analysis for ${chalk.cyan(selectedTicker)}`));
    console.log('='.repeat(50));
    
    console.log(chalk.blue(`\n📈 Overview:`));
    console.log(`  Total Analyses: ${chalk.green(tickerResults.length)}`);
    console.log(`  Date Range: ${chalk.green(trendAnalysis.chronologicalResults[0]?.analysisDate || 'N/A')} to ${chalk.green(trendAnalysis.chronologicalResults[trendAnalysis.chronologicalResults.length - 1]?.analysisDate || 'N/A')}`);
    console.log(`  Consistency Score: ${chalk.green(trendAnalysis.trends.consistencyScore.toFixed(1))}%`);
    
    console.log(chalk.blue(`\n🎯 Decision History:`));
    trendAnalysis.trends.decisionTrend.forEach((trend, index) => {
      console.log(`  ${index + 1}. ${trend.date}: ${chalk.green(trend.decision)} (${trend.confidence})`);
    });
    
    if (trendAnalysis.insights.length > 0) {
      console.log(chalk.blue(`\n💡 Insights:`));
      trendAnalysis.insights.forEach((insight, index) => {
        console.log(`  ${index + 1}. ${insight}`);
      });
    }

    await this.promptForActions(tickerResults, 'ticker', selectedTicker);
  }

  private analyzeTrendForTicker(ticker: string, results: AnalysisResult[]): TrendAnalysis {
    const chronological = results.sort((a, b) => new Date(a.analysisDate).getTime() - new Date(b.analysisDate).getTime());
    
    const decisionTrend = chronological.map(r => ({
      date: r.analysisDate,
      decision: r.decision,
      confidence: r.confidence
    }));
    
    const confidenceTrend = chronological
      .map(r => {
        const confMatch = r.confidence.match(/(\d+(?:\.\d+)?)/);
        return {
          date: r.analysisDate,
          confidence: confMatch ? parseFloat(confMatch[1]!) : 0
        };
      })
      .filter(t => t.confidence > 0);
    
    // Calculate consistency score
    const decisions = chronological.map(r => r.decision);
    const uniqueDecisions = [...new Set(decisions)];
    const consistencyScore = uniqueDecisions.length === 1 ? 100 : 
      ((decisions.length - uniqueDecisions.length + 1) / decisions.length) * 100;
    
    // Generate insights
    const insights: string[] = [];
    
    if (uniqueDecisions.length === 1) {
      insights.push(`Highly consistent: All analyses resulted in "${uniqueDecisions[0]}" decisions`);
    } else if (consistencyScore > 70) {
      insights.push(`Generally consistent decision pattern with ${consistencyScore.toFixed(1)}% consistency`);
    } else {
      insights.push(`Variable decision pattern - consider reviewing analysis criteria`);
    }
    
    if (confidenceTrend.length > 1) {
      const avgConfidence = confidenceTrend.reduce((sum, t) => sum + t.confidence, 0) / confidenceTrend.length;
      const firstConf = confidenceTrend[0]!.confidence;
      const lastConf = confidenceTrend[confidenceTrend.length - 1]!.confidence;
      
      if (lastConf > firstConf + 10) {
        insights.push(`Confidence trend improving: ${firstConf.toFixed(1)}% → ${lastConf.toFixed(1)}%`);
      } else if (lastConf < firstConf - 10) {
        insights.push(`Confidence trend declining: ${firstConf.toFixed(1)}% → ${lastConf.toFixed(1)}%`);
      }
      
      if (avgConfidence > 80) {
        insights.push(`High average confidence (${avgConfidence.toFixed(1)}%) indicates strong conviction`);
      } else if (avgConfidence < 60) {
        insights.push(`Lower average confidence (${avgConfidence.toFixed(1)}%) suggests uncertainty`);
      }
    }
    
    return {
      ticker,
      chronologicalResults: chronological,
      trends: {
        decisionTrend,
        confidenceTrend,
        consistencyScore
      },
      insights
    };
  }

  private async analyzeTrends(results: AnalysisResult[]): Promise<void> {
    console.log(chalk.blue('🔄 Analyzing trends across all data...'));
    
    const timelineResults = results.sort((a, b) => new Date(a.analysisDate).getTime() - new Date(b.analysisDate).getTime());
    
    if (timelineResults.length < 2) {
      console.log(chalk.yellow('Need at least 2 analyses to identify trends.'));
      return;
    }

    // Monthly aggregation
    const monthlyData = this.aggregateByMonth(timelineResults);
    
    console.log(chalk.bold('\n🔄 Trend Analysis'));
    console.log('='.repeat(50));
    
    console.log(chalk.blue('\n📅 Monthly Analysis Activity:'));
    monthlyData.forEach(month => {
      console.log(`  ${month.month}: ${chalk.green(month.count)} analyses`);
      if (month.topDecision) {
        console.log(`    Most common decision: ${month.topDecision.decision} (${month.topDecision.count} times)`);
      }
    });
    
    // Overall trends
    console.log(chalk.blue('\n📊 Overall Trends:'));
    const firstMonth = monthlyData[0];
    const lastMonth = monthlyData[monthlyData.length - 1];
    
    if (firstMonth && lastMonth && monthlyData.length > 1) {
      const activityTrend = lastMonth.count > firstMonth.count ? 'increasing' : 'decreasing';
      console.log(`  Analysis activity is ${chalk.cyan(activityTrend)} over time`);
    }

    await this.promptForActions(results, 'trends');
  }

  private aggregateByMonth(results: AnalysisResult[]): Array<{
    month: string;
    count: number;
    decisions: Record<string, number>;
    topDecision?: { decision: string; count: number } | undefined;
  }> {
    const monthlyMap = new Map<string, AnalysisResult[]>();
    
    results.forEach(result => {
      const month = result.analysisDate.substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, []);
      }
      monthlyMap.get(month)!.push(result);
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, monthResults]) => {
        const decisions: Record<string, number> = {};
        monthResults.forEach(result => {
          decisions[result.decision] = (decisions[result.decision] || 0) + 1;
        });
        
        const topDecision = Object.entries(decisions)
          .sort(([,a], [,b]) => b - a)[0];
        
        return {
          month,
          count: monthResults.length,
          decisions,
          topDecision: topDecision ? { decision: topDecision[0], count: topDecision[1] } : undefined
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async compareAnalysis(results: AnalysisResult[]): Promise<void> {
    const tickers = [...new Set(results.map(r => r.ticker))].sort();
    
    if (tickers.length < 2) {
      console.log(chalk.yellow('Need at least 2 different tickers for comparison.'));
      return;
    }

    const selectedTickers = await checkbox({
      message: 'Select tickers to compare:',
      choices: tickers.map(ticker => {
        const count = results.filter(r => r.ticker === ticker).length;
        return { name: `${ticker} (${count} analyses)`, value: ticker };
      })
    });

    if (selectedTickers.length < 2) {
      throw new Error('Please select at least 2 tickers');
    }

    console.log(chalk.bold('\n🔄 Ticker Comparison'));
    console.log('='.repeat(50));

    selectedTickers.forEach((ticker: string) => {
      const tickerResults = results.filter(r => r.ticker === ticker);
      const decisions: Record<string, number> = {};
      const confidences: number[] = [];
      
      tickerResults.forEach(result => {
        decisions[result.decision] = (decisions[result.decision] || 0) + 1;
        const confMatch = result.confidence.match(/(\d+(?:\.\d+)?)/);
        if (confMatch) {
          confidences.push(parseFloat(confMatch[1]!));
        }
      });
      
      console.log(chalk.blue(`\n📊 ${ticker}:`));
      console.log(`  Total Analyses: ${chalk.green(tickerResults.length)}`);
      console.log(`  Average Confidence: ${chalk.green(confidences.length > 0 ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1) : 'N/A')}%`);
      console.log(`  Decisions:`);
      Object.entries(decisions)
        .sort(([,a], [,b]) => b - a)
        .forEach(([decision, count]) => {
          const percentage = ((count / tickerResults.length) * 100).toFixed(1);
          console.log(`    ${decision}: ${chalk.green(count)} (${percentage}%)`);
        });
    });

    await this.promptForActions(results.filter(r => selectedTickers.includes(r.ticker)), 'compare');
  }

  private async analyzePeriod(results: AnalysisResult[]): Promise<void> {
    const dates = results.map(r => r.analysisDate).sort();
    const minDate = dates[0] || '';
    const maxDate = dates[dates.length - 1] || '';

    const startDate = await input({
      message: 'Start date (YYYY-MM-DD):',
      default: minDate,
      validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter date in YYYY-MM-DD format'
    });

    const endDate = await input({
      message: 'End date (YYYY-MM-DD):',
      default: maxDate,
      validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter date in YYYY-MM-DD format'
    });

    const periodResults = results.filter(r => r.analysisDate >= startDate && r.analysisDate <= endDate);
    
    if (periodResults.length === 0) {
      console.log(chalk.yellow(`No analyses found between ${startDate} and ${endDate}.`));
      return;
    }

    console.log(chalk.bold(`\n📅 Period Analysis: ${startDate} to ${endDate}`));
    console.log('='.repeat(50));
    
    const summary = this.generateSummary(periodResults);
    
    console.log(chalk.blue(`\n📈 Period Summary:`));
    console.log(`  Total Analyses: ${chalk.green(summary.totalAnalyses)}`);
    console.log(`  Unique Tickers: ${chalk.green(summary.uniqueTickers.length)} (${summary.uniqueTickers.join(', ')})`);
    
    console.log(chalk.blue(`\n🎯 Decision Breakdown:`));
    Object.entries(summary.decisionBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([decision, count]) => {
        const percentage = ((count / summary.totalAnalyses) * 100).toFixed(1);
        console.log(`  ${decision}: ${chalk.green(count)} (${percentage}%)`);
      });

    await this.promptForActions(periodResults, 'period');
  }

  private async promptForActions(_results: AnalysisResult[], _analysisType: string, _context?: string): Promise<void> {
    const action = await select({
      message: 'What would you like to do next?',
      choices: [
        { name: '📤 Export this analysis', value: 'export' },
        { name: '🔄 Run another analysis', value: 'another' },
        { name: '🔙 Back to main menu', value: 'back' }
      ]
    });

    switch (action) {
      case 'export':
        await this.exportManager.exportResults();
        break;
      case 'another':
        await this.analyzeHistorical();
        break;
      case 'back':
        return;
    }
  }
}