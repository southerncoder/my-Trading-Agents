import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, CheckCircle } from 'lucide-react'
import { useTradingStore } from '../stores/tradingStore'
import { api, websocket } from '../services/api'
import { SymbolSearch } from '../components/SymbolSearch'
import { AnalysisProgress } from '../components/AnalysisProgress'
import { AnalysisResults } from '../components/AnalysisResults'
import type { TradingSymbol } from '../types/trading'

export function Analysis() {
  const { symbol: urlSymbol } = useParams()
  const navigate = useNavigate()
  
  const {
    currentAnalysis,
    analysisProgress,
    analysisResult,
    isAnalyzing,
    setCurrentAnalysis,
    setAnalysisProgress,
    setAnalysisResult,
    setIsAnalyzing,
    addToAnalysisHistory,
    clearCurrentAnalysis
  } = useTradingStore()

  const [selectedSymbol, setSelectedSymbol] = useState<TradingSymbol | null>(null)
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'market' | 'social' | 'news' | 'fundamentals'>('comprehensive')

  useEffect(() => {
    // If URL has a symbol, set it as selected
    if (urlSymbol && !selectedSymbol) {
      setSelectedSymbol({
        symbol: urlSymbol.toUpperCase(),
        name: `${urlSymbol.toUpperCase()} Analysis`,
        exchange: 'Unknown',
        type: 'stock'
      })
    }
  }, [urlSymbol, selectedSymbol])

  useEffect(() => {
    // Set up WebSocket connection for real-time updates
    const connectWebSocket = async () => {
      try {
        await websocket.connect()
        websocket.onMessage((message) => {
          if (message.type === 'analysis_progress') {
            setAnalysisProgress(message.data)
          }
        })
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      websocket.disconnect()
    }
  }, [setAnalysisProgress])

  const handleStartAnalysis = async () => {
    if (!selectedSymbol) return

    setIsAnalyzing(true)
    clearCurrentAnalysis()

    try {
      const response = await api.requestAnalysis(
        selectedSymbol.symbol,
        analysisType,
        {}
      )

      if (response.success && response.data) {
        setCurrentAnalysis(response.data)
        
        // Poll for results
        pollForResults(response.data.id)
      } else {
        throw new Error(response.error || 'Failed to start analysis')
      }
    } catch (error) {
      console.error('Analysis request failed:', error)
      setIsAnalyzing(false)
      // TODO: Show error toast
    }
  }

  const pollForResults = async (analysisId: string) => {
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const response = await api.getAnalysisResult(analysisId)
        
        if (response.success && response.data) {
          setAnalysisResult(response.data)
          addToAnalysisHistory(response.data)
          setIsAnalyzing(false)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          throw new Error('Analysis timeout')
        }
      } catch (error) {
        console.error('Failed to get analysis result:', error)
        setIsAnalyzing(false)
      }
    }

    poll()
  }

  const handleSymbolSelect = (symbol: TradingSymbol) => {
    setSelectedSymbol(symbol)
    navigate(`/analysis/${symbol.symbol}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="cyber-header text-3xl text-electric-blue">// Trading Analysis</h1>
        <p className="mt-2 text-slate-200 font-fira-code">
          Get AI-powered insights from 12 specialized trading agents
        </p>
      </div>

      {/* Analysis Setup */}
      {!isAnalyzing && !analysisResult && (
        <div className="card-glow">
          <h2 className="cyber-header text-xl text-electric-blue mb-6">
            // START_NEW_ANALYSIS
          </h2>
          
          <div className="space-y-6">
            {/* Symbol Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2 font-fira-code">
                Select Stock Symbol
              </label>
              <SymbolSearch
                placeholder="Search for a stock symbol (e.g., AAPL, TSLA, MSFT)"
                onSelect={handleSymbolSelect}
              />
              {selectedSymbol && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Selected: {selectedSymbol.symbol} - {selectedSymbol.name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Type */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2 font-fira-code">
                Analysis Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { 
                    value: 'comprehensive', 
                    label: 'Comprehensive', 
                    description: 'All 12 agents (4-phase analysis)' 
                  },
                  { 
                    value: 'market', 
                    label: 'Market Only', 
                    description: 'Technical analysis focus' 
                  },
                  { 
                    value: 'fundamentals', 
                    label: 'Fundamentals', 
                    description: 'Financial metrics analysis' 
                  },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setAnalysisType(type.value as any)}
                    className={`p-4 text-left border rounded-lg transition-all font-fira-code ${
                      analysisType === type.value
                        ? 'border-electric-blue bg-electric-blue/10 shadow-neon'
                        : 'border-slate-600 hover:border-electric-blue/50 bg-slate-800/50'
                    }`}
                  >
                    <div className="font-medium text-slate-100">{type.label}</div>
                    <div className="text-sm text-slate-300 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-end">
              <button
                onClick={handleStartAnalysis}
                disabled={!selectedSymbol}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && currentAnalysis && (
        <AnalysisProgress 
          analysis={currentAnalysis}
          progress={analysisProgress}
        />
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <AnalysisResults 
          result={analysisResult}
          onNewAnalysis={() => {
            clearCurrentAnalysis()
            setSelectedSymbol(null)
            navigate('/analysis')
          }}
        />
      )}
    </div>
  )
}