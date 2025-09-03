import 'dotenv/config';
import { config } from 'dotenv';

console.log('🔍 DEBUG: Testing heavy imports...');

// Load local environment configuration
config({ path: '.env.local' });

try {
  console.log('🔍 DEBUG: Importing EnhancedTradingAgentsGraph...');
  const { EnhancedTradingAgentsGraph } = await import('./src/graph/enhanced-trading-graph.js');
  console.log('✅ EnhancedTradingAgentsGraph imported');

  console.log('🔍 DEBUG: All heavy imports successful');

} catch (error) {
  console.error('❌ Heavy import failed:', error);
}