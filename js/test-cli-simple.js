import { createCLI } from './src/cli/main.js';

console.log('Testing CLI initialization...');

try {
  const program = await createCLI();
  console.log('CLI created successfully!');
  console.log('Program commands:', program.commands?.length || 0);
  
  // Test with help
  console.log('Testing help output...');
  program.outputHelp();
  
} catch (error) {
  console.error('CLI creation failed:', error);
}