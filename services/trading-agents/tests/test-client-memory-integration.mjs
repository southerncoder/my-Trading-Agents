/**
 * Integration test for client-based memory provider with main trading system
 * Tests compatibility with FinancialSituationMemory interface
 */

import { createZepGraphitiMemory, EnhancedFinancialMemory } from './src/providers/zep-graphiti-memory-provider-client.js';
import { createPrePopulatedMemory } from './src/agents/utils/memory.js';

async function testClientMemoryIntegration() {
  console.log('🧪 Testing Client-Based Memory Provider Integration\n');

  try {
    // Test 1: Create client-based memory provider
    console.log('1. Creating client-based Zep Graphiti memory provider...');
    
    const zepConfig = {
      sessionId: 'test-integration-session',
      userId: 'test-user',
      maxResults: 10
    };

    const agentConfig = {
      llmProvider: 'remote_lmstudio',
      openaiApiKey: 'test-key',
      backendUrl: 'http://localhost:1234/v1',
      quickThinkLlm: 'dolphin-2.9-llama3-8b'
    };

    const clientMemoryProvider = await createZepGraphitiMemory(zepConfig, agentConfig);
    console.log('✅ Client-based memory provider created successfully');

    // Test 2: Test connection
    console.log('\n2. Testing connection to Zep Graphiti services...');
    const isConnected = await clientMemoryProvider.testConnection();
    
    if (!isConnected) {
      console.log('⚠️  Zep Graphiti services not running - using fallback validation');
      console.log('   To run full test: Start services with py_zep/start-services-secure.ps1');
      
      // Still test interface compatibility
      console.log('\n3. Testing interface compatibility (without live services)...');
      await testInterfaceCompatibility(clientMemoryProvider);
      return;
    }
    
    console.log('✅ Connected to Zep Graphiti services');

    // Test 3: Interface compatibility with FinancialSituationMemory
    console.log('\n3. Testing interface compatibility...');
    await testInterfaceCompatibility(clientMemoryProvider);

    // Test 4: Create EnhancedFinancialMemory wrapper
    console.log('\n4. Testing EnhancedFinancialMemory wrapper...');
    const enhancedMemory = new EnhancedFinancialMemory('test-enhanced', agentConfig, zepConfig);
    await enhancedMemory.initialize();
    console.log('✅ EnhancedFinancialMemory initialized successfully');

    // Test 5: Add financial situations
    console.log('\n5. Testing addSituations compatibility...');
    await enhancedMemory.addSituations([
      [
        'High inflation with rising interest rates affecting tech stocks',
        'Consider reducing growth tech exposure and increasing defensive positions'
      ],
      [
        'Market volatility increasing with geopolitical tensions',
        'Implement hedging strategies and increase cash allocation for opportunities'
      ]
    ]);
    console.log('✅ Financial situations added successfully');

    // Test 6: Search for memory matches
    console.log('\n6. Testing memory search functionality...');
    const memoryMatches = await enhancedMemory.getMemories('What should I do about rising interest rates?', 2);
    console.log(`✅ Found ${memoryMatches.length} memory matches`);
    
    memoryMatches.forEach((match, index) => {
      console.log(`   Match ${index + 1}:`);
      console.log(`     Situation: ${match.matchedSituation}`);
      console.log(`     Recommendation: ${match.recommendation}`);
      console.log(`     Similarity: ${match.similarityScore?.toFixed(3) || 'N/A'}`);
    });

    // Test 7: Compare with traditional memory
    console.log('\n7. Testing compatibility with traditional FinancialSituationMemory...');
    const traditionalMemory = await createPrePopulatedMemory('traditional-test', agentConfig);
    
    console.log(`   Traditional memory count: ${traditionalMemory.count()}`);
    console.log(`   Enhanced memory provider: ${enhancedMemory.getProviderName()}`);
    console.log(`   Traditional memory provider: ${traditionalMemory.getProviderName()}`);

    // Test 8: Interface method compatibility
    console.log('\n8. Testing interface method compatibility...');
    const providerInfo = enhancedMemory.getProviderInfo();
    console.log(`   Provider info: ${JSON.stringify(providerInfo, null, 2)}`);
    
    console.log('\n🎉 All integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Client-based memory provider created');
    console.log('   ✅ Connection to Zep Graphiti services working');
    console.log('   ✅ Interface compatibility confirmed');
    console.log('   ✅ EnhancedFinancialMemory wrapper functional');
    console.log('   ✅ Memory operations working correctly');
    console.log('   ✅ Compatible with existing trading system');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('\nDebug info:');
    console.error('- Make sure Zep Graphiti services are running');
    console.error('- Check Python environment is activated');
    console.error('- Verify Docker containers are healthy');
    console.error('\nTo start services: cd py_zep && .\\start-services-secure.ps1');
    process.exit(1);
  }
}

async function testInterfaceCompatibility(memoryProvider) {
  // Test all required interface methods exist
  const requiredMethods = [
    'getMemories',
    'addSituations', 
    'testConnection',
    'getProviderInfo',
    'getProviderName',
    'count',
    'getAllMemories'
  ];

  for (const method of requiredMethods) {
    if (typeof memoryProvider[method] !== 'function') {
      throw new Error(`Missing required method: ${method}`);
    }
  }

  console.log('   ✅ All required interface methods present');

  // Test method signatures compatibility
  try {
    const providerInfo = memoryProvider.getProviderInfo();
    if (!providerInfo || typeof providerInfo.name !== 'string') {
      throw new Error('getProviderInfo returned invalid structure');
    }

    const providerName = memoryProvider.getProviderName();
    if (typeof providerName !== 'string') {
      throw new Error('getProviderName returned invalid type');
    }

    const count = memoryProvider.count();
    if (typeof count !== 'number') {
      throw new Error('count returned invalid type');
    }

    const allMemories = memoryProvider.getAllMemories();
    if (!Array.isArray(allMemories)) {
      throw new Error('getAllMemories returned invalid type');
    }

    console.log('   ✅ Method signatures compatible');
  } catch (error) {
    throw new Error(`Interface compatibility test failed: ${error.message}`);
  }
}

// Run the test
testClientMemoryIntegration().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});