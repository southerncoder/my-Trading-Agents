#!/usr/bin/env node

/**
 * Test script to validate Vite migration is complete
 */

console.log('🚀 Testing Vite Migration Completion\n');

const tests = [
  { name: 'Build System', cmd: 'npm run build' },
  { name: 'Type Check', cmd: 'npm run type-check' },
  { name: 'LangGraph Integration', cmd: 'npm run test-langgraph' },
  { name: 'Enhanced Graph', cmd: 'npm run test-enhanced' },
  { name: 'Memory Provider', cmd: 'npm run test-memory' }
];

async function runTest(test) {
  console.log(`📋 Testing ${test.name}...`);
  try {
    const { execSync } = await import('child_process');
    const output = execSync(test.cmd, { 
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe'
    });
    console.log(`✅ ${test.name} - PASSED`);
    return true;
  } catch (error) {
    console.log(`❌ ${test.name} - FAILED`);
    if (error.stdout) console.log(`   stdout: ${error.stdout.slice(0, 200)}...`);
    if (error.stderr) console.log(`   stderr: ${error.stderr.slice(0, 200)}...`);
    return false;
  }
}

async function main() {
  console.log('Running Vite migration validation...\n');
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) passed++;
    console.log('');
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 Vite migration is COMPLETE and SUCCESSFUL!');
    console.log('\n✅ All core systems are working:');
    console.log('   - Build system compiles without errors');
    console.log('   - TypeScript type checking passes');
    console.log('   - LangGraph integration works');
    console.log('   - Enhanced trading graph functions');
    console.log('   - Memory provider connects (with expected 500 on facts)');
    console.log('\n🚀 Ready for production development!');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});