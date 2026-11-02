import { Clock, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'
import type { AnalysisResult } from '../types/trading'

interface AnalysisCardProps {
  analysis: AnalysisResult
  compact?: boolean
  onClick?: () => void
}

export function AnalysisCard({ analysis, compact = false, onClick }: AnalysisCardProps) {
  const recommendation = analysis.finalRecommendation
  // Removed unused variables - using recommendation.action directly
  
  const getRecommendationIcon = () => {
    switch (recommendation.action) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4" />
      case 'SELL':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getRecommendationColor = () => {
    switch (recommendation.action) {
      case 'BUY':
        return 'text-bull-600 bg-bull-50'
      case 'SELL':
        return 'text-bear-600 bg-bear-50'
      default:
        return 'text-neutral-600 bg-neutral-50'
    }
  }

  const getRiskColor = () => {
    switch (recommendation.riskLevel) {
      case 'LOW':
        return 'text-bull-600 bg-bull-50'
      case 'HIGH':
        return 'text-bear-600 bg-bear-50'
      default:
        return 'text-yellow-600 bg-yellow-50'
    }
  }

  return (
    <div 
      className={`bg-white border border-neutral-200 rounded-lg transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
      } ${compact ? 'p-4' : 'p-6'}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">
              {analysis.symbol}
            </h3>
            <p className="text-sm text-neutral-600 capitalize">
              {analysis.type} Analysis
            </p>
          </div>
        </div>
        
        {onClick && (
          <ExternalLink className="w-4 h-4 text-neutral-400" />
        )}
      </div>

      {/* Market Data */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-neutral-900">
            ${analysis.marketData.currentPrice.toFixed(2)}
          </span>
          <div className={`inline-flex items-center ml-2 text-sm ${
            analysis.marketData.change >= 0 ? 'text-bull-600' : 'text-bear-600'
          }`}>
            {analysis.marketData.change >= 0 ? '+' : ''}
            {analysis.marketData.change.toFixed(2)} 
            ({analysis.marketData.changePercent.toFixed(2)}%)
          </div>
        </div>
        
        <div className="text-right text-sm text-neutral-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(analysis.completedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor()}`}>
            {getRecommendationIcon()}
            <span>{recommendation.action}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Confidence:</span>
            <div className="w-16 bg-neutral-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${recommendation.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-neutral-900">
              {(recommendation.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getRiskColor()}`}>
            <span>Risk: {recommendation.riskLevel}</span>
          </div>
          
          {recommendation.targetPrice && (
            <div className="text-sm text-neutral-600">
              Target: <span className="font-medium">${recommendation.targetPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        {!compact && (
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-sm text-neutral-700 line-clamp-2">
              {recommendation.reasoning}
            </p>
          </div>
        )}
      </div>

      {/* Phase Summary (compact view) */}
      {compact && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Phases: {analysis.phase1Results.length + analysis.phase2Results.length + analysis.phase3Results.length + analysis.phase4Results.length} agents</span>
            <span>Completed in {Math.round((new Date(analysis.completedAt).getTime() - new Date(analysis.createdAt).getTime()) / 1000)}s</span>
          </div>
        </div>
      )}
    </div>
  )
}