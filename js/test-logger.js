// Test enhanced logger to ensure no circular dependencies
import { logger, createLogger, ErrorSeverity } from './src/utils/enhanced-logger.js';

console.log('🧪 Testing Enhanced Logger...');

try {
  // Test basic logging
  console.log('✅ Testing basic logger import');
  logger.info('test', 'logger-test', 'import', 'Logger imported successfully');

  // Test context logger
  console.log('✅ Testing context logger');
  const contextLogger = createLogger('test', 'logger-test');
  contextLogger.info('context_test', 'Context logger working');

  // Test error logging with SimpleError
  console.log('✅ Testing error logging');
  const testError = new Error('Test error');
  testError.severity = ErrorSeverity.LOW;
  testError.context = {
    component: 'test',
    operation: 'error_test'
  };
  logger.logError(testError);

  console.log('✅ All logger tests passed - no circular dependencies');

} catch (error) {
  console.error('❌ Logger test failed:', error);
}