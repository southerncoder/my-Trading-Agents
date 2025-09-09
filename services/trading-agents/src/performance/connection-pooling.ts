/**
 * Connection Pooling System for External API Calls
 * 
 * Implements efficient connection pooling and request management to reduce
 * connection overhead and improve throughput for data fetching operations.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { createLogger } from '../utils/enhanced-logger';

export interface ConnectionPoolConfig {
  maxSockets: number;
  maxSocketsPerHost: number;
  keepAlive: boolean;
  keepAliveMsecs: number;
  timeout: number;
  freeSocketTimeout: number;
  maxFreeSockets: number;
  socketActiveTTL: number;
}

export interface PooledClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  concurrentLimit: number;
  poolConfig: ConnectionPoolConfig;
  headers?: Record<string, string>;
}

export interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
  pooledConnections: number;
  connectionReuses: number;
}

/**
 * Connection Pool Manager for HTTP/HTTPS requests
 */
export class ConnectionPoolManager {
  private readonly logger = createLogger('dataflow', 'ConnectionPoolManager');
  private pools = new Map<string, PooledHttpClient>();
  private globalStats: RequestStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    averageResponseTime: 0,
    activeConnections: 0,
    pooledConnections: 0,
    connectionReuses: 0
  };

  /**
   * Get or create a pooled client for a specific service
   */
  public getClient(serviceName: string, config: PooledClientConfig): PooledHttpClient {
    if (!this.pools.has(serviceName)) {
      const client = new PooledHttpClient(serviceName, config);
      this.pools.set(serviceName, client);
      
      this.logger.info('getClient', 'Created new pooled client', {
        serviceName,
        baseURL: config.baseURL,
        maxSockets: config.poolConfig.maxSockets
      });
    }

    return this.pools.get(serviceName)!;
  }

  /**
   * Get statistics for all pools
   */
  public getAllStats(): Record<string, RequestStats> & { global: RequestStats } {
    // Update global stats first
    this.updateGlobalStats();

    const stats: Record<string, RequestStats> & { global: RequestStats } = { 
      global: this.globalStats 
    };
    
    for (const [serviceName, client] of this.pools) {
      stats[serviceName] = client.getStats();
    }

    return stats;
  }

  /**
   * Update global statistics
   */
  private updateGlobalStats(): void {
    this.globalStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      pooledConnections: 0,
      connectionReuses: 0
    };

    let totalResponseTime = 0;
    let requestCount = 0;

    for (const client of this.pools.values()) {
      const stats = client.getStats();
      this.globalStats.totalRequests += stats.totalRequests;
      this.globalStats.successfulRequests += stats.successfulRequests;
      this.globalStats.failedRequests += stats.failedRequests;
      this.globalStats.retriedRequests += stats.retriedRequests;
      this.globalStats.activeConnections += stats.activeConnections;
      this.globalStats.pooledConnections += stats.pooledConnections;
      this.globalStats.connectionReuses += stats.connectionReuses;
      
      if (stats.totalRequests > 0) {
        totalResponseTime += stats.averageResponseTime * stats.totalRequests;
        requestCount += stats.totalRequests;
      }
    }

    this.globalStats.averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
  }

  /**
   * Get global statistics across all pools
   */
  public getGlobalStats() {
    const allStats = Array.from(this.pools.values()).map(client => client.getStats());
    
    return {
      totalPools: this.pools.size,
      totalActiveConnections: allStats.reduce((sum, stats) => sum + stats.activeConnections, 0),
      totalRequests: allStats.reduce((sum, stats) => sum + stats.totalRequests, 0),
      totalReuses: allStats.reduce((sum, stats) => sum + stats.connectionReuses, 0),
      totalFailures: allStats.reduce((sum, stats) => sum + stats.failedRequests, 0),
      averageResponseTime: allStats.length > 0 
        ? allStats.reduce((sum, stats) => sum + stats.averageResponseTime, 0) / allStats.length 
        : 0
    };
  }

  /**
   * Dispose all pools and cleanup connections
   */
  public dispose(): void {
    for (const [serviceName, client] of this.pools) {
      client.dispose();
      this.logger.info('dispose', 'Disposed pooled client', { serviceName });
    }
    
    this.pools.clear();
    this.logger.info('dispose', 'Connection pool manager disposed');
  }
}

/**
 * Pooled HTTP Client with connection reuse and request management
 */
export class PooledHttpClient {
  private readonly logger = createLogger('dataflow', 'PooledHttpClient');
  private client: AxiosInstance;
  private stats: RequestStats;
  private activeRequests = new Set<Promise<any>>();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(
    private serviceName: string,
    private config: PooledClientConfig
  ) {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      pooledConnections: 0,
      connectionReuses: 0
    };

    this.client = this.createAxiosInstance();
    
    this.logger.info('constructor', 'Pooled HTTP client initialized', {
      serviceName,
      baseURL: config.baseURL,
      maxSockets: config.poolConfig.maxSockets,
      concurrentLimit: config.concurrentLimit
    });
  }

  /**
   * Create configured Axios instance with connection pooling
   */
  private createAxiosInstance(): AxiosInstance {
    const { poolConfig } = this.config;

    // Create HTTP/HTTPS agents with connection pooling
    const httpsAgent = new HttpsAgent({
      maxSockets: poolConfig.maxSockets,
      keepAlive: poolConfig.keepAlive,
      keepAliveMsecs: poolConfig.keepAliveMsecs,
      timeout: poolConfig.timeout,
      maxFreeSockets: poolConfig.maxFreeSockets
    });

    const httpAgent = new HttpAgent({
      maxSockets: poolConfig.maxSockets,
      keepAlive: poolConfig.keepAlive,
      keepAliveMsecs: poolConfig.keepAliveMsecs,
      timeout: poolConfig.timeout,
      maxFreeSockets: poolConfig.maxFreeSockets
    });

    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent,
      httpAgent,
      headers: this.config.headers || {}
    });

    // Add request interceptor for stats
    instance.interceptors.request.use((config) => {
      this.stats.totalRequests++;
      this.stats.activeConnections++;
      return config;
    });

    // Add response interceptor for stats
    instance.interceptors.response.use(
      (response) => {
        this.stats.successfulRequests++;
        this.stats.activeConnections--;
        // Response time is tracked in executeRequest method
        return response;
      },
      (error) => {
        this.stats.failedRequests++;
        this.stats.activeConnections--;
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * Make a request with connection pooling and retry logic
   */
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // If we've hit the concurrent limit, queue the request
    if (this.activeRequests.size >= this.config.concurrentLimit) {
      return this.queueRequest(() => this.executeRequest(config));
    }

    return this.executeRequest(config);
  }

  /**
   * Execute a request with retry logic
   */
  private async executeRequest<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      if (attempt > 0) {
        this.stats.retriedRequests++;
        await this.delay(this.config.retryDelay * attempt);
      }

      try {
        const requestStartTime = Date.now();
        const requestPromise = this.client.request<T>({
          ...config,
          metadata: { startTime: requestStartTime }
        } as any);
        this.activeRequests.add(requestPromise);

        const response = await requestPromise;
        this.activeRequests.delete(requestPromise);

        // Update response time
        const responseTime = Date.now() - requestStartTime;
        this.updateResponseTime(responseTime);

        // Update connection reuse stats
        const agent = response.config.httpsAgent || response.config.httpAgent;
        if (agent && (agent as any).sockets) {
          this.stats.pooledConnections = Object.keys((agent as any).sockets).length;
          this.stats.connectionReuses++;
        }

        return response;
      } catch (error) {
        lastError = error;
        this.logger.warn('executeRequest', 'Request attempt failed', {
          serviceName: this.serviceName,
          attempt: attempt + 1,
          maxAttempts: this.config.retries + 1,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    throw lastError;
  }

  /**
   * Queue a request when concurrent limit is reached
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests.size < this.config.concurrentLimit) {
      const requestFn = this.requestQueue.shift();
      if (requestFn) {
        // Execute without awaiting to allow concurrent processing
        requestFn().finally(() => {
          this.processQueue(); // Continue processing after completion
        });
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(responseTime: number): void {
    if (responseTime > 0) {
      const currentAvg = this.stats.averageResponseTime;
      const count = this.stats.successfulRequests;
      this.stats.averageResponseTime = count > 1 ? 
        ((currentAvg * (count - 1)) + responseTime) / count : 
        responseTime;
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get request statistics
   */
  public getStats(): RequestStats {
    return { ...this.stats };
  }

  /**
   * Dispose the client and cleanup connections
   */
  public dispose(): void {
    // Destroy agents to close connections
    if (this.client.defaults.httpsAgent) {
      (this.client.defaults.httpsAgent as HttpsAgent).destroy();
    }
    if (this.client.defaults.httpAgent) {
      (this.client.defaults.httpAgent as HttpAgent).destroy();
    }

    this.logger.info('dispose', 'Pooled HTTP client disposed', {
      serviceName: this.serviceName,
      finalStats: this.stats
    });
  }
}

/**
 * Default connection pool configurations for different services
 */
export const DefaultPoolConfigs = {
  yahoo: {
    maxSockets: 50,
    maxSocketsPerHost: 20,
    keepAlive: true,
    keepAliveMsecs: 60000,
    timeout: 30000,
    freeSocketTimeout: 30000,
    maxFreeSockets: 10,
    socketActiveTTL: 300000
  } as ConnectionPoolConfig,

  finnhub: {
    maxSockets: 30,
    maxSocketsPerHost: 15,
    keepAlive: true,
    keepAliveMsecs: 60000,
    timeout: 20000,
    freeSocketTimeout: 20000,
    maxFreeSockets: 8,
    socketActiveTTL: 240000
  } as ConnectionPoolConfig,

  reddit: {
    maxSockets: 25,
    maxSocketsPerHost: 10,
    keepAlive: true,
    keepAliveMsecs: 45000,
    timeout: 15000,
    freeSocketTimeout: 15000,
    maxFreeSockets: 5,
    socketActiveTTL: 180000
  } as ConnectionPoolConfig,

  general: {
    maxSockets: 40,
    maxSocketsPerHost: 15,
    keepAlive: true,
    keepAliveMsecs: 60000,
    timeout: 25000,
    freeSocketTimeout: 25000,
    maxFreeSockets: 8,
    socketActiveTTL: 240000
  } as ConnectionPoolConfig
};

/**
 * Global connection pool manager instance
 */
export const globalConnectionPool = new ConnectionPoolManager();