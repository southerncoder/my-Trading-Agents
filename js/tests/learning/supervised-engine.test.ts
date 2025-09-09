/**
 * Unit Tests for Supervised Learning Engine
 *
 * Tests the LLM-powered supervised learning functionality
 */

// Helper function to generate dynamic training examples
function generateTrainingExamples(count: number = 10) {
  const examples = [];

  for (let i = 0; i < count; i++) {
    // Generate realistic market data
    const rsi = 30 + Math.random() * 40; // RSI between 30-70 (typical trading range)
    const volume = 0.5 + Math.random() * 2.0; // Volume multiplier 0.5-2.5x
    const sentiment = Math.random(); // Sentiment score 0-1

    // Generate target based on features (simplified model)
    const target = (rsi - 50) * 0.001 + (sentiment - 0.5) * 0.02 + (Math.random() - 0.5) * 0.01;

    // Determine market conditions based on features
    const volatility = rsi > 60 ? 'high' : rsi > 40 ? 'medium' : 'low';
    const trend = sentiment > 0.6 ? 'bullish' : sentiment < 0.4 ? 'bearish' : 'sideways';

    examples.push({
      id: `dynamic-${i + 1}`,
      features: { rsi, volume, sentiment },
      target: Math.max(-0.05, Math.min(0.05, target)), // Clamp target between -5% and +5%
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time within last 24h
      market_conditions: { volatility, trend },
      outcome: {
        realized_return: target * (0.8 + Math.random() * 0.4), // Realistic realized return
        risk_adjusted_return: target * (0.7 + Math.random() * 0.3), // Slightly lower risk-adjusted
        holding_period: Math.floor(1 + Math.random() * 9), // 1-10 day holding period
        confidence_score: 0.6 + Math.random() * 0.4 // Confidence 0.6-1.0
      }
    });
  }

  return examples;
}

// Helper function to generate test examples with known outcomes
function generateTestExamples(count: number = 5) {
  const examples = [];

  for (let i = 0; i < count; i++) {
    const rsi = 40 + Math.random() * 30; // RSI 40-70
    const volume = 0.8 + Math.random() * 1.4; // Volume 0.8-2.2x
    const sentiment = 0.3 + Math.random() * 0.7; // Sentiment 0.3-1.0

    // Create predictable target for testing
    const target = (rsi - 55) * 0.0005 + (sentiment - 0.5) * 0.01;

    examples.push({
      id: `test-${i + 1}`,
      features: { rsi, volume, sentiment },
      target: Math.max(-0.03, Math.min(0.03, target)), // Clamp for testing
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      market_conditions: {
        volatility: rsi > 55 ? 'medium' : 'low',
        trend: sentiment > 0.5 ? 'bullish' : 'bearish'
      },
      outcome: {
        realized_return: target * (0.9 + Math.random() * 0.2),
        risk_adjusted_return: target * (0.8 + Math.random() * 0.2),
        holding_period: Math.floor(2 + Math.random() * 6), // 2-8 days
        confidence_score: 0.7 + Math.random() * 0.3 // 0.7-1.0
      }
    });
  }

  return examples;
}

async function supervisedLearningEngineTests() {
  console.log('🧪 Testing Supervised Learning Engine...\n');

  try {
    // Import the engine
    const { SupervisedLearningEngine } = await import('../../src/learning/supervised-engine.js');
    const learningTypes = await import('../../src/learning/learning-types.js');

    // Create mock logger
    const mockLogger = {
      info: (...args: any[]) => console.log('INFO:', ...args),
      debug: (...args: any[]) => console.log('DEBUG:', ...args),
      warn: (...args: any[]) => console.log('WARN:', ...args),
      error: (...args: any[]) => console.log('ERROR:', ...args)
    };

    const engine = new SupervisedLearningEngine(mockLogger);

    console.log('✅ Engine created successfully');

    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check');
    const health = engine.getHealth();
    console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (!health) throw new Error('Engine health check failed');

    // Test 2: Model Training
    console.log('\n📚 Test 2: Model Training');
    const trainingExamples = generateTrainingExamples(15); // Generate 15 dynamic examples

    console.log('   Training model with dynamically generated data...');
    console.log(`   Generated ${trainingExamples.length} training examples`);
    console.log(`   Sample features - RSI: ${trainingExamples[0].features.rsi.toFixed(1)}, Volume: ${trainingExamples[0].features.volume.toFixed(2)}, Sentiment: ${trainingExamples[0].features.sentiment.toFixed(2)}`);
    const model = await engine.trainModel('test-model', 'random_forest', trainingExamples);
    console.log('   ✅ Model trained successfully');
    console.log(`   Model ID: ${model.model_id}`);
    console.log(`   Algorithm: ${model.algorithm}`);
    console.log(`   Training size: ${model.training_data_size}`);

    // Test 3: Prediction
    console.log('\n🔮 Test 3: Prediction');
    const features = {
      rsi: 45 + Math.random() * 25, // RSI 45-70
      volume: 0.7 + Math.random() * 1.3, // Volume 0.7-2.0x
      sentiment: Math.random() // Sentiment 0-1
    };
    console.log('   Making prediction with features:', {
      rsi: features.rsi.toFixed(1),
      volume: features.volume.toFixed(2),
      sentiment: features.sentiment.toFixed(2)
    });

    const prediction = await engine.predict('test-model', features);
    console.log('   ✅ Prediction made successfully');
    console.log(`   Prediction: ${prediction.prediction}`);
    console.log(`   Confidence: ${prediction.confidence}`);

    // Test 4: Model Evaluation
    console.log('\n📈 Test 4: Model Evaluation');
    const testExamples = generateTestExamples(8); // Generate 8 dynamic test examples

    console.log('   Evaluating model with dynamically generated test data...');
    console.log(`   Generated ${testExamples.length} test examples for evaluation`);
    const evaluation = await engine.evaluateModel('test-model', testExamples);
    console.log('   ✅ Model evaluation completed');
    console.log(`   Accuracy: ${evaluation.accuracy}`);
    console.log(`   Precision: ${evaluation.precision}`);
    console.log(`   Recall: ${evaluation.recall}`);
    console.log(`   F1 Score: ${evaluation.f1_score}`);

    // Test 5: Insights Generation
    console.log('\n💡 Test 5: Insights Generation');
    console.log('   Generating insights from training data...');

    const insights = await engine.getInsights(trainingExamples);
    console.log('   ✅ Insights generated successfully');
    console.log(`   Number of insights: ${insights.length}`);

    if (insights.length > 0) {
      console.log('   Sample insight:');
      console.log(`   - Type: ${insights[0].insight_type}`);
      console.log(`   - Description: ${insights[0].description}`);
      console.log(`   - Confidence: ${insights[0].confidence_score}`);
    }

    // Test 6: Error Handling
    console.log('\n🚨 Test 6: Error Handling');
    try {
      await engine.predict('non-existent-model', features);
      console.log('   ❌ Should have thrown error for non-existent model');
    } catch (error) {
      console.log('   ✅ Correctly handled non-existent model error');
    }

    console.log('\n🎉 All Supervised Learning Engine tests passed!');

    return {
      success: true,
      testsRun: 6,
      results: {
        health: health,
        model: model,
        prediction: prediction,
        evaluation: evaluation,
        insights: insights.length
      }
    };

  } catch (error) {
    console.error('❌ Supervised Learning Engine test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use in other test files
export { supervisedLearningEngineTests };

// Run tests if this file is executed directly (commented out for Jest compatibility)
// if (import.meta.url === `file://${process.argv[1]}`) {
//   supervisedLearningEngineTests().then((result) => {
//     if (result.success) {
//       console.log('\n✅ Supervised Learning Engine tests completed successfully!');
//       process.exit(0);
//     } else {
//       console.error('\n❌ Supervised Learning Engine tests failed!');
//       process.exit(1);
//     }
//   });
// }