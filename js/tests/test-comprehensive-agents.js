/**
 * Comprehensive Agent Testing Suite for LM Studio
 * Complete testing workflow for all 12 agents with microsoft/phi-4-mini-reasoning
 */

import { runSetupVerification } from './test-lmstudio-setup.js';
import { runMinimalTest } from './test-minimal-lmstudio.js';
import { runQuickValidation } from './test-quick-agent-validation.js';
import { performance } from 'perf_hooks';

// Test configuration
const TEST_SUITE_CONFIG = {
  company: 'AAPL',
  date: '2025-01-15',
  model: 'microsoft/phi-4-mini-reasoning',
  provider: 'lm_studio',
  baseURL: 'http://localhost:1234/v1'
};

class TestRunner {
  constructor() {
    this.results = {
      setup: null,
      minimal: null,
      validation: null,
      integration: null,
      performance: null
    };
    this.startTime = performance.now();
  }

  async runStep(stepName, testFunction, description) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 STEP: ${stepName.toUpperCase()}`);
    console.log(`📋 ${description}`);
    console.log(`${'='.repeat(60)}`);
    
    const stepStart = performance.now();
    
    try {
      const result = await testFunction();
      const duration = performance.now() - stepStart;
      
      this.results[stepName] = {
        success: result,
        duration: duration,
        error: null
      };
      
      console.log(`\n✅ ${stepName.toUpperCase()} COMPLETED in ${duration.toFixed(0)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - stepStart;
      
      this.results[stepName] = {
        success: false,
        duration: duration,
        error: error.message
      };
      
      console.error(`\n❌ ${stepName.toUpperCase()} FAILED: ${error.message}`);
      return false;
    }
  }

  async runIntegrationTest() {
    console.log('\n🚀 Running comprehensive agent integration test...');
    
    try {
      // Import integration test dynamically
      const { runIntegrationTests } = await import('./test-agent-integration-lmstudio.js');
      return await runIntegrationTests();
    } catch (error) {
      console.error('Integration test failed:', error.message);
      return false;
    }
  }

  async runPerformanceTest() {
    console.log('\n⚡ Running agent performance test...');
    
    try {
      // Import performance test dynamically
      const { runPerformanceTests } = await import('./test-agent-performance-lmstudio.js');
      return await runPerformanceTests();
    } catch (error) {
      console.error('Performance test failed:', error.message);
      return false;
    }
  }

  generateFinalReport() {
    const totalDuration = performance.now() - this.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE AGENT TESTING REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n🔧 Configuration:`);
    console.log(`   Model: ${TEST_SUITE_CONFIG.model}`);
    console.log(`   Provider: ${TEST_SUITE_CONFIG.provider}`);
    console.log(`   URL: ${TEST_SUITE_CONFIG.baseURL}`);
    console.log(`   Test Company: ${TEST_SUITE_CONFIG.company}`);
    console.log(`   Test Date: ${TEST_SUITE_CONFIG.date}`);
    
    console.log(`\n📋 Test Results Summary:`);
    
    const testSteps = [
      { key: 'setup', name: 'LM Studio Setup', critical: true },
      { key: 'minimal', name: 'Minimal Connection', critical: true },
      { key: 'validation', name: 'Agent Validation', critical: true },
      { key: 'integration', name: 'Full Integration', critical: false },
      { key: 'performance', name: 'Performance Suite', critical: false }
    ];
    
    let criticalPassed = 0;
    let criticalTotal = 0;
    let allPassed = 0;
    let allTotal = 0;
    
    for (const step of testSteps) {
      const result = this.results[step.key];
      const status = result?.success ? '✅ PASS' : '❌ FAIL';
      const duration = result?.duration ? `(${result.duration.toFixed(0)}ms)` : '';
      const error = result?.error ? ` - ${result.error}` : '';
      
      console.log(`   ${status} ${step.name} ${duration}${error}`);
      
      allTotal++;
      if (result?.success) allPassed++;
      
      if (step.critical) {
        criticalTotal++;
        if (result?.success) criticalPassed++;
      }
    }
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`   Critical Tests: ${criticalPassed}/${criticalTotal} passed`);
    console.log(`   All Tests: ${allPassed}/${allTotal} passed`);
    console.log(`   Success Rate: ${(allPassed / allTotal * 100).toFixed(1)}%`);
    
    // Determine overall status
    const criticalSuccess = criticalPassed === criticalTotal;
    const allSuccess = allPassed === allTotal;
    
    console.log(`\n🎯 Overall Status:`);
    
    if (allSuccess) {
      console.log('🎉 EXCELLENT! All tests passed perfectly');
      console.log('✨ LM Studio + microsoft/phi-4-mini-reasoning is fully working');
      console.log('🚀 All 12 agents are ready for production use');
    } else if (criticalSuccess) {
      console.log('👍 GOOD! Core functionality is working');
      console.log('✅ LM Studio setup and basic agents are operational');
      console.log('⚠️  Some advanced tests failed - review and fix if needed');
    } else {
      console.log('❌ ISSUES DETECTED! Critical tests failed');
      console.log('🔧 LM Studio setup or basic connectivity needs attention');
      console.log('📋 Review the setup verification results above');
    }
    
    console.log(`\n💡 Next Steps:`);
    
    if (criticalSuccess) {
      console.log('🎯 Ready to use the TradingAgents framework!');
      console.log('📖 Usage examples:');
      console.log('   npm run cli:menu    # Interactive CLI');
      console.log('   npm run cli:analyze # Direct analysis');
      console.log('   tsx src/index.ts    # Direct API usage');
    } else {
      console.log('🔧 Fix critical issues first:');
      console.log('   1. Verify LM Studio is running on port 1234');
      console.log('   2. Ensure microsoft/phi-4-mini-reasoning is loaded');
      console.log('   3. Re-run: npm run test-lmstudio-setup');
    }
    
    console.log('\n' + '='.repeat(80));
    
    return criticalSuccess;
  }
}

async function runComprehensiveTests() {
  console.log('🚀 COMPREHENSIVE TRADING AGENTS TEST SUITE');
  console.log('Testing all 12 agents with LM Studio + microsoft/phi-4-mini-reasoning');
  console.log('=' * 80);
  
  const runner = new TestRunner();
  
  try {
    // Step 1: Setup verification (critical)
    const setupOk = await runner.runStep(
      'setup',
      runSetupVerification,
      'Verify LM Studio is running and model is loaded'
    );
    
    if (!setupOk) {
      console.log('\n⚠️  Setup verification failed - skipping remaining tests');
      console.log('🔧 Please fix LM Studio setup before continuing');
      runner.generateFinalReport();
      return false;
    }
    
    // Step 2: Minimal connection test (critical)
    const minimalOk = await runner.runStep(
      'minimal',
      runMinimalTest,
      'Test basic LangChain + LM Studio connectivity'
    );
    
    if (!minimalOk) {
      console.log('\n⚠️  Basic connectivity failed - skipping agent tests');
      runner.generateFinalReport();
      return false;
    }
    
    // Step 3: Agent validation (critical)
    const validationOk = await runner.runStep(
      'validation',
      runQuickValidation,
      'Validate all 12 agents can instantiate and process basic requests'
    );
    
    // Step 4: Integration test (optional)
    await runner.runStep(
      'integration',
      runner.runIntegrationTest.bind(runner),
      'Comprehensive integration test of all agent workflows'
    );
    
    // Step 5: Performance test (optional)
    await runner.runStep(
      'performance',
      runner.runPerformanceTest.bind(runner),
      'Performance benchmarks and stress testing'
    );
    
    // Generate final report
    const success = runner.generateFinalReport();
    return success;
    
  } catch (error) {
    console.error('\n💥 CRITICAL TEST SUITE FAILURE:', error.message);
    console.error(error.stack);
    runner.generateFinalReport();
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests()
    .then(success => {
      console.log(`\n🏁 Test suite completed with ${success ? 'SUCCESS' : 'ISSUES'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite crashed:', error);
      process.exit(1);
    });
}

export { runComprehensiveTests };