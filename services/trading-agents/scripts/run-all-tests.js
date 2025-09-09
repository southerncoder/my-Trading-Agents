/**
 * Comprehensive Test Runner for Trading Agents CLI
 * Executes all test categories in sequence with detailed reporting
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function runTest(testName, testPath) {
    log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    log(`${colors.bold}Running: ${testName}${colors.reset}`, colors.cyan);
    log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    
    try {
        execSync(`vite-node ${testPath}`, { 
            encoding: 'utf8',
            stdio: 'inherit',
            cwd: path.dirname(__dirname)
        });
        log(`✅ ${testName} - PASSED`, colors.green);
        return true;
    } catch (error) {
        log(`❌ ${testName} - FAILED`, colors.red);
        log(`Error: ${error.message}`, colors.red);
        return false;
    }
}

async function main() {
    log(`${colors.bold}${colors.magenta}Trading Agents CLI - Comprehensive Test Suite${colors.reset}`);
    log(`${colors.cyan}Starting test execution...${colors.reset}\n`);
    
    const testSuites = [
        // Core CLI Tests
        {
            category: 'CLI Core',
            tests: [
                { name: 'CLI Integration', path: 'tests/cli/test-cli-integration.js' },
                { name: 'CLI Debug Features', path: 'tests/cli/test-cli-debug.js' },
                { name: 'CLI Simple Operations', path: 'tests/cli/test-cli-simple.js' }
            ]
        },
        
        // Integration Tests
        {
            category: 'System Integration',
            tests: [
                { name: 'Complete System Test', path: 'tests/integration/test-complete-system.js' },
                { name: 'Modern System Test', path: 'tests/integration/test-complete-modern-system.js' },
                { name: 'Final Integration Test', path: 'tests/integration/test-end-to-end-workflow.js' }
            ]
        },
        
        // LangGraph Tests
        {
            category: 'LangGraph Integration',
            tests: [
                { name: 'LangGraph Core Test', path: 'tests/langgraph/test-langgraph.js' }
            ]
        },
        
        // Performance Tests
        {
            category: 'Performance Analysis',
            tests: [
                { name: 'Comprehensive Performance', path: 'tests/performance/test-comprehensive-performance.js' }
            ]
        },
        
        // Modernization Tests
        {
            category: 'Modern Standards',
            tests: [
                { name: 'Modern Standards Compliance', path: 'tests/modernization/test-modern-standards.js' }
            ]
        }
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    const results = [];
    
    for (const suite of testSuites) {
        log(`\n${colors.bold}${colors.yellow}Testing Category: ${suite.category}${colors.reset}`);
        log(`${colors.yellow}${'─'.repeat(40)}${colors.reset}`);
        
        const suiteResults = {
            category: suite.category,
            tests: [],
            passed: 0,
            total: suite.tests.length
        };
        
        for (const test of suite.tests) {
            totalTests++;
            const testPassed = runTest(test.name, test.path);
            
            suiteResults.tests.push({
                name: test.name,
                passed: testPassed
            });
            
            if (testPassed) {
                passedTests++;
                suiteResults.passed++;
            }
        }
        
        results.push(suiteResults);
    }
    
    // Summary Report
    log(`\n${colors.bold}${colors.magenta}${'='.repeat(80)}${colors.reset}`);
    log(`${colors.bold}${colors.magenta}TEST EXECUTION SUMMARY${colors.reset}`);
    log(`${colors.bold}${colors.magenta}${'='.repeat(80)}${colors.reset}`);
    
    for (const suite of results) {
        const passRate = ((suite.passed / suite.total) * 100).toFixed(1);
        const statusColor = suite.passed === suite.total ? colors.green : colors.red;
        
        log(`\n${colors.bold}${suite.category}:${colors.reset} ${statusColor}${suite.passed}/${suite.total} (${passRate}%)${colors.reset}`);
        
        for (const test of suite.tests) {
            const icon = test.passed ? '✅' : '❌';
            const testColor = test.passed ? colors.green : colors.red;
            log(`  ${icon} ${test.name}`, testColor);
        }
    }
    
    const overallPassRate = ((passedTests / totalTests) * 100).toFixed(1);
    const overallColor = passedTests === totalTests ? colors.green : colors.red;
    
    log(`\n${colors.bold}${colors.cyan}OVERALL RESULTS:${colors.reset}`);
    log(`${overallColor}${colors.bold}${passedTests}/${totalTests} tests passed (${overallPassRate}%)${colors.reset}`);
    
    if (passedTests === totalTests) {
        log(`\n🎉 ${colors.bold}${colors.green}All tests passed! System is ready for deployment.${colors.reset}`);
        process.exit(0);
    } else {
        log(`\n⚠️  ${colors.bold}${colors.red}Some tests failed. Please review and fix issues before deployment.${colors.reset}`);
        process.exit(1);
    }
}

// Run main function if this file is executed directly
main().catch(error => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
});

export { runTest, main };