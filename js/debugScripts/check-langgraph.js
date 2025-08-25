// Check LangGraph StateGraph usage
try {
  const { StateGraph, messagesStateReducer } = require('@langchain/langgraph');
  
  console.log('StateGraph:', typeof StateGraph);
  console.log('messagesStateReducer:', typeof messagesStateReducer);
  
  // Try to create a simple StateGraph
  const testChannels = {
    messages: {
      reducer: messagesStateReducer,
      default: () => []
    }
  };
  
  console.log('Attempting to create StateGraph...');
  const graph = new StateGraph({ channels: testChannels });
  console.log('SUCCESS: StateGraph created');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}