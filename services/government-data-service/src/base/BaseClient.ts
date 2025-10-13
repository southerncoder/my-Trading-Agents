import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimiter } from 'limiter';
import { ApiError, RequestOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';

export abstract class BaseClient {
  protected client: AxiosInstance;
  protected baseURL: string;
  protected defaultTimeout: number;
  protected maxRetries: number;
  protected retryDelay: number;
  protected rateLimiter?: RateLimiter;

  constructor(
    baseURL: string,
    userAgent: string = 'GovFinancialData/1.0.0',
    timeout: number = 30000,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    rateLimit?: { tokensPerInterval: number; interval: string | number }
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

    // Set up rate limiter if provided
    if (rateLimit) {
      this.rateLimiter = new RateLimiter({
        tokensPerInterval: rateLimit.tokensPerInterval,
        interval: rateLimit.interval,
        fireImmediately: true
      });
    }

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Apply rate limiting if configured
        if (this.rateLimiter) {
          const remainingTokens = await this.rateLimiter.removeTokens(1);
          if (remainingTokens < 0) {
            logger.warn(`Rate limit exceeded for ${config.url}`, {
              baseURL: this.baseURL,
              remainingTokens
            });
          }
        }

        logger.debug(`Making request to: ${config.method?.toUpperCase()} ${config.url}`, {
          baseURL: this.baseURL,
          params: config.params
        });
        return config;
      },
      (error) => {
        return Promise.reject(this.createApiError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Response received: ${response.status} ${response.config.url}`, {
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Retry on server errors
        if (error.response?.status >= 500 && !originalRequest._retry) {
          originalRequest._retry = true;
          await this.delay(this.retryDelay);
          logger.warn(`Retrying request after server error: ${error.response.status}`, {
            url: originalRequest.url,
            attempt: 1
          });
          return this.client(originalRequest);
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * 2;
          
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            logger.warn(`Rate limited, retrying after ${delay}ms`, {
              url: originalRequest.url,
              retryAfter
            });
            await this.delay(delay);
            return this.client(originalRequest);
          }
        }

        return Promise.reject(this.createApiError(error));
      }
    );
  }

  protected async makeRequest<T>(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<T> {
    const requestConfig = {
      ...config,
      timeout: options?.timeout || this.defaultTimeout,
    };

    let attempts = 0;
    const maxAttempts = (options?.retries || this.maxRetries) + 1;

    while (attempts < maxAttempts) {
      try {
        const response: AxiosResponse<T> = await this.client(requestConfig);
        return response.data;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          logger.error(`Request failed after ${attempts} attempts`, {
            url: requestConfig.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }

        if (this.shouldRetry(error)) {
          const delay = options?.retryDelay || this.retryDelay;
          logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`, {
            url: requestConfig.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          await this.delay(delay);
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retry attempts reached');
  }

  protected createApiError(error: any): ApiError {
    if (error.response) {
      return {
        code: `HTTP_${error.response.status}`,
        message: error.response.data?.message || error.response.statusText || 'Request failed',
        status: error.response.status,
      };
    } else if (error.request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
      };
    } else {
      return {
        code: 'REQUEST_ERROR',
        message: error.message || 'Unknown error occurred',
      };
    }
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Retry network errors
    }

    const status = error.response.status;
    return status >= 500 || status === 429; // Retry server errors and rate limits
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString().split('T')[0];
  }

  protected validateCIK(cik: string): string {
    // Remove any non-numeric characters and pad with zeros
    const numericCIK = cik.replace(/\D/g, '');
    return numericCIK.padStart(10, '0');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current rate limiter status
  public getRateLimiterStatus(): { tokensRemaining: number } | null {
    if (!this.rateLimiter) {
      return null;
    }
    return {
      tokensRemaining: this.rateLimiter.getTokensRemaining()
    };
  }
}