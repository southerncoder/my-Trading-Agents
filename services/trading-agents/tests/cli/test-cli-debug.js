#!/usr/bin/env node

/**
 * CLI Debug Test - Simple validation of CLI functionality
 */

console.log('🔍 CLI Debug Test - Step by Step Validation');
console.log('===========================================\n');

async function testCLIImports() {
    console.log('📦 Step 1: Testing CLI Module Imports');
    console.log('------------------------------------');
    
    try {
        // Test basic imports
        const cliModule = await import('./dist/cli/main.js');
        console.log('✅ CLI main module imported successfully');
        
        const availableExports = Object.keys(cliModule);
        console.log(`✅ Available exports: ${availableExports.join(', ')}`);
        
        // Test class instantiation
        const { TradingAgentsCLI } = cliModule;
        if (TradingAgentsCLI) {
            const cli = new TradingAgentsCLI();
            console.log('✅ TradingAgentsCLI instantiated successfully');
            
            // Check if key methods exist
            if (typeof cli.showMainMenu === 'function') {
                console.log('✅ showMainMenu method available');
            } else {
                console.log('❌ showMainMenu method missing');
            }
            
            return true;
        } else {
            console.log('❌ TradingAgentsCLI class not found');
            return false;
        }
    } catch (error) {
        console.log(`❌ CLI import failed: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        return false;
    }
}

async function testDependencyImports() {
    console.log('\n🔗 Step 2: Testing Key Dependency Imports');
    console.log('----------------------------------------');
    
    try {
        // Test core dependencies
        const inquirer = await import('@inquirer/prompts');
        console.log('✅ Inquirer prompts imported successfully');
        
        const chalk = await import('chalk');
        console.log('✅ Chalk imported successfully');
        
        const commander = await import('commander');
        console.log('✅ Commander imported successfully');
        
        // Test custom modules
        const graphModule = await import('./dist/graph/enhanced-trading-graph.js');
        console.log('✅ Enhanced trading graph imported successfully');
        
        const configModule = await import('./dist/config/index.js');
        console.log('✅ Config module imported successfully');
        
        return true;
    } catch (error) {
        console.log(`❌ Dependency import failed: ${error.message}`);
        return false;
    }
}

async function testEnvironmentSetup() {
    console.log('\n🔧 Step 3: Testing Environment Setup');
    console.log('-----------------------------------');
    
    try {
        // Load environment
        const dotenv = await import('dotenv');
        const path = await import('path');
        
        dotenv.config({ path: path.join(process.cwd(), '.env.local') });
        
        // Check critical environment variables
        const criticalVars = [
            'LLM_PROVIDER',
            'LLM_BACKEND_URL', 
            'LM_STUDIO_HOST'
        ];
        
        let allPresent = true;
        for (const varName of criticalVars) {
            const value = process.env[varName];
            if (value) {
                console.log(`✅ ${varName}: ${value}`);
            } else {
                console.log(`❌ ${varName}: Missing`);
                allPresent = false;
            }
        }
        
        return allPresent;
    } catch (error) {
        console.log(`❌ Environment setup failed: ${error.message}`);
        return false;
    }
}

async function testCLIComponents() {
    console.log('\n🧩 Step 4: Testing CLI Components');
    console.log('--------------------------------');
    
    try {
        // Test display system
        const { DisplaySystem } = await import('./dist/cli/display.js');
        const display = new DisplaySystem();
        console.log('✅ DisplaySystem instantiated successfully');
        
        // Test message buffer
        const { MessageBuffer } = await import('./dist/cli/message-buffer.js');
        const buffer = new MessageBuffer();
        console.log('✅ MessageBuffer instantiated successfully');
        
        // Test utils
        const utilsModule = await import('./dist/cli/utils.js');
        console.log(`✅ CLI utils imported (${Object.keys(utilsModule).length} exports)`);
        
        return true;
    } catch (error) {
        console.log(`❌ CLI components test failed: ${error.message}`);
        return false;
    }
}

async function testBasicCLIWorkflow() {
    console.log('\n🚀 Step 5: Testing Basic CLI Workflow');
    console.log('------------------------------------');
    
    try {
        // Import and instantiate CLI
        const { TradingAgentsCLI } = await import('./dist/cli/main.js');
        const cli = new TradingAgentsCLI();
        
        console.log('✅ CLI instantiated for workflow test');
        
        // Test that we can access the CLI's components
        if (cli.display) {
            console.log('✅ CLI display system accessible');
        }
        
        if (cli.messageBuffer) {
            console.log('✅ CLI message buffer accessible');
        }
        
        if (cli.configManager) {
            console.log('✅ CLI config manager accessible');
        }
        
        // Test configuration loading (without full UI)
        const { DEFAULT_CONFIG } = await import('./dist/config/index.js');
        console.log('✅ Default configuration loaded');
        console.log(`   Provider: ${DEFAULT_CONFIG.llmProvider}`);
        console.log(`   Backend URL: ${DEFAULT_CONFIG.backendUrl}`);
        
        // Test that essential config fields exist
        const requiredFields = ['projectDir', 'resultsDir', 'maxDebateRounds'];
        const missingFields = requiredFields.filter(field => DEFAULT_CONFIG[field] === undefined);
        
        if (missingFields.length === 0) {
            console.log('✅ All required configuration fields present');
        } else {
            console.log(`❌ Missing configuration fields: ${missingFields.join(', ')}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Basic CLI workflow test failed: ${error.message}`);
        return false;
    }
}

async function runCLIDebugTest() {
    console.log('🚀 Starting Comprehensive CLI Debug Test\n');
    
    const testSteps = [
        { name: 'CLI Module Imports', test: testCLIImports },
        { name: 'Dependency Imports', test: testDependencyImports },
        { name: 'Environment Setup', test: testEnvironmentSetup },
        { name: 'CLI Components', test: testCLIComponents },
        { name: 'Basic CLI Workflow', test: testBasicCLIWorkflow }
    ];
    
    const results = [];
    
    for (const step of testSteps) {
        try {
            const result = await step.test();
            results.push({ name: step.name, success: result });
        } catch (error) {
            console.log(`❌ ${step.name} crashed: ${error.message}`);
            results.push({ name: step.name, success: false, error: error.message });
        }
    }
    
    // Summary
    console.log('\n🏆 CLI Debug Test Summary');
    console.log('=========================');
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${result.name}`);
        if (result.error) {
            console.log(`      Error: ${result.error}`);
        }
    });
    
    console.log(`\n📊 Result: ${passed}/${total} steps passed`);
    
    if (passed === total) {
        console.log('🎉 CLI Debug Test: ALL COMPONENTS WORKING');
        console.log('✅ CLI is ready for interactive use');
    } else {
        console.log('❌ CLI Debug Test: ISSUES DETECTED');
        console.log('❌ Some components need attention');
    }
    
    return passed === total;
}

runCLIDebugTest().catch(error => {
    console.error('\n💥 CLI debug test crashed:', error);
    process.exit(1);
});