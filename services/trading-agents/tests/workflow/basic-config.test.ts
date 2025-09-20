// Core config test (moved from tests/config/basic-config.test.ts)
import { enhancedConfigLoader } from '../../src/config/enhanced-loader';
(async () => {
  try {
    console.log('🧪 Basic Enhanced Configuration Test');
    const config = enhancedConfigLoader.getConfig();
    console.log('✅ Configuration loaded');
    console.log(`   Default provider: ${config.agents.default.provider}`);
    console.log(`   Default model: ${config.agents.default.model}`);
    console.log('\n📋 Summary');
    console.log(enhancedConfigLoader.getConfigSummary());
    console.log('\n🎉 Basic Config Test Complete');
  } catch (e) { console.error('❌ Test failed:', e); process.exit(1); }
})();
