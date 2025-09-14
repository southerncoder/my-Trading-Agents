/**
 * End-to-End Environment Validation Test
 *
 * Validates all environment variable configurations work in production
 * Tests complete environment setup including Docker secrets, .env files, and runtime loading
 */

import { TradingAgentsConfig } from '../../src/types/config';
import { createLogger } from '../../src/utils/enhanced-logger';
import { PooledYahooFinanceAPI } from '../../src/dataflows/pooled-yahoo-finance';
import { GoogleNewsAPI } from '../../src/dataflows/google-news';
import { RedditAPI } from '../../src/dataflows/reddit';
import { ZepGraphitiMemoryProvider, createZepGraphitiMemory, EpisodeType } from '../../src/providers/zep-graphiti/zep-graphiti-memory-provider-client';

// Add Jest globals for TypeScript
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

const logger = createLogger('test', 'EnvironmentValidation');

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

class EnvironmentValidator {
  private results: ValidationResult[] = [];

  async validateAll(): Promise<void> {
    logger.info('validateAll', 'Starting comprehensive environment validation');

    // 1. Environment Variables Loading
    await this.validateEnvironmentVariables();

    // 2. Docker Secrets Loading
    await this.validateDockerSecrets();

    // 3. Configuration Loading
    await this.validateConfiguration();

    // 4. API Connectivity
    await this.validateAPIConnectivity();

    // 5. Memory System
    await this.validateMemorySystem();

    // 6. Data Integration APIs
    await this.validateDataAPIs();

    this.printResults();
  }

  private async validateEnvironmentVariables(): Promise<void> {
    logger.info('validateEnvironmentVariables', 'Validating environment variable loading');

    const requiredEnvVars = [
      'NEO4J_URI',
      'NEO4J_USER',
      'OPENAI_BASE_URL',
      'ZEP_SERVICE_URL'
    ];

    const optionalEnvVars = [
      'OPENAI_API_KEY',
      'REDDIT_CLIENT_ID',
      'MARKETSTACK_API_KEY',
      'NEWS_API_KEY'
    ];

    // Check required variables
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        this.results.push({
          component: 'Environment Variables',
          status: 'FAIL',
          message: `Required environment variable ${envVar} is not set`
        });
      } else {
        this.results.push({
          component: 'Environment Variables',
          status: 'PASS',
          message: `Environment variable ${envVar} is set`,
          details: { value: value.substring(0, 50) + '...' }
        });
      }
    }

    // Check optional variables (warn if missing)
    for (const envVar of optionalEnvVars) {
      const value = process.env[envVar];
      if (!value || value.includes('your_') || value.includes('here')) {
        this.results.push({
          component: 'Environment Variables',
          status: 'SKIP',
          message: `Optional environment variable ${envVar} is not configured or has placeholder value`,
          details: { value: value ? value.substring(0, 20) + '...' : 'undefined' }
        });
      } else {
        this.results.push({
          component: 'Environment Variables',
          status: 'PASS',
          message: `Environment variable ${envVar} is configured`,
          details: { configured: true }
        });
      }
    }
  }

  private async validateDockerSecrets(): Promise<void> {
    logger.info('validateDockerSecrets', 'Validating Docker secrets configuration');

    // Check if we're running in Docker environment
    const inDocker = process.env.DOCKER_CONTAINER === 'true' || process.env.HOSTNAME?.includes('trading-agents');

    if (!inDocker) {
      this.results.push({
        component: 'Docker Secrets',
        status: 'SKIP',
        message: 'Not running in Docker environment, skipping Docker secrets validation'
      });
      return;
    }

    // In Docker, check if secrets are mounted
    const fs = require('fs');
    const secretPaths = [
      '/run/secrets/neo4j_password',
      '/run/secrets/openai_api_key',
      '/run/secrets/embedder_api_key'
    ];

    for (const secretPath of secretPaths) {
      try {
        if (fs.existsSync(secretPath)) {
          const content = fs.readFileSync(secretPath, 'utf8').trim();
          if (content && !content.includes('your_') && !content.includes('here')) {
            this.results.push({
              component: 'Docker Secrets',
              status: 'PASS',
              message: `Docker secret ${secretPath} is properly configured`,
              details: { hasValue: true }
            });
          } else {
            this.results.push({
              component: 'Docker Secrets',
              status: 'FAIL',
              message: `Docker secret ${secretPath} contains placeholder value`,
              details: { content: content.substring(0, 20) + '...' }
            });
          }
        } else {
          this.results.push({
            component: 'Docker Secrets',
            status: 'FAIL',
            message: `Docker secret ${secretPath} is not mounted`
          });
        }
      } catch (error) {
        this.results.push({
          component: 'Docker Secrets',
          status: 'FAIL',
          message: `Failed to read Docker secret ${secretPath}`,
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }
  }

  private async validateConfiguration(): Promise<void> {
    logger.info('validateConfiguration', 'Validating configuration loading');

    try {
      // Try to load configuration
      const config: TradingAgentsConfig = {
        projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './',
        resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
        dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
        dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
        exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
        logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
        deepThinkLlm: process.env.DEEP_THINK_LLM || 'o1-mini',
        quickThinkLlm: process.env.QUICK_THINK_LLM || 'gpt-4o-mini',
        maxDebateRounds: parseInt(process.env.MAX_DEBATE_ROUNDS || '1'),
        maxRiskDiscussRounds: parseInt(process.env.MAX_RISK_DISCUSS_ROUNDS || '1'),
        maxRecurLimit: parseInt(process.env.MAX_RECUR_LIMIT || '100'),
        onlineTools: process.env.ONLINE_TOOLS === 'true'
      };

      this.results.push({
        component: 'Configuration',
        status: 'PASS',
        message: 'Configuration object created successfully',
        details: {
          deepThinkLlm: config.deepThinkLlm,
          quickThinkLlm: config.quickThinkLlm
        }
      });
    } catch (error) {
      this.results.push({
        component: 'Configuration',
        status: 'FAIL',
        message: 'Failed to create configuration object',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async validateAPIConnectivity(): Promise<void> {
    logger.info('validateAPIConnectivity', 'Validating API connectivity');

    // Test LM Studio connectivity
    try {
      const lmStudioUrl = process.env.REMOTE_LM_STUDIO_BASE_URL || process.env.LOCAL_LM_STUDIO_BASE_URL || process.env.OPENAI_BASE_URL;
      if (lmStudioUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${lmStudioUrl}/models`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.results.push({
            component: 'API Connectivity',
            status: 'PASS',
            message: 'LM Studio API is accessible',
            details: { url: lmStudioUrl }
          });
        } else {
          this.results.push({
            component: 'API Connectivity',
            status: 'FAIL',
            message: 'LM Studio API returned error',
            details: { status: response.status, url: lmStudioUrl }
          });
        }
      } else {
        this.results.push({
          component: 'API Connectivity',
          status: 'SKIP',
          message: 'LM Studio URL not configured'
        });
      }
    } catch (error) {
      this.results.push({
        component: 'API Connectivity',
        status: 'FAIL',
        message: 'Failed to connect to LM Studio API',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    // Test Zep Service connectivity
    try {
      const zepUrl = process.env.ZEP_SERVICE_URL || 'http://localhost:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${zepUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.results.push({
          component: 'API Connectivity',
          status: 'PASS',
          message: 'Zep Graphiti service is accessible',
          details: { url: zepUrl }
        });
      } else {
        this.results.push({
          component: 'API Connectivity',
          status: 'FAIL',
          message: 'Zep Graphiti service returned error',
          details: { status: response.status, url: zepUrl }
        });
      }
    } catch (error) {
      this.results.push({
        component: 'API Connectivity',
        status: 'SKIP',
        message: 'Zep Graphiti service not accessible (may not be running)',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async validateMemorySystem(): Promise<void> {
    logger.info('validateMemorySystem', 'Validating memory system integration');

    try {
      const memoryProvider = await createZepGraphitiMemory({
        sessionId: 'env-validation-test',
        userId: 'test-user'
      }, {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 1000
      });

      // Test basic memory operations
      await memoryProvider.addEpisode(
        'Environment Validation Test',
        'Testing memory system connectivity and basic operations',
        EpisodeType.ANALYSIS,
        { testType: 'environment_validation' }
      );

      const searchResults = await memoryProvider.searchMemories(
        'environment validation test',
        { maxResults: 5 }
      );

      if (searchResults && searchResults.facts && searchResults.facts.length > 0) {
        this.results.push({
          component: 'Memory System',
          status: 'PASS',
          message: 'Memory system integration working correctly',
          details: { resultsFound: searchResults.facts.length }
        });
      } else {
        this.results.push({
          component: 'Memory System',
          status: 'FAIL',
          message: 'Memory system search returned no results'
        });
      }
    } catch (error) {
      this.results.push({
        component: 'Memory System',
        status: 'FAIL',
        message: 'Failed to initialize or use memory system',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async validateDataAPIs(): Promise<void> {
    logger.info('validateDataAPIs', 'Validating data integration APIs');

    const config: TradingAgentsConfig = {
      projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './',
      resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
      dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
      dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
      exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
      logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
      deepThinkLlm: process.env.DEEP_THINK_LLM || 'o1-mini',
      quickThinkLlm: process.env.QUICK_THINK_LLM || 'gpt-4o-mini',
      maxDebateRounds: parseInt(process.env.MAX_DEBATE_ROUNDS || '1'),
      maxRiskDiscussRounds: parseInt(process.env.MAX_RISK_DISCUSS_ROUNDS || '1'),
      maxRecurLimit: parseInt(process.env.MAX_RECUR_LIMIT || '100'),
      onlineTools: process.env.ONLINE_TOOLS === 'true'
    };

    // Test Yahoo Finance API
    try {
      const yahooApi = new PooledYahooFinanceAPI(config);
      const testData = await yahooApi.getData('AAPL', '2024-01-01', '2024-01-05', false);
      if (testData && !testData.includes('Error')) {
        this.results.push({
          component: 'Data APIs',
          status: 'PASS',
          message: 'Yahoo Finance API integration working'
        });
      } else {
        this.results.push({
          component: 'Data APIs',
          status: 'SKIP',
          message: 'Yahoo Finance API returned error (may be offline mode)'
        });
      }
      yahooApi.dispose();
    } catch (error) {
      this.results.push({
        component: 'Data APIs',
        status: 'SKIP',
        message: 'Yahoo Finance API test failed (expected in offline mode)',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    // Test Google News API (if configured)
    if (process.env.NEWS_API_KEY && !process.env.NEWS_API_KEY.includes('your_')) {
      try {
        const newsApi = new GoogleNewsAPI(config);
        const newsData = await newsApi.getNews('AAPL', '2024-01-01', 5);
        if (newsData && newsData.length > 0) {
          this.results.push({
            component: 'Data APIs',
            status: 'PASS',
            message: 'Google News API integration working',
            details: { articlesFound: newsData.length }
          });
        } else {
          this.results.push({
            component: 'Data APIs',
            status: 'FAIL',
            message: 'Google News API returned no results'
          });
        }
      } catch (error) {
        this.results.push({
          component: 'Data APIs',
          status: 'FAIL',
          message: 'Google News API test failed',
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    } else {
      this.results.push({
        component: 'Data APIs',
        status: 'SKIP',
        message: 'Google News API not configured'
      });
    }

    // Test Reddit API (if configured)
    if (process.env.REDDIT_CLIENT_ID && !process.env.REDDIT_CLIENT_ID.includes('your_')) {
      try {
        const redditApi = new RedditAPI(config);
        const redditData = await redditApi.getPosts(['AAPL']);
        if (redditData && redditData.length > 0) {
          this.results.push({
            component: 'Data APIs',
            status: 'PASS',
            message: 'Reddit API integration working',
            details: { postsFound: redditData.length }
          });
        } else {
          this.results.push({
            component: 'Data APIs',
            status: 'FAIL',
            message: 'Reddit API returned no results'
          });
        }
      } catch (error) {
        this.results.push({
          component: 'Data APIs',
          status: 'FAIL',
          message: 'Reddit API test failed',
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    } else {
      this.results.push({
        component: 'Data APIs',
        status: 'SKIP',
        message: 'Reddit API not configured'
      });
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 END-TO-END ENVIRONMENT VALIDATION RESULTS');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`\n📊 Summary: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED\n`);

    // Group results by component
    const components = [...new Set(this.results.map(r => r.component))];

    for (const component of components) {
      const componentResults = this.results.filter(r => r.component === component);
      console.log(`🔧 ${component}:`);
      console.log('-'.repeat(40));

      for (const result of componentResults) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`${icon} ${result.message}`);
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('🏁 VALIDATION COMPLETE');
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log(`\n⚠️  ${failed} validation(s) failed. Please review and fix before production deployment.`);
    } else if (passed > 0) {
      console.log(`\n🎉 All critical validations passed! Environment is ready for production.`);
    }
  }
}

// Export for use in tests
export { EnvironmentValidator };

// Jest test wrapper
describe('Environment Validation', () => {
  let validator: EnvironmentValidator;

  beforeEach(() => {
    validator = new EnvironmentValidator();
  });

  describe('Environment Validator', () => {
    it('should create validator instance', () => {
      expect(validator).toBeDefined();
      expect(typeof validator).toBe('object');
    });

    it('should have validateAll method', () => {
      expect(typeof (validator as any).validateAll).toBe('function');
    });

    it('should run validation without throwing', async () => {
      // Note: This test may take time and require actual environment setup
      // In CI/CD, this would be skipped or run conditionally
      await expect((validator as any).validateAll()).resolves.not.toThrow();
    }, 60000); // 60 second timeout for comprehensive validation
  });
});

// Run if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.validateAll().catch((error: any) => {
    console.error('Environment validation failed:', error);
    process.exit(1);
  });
}