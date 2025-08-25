import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('cli', 'export-manager');

export interface AnalysisResult {
  ticker: string;
  analysisDate: string;
  decision: string;
  confidence: string;
  reasoning: string[];
  timestamp: string;
  reports: Record<string, string>;
  metadata: {
    analysts: string[];
    llmProvider: string;
    researchDepth: number;
    executionTime?: number;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown' | 'html' | 'pdf';
  includeReports: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  } | undefined;
  tickers?: string[] | undefined;
}

export class ExportManager {
  private resultsDir: string;

  constructor(resultsDir: string = './results') {
    this.resultsDir = resultsDir;
  }

  public async exportResults(): Promise<void> {
    try {
      const analysisResults = await this.scanAnalysisResults();
      
      if (analysisResults.length === 0) {
        console.log(chalk.yellow('No analysis results found to export.'));
        return;
      }

      console.log(chalk.blue(`Found ${analysisResults.length} analysis results`));

      const options = await this.getExportOptions(analysisResults);
      const filteredResults = this.filterResults(analysisResults, options);

      if (filteredResults.length === 0) {
        console.log(chalk.yellow('No results match the selected criteria.'));
        return;
      }

      const { exportPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'exportPath',
          message: 'Enter export file path:',
          default: `tradingagents-export-${new Date().toISOString().split('T')[0]}.${options.format}`,
          validate: (input: string) => {
            if (input.trim().length === 0) {
              return 'Please enter a valid file path.';
            }
            return true;
          }
        }
      ]);

      await this.performExport(filteredResults, options, exportPath);
      console.log(chalk.green(`✓ Successfully exported ${filteredResults.length} results to: ${exportPath}`));

    } catch (error) {
      logger.error('export_results', `Export failed: ${error instanceof Error ? error.message : String(error)}`);
      console.log(chalk.red(`✗ Export failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async scanAnalysisResults(): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    if (!existsSync(this.resultsDir)) {
      return results;
    }

    try {
      const tickers = readdirSync(this.resultsDir).filter(item => {
        const tickerPath = join(this.resultsDir, item);
        return statSync(tickerPath).isDirectory();
      });

      for (const ticker of tickers) {
        const tickerPath = join(this.resultsDir, ticker);
        
        try {
          const dates = readdirSync(tickerPath).filter(item => {
            const datePath = join(tickerPath, item);
            return statSync(datePath).isDirectory();
          });

          for (const date of dates) {
            const analysisPath = join(tickerPath, date);
            const result = await this.loadAnalysisResult(ticker, date, analysisPath);
            if (result) {
              results.push(result);
            }
          }
        } catch (error) {
          logger.warn('scan_ticker_directory', `Failed to scan ticker directory: ${ticker}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      logger.error('scan_results_directory', `Failed to scan results directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private async loadAnalysisResult(ticker: string, date: string, analysisPath: string): Promise<AnalysisResult | null> {
    try {
      const reportsDir = join(analysisPath, 'reports');
      const logFile = join(analysisPath, 'message_tool.log');
      
      // Try to load the final report first
      const finalReportPath = join(reportsDir, 'final_report.md');
      const analysisReportPath = join(reportsDir, 'analysis_report.md');
      
      let decision = 'Unknown';
      let confidence = 'Unknown';
      let reasoning: string[] = [];
      let timestamp = date;

      // Parse final report if available
      if (existsSync(finalReportPath)) {
        const finalReport = readFileSync(finalReportPath, 'utf-8');
        const decisionMatch = finalReport.match(/Decision:\s*([^\n]+)/i);
        const confidenceMatch = finalReport.match(/Confidence:\s*([^\n]+)/i);
        
        if (decisionMatch) decision = decisionMatch[1]!.trim();
        if (confidenceMatch) confidence = confidenceMatch[1]!.trim();
      } else if (existsSync(analysisReportPath)) {
        const analysisReport = readFileSync(analysisReportPath, 'utf-8');
        const decisionMatch = analysisReport.match(/Decision:\s*([^\n]+)/i);
        const confidenceMatch = analysisReport.match(/Confidence:\s*([^\n]+)/i);
        
        if (decisionMatch) decision = decisionMatch[1]!.trim();
        if (confidenceMatch) confidence = confidenceMatch[1]!.trim();
        
        // Extract reasoning from the report
        const reasoningMatch = analysisReport.match(/## Reasoning:\s*([\s\S]+)/i);
        if (reasoningMatch) {
          reasoning = reasoningMatch[1]!.split('\n\n').filter(r => r.trim());
        }
      }

      // Load individual reports
      const reports: Record<string, string> = {};
      if (existsSync(reportsDir)) {
        const reportFiles = readdirSync(reportsDir).filter(f => f.endsWith('.md'));
        for (const reportFile of reportFiles) {
          const reportPath = join(reportsDir, reportFile);
          const reportKey = basename(reportFile, '.md');
          reports[reportKey] = readFileSync(reportPath, 'utf-8');
        }
      }

      // Try to get timestamp from log file
      if (existsSync(logFile)) {
        try {
          const logContent = readFileSync(logFile, 'utf-8');
          const lines = logContent.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            const firstLine = lines[0]!;
            const timeMatch = firstLine.match(/(\d{1,2}:\d{2}:\d{2})/);
            if (timeMatch) {
              timestamp = `${date}T${timeMatch[1]}:00`;
            }
          }
        } catch (error) {
          // Ignore log file parsing errors
        }
      }

      // Get directory modification time as fallback
      try {
        const stats = statSync(analysisPath);
        timestamp = stats.mtime.toISOString();
      } catch (error) {
        // Use date as fallback
        timestamp = `${date}T12:00:00.000Z`;
      }

      return {
        ticker,
        analysisDate: date,
        decision,
        confidence,
        reasoning,
        timestamp,
        reports,
        metadata: {
          analysts: this.extractAnalysts(reports),
          llmProvider: 'unknown', // Would need to be stored separately
          researchDepth: 1, // Would need to be stored separately
        }
      };

    } catch (error) {
      logger.warn('load_analysis_result', `Failed to load analysis result for ${ticker}/${date}`, { 
        ticker, 
        date, 
        path: analysisPath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  private extractAnalysts(reports: Record<string, string>): string[] {
    const analysts: string[] = [];
    const analystMap: Record<string, string> = {
      'market_report': 'Market',
      'sentiment_report': 'Social',
      'news_report': 'News',
      'fundamentals_report': 'Fundamentals'
    };

    for (const [reportKey, analystName] of Object.entries(analystMap)) {
      if (reports[reportKey]) {
        analysts.push(analystName);
      }
    }

    return analysts;
  }

  private async getExportOptions(results: AnalysisResult[]): Promise<ExportOptions> {
    const tickers = [...new Set(results.map(r => r.ticker))].sort();
    const dates = results.map(r => r.analysisDate).sort();
    const minDate = dates[0] || '';
    const maxDate = dates[dates.length - 1] || '';

    const { format, includeReports, includeMetadata, useFilters } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Select export format:',
        choices: [
          { name: 'JSON - Machine readable format', value: 'json' },
          { name: 'CSV - Spreadsheet compatible', value: 'csv' },
          { name: 'Markdown - Human readable', value: 'markdown' },
          { name: 'HTML - Web format', value: 'html' }
        ]
      },
      {
        type: 'confirm',
        name: 'includeReports',
        message: 'Include detailed reports?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeMetadata',
        message: 'Include analysis metadata?',
        default: true
      },
      {
        type: 'confirm',
        name: 'useFilters',
        message: 'Apply filters to results?',
        default: false
      }
    ]);

    let dateRange: { start: string; end: string } | undefined;
    let selectedTickers: string[] | undefined;

    if (useFilters) {
      const filterOptions = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'filterByDate',
          message: 'Filter by date range?',
          default: false
        },
        {
          type: 'confirm',
          name: 'filterByTicker',
          message: 'Filter by specific tickers?',
          default: false
        }
      ]);

      if (filterOptions.filterByDate) {
        const dateFilter = await inquirer.prompt([
          {
            type: 'input',
            name: 'startDate',
            message: 'Start date (YYYY-MM-DD):',
            default: minDate,
            validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter date in YYYY-MM-DD format'
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'End date (YYYY-MM-DD):',
            default: maxDate,
            validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please enter date in YYYY-MM-DD format'
          }
        ]);

        dateRange = {
          start: dateFilter.startDate,
          end: dateFilter.endDate
        };
      }

      if (filterOptions.filterByTicker) {
        const { tickerSelection } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'tickerSelection',
            message: 'Select tickers to include:',
            choices: tickers.map(ticker => ({ name: ticker, value: ticker })),
            validate: (choices: string[]) => choices.length > 0 || 'Please select at least one ticker'
          }
        ]);

        selectedTickers = tickerSelection;
      }
    }

    return {
      format,
      includeReports,
      includeMetadata,
      dateRange,
      tickers: selectedTickers
    };
  }

  private filterResults(results: AnalysisResult[], options: ExportOptions): AnalysisResult[] {
    let filtered = [...results];

    if (options.dateRange) {
      filtered = filtered.filter(result => {
        return result.analysisDate >= options.dateRange!.start && 
               result.analysisDate <= options.dateRange!.end;
      });
    }

    if (options.tickers) {
      filtered = filtered.filter(result => options.tickers!.includes(result.ticker));
    }

    return filtered;
  }

  private async performExport(results: AnalysisResult[], options: ExportOptions, exportPath: string): Promise<void> {
    switch (options.format) {
      case 'json':
        await this.exportAsJSON(results, options, exportPath);
        break;
      case 'csv':
        await this.exportAsCSV(results, options, exportPath);
        break;
      case 'markdown':
        await this.exportAsMarkdown(results, options, exportPath);
        break;
      case 'html':
        await this.exportAsHTML(results, options, exportPath);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async exportAsJSON(results: AnalysisResult[], options: ExportOptions, exportPath: string): Promise<void> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalResults: results.length,
        format: 'json',
        options
      },
      results: results.map(result => ({
        ticker: result.ticker,
        analysisDate: result.analysisDate,
        decision: result.decision,
        confidence: result.confidence,
        reasoning: result.reasoning,
        timestamp: result.timestamp,
        ...(options.includeReports && { reports: result.reports }),
        ...(options.includeMetadata && { metadata: result.metadata })
      }))
    };

    writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  }

  private async exportAsCSV(results: AnalysisResult[], options: ExportOptions, exportPath: string): Promise<void> {
    const headers = [
      'Ticker',
      'Analysis Date',
      'Decision',
      'Confidence',
      'Timestamp'
    ];

    if (options.includeMetadata) {
      headers.push('Analysts', 'LLM Provider', 'Research Depth');
    }

    const rows = results.map(result => {
      const row = [
        result.ticker,
        result.analysisDate,
        result.decision,
        result.confidence,
        result.timestamp
      ];

      if (options.includeMetadata) {
        row.push(
          result.metadata.analysts.join(';'),
          result.metadata.llmProvider,
          result.metadata.researchDepth.toString()
        );
      }

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    writeFileSync(exportPath, csvContent);
  }

  private async exportAsMarkdown(results: AnalysisResult[], options: ExportOptions, exportPath: string): Promise<void> {
    const content = [
      '# Trading Agents Analysis Export',
      '',
      `**Export Date:** ${new Date().toISOString()}`,
      `**Total Results:** ${results.length}`,
      '',
      '## Summary',
      '',
      '| Ticker | Date | Decision | Confidence |',
      '|--------|------|----------|------------|'
    ];

    results.forEach(result => {
      content.push(`| ${result.ticker} | ${result.analysisDate} | ${result.decision} | ${result.confidence} |`);
    });

    if (options.includeReports) {
      content.push('', '## Detailed Analysis Results', '');

      results.forEach((result, index) => {
        content.push(`### ${index + 1}. ${result.ticker} - ${result.analysisDate}`, '');
        content.push(`**Decision:** ${result.decision}`);
        content.push(`**Confidence:** ${result.confidence}`);
        content.push(`**Timestamp:** ${result.timestamp}`);
        
        if (options.includeMetadata) {
          content.push(`**Analysts:** ${result.metadata.analysts.join(', ')}`);
          content.push(`**LLM Provider:** ${result.metadata.llmProvider}`);
          content.push(`**Research Depth:** ${result.metadata.researchDepth}`);
        }

        if (result.reasoning.length > 0) {
          content.push('', '**Reasoning:**');
          result.reasoning.forEach(reason => {
            content.push(`- ${reason}`);
          });
        }

        content.push('');
      });
    }

    writeFileSync(exportPath, content.join('\n'));
  }

  private async exportAsHTML(results: AnalysisResult[], options: ExportOptions, exportPath: string): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Agents Analysis Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { margin-bottom: 30px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .result { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .decision { font-weight: bold; color: #2c5aa0; }
        .confidence { color: #666; }
        .reasoning { background: #f9f9f9; padding: 10px; border-left: 4px solid #2c5aa0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trading Agents Analysis Export</h1>
        <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
        <p><strong>Total Results:</strong> ${results.length}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Date</th>
                    <th>Decision</th>
                    <th>Confidence</th>
                    ${options.includeMetadata ? '<th>Analysts</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td>${result.ticker}</td>
                        <td>${result.analysisDate}</td>
                        <td class="decision">${result.decision}</td>
                        <td class="confidence">${result.confidence}</td>
                        ${options.includeMetadata ? `<td>${result.metadata.analysts.join(', ')}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${options.includeReports ? `
    <div class="detailed-results">
        <h2>Detailed Analysis Results</h2>
        ${results.map((result, index) => `
            <div class="result">
                <h3>${index + 1}. ${result.ticker} - ${result.analysisDate}</h3>
                <p><strong>Decision:</strong> <span class="decision">${result.decision}</span></p>
                <p><strong>Confidence:</strong> <span class="confidence">${result.confidence}</span></p>
                <p><strong>Timestamp:</strong> ${result.timestamp}</p>
                ${options.includeMetadata ? `
                    <p><strong>Analysts:</strong> ${result.metadata.analysts.join(', ')}</p>
                    <p><strong>LLM Provider:</strong> ${result.metadata.llmProvider}</p>
                    <p><strong>Research Depth:</strong> ${result.metadata.researchDepth}</p>
                ` : ''}
                ${result.reasoning.length > 0 ? `
                    <div class="reasoning">
                        <h4>Reasoning:</h4>
                        <ul>
                            ${result.reasoning.map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;

    writeFileSync(exportPath, html);
  }
}