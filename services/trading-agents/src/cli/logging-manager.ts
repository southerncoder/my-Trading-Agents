import { confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { createLogger, setGlobalLogLevel, getGlobalLogLevel } from '../utils/enhanced-logger';

const logger = createLogger('cli', 'logging-manager');

export interface LoggingOptions {
  verboseLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  enableFileLogging?: boolean;
  logToConsole?: boolean;
}

export const LOG_LEVEL_OPTIONS = [
  { 
    name: 'Debug - Detailed debugging information (most verbose)', 
    value: 'debug' as const,
    description: 'Shows all internal operations, API calls, and data flow'
  },
  { 
    name: 'Info - General information about operations', 
    value: 'info' as const,
    description: 'Shows major workflow steps and status updates'
  },
  { 
    name: 'Warn - Warning messages only', 
    value: 'warn' as const,
    description: 'Shows warnings and potential issues'
  },
  { 
    name: 'Error - Error messages only', 
    value: 'error' as const,
    description: 'Shows only errors and critical failures'
  },
  { 
    name: 'Critical - Critical errors only (least verbose)', 
    value: 'critical' as const,
    description: 'Shows only system-critical failures'
  }
];

export class LoggingManager {
  private static instance: LoggingManager;
  private currentOptions: LoggingOptions = {
    verboseLogging: false,
    logLevel: 'info',
    enableFileLogging: true,
    logToConsole: true
  };

  public static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  public async configureVerboseLogging(interactive: boolean = true): Promise<LoggingOptions> {
    if (interactive) {
      return await this.interactiveConfiguration();
    } else {
      return this.currentOptions;
    }
  }

  private async interactiveConfiguration(): Promise<LoggingOptions> {
    console.log(chalk.blue('\n🔧 Logging Configuration'));
    console.log(chalk.gray('Configure detailed logging for debugging and monitoring\n'));

    const enableVerbose = await confirm({
      message: 'Enable verbose logging for this session?',
      default: false
    });

    let logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
    let enableFileLogging: boolean;
    let logToConsole: boolean;

    if (enableVerbose) {
      logLevel = await select({
        message: 'Select logging level:',
        choices: LOG_LEVEL_OPTIONS.map(option => ({
          name: option.name,
          value: option.value
        })),
        default: 'info'
      }) as 'debug' | 'info' | 'warn' | 'error' | 'critical';

      enableFileLogging = await confirm({
        message: 'Save logs to file?',
        default: true
      });

      logToConsole = true;
      if (logLevel === 'debug') {
        logToConsole = await confirm({
          message: 'Show logs in console output?',
          default: true
        });
      }

      // Show configuration summary
      console.log(chalk.green('\n✓ Verbose logging configuration:'));
      console.log(chalk.gray(`  Log Level: ${logLevel.toUpperCase()}`));
      console.log(chalk.gray(`  File Logging: ${enableFileLogging ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.gray(`  Console Output: ${logToConsole ? 'Enabled' : 'Disabled'}`));
      
      const selectedOption = LOG_LEVEL_OPTIONS.find(opt => opt.value === logLevel);
      if (selectedOption) {
        console.log(chalk.gray(`  Description: ${selectedOption.description}`));
      }
    } else {
      logLevel = 'info';
      enableFileLogging = true;
      logToConsole = true;
    }

    this.currentOptions = {
      verboseLogging: enableVerbose,
      logLevel: logLevel!,
      enableFileLogging: enableFileLogging!,
      logToConsole: logToConsole!
    };

    // Apply the logging configuration
    this.applyLoggingConfiguration(this.currentOptions);

    return this.currentOptions;
  }

  public applyLoggingConfiguration(options: LoggingOptions): void {
    this.currentOptions = options;

    // Set global log level
    setGlobalLogLevel(options.logLevel);

    // Log the configuration change
    logger.info('configure_logging', `Logging configuration applied`, {
      verboseLogging: options.verboseLogging,
      logLevel: options.logLevel,
      enableFileLogging: options.enableFileLogging,
      logToConsole: options.logToConsole
    });

    if (options.verboseLogging) {
      console.log(chalk.green(`\n🔍 Verbose logging enabled at ${options.logLevel.toUpperCase()} level`));
      
      if (options.logLevel === 'debug') {
        console.log(chalk.yellow('⚠️  Debug logging will show detailed internal operations'));
        console.log(chalk.gray('   This may include sensitive information like API responses'));
      }
    }
  }

  public getCurrentOptions(): LoggingOptions {
    return { ...this.currentOptions };
  }

  public setVerboseMode(enabled: boolean, logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical'): void {
    this.currentOptions.verboseLogging = enabled;
    if (logLevel) {
      this.currentOptions.logLevel = logLevel;
    }
    this.applyLoggingConfiguration(this.currentOptions);
  }

  /**
   * Set verbose mode without console output (for testing)
   */
  public setVerboseModeQuiet(enabled: boolean, logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical'): void {
    this.currentOptions.verboseLogging = enabled;
    if (logLevel) {
      this.currentOptions.logLevel = logLevel;
    }
    // Set global log level without logging the configuration change
    setGlobalLogLevel(this.currentOptions.logLevel);
  }

  /**
   * Reset to default configuration (for testing)
   */
  public resetToDefaults(): void {
    this.currentOptions = {
      verboseLogging: false,
      logLevel: 'info',
      enableFileLogging: true,
      logToConsole: true
    };
    setGlobalLogLevel('info');
  }

  public isVerboseEnabled(): boolean {
    return this.currentOptions.verboseLogging;
  }

  public getLogLevel(): string {
    return this.currentOptions.logLevel;
  }

  public logSystemInfo(): void {
    if (this.currentOptions.verboseLogging) {
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        currentLogLevel: getGlobalLogLevel(),
        verboseLogging: this.currentOptions.verboseLogging
      };

      logger.debug('system_info', 'System information collected', systemInfo);

      if (this.currentOptions.logToConsole && this.currentOptions.logLevel === 'debug') {
        console.log(chalk.blue('\n🔍 System Information:'));
        console.log(chalk.gray(`  Node.js: ${systemInfo.nodeVersion}`));
        console.log(chalk.gray(`  Platform: ${systemInfo.platform} (${systemInfo.arch})`));
        console.log(chalk.gray(`  Memory: ${Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)}MB used`));
        console.log(chalk.gray(`  Uptime: ${Math.round(systemInfo.uptime)}s`));
        console.log(chalk.gray(`  Log Level: ${systemInfo.currentLogLevel.toUpperCase()}`));
      }
    }
  }

  public logOperationStart(operation: string, details?: Record<string, any>): void {
    if (this.currentOptions.verboseLogging) {
      logger.info('operation_start', `Starting operation: ${operation}`, details);
      
      if (this.currentOptions.logToConsole && ['debug', 'info'].includes(this.currentOptions.logLevel)) {
        console.log(chalk.blue(`\n🚀 Starting: ${operation}`));
        if (details && this.currentOptions.logLevel === 'debug') {
          try {
            console.log(chalk.gray(`   Details: ${JSON.stringify(details, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (value === details) return '[Circular]';
                if (Object.prototype.hasOwnProperty.call(value, 'self') && value.self === value) return '[Circular]';
              }
              return value;
            }, 2)}`));
          } catch (error) {
            console.log(chalk.gray(`   Details: [Serialization error: ${(error as Error).message}]`));
          }
        }
      }
    }
  }

  public logOperationEnd(operation: string, duration?: number, results?: Record<string, any>): void {
    if (this.currentOptions.verboseLogging) {
      const metadata: Record<string, any> = {};
      if (duration !== undefined) metadata.duration = duration;
      if (results) metadata.results = results;

      logger.info('operation_end', `Completed operation: ${operation}`, metadata);
      
      if (this.currentOptions.logToConsole && ['debug', 'info'].includes(this.currentOptions.logLevel)) {
        const durationStr = duration ? ` (${duration}ms)` : '';
        console.log(chalk.green(`✓ Completed: ${operation}${durationStr}`));
        if (results && this.currentOptions.logLevel === 'debug') {
          console.log(chalk.gray(`   Results: ${JSON.stringify(results, null, 2)}`));
        }
      }
    }
  }

  public logApiCall(endpoint: string, method: string, status?: number, duration?: number): void {
    if (this.currentOptions.verboseLogging && ['debug'].includes(this.currentOptions.logLevel)) {
      const metadata: Record<string, any> = { endpoint, method };
      if (status !== undefined) metadata.status = status;
      if (duration !== undefined) metadata.duration = duration;

      logger.debug('api_call', `API call: ${method} ${endpoint}`, metadata);
      
      if (this.currentOptions.logToConsole) {
        const statusStr = status ? ` (${status})` : '';
        const durationStr = duration ? ` - ${duration}ms` : '';
        console.log(chalk.cyan(`🌐 API: ${method} ${endpoint}${statusStr}${durationStr}`));
      }
    }
  }

  public logAgentActivity(agentName: string, activity: string, details?: Record<string, any>): void {
    if (this.currentOptions.verboseLogging && ['debug', 'info'].includes(this.currentOptions.logLevel)) {
      logger.info('agent_activity', `${agentName}: ${activity}`, details);
      
      if (this.currentOptions.logToConsole) {
        console.log(chalk.magenta(`🤖 ${agentName}: ${activity}`));
        if (details && this.currentOptions.logLevel === 'debug') {
          console.log(chalk.gray(`   ${JSON.stringify(details, null, 2)}`));
        }
      }
    }
  }

  public createOperationTimer(operation: string): () => number {
    const startTime = Date.now();
    
    if (this.currentOptions.verboseLogging) {
      this.logOperationStart(operation);
    }

    return (): number => {
      const duration = Date.now() - startTime;
      if (this.currentOptions.verboseLogging) {
        this.logOperationEnd(operation, duration);
      }
      return duration;
    };
  }
}

// Export singleton instance
export const loggingManager = LoggingManager.getInstance();

// Helper functions for common logging patterns
export async function configureVerboseLogging(interactive: boolean = true): Promise<LoggingOptions> {
  return await loggingManager.configureVerboseLogging(interactive);
}

export function setVerboseMode(enabled: boolean, logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'critical'): void {
  loggingManager.setVerboseMode(enabled, logLevel);
}

export function logSystemInfo(): void {
  loggingManager.logSystemInfo();
}

export function logOperationStart(operation: string, details?: Record<string, any>): void {
  loggingManager.logOperationStart(operation, details);
}

export function logOperationEnd(operation: string, duration?: number, results?: Record<string, any>): void {
  loggingManager.logOperationEnd(operation, duration, results);
}

export function logApiCall(endpoint: string, method: string, status?: number, duration?: number): void {
  loggingManager.logApiCall(endpoint, method, status, duration);
}

export function logAgentActivity(agentName: string, activity: string, details?: Record<string, any>): void {
  loggingManager.logAgentActivity(agentName, activity, details);
}

export function createOperationTimer(operation: string): () => number {
  return loggingManager.createOperationTimer(operation);
}