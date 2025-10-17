// Core trading types based on the TradingAgents system

export interface TradingSymbol {
  symbol: string
  name: string
  exchange: string
  type: 'stock' | 'etf' | 'crypto' | 'forex'
}

export interface AnalysisRequest {
  id: string
  symbol: string
  type: 'market' | 'social' | 'news' | 'fundamentals' | 'comprehensive'
  parameters?: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
}

export interface AnalysisProgress {
  requestId: string
  phase: 1 | 2 | 3 | 4
  phaseName: 'Intelligence' | 'Research' | 'Risk Assessment' | 'Trading Decision'
  currentAgent: string
  progress: number // 0-100
  message: string
  timestamp: string
}

export interface AgentResult {
  agentId: string
  agentName: string
  phase: number
  recommendation: 'BUY' | 'SELL' | 'HOLD'
  confidence: number // 0-1
  reasoning: string
  data: Record<string, any>
  timestamp: string
}

export interface AnalysisResult {
  id: string
  symbol: string
  type: string
  status: 'completed' | 'failed'
  
  // Phase results
  phase1Results: AgentResult[] // Market, Social, News, Fundamentals
  phase2Results: AgentResult[] // Bull, Bear, Research Manager
  phase3Results: AgentResult[] // Risky, Safe, Neutral, Portfolio Manager
  phase4Results: AgentResult[] // Learning Trader
  
  // Final recommendation
  finalRecommendation: {
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    targetPrice?: number
    stopLoss?: number
  }
  
  // Market data
  marketData: {
    currentPrice: number
    change: number
    changePercent: number
    volume: number
    marketCap?: number
    pe?: number
    eps?: number
  }
  
  createdAt: string
  completedAt: string
}

export interface BacktestRequest {
  id: string
  strategy: string
  symbol: string
  startDate: string
  endDate: string
  initialCapital: number
  parameters: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface BacktestResult {
  id: string
  strategy: string
  symbol: string
  
  // Performance metrics
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  
  // Trade statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number
  averageLoss: number
  
  // Equity curve data
  equityCurve: Array<{
    date: string
    value: number
    drawdown: number
  }>
  
  // Individual trades
  trades: Array<{
    date: string
    type: 'BUY' | 'SELL'
    price: number
    quantity: number
    pnl: number
  }>
  
  createdAt: string
  completedAt: string
}

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: string
}

export interface ChartData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalIndicators {
  sma20: number
  sma50: number
  ema12: number
  ema26: number
  rsi: number
  macd: number
  macdSignal: number
  bollingerUpper: number
  bollingerLower: number
  bollingerMiddle: number
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'analysis_progress' | 'market_data' | 'error'
  data: any
  timestamp: string
}

export interface AnalysisProgressMessage extends WebSocketMessage {
  type: 'analysis_progress'
  data: AnalysisProgress
}

export interface MarketDataMessage extends WebSocketMessage {
  type: 'market_data'
  data: MarketData
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}