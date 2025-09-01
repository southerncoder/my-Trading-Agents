import 'dotenv/config';
import { config } from 'dotenv';

console.log('🔍 DEBUG: Starting CLI debug...');

// Load local environment configuration
config({ path: '.env.local' });

console.log('🔍 DEBUG: Environment loaded');

try {
  console.log('🔍 DEBUG: Importing Command...');
  const { Command } = await import('commander');
  console.log('✅ Commander imported successfully');

  console.log('🔍 DEBUG: Importing chalk...');
  const chalk = await import('chalk');
  console.log('✅ Chalk imported successfully');

  console.log('🔍 DEBUG: Creating basic CLI...');
  const program = new Command();
  
  program
    .name('tradingagents-debug')
    .description('Debug version')
    .version('1.0.0');

  console.log('✅ Basic CLI created');
  console.log('✅ All imports successful - CLI initialization should work');

} catch (error) {
  console.error('❌ CLI debug failed:', error);
}