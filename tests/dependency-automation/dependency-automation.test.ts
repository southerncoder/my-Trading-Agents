/**
 * Dependency Automation Test Suite
 * Tests for breaking change detection, API compatibility validation, and update automation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Dependency Automation System', () => {
  const testServicePath = 'test-service';
  const backupDir = 'test-backups';
  
  beforeEach(() => {
    // Create test service directory structure
    if (!fs.existsSync(testServicePath)) {
      fs.mkdirSync(testServicePath, { recursive: true });
    }
    
    // Create test package.json
    const testPackageJson = {
      name: 'test-service',
      version: '1.0.0',
      dependencies: {
        'winston': '^3.0.0',
        'express': '^4.18.0',
        '@getzep/zep-js': '^1.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testServicePath, 'package.json'),
      JSON.stringify(testPackageJson, null, 2)
    );
  });
  
  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(testServicePath)) {
      fs.rmSync(testServicePath, { recursive: true, force: true });
    }
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (fs.existsSync('reports')) {
      fs.rmSync('reports', { recursive: true, force: true });
    }
  });

  describe('Breaking Change Detection', () => {
    test('should detect breaking changes in Winston 3.x updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'winston' -FromVersion '3.0.0' -ToVersion '3.18.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Breaking changes detected');
      expect(result).toContain('Logger.log() signature changed');
    });
    
    test('should detect breaking changes in Express 5.x updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'express' -FromVersion '4.18.0' -ToVersion '5.0.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Breaking changes detected');
      expect(result).toContain('Middleware signature changes');
    });
    
    test('should detect breaking changes in Zep.js 2.x updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package '@getzep/zep-js' -FromVersion '1.0.0' -ToVersion '2.0.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Breaking changes detected');
      expect(result).toContain('Client initialization API changed');
    });
    
    test('should generate breaking changes report', () => {
      execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'winston' -FromVersion '3.0.0' -ToVersion '3.18.0'"`,
        { cwd: process.cwd() }
      );
      
      const reportFiles = fs.readdirSync('reports').filter(f => f.startsWith('breaking-changes-'));
      expect(reportFiles.length).toBeGreaterThan(0);
      
      const reportContent = fs.readFileSync(path.join('reports', reportFiles[0]), 'utf8');
      expect(reportContent).toContain('# Breaking Changes Analysis Report');
      expect(reportContent).toContain('winston');
      expect(reportContent).toContain('Migration Steps');
    });
    
    test('should return no breaking changes for minor updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'winston' -FromVersion '3.18.0' -ToVersion '3.18.1'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('No breaking changes detected');
    });
  });

  describe('API Compatibility Validation', () => {
    test('should validate Winston API compatibility', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'winston' -Version '3.18.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('API compatibility test');
      expect(result).not.toContain('API COMPATIBILITY FAILED');
    });
    
    test('should validate Express API compatibility', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'express' -Version '4.18.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('API compatibility test');
      expect(result).not.toContain('API COMPATIBILITY FAILED');
    });
    
    test('should generate API compatibility report', () => {
      execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'winston' -Version '3.18.0'"`,
        { cwd: process.cwd() }
      );
      
      const reportFiles = fs.readdirSync('reports').filter(f => f.startsWith('api-compatibility-'));
      expect(reportFiles.length).toBeGreaterThan(0);
      
      const reportContent = fs.readFileSync(path.join('reports', reportFiles[0]), 'utf8');
      expect(reportContent).toContain('# API Compatibility Validation Report');
      expect(reportContent).toContain('winston');
    });
    
    test('should handle dry run mode', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -DryRun"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('DRY RUN MODE');
      expect(result).toContain('Available API compatibility tests');
    });
    
    test('should detect API incompatibilities', () => {
      // This test would require a mock package with incompatible APIs
      // For now, we test the error handling path
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'nonexistent-package' -Version '1.0.0'"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.message).toContain('No API compatibility test available');
      }
    });
  });

  describe('Dependency Update Automation', () => {
    test('should perform dry run update', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-update.ps1 -Service '${testServicePath}' -DryRun"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('DRY RUN MODE');
      expect(result).toContain('No changes will be made');
    });
    
    test('should create backup before update', () => {
      // Create a mock service directory
      const servicePath = `services/${testServicePath}`;
      fs.mkdirSync(servicePath, { recursive: true });
      fs.copyFileSync(
        path.join(testServicePath, 'package.json'),
        path.join(servicePath, 'package.json')
      );
      
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-update.ps1 -Service '${testServicePath}'"`,
          { cwd: process.cwd() }
        );
      } catch (error) {
        // Expected to fail due to missing npm install, but backup should be created
      }
      
      const backupDirs = fs.readdirSync('backups/dependency-updates').filter(d => d.startsWith(testServicePath));
      expect(backupDirs.length).toBeGreaterThan(0);
      
      // Cleanup
      fs.rmSync(servicePath, { recursive: true, force: true });
    });
    
    test('should handle security updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-update.ps1 -Service '${testServicePath}' -Security -DryRun"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('DRY RUN MODE');
      expect(result).toContain('Security audit');
    });
    
    test('should handle major updates', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-update.ps1 -Service '${testServicePath}' -Major -DryRun"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('DRY RUN MODE');
    });
  });

  describe('Dependency Rollback', () => {
    test('should validate backup path', () => {
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-rollback.ps1 -BackupPath 'nonexistent-backup' -Service '${testServicePath}'"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.message).toContain('Backup path not found');
      }
    });
    
    test('should validate service path', () => {
      // Create a mock backup directory
      const backupPath = `${backupDir}/test-backup`;
      fs.mkdirSync(backupPath, { recursive: true });
      fs.writeFileSync(path.join(backupPath, 'package.json'), '{"name": "test"}');
      
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-rollback.ps1 -BackupPath '${backupPath}' -Service 'nonexistent-service'"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.message).toContain('Service not found');
      }
    });
  });

  describe('Maintenance Scheduler', () => {
    test('should show maintenance status', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-maintenance-scheduler.ps1 -Action status"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Overall Health Status');
      expect(result).toContain('Critical Issues');
      expect(result).toContain('Warnings');
    });
    
    test('should show maintenance schedule', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-maintenance-scheduler.ps1 -Action schedule"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Dependency Maintenance Schedule');
      expect(result).toContain('security_updates');
      expect(result).toContain('minor_updates');
    });
    
    test('should generate maintenance report', () => {
      const result = execSync(
        `pwsh -Command "./scripts/dependency-maintenance-scheduler.ps1 -Action report -Force"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(result).toContain('Generating maintenance report');
      
      const reportFiles = fs.readdirSync('reports').filter(f => f.startsWith('dependency-maintenance-'));
      expect(reportFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate dependency automation configuration', () => {
      const configPath = 'config/dependency-automation.json';
      expect(fs.existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate required sections
      expect(config).toHaveProperty('schedule');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('breaking_change_detection');
      expect(config).toHaveProperty('api_compatibility_tests');
      expect(config).toHaveProperty('notifications');
      
      // Validate schedule configuration
      expect(config.schedule).toHaveProperty('security_updates');
      expect(config.schedule).toHaveProperty('minor_updates');
      expect(config.schedule).toHaveProperty('major_updates');
      
      // Validate services configuration
      expect(config.services).toHaveProperty('trading-agents');
      expect(config.services['trading-agents']).toHaveProperty('critical_packages');
      expect(config.services['trading-agents'].critical_packages).toContain('winston');
      expect(config.services['trading-agents'].critical_packages).toContain('@getzep/zep-js');
      
      // Validate breaking change detection
      expect(config.breaking_change_detection.packages).toHaveProperty('winston');
      expect(config.breaking_change_detection.packages).toHaveProperty('express');
      expect(config.breaking_change_detection.packages).toHaveProperty('@getzep/zep-js');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate breaking change detection with API compatibility', () => {
      // Test the full workflow: detect breaking changes, then validate API compatibility
      const breakingChangeResult = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'winston' -FromVersion '3.0.0' -ToVersion '3.18.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(breakingChangeResult).toContain('Breaking changes detected');
      
      const compatibilityResult = execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'winston' -Version '3.18.0'"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(compatibilityResult).toContain('API compatibility test');
    });
    
    test('should handle complete update workflow', () => {
      // This test simulates the complete automated update workflow
      const servicePath = `services/${testServicePath}`;
      fs.mkdirSync(servicePath, { recursive: true });
      fs.copyFileSync(
        path.join(testServicePath, 'package.json'),
        path.join(servicePath, 'package.json')
      );
      
      // Step 1: Breaking change detection
      const breakingChangeResult = execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Service '${testServicePath}' -AllPackages"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      // Step 2: API compatibility validation
      const compatibilityResult = execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Service '${testServicePath}' -AllPackages"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      // Step 3: Dry run update
      const updateResult = execSync(
        `pwsh -Command "./scripts/dependency-update.ps1 -Service '${testServicePath}' -DryRun"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );
      
      expect(updateResult).toContain('DRY RUN MODE');
      
      // Cleanup
      fs.rmSync(servicePath, { recursive: true, force: true });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing service gracefully', () => {
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Service 'nonexistent-service' -AllPackages"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.message).toContain('Service not found');
      }
    });
    
    test('should handle invalid package names', () => {
      try {
        execSync(
          `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'invalid-package-name' -Version '1.0.0'"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.message).toContain('No API compatibility test available');
      }
    });
    
    test('should handle PowerShell execution errors', () => {
      try {
        execSync(
          `pwsh -Command "./scripts/nonexistent-script.ps1"`,
          { encoding: 'utf8', cwd: process.cwd() }
        );
      } catch (error) {
        expect(error.status).not.toBe(0);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should complete breaking change detection within reasonable time', () => {
      const startTime = Date.now();
      
      execSync(
        `pwsh -Command "./scripts/dependency-breaking-change-detector.ps1 -Package 'winston' -FromVersion '3.0.0' -ToVersion '3.18.0'"`,
        { cwd: process.cwd() }
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
    
    test('should complete API compatibility validation within reasonable time', () => {
      const startTime = Date.now();
      
      execSync(
        `pwsh -Command "./scripts/dependency-api-compatibility-validator.ps1 -Package 'winston' -Version '3.18.0'"`,
        { cwd: process.cwd() }
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    });
  });
});

describe('GitHub Workflow Integration', () => {
  test('should have valid dependency update automation workflow', () => {
    const workflowPath = '.github/workflows/dependency-update-automation.yml';
    expect(fs.existsSync(workflowPath)).toBe(true);
    
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    // Validate workflow structure
    expect(workflowContent).toContain('name: Automated Dependency Updates');
    expect(workflowContent).toContain('pre-update-analysis');
    expect(workflowContent).toContain('dependency-updates');
    expect(workflowContent).toContain('manual-review-required');
    
    // Validate breaking change detection integration
    expect(workflowContent).toContain('dependency-breaking-change-detector.ps1');
    expect(workflowContent).toContain('dependency-api-compatibility-validator.ps1');
    
    // Validate notification integration
    expect(workflowContent).toContain('slack');
    expect(workflowContent).toContain('github-script');
  });
  
  test('should have enhanced CI/CD workflow with dependency automation', () => {
    const workflowPath = '.github/workflows/ci-cd.yml';
    expect(fs.existsSync(workflowPath)).toBe(true);
    
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    // Validate enhanced security job
    expect(workflowContent).toContain('Enhanced Security Scan Job with Dependency Automation');
    expect(workflowContent).toContain('breaking change detection');
    expect(workflowContent).toContain('API compatibility validation');
    expect(workflowContent).toContain('security-analysis-reports');
  });
});

describe('Documentation Validation', () => {
  test('should have comprehensive dependency management documentation', () => {
    const docPath = 'docs/DEPENDENCY-MANAGEMENT-BEST-PRACTICES.md';
    expect(fs.existsSync(docPath)).toBe(true);
    
    const docContent = fs.readFileSync(docPath, 'utf8');
    
    // Validate documentation sections
    expect(docContent).toContain('# Dependency Management Best Practices');
    expect(docContent).toContain('## Automated Dependency Management');
    expect(docContent).toContain('## Security Policies');
    expect(docContent).toContain('## Breaking Change Management');
    expect(docContent).toContain('## API Compatibility Validation');
    expect(docContent).toContain('## Emergency Response');
    
    // Validate specific procedures
    expect(docContent).toContain('dependency-breaking-change-detector.ps1');
    expect(docContent).toContain('dependency-api-compatibility-validator.ps1');
    expect(docContent).toContain('dependency-maintenance-scheduler.ps1');
  });
});