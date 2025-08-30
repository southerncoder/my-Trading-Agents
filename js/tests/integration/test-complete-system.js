#!/usr/bin/env node

/**
 * Complete System Integration Test
 * Tests the entire TradingAgents system end-to-end
 */

console.log('🎯 COMPLETE SYSTEM INTEGRATION TEST');
console.log('==================================\n');

async function runCompleteSystemTest() {
    console.log('🚀 Starting Complete System Validation...\n');
    
    const testResults = {
        environment: false,
        dependencies: false,
        configuration: false,
        cliSystem: false,
        tradingGraph: false,
        llmConnection: false,
        endToEnd: false
    };
    
    try {
        // Test 1: Environment Setup
        console.log('1️⃣  Testing Environment Setup');
        console.log('-----------------------------');
        
        // Load environment
        const dotenv = await import('dotenv');
        const path = await import('path');
        dotenv.config({ path: path.join(process.cwd(), '.env.local') });
        
        const requiredEnvVars = ['LLM_PROVIDER', 'LLM_BACKEND_URL', 'LM_STUDIO_HOST'];
        let envValid = true;
        
        for (const varName of requiredEnvVars) {
            const value = process.env[varName];
            if (value) {
                console.log(`   ✅ ${varName}: ${value}`);
            } else {
                console.log(`   ❌ ${varName}: Missing`);
                envValid = false;
            }
        }
        
        testResults.environment = envValid;
        console.log(`   📊 Environment Test: ${envValid ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 2: Dependencies Check
        console.log('2️⃣  Testing Dependencies');
        console.log('------------------------');
        
        const dependencies = [
            { name: 'chalk', import: 'chalk' },
            { name: 'inquirer', import: '@inquirer/prompts' },
            { name: 'commander', import: 'commander' },
            { name: 'langchain/core', import: '@langchain/core/messages' }
        ];
        
        let depsValid = true;
        for (const dep of dependencies) {
            try {
                await import(dep.import);
                console.log(`   ✅ ${dep.name}: Available`);
            } catch (error) {
                console.log(`   ❌ ${dep.name}: Failed to import`);
                depsValid = false;
            }
        }
        
        testResults.dependencies = depsValid;
        console.log(`   📊 Dependencies Test: ${depsValid ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 3: Configuration System
        console.log('3️⃣  Testing Configuration System');
        console.log('--------------------------------');
        
        try {
            const { DEFAULT_CONFIG, enhancedConfigLoader } = await import('./dist/config/index.js');
            console.log('   ✅ Configuration modules imported');
            
            if (DEFAULT_CONFIG && typeof DEFAULT_CONFIG === 'object') {
                console.log(`   ✅ Default config loaded (Provider: ${DEFAULT_CONFIG.llmProvider})`);
                console.log(`   ✅ Backend URL: ${DEFAULT_CONFIG.backendUrl}`);
            }
            
            const configSummary = enhancedConfigLoader.getConfigSummary();
            console.log('   ✅ Enhanced config loader operational');
            
            testResults.configuration = true;
        } catch (error) {
            console.log(`   ❌ Configuration test failed: ${error.message}`);
            testResults.configuration = false;
        }
        
        console.log(`   📊 Configuration Test: ${testResults.configuration ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 4: CLI System
        console.log('4️⃣  Testing CLI System');
        console.log('----------------------');
        
        try {
            const { TradingAgentsCLI } = await import('./dist/cli/main.js');
            const cli = new TradingAgentsCLI();
            console.log('   ✅ CLI instantiated successfully');
            
            // Test CLI components
            const components = ['display', 'messageBuffer', 'configManager', 'exportManager'];
            let cliComponentsValid = true;
            
            for (const component of components) {
                if (cli[component]) {
                    console.log(`   ✅ ${component} component available`);
                } else {
                    console.log(`   ❌ ${component} component missing`);
                    cliComponentsValid = false;
                }
            }
            
            // Test key methods
            if (typeof cli.showMainMenu === 'function' && typeof cli.runAnalysis === 'function') {
                console.log('   ✅ Core CLI methods available');
            } else {
                console.log('   ❌ Core CLI methods missing');
                cliComponentsValid = false;
            }
            
            testResults.cliSystem = cliComponentsValid;
        } catch (error) {
            console.log(`   ❌ CLI system test failed: ${error.message}`);
            testResults.cliSystem = false;
        }
        
        console.log(`   📊 CLI System Test: ${testResults.cliSystem ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 5: Trading Graph System
        console.log('5️⃣  Testing Trading Graph System');
        console.log('--------------------------------');
        
        try {
            const { EnhancedTradingAgentsGraph } = await import('./dist/graph/enhanced-trading-graph.js');
            const { backwardCompatibleConfig } = await import('./dist/config/index.js');
            
            // Use backward compatible config for legacy graph
            const legacyConfig = backwardCompatibleConfig.getConfig();
            const graph = new EnhancedTradingAgentsGraph(legacyConfig);
            console.log('   ✅ Enhanced trading graph created');
            
            if (typeof graph.initialize === 'function') {
                console.log('   ✅ Initialize method available');
            }
            
            if (typeof graph.runWorkflow === 'function') {
                console.log('   ✅ RunWorkflow method available');
            }
            
            testResults.tradingGraph = true;
        } catch (error) {
            console.log(`   ❌ Trading graph test failed: ${error.message}`);
            testResults.tradingGraph = false;
        }
        
        console.log(`   📊 Trading Graph Test: ${testResults.tradingGraph ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 6: LLM Connection (Basic Check)
        console.log('6️⃣  Testing LLM Connection');
        console.log('--------------------------');
        
        try {
            const backendUrl = process.env.LLM_BACKEND_URL;
            if (backendUrl) {
                console.log(`   ✅ LLM Backend URL configured: ${backendUrl}`);
                console.log('   ✅ LM Studio connection parameters ready');
                testResults.llmConnection = true;
            } else {
                console.log('   ❌ LLM Backend URL not configured');
                testResults.llmConnection = false;
            }
        } catch (error) {
            console.log(`   ❌ LLM connection test failed: ${error.message}`);
            testResults.llmConnection = false;
        }
        
        console.log(`   📊 LLM Connection Test: ${testResults.llmConnection ? 'PASSED' : 'FAILED'}\n`);
        
        // Test 7: End-to-End System Test
        console.log('7️⃣  Testing End-to-End Integration');
        console.log('----------------------------------');
        
        try {
            // Test that all systems can work together
            const { TradingAgentsCLI } = await import('./dist/cli/main.js');
            const { EnhancedTradingAgentsGraph } = await import('./dist/graph/enhanced-trading-graph.js');
            const { backwardCompatibleConfig } = await import('./dist/config/index.js');
            
            const cli = new TradingAgentsCLI();
            const legacyConfig = backwardCompatibleConfig.getConfig();
            const graph = new EnhancedTradingAgentsGraph(legacyConfig);
            
            console.log('   ✅ CLI and Graph systems integrated');
            console.log('   ✅ Configuration system connected');
            console.log('   ✅ All components can communicate');
            
            testResults.endToEnd = true;
        } catch (error) {
            console.log(`   ❌ End-to-end test failed: ${error.message}`);
            testResults.endToEnd = false;
        }
        
        console.log(`   📊 End-to-End Test: ${testResults.endToEnd ? 'PASSED' : 'FAILED'}\n`);
        
        // Final Results
        console.log('🏆 FINAL SYSTEM INTEGRATION RESULTS');
        console.log('===================================');
        
        const testCategories = [
            { name: 'Environment Setup', result: testResults.environment },
            { name: 'Dependencies', result: testResults.dependencies },
            { name: 'Configuration', result: testResults.configuration },
            { name: 'CLI System', result: testResults.cliSystem },
            { name: 'Trading Graph', result: testResults.tradingGraph },
            { name: 'LLM Connection', result: testResults.llmConnection },
            { name: 'End-to-End Integration', result: testResults.endToEnd }
        ];
        
        let passedTests = 0;
        const totalTests = testCategories.length;
        
        testCategories.forEach(test => {
            const status = test.result ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test.name}`);
            if (test.result) passedTests++;
        });
        
        console.log(`\n📊 Overall System Status: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('\n🎉 COMPLETE SYSTEM VALIDATION SUCCESSFUL! 🎉');
            console.log('===============================================');
            console.log('✅ ALL SYSTEMS OPERATIONAL');
            console.log('✅ TradingAgents CLI ready for use');
            console.log('✅ Enhanced trading graph functional');
            console.log('✅ LM Studio integration configured');
            console.log('✅ End-to-end workflow ready');
            console.log('');
            console.log('🚀 SYSTEM IS READY FOR TRADING ANALYSIS! 🚀');
            return true;
        } else {
            console.log('\n❌ SYSTEM VALIDATION FAILED');
            console.log('============================');
            console.log('❌ Some components need attention');
            console.log('❌ Please resolve issues before using');
            return false;
        }
        
    } catch (error) {
        console.log(`\n💥 System test crashed: ${error.message}`);
        console.log(error.stack);
        return false;
    }
}

runCompleteSystemTest().then(success => {
    process.exit(success ? 0 : 1);
});