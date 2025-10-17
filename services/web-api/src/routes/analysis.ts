import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { broadcastProgress } from '../websocket/index.js'

const router = Router()

// In-memory storage for demo - in production this would use a database
const analyses = new Map()
const results = new Map()

const analysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']),
  parameters: z.record(z.any()).optional()
})

// Request new analysis
router.post('/', async (req, res) => {
  try {
    const requestData = analysisRequestSchema.parse(req.body)
    
    const analysisId = uuidv4()
    const analysis = {
      id: analysisId,
      symbol: requestData.symbol.toUpperCase(),
      type: requestData.type,
      parameters: requestData.parameters || {},
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }
    
    analyses.set(analysisId, analysis)
    
    // Start mock analysis process
    startMockAnalysis(analysisId, analysis)
    
    res.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request data',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get analysis status
router.get('/:id/status', (req, res) => {
  const analysis = analyses.get(req.params.id)
  
  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: 'Analysis not found'
    })
  }
  
  res.json({
    success: true,
    data: analysis
  })
})

// Get analysis result
router.get('/:id/result', (req, res) => {
  const result = results.get(req.params.id)
  
  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Analysis result not found'
    })
  }
  
  res.json({
    success: true,
    data: result
  })
})

// Mock analysis simulation
async function startMockAnalysis(analysisId: string, analysis: any) {
  const phases = [
    { id: 1, name: 'Intelligence', agents: ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst'] },
    { id: 2, name: 'Research', agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'] },
    { id: 3, name: 'Risk Assessment', agents: ['Risky Analyst', 'Safe Analyst', 'Neutral Analyst', 'Portfolio Manager'] },
    { id: 4, name: 'Trading Decision', agents: ['Learning Trader'] },
  ]
  
  // Update status to running
  analysis.status = 'running'
  analyses.set(analysisId, analysis)
  
  for (const phase of phases) {
    for (let i = 0; i < phase.agents.length; i++) {
      const agent = phase.agents[i]
      const progress = Math.round(((i + 1) / phase.agents.length) * 100)
      
      // Broadcast progress update
      broadcastProgress({
        requestId: analysisId,
        phase: phase.id as 1 | 2 | 3 | 4,
        phaseName: phase.name as 'Intelligence' | 'Research' | 'Risk Assessment' | 'Trading Decision',
        currentAgent: agent,
        progress,
        message: `Analyzing ${analysis.symbol}...`,
        timestamp: new Date().toISOString()
      })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    }
  }
  
  // Generate mock result
  const mockResult = generateMockResult(analysisId, analysis)
  results.set(analysisId, mockResult)
  
  // Update analysis status
  analysis.status = 'completed'
  analysis.completedAt = new Date().toISOString()
  analyses.set(analysisId, analysis)
  
  console.log(`Analysis ${analysisId} completed for ${analysis.symbol}`)
}

function generateMockResult(analysisId: string, analysis: any) {
  const actions = ['BUY', 'SELL', 'HOLD']
  const riskLevels = ['LOW', 'MEDIUM', 'HIGH']
  
  const action = actions[Math.floor(Math.random() * actions.length)]
  const confidence = 0.6 + Math.random() * 0.4 // 60-100%
  const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)]
  
  const currentPrice = 100 + Math.random() * 400 // $100-500
  const change = (Math.random() - 0.5) * 20 // -10 to +10
  const changePercent = (change / currentPrice) * 100
  
  return {
    id: analysisId,
    symbol: analysis.symbol,
    type: analysis.type,
    status: 'completed' as const,
    
    phase1Results: [
      { agentId: 'market', agentName: 'Market Analyst', phase: 1, recommendation: action, confidence, reasoning: 'Technical analysis shows strong momentum', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'social', agentName: 'Social Analyst', phase: 1, recommendation: action, confidence, reasoning: 'Social sentiment is positive', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'news', agentName: 'News Analyst', phase: 1, recommendation: action, confidence, reasoning: 'Recent news is favorable', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'fundamentals', agentName: 'Fundamentals Analyst', phase: 1, recommendation: action, confidence, reasoning: 'Strong financial metrics', data: {}, timestamp: new Date().toISOString() },
    ],
    phase2Results: [
      { agentId: 'bull', agentName: 'Bull Researcher', phase: 2, recommendation: 'BUY', confidence, reasoning: 'Growth potential is high', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'bear', agentName: 'Bear Researcher', phase: 2, recommendation: 'SELL', confidence: confidence * 0.8, reasoning: 'Some downside risks identified', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'research', agentName: 'Research Manager', phase: 2, recommendation: action, confidence, reasoning: 'Balanced analysis of bull and bear cases', data: {}, timestamp: new Date().toISOString() },
    ],
    phase3Results: [
      { agentId: 'risky', agentName: 'Risky Analyst', phase: 3, recommendation: action, confidence, reasoning: 'Aggressive position recommended', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'safe', agentName: 'Safe Analyst', phase: 3, recommendation: 'HOLD', confidence: confidence * 0.9, reasoning: 'Conservative approach preferred', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'neutral', agentName: 'Neutral Analyst', phase: 3, recommendation: action, confidence, reasoning: 'Balanced risk assessment', data: {}, timestamp: new Date().toISOString() },
      { agentId: 'portfolio', agentName: 'Portfolio Manager', phase: 3, recommendation: action, confidence, reasoning: 'Portfolio allocation optimized', data: {}, timestamp: new Date().toISOString() },
    ],
    phase4Results: [
      { agentId: 'trader', agentName: 'Learning Trader', phase: 4, recommendation: action, confidence, reasoning: 'Final trading decision based on all analysis', data: {}, timestamp: new Date().toISOString() },
    ],
    
    finalRecommendation: {
      action: action as 'BUY' | 'SELL' | 'HOLD',
      confidence,
      reasoning: `Based on comprehensive analysis of ${analysis.symbol}, our 12-agent system recommends ${action} with ${Math.round(confidence * 100)}% confidence. The analysis considered technical indicators, social sentiment, news impact, and fundamental metrics.`,
      riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      targetPrice: action !== 'SELL' ? currentPrice * (1 + Math.random() * 0.2) : undefined,
      stopLoss: action === 'BUY' ? currentPrice * (1 - Math.random() * 0.1) : undefined,
    },
    
    marketData: {
      currentPrice,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 10000000) + 1000000, // 1M-11M
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000, // 100B-1.1T
      pe: 15 + Math.random() * 30, // 15-45
      eps: Math.random() * 10 + 1, // 1-11
    },
    
    createdAt: analysis.createdAt,
    completedAt: new Date().toISOString(),
  }
}

export { router as analysisRoutes }