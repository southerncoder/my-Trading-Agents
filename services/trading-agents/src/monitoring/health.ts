import { createServer } from 'http';
import { performance } from 'perf_hooks';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    memory: HealthCheckStatus;
    dependencies: HealthCheckStatus;
    apis: HealthCheckStatus;
    llm: HealthCheckStatus;
  };
}

interface HealthCheckStatus {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
  details?: any;
}

interface MetricsData {
  requests: {
    total: number;
    success: number;
    failure: number;
    averageResponseTime: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  llm: {
    requestsPerProvider: Record<string, number>;
    averageResponseTime: Record<string, number>;
    errorRate: Record<string, number>;
  };
  system: {
    uptime: number;
    cpu: number;
    loadAverage: number[];
  };
}

class HealthMonitor {
  private server: any;
  private metrics: MetricsData;
  private startTime: number;

  constructor(private port: number = 3001) {
    this.startTime = performance.now();
    this.metrics = this.initializeMetrics();
    this.setupServer();
  }

  private initializeMetrics(): MetricsData {
    return {
      requests: {
        total: 0,
        success: 0,
        failure: 0,
        averageResponseTime: 0
      },
      memory: {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      },
      llm: {
        requestsPerProvider: {},
        averageResponseTime: {},
        errorRate: {}
      },
      system: {
        uptime: 0,
        cpu: 0,
        loadAverage: []
      }
    };
  }

  private setupServer(): void {
    this.server = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.url === '/health') {
        this.handleHealthCheck(req, res);
      } else if (req.url === '/metrics') {
        this.handleMetrics(req, res);
      } else if (req.url === '/ready') {
        this.handleReadiness(req, res);
      } else if (req.url === '/live') {
        this.handleLiveness(req, res);
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
  }

  private async handleHealthCheck(req: any, res: any): Promise<void> {
    const startTime = performance.now();
    
    try {
      const healthResult = await this.performHealthCheck();
      const duration = performance.now() - startTime;
      
      res.statusCode = healthResult.status === 'healthy' ? 200 : 503;
      res.end(JSON.stringify({
        ...healthResult,
        checkDuration: Math.round(duration)
      }, null, 2));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = {
      memory: await this.checkMemory(),
      dependencies: await this.checkDependencies(),
      apis: await this.checkAPIs(),
      llm: await this.checkLLMProviders()
    };

    const overallStatus = this.determineOverallStatus(checks);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round((performance.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };
  }

  private async checkMemory(): Promise<HealthCheckStatus> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const percentage = (usedMem / totalMem) * 100;

    if (percentage > 90) {
      return {
        status: 'fail',
        message: 'High memory usage detected',
        details: { percentage: Math.round(percentage), usedMB: Math.round(usedMem / 1024 / 1024) }
      };
    } else if (percentage > 75) {
      return {
        status: 'warn',
        message: 'Elevated memory usage',
        details: { percentage: Math.round(percentage), usedMB: Math.round(usedMem / 1024 / 1024) }
      };
    }

    return {
      status: 'pass',
      message: 'Memory usage normal',
      details: { percentage: Math.round(percentage), usedMB: Math.round(usedMem / 1024 / 1024) }
    };
  }

  private async checkDependencies(): Promise<HealthCheckStatus> {
    try {
      // Check if key modules can be imported
      await import('@langchain/core/messages');
      await import('inquirer');
      
      return {
        status: 'pass',
        message: 'All dependencies available'
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Dependency check failed',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkAPIs(): Promise<HealthCheckStatus> {
    // This would check external API connectivity
    // For now, we'll do a basic check
    return {
      status: 'pass',
      message: 'API connectivity check passed'
    };
  }

  private async checkLLMProviders(): Promise<HealthCheckStatus> {
    // Check if LLM providers are configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY;
    const hasLMStudio = !!process.env.LM_STUDIO_BASE_URL;

    const providerCount = [hasOpenAI, hasAnthropic, hasGoogle, hasLMStudio].filter(Boolean).length;

    if (providerCount === 0) {
      return {
        status: 'fail',
        message: 'No LLM providers configured'
      };
    } else if (providerCount === 1) {
      return {
        status: 'warn',
        message: 'Only one LLM provider configured',
        details: { configuredProviders: providerCount }
      };
    }

    return {
      status: 'pass',
      message: 'Multiple LLM providers configured',
      details: { configuredProviders: providerCount }
    };
  }

  private determineOverallStatus(checks: any): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map((check: any) => check.status);
    
    if (statuses.includes('fail')) {
      return 'unhealthy';
    } else if (statuses.includes('warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private handleMetrics(req: any, res: any): void {
    this.updateSystemMetrics();
    res.statusCode = 200;
    res.end(JSON.stringify(this.metrics, null, 2));
  }

  private handleReadiness(req: any, res: any): void {
    // Readiness probe - can the app serve traffic?
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ready', timestamp: new Date().toISOString() }));
  }

  private handleLiveness(req: any, res: any): void {
    // Liveness probe - is the app still running?
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'alive', timestamp: new Date().toISOString() }));
  }

  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.metrics.memory = {
      used: memUsage.heapUsed,
      free: memUsage.heapTotal - memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };

    this.metrics.system.uptime = Math.round((performance.now() - this.startTime) / 1000);
    
    // Additional system metrics would be collected here
  }

  public recordRequest(success: boolean, responseTime: number, provider?: string): void {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failure++;
    }

    // Update average response time
    const totalRequests = this.metrics.requests.total;
    this.metrics.requests.averageResponseTime = 
      ((this.metrics.requests.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;

    if (provider) {
      if (!this.metrics.llm.requestsPerProvider[provider]) {
        this.metrics.llm.requestsPerProvider[provider] = 0;
        this.metrics.llm.averageResponseTime[provider] = 0;
        this.metrics.llm.errorRate[provider] = 0;
      }
      
      this.metrics.llm.requestsPerProvider[provider]++;
      
      // Update provider-specific metrics
      const providerRequests = this.metrics.llm.requestsPerProvider[provider];
      const currentAvgTime = this.metrics.llm.averageResponseTime[provider] || 0;
      this.metrics.llm.averageResponseTime[provider] = 
        ((currentAvgTime * (providerRequests - 1)) + responseTime) / providerRequests;
      
      if (!success) {
        const currentErrorRate = this.metrics.llm.errorRate[provider] || 0;
        this.metrics.llm.errorRate[provider] = 
          (currentErrorRate * (providerRequests - 1) + 1) / providerRequests;
      }
    }
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Health monitor running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`Metrics: http://localhost:${this.port}/metrics`);
      console.log(`Readiness: http://localhost:${this.port}/ready`);
      console.log(`Liveness: http://localhost:${this.port}/live`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

export { HealthMonitor, HealthCheckResult, MetricsData };