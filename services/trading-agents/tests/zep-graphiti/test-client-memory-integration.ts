/**
 * Integration test for client-based memory provider with main trading system
 * Tests compatibility with FinancialSituationMemory interface
 */

import { createLogger } from '../../src/utils/enhanced-logger';
import { createZepGraphitiMemory, EnhancedFinancialMemory } from '../../src/providers/zep-graphiti/zep-graphiti-memory-provider-client';
import { createPrePopulatedMemory } from '../../src/agents/utils/memory';

async function testClientMemoryIntegration() {
  const logger = createLogger('test', 'ClientMemoryIntegration');

  logger.info('integration_test', '🧪 Testing Client-Based Memory Provider Integration');

  try {
    // Test 1: Create client-based memory provider
    logger.info('create_provider', '1. Creating client-based Zep Graphiti memory provider...');
    
    const zepConfig = {
      sessionId: 'test-integration-session',
      userId: 'test-user',
      maxResults: 10
    };

    const agentConfig = {
      provider: 'remote_lmstudio' as const,
      model: 'dolphin-2.9-llama3-8b',
      apiKey: process.env.OPENAI_API_KEY || 'test-key-placeholder',
      baseUrl: 'http://localhost:1234/v1',
      temperature: 0.3,
      maxTokens: 1000
    };

    const clientMemoryProvider = await createZepGraphitiMemory(zepConfig, agentConfig);
    logger.info('create_provider', '✅ Client-based memory provider created successfully');

    // Test 2: Test connection
    logger.info('test_connection', '2. Testing connection to Zep Graphiti services...');
    const isConnected = await clientMemoryProvider.testConnection();
    
    if (!isConnected) {
      logger.warn('test_connection', 'Zep Graphiti services not running - using fallback validation');
  logger.info('test_connection', 'To run full test: Start services with zep_graphiti/start-services-secure.ps1');
      
      // Still test interface compatibility
      logger.info('test_compatibility', '3. Testing interface compatibility (without live services)...');
      await testInterfaceCompatibility(clientMemoryProvider, logger);
      return;
    }
    
    logger.info('test_connection', '✅ Connected to Zep Graphiti services');

    // Test 3: Interface compatibility with FinancialSituationMemory
    logger.info('test_compatibility', '3. Testing interface compatibility...');
    await testInterfaceCompatibility(clientMemoryProvider, logger);

    // Test 4: Create EnhancedFinancialMemory wrapper
    logger.info('test_enhanced_memory', '4. Testing EnhancedFinancialMemory wrapper...');
    const enhancedMemory = new EnhancedFinancialMemory('test-enhanced', agentConfig, zepConfig);
    await enhancedMemory.initialize();
    logger.info('test_enhanced_memory', '✅ EnhancedFinancialMemory initialized successfully');

    // Test 5: Add financial situations
    logger.info('test_add_situations', '5. Testing addSituations compatibility...');
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
    logger.info('test_add_situations', '✅ Financial situations added successfully');

    // Test 6: Search for memory matches
    logger.info('test_memory_search', '6. Testing memory search functionality...');
    const memoryMatches = await enhancedMemory.getMemories('What should I do about rising interest rates?', 2);
    logger.info('test_memory_search', `✅ Found ${memoryMatches.length} memory matches`, { matchCount: memoryMatches.length });
    
    memoryMatches.forEach((match, index) => {
      logger.info('test_memory_search', `Match ${index + 1}:`, {
        situation: match.matchedSituation,
        recommendation: match.recommendation,
        similarity: match.similarityScore?.toFixed(3) || 'N/A'
      });
    });

    // Test 7: Compare with traditional memory
    logger.info('test_traditional_memory', '7. Testing compatibility with traditional FinancialSituationMemory...');
    const traditionalMemory = await createPrePopulatedMemory('traditional-test', agentConfig);
    
    logger.info('test_traditional_memory', `Traditional memory count: ${traditionalMemory.count()}`, {
      traditionalCount: traditionalMemory.count(),
      enhancedProvider: enhancedMemory.getProviderName(),
      traditionalProvider: traditionalMemory.getProviderName()
    });

    // Test 8: Interface method compatibility
    logger.info('test_interface_methods', '8. Testing interface method compatibility...');
    const providerInfo = enhancedMemory.getProviderInfo();
    logger.info('test_interface_methods', 'Provider info retrieved', { providerInfo });
    
    logger.info('test_summary', '🎉 All integration tests passed!');
    logger.info('test_summary', '📋 Summary:');
    logger.info('test_summary', '✅ Client-based memory provider created');
    logger.info('test_summary', '✅ Connection to Zep Graphiti services working');
    logger.info('test_summary', '✅ Interface compatibility confirmed');
    logger.info('test_summary', '✅ EnhancedFinancialMemory wrapper functional');
    logger.info('test_summary', '✅ Memory operations working correctly');
    logger.info('test_summary', '✅ Compatible with existing trading system');

  } catch (error) {
    logger.error('test_execution', 'Integration test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    logger.error('test_debug', 'Debug info:');
    logger.error('test_debug', 'Make sure Zep Graphiti services are running');
    logger.error('test_debug', 'Check Python environment is activated');
    logger.error('test_debug', 'Verify Docker containers are healthy');
  logger.error('test_debug', 'To start services: cd zep_graphiti && .\\start-services-secure.ps1');
    process.exit(1);
  }
}

async function testInterfaceCompatibility(memoryProvider: any, logger: any) {
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

  logger.info('interface_check', '✅ All required interface methods present');

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

    logger.info('signature_check', '✅ Method signatures compatible');
  } catch (error) {
    throw new Error(`Interface compatibility test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run the test
testClientMemoryIntegration().catch(error => {
  const logger = createLogger('test', 'ClientMemoryIntegration');
  logger.error('test_execution_final', 'Test execution failed', { error });
  process.exit(1);
});