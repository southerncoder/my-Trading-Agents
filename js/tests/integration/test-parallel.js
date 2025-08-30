import { EnhancedTradingAgentsGraph } from './dist/graph/enhanced-trading-graph.js';

async function testParallelExecution() {
    console.log('Testing parallel execution implementation...');
    
    const config = {
        llmProvider: 'lm_studio',
        selectedAnalysts: ['market', 'social', 'news', 'fundamentals'],
        langGraphEnabled: true,
        debug: true
    };
    
    const graph = new EnhancedTradingAgentsGraph({ config });
    await graph.initializeWorkflow();
    
    console.log('Starting timed execution test...');
    const startTime = Date.now();
    
    try {
        const result = await graph.execute('AAPL', '2025-08-24');
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`\n=== PARALLEL EXECUTION TEST RESULTS ===`);
        console.log(`Execution time: ${duration}ms`);
        console.log(`Decision: ${result?.decision}`);
        console.log(`Confidence: ${result?.confidence}`);
        console.log(`=== TEST COMPLETED ===\n`);
        
        return result;
    } catch (error) {
        console.error('Test failed:', error.message);
        throw error;
    }
}

testParallelExecution()
    .then(() => {
        console.log('✅ Parallel execution test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Parallel execution test failed:', error);
        process.exit(1);
    });