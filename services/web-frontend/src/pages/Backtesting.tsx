// import { useState } from 'react' // Unused for now
import { BarChart3, TrendingUp } from 'lucide-react'

export function Backtesting() {
  // const [isRunning, setIsRunning] = useState(false) // Unused for now

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="cyber-header text-3xl text-electric-blue">// Strategy Backtesting</h1>
        <p className="mt-2 text-slate-200 font-fira-code">
          Test your trading strategies against historical market data
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
          Backtesting Interface Coming Soon
        </h2>
        <p className="text-neutral-600 mb-6 max-w-md mx-auto">
          We're building a comprehensive backtesting interface that will allow you to test 
          trading strategies against historical data with detailed performance metrics.
        </p>
        
        <div className="bg-neutral-50 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="font-semibold text-neutral-900 mb-3">Planned Features:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-700">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Strategy Configuration</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Historical Data Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Performance Metrics</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Risk Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Equity Curve Visualization</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Walk-Forward Analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}