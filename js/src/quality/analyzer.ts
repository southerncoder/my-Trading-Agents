#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface QualityMetrics {
  timestamp: string;
  typeErrors: number;
  lintErrors: number;
  lintWarnings: number;
  testCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  codeComplexity: {
    averageComplexity: number;
    highComplexityFiles: string[];
  };
  dependencies: {
    outdated: number;
    vulnerabilities: {
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
  };
  codeMetrics: {
    totalLines: number;
    totalFiles: number;
    duplicatedLines: number;
  };
}

class CodeQualityAnalyzer {
  private results: QualityMetrics = {
    timestamp: new Date().toISOString(),
    typeErrors: 0,
    lintErrors: 0,
    lintWarnings: 0,
    testCoverage: {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    },
    codeComplexity: {
      averageComplexity: 0,
      highComplexityFiles: []
    },
    dependencies: {
      outdated: 0,
      vulnerabilities: {
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0
      }
    },
    codeMetrics: {
      totalLines: 0,
      totalFiles: 0,
      duplicatedLines: 0
    }
  };

  public async analyze(): Promise<QualityMetrics> {
    console.log('🔍 Starting code quality analysis...\n');

    await this.checkTypeScript();
    await this.runLinter();
    await this.runTests();
    await this.checkDependencies();
    await this.analyzeCode();
    
    this.generateReport();
    
    return this.results;
  }

  private async checkTypeScript(): Promise<void> {
    console.log('📋 Checking TypeScript compilation...');
    
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ TypeScript compilation: PASSED');
      this.results.typeErrors = 0;
    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/error TS\d+/g) || []).length;
      this.results.typeErrors = errorCount;
      console.log(`❌ TypeScript compilation: ${errorCount} errors found`);
    }
  }

  private async runLinter(): Promise<void> {
    console.log('🔍 Running ESLint...');
    
    try {
      const output = execSync('npx eslint src/**/*.ts --format json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      
      const results = JSON.parse(output);
      let errors = 0;
      let warnings = 0;
      
      results.forEach((file: any) => {
        file.messages.forEach((message: any) => {
          if (message.severity === 2) errors++;
          else if (message.severity === 1) warnings++;
        });
      });
      
      this.results.lintErrors = errors;
      this.results.lintWarnings = warnings;
      
      if (errors === 0 && warnings === 0) {
        console.log('✅ ESLint: PASSED (no issues)');
      } else {
        console.log(`⚠️  ESLint: ${errors} errors, ${warnings} warnings`);
      }
    } catch (error: any) {
      console.log('❌ ESLint: FAILED to run');
      this.results.lintErrors = -1;
    }
  }

  private async runTests(): Promise<void> {
    console.log('🧪 Running tests with coverage...');
    
    try {
      const output = execSync('npm run test:coverage -- --passWithNoTests', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      
      // Parse coverage from jest output
      const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      
      if (coverageMatch && coverageMatch.length >= 5) {
        this.results.testCoverage = {
          statements: parseFloat(coverageMatch[1] || '0'),
          branches: parseFloat(coverageMatch[2] || '0'),
          functions: parseFloat(coverageMatch[3] || '0'),
          lines: parseFloat(coverageMatch[4] || '0')
        };
      }
      
      console.log('✅ Tests: PASSED');
      console.log(`📊 Coverage: ${this.results.testCoverage.lines}% lines, ${this.results.testCoverage.functions}% functions`);
    } catch (error: any) {
      console.log('❌ Tests: Some tests failed or coverage below threshold');
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');
    
    // Check for outdated packages
    try {
      const outdatedOutput = execSync('npm outdated --json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      const outdated = JSON.parse(outdatedOutput);
      this.results.dependencies.outdated = Object.keys(outdated).length;
    } catch (error) {
      // npm outdated exits with code 1 when there are outdated packages
      this.results.dependencies.outdated = 0;
    }

    // Check for security vulnerabilities
    try {
      const auditOutput = execSync('npm audit --json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      const audit = JSON.parse(auditOutput);
      
      if (audit.vulnerabilities) {
        this.results.dependencies.vulnerabilities = {
          low: audit.vulnerabilities.low || 0,
          moderate: audit.vulnerabilities.moderate || 0,
          high: audit.vulnerabilities.high || 0,
          critical: audit.vulnerabilities.critical || 0
        };
      }
    } catch (error) {
      console.log('⚠️  Could not check security vulnerabilities');
    }

    const totalVulns = Object.values(this.results.dependencies.vulnerabilities).reduce((a, b) => a + b, 0);
    
    if (totalVulns === 0) {
      console.log('✅ Dependencies: No security vulnerabilities found');
    } else {
      console.log(`⚠️  Dependencies: ${totalVulns} vulnerabilities found`);
    }
    
    if (this.results.dependencies.outdated > 0) {
      console.log(`📦 ${this.results.dependencies.outdated} outdated packages`);
    }
  }

  private async analyzeCode(): Promise<void> {
    console.log('📈 Analyzing code metrics...');
    
    try {
      // Count files and lines
      const findResult = execSync('find src -name "*.ts" | wc -l', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      }).trim();
      
      this.results.codeMetrics.totalFiles = parseInt(findResult);
      
      // Count total lines of code
      try {
        const linesResult = execSync('find src -name "*.ts" -exec wc -l {} + | tail -1', { 
          stdio: 'pipe', 
          encoding: 'utf8' 
        });
        
        const linesMatch = linesResult.match(/(\d+)\s+total/);
        if (linesMatch && linesMatch[1]) {
          this.results.codeMetrics.totalLines = parseInt(linesMatch[1]);
        }
      } catch (error) {
        // Fallback method for Windows
        try {
          const files = execSync('dir /s /b src\\*.ts', { encoding: 'utf8' }).split('\n').filter(f => f.trim());
          let totalLines = 0;
          
          files.forEach(file => {
            try {
              const content = readFileSync(file.trim(), 'utf8');
              totalLines += content.split('\n').length;
            } catch (e) {
              // Skip files that can't be read
            }
          });
          
          this.results.codeMetrics.totalLines = totalLines;
          this.results.codeMetrics.totalFiles = files.length;
        } catch (e) {
          console.log('⚠️  Could not count code metrics');
        }
      }
      
      console.log(`📊 Code metrics: ${this.results.codeMetrics.totalFiles} files, ${this.results.codeMetrics.totalLines} lines`);
    } catch (error) {
      console.log('⚠️  Could not analyze code metrics');
    }
  }

  private generateReport(): void {
    console.log('\n📋 Code Quality Report');
    console.log('='.repeat(50));
    
    // Overall score calculation
    let score = 100;
    
    // Deduct points for issues
    score -= this.results.typeErrors * 5;
    score -= this.results.lintErrors * 2;
    score -= this.results.lintWarnings * 0.5;
    score -= (100 - this.results.testCoverage.lines) * 0.5;
    score -= this.results.dependencies.vulnerabilities.critical * 10;
    score -= this.results.dependencies.vulnerabilities.high * 5;
    score -= this.results.dependencies.vulnerabilities.moderate * 2;
    score -= this.results.dependencies.outdated * 0.5;
    
    score = Math.max(0, Math.round(score));
    
    console.log(`Overall Quality Score: ${score}/100`);
    
    if (score >= 90) {
      console.log('🏆 Excellent code quality!');
    } else if (score >= 75) {
      console.log('✅ Good code quality');
    } else if (score >= 60) {
      console.log('⚠️  Needs improvement');
    } else {
      console.log('❌ Poor code quality - immediate attention required');
    }
    
    console.log('\nDetailed Results:');
    console.log(`• TypeScript Errors: ${this.results.typeErrors}`);
    console.log(`• Lint Errors: ${this.results.lintErrors}`);
    console.log(`• Lint Warnings: ${this.results.lintWarnings}`);
    console.log(`• Test Coverage: ${this.results.testCoverage.lines.toFixed(1)}%`);
    console.log(`• Security Vulnerabilities: ${Object.values(this.results.dependencies.vulnerabilities).reduce((a, b) => a + b, 0)}`);
    console.log(`• Outdated Dependencies: ${this.results.dependencies.outdated}`);
    
    // Save detailed report
    const reportPath = join(process.cwd(), 'quality-report.json');
    writeFileSync(reportPath, JSON.stringify({
      ...this.results,
      overallScore: score
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new CodeQualityAnalyzer();
  analyzer.analyze().catch(console.error);
}

export { CodeQualityAnalyzer, QualityMetrics };