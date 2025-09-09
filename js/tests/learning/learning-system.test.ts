/**
 * Learning System Test Runner
 *
 * Runs all learning engine tests in sequence
 */

async function runAllLearningTests() {
  console.log('🚀 Starting Learning System Test Suite...\n');

  const results: {
    supervised: any;
    unsupervised: any;
    reinforcement: any;
    overall: boolean;
  } = {
    supervised: null,
    unsupervised: null,
    reinforcement: null,
    overall: false
  };

  try {
    // Test Supervised Learning Engine
    console.log('=' .repeat(60));
    console.log('🧠 SUPERVISED LEARNING ENGINE TESTS');
    console.log('=' .repeat(60));

    const { supervisedLearningEngineTests } = await import('./supervised-engine.test.ts');
    results.supervised = await supervisedLearningEngineTests();

    // Test Unsupervised Learning Engine
    console.log('\n' + '=' .repeat(60));
    console.log('🔍 UNSUPERVISED LEARNING ENGINE TESTS');
    console.log('=' .repeat(60));

    const { unsupervisedLearningEngineTests } = await import('./unsupervised-engine.test.ts');
    results.unsupervised = await unsupervisedLearningEngineTests();

    // Test Reinforcement Learning Engine
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 REINFORCEMENT LEARNING ENGINE TESTS');
    console.log('=' .repeat(60));

    const { reinforcementLearningEngineTests } = await import('./reinforcement-engine.test.ts');
    results.reinforcement = await reinforcementLearningEngineTests();

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('=' .repeat(60));

    const allPassed = results.supervised?.success && results.unsupervised?.success && results.reinforcement?.success;
    results.overall = allPassed;

    console.log(`Supervised Engine: ${results.supervised?.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Unsupervised Engine: ${results.unsupervised?.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Reinforcement Engine: ${results.reinforcement?.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);

    if (!allPassed) {
      console.log('\n❌ Failed Tests:');
      if (!results.supervised?.success) console.log(`  - Supervised: ${results.supervised?.error}`);
      if (!results.unsupervised?.success) console.log(`  - Unsupervised: ${results.unsupervised?.error}`);
      if (!results.reinforcement?.success) console.log(`  - Reinforcement: ${results.reinforcement?.error}`);
    }

    return results;

  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    return {
      ...results,
      overall: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use in other files
export { runAllLearningTests };

// Run tests if this file is executed directly (skip in Jest environment)
if (typeof require !== 'undefined' && require.main === module) {
  runAllLearningTests().then((results) => {
    if (results.overall) {
      console.log('\n✅ Learning System Test Suite completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Learning System Test Suite failed!');
      process.exit(1);
    }
  });
}