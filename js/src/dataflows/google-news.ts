import { TradingAgentsConfig } from '@/types/config';
import axios from 'axios';
import { createLogger } from '../utils/enhanced-logger.js';
import {
  withDataflowResilience,
  NEWS_API_CONFIG,
  DataflowMetricsCollector
} from '../utils/resilient-dataflow.js';

/**
 * Google News API wrapper using dedicated Google News service
 * Enhanced with resilient patterns for robust external API integration
 *
 * FREE PROVIDER: Google News Service (Dedicated microservice)
 *
 * This service now uses the dedicated google-news-service Docker container
 * which provides better isolation, scalability, and error handling.
 */
export class GoogleNewsAPI {
  private config: TradingAgentsConfig;
  private logger = createLogger('dataflow', 'google-news');
  private metrics = new DataflowMetricsCollector();
  private serviceUrl: string;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.serviceUrl = process.env.GOOGLE_NEWS_URL || 'http://localhost:3003';

    this.logger.info('constructor', 'Initializing Google News API', {
      serviceUrl: this.serviceUrl
    });
  }

  /**
   * Get news using the dedicated Google News service
   */
  async getNews(query: string, currDate: string, lookBackDays: number): Promise<string> {
    return withDataflowResilience(
      `google-news-${query}`,
      async () => {
        this.logger.info('get-news', `Fetching news for query: ${query}`, {
          query,
          currDate,
          lookBackDays
        });

        const startDate = new Date(currDate);
        const before = new Date(startDate);
        before.setDate(before.getDate() - lookBackDays);

        const fromDate = before.toISOString().split('T')[0];
        const toDate = currDate;

        // Use the dedicated Google News service
        const response = await axios.get(`${this.serviceUrl}/api/news`, {
          params: {
            q: query,
            from: fromDate,
            to: toDate,
            language: 'en'
          },
          timeout: 15000,
          headers: {
            'User-Agent': 'TradingAgents/1.0'
          }
        });

        if (response.data.status !== 'success') {
          throw new Error(`Google News service error: ${response.data.message || 'Unknown error'}`);
        }

        this.logger.info('news-fetched', `News fetched successfully for query: ${query}`, {
          query,
          articlesCount: response.data.data?.articles?.length || 0,
          fromDate,
          toDate
        });

        if (!response.data.data || !response.data.data.articles || response.data.data.articles.length === 0) {
          return `## ${query} News, from ${fromDate} to ${toDate}:\n\nNo recent news articles found for ${query}.`;
        }

        let newsStr = '';
        for (const article of response.data.data.articles) {
          const publishedDate = new Date(article.publishedAt).toLocaleDateString();
          newsStr += `### ${article.title} (${article.source.name}, ${publishedDate})\n\n`;

          if (article.description) {
            newsStr += `${article.description}\n\n`;
          }

          newsStr += `[Read full article](${article.url})\n\n`;
        }

        return `## ${query} News, from ${fromDate} to ${toDate}:\n\nFound ${response.data.data.articles.length} articles\n\n${newsStr}`;
      },
      NEWS_API_CONFIG
    ).catch(async (error) => {
      this.logger.error('news-fetch-error', `Error fetching news for ${query}`, {
        query,
        currDate,
        lookBackDays,
        error: error.message
      });

      if (axios.isAxiosError(error) && error.response?.status === 429) {
        this.logger.warn('rate-limit-hit', 'News API rate limit exceeded', {
          query,
          statusCode: error.response.status
        });
        return `## ${query} News API Rate Limited\n\nRate limit exceeded for news API. Please try again later.`;
      }

      // Fallback to sample data if service fails
      return this.getFallbackNews(query, currDate);
    });
  }

  /**
   * Get fallback news when the dedicated service is unavailable
   */
  private getFallbackNews(query: string, currDate: string): string {
    this.logger.warn('fallback-news-unavailable', `News data unavailable for ${query}`, {
      query,
      currDate,
      reason: 'Google News service unavailable and no fallback providers implemented'
    });

    return `## ${query} News:\n\n**News service unavailable** - Google News service is not responding. Please check service status or implement alternative news data providers.\n\n*TODO: Add fallback news providers and local news cache.*`;
  }

  /**
   * Get metrics for monitoring and health checks
   */
  getMetrics(): any {
    return this.metrics.getMetrics();
  }

  /**
   * Reset metrics (for testing or periodic cleanup)
   */
  resetMetrics(): void {
    this.metrics.resetMetrics();
    this.logger.info('metrics-reset', 'Google News API metrics reset');
  }
}