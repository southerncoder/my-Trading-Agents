#!/usr/bin/env node

/**
 * Console Logging Replacement Script
 * 
 * Systematically replaces console.log statements with structured logging
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const srcDir = './src';

// Files and directories to process (prioritized)
const priorityFiles = [
  'cli/main.ts',
  'cli/utils.ts',
  'cli/display.ts',
  'agents/base/abstract-agent.ts',
  'graph/langgraph-working.ts',
  'dataflows/interface.ts',
  'utils/error-handler.ts'
];

async function findConsoleStatements(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const consoleLines = [];
    
    lines.forEach((line, index) => {
      if (line.match(/console\.(log|error|warn|info|debug)/)) {
        consoleLines.push({
          lineNumber: index + 1,
          content: line.trim(),
          type: line.match(/console\.(\w+)/)?.[1] || 'unknown'
        });
      }
    });
    
    return consoleLines;
  } catch (error) {
    return [];
  }
}

async function analyzeConsoleUsage() {
  console.log('🔍 Analyzing Console Usage in Trading Agents\n');
  
  const results = {};
  let totalConsoleStatements = 0;
  
  for (const file of priorityFiles) {
    const fullPath = join(srcDir, file);
    const statements = await findConsoleStatements(fullPath);
    
    if (statements.length > 0) {
      results[file] = statements;
      totalConsoleStatements += statements.length;
      
      console.log(`📄 ${file}: ${statements.length} console statements`);
      statements.forEach(stmt => {
        console.log(`   Line ${stmt.lineNumber}: console.${stmt.type}() - ${stmt.content.substring(0, 80)}...`);
      });
      console.log('');
    }
  }
  
  console.log(`📊 Total Console Statements Found: ${totalConsoleStatements}`);
  console.log(`📁 Files with Console Statements: ${Object.keys(results).length}`);
  
  if (totalConsoleStatements > 0) {
    console.log('\n🎯 Priority Replacement Recommendations:');
    console.log('1. CLI files: Use enhanced logger with human-readable format');
    console.log('2. Agent files: Use context-aware logging with agent names');
    console.log('3. Graph files: Use workflow transition and performance logging');
    console.log('4. Dataflow files: Use API call logging with metrics');
    console.log('5. Error handler: Already has structured logging - integrate with enhanced logger');
  }
  
  return results;
}

// Run the analysis
analyzeConsoleUsage()
  .then(results => {
    console.log('\n✅ Console usage analysis completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });