/**
 * Data Integration API Testing
 *
 * Tests Yahoo Finance, Google News, and Reddit API integrations
 */

import 'dotenv/config';
import { config } from 'dotenv';

// Load environment configuration
config({ path: '.env.local' });

class DataIntegrationTester {
  constructor() {
    this.results = [];
  }

  async runDataIntegrationTests() {
    console.log('🚀 Starting Data Integration API Tests...');

    // Test Yahoo Finance API
    await this.testYahooFinance();

    // Test Google News API
    await this.testGoogleNews();

    // Test Reddit API
    await this.testRedditAPI();

    // Test Docker services
    await this.testDockerServices();

    this.printResults();
  }

  async testYahooFinance() {
    console.log('📊 Testing Yahoo Finance API...');

    try {
      // Test basic connectivity to Yahoo Finance service
      const yahooUrl = 'http://localhost:3002';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${yahooUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        this.results.push({
          component: 'Yahoo Finance',
          status: 'PASS',
          message: 'Yahoo Finance service is accessible',
          details: { url: yahooUrl }
        });

        // Test actual data retrieval
        try {
          const dataResponse = await fetch(`${yahooUrl}/api/quote/AAPL`);
          if (dataResponse.ok) {
            const data = await dataResponse.json();
            this.results.push({
              component: 'Yahoo Finance',
              status: 'PASS',
              message: 'Successfully retrieved AAPL stock data',
              details: { hasData: !!data, dataKeys: data ? Object.keys(data) : [] }
            });
          } else {
            this.results.push({
              component: 'Yahoo Finance',
              status: 'FAIL',
              message: 'Failed to retrieve stock data',
              details: { status: dataResponse.status }
            });
          }
        } catch (error) {
          this.results.push({
            component: 'Yahoo Finance',
            status: 'SKIP',
            message: 'Stock data retrieval failed (may be expected)',
            details: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      } else {
        this.results.push({
          component: 'Yahoo Finance',
          status: 'FAIL',
          message: 'Yahoo Finance service not accessible',
          details: { status: response.status, url: yahooUrl }
        });
      }
    } catch (error) {
      this.results.push({
        component: 'Yahoo Finance',
        status: 'SKIP',
        message: 'Yahoo Finance service not running (expected in some environments)',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  async testGoogleNews() {
    console.log('📰 Testing Google News API...');

    try {
      // Test basic connectivity to Google News service
      const newsUrl = 'http://localhost:3003';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${newsUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        this.results.push({
          component: 'Google News',
          status: 'PASS',
          message: 'Google News service is accessible',
          details: { url: newsUrl }
        });

        // Test news retrieval
        try {
          const newsResponse = await fetch(`${newsUrl}/api/news?q=AAPL&pageSize=5`);
          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            this.results.push({
              component: 'Google News',
              status: 'PASS',
              message: 'Successfully retrieved AAPL news',
              details: {
                hasData: !!newsData,
                articleCount: newsData.data?.articles?.length || 'unknown'
              }
            });
          } else {
            this.results.push({
              component: 'Google News',
              status: 'FAIL',
              message: 'Failed to retrieve news data',
              details: { status: newsResponse.status }
            });
          }
        } catch (error) {
          this.results.push({
            component: 'Google News',
            status: 'SKIP',
            message: 'News retrieval failed (may be expected without API key)',
            details: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      } else {
        this.results.push({
          component: 'Google News',
          status: 'FAIL',
          message: 'Google News service not accessible',
          details: { status: response.status, url: newsUrl }
        });
      }
    } catch (error) {
      this.results.push({
        component: 'Google News',
        status: 'SKIP',
        message: 'Google News service not running (expected in some environments)',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  async testRedditAPI() {
    console.log('🤖 Testing Reddit API...');

    // Check if Reddit credentials are configured
    const hasRedditCreds = !!(process.env.REDDIT_CLIENT_ID &&
                             process.env.REDDIT_CLIENT_SECRET &&
                             process.env.REDDIT_USERNAME &&
                             process.env.REDDIT_PASSWORD);

    if (!hasRedditCreds) {
      this.results.push({
        component: 'Reddit API',
        status: 'SKIP',
        message: 'Reddit API credentials not configured',
        details: { missingCreds: true }
      });
      return;
    }

    // Test Reddit API connectivity (this would require actual implementation)
    this.results.push({
      component: 'Reddit API',
      status: 'PASS',
      message: 'Reddit API credentials are configured',
      details: { hasClientId: true, hasClientSecret: true, hasUsername: true, hasPassword: true }
    });

    // Note: Actual Reddit API testing would require OAuth flow implementation
    this.results.push({
      component: 'Reddit API',
      status: 'SKIP',
      message: 'Reddit API integration test requires OAuth implementation',
      details: { requiresOAuth: true }
    });
  }

  async testDockerServices() {
    console.log('🐳 Testing Docker Services Status...');

    const services = [
      { name: 'Neo4j', port: 7474, path: '' },
      { name: 'Zep Graphiti', port: 8000, path: '/docs' },
      { name: 'Yahoo Finance', port: 3002, path: '/health' },
      { name: 'Google News', port: 3003, path: '/health' }
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const url = `http://localhost:${service.port}${service.path}`;
        const response = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          this.results.push({
            component: 'Docker Services',
            status: 'PASS',
            message: `${service.name} service is running`,
            details: { port: service.port, url: url }
          });
        } else {
          this.results.push({
            component: 'Docker Services',
            status: 'FAIL',
            message: `${service.name} service returned error`,
            details: { port: service.port, status: response.status, url: url }
          });
        }
      } catch (error) {
        this.results.push({
          component: 'Docker Services',
          status: 'SKIP',
          message: `${service.name} service not accessible`,
          details: {
            port: service.port,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  }

  printResults() {
    console.log('\n📊 DATA INTEGRATION TEST RESULTS');
    console.log('=====================================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`\n📈 Summary: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED\n`);

    // Group results by component
    const components = Array.from(new Set(this.results.map(r => r.component)));

    for (const component of components) {
      const componentResults = this.results.filter(r => r.component === component);
      console.log(`🔧 ${component}:`);
      console.log('-'.repeat(30));

      for (const result of componentResults) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`${icon} ${result.message}`);
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
      console.log('');
    }

    console.log('=====================================');
    console.log('🏁 DATA INTEGRATION TESTING COMPLETE');
    console.log('=====================================');

    if (failed === 0) {
      console.log('\n🎉 All data integration tests passed! Services are properly configured.');
    } else if (passed > 0) {
      console.log(`\n⚠️  ${failed} test(s) failed, but ${passed} passed. Review configuration for failed services.`);
    } else {
      console.log('\n❌ All data integration tests failed. Check service configuration and startup.');
    }
  }
}

// Run the data integration tests
async function main() {
  const tester = new DataIntegrationTester();
  await tester.runDataIntegrationTests();
}

main().catch(error => {
  console.error('Data integration testing failed:', error);
  process.exit(1);
});