// Simple CLI test to diagnose issues
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('🔍 Testing CLI Dependencies...');

try {
  console.log('1. Testing basic imports...');
  
  // Test commander
  const { Command } = await import('commander');
  console.log('✅ Commander imported successfully');
  
  // Test chalk
  const chalk = await import('chalk');
  console.log('✅ Chalk imported successfully');
  
  // Test inquirer
  const { select } = await import('@inquirer/prompts');
  console.log('✅ Inquirer prompts imported successfully');
  
  console.log('2. Testing config files...');
  
  // Test default config
  try {
    const { DEFAULT_CONFIG } = await import('../../src/config/index.js');
    console.log('✅ Default config imported successfully');
  } catch (error) {
    console.log('❌ Default config import failed:', error.message);
  }
  
  console.log('3. Testing CLI class...');
  
  // Test CLI main
  try {
    const { TradingAgentsCLI } = await import('../../src/cli/main.js');
    console.log('✅ TradingAgentsCLI class imported successfully');
    
    const cli = new TradingAgentsCLI();
    console.log('✅ TradingAgentsCLI instance created successfully');
  } catch (error) {
    console.log('❌ TradingAgentsCLI import/creation failed:', error.message);
    console.log('Full error:', error);
  }
  
  console.log('4. All dependency tests completed!');
  
} catch (error) {
  console.error('❌ CLI dependency test failed:', error);
  process.exit(1);
}