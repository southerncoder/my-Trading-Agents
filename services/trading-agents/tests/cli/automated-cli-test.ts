/**
 * Automated CLI Test - Non-interactive testing of the full LangGraph workflow
 * 
 * This test script runs the CLI analysis without user interaction by programmatically
 * creating the EnhancedTradingAgentsGraph and executing the analysis.
 * 
 * Environment Configuration:
 * - LOCAL TESTING (this script): Uses .env.local file (auto-synced from root)
 * - DOCKER CONTAINERS: Uses Docker secrets from /run/secrets/ (via secrets/init.js)
 * 
 * Usage:
 *   npx vite-node tests/cli/automated-cli-test.ts
 * 
 * Or add to package.json:
 *   "test:cli-auto": "vite-node tests/cli/automated-cli-test.ts"
 * 
 * Docker Usage:
 *   docker compose up trading-agents  # Secrets loaded automatically
 */

import { config, parse } from 'dotenv';
import chalk from 'chalk';
import { EnhancedTradingAgentsGraph } from '../../src/graph/enhanced-trading-graph';
import { AnalystType } from '../../src/cli/types';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment configuration - services/trading-agents/.env.local is auto-synced from root
// Run .\tools\migrate-secrets.ps1 to sync from root .env.local
const serviceRoot = resolve(__dirname, '..', '..');
const envPath = join(serviceRoot, '.env.local');

// Manual parsing approach to bypass dotenv auto-discovery issues
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const parsed = parse(envContent);
  
  // Manually set environment variables
  for (const key in parsed) {
    if (!process.env[key]) {
      process.env[key] = parsed[key];
    }
  }
  
  console.log(chalk.green(`✓ Loaded ${Object.keys(parsed).length} variables from ${envPath}`));
  
  // Debug: Show what OPENAI_API_KEY value we got
  console.log(chalk.blue(`🔍 Debug - OPENAI_API_KEY in parsed: ${parsed.OPENAI_API_KEY ? 'YES (length: ' + parsed.OPENAI_API_KEY.length + ')' : 'NO'}`));
  console.log(chalk.blue(`🔍 Debug - OPENAI_API_KEY in process.env: ${process.env.OPENAI_API_KEY ? 'YES (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NO'}`));
} else {
  console.error(chalk.red(`❌ Environment file not found: ${envPath}`));
  console.error(chalk.yellow('💡 Run: .\\tools\\migrate-secrets.ps1 to sync from root .env.local'));
  process.exit(1);
}

// Debug: Check if OPENAI_API_KEY loaded
if (!process.env.OPENAI_API_KEY) {
  console.error(chalk.red('❌ OPENAI_API_KEY not found in environment after loading .env.local'));
  console.error(chalk.yellow('💡 Run: .\\tools\\migrate-secrets.ps1 to sync from root .env.local'));
  process.exit(1);
}

/**
 * Load test configuration from file
 */
interface TestConfig {
  ticker: string;
  analysisDate: string;
  analysts: string[];
  researchDepth: number;
  llmProvider: string;
  shallowThinker: string;
  deepThinker: string;
  description?: string;
}

function loadTestConfig(): TestConfig {
  const configPath = join(__dirname, 'test-config.json');
  const configData = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configData) as TestConfig;
  
  // Handle "auto" date - use today's date
  if (config.analysisDate === 'auto') {
    config.analysisDate = new Date().toISOString().split('T')[0]!;
  }
  
  return config;
}

const TEST_CONFIG_RAW = loadTestConfig();

/**
 * Test configuration - modify test-config.json to test different scenarios
 */
const TEST_CONFIG = {
  ticker: TEST_CONFIG_RAW.ticker,
  analysisDate: TEST_CONFIG_RAW.analysisDate,
  analysts: TEST_CONFIG_RAW.analysts.map(a => a as AnalystType),
  researchDepth: TEST_CONFIG_RAW.researchDepth,
  llmProvider: TEST_CONFIG_RAW.llmProvider,
  shallowThinker: TEST_CONFIG_RAW.shallowThinker,
  deepThinker: TEST_CONFIG_RAW.deepThinker
};

/**
 * Run automated CLI test
 */
async function runAutomatedTest(): Promise<void> {
  console.log(chalk.blue('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.blue('       🤖 Automated CLI Test - LangGraph Workflow'));
  console.log(chalk.blue('═══════════════════════════════════════════════════════\n'));

  console.log(chalk.cyan('📋 Test Configuration:'));
  console.log(chalk.gray(`   Ticker: ${TEST_CONFIG.ticker}`));
  console.log(chalk.gray(`   Date: ${TEST_CONFIG.analysisDate}`));
  console.log(chalk.gray(`   Provider: ${TEST_CONFIG.llmProvider}`));
  console.log(chalk.gray(`   Analysts: ${TEST_CONFIG.analysts.join(', ')}`));
  console.log(chalk.gray(`   Quick Model: ${TEST_CONFIG.shallowThinker}`));
  console.log(chalk.gray(`   Deep Model: ${TEST_CONFIG.deepThinker}`));
  console.log('');

  try {
    // Load config.json
    console.log(chalk.cyan('📁 Loading configuration...'));
    const configPath = join(__dirname, '..', '..', 'config.json');
    const configRaw = readFileSync(configPath, 'utf-8');
    const cliConfig = JSON.parse(configRaw);

    // Patch in test configuration
    if (cliConfig.analysis) {
      cliConfig.analysis.defaultTicker = TEST_CONFIG.ticker;
      cliConfig.analysis.defaultAnalysts = TEST_CONFIG.analysts;
      cliConfig.analysis.defaultResearchDepth = TEST_CONFIG.researchDepth;
      if (cliConfig.analysis.models) {
        cliConfig.analysis.models.quickThinking.model = TEST_CONFIG.shallowThinker;
        cliConfig.analysis.models.deepThinking.model = TEST_CONFIG.deepThinker;
      }
    }

    // Add top-level model fields for backward compatibility
    const enhancedConfig = {
      ...cliConfig,
      quickThinkLlm: TEST_CONFIG.shallowThinker,
      deepThinkLlm: TEST_CONFIG.deepThinker,
      llmProvider: TEST_CONFIG.llmProvider
    };

    console.log(chalk.green('✓ Configuration loaded\n'));

    // Create the Enhanced Trading Graph
    console.log(chalk.cyan('🔧 Creating EnhancedTradingAgentsGraph...'));
    console.log(chalk.gray('   Config details:'));
    console.log(chalk.gray(`     - quickThinkLlm: ${enhancedConfig.quickThinkLlm}`));
    console.log(chalk.gray(`     - deepThinkLlm: ${enhancedConfig.deepThinkLlm}`));
    console.log(chalk.gray(`     - llmProvider: ${enhancedConfig.llmProvider}`));
    console.log(chalk.gray(`     - runMode: ${cliConfig.flow?.runMode}`));
    console.log(chalk.gray(`     - enableLangGraph: true`));
    
    const graph = new EnhancedTradingAgentsGraph({
      config: enhancedConfig,
      selectedAnalysts: TEST_CONFIG.analysts,
      enableLangGraph: true
    });
    
    console.log(chalk.green('✓ Graph created successfully\n'));

    // Initialize workflow
    console.log(chalk.cyan('🔄 Initializing LangGraph workflow...'));
    await graph.initializeWorkflow();
    console.log(chalk.green('✓ Workflow initialized\n'));

    // Execute analysis
    console.log(chalk.cyan(`📊 Executing analysis for ${TEST_CONFIG.ticker}...`));
    console.log(chalk.gray('   This may take a few minutes...\n'));
    
    const startTime = Date.now();
    const executionResult = await graph.execute(TEST_CONFIG.ticker, TEST_CONFIG.analysisDate);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!executionResult.success) {
      throw new Error(executionResult.error || 'Analysis execution failed');
    }

    console.log(chalk.green(`✓ Execution completed in ${duration}s\n`));

    // Get simplified analysis result
    console.log(chalk.cyan('🎯 Getting analysis decision...'));
    const analysisResult = await graph.analyzeAndDecide(TEST_CONFIG.ticker, TEST_CONFIG.analysisDate);
    console.log(chalk.green('✓ Analysis complete\n'));

    // Display results
    console.log(chalk.blue('═══════════════════════════════════════════════════════'));
    console.log(chalk.blue('                     📈 Analysis Results'));
    console.log(chalk.blue('═══════════════════════════════════════════════════════\n'));

    console.log(chalk.yellow(`Final Decision: ${analysisResult.decision}`));
    console.log(chalk.yellow(`Confidence: ${analysisResult.confidence}\n`));

    if (analysisResult.reasoning && analysisResult.reasoning.length > 0) {
      console.log(chalk.cyan('Reasoning:'));
      analysisResult.reasoning.forEach((reason: string, index: number) => {
        console.log(chalk.gray(`  ${index + 1}. ${reason}`));
      });
      console.log('');
    }

    // Display detailed state sections
    const fullState = executionResult.result;
    
    if (fullState?.market_report) {
      console.log(chalk.cyan('📊 Market Analysis:'));
      console.log(chalk.gray(typeof fullState.market_report === 'string' 
        ? fullState.market_report.substring(0, 300) + '...'
        : JSON.stringify(fullState.market_report).substring(0, 300) + '...'));
      console.log('');
    }

    if (fullState?.sentiment_report) {
      console.log(chalk.cyan('💬 Sentiment Analysis:'));
      console.log(chalk.gray(typeof fullState.sentiment_report === 'string'
        ? fullState.sentiment_report.substring(0, 300) + '...'
        : JSON.stringify(fullState.sentiment_report).substring(0, 300) + '...'));
      console.log('');
    }

    if (fullState?.news_report) {
      console.log(chalk.cyan('📰 News Analysis:'));
      console.log(chalk.gray(typeof fullState.news_report === 'string'
        ? fullState.news_report.substring(0, 300) + '...'
        : JSON.stringify(fullState.news_report).substring(0, 300) + '...'));
      console.log('');
    }

    if (fullState?.fundamentals_report) {
      console.log(chalk.cyan('📈 Fundamentals Analysis:'));
      console.log(chalk.gray(typeof fullState.fundamentals_report === 'string'
        ? fullState.fundamentals_report.substring(0, 300) + '...'
        : JSON.stringify(fullState.fundamentals_report).substring(0, 300) + '...'));
      console.log('');
    }

    // Test summary
    console.log(chalk.blue('═══════════════════════════════════════════════════════'));
    console.log(chalk.green('✅ Test completed successfully!'));
    console.log(chalk.blue('═══════════════════════════════════════════════════════\n'));

    console.log(chalk.yellow('Next Steps:'));
    console.log(chalk.gray('  1. Review the analysis results above'));
    console.log(chalk.gray('  2. Check logs for any errors or warnings'));
    console.log(chalk.gray('  3. Modify TEST_CONFIG in this file to test different scenarios'));
    console.log(chalk.gray('  4. Run again: npx vite-node tests/cli/automated-cli-test.ts\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed with error:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    
    if (error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    
    console.log(chalk.yellow('\n💡 Debugging Tips:'));
    console.log(chalk.gray('  1. Check that all required environment variables are set in .env.local'));
    console.log(chalk.gray('  2. Verify LM Studio is running and accessible'));
    console.log(chalk.gray('  3. Ensure the specified models are available'));
    console.log(chalk.gray('  4. Check config.json for correct configuration'));
    console.log(chalk.gray('  5. Review error message and stack trace above\n'));
    
    process.exit(1);
  }
}

// Run the test
runAutomatedTest().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
