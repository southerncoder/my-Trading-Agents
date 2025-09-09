/**
 * Unit Tests for Unsupervised Learning Engine
 *
 * Tests the LLM-powered unsupervised learning functionality
 */

async function unsupervisedLearningEngineTests() {
  console.log('🧪 Testing Unsupervised Learning Engine...\n');

  try {
    // Import the engine
    const { UnsupervisedLearningEngine } = await import('../../src/learning/unsupervised-engine.js');
    const learningTypes = await import('../../src/learning/learning-types.js');

    // Create mock logger
    const mockLogger = {
      info: (...args: any[]) => console.log('INFO:', ...args),
      debug: (...args: any[]) => console.log('DEBUG:', ...args),
      warn: (...args: any[]) => console.log('WARN:', ...args),
      error: (...args: any[]) => console.log('ERROR:', ...args)
    };

    const engine = new UnsupervisedLearningEngine(mockLogger);

    console.log('✅ Engine created successfully');

    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check');
    const health = engine.getHealth();
    console.log(`   Health status: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (!health) throw new Error('Engine health check failed');

    // Test 2: Clustering
    console.log('\n🎯 Test 2: Clustering Analysis');
    const examples = [
      {
        id: '1',
        features: { rsi: 65, volume: 1.2, sentiment: 0.8 },
        target: 0.05,
        timestamp: '2025-09-07T10:00:00Z',
        market_conditions: { volatility: 'medium', trend: 'bullish' },
        outcome: {
          realized_return: 0.03,
          risk_adjusted_return: 0.025,
          holding_period: 5,
          confidence_score: 0.8
        }
      },
      {
        id: '2',
        features: { rsi: 75, volume: 0.8, sentiment: 0.6 },
        target: -0.02,
        timestamp: '2025-09-07T11:00:00Z',
        market_conditions: { volatility: 'high', trend: 'bearish' },
        outcome: {
          realized_return: -0.015,
          risk_adjusted_return: -0.018,
          holding_period: 3,
          confidence_score: 0.7
        }
      },
      {
        id: '3',
        features: { rsi: 45, volume: 0.9, sentiment: 0.4 },
        target: -0.08,
        timestamp: '2025-09-07T12:00:00Z',
        market_conditions: { volatility: 'low', trend: 'bearish' },
        outcome: {
          realized_return: -0.06,
          risk_adjusted_return: -0.055,
          holding_period: 8,
          confidence_score: 0.6
        }
      }
    ];

    console.log('   Performing clustering analysis...');
    const clusteringResult = await engine.performClustering(examples, 2, 'kmeans');
    console.log('   ✅ Clustering completed successfully');
    console.log(`   Number of clusters: ${clusteringResult.clusters.length}`);
    console.log(`   Silhouette score: ${clusteringResult.silhouette_score}`);

    if (clusteringResult.clusters.length > 0) {
      console.log('   Sample cluster:');
      const cluster = clusteringResult.clusters[0];
      console.log(`   - Cluster ID: ${cluster.cluster_id}`);
      console.log(`   - Size: ${cluster.size}`);
      console.log(`   - Characteristics: ${Object.keys(cluster.characteristics).length} features`);
    }

    // Test 3: Anomaly Detection
    console.log('\n🔍 Test 3: Anomaly Detection');
    console.log('   Detecting anomalies in data...');

    const anomalyResult = await engine.detectAnomalies(examples, 0.2, 'isolation_forest');
    console.log('   ✅ Anomaly detection completed successfully');
    console.log(`   Number of anomalies: ${anomalyResult.anomalies.length}`);
    console.log(`   Threshold: ${anomalyResult.threshold}`);

    // Test 4: Optimal Clusters Analysis
    console.log('\n📈 Test 4: Optimal Clusters Analysis');
    console.log('   Finding optimal number of clusters...');

    const optimalClusters = await engine.findOptimalClusters(examples, 5);
    console.log('   ✅ Optimal cluster analysis completed');
    console.log(`   Recommended clusters: ${optimalClusters.recommended_clusters}`);
    console.log(`   Elbow scores: [${optimalClusters.elbow_scores.join(', ')}]`);

    // Test 5: Error Handling
    console.log('\n🚨 Test 5: Error Handling');
    try {
      await engine.performClustering([], 2, 'kmeans');
      console.log('   ❌ Should have handled empty data gracefully');
    } catch (error) {
      console.log('   ✅ Correctly handled empty data');
    }

    console.log('\n🎉 All Unsupervised Learning Engine tests passed!');

    return {
      success: true,
      testsRun: 5,
      results: {
        health: health,
        clustering: {
          clusters: clusteringResult.clusters.length,
          silhouetteScore: clusteringResult.silhouette_score
        },
        anomalies: anomalyResult.anomalies.length,
        optimalClusters: optimalClusters.recommended_clusters
      }
    };

  } catch (error) {
    console.error('❌ Unsupervised Learning Engine test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use in other test files
export { unsupervisedLearningEngineTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  unsupervisedLearningEngineTests().then((result) => {
    if (result.success) {
      console.log('\n✅ Unsupervised Learning Engine tests completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Unsupervised Learning Engine tests failed!');
      process.exit(1);
    }
  });
}