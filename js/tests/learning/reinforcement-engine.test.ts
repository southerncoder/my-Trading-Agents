/**
 * Unit Tests for Reinforcement Learning Engine
 *
 * Tests the Q-learning and policy gradient functionality
 */

async function reinforcementLearningEngineTests() {
  console.log('🧪 Testing Reinforcement Learning Engine...\n');

  try {
    // Import the engine
    const { ReinforcementLearningEngine } = await import('../../src/learning/reinforcement-engine.ts');
    const learningTypes = await import('../../src/learning/learning-types.ts');

    // Create mock logger
    const mockLogger = {
      info: (...args: any[]) => console.log('INFO:', ...args),
      debug: (...args: any[]) => console.log('DEBUG:', ...args),
      warn: (...args: any[]) => console.log('WARN:', ...args),
      error: (...args: any[]) => console.log('ERROR:', ...args)
    };

    const engine = new ReinforcementLearningEngine({
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.8,
      explorationDecay: 0.995,
      minExplorationRate: 0.01
    }, mockLogger);

    console.log('✅ Engine created successfully');

    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check');
    const health = engine.getHealth();
    console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (!health) throw new Error('Engine health check failed');

    // Test 2: Q-Learning Experience
    console.log('\n🧠 Test 2: Q-Learning Experience');
    const currentState = {
      state_id: 'state1',
      market_features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
      portfolio_state: { cash: 10000, positions: 5 },
      timestamp: '2025-09-07T10:00:00Z',
      reward: 0.05
    };

    const nextState = {
      state_id: 'state2',
      market_features: { rsi: 68, volume: 1.1, sentiment: 0.7 },
      portfolio_state: { cash: 10150, positions: 5 },
      timestamp: '2025-09-07T10:05:00Z',
      reward: 0.03
    };

    console.log('   Learning from trading experience...');
    await engine.learnFromExperience(currentState, 'BUY', 150, nextState);
    console.log('   ✅ Experience learned successfully');

    // Test 3: Action Selection
    console.log('\n🎯 Test 3: Action Selection');
    const availableActions = ['BUY', 'SELL', 'HOLD'];
    console.log('   Selecting action for current state...');

    const action = engine.chooseAction(currentState, availableActions);
    console.log(`   ✅ Action selected: ${action}`);
    console.log(`   Available actions were: [${availableActions.join(', ')}]`);

    // Test 4: Q-Value Retrieval
    console.log('\n📊 Test 4: Q-Value Retrieval');
    const qValue = engine.getQValue(currentState, 'BUY');
    console.log(`   Q-value for BUY action: ${qValue}`);

    const qValueSell = engine.getQValue(currentState, 'SELL');
    console.log(`   Q-value for SELL action: ${qValueSell}`);

    // Test 5: Learning Statistics
    console.log('\n📈 Test 5: Learning Statistics');
    const stats = engine.getLearningStats();
    console.log('   ✅ Learning statistics retrieved');
    console.log(`   Total states: ${stats.totalStates}`);
    console.log(`   Total actions: ${stats.totalActions}`);
    console.log(`   Average Q-value: ${stats.averageQValue.toFixed(4)}`);
    console.log(`   Exploration rate: ${(stats.explorationRate * 100).toFixed(2)}%`);

    // Test 6: Multiple Learning Experiences
    console.log('\n🔄 Test 6: Multiple Learning Experiences');
    console.log('   Learning from multiple experiences...');

    for (let i = 0; i < 5; i++) {
      const testState = {
        state_id: `test_state_${i}`,
        market_features: {
          rsi: 60 + Math.random() * 20,
          volume: 0.8 + Math.random() * 0.8,
          sentiment: 0.4 + Math.random() * 0.6
        },
        portfolio_state: {
          cash: 10000 + Math.random() * 1000,
          positions: Math.floor(Math.random() * 10)
        },
        timestamp: new Date(Date.now() + i * 60000).toISOString()
      };

      const reward = (Math.random() - 0.5) * 200; // Random reward between -100 and +100
      await engine.learnFromExperience(testState, availableActions[Math.floor(Math.random() * 3)], reward, testState);
    }

    console.log('   ✅ Multiple experiences learned');

    // Test 7: Updated Statistics
    console.log('\n📊 Test 7: Updated Learning Statistics');
    const updatedStats = engine.getLearningStats();
    console.log('   ✅ Updated statistics retrieved');
    console.log(`   Total states: ${updatedStats.totalStates}`);
    console.log(`   Total actions: ${updatedStats.totalActions}`);
    console.log(`   Average Q-value: ${updatedStats.averageQValue.toFixed(4)}`);
    console.log(`   Exploration rate: ${(updatedStats.explorationRate * 100).toFixed(2)}%`);

    // Test 8: Insights Generation
    console.log('\n💡 Test 8: Insights Generation');
    console.log('   Generating insights from learning data...');

    const insights = await engine.getInsights([currentState, nextState]);
    console.log('   ✅ Insights generated successfully');
    console.log(`   Number of insights: ${insights.length}`);

    if (insights.length > 0) {
      console.log('   Sample insight:');
      console.log(`   - Type: ${insights[0].insight_type}`);
      console.log(`   - Description: ${insights[0].description}`);
      console.log(`   - Confidence: ${insights[0].confidence_score}`);
    }

    console.log('\n🎉 All Reinforcement Learning Engine tests passed!');

    return {
      success: true,
      testsRun: 8,
      results: {
        health: health,
        action: action,
        qValue: qValue,
        initialStats: stats,
        updatedStats: updatedStats,
        insights: insights.length
      }
    };

  } catch (error) {
    console.error('❌ Reinforcement Learning Engine test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use in other test files
export { reinforcementLearningEngineTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reinforcementLearningEngineTests().then((result) => {
    if (result.success) {
      console.log('\n✅ Reinforcement Learning Engine tests completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Reinforcement Learning Engine tests failed!');
      process.exit(1);
    }
  });
}