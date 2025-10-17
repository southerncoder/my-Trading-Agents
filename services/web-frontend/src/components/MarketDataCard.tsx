import { TrendingUp, TrendingDown } from 'lucide-react'
import type { TradingSymbol, MarketData } from '../types/trading'

interface MarketDataCardProps {
  symbol: TradingSymbol
  data?: MarketData
  onClick?: () => void
}

export function MarketDataCard({ symbol, data, onClick }: MarketDataCardProps) {
  const isPositive = data ? data.change >= 0 : false
  const isLoading = !data

  return (
    <div 
      className={`p-4 bg-white border border-neutral-200 rounded-lg transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-neutral-900">{symbol.symbol}</h3>
          <p className="text-sm text-neutral-600 truncate max-w-32">
            {symbol.name}
          </p>
        </div>
        <div className="text-xs text-neutral-500 uppercase">
          {symbol.exchange}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-6 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-4 bg-neutral-200 rounded animate-pulse w-2/3"></div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-neutral-900">
              ${data.price.toFixed(2)}
            </span>
            <div className={`flex items-center space-x-1 ${
              isPositive ? 'text-bull-600' : 'text-bear-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}{data.change.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${
              isPositive ? 'text-bull-600' : 'text-bear-600'
            }`}>
              {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
            </span>
            <span className="text-neutral-500">
              Vol: {(data.volume / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>
      )}
    </div>
  )
}