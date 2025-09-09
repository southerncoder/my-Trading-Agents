/**
 * Simple test script to verify CLI components work correctly
 */

import { TradingAgentsCLI } from '../../src/cli/main.ts';
import { DisplaySystem } from '../../src/cli/display.ts';
import { MessageBuffer } from '../../src/cli/message-buffer.ts';
import { AnalystType } from '../../src/cli/types.ts';

async function testCLIComponents() {
  console.log('🧪 Testing CLI Components...\n');

  try {
    // Test 1: Display System
    console.log('1. Testing Display System...');
    const display = new DisplaySystem();
    
    console.log('   - Testing welcome display...');
    display.displayWelcome();
    
    console.log('   - Testing success message...');
    display.showSuccess('Display system working correctly');
    console.log('✓ Display system test passed\n');

    // Test 2: Message Buffer
    console.log('2. Testing Message Buffer...');
    const messageBuffer = new MessageBuffer();
    messageBuffer.addMessage('Test', 'Test message');
    messageBuffer.addToolCall('test_tool', { param: 'value' });
    messageBuffer.updateAgentStatus('Market Analyst', 'in_progress');
    messageBuffer.updateReportSection('market_report', '# Test Report\nThis is a test.');
    
    const stats = messageBuffer.getStats();
    console.log('Stats:', stats);
    display.showSuccess('Message buffer working correctly');
    console.log('✓ Message buffer test passed\n');

    // Test 3: CLI Configuration
    console.log('3. Testing CLI Configuration...');
    const cli = new TradingAgentsCLI();
    display.showSuccess('CLI instantiation working correctly');
    console.log('✓ CLI configuration test passed\n');

    console.log('🎉 All CLI component tests passed!');
    return true;

  } catch (error) {
    console.error('❌ CLI component test failed:', error);
    return false;
  }
}

// Run the test
testCLIComponents()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });