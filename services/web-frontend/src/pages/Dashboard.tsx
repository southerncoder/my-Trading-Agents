import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  Activity, 
  BarChart3,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react'
import { useTradingStore } from '../stores/tradingStore'
import { api } from '../services/api'
import { SymbolSearch } from '../components/SymbolSearch'
import { MarketDataCard } from '../components/MarketDataCard'
import { AnalysisCard } from '../components/AnalysisCard'
import { ThemeDemo } from '../components/ThemeDemo'

export function Dashboard() {
  const {
    analysisHistory,
    backtestHistory,
    watchlist,
    marketData,
    updateMarketData
  } = useTradingStore()

  const [isLoading, setIsLoading] = useState(true)
  const [systemHealth, setSystemHealth] = useState<'online' | 'offline' | 'checking'>('checking')

  useEffect(() => {
    checkSystemHealth()
    loadWatchlistData()
  }, [])

  const checkSystemHealth = async () => {
    try {
      const response = await api.getHealth()
      setSystemHealth(response.success ? 'online' : 'offline')
    } catch {
      setSystemHealth('offline')
    } finally {
      setIsLoading(false)
    }
  }

  const loadWatchlistData = async () => {
    for (const symbol of watchlist) {
      try {
        const response = await api.getMarketData(symbol.symbol)
        if (response.success && response.data) {
          updateMarketData(symbol.symbol, response.data)
        }
      } catch (error) {
        console.error(`Failed to load data for ${symbol.symbol}:`, error)
      }
    }
  }

  const recentAnalyses = analysisHistory.slice(0, 3)
  const recentBacktests = backtestHistory.slice(0, 3)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent"
            style={{ 
              borderColor: 'var(--color-primary)',
              borderTopColor: 'transparent'
            }}
          ></div>
          <div 
            className="animate-pulse"
            style={{ 
              fontFamily: 'var(--font-secondary)',
              color: 'var(--color-primary)'
            }}
          >
            INITIALIZING_SYSTEM...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="transition-all duration-500">
          <h1 
            className="text-3xl mb-3 font-bold font-mono"
            style={{ 
              color: 'var(--color-primary)',
              lineHeight: '1.2'
            }}
          >
            // Dashboard
          </h1>
          <p 
            className="text-lg mb-8"
            style={{ 
              color: 'var(--color-text-secondary)'
            }}
          >
            AI-powered trading analysis and insights
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div 
            className={`flex items-center space-x-2 px-4 py-2 text-sm border transition-all duration-300 ${
              systemHealth === 'online' 
                ? 'status-online' 
                : systemHealth === 'offline'
                ? 'status-offline'
                : 'status-loading'
            }`}
            style={{ 
              borderRadius: 'var(--border-radius-lg)',
              fontFamily: 'var(--font-secondary)'
            }}
          >
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{
                backgroundColor: systemHealth === 'online' 
                  ? 'var(--color-bull)' 
                  : systemHealth === 'offline'
                  ? 'var(--color-bear)'
                  : 'var(--color-primary)'
              }}
            />
            <span>
              {systemHealth === 'online' ? 'SYSTEM_ONLINE' : 
               systemHealth === 'offline' ? 'SYSTEM_OFFLINE' : 'CHECKING...'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/analysis"
          className="card-glow cursor-pointer group hover-glow animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-press-start text-sm text-electric-blue group-hover:text-cyber-purple transition-colors mb-2">
                NEW_ANALYSIS
              </h3>
              <p className="text-sm text-slate-200 font-fira-code">
                Get AI-powered trading insights
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-electric-blue/20 to-cyber-purple/20 rounded-lg border border-electric-blue/30 group-hover:shadow-neon transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-electric-blue" />
            </div>
          </div>
        </Link>

        <Link
          to="/backtesting"
          className="card-glow cursor-pointer group hover-glow animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-press-start text-sm text-cyber-purple group-hover:text-neon-pink transition-colors mb-2">
                BACKTEST_STRATEGY
              </h3>
              <p className="text-sm text-slate-200 font-fira-code">
                Test strategies on historical data
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-cyber-purple/20 to-neon-pink/20 rounded-lg border border-cyber-purple/30 group-hover:shadow-neon transition-all duration-300">
              <Activity className="w-6 h-6 text-cyber-purple" />
            </div>
          </div>
        </Link>

        <Link
          to="/history"
          className="card-glow cursor-pointer group hover-glow animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-press-start text-sm text-neon-green group-hover:text-electric-blue transition-colors mb-2">
                VIEW_HISTORY
              </h3>
              <p className="text-sm text-slate-200 font-fira-code">
                Review past analyses and results
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-neon-green/20 to-electric-blue/20 rounded-lg border border-neon-green/30 group-hover:shadow-neon transition-all duration-300">
              <Clock className="w-6 h-6 text-neon-green" />
            </div>
          </div>
        </Link>
      </div>

      {/* Symbol Search */}
      <div className="card-glow animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h2 className="cyber-header text-xl mb-4 flex items-center">
          <span className="text-electric-blue">//</span>
          <span className="ml-2 gradient-text">QUICK_ANALYSIS</span>
        </h2>
        <SymbolSearch 
          placeholder="Enter stock symbol (AAPL, TSLA, MSFT)..."
          onSelect={(symbol) => {
            // Navigate to analysis page with selected symbol
            window.location.href = `/analysis/${symbol.symbol}`
          }}
        />
      </div>

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">Watchlist</h2>
            <button className="text-electric-blue hover:text-cyber-purple text-sm font-medium font-fira-code">
              Manage
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((symbol) => (
              <MarketDataCard
                key={symbol.symbol}
                symbol={symbol}
                data={marketData[symbol.symbol]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Analyses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">Recent Analyses</h2>
            <Link 
              to="/history" 
              className="text-electric-blue hover:text-cyber-purple text-sm font-medium flex items-center space-x-1 font-fira-code"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentAnalyses.length > 0 ? (
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} compact />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-fira-code">NO_ANALYSES_FOUND</p>
              <p className="font-fira-code text-sm">Start by analyzing a stock symbol</p>
            </div>
          )}
        </div>

        {/* Recent Backtests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">Recent Backtests</h2>
            <Link 
              to="/backtesting" 
              className="text-electric-blue hover:text-cyber-purple text-sm font-medium flex items-center space-x-1 font-fira-code"
            >
              <span>New Test</span>
              <Plus className="w-4 h-4" />
            </Link>
          </div>
          
          {recentBacktests.length > 0 ? (
            <div className="space-y-4">
              {recentBacktests.map((backtest) => (
                <div key={backtest.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-electric-blue/30 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-100 font-fira-code">
                        {backtest.strategy} - {backtest.symbol}
                      </h4>
                      <p className="text-sm text-slate-300 font-fira-code">
                        {new Date(backtest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium font-fira-code ${
                        backtest.totalReturn >= 0 ? 'text-bull-500' : 'text-bear-500'
                      }`}>
                        {backtest.totalReturn >= 0 ? '+' : ''}{backtest.totalReturn.toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-400 font-fira-code">
                        Sharpe: {backtest.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-fira-code">NO_BACKTESTS_FOUND</p>
              <p className="font-fira-code text-sm">Test your trading strategies</p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Demo Section */}
      <div className="mt-12">
        <h2 
          className="text-2xl font-bold mb-6 font-mono"
          style={{ 
            color: 'var(--color-primary)'
          }}
        >
          // Theme Demo
        </h2>
        <ThemeDemo />
      </div>
    </div>
  )
}