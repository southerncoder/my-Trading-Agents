// src/base/BaseClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, RequestOptions } from '../types';

export abstract class BaseClient {
  protected client: AxiosInstance;
  protected baseURL: string;
  protected defaultTimeout: number;
  protected maxRetries: number;
  protected retryDelay: number;

  constructor(
    baseURL: string,
    userAgent: string = 'GovFinancialData/1.0.0',
    timeout: number = 30000,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

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
      (config) => {
        console.log(`Making request to: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(this.createApiError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status >= 500 && !originalRequest._retry) {
          originalRequest._retry = true;
          await this.delay(this.retryDelay);
          return this.client(originalRequest);
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
          throw error;
        }

        if (this.shouldRetry(error)) {
          await this.delay(options?.retryDelay || this.retryDelay);
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
}