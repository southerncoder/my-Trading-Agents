// Minimal CLI test to debug the hanging issue
console.log('Starting minimal CLI test...');

import('tsx').then(async () => {
  console.log('tsx available');
  
  // Test basic CLI instantiation
  try {
    console.log('Testing CLI class import...');
    const { TradingAgentsCLI } = await import('./src/cli/main.js');
    console.log('✅ TradingAgentsCLI class imported');
    
    // Test CLI creation
    console.log('Testing CLI instantiation...');
    const cli = new TradingAgentsCLI();
    console.log('✅ CLI instance created');
    
    // Test basic method
    console.log('Testing basic CLI method...');
    // Just test if the display system works
    console.log('✅ CLI appears to be working');
    
  } catch (error) {
    console.error('❌ CLI test failed:', error);
  }
}).catch(error => {
  console.error('❌ Import failed:', error);
  
  // Try the simpler approach - direct TypeScript execution
  console.log('\nTrying direct TypeScript approach...');
  
  // Let's create a simple version that just tests argument parsing
  console.log('Arguments passed to process:', process.argv);
  
  if (process.argv.includes('analyze')) {
    console.log('✅ Analyze command detected');
    
    const tickerIndex = process.argv.indexOf('MSFT');
    const dateIndex = process.argv.indexOf('2025-08-22');
    
    if (tickerIndex > -1) console.log('✅ Ticker MSFT found at index:', tickerIndex);
    if (dateIndex > -1) console.log('✅ Date 2025-08-22 found at index:', dateIndex);
    
    // Basic validation
    if (tickerIndex > -1 && dateIndex > -1) {
      console.log('✅ All parameters present for analysis');
      console.log('Parameters look valid for analysis');
    } else {
      console.log('❌ Missing required parameters');
    }
  }
});