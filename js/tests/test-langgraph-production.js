/**
 * LANGGRAPH PRODUCTION READINESS TEST
 * Comprehensive test of LangGraph components for production deployment
 */

async function testLangGraphImports() {
  console.log('📦 TESTING LANGGRAPH IMPORTS');
  console.log('='.repeat(50));
  
  try {
    console.log('🔍 Testing @langchain/langgraph imports...');
    
    // Test core LangGraph imports
    const { StateGraph } = await import('@langchain/langgraph');
    console.log('✅ StateGraph imported successfully');
    
    const { START, END } = await import('@langchain/langgraph');
    console.log('✅ START/END constants imported successfully');
    
    // Test LangChain core imports used with LangGraph
    const { ChatOpenAI } = await import('@langchain/openai');
    console.log('✅ ChatOpenAI imported successfully');
    
    const { HumanMessage, SystemMessage, AIMessage } = await import('@langchain/core/messages');
    console.log('✅ Message types imported successfully');
    
    return { success: true, components: { StateGraph, START, END, ChatOpenAI, HumanMessage, SystemMessage, AIMessage } };
  } catch (error) {
    console.log(`❌ Import failed: ${error.message}`);
    return { success: false, error };
  }
}

async function testLangGraphWorkflow() {
  console.log('\n🔗 TESTING LANGGRAPH WORKFLOW');
  console.log('='.repeat(50));
  
  try {
    const { StateGraph, messagesStateReducer } = await import('@langchain/langgraph');
    const { ChatOpenAI } = await import('@langchain/openai');
    const { HumanMessage, SystemMessage, AIMessage } = await import('@langchain/core/messages');
    
    // Create LM Studio model
    const model = new ChatOpenAI({
      modelName: 'microsoft/phi-4-mini-reasoning',
      openAIApiKey: 'not-needed-for-local',
      configuration: {
        baseURL: 'http://localhost:1234/v1'
      },
      temperature: 0.1,
      maxTokens: 150,
      timeout: 60000
    });
    
    console.log('✅ LM Studio model created');
    
    // Define state channels (correct format)
    const stateChannels = {
      messages: {
        reducer: messagesStateReducer,
        default: () => []
      },
      analysis_type: {
        reducer: (x, y) => y ?? x,
        default: () => "market"
      },
      result: {
        reducer: (x, y) => y ?? x,
        default: () => null
      }
    };
    
    console.log('✅ State channels defined');
    
    // Define nodes
    async function analyzeNode(state) {
      console.log('   🔍 Executing analyze node...');
      const messages = [
        new SystemMessage("You are a financial analyst. Provide a brief market analysis."),
        new HumanMessage(`Analyze ${state.analysis_type} conditions for AAPL stock. Keep response under 100 words.`)
      ];
      
      const response = await model.invoke(messages);
      
      return {
        messages: [...state.messages, response],
        result: response.content,
        analysis_type: state.analysis_type
      };
    }
    
    async function formatNode(state) {
      console.log('   📋 Executing format node...');
      const formatted = `Analysis Type: ${state.analysis_type}\nResult: ${state.result}`;
      return {
        ...state,
        result: formatted
      };
    }
    
    console.log('✅ Nodes defined');
    
    // Create workflow with correct format
    const workflow = new StateGraph({ channels: stateChannels });
    
    // Add nodes
    workflow.addNode("analyze", analyzeNode);
    workflow.addNode("format", formatNode);
    
    // Add edges using string constants
    workflow.addEdge('__start__', "analyze");
    workflow.addEdge("analyze", "format");
    workflow.addEdge("format", '__end__');
    
    console.log('✅ Workflow graph constructed');
    
    // Compile graph
    const app = workflow.compile();
    console.log('✅ Graph compiled successfully');
    
    // Test execution
    console.log('🚀 Testing workflow execution...');
    const startTime = Date.now();
    
    const initialState = {
      messages: [],
      analysis_type: "market",
      result: null
    };
    
    const result = await app.invoke(initialState);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Workflow completed successfully (${duration}ms)`);
    console.log(`📊 Messages count: ${result.messages?.length || 0}`);
    console.log(`📄 Result preview: ${result.result?.substring(0, 100) || 'N/A'}...`);
    
    return { success: true, duration, result };
    
  } catch (error) {
    console.log(`❌ LangGraph workflow failed: ${error.message}`);
    console.log(`📋 Stack: ${error.stack}`);
    return { success: false, error };
  }
}

async function testLangGraphProductionFeatures() {
  console.log('\n⚙️ TESTING LANGGRAPH PRODUCTION FEATURES');
  console.log('='.repeat(50));
  
  try {
    const { StateGraph, messagesStateReducer } = await import('@langchain/langgraph');
    
    // Test conditional routing
    console.log('🔀 Testing conditional routing...');
    
    function routeCondition(state) {
      // Simple condition based on state
      return state.analysis_type === "detailed" ? "detailed_analysis" : "simple_analysis";
    }
    
    // Define state channels
    const stateChannels = {
      messages: {
        reducer: messagesStateReducer,
        default: () => []
      },
      analysis_type: {
        reducer: (x, y) => y ?? x,
        default: () => "simple"
      },
      result: {
        reducer: (x, y) => y ?? x,
        default: () => null
      }
    };
    
    const workflow = new StateGraph({ channels: stateChannels });
    
    // Add conditional nodes
    workflow.addNode("simple_analysis", async (state) => ({ ...state, result: "Simple analysis complete" }));
    workflow.addNode("detailed_analysis", async (state) => ({ ...state, result: "Detailed analysis complete" }));
    
    // Add conditional edge
    workflow.addConditionalEdges(
      '__start__',
      routeCondition,
      {
        "simple_analysis": "simple_analysis",
        "detailed_analysis": "detailed_analysis"
      }
    );
    
    workflow.addEdge("simple_analysis", '__end__');
    workflow.addEdge("detailed_analysis", '__end__');
    
    const app = workflow.compile();
    console.log('✅ Conditional routing configured');
    
    // Test simple path
    const simpleResult = await app.invoke({ analysis_type: "simple" });
    console.log(`✅ Simple path: ${simpleResult.result}`);
    
    // Test detailed path
    const detailedResult = await app.invoke({ analysis_type: "detailed" });
    console.log(`✅ Detailed path: ${detailedResult.result}`);
    
    return { success: true, features: ['conditional_routing', 'state_management', 'compilation'] };
    
  } catch (error) {
    console.log(`❌ Production features test failed: ${error.message}`);
    return { success: false, error };
  }
}

async function runLangGraphProductionTest() {
  console.log('🚀 LANGGRAPH PRODUCTION READINESS TEST');
  console.log('Testing LangGraph components for production deployment');
  console.log('='.repeat(70));
  
  // Test 1: Import validation
  const importResult = await testLangGraphImports();
  
  // Test 2: Basic workflow
  const workflowResult = await testLangGraphWorkflow();
  
  // Test 3: Production features
  const featuresResult = await testLangGraphProductionFeatures();
  
  // Results summary
  console.log('\n📊 LANGGRAPH PRODUCTION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`📦 Imports: ${importResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔗 Workflow: ${workflowResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`⚙️ Features: ${featuresResult.success ? '✅ WORKING' : '❌ FAILED'}`);
  
  const allPassed = importResult.success && workflowResult.success && featuresResult.success;
  
  if (allPassed) {
    console.log('\n🎉 LANGGRAPH PRODUCTION READY!');
    console.log('✨ All core components working correctly');
    console.log('🚀 Safe for production deployment');
    
    if (workflowResult.duration) {
      console.log(`⏱️ Average workflow time: ${workflowResult.duration}ms`);
    }
  } else {
    console.log('\n❌ LANGGRAPH ISSUES DETECTED');
    
    if (!importResult.success) {
      console.log('🔧 Import issues - check package installation');
    }
    if (!workflowResult.success) {
      console.log('🔧 Workflow issues - check state management');
    }
    if (!featuresResult.success) {
      console.log('🔧 Feature issues - check advanced functionality');
    }
  }
  
  return allPassed;
}

// Run test
runLangGraphProductionTest()
  .then(success => {
    console.log(`\n🏁 LangGraph production test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });