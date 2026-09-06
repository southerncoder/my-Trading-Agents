import { TradingAgentsClient, AnalysisRequest, AnalysisResult } from '../clients/trading-agents-client.js'
import { z } from 'zod'

// Request validation schemas
const AnalysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10).transform(s => s.toUpperCase()),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']),
  parameters: z.record(z.any()).optional().default({})
})

const AnalysisValidationSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']).optional()
})

export interface AnalysisServiceConfig {
  tradingAgentsPath?: string
  timeout?: number
  maxConcurrentRequests?: number
  enableCaching?: boolean
  cacheTimeout?: number
}

/**
 * Service for managing trading analysis requests and results
 * Provides caching, validation, and session management
 */
export class AnalysisService {
  private tradingAgentsClient: TradingAgentsClient
  private analysisCache: Map<string, { result: AnalysisResult; timestamp: number }>
  private analysisHistory: Map<string, AnalysisResult>
  private enableCaching: boolean
  private cacheTimeout: number

  constructor(config: AnalysisServiceConfig = {}) {
    this.tradingAgentsClient = new TradingAgentsClient({
      tradingAgentsPath: config.tradingAgentsPath,
      timeout: config.timeout || 300000, // 5 minutes
      maxConcurrentRequests: config.maxConcurrentRequests || 3
    })
    
    this.analysisCache = new Map()
    this.analysisHistory = new Map()
    this.enableCaching = config.enableCaching ?? true
    this.cacheTimeout = config.cacheTimeout || 300000 // 5 minutes
    
    // Clean up cache periodically
    if (this.enableCaching) {
      setInterval(() => this.cleanupCache(), 60000) // Every minute
    }
  }

  /**
   * Request a new trading analysis
   */
  async requestAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    // Validate request
    const validatedRequest = AnalysisRequestSchema.parse(request)
    
    // Check cache first
    if (this.enableCaching) {
      const cacheKey = this.getCacheKey(validatedRequest)
      const cached = this.analysisCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log(`Returning cached result for ${validatedRequest.symbol}`)
        return cached.result
      }
    }
    
    // Execute new analysis
    console.log(`Requesting new analysis for ${validatedRequest.symbol}`)
    const result = await this.tradingAgentsClient.requestAnalysis(validatedRequest)
    
    // Cache successful results
    if (this.enableCaching && result.status === 'completed') {
      const cacheKey = this.getCacheKey(validatedRequest)
      this.analysisCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      })
    }
    
    // Store in history
    this.analysisHistory.set(result.id, result)
    
    return result
  }

  /**
   * Validate analysis request parameters
   */
  async validateAnalysisRequest(data: any): Promise<{
    valid: boolean
    errors?: string[]
    symbol?: string
  }> {
    try {
      const validated = AnalysisValidationSchema.parse(data)
      
      // Additional validation checks
      const errors: string[] = []
      
      // Check if symbol format is valid (basic check)
      if (!/^[A-Z]{1,5}$/.test(validated.symbol)) {
        errors.push('Symbol must be 1-5 uppercase letters')
      }
      
      // Check if symbol exists (mock validation - in production would check against real data)
      const validSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC']
      if (!validSymbols.includes(validated.symbol)) {
        console.warn(`Symbol ${validated.symbol} not in mock validation list, but allowing it`)
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        symbol: validated.symbol
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }
      }
      
      return {
        valid: false,
        errors: ['Invalid request format']
      }
    }
  }

  /**
   * Get analysis result by ID
   */
  getAnalysisResult(analysisId: string): AnalysisResult | null {
    return this.analysisHistory.get(analysisId) || null
  }

  /**
   * Get analysis history for a symbol
   */
  getAnalysisHistory(symbol?: string, limit: number = 10): AnalysisResult[] {
    const results = Array.from(this.analysisHistory.values())
    
    let filtered = results
    if (symbol) {
      filtered = results.filter(r => r.symbol === symbol.toUpperCase())
    }
    
    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return filtered.slice(0, limit)
  }

  /**
   * Get active analysis requests
   */
  getActiveAnalyses(): string[] {
    return this.tradingAgentsClient.getActiveRequests()
  }

  /**
   * Cancel an analysis request
   */
  cancelAnalysis(analysisId: string): boolean {
    return this.tradingAgentsClient.cancelAnalysis(analysisId)
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    totalAnalyses: number
    activeRequests: number
    cacheSize: number
    cacheHitRate?: number
  } {
    return {
      totalAnalyses: this.analysisHistory.size,
      activeRequests: this.tradingAgentsClient.getActiveRequests().length,
      cacheSize: this.analysisCache.size
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear()
    console.log('Analysis cache cleared')
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.analysisHistory.clear()
    console.log('Analysis history cleared')
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: AnalysisRequest): string {
    const params = JSON.stringify(request.parameters || {})
    return `${request.symbol}-${request.type}-${params}`
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.analysisCache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.analysisCache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`)
    }
  }

  /**
   * Shutdown service and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down AnalysisService...')
    
    // Cancel all active requests
    const cancelled = this.tradingAgentsClient.cancelAllAnalyses()
    if (cancelled > 0) {
      console.log(`Cancelled ${cancelled} active analysis requests`)
    }
    
    // Clear caches
    this.clearCache()
    
    console.log('AnalysisService shutdown complete')
  }
}

// Singleton instance for the service
let analysisServiceInstance: AnalysisService | null = null

/**
 * Get or create the analysis service singleton
 */
export function getAnalysisService(config?: AnalysisServiceConfig): AnalysisService {
  if (!analysisServiceInstance) {
    analysisServiceInstance = new AnalysisService(config)
  }
  return analysisServiceInstance
}

/**
 * Shutdown the analysis service singleton
 */
export async function shutdownAnalysisService(): Promise<void> {
  if (analysisServiceInstance) {
    await analysisServiceInstance.shutdown()
    analysisServiceInstance = null
  }
}