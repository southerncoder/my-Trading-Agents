import { TradingAgentsConfig } from '@/types/config';
import axios from 'axios';

// News API interfaces
interface NewsApiArticle {
  title: string;
  source: {
    id: string | null;
    name: string;
  };
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

/**
 * Google News API wrapper using NewsAPI.org
 */
export class GoogleNewsAPI {
  private config: TradingAgentsConfig;
  private apiKey: string | undefined;

  constructor(config: TradingAgentsConfig) {
    this.config = config;
    this.apiKey = process.env.NEWS_API_KEY;
  }

  /**
   * Get news from NewsAPI.org (more reliable than scraping Google News)
   */
  async getNews(query: string, currDate: string, lookBackDays: number): Promise<string> {
    try {
      if (!this.apiKey) {
        console.warn('NEWS_API_KEY not set, using fallback news data');
        return this.getFallbackNews(query, currDate);
      }

      const startDate = new Date(currDate);
      const before = new Date(startDate);
      before.setDate(before.getDate() - lookBackDays);
      
      const fromDate = before.toISOString().split('T')[0];
      const toDate = currDate;

      // Use NewsAPI.org everything endpoint for comprehensive search
      const response = await axios.get<NewsApiResponse>('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          from: fromDate,
          to: toDate,
          sortBy: 'relevancy',
          language: 'en',
          pageSize: 20,
          apiKey: this.apiKey
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'TradingAgents/1.0'
        }
      });

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.status}`);
      }

      if (response.data.articles.length === 0) {
        return `## ${query} News, from ${fromDate} to ${toDate}:\n\nNo recent news articles found for ${query}.`;
      }

      let newsStr = '';
      for (const article of response.data.articles) {
        const publishedDate = new Date(article.publishedAt).toLocaleDateString();
        newsStr += `### ${article.title} (${article.source.name}, ${publishedDate})\n\n`;
        
        if (article.description) {
          newsStr += `${article.description}\n\n`;
        }
        
        newsStr += `[Read full article](${article.url})\n\n`;
      }

      return `## ${query} News, from ${fromDate} to ${toDate}:\n\nFound ${response.data.articles.length} articles\n\n${newsStr}`;
    } catch (error) {
      console.error(`Error fetching news for ${query}:`, error);
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return `## ${query} News API Rate Limited\n\nRate limit exceeded for news API. Please try again later.`;
      }
      
      // Fallback to sample data if API fails
      return this.getFallbackNews(query, currDate);
    }
  }

  /**
   * Fallback news data when API is unavailable
   */
  private getFallbackNews(query: string, currDate: string): string {
    const fallbackArticles = [
      {
        title: `Market Analysis: ${query} Trading Activity`,
        source: 'Financial News',
        description: `Recent trading activity and market sentiment analysis for ${query}.`,
        date: currDate
      },
      {
        title: `${query} Industry Update`,
        source: 'Market Watch',
        description: `Latest developments and industry trends affecting ${query} sector.`,
        date: currDate
      }
    ];

    let newsStr = '';
    for (const article of fallbackArticles) {
      newsStr += `### ${article.title} (${article.source}, ${article.date})\n\n${article.description}\n\n`;
    }

    return `## ${query} News (Fallback Data):\n\n${newsStr}\n\n*Note: Using fallback data due to API limitations. Configure NEWS_API_KEY environment variable for live news data.*`;
  }
}