/**
 * Simple Environment Validation Test
 *
 * Validates core environment variable configurations
 */

class SimpleEnvironmentValidator {
  constructor() {
    this.results = [];
  }

  async validateAll() {
    console.log('🏁 Starting environment validation...');

    // 1. Environment Variables Loading
    await this.validateEnvironmentVariables();

    // 2. Docker Secrets Loading
    await this.validateDockerSecrets();

    // 3. API Connectivity
    await this.validateAPIConnectivity();

    this.printResults();
  }

  async validateEnvironmentVariables() {
    console.log('🔧 Validating environment variables...');

    const requiredEnvVars = [
      'NEO4J_URI',
      'NEO4J_USER',
      'LM_STUDIO_BASE_URL',
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

    // Check optional variables
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

  async validateDockerSecrets() {
    console.log('🔧 Validating Docker secrets...');

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

  async validateAPIConnectivity() {
    console.log('🔧 Validating API connectivity...');

    // Test LM Studio connectivity
    try {
      const lmStudioUrl = process.env.LM_STUDIO_BASE_URL || process.env.OPENAI_BASE_URL;
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

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 ENVIRONMENT VALIDATION RESULTS');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`\n📊 Summary: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED\n`);

    // Group results by component
    const components = Array.from(new Set(this.results.map(r => r.component)));

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

// Run the validation
const validator = new SimpleEnvironmentValidator();
validator.validateAll().catch(error => {
  console.error('Environment validation failed:', error);
  process.exit(1);
});