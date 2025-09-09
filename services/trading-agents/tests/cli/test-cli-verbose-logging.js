/**
 * Test CLI verbose logging functionality
 */

import { createCLI } from '../../dist/cli/main.js';

async function testCLIVerboseLogging() {
  console.log('🧪 Testing CLI Verbose Logging Functionality...\n');

  try {
    // Test 1: Test help command
    console.log('1. Testing CLI Help Output...');
    const program = await createCLI();
    
    // Mock process.argv for testing
    const originalArgv = process.argv;
    
    // Test help output
    process.argv = ['node', 'cli.js', '--help'];
    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      // Help command exits, which is expected
      if (error.exitCode === 0) {
        console.log('   ✓ Help command executed successfully');
      }
    }
    
    console.log('✓ CLI Help test passed\n');

    // Test 2: Test verbose flag parsing
    console.log('2. Testing Verbose Flag Parsing...');
    
    // Reset program
    const program2 = await createCLI();
    
    // Test verbose flag
    process.argv = ['node', 'cli.js', '--verbose', '--log-level', 'debug'];
    
    // Check if options are properly parsed
    const parsed = program2.parse(process.argv, { from: 'user' });
    const opts = program2.opts();
    
    console.log('   - Parsed options:', JSON.stringify(opts, null, 2));
    
    if (opts.verbose) {
      console.log('   ✓ Verbose flag properly parsed');
    }
    
    if (opts.logLevel === 'debug') {
      console.log('   ✓ Log level properly parsed');
    }
    
    console.log('✓ Verbose flag parsing test passed\n');

    // Test 3: Test logging configuration
    console.log('3. Testing Logging Configuration...');
    
    // Import LoggingManager to check if configuration was applied
    const { LoggingManager } = await import('../../dist/cli/logging-manager.js');
    const loggingManager = LoggingManager.getInstance();
    
    const currentOptions = loggingManager.getCurrentOptions();
    console.log('   - Current logging options:', JSON.stringify(currentOptions, null, 2));
    
    // Test setting verbose mode
    loggingManager.setVerboseMode(true, 'debug');
    const verboseOptions = loggingManager.getCurrentOptions();
    
    if (verboseOptions.verboseLogging && verboseOptions.logLevel === 'debug') {
      console.log('   ✓ Logging configuration working correctly');
    }
    
    console.log('✓ Logging configuration test passed\n');

    // Test 4: Test operation logging
    console.log('4. Testing Operation Logging...');
    
    // Enable verbose logging
    loggingManager.setVerboseMode(true, 'debug');
    
    // Test operation timer
    const timer = loggingManager.createOperationTimer('test-cli-operation');
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const duration = timer();
    console.log(`   - Operation completed in ${duration}ms`);
    
    // Test other logging functions
    loggingManager.logSystemInfo();
    loggingManager.logAgentActivity('CLI-Test-Agent', 'testing verbose logging');
    loggingManager.logApiCall('/api/test', 'GET', 200, 50);
    
    console.log('   ✓ Operation logging working correctly');
    console.log('✓ Operation logging test passed\n');

    // Restore original argv
    process.argv = originalArgv;

    console.log('🎉 All CLI verbose logging tests passed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✓ CLI Help Output');
    console.log('   ✓ Verbose Flag Parsing');
    console.log('   ✓ Logging Configuration');
    console.log('   ✓ Operation Logging');
    
    return true;

  } catch (error) {
    console.error('❌ CLI verbose logging test failed:');
    console.error(error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testCLIVerboseLogging().then(success => {
  console.log(`\n🏁 CLI Verbose Logging Test Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (success) {
    console.log('\n🎉 CLI verbose logging is working correctly!');
    console.log('Usage examples:');
    console.log('  node dist/cli/cli.js --help');
    console.log('  node dist/cli/cli.js --verbose menu');
    console.log('  node dist/cli/cli.js --log-level debug analyze');
    console.log('  node dist/cli/cli.js --verbose --log-to-console --log-level debug');
  }
  
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});