import { useState } from 'react'
import { Search, Filter, Download, Clock } from 'lucide-react'
import { useTradingStore } from '../stores/tradingStore'
import { AnalysisCard } from '../components/AnalysisCard'

export function History() {
  const { analysisHistory, backtestHistory } = useTradingStore()
  const [activeTab, setActiveTab] = useState<'analyses' | 'backtests'>('analyses')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'market' | 'social' | 'news' | 'fundamentals' | 'comprehensive'>('all')

  const filteredAnalyses = analysisHistory.filter(analysis => {
    const matchesSearch = analysis.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || analysis.type === filterType
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="cyber-header text-3xl text-electric-blue">// Analysis History</h1>
          <p className="mt-2 text-slate-200 font-fira-code">
            Review your past trading analyses and backtesting results
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export History</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analyses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'analyses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Analyses ({analysisHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('backtests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'backtests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Backtests ({backtestHistory.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'analyses' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="input-field pl-9 pr-8 appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="market">Market</option>
              <option value="social">Social</option>
              <option value="news">News</option>
              <option value="fundamentals">Fundamentals</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'analyses' ? (
        <div className="space-y-6">
          {filteredAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAnalyses.map((analysis) => (
                <AnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  onClick={() => {
                    // TODO: Navigate to detailed analysis view
                    console.log('View analysis:', analysis.id)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                {searchQuery || filterType !== 'all' ? 'No matching analyses' : 'No analyses yet'}
              </h3>
              <p className="text-neutral-600">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by analyzing a stock symbol to see your history here'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {backtestHistory.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {backtestHistory.map((backtest) => (
                <div key={backtest.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {backtest.strategy} - {backtest.symbol}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {new Date(backtest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        backtest.totalReturn >= 0 ? 'text-bull-600' : 'text-bear-600'
                      }`}>
                        {backtest.totalReturn >= 0 ? '+' : ''}{backtest.totalReturn.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-600">Sharpe Ratio:</span>
                      <span className="ml-2 font-medium">{backtest.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Max Drawdown:</span>
                      <span className="ml-2 font-medium text-bear-600">
                        {backtest.maxDrawdown.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Win Rate:</span>
                      <span className="ml-2 font-medium">{backtest.winRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Total Trades:</span>
                      <span className="ml-2 font-medium">{backtest.totalTrades}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                No backtests yet
              </h3>
              <p className="text-neutral-600">
                Run your first backtest to see results here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}