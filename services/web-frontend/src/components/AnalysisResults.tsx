import { useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  RefreshCw,
  BarChart3,
  Users,
  Target,
  Shield
} from 'lucide-react'
import type { AnalysisResult } from '../types/trading'

interface AnalysisResultsProps {
  result: AnalysisResult
  onNewAnalysis: () => void
}

export function AnalysisResults({ result, onNewAnalysis }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'details'>('overview')
  
  const recommendation = result.finalRecommendation
  const marketData = result.marketData
  
  const getRecommendationIcon = () => {
    switch (recommendation.action) {
      case 'BUY':
        return <TrendingUp className="w-6 h-6" />
      case 'SELL':
        return <TrendingDown className="w-6 h-6" />
      default:
        return <Minus className="w-6 h-6" />
    }
  }

  const getRecommendationColor = () => {
    switch (recommendation.action) {
      case 'BUY':
        return 'text-bull-600 bg-bull-50 border-bull-200'
      case 'SELL':
        return 'text-bear-600 bg-bear-50 border-bear-200'
      default:
        return 'text-neutral-600 bg-neutral-50 border-neutral-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            Analysis Results: {result.symbol}
          </h2>
          <p className="text-neutral-600">
            Completed {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={onNewAnalysis}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Price */}
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900">
              ${marketData.currentPrice.toFixed(2)}
            </div>
            <div className={`text-sm font-medium ${
              marketData.change >= 0 ? 'text-bull-600' : 'text-bear-600'
            }`}>
              {marketData.change >= 0 ? '+' : ''}{marketData.change.toFixed(2)} 
              ({marketData.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="card">
          <div className="text-center">
            <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${getRecommendationColor()}`}>
              {getRecommendationIcon()}
              <span className="font-semibold">{recommendation.action}</span>
            </div>
            <div className="text-sm text-neutral-600 mt-2">
              {(recommendation.confidence * 100).toFixed(0)}% Confidence
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="card">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Shield className="w-5 h-5 text-neutral-600" />
              <span className="font-semibold text-neutral-900">
                {recommendation.riskLevel}
              </span>
            </div>
            <div className="text-sm text-neutral-600">Risk Level</div>
          </div>
        </div>

        {/* Target Price */}
        <div className="card">
          <div className="text-center">
            {recommendation.targetPrice ? (
              <>
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Target className="w-5 h-5 text-neutral-600" />
                  <span className="font-semibold text-neutral-900">
                    ${recommendation.targetPrice.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-neutral-600">Target Price</div>
              </>
            ) : (
              <div className="text-neutral-500">No Target Set</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'phases', label: 'Agent Analysis', icon: Users },
            { id: 'details', label: 'Details', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Analysis Summary
            </h3>
            <div className="prose max-w-none">
              <p className="text-neutral-700 leading-relaxed">
                {recommendation.reasoning}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <div className="space-y-6">
            {/* Phase Results would go here */}
            <div className="card">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Agent Analysis Results
              </h3>
              <p className="text-neutral-600">
                Detailed agent analysis results will be displayed here.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Technical Details
            </h3>
            <p className="text-neutral-600">
              Technical analysis details and raw data will be displayed here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}