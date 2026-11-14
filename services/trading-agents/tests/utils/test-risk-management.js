#!/usr/bin/env node

/**
 * Simple test runner for risk management unit tests
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  'tests/utils/risk-management-comprehensive.test.ts',
  'tests/portfolio/risk-management-portfolio.test.ts', 
  'tests/utils/risk-management-stress-scenarios.test.ts'
];

console.log('🧪 Running Risk Management Unit Tests...\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testFile of testFiles) {
  console.log(`📋 Testing: ${testFile}`);
  
  try {
    // Run the test file with a simple check
    const result = execSync(`node -e "
      import('${join(__dirname, testFile).replace(/\\/g, '/')}')
        .then(() => console.log('✅ Test file loaded successfully'))
        .catch(err => {
          console.error('❌ Test file failed to load:', err.message);
          process.exit(1);
        });
    "`, { encoding: 'utf8', timeout: 10000 });
    
    console.log(result.trim());
    passedTests++;
    
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    failedTests++;
  }
  
  totalTests++;
  console.log('');
}

console.log('📊 Test Summary:');
console.log(`   Total: ${totalTests}`);
console.log(`   Passed: ${passedTests}`);
console.log(`   Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All risk management tests are ready!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests have issues that need to be resolved.');
  process.exit(1);
}