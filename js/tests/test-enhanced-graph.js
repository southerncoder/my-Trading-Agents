#!/usr/bin/env node

/**
 * Test script for Enhanced Trading Agents Graph
 */

import { EnhancedTradingAgentsGraph } from '../dist/graph/enhanced-trading-graph.js';

async function runTest() {
  try {
    console.log('Testing Enhanced Trading Agents Graph...\n');
    
    const success = await EnhancedTradingAgentsGraph.runIntegrationTest();
    
    if (success) {
      console.log('\n✅ Enhanced Trading Agents Graph is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ Enhanced Trading Agents Graph test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTest();