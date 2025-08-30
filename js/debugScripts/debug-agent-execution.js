// Debug the actual agent execution - focus on where it hangs
console.log('=== DEBUGGING AGENT EXECUTION ===');
console.log('Testing EnhancedTradingAgentsGraph directly...');

async function debugAgentExecution() {
  try {
    console.log('1. Testing imports...');
    
    // Import the enhanced graph
    const { EnhancedTradingAgentsGraph } = await import('./src/graph/enhanced-trading-graph.js');
    console.log('✅ EnhancedTradingAgentsGraph imported successfully');
    
    // Import config
    const { DEFAULT_CONFIG } = await import('./src/config/default.js');
    console.log('✅ DEFAULT_CONFIG imported successfully');
    
    console.log('2. Creating graph instance...');
    const graph = new EnhancedTradingAgentsGraph(DEFAULT_CONFIG);
    console.log('✅ Graph instance created');
    
    console.log('3. Testing initialization...');
    await graph.initializeWorkflow();
    console.log('✅ Workflow initialized');
    
    console.log('4. Testing execute method with MSFT 2025-08-22...');
    console.log('This is where we expect the hang to occur...');
    
    // Set a timeout to catch hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execute method timed out after 30 seconds')), 30000);
    });
    
    const executePromise = graph.execute('MSFT', '2025-08-22');
    
    try {
      const result = await Promise.race([executePromise, timeoutPromise]);
      console.log('✅ Execute completed successfully!');
      console.log('Result keys:', Object.keys(result));
      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }
    } catch (timeoutError) {
      console.log('❌ Execute method timed out - this is likely where the hang occurs');
      console.log('Error:', timeoutError.message);
      
      // Let's check what might be causing the timeout
      console.log('\n5. Investigating potential causes...');
      console.log('- API key configuration');
      console.log('- Network connectivity');
      console.log('- LLM provider setup');
      console.log('- Environment variables');
      
      // Check environment variables
      console.log('\nEnvironment check:');
      console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'NOT SET');
      console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER || 'Not set (will use default)');
      console.log('LLM_BACKEND_URL:', process.env.LLM_BACKEND_URL || 'Not set (will use default)');
    }
    
  } catch (error) {
    console.error('❌ Failed to test agent execution:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugAgentExecution().then(() => {
  console.log('\n=== DEBUG COMPLETED ===');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Debug failed:', error);
  process.exit(1);
});