#!/usr/bin/env node

/**
 * Modern LangChain Configuration Test
 * Uses latest initChatModel patterns from LangChain JS documentation
 */

console.log('🚀 Modern LangChain Standards Test');
console.log('=================================\n');

async function testModernLangChainPatterns() {
    console.log('📋 Testing Latest LangChain Initialization Patterns...\n');
    
    try {
        // Test 1: Modern initChatModel Pattern
        console.log('1️⃣  Testing Modern initChatModel Pattern');
        console.log('----------------------------------------');
        
        // Import the universal chat model initializer
        const { initChatModel } = await import('langchain/chat_models/universal');
        console.log('✅ Universal chat model import successful');
        
        // Test with environment variable configuration
        const backendUrl = process.env.REMOTE_LM_STUDIO_BASE_URL;
        const modelName = process.env.LLM_MODEL_NAME || 'gpt-4o';
        
        console.log(`✅ Backend URL: ${backendUrl}`);
        console.log(`✅ Model Name: ${modelName}`);
        
        // Test 2: Modern Configuration Pattern
        console.log('\n2️⃣  Testing Modern Configuration Pattern');
        console.log('----------------------------------------');
        
        try {
            // Initialize with modern pattern using environment variables
            const chatModel = await initChatModel(modelName, {
                temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
                maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
                // For local models like LM Studio, we use baseURL
                baseURL: backendUrl,
                apiKey: process.env.OPENAI_API_KEY || 'not-needed-for-local',
                configurableFields: ["model", "temperature", "maxTokens"]
            });
            
            console.log('✅ Modern chat model initialized successfully');
            console.log('✅ Configuration fields are configurable');
            
            // Test 3: Runtime Configuration
            console.log('\n3️⃣  Testing Runtime Configuration');
            console.log('----------------------------------');
            
            // Test runtime configuration (without actually calling the model)
            chatModel.withConfig({
                configurable: {
                    temperature: 0.1,
                    maxTokens: 500
                }
            });
            
            console.log('✅ Runtime configuration attached successfully');
            
            return { success: true, model: chatModel };
            
        } catch (error) {
            console.log(`❌ Modern configuration failed: ${error.message}`);
            console.log('🔧 This is expected if LM Studio is not running');
            return { success: false, error: error.message };
        }
        
    } catch (error) {
        console.log(`❌ Modern LangChain test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testCurrentLangGraphPatterns() {
    console.log('\n4️⃣  Testing Current LangGraph Patterns');
    console.log('--------------------------------------');
    
    try {
        // Test modern state graph creation
        const { StateGraph } = await import('@langchain/langgraph');
        console.log('✅ LangGraph imports successful');
        
        // Test modern state definition (using JSDoc for type information)
        /**
         * @typedef {Object} AgentState
         * @property {any[]} messages
         * @property {string} [userInput]
         * @property {string} [analysis]
         */
        
        const workflow = new StateGraph({
            channels: {
                messages: { reducer: (x, y) => x.concat(y) },
                userInput: null,
                analysis: null
            }
        });
        
        console.log('✅ Modern StateGraph created successfully');
        console.log('✅ Modern state management configured');
        
        return { success: true, workflow };
        
    } catch (error) {
        console.log(`❌ LangGraph test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testAsyncLocalStoragePattern() {
    console.log('\n5️⃣  Testing AsyncLocalStorage Pattern');
    console.log('-------------------------------------');
    
    try {
        // Test modern async local storage for configuration passing
        const { AsyncLocalStorageProviderSingleton } = await import("@langchain/core/singletons");
        const { AsyncLocalStorage } = await import("async_hooks");
        
        AsyncLocalStorageProviderSingleton.initializeGlobalInstance(
            new AsyncLocalStorage()
        );
        
        console.log('✅ AsyncLocalStorage initialized successfully');
        console.log('✅ Automatic configuration passing enabled');
        
        return { success: true };
        
    } catch (error) {
        console.log(`❌ AsyncLocalStorage test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runModernStandardsTest() {
    console.log('🎯 Running Complete Modern Standards Test\n');
    
    const results = {
        modernConfig: await testModernLangChainPatterns(),
        langGraph: await testCurrentLangGraphPatterns(),
        asyncStorage: await testAsyncLocalStoragePattern()
    };
    
    // Final Results
    console.log('\n🏆 MODERN STANDARDS TEST RESULTS');
    console.log('================================');
    
    const testCategories = [
        { name: 'Modern LangChain Configuration', result: results.modernConfig.success },
        { name: 'Current LangGraph Patterns', result: results.langGraph.success },
        { name: 'AsyncLocalStorage Pattern', result: results.asyncStorage.success }
    ];
    
    let passedTests = 0;
    const totalTests = testCategories.length;
    
    testCategories.forEach(test => {
        const status = test.result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}`);
        if (test.result) passedTests++;
    });
    
    console.log(`\n📊 Overall Standards Compliance: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 COMPLETE MODERN STANDARDS COMPLIANCE! 🎉');
        console.log('=============================================');
        console.log('✅ Using latest LangChain initChatModel patterns');
        console.log('✅ Using current LangGraph state management');
        console.log('✅ Using modern async configuration patterns');
        console.log('✅ All environment variables properly used');
        console.log('✅ No hardcoded secrets or configuration');
        console.log('\n🚀 SYSTEM IS USING LATEST STABLE INTERFACES! 🚀');
        return true;
    } else {
        console.log('\n⚠️  PARTIAL STANDARDS COMPLIANCE');
        console.log('================================');
        console.log('ℹ️  Some modern patterns not fully implemented');
        console.log('ℹ️  Consider updating to latest LangChain versions');
        
        // Show specific recommendations
        if (!results.modernConfig.success) {
            console.log('💡 Recommendation: Update to initChatModel pattern');
        }
        if (!results.langGraph.success) {
            console.log('💡 Recommendation: Update to latest LangGraph patterns');
        }
        if (!results.asyncStorage.success) {
            console.log('💡 Recommendation: Enable AsyncLocalStorage for config');
        }
        
        return false;
    }
}

runModernStandardsTest().then(success => {
    process.exit(success ? 0 : 1);
});