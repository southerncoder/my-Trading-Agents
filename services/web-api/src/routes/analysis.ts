import { Router } from 'express'
import { z } from 'zod'
import { getAnalysisService } from '../services/analysis-service.js'

const router = Router()

// Get analysis service instance
const analysisService = getAnalysisService({
  tradingAgentsPath: process.env.TRADING_AGENTS_SERVICE_PATH || '../trading-agents',
  timeout: parseInt(process.env.ANALYSIS_TIMEOUT || '300000'),
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_ANALYSES || '3'),
  enableCaching: process.env.ENABLE_ANALYSIS_CACHING !== 'false',
  cacheTimeout: parseInt(process.env.ANALYSIS_CACHE_TIMEOUT || '300000')
})

const analysisRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(['market', 'social', 'news', 'fundamentals', 'comprehensive']),
  parameters: z.record(z.any()).optional()
})

// Request new analysis
router.post('/', async (req, res) => {
  try {
    const requestData = analysisRequestSchema.parse(req.body)
    
    // Request analysis from trading agents service
    const result = await analysisService.requestAnalysis({
      symbol: requestData.symbol,
      type: requestData.type,
      parameters: requestData.parameters
    })
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Analysis request error:', error)
    res.status(400).json({
      success: false,
      error: 'Analysis request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get analysis status
router.get('/:id/status', (req, res) => {
  const analysis = analysisService.getAnalysisResult(req.params.id)
  
  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: 'Analysis not found'
    })
  }
  
  res.json({
    success: true,
    data: {
      id: analysis.id,
      symbol: analysis.symbol,
      type: analysis.type,
      status: analysis.status,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      error: analysis.error
    }
  })
})

// Get analysis result
router.get('/:id/result', (req, res) => {
  const result = analysisService.getAnalysisResult(req.params.id)
  
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

// Validate analysis request
router.post('/validate', async (req, res) => {
  try {
    const validation = await analysisService.validateAnalysisRequest(req.body)
    
    res.json({
      success: true,
      data: validation
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get analysis history
router.get('/history', (req, res) => {
  try {
    const symbol = req.query.symbol as string | undefined
    const limit = parseInt(req.query.limit as string) || 10
    
    const history = analysisService.getAnalysisHistory(symbol, limit)
    
    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to get analysis history',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get active analyses
router.get('/active', (_req, res) => {
  try {
    const activeAnalyses = analysisService.getActiveAnalyses()
    
    res.json({
      success: true,
      data: {
        activeRequests: activeAnalyses,
        count: activeAnalyses.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get active analyses',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Cancel analysis
router.delete('/:id', (req, res) => {
  try {
    const cancelled = analysisService.cancelAnalysis(req.params.id)
    
    if (cancelled) {
      res.json({
        success: true,
        data: { message: 'Analysis cancelled successfully' }
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'Analysis not found or already completed'
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cancel analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get service statistics
router.get('/stats', (_req, res) => {
  try {
    const stats = analysisService.getServiceStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export { router as analysisRoutes }