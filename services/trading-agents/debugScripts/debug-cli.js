// Debug the CLI execution to see why no output is shown
console.log('=== CLI DEBUG TEST ===');
console.log('Arguments received:', process.argv);
console.log('Working directory:', process.cwd());
console.log('');

// Test if the CLI main module can be imported
try {
  console.log('Testing CLI imports...');
  
  // Import the main CLI function
  import('./src/cli/main.js').then(async (module) => {
    console.log('✅ CLI module imported successfully');
    console.log('Available exports:', Object.keys(module));
    
    // Try to create the CLI
    if (module.createCLI) {
      console.log('Testing CLI creation...');
      const program = await module.createCLI();
      console.log('✅ CLI created successfully');
      console.log('CLI commands:', program.commands.map(cmd => cmd.name()));
      
      // Test argument parsing
      console.log('\nTesting argument parsing for: analyze MSFT 2025-08-22');
      try {
        // Parse the arguments manually to see what happens
        const testArgs = ['node', 'main.js', 'analyze', 'MSFT', '2025-08-22'];
        console.log('Test arguments:', testArgs);
        
        // This will help us see if there are parsing issues
        program.parse(testArgs);
      } catch (error) {
        console.error('❌ Argument parsing error:', error.message);
      }
    } else {
      console.error('❌ createCLI function not found in exports');
    }
  }).catch(error => {
    console.error('❌ Failed to import CLI module:', error);
    
    // Try importing individual pieces to isolate the issue
    console.log('\nTesting individual imports...');
    
    // Test display system
    try {
      import('./src/cli/display.js').then(displayModule => {
        console.log('✅ Display module imported successfully');
      }).catch(err => {
        console.error('❌ Display module import failed:', err.message);
      });
    } catch (err) {
      console.error('❌ Display module import failed:', err.message);
    }
    
    // Test enhanced graph
    try {
      import('./src/graph/enhanced-trading-graph.js').then(graphModule => {
        console.log('✅ Enhanced graph module imported successfully');
      }).catch(err => {
        console.error('❌ Enhanced graph module import failed:', err.message);
      });
    } catch (err) {
      console.error('❌ Enhanced graph module import failed:', err.message);
    }
  });
  
} catch (error) {
  console.error('❌ Failed to test CLI module:', error);
}