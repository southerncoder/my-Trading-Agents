import { z } from 'zod'
import type {
  AnalysisRequest,
  AnalysisResult,
  BacktestRequest,
  BacktestResult,
  TradingSymbol,
  MarketData,
  ApiResponse,
  PaginatedResponse
} from '../types/trading'

// API configuration
const isHttpsEnabled = import.meta.env.VITE_HTTPS_ENABLED === 'true'
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (isHttpsEnabled ? 'https://localhost:3001/api' : 'http://localhost:3001/api')
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 
  (isHttpsEnabled ? 'wss://localhost:3001' : 'ws://localhost:3001')

// Request validation schemas
const AnalysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']),
  parameters: z.record(z.any()).optional()
})

const BacktestRequestSchema = z.object({
  strategy: z.string().min(1),
  symbol: z.string().min(1).max(10),
  startDate: z.string(),
  endDate: z.string(),
  initialCapital: z.number().positive(),
  parameters: z.record(z.any()).optional()
})

// API client class
class TradingAPI {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Symbol search and market data
  async searchSymbols(query: string): Promise<ApiResponse<TradingSymbol[]>> {
    return this.request(`/symbols/search?q=${encodeURIComponent(query)}`)
  }

  async getMarketData(symbol: string): Promise<ApiResponse<MarketData>> {
    return this.request(`/market/${symbol}`)
  }

  // Analysis endpoints
  async requestAnalysis(
    symbol: string,
    type: 'market' | 'social' | 'news' | 'fundamentals' | 'comprehensive',
    parameters?: Record<string, any>
  ): Promise<ApiResponse<AnalysisRequest>> {
    const requestData = AnalysisRequestSchema.parse({ symbol, type, parameters })
    
    return this.request('/analysis', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async getAnalysisStatus(id: string): Promise<ApiResponse<AnalysisRequest>> {
    return this.request(`/analysis/${id}/status`)
  }

  async getAnalysisResult(id: string): Promise<ApiResponse<AnalysisResult>> {
    return this.request(`/analysis/${id}/result`)
  }

  async getAnalysisHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<AnalysisResult>>> {
    return this.request(`/analysis/history?page=${page}&limit=${limit}`)
  }

  // Backtesting endpoints
  async requestBacktest(
    strategy: string,
    symbol: string,
    startDate: string,
    endDate: string,
    initialCapital: number,
    parameters?: Record<string, any>
  ): Promise<ApiResponse<BacktestRequest>> {
    const requestData = BacktestRequestSchema.parse({
      strategy,
      symbol,
      startDate,
      endDate,
      initialCapital,
      parameters
    })

    return this.request('/backtest', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async getBacktestResult(id: string): Promise<ApiResponse<BacktestResult>> {
    return this.request(`/backtest/${id}/result`)
  }

  async getBacktestHistory(): Promise<ApiResponse<BacktestResult[]>> {
    return this.request('/backtest/history')
  }

  // System health
  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/health')
  }
}

// WebSocket client for real-time updates
class TradingWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(url: string = WS_BASE_URL) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}/ws`)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.handleReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  onMessage(callback: (data: any) => void) {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          callback(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Export singleton instances
export const api = new TradingAPI()
export const websocket = new TradingWebSocket()

// Export classes for testing
export { TradingAPI, TradingWebSocket }