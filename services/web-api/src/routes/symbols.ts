import { Router } from 'express'
import { z } from 'zod'

const router = Router()

// Mock symbol data - in production this would connect to real data providers
const mockSymbols = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', type: 'stock' },
  { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', type: 'stock' },
]

const searchSchema = z.object({
  q: z.string().min(1).max(10)
})

router.get('/search', (req, res) => {
  try {
    const { q } = searchSchema.parse(req.query)
    
    const results = mockSymbols.filter(symbol => 
      symbol.symbol.toLowerCase().includes(q.toLowerCase()) ||
      symbol.name.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10) // Limit to 10 results
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid search query',
      message: 'Query parameter "q" is required and must be 1-10 characters'
    })
  }
})

export { router as symbolRoutes }