/**
 * Simple Learning Test Runner
 *
 * Basic test to verify learning engines work
 */

import { ReinforcementLearningEngine } from '../../src/learning/reinforcement-engine.ts';
import { SupervisedLearningEngine } from '../../src/learning/supervised-engine.ts';
import { UnsupervisedLearningEngine } from '../../src/learning/unsupervised-engine.ts';

console.log('🧪 Testing Learning Engines...\n');

// Test Reinforcement Learning Engine
console.log('🎯 Testing Reinforcement Learning Engine...');
try {
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

  console.log('✅ Reinforcement Learning Engine created successfully');

  const health = engine.getHealth();
  console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);

  if (health) {
    console.log('🎉 Reinforcement Learning Engine test passed!');
  } else {
    console.log('❌ Reinforcement Learning Engine test failed!');
  }

} catch (error) {
  console.error('❌ Reinforcement Learning Engine test failed:', error);
}

// Test Supervised Learning Engine
console.log('\n🧠 Testing Supervised Learning Engine...');
try {
  const mockLogger = {
    info: (...args: any[]) => console.log('INFO:', ...args),
    debug: (...args: any[]) => console.log('DEBUG:', ...args),
    warn: (...args: any[]) => console.log('WARN:', ...args),
    error: (...args: any[]) => console.log('ERROR:', ...args)
  };

  const engine = new SupervisedLearningEngine(mockLogger);

  console.log('✅ Supervised Learning Engine created successfully');

  const health = engine.getHealth();
  console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);

  if (health) {
    console.log('🎉 Supervised Learning Engine test passed!');
  } else {
    console.log('❌ Supervised Learning Engine test failed!');
  }

} catch (error) {
  console.error('❌ Supervised Learning Engine test failed:', error);
}

// Test Unsupervised Learning Engine
console.log('\n🔍 Testing Unsupervised Learning Engine...');
try {
  const mockLogger = {
    info: (...args: any[]) => console.log('INFO:', ...args),
    debug: (...args: any[]) => console.log('DEBUG:', ...args),
    warn: (...args: any[]) => console.log('WARN:', ...args),
    error: (...args: any[]) => console.log('ERROR:', ...args)
  };

  const engine = new UnsupervisedLearningEngine(mockLogger);

  console.log('✅ Unsupervised Learning Engine created successfully');

  const health = engine.getHealth();
  console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);

  if (health) {
    console.log('🎉 Unsupervised Learning Engine test passed!');
  } else {
    console.log('❌ Unsupervised Learning Engine test failed!');
  }

} catch (error) {
  console.error('❌ Unsupervised Learning Engine test failed:', error);
}

console.log('\n🏁 Basic learning engine tests completed!');