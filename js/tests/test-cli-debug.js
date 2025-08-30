// Quick debug test to see where CLI is hanging
import { config } from 'dotenv';
config({ path: '.env.test' });

console.log('Environment loaded:');
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('LLM_BACKEND_URL:', process.env.LLM_BACKEND_URL);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

console.log('\nTesting CLI imports...');

// Test if we can import the basic CLI components
try {
  console.log('Importing TradingAgentsCLI...');
  const module = await import('./src/cli/main.js');
  console.log('✅ CLI module imported');
  
  console.log('Testing CLI creation...');
  const cli = new module.TradingAgentsCLI();
  console.log('✅ CLI instance created');
  
  console.log('Testing basic display...');
  // Test if display works
  console.log('✅ Basic functionality appears to work');
  
} catch (error) {
  console.error('❌ Error during CLI test:', error);
}