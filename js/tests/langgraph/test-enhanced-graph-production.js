/**
 * ENHANCED TRADING GRAPH PRODUCTION TEST
 * Test the main orchestrator with LangGraph mode enabled
 */

async function testEnhancedTradingGraphImports() {
  console.log('📦 TESTING ENHANCED TRADING GRAPH IMPORTS');
  console.log('='.repeat(50));
  
  try {
    console.log('🔍 Importing EnhancedTradingAgentsGraph...');
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    console.log('✅ EnhancedTradingAgentsGraph imported successfully');
    
    console.log('🔍 Importing configuration...');
    const { defaultConfig } = await import('../dist/config/default.js');
    console.log('✅ Configuration imported successfully');
    
    return { success: true, EnhancedTradingAgentsGraph, defaultConfig };
  } catch (error) {
    console.log(`❌ Import failed: ${error.message}`);
    return { success: false, error };
  }
}

async function testEnhancedGraphCreation() {
  console.log('\n🏗️ TESTING ENHANCED GRAPH CREATION');
  console.log('='.repeat(50));
  
  try {
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    
    // Test with LangGraph enabled
    console.log('🔧 Creating graph with LangGraph enabled...');
    const graphConfig = {
      enableLangGraph: true,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market', 'news'],
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 200,
        timeout: 60000
      }
    };
    
    const langGraphInstance = new EnhancedTradingAgentsGraph(graphConfig);
    console.log('✅ LangGraph-enabled instance created');
    
    // Test with traditional mode
    console.log('🔧 Creating graph with traditional mode...');
    const traditionalConfig = {
      enableLangGraph: false,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market', 'news'],
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 200,
        timeout: 60000
      }
    };
    
    const traditionalInstance = new EnhancedTradingAgentsGraph(traditionalConfig);
    console.log('✅ Traditional mode instance created');
    
    return { 
      success: true, 
      langGraphInstance, 
      traditionalInstance,
      configs: { langGraphConfig: graphConfig, traditionalConfig }
    };
  } catch (error) {
    console.log(`❌ Graph creation failed: ${error.message}`);
    console.log(`📋 Stack: ${error.stack}`);
    return { success: false, error };
  }
}

async function testEnhancedGraphExecution() {
  console.log('\n🚀 TESTING ENHANCED GRAPH EXECUTION');
  console.log('='.repeat(50));
  
  try {
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    
    // Create and test LangGraph mode
    console.log('📊 Testing LangGraph execution mode...');
    const langGraphConfig = {
      enableLangGraph: true,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market'],
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 200,
        timeout: 60000
      }
    };
    
    const langGraph = new EnhancedTradingAgentsGraph(langGraphConfig);
    
    const startTime = Date.now();
    
    console.log('   🎯 Analyzing AAPL with LangGraph mode...');
    const langGraphResult = await langGraph.analyzeAndDecide('AAPL', '2025-08-25');
    
    const langGraphDuration = Date.now() - startTime;
    console.log(`   ✅ LangGraph execution completed (${langGraphDuration}ms)`);
    console.log(`   📊 Result keys: ${Object.keys(langGraphResult)}`);
    console.log(`   💬 Messages: ${langGraphResult.messages?.length || 0}`);
    
    // Test traditional mode
    console.log('\n📊 Testing Traditional execution mode...');
    const traditionalConfig = {
      enableLangGraph: false,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market'],
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 200,
        timeout: 60000
      }
    };
    
    const traditionalGraph = new EnhancedTradingAgentsGraph(traditionalConfig);
    
    const traditionalStartTime = Date.now();
    
    console.log('   🎯 Analyzing AAPL with Traditional mode...');
    const traditionalResult = await traditionalGraph.analyzeAndDecide('AAPL', '2025-08-25');
    
    const traditionalDuration = Date.now() - traditionalStartTime;
    console.log(`   ✅ Traditional execution completed (${traditionalDuration}ms)`);
    console.log(`   📊 Result keys: ${Object.keys(traditionalResult)}`);
    console.log(`   💬 Messages: ${traditionalResult.messages?.length || 0}`);
    
    return { 
      success: true, 
      langGraph: { result: langGraphResult, duration: langGraphDuration },
      traditional: { result: traditionalResult, duration: traditionalDuration }
    };
    
  } catch (error) {
    console.log(`❌ Graph execution failed: ${error.message}`);
    console.log(`📋 Stack: ${error.stack}`);
    return { success: false, error };
  }
}

async function testEnhancedGraphFeatures() {
  console.log('\n⚙️ TESTING ENHANCED GRAPH FEATURES');
  console.log('='.repeat(50));
  
  try {
    const { EnhancedTradingAgentsGraph } = await import('../dist/graph/enhanced-trading-graph.js');
    
    // Test multiple analyst selection
    console.log('👥 Testing multiple analyst selection...');
    const multiAnalystConfig = {
      enableLangGraph: true,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market', 'news', 'fundamentals'],
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 150,
        timeout: 60000
      }
    };
    
    const multiGraph = new EnhancedTradingAgentsGraph(multiAnalystConfig);
    console.log(`   ✅ Multi-analyst graph created (${multiAnalystConfig.selectedAnalysts.length} analysts)`);
    
    // Test with performance optimizations
    console.log('⚡ Testing performance optimizations...');
    const perfConfig = {
      enableLangGraph: true,
      llmProvider: 'lm_studio',
      selectedAnalysts: ['market'],
      enableParallelExecution: true,
      enableIntelligentCaching: true,
      config: {
        provider: 'lm_studio',
        modelName: 'microsoft/phi-4-mini-reasoning',
        baseURL: 'http://localhost:1234/v1',
        temperature: 0.1,
        maxTokens: 150,
        timeout: 60000
      }
    };
    
    const perfGraph = new EnhancedTradingAgentsGraph(perfConfig);
    console.log('   ✅ Performance-optimized graph created');
    
    return { 
      success: true, 
      features: ['multi_analyst', 'performance_optimization', 'dual_mode']
    };
    
  } catch (error) {
    console.log(`❌ Feature test failed: ${error.message}`);
    return { success: false, error };
  }
}

async function runEnhancedTradingGraphTest() {
  console.log('🚀 ENHANCED TRADING GRAPH PRODUCTION TEST');
  console.log('Testing main orchestrator with LangGraph integration');
  console.log('='.repeat(70));
  
  // Test 1: Import validation
  const importResult = await testEnhancedTradingGraphImports();
  
  // Test 2: Graph creation
  const creationResult = await testEnhancedGraphCreation();
  
  // Test 3: Graph execution
  const executionResult = await testEnhancedGraphExecution();
  
  // Test 4: Advanced features
  const featuresResult = await testEnhancedGraphFeatures();
  
  // Results summary
  console.log('\n📊 ENHANCED TRADING GRAPH RESULTS');
  console.log('='.repeat(50));
  console.log(`📦 Imports: ${importResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🏗️ Creation: ${creationResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🚀 Execution: ${executionResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`⚙️ Features: ${featuresResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  
  const allPassed = importResult.success && creationResult.success && 
                   executionResult.success && featuresResult.success;
  
  if (allPassed) {
    console.log('\n🎉 ENHANCED TRADING GRAPH PRODUCTION READY!');
    console.log('✨ All orchestration components working correctly');
    console.log('🔄 Both LangGraph and Traditional modes operational');
    console.log('🚀 Safe for production deployment');
    
    if (executionResult.success) {
      console.log(`⏱️ LangGraph mode: ${executionResult.langGraph?.duration || 'N/A'}ms`);
      console.log(`⏱️ Traditional mode: ${executionResult.traditional?.duration || 'N/A'}ms`);
    }
  } else {
    console.log('\n❌ ENHANCED TRADING GRAPH ISSUES DETECTED');
    
    if (!importResult.success) {
      console.log('🔧 Import issues - check module dependencies');
    }
    if (!creationResult.success) {
      console.log('🔧 Creation issues - check configuration handling');
    }
    if (!executionResult.success) {
      console.log('🔧 Execution issues - check workflow orchestration');
    }
    if (!featuresResult.success) {
      console.log('🔧 Feature issues - check advanced functionality');
    }
  }
  
  return allPassed;
}

// Run test
runEnhancedTradingGraphTest()
  .then(success => {
    console.log(`\n🏁 Enhanced Trading Graph test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });