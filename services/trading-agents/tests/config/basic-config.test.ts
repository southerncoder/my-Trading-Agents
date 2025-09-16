import { enhancedConfigLoader } from '../../src/config/enhanced-loader';

try {
  console.log('🧪 Basic Enhanced Configuration Test\n');
  
  // Test basic configuration loading
  const config = enhancedConfigLoader.getConfig();
  console.log('✅ Configuration loaded successfully');
  console.log(`   Default provider: ${config.agents.default.provider}`);
  console.log(`   Default model: ${config.agents.default.model}`);
  
  // Test configuration summary
  const summary = enhancedConfigLoader.getConfigSummary();
  console.log('\n📋 Configuration Summary:');
  console.log(summary);
  
  console.log('\n🎉 Basic test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}