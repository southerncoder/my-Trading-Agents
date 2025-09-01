/**
 * Test LangGraph Integration
 */

import { LangGraphSetup } from '../../src/graph/langgraph-working';

async function testLangGraphIntegration() {
  console.log('🚀 Starting LangGraph Integration Test...\n');
  
  try {
    // Run the integration test
    const success = await LangGraphSetup.testIntegration();
    
    if (success) {
      console.log('\n🎉 All tests passed! LangGraph integration is working.');
    } else {
      console.log('\n❌ Some tests failed. Check the output above.');
    }
    
    return success;
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    return false;
  }
}

// Run the test
testLangGraphIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });