// Wrapped CLI runner with error handling
import { createCLI } from './dist/cli/main.js';

console.log('🚀 Starting CLI with error handling...');

try {
  const program = await createCLI();
  
  // Add error handler
  program.exitOverride((err) => {
    console.log('CLI exit called:', err.code, err.message);
    if (err.code === 'commander.help') {
      console.log('Help was displayed');
    }
    process.exit(0);
  });
  
  console.log('✅ CLI program created successfully');
  console.log('📋 Available commands:', program.commands.map(cmd => cmd.name()));
  
  // Run with no args to show main menu
  if (process.argv.length === 2) {
    console.log('🎯 Running default action (main menu)...');
    process.argv.push('menu'); // Force menu command
  }
  
  console.log('🎯 Parsing argv:', process.argv);
  await program.parseAsync(process.argv);
  
} catch (error) {
  console.error('❌ CLI Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}