import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Create a minimal mock for testing the core functionality
const mockInquirer = {
  prompt: jest.fn()
};

// Mock inquirer and chalk
jest.mock('inquirer', () => mockInquirer);
jest.mock('chalk', () => ({
  blue: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  magenta: jest.fn((str: string) => str)
}));

import { LoggingManager, LOG_LEVEL_OPTIONS } from '../src/cli/logging-manager';
import { getGlobalLogLevel, setGlobalLogLevel } from '../src/utils/enhanced-logger';

describe('Verbose Logging Integration Tests', () => {
  let loggingManager: LoggingManager;
  let originalLogLevel: string;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Store original log level
    originalLogLevel = getGlobalLogLevel();
    
    // Get fresh instance and reset to defaults
    loggingManager = LoggingManager.getInstance();
    loggingManager.resetToDefaults();
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original log level
    setGlobalLogLevel(originalLogLevel as any);
    
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('LoggingManager Configuration', () => {
    it('should initialize with default configuration', () => {
      const options = loggingManager.getCurrentOptions();
      
      expect(options.verboseLogging).toBe(false);
      expect(options.logLevel).toBe('info');
      expect(options.enableFileLogging).toBe(true);
      expect(options.logToConsole).toBe(true);
    });

    it('should enable verbose mode programmatically', () => {
      loggingManager.setVerboseMode(true, 'debug');
      
      const options = loggingManager.getCurrentOptions();
      expect(options.verboseLogging).toBe(true);
      expect(options.logLevel).toBe('debug');
      expect(getGlobalLogLevel()).toBe('debug');
    });

    it('should disable verbose mode programmatically', () => {
      loggingManager.setVerboseMode(true, 'debug');
      loggingManager.setVerboseMode(false, 'info');
      
      const options = loggingManager.getCurrentOptions();
      expect(options.verboseLogging).toBe(false);
      expect(options.logLevel).toBe('info');
      expect(getGlobalLogLevel()).toBe('info');
    });

    it('should apply logging configuration correctly', () => {
      const testConfig = {
        verboseLogging: true,
        logLevel: 'debug' as const,
        enableFileLogging: false,
        logToConsole: true
      };

      loggingManager.applyLoggingConfiguration(testConfig);
      
      const options = loggingManager.getCurrentOptions();
      expect(options).toEqual(testConfig);
      expect(getGlobalLogLevel()).toBe('debug');
    });
  });

  describe('Log Level Options', () => {
    it('should have correct log level options available', () => {
      expect(LOG_LEVEL_OPTIONS).toHaveLength(5);
      
      const levels = LOG_LEVEL_OPTIONS.map(option => option.value);
      expect(levels).toEqual(['debug', 'info', 'warn', 'error', 'critical']);
      
      // Verify each option has required properties
      LOG_LEVEL_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('description');
        expect(typeof option.name).toBe('string');
        expect(typeof option.value).toBe('string');
        expect(typeof option.description).toBe('string');
      });
    });
  });

  describe('Verbose Logging Features', () => {
    beforeEach(() => {
      loggingManager.setVerboseMode(true, 'debug');
    });

    it('should log system information when verbose enabled', () => {
      loggingManager.logSystemInfo();
      
      // Should have logged system info to console
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('System Information:')
      );
    });

    it('should track operation timing', () => {
      const timer = loggingManager.createOperationTimer('test-operation');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }
      
      const duration = timer();
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be reasonable
    });

    it('should log operation start and end', () => {
      loggingManager.logOperationStart('test-operation', { param: 'value' });
      loggingManager.logOperationEnd('test-operation', 150, { result: 'success' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting: test-operation')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed: test-operation (150ms)')
      );
    });

    it('should log API calls in debug mode', () => {
      loggingManager.logApiCall('/api/test', 'GET', 200, 123);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('API: GET /api/test (200) - 123ms')
      );
    });

    it('should log agent activity', () => {
      loggingManager.logAgentActivity('TestAgent', 'processing data', { 
        dataPoints: 100 
      });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestAgent: processing data')
      );
    });

    it('should not log to console when logToConsole is false', () => {
      loggingManager.applyLoggingConfiguration({
        verboseLogging: true,
        logLevel: 'debug',
        logToConsole: false,
        enableFileLogging: true
      });

      loggingManager.logOperationStart('silent-operation');
      
      // Should not have logged to console
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Starting: silent-operation')
      );
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter logs based on log level - info level', () => {
      loggingManager.setVerboseMode(true, 'info');
      consoleLogSpy.mockClear(); // Clear configuration messages
      
      // This should log (info level)
      loggingManager.logOperationStart('info-operation');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Starting: info-operation')
      );
      
      // This should not log (debug level but current level is info)
      consoleLogSpy.mockClear();
      loggingManager.logApiCall('/api/debug', 'GET', 200, 50);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should filter logs based on log level - warn level', () => {
      loggingManager.setVerboseMode(true, 'warn');
      consoleLogSpy.mockClear(); // Clear configuration messages
      
      // Info operations should not log
      loggingManager.logOperationStart('info-operation');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      
      // Agent activity should not log
      loggingManager.logAgentActivity('TestAgent', 'info activity');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log everything in debug mode', () => {
      loggingManager.setVerboseMode(true, 'debug');
      consoleLogSpy.mockClear(); // Clear configuration messages
      
      loggingManager.logOperationStart('debug-operation');
      loggingManager.logApiCall('/api/debug', 'GET', 200, 50);
      loggingManager.logAgentActivity('TestAgent', 'debug activity');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Non-Verbose Mode', () => {
    beforeEach(() => {
      loggingManager.setVerboseMode(false, 'info');
    });

    it('should not log when verbose mode is disabled', () => {
      loggingManager.logSystemInfo();
      loggingManager.logOperationStart('test-operation');
      loggingManager.logApiCall('/api/test', 'GET', 200);
      loggingManager.logAgentActivity('TestAgent', 'test activity');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should still track timing when verbose is disabled', () => {
      const timer = loggingManager.createOperationTimer('silent-operation');
      const duration = timer();
      
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle invalid log levels gracefully', () => {
      // This should not throw and should default to a safe value
      const invalidConfig = {
        verboseLogging: true,
        logLevel: 'invalid' as any,
        enableFileLogging: true,
        logToConsole: true
      };
      
      expect(() => {
        loggingManager.applyLoggingConfiguration(invalidConfig);
      }).not.toThrow();
    });

    it('should maintain state between multiple configurations', () => {
      loggingManager.setVerboseMode(true, 'debug');
      expect(loggingManager.isVerboseEnabled()).toBe(true);
      expect(loggingManager.getLogLevel()).toBe('debug');
      
      loggingManager.setVerboseMode(false, 'warn');
      expect(loggingManager.isVerboseEnabled()).toBe(false);
      expect(loggingManager.getLogLevel()).toBe('warn');
    });
  });

  describe('Integration with Enhanced Logger', () => {
    it('should sync with global log level', () => {
      loggingManager.setVerboseMode(true, 'critical');
      expect(getGlobalLogLevel()).toBe('critical');
      
      loggingManager.setVerboseMode(true, 'debug');
      expect(getGlobalLogLevel()).toBe('debug');
    });

    it('should maintain consistency when global level changes', () => {
      setGlobalLogLevel('warn');
      
      // The logging manager should maintain its own state
      const options = loggingManager.getCurrentOptions();
      expect(options.logLevel).toBe('info'); // Should still be the default
      
      // But when applying config, it should sync
      loggingManager.applyLoggingConfiguration(options);
      expect(getGlobalLogLevel()).toBe('info');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid consecutive logging calls', () => {
      loggingManager.setVerboseMode(true, 'debug');
      
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        loggingManager.logOperationStart(`operation-${i}`);
        loggingManager.logOperationEnd(`operation-${i}`, 1);
      }
      const duration = Date.now() - start;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large metadata objects', () => {
      loggingManager.setVerboseMode(true, 'debug');
      
      const largeMetadata = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` })),
        timestamp: Date.now(),
        config: { deeply: { nested: { object: { with: { many: { levels: 'value' } } } } } }
      };
      
      expect(() => {
        loggingManager.logOperationStart('large-metadata-test', largeMetadata);
      }).not.toThrow();
    });
  });
});

describe('CLI Integration with Verbose Logging', () => {
  describe('Command Line Arguments', () => {
    it('should parse verbose flag correctly', () => {
      // This test would need to be run with actual CLI argument parsing
      // For now, we test the configuration logic
      const mockOptions = {
        verbose: true,
        logLevel: 'debug',
        logToConsole: true,
        fileLogging: true
      };
      
      const loggingManager = LoggingManager.getInstance();
      loggingManager.applyLoggingConfiguration({
        verboseLogging: mockOptions.verbose,
        logLevel: mockOptions.logLevel as any,
        logToConsole: mockOptions.logToConsole,
        enableFileLogging: mockOptions.fileLogging
      });
      
      expect(loggingManager.isVerboseEnabled()).toBe(true);
      expect(loggingManager.getLogLevel()).toBe('debug');
    });

    it('should handle log level argument correctly', () => {
      const testLevels = ['debug', 'info', 'warn', 'error', 'critical'];
      const loggingManager = LoggingManager.getInstance();
      
      testLevels.forEach(level => {
        loggingManager.setVerboseMode(true, level as any);
        expect(loggingManager.getLogLevel()).toBe(level);
        expect(getGlobalLogLevel()).toBe(level);
      });
    });
  });

  describe('Interactive Configuration', () => {
    it('should provide non-interactive configuration option', async () => {
      const loggingManager = LoggingManager.getInstance();
      
      // Non-interactive should return current options immediately
      const options = await loggingManager.configureVerboseLogging(false);
      
      expect(options).toBeDefined();
      expect(typeof options.verboseLogging).toBe('boolean');
      expect(typeof options.logLevel).toBe('string');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let loggingManager: LoggingManager;

  beforeEach(() => {
    loggingManager = LoggingManager.getInstance();
  });

  it('should handle undefined metadata gracefully', () => {
    loggingManager.setVerboseMode(true, 'debug');
    
    expect(() => {
      loggingManager.logOperationStart('test', undefined);
      loggingManager.logOperationEnd('test', undefined, undefined);
      loggingManager.logAgentActivity('Agent', 'action', undefined);
    }).not.toThrow();
  });

  it('should handle null values in metadata', () => {
    loggingManager.setVerboseMode(true, 'debug');
    
    expect(() => {
      loggingManager.logOperationStart('test', { nullValue: null, undefinedValue: undefined });
    }).not.toThrow();
  });

  it('should handle circular references in metadata', () => {
    loggingManager.setVerboseMode(true, 'debug');
    
    const circular: any = { name: 'test' };
    circular.self = circular;
    
    expect(() => {
      loggingManager.logOperationStart('test', circular);
    }).not.toThrow();
  });

  it('should handle empty strings and zero values', () => {
    loggingManager.setVerboseMode(true, 'debug');
    
    expect(() => {
      loggingManager.logOperationStart('', {});
      loggingManager.logOperationEnd('test', 0, {});
      loggingManager.logApiCall('', '', 0, 0);
    }).not.toThrow();
  });
});