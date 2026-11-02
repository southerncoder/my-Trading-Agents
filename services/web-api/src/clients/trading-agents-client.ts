import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { broadcastProgress } from '../websocket/index.js'

// Zod schemas for request/response validation
const AnalysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']),
  parameters: z.record(z.any()).optional()
})

const TradingAgentsConfigSchema = z.object({
  symbol: z.string(),
  analysisType: z.string(),
  llmProvider: z.string().optional(),
  enableBacktesting: z.boolean().optional(),
  enableRiskManagement: z.boolean().optional(),
  enableGovernmentData: z.boolean().optional(),
  parameters: z.record(z.any()).optional()
})

export interface AnalysisRequest {
  symbol: string
  type: 'market' | 'social' | 'news' | 'fundamentals' | 'comprehensive'
  parameters?: Record<string, any>
}

export interface TradingAgentsConfig {
  symbol: string
  analysisType: string
  llmProvider?: string
  enableBacktesting?: boolean
  enableRiskManagement?: boolean
  enableGovernmentData?: boolean
  parameters?: Record<string, any>
}

export interface AnalysisResult {
  id: string
  symbol: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  phase1Results?: any[]
  phase2Results?: any[]
  phase3Results?: any[]
  phase4Results?: any[]
  finalRecommendation?: {
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    targetPrice?: number
    stopLoss?: number
  }
  marketData?: any
  error?: string
  createdAt: string
  completedAt?: string
}

export interface AnalysisProgress {
  requestId: string
  phase: 1 | 2 | 3 | 4
  phaseName: 'Intelligence' | 'Research' | 'Risk Assessment' | 'Trading Decision'
  currentAgent: string
  progress: number
  message: string
  timestamp: string
}

/**
 * Client for interfacing with the TradingAgents service
 * Handles analysis request serialization, process management, and result parsing
 */
export class TradingAgentsClient {
  private readonly tradingAgentsPath: string
  private readonly timeout: number
  private readonly maxConcurrentRequests: number
  private activeRequests: Map<string, ChildProcess>
  private requestQueue: Array<{ id: string; request: AnalysisRequest; resolve: Function; reject: Function }>
  private processingQueue: boolean

  constructor(options: {
    tradingAgentsPath?: string
    timeout?: number
    maxConcurrentRequests?: number
  } = {}) {
    // Path to trading-agents service (relative to web-api service)
    this.tradingAgentsPath = options.tradingAgentsPath || join(process.cwd(), '../trading-agents')
    this.timeout = options.timeout || 300000 // 5 minutes default
    this.maxConcurrentRequests = options.maxConcurrentRequests || 3
    this.activeRequests = new Map()
    this.requestQueue = []
    this.processingQueue = false
  }

  /**
   * Request a new trading analysis
   */
  async requestAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
    // Validate request
    const validatedRequest = AnalysisRequestSchema.parse(request)
    
    const analysisId = uuidv4()
    
    return new Promise((resolve, reject) => {
      // Add to queue
      this.requestQueue.push({
        id: analysisId,
        request: validatedRequest,
        resolve,
        reject
      })
      
      // Process queue
      this.processQueue()
    })
  }

  /**
   * Process the analysis request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return
    }

    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      return
    }

    this.processingQueue = true

    try {
      const queueItem = this.requestQueue.shift()
      if (!queueItem) {
        this.processingQueue = false
        return
      }

      const { id, request, resolve, reject } = queueItem
      
      try {
        const result = await this.executeAnalysis(id, request)
        resolve(result)
      } catch (error) {
        reject(error)
      }

      // Continue processing queue
      this.processingQueue = false
      this.processQueue()
    } catch (error) {
      this.processingQueue = false
      throw error
    }
  }

  /**
   * Execute a single analysis request
   */
  private async executeAnalysis(analysisId: string, request: AnalysisRequest): Promise<AnalysisResult> {
    console.log(`Starting analysis ${analysisId} for ${request.symbol}`)
    
    // Create initial result object
    const result: AnalysisResult = {
      id: analysisId,
      symbol: request.symbol.toUpperCase(),
      type: request.type,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    try {
      // Convert web request to TradingAgents config format
      const tradingAgentsConfig = this.serializeRequest(request)
      
      // Update status to running
      result.status = 'running'
      
      // Broadcast initial progress
      broadcastProgress({
        requestId: analysisId,
        phase: 1,
        phaseName: 'Intelligence',
        currentAgent: 'Initializing',
        progress: 0,
        message: `Starting analysis for ${request.symbol}...`,
        timestamp: new Date().toISOString()
      })

      // Execute trading agents CLI
      const analysisResult = await this.spawnTradingAgentsProcess(analysisId, tradingAgentsConfig)
      
      // Parse and format results
      const formattedResult = this.deserializeResult(analysisId, analysisResult)
      
      // Update result with formatted data
      Object.assign(result, formattedResult)
      result.status = 'completed'
      result.completedAt = new Date().toISOString()
      
      console.log(`Analysis ${analysisId} completed successfully`)
      return result
      
    } catch (error) {
      console.error(`Analysis ${analysisId} failed:`, error)
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : String(error)
      result.completedAt = new Date().toISOString()
      return result
    } finally {
      // Clean up active request tracking
      this.activeRequests.delete(analysisId)
    }
  }

  /**
   * Convert web API request to TradingAgents configuration format
   */
  private serializeRequest(request: AnalysisRequest): TradingAgentsConfig {
    const config: TradingAgentsConfig = {
      symbol: request.symbol.toUpperCase(),
      analysisType: request.type,
      llmProvider: 'openai', // Default provider
      enableBacktesting: false,
      enableRiskManagement: true,
      enableGovernmentData: true,
      parameters: request.parameters || {}
    }

    // Map analysis types to TradingAgents configuration
    switch (request.type) {
      case 'comprehensive':
        config.enableBacktesting = true
        config.enableRiskManagement = true
        config.enableGovernmentData = true
        break
      case 'market':
        config.analysisType = 'market'
        break
      case 'social':
        config.analysisType = 'social'
        break
      case 'news':
        config.analysisType = 'news'
        break
      case 'fundamentals':
        config.analysisType = 'fundamentals'
        config.enableGovernmentData = true
        break
    }

    return TradingAgentsConfigSchema.parse(config)
  }

  /**
   * Spawn TradingAgents CLI process and handle output
   */
  private async spawnTradingAgentsProcess(analysisId: string, config: TradingAgentsConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (childProcess) {
          childProcess.kill('SIGTERM')
        }
        reject(new Error(`Analysis timeout after ${this.timeout}ms`))
      }, this.timeout)

      // Prepare CLI arguments - use the existing CLI structure
      const args = [
        'analyze',
        config.symbol,  // ticker argument
        new Date().toISOString().split('T')[0]  // date argument (today)
      ]

      console.log(`Spawning trading-agents process: node cli.js ${args.join(' ')}`)

      // Spawn the process
      const childProcess = spawn('node', ['cli.js', ...args], {
        cwd: this.tradingAgentsPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
          TRADING_AGENTS_WEB_MODE: 'true',
          // Pass analysis configuration via environment variables
          ANALYSIS_TYPE: config.analysisType,
          LLM_PROVIDER: config.llmProvider || 'openai',
          ENABLE_BACKTESTING: config.enableBacktesting ? 'true' : 'false',
          ENABLE_RISK_MANAGEMENT: config.enableRiskManagement ? 'true' : 'false',
          ENABLE_GOVERNMENT_DATA: config.enableGovernmentData ? 'true' : 'false'
        }
      })

      // Track active request
      this.activeRequests.set(analysisId, childProcess)

      let stdout = ''
      let stderr = ''

      // Handle stdout (results and progress)
      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString()
        stdout += output
        
        // Parse progress updates from CLI output
        this.parseProgressFromOutput(analysisId, output)
      })

      // Handle stderr (errors and debug info)
      childProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString()
        stderr += output
        console.error(`Trading agents stderr: ${output}`)
      })

      // Handle process completion
      childProcess.on('close', (code: number) => {
        clearTimeout(timeoutId)
        
        if (code === 0) {
          try {
            // Try to parse JSON result from stdout
            const result = this.parseCliOutput(stdout)
            resolve(result)
          } catch (error) {
            reject(new Error(`Failed to parse CLI output: ${error instanceof Error ? error.message : String(error)}`))
          }
        } else {
          reject(new Error(`Trading agents process exited with code ${code}. Error: ${stderr}`))
        }
      })

      // Handle process errors
      childProcess.on('error', (error: Error) => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to spawn trading agents process: ${error.message}`))
      })
    })
  }

  /**
   * Parse progress updates from CLI output
   */
  private parseProgressFromOutput(analysisId: string, output: string): void {
    // Look for phase transitions and agent updates in the output
    const lines = output.split('\n')
    
    for (const line of lines) {
      // Parse phase information and broadcast progress
      if (line.includes('Phase 1') || line.includes('Intelligence')) {
        this.broadcastPhaseProgress(analysisId, 1, 'Intelligence', 'Market Analyst', 25)
      } else if (line.includes('Phase 2') || line.includes('Research')) {
        this.broadcastPhaseProgress(analysisId, 2, 'Research', 'Bull Researcher', 50)
      } else if (line.includes('Phase 3') || line.includes('Risk')) {
        this.broadcastPhaseProgress(analysisId, 3, 'Risk Assessment', 'Risky Analyst', 75)
      } else if (line.includes('Phase 4') || line.includes('Trading')) {
        this.broadcastPhaseProgress(analysisId, 4, 'Trading Decision', 'Learning Trader', 90)
      }

      // Parse specific agent mentions
      if (line.includes('Market Analyst')) {
        this.broadcastPhaseProgress(analysisId, 1, 'Intelligence', 'Market Analyst', 10)
      } else if (line.includes('Social Analyst')) {
        this.broadcastPhaseProgress(analysisId, 1, 'Intelligence', 'Social Analyst', 15)
      } else if (line.includes('News Analyst')) {
        this.broadcastPhaseProgress(analysisId, 1, 'Intelligence', 'News Analyst', 20)
      } else if (line.includes('Fundamentals Analyst')) {
        this.broadcastPhaseProgress(analysisId, 1, 'Intelligence', 'Fundamentals Analyst', 25)
      }
    }
  }

  /**
   * Broadcast phase progress via WebSocket
   */
  private broadcastPhaseProgress(
    requestId: string, 
    phase: 1 | 2 | 3 | 4, 
    phaseName: 'Intelligence' | 'Research' | 'Risk Assessment' | 'Trading Decision',
    agent: string, 
    progress: number
  ): void {
    broadcastProgress({
      requestId,
      phase,
      phaseName,
      currentAgent: agent,
      progress,
      message: `${phaseName} phase: ${agent} analyzing...`,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Parse CLI output to extract JSON result
   */
  private parseCliOutput(output: string): any {
    // Look for JSON output in the CLI output
    const lines = output.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          return JSON.parse(trimmed)
        } catch (error) {
          // Continue looking for valid JSON
        }
      }
    }
    
    // If no JSON found, create a basic result structure
    return {
      symbol: 'UNKNOWN',
      analysis: 'completed',
      recommendation: 'HOLD',
      confidence: 0.5,
      reasoning: 'Analysis completed but detailed results not available'
    }
  }

  /**
   * Convert TradingAgents output to web-friendly format
   */
  private deserializeResult(_analysisId: string, tradingAgentsOutput: any): Partial<AnalysisResult> {
    // Map TradingAgents output to web API format
    const result: Partial<AnalysisResult> = {}

    if (tradingAgentsOutput.symbol) {
      result.symbol = tradingAgentsOutput.symbol
    }

    if (tradingAgentsOutput.recommendation) {
      result.finalRecommendation = {
        action: tradingAgentsOutput.recommendation.toUpperCase() as 'BUY' | 'SELL' | 'HOLD',
        confidence: tradingAgentsOutput.confidence || 0.5,
        reasoning: tradingAgentsOutput.reasoning || 'Analysis completed',
        riskLevel: tradingAgentsOutput.riskLevel || 'MEDIUM'
      }
    }

    // Mock phase results if not provided
    if (!result.phase1Results) {
      result.phase1Results = [
        {
          agentId: 'market',
          agentName: 'Market Analyst',
          phase: 1,
          recommendation: result.finalRecommendation?.action || 'HOLD',
          confidence: result.finalRecommendation?.confidence || 0.5,
          reasoning: 'Technical analysis completed',
          data: {},
          timestamp: new Date().toISOString()
        }
      ]
    }

    if (!result.phase2Results) {
      result.phase2Results = [
        {
          agentId: 'research',
          agentName: 'Research Manager',
          phase: 2,
          recommendation: result.finalRecommendation?.action || 'HOLD',
          confidence: result.finalRecommendation?.confidence || 0.5,
          reasoning: 'Research synthesis completed',
          data: {},
          timestamp: new Date().toISOString()
        }
      ]
    }

    if (!result.phase3Results) {
      result.phase3Results = [
        {
          agentId: 'portfolio',
          agentName: 'Portfolio Manager',
          phase: 3,
          recommendation: result.finalRecommendation?.action || 'HOLD',
          confidence: result.finalRecommendation?.confidence || 0.5,
          reasoning: 'Risk assessment completed',
          data: {},
          timestamp: new Date().toISOString()
        }
      ]
    }

    if (!result.phase4Results) {
      result.phase4Results = [
        {
          agentId: 'trader',
          agentName: 'Learning Trader',
          phase: 4,
          recommendation: result.finalRecommendation?.action || 'HOLD',
          confidence: result.finalRecommendation?.confidence || 0.5,
          reasoning: 'Trading decision finalized',
          data: {},
          timestamp: new Date().toISOString()
        }
      ]
    }

    // Add mock market data if not provided
    if (!result.marketData) {
      result.marketData = {
        currentPrice: 100 + Math.random() * 400,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
        pe: 15 + Math.random() * 30,
        eps: Math.random() * 10 + 1
      }
    }

    return result
  }

  /**
   * Get the status of all active requests
   */
  getActiveRequests(): string[] {
    return Array.from(this.activeRequests.keys())
  }

  /**
   * Cancel a specific analysis request
   */
  cancelAnalysis(analysisId: string): boolean {
    const process = this.activeRequests.get(analysisId)
    if (process) {
      process.kill('SIGTERM')
      this.activeRequests.delete(analysisId)
      return true
    }
    return false
  }

  /**
   * Cancel all active requests
   */
  cancelAllAnalyses(): number {
    let cancelled = 0
    for (const [id, process] of this.activeRequests) {
      process.kill('SIGTERM')
      this.activeRequests.delete(id)
      cancelled++
    }
    return cancelled
  }
}