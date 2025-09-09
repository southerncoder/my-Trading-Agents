import { logger } from '../../src/utils/enhanced-logger';
import { createCLI } from '../../src/cli/main';

async function main() {
  logger.info('system', 'demo', 'startup', 'Logging demo started', { env: process.env.NODE_ENV, logLevel: process.env.LOG_LEVEL });

  // Emit logs at all levels
  logger.debug('system', 'demo', 'debug', 'Debug log example', { foo: 'bar' });
  logger.info('system', 'demo', 'info', 'Info log example', { bar: 'baz' });
  logger.warn('system', 'demo', 'warn', 'Warn log example', { warning: true });
  logger.error('system', 'demo', 'error', 'Error log example', { error: 'simulated' });
  logger.error('system', 'demo', 'critical', 'Critical log example', { critical: true });

  // Run a basic CLI command (simulate menu or help)
  const cli = await createCLI();
  cli.parse(['--help']);

  logger.info('system', 'demo', 'shutdown', 'Logging demo completed');
}

main().catch(err => {
  logger.error('system', 'demo', 'fatal', 'Demo script failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
