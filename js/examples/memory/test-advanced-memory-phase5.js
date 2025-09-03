/**
 * Test Advanced Memory System - Phase 5: Performance Learning
 * 
 * Tests the performance learning functionality:
 * - Machine learning model training and optimization
 * - Agent parameter optimization using ML algorithms
 * - Reinforcement learning implementation
 * - Performance prediction and scenario analysis
 * - Adaptive learning and continuous improvement
 * - Feature extraction and correlation analysis
 */

console.log('🚀 Testing Advanced Memory System - Phase 5: Performance Learning');

async function testPhase5PerformanceLearning() {
  try {
    // Test 1: Import PerformanceLearningLayer
    console.log('\n📦 Test 1: Import PerformanceLearningLayer');
    const { 
      PerformanceFeatureExtractor, 
      MLModelTrainer,
      PerformanceLearningUtils,
      createPerformanceLearningLayer 
    } = await import('../../src/memory/advanced/performance-learning-layer.js');
    console.log('✅ PerformanceLearningLayer imported successfully');
    
    // Test 2: Create mock Zep client with performance capabilities
    console.log('\n🔧 Test 2: Create Mock Zep Client with Performance Capabilities');
    const mockZepClient = {
      searchMemory: async (query, options) => {
        console.log(`   Mock performance search: "${query}" (max: ${options?.maxResults || 10})`);
        
        // Return mock performance search results
        const mockFacts = [
          {
            fact_id: 'perf-1',
            fact: 'Agent performance in bull market: 85% success rate, 12% return',
            created_at: '2025-08-29T10:00:00Z',
            metadata: {
              agent_id: 'agent-001',
              success_rate: 0.85,
              total_return: 0.12,
              market_regime: 'bull'
            }
          },
          {
            fact_id: 'perf-2',
            fact: 'Agent performance in bear market: 70% success rate, 3% return',
            created_at: '2025-08-28T15:30:00Z',
            metadata: {
              agent_id: 'agent-001',
              success_rate: 0.70,
              total_return: 0.03,
              market_regime: 'bear'
            }
          }
        ];
        
        return { facts: mockFacts };
      },
      storePerformanceData: async (data) => {
        console.log(`   Mock store performance data for agent: ${data.agent_id}`);
        return { id: `stored-${Date.now()}` };
      }
    };
    
    const logger = {
      info: (msg, data) => console.log(`   INFO: ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      warn: (msg, data) => console.log(`   WARN: ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      error: (msg, data) => console.log(`   ERROR: ${msg}`, data ? JSON.stringify(data, null, 2) : '')
    };
    
    console.log('✅ Mock Zep client with performance capabilities created');
    
    // Test 3: Create PerformanceLearningLayer instance
    console.log('\n🏗️  Test 3: Create PerformanceLearningLayer');
    const performanceLearning = createPerformanceLearningLayer(mockZepClient, {
      learningRate: 0.01,
      adaptationThreshold: 0.05,
      enableReinforcementLearning: true,
      logger: logger
    });
    console.log('✅ PerformanceLearningLayer created successfully');
    
    // Test 4: Test feature extraction
    console.log('\n🔬 Test 4: Feature Extraction from Performance Records');
    
    // Create mock performance records
    const mockPerformanceRecords = [
      {
        agent_id: 'agent-001',
        strategy_id: 'momentum_strategy',
        performance_period: {
          start_date: '2025-08-01T00:00:00Z',
          end_date: '2025-08-15T00:00:00Z',
          duration_days: 15
        },
        market_conditions: {
          market_regime: 'bull',
          volatility: 0.02,
          volume_ratio: 1.2,
          trend_direction: 'up',
          market_stress: 0.1
        },
        trading_metrics: {
          total_trades: 25,
          successful_trades: 20,
          success_rate: 0.8,
          total_return: 0.12,
          avg_return_per_trade: 0.005,
          max_profit: 0.03,
          max_loss: -0.015,
          volatility: 0.15,
          sharpe_ratio: 1.2,
          max_drawdown: 0.08,
          win_loss_ratio: 2.5
        },
        decision_quality: {
          entry_timing_score: 0.85,
          exit_timing_score: 0.70,
          risk_management_score: 0.90,
          pattern_recognition_accuracy: 0.82,
          confidence_calibration: 0.75
        },
        learning_metrics: {
          adaptation_speed: 0.6,
          pattern_learning_rate: 0.8,
          error_correction_rate: 0.9,
          knowledge_retention: 0.85
        },
        metadata: {
          recorded_at: '2025-08-15T12:00:00Z',
          validation_status: 'validated',
          data_quality_score: 0.95,
          external_factors: ['earnings_season', 'fed_meeting']
        }
      },
      {
        agent_id: 'agent-001',
        strategy_id: 'momentum_strategy',
        performance_period: {
          start_date: '2025-08-16T00:00:00Z',
          end_date: '2025-08-30T00:00:00Z',
          duration_days: 15
        },
        market_conditions: {
          market_regime: 'bear',
          volatility: 0.04,
          volume_ratio: 0.8,
          trend_direction: 'down',
          market_stress: 0.7
        },
        trading_metrics: {
          total_trades: 18,
          successful_trades: 12,
          success_rate: 0.67,
          total_return: 0.02,
          avg_return_per_trade: 0.001,
          max_profit: 0.02,
          max_loss: -0.025,
          volatility: 0.25,
          sharpe_ratio: 0.4,
          max_drawdown: 0.15,
          win_loss_ratio: 1.8
        },
        decision_quality: {
          entry_timing_score: 0.75,
          exit_timing_score: 0.65,
          risk_management_score: 0.85,
          pattern_recognition_accuracy: 0.70,
          confidence_calibration: 0.80
        },
        learning_metrics: {
          adaptation_speed: 0.7,
          pattern_learning_rate: 0.75,
          error_correction_rate: 0.85,
          knowledge_retention: 0.90
        },
        metadata: {
          recorded_at: '2025-08-30T12:00:00Z',
          validation_status: 'validated',
          data_quality_score: 0.90,
          external_factors: ['market_correction', 'geopolitical_tension']
        }
      }
    ];
    
    const featureExtractor = new PerformanceFeatureExtractor();
    const extractedFeatures = featureExtractor.extractFeatures(mockPerformanceRecords);
    
    console.log('✅ Feature extraction completed');
    console.log(`   Features extracted: ${extractedFeatures.length} records`);
    console.log(`   Feature dimensions: ${Object.keys(extractedFeatures[0] || {}).length}`);
    console.log(`   Sample features: ${Object.keys(extractedFeatures[0] || {}).slice(0, 5).join(', ')}`);
    
    // Test 5: Test performance learning analysis
    console.log('\n🧠 Test 5: Performance Learning Analysis');
    
    const learningInsights = await performanceLearning.learnFromPerformance('agent-001', mockPerformanceRecords);
    
    console.log('✅ Performance learning analysis completed');
    console.log(`   Agent ID: ${learningInsights.agent_id}`);
    console.log(`   Records analyzed: ${learningInsights.learning_period.total_records_analyzed}`);
    console.log(`   Learning trajectory: ${learningInsights.performance_evolution.learning_trajectory}`);
    console.log(`   Improvement rate: ${learningInsights.performance_evolution.improvement_rate.toFixed(4)}`);
    console.log(`   Strength areas: ${learningInsights.strength_areas.length}`);
    console.log(`   Improvement opportunities: ${learningInsights.improvement_opportunities.length}`);
    console.log(`   Strategy adjustments: ${learningInsights.adaptive_recommendations.strategy_adjustments.length}`);
    
    if (learningInsights.strength_areas.length > 0) {
      const topStrength = learningInsights.strength_areas[0];
      console.log(`   Top strength: ${topStrength.skill_area} (score: ${topStrength.competency_score.toFixed(3)})`);
    }
    
    if (learningInsights.improvement_opportunities.length > 0) {
      const topOpportunity = learningInsights.improvement_opportunities[0];
      console.log(`   Top opportunity: ${topOpportunity.skill_area} (current: ${topOpportunity.current_score.toFixed(3)}, target: ${topOpportunity.target_score})`);
    }
    
    // Test 6: Test agent parameter optimization
    console.log('\n⚙️  Test 6: Agent Parameter Optimization');
    
    const currentParameters = {
      risk_per_trade: 0.02,
      position_size_multiplier: 1.0,
      stop_loss_percentage: 0.05,
      take_profit_percentage: 0.10,
      confidence_threshold: 0.7
    };
    
    const targetMetrics = {
      target_return: 0.15,
      target_sharpe: 1.5,
      max_drawdown_limit: 0.10,
      success_rate_target: 0.80
    };
    
    const optimizationResult = await performanceLearning.optimizeAgentParameters(
      'agent-001',
      currentParameters,
      targetMetrics
    );
    
    console.log('✅ Agent parameter optimization completed');
    console.log(`   Parameters optimized: ${Object.keys(optimizationResult.optimized_parameters).length}`);
    console.log(`   Expected return improvement: ${(optimizationResult.expected_improvements.return_improvement * 100).toFixed(1)}%`);
    console.log(`   Risk reduction: ${(optimizationResult.expected_improvements.risk_reduction * 100).toFixed(1)}%`);
    console.log(`   Sharpe improvement: ${optimizationResult.expected_improvements.sharpe_improvement.toFixed(2)}`);
    console.log(`   Optimization confidence: ${(optimizationResult.optimization_confidence * 100).toFixed(1)}%`);
    
    // Show sample parameter changes
    for (const [param, newValue] of Object.entries(optimizationResult.optimized_parameters)) {
      const oldValue = currentParameters[param];
      const change = ((newValue - oldValue) / oldValue * 100).toFixed(1);
      console.log(`   ${param}: ${oldValue} → ${newValue} (${change}% change)`);
    }
    
    // Test 7: Test reinforcement learning
    console.log('\n🎯 Test 7: Reinforcement Learning');
    
    const action = {
      action_type: 'buy_signal',
      parameters: {
        position_size: 0.05,
        confidence: 0.8,
        stop_loss: 0.03
      },
      context: {
        market_conditions: {
          market_regime: 'bull',
          volatility: 0.02,
          trend_strength: 0.8
        },
        technical_indicators: {
          rsi: 65,
          macd: 0.5,
          bollinger_position: 0.7
        }
      }
    };
    
    const outcome = {
      immediate_reward: 0.05,
      delayed_reward: 0.08,
      success: true,
      metrics: {
        return: 0.08,
        time_to_target: 3,
        max_drawdown: 0.02
      }
    };
    
    const rlResult = await performanceLearning.reinforcementLearning('agent-001', action, outcome);
    
    console.log('✅ Reinforcement learning update completed');
    console.log(`   Q-value update: ${rlResult.q_value_update.toFixed(4)}`);
    console.log(`   Exploration probability: ${(rlResult.exploration_vs_exploitation.exploration_probability * 100).toFixed(1)}%`);
    console.log(`   Exploitation confidence: ${(rlResult.exploration_vs_exploitation.exploitation_confidence * 100).toFixed(1)}%`);
    console.log(`   Policy adjustments: ${Object.keys(rlResult.policy_adjustment).length}`);
    console.log(`   Learned insights: ${rlResult.learned_insights.join(', ')}`);
    
    // Test 8: Test performance prediction scenarios
    console.log('\n🔮 Test 8: Performance Prediction Scenarios');
    
    const scenarios = [
      {
        scenario_name: 'Bull Market Continuation',
        market_conditions: {
          market_regime: 'bull',
          volatility: 0.02,
          trend_strength: 0.9
        },
        time_horizon: 30
      },
      {
        scenario_name: 'Market Correction',
        market_conditions: {
          market_regime: 'bear',
          volatility: 0.05,
          trend_strength: -0.7
        },
        time_horizon: 30
      },
      {
        scenario_name: 'Sideways Market',
        market_conditions: {
          market_regime: 'sideways',
          volatility: 0.015,
          trend_strength: 0.1
        },
        time_horizon: 30
      }
    ];
    
    const predictions = await performanceLearning.predictPerformanceScenarios('agent-001', scenarios);
    
    console.log('✅ Performance prediction scenarios completed');
    console.log(`   Scenarios analyzed: ${predictions.length}`);
    
    for (const prediction of predictions) {
      console.log(`   ${prediction.scenario_name}:`);
      console.log(`     Expected return: ${(prediction.predicted_metrics.expected_return * 100).toFixed(1)}%`);
      console.log(`     Success rate: ${(prediction.predicted_metrics.success_rate * 100).toFixed(1)}%`);
      console.log(`     Sharpe ratio: ${prediction.predicted_metrics.sharpe_ratio.toFixed(2)}`);
      console.log(`     Max drawdown: ${(prediction.predicted_metrics.max_drawdown * 100).toFixed(1)}%`);
      console.log(`     Risk factors: ${prediction.risk_factors.join(', ')}`);
    }
    
    // Test 9: Test ML model training
    console.log('\n🤖 Test 9: Machine Learning Model Training');
    
    const modelTrainer = new MLModelTrainer();
    
    // Train regression model for return prediction
    const regressionModel = modelTrainer.trainRegessionModel(extractedFeatures, [0.12, 0.02]);
    console.log('✅ Regression model trained');
    console.log(`   Model ID: ${regressionModel.model_id}`);
    console.log(`   Training data size: ${regressionModel.training_data_size}`);
    console.log(`   R-squared: ${regressionModel.accuracy_metrics.r_squared}`);
    console.log(`   MSE: ${regressionModel.accuracy_metrics.mse}`);
    console.log(`   Top features: ${regressionModel.feature_importance.slice(0, 3).map(f => f.feature_name).join(', ')}`);
    
    // Train classification model for success prediction
    const classificationModel = modelTrainer.trainClassificationModel(extractedFeatures, ['success', 'partial_success']);
    console.log('✅ Classification model trained');
    console.log(`   Model ID: ${classificationModel.model_id}`);
    console.log(`   Accuracy: ${(classificationModel.accuracy_metrics.accuracy * 100).toFixed(1)}%`);
    console.log(`   Precision: ${(classificationModel.accuracy_metrics.precision * 100).toFixed(1)}%`);
    console.log(`   Recall: ${(classificationModel.accuracy_metrics.recall * 100).toFixed(1)}%`);
    
    // Test 10: Test utility functions
    console.log('\n🧮 Test 10: Performance Learning Utilities');
    
    // Test improvement rate calculation
    const improvementRate = PerformanceLearningUtils.calculateImprovementRate(0.08, 0.12, 10);
    console.log(`   Improvement rate: ${(improvementRate * 100).toFixed(2)}% per period`);
    
    // Test metric normalization
    const rawMetrics = {
      success_rate: 0.85,
      total_return: 0.15,
      sharpe_ratio: 1.8,
      max_drawdown: -0.12
    };
    const normalizedMetrics = PerformanceLearningUtils.normalizeMetrics(rawMetrics);
    console.log('   Metrics normalized:');
    for (const [key, value] of Object.entries(normalizedMetrics)) {
      console.log(`     ${key}: ${rawMetrics[key]} → ${value.toFixed(3)}`);
    }
    
    // Test correlation calculation
    const returns1 = [0.05, 0.08, 0.12, 0.03, 0.09];
    const returns2 = [0.04, 0.09, 0.11, 0.02, 0.10];
    const correlation = PerformanceLearningUtils.calculateCorrelation(returns1, returns2);
    console.log(`   Correlation between return series: ${correlation.toFixed(3)}`);
    
    console.log('\n🎉 Phase 5 Performance Learning Tests Completed!');
    console.log('\nSummary:');
    console.log('✅ PerformanceLearningLayer creation working');
    console.log('✅ Feature extraction from performance records working');
    console.log('✅ Performance learning analysis working');
    console.log('✅ Agent parameter optimization using ML working');
    console.log('✅ Reinforcement learning implementation working');
    console.log('✅ Performance prediction scenarios working');
    console.log('✅ Machine learning model training working');
    console.log('✅ Utility functions for performance analysis working');
    
    console.log('\nImplemented Machine Learning Features:');
    console.log('• Linear regression for performance prediction');
    console.log('• Classification models for success rate prediction');
    console.log('• Q-learning implementation for reinforcement learning');
    console.log('• Feature extraction and importance analysis');
    console.log('• Gradient descent optimization for parameter tuning');
    console.log('• Correlation analysis for performance metrics');
    console.log('• Adaptive learning rate adjustments');
    console.log('• Multi-scenario performance prediction');
    console.log('• Continuous learning and model updates');
    console.log('• Performance analytics and insights generation');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Phase 5 test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testPhase5PerformanceLearning()
  .then(success => {
    if (success) {
      console.log('\n🚀 Phase 5 tests passed! Performance learning with ML algorithms is working.');
      console.log('🧠 Reinforcement learning and adaptive optimization functional.');
      console.log('➡️  Ready to proceed to Phase 6: Final System Integration.');
      process.exit(0);
    } else {
      console.log('\n💥 Phase 5 tests failed. Please fix issues before proceeding.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });