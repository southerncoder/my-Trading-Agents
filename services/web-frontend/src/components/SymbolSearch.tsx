import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp } from 'lucide-react'
import { api } from '../services/api'
import type { TradingSymbol } from '../types/trading'

interface SymbolSearchProps {
  placeholder?: string
  onSelect: (symbol: TradingSymbol) => void
  className?: string
}

export function SymbolSearch({ 
  placeholder = "Search stocks...", 
  onSelect, 
  className = "" 
}: SymbolSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TradingSymbol[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Popular symbols for empty state
  const popularSymbols: TradingSymbol[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock' },
  ]

  useEffect(() => {
    const searchSymbols = async () => {
      if (query.length < 1) {
        setResults(popularSymbols)
        return
      }

      if (query.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await api.searchSymbols(query)
        if (response.success && response.data) {
          setResults(response.data)
        } else {
          setResults([])
        }
      } catch (error) {
        console.error('Symbol search failed:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchSymbols, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelect = (symbol: TradingSymbol) => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    onSelect(symbol)
  }

  const displayResults = query.length < 2 ? popularSymbols : results

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-electric-blue w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay closing to allow clicking on results
            setTimeout(() => setIsOpen(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input-field pl-12 pr-12 text-lg shadow-cyber focus:shadow-neon"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-electric-blue border-t-transparent shadow-neon"></div>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full mt-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-cyber-lg max-h-64 overflow-y-auto"
        >
          {query.length < 2 && (
            <div className="px-4 py-3 font-fira-code text-sm text-electric-blue border-b border-slate-700">
              // POPULAR_SYMBOLS
            </div>
          )}
          
          {displayResults.length > 0 ? (
            displayResults.map((symbol, index) => (
              <button
                key={symbol.symbol}
                onClick={() => handleSelect(symbol)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-all duration-300 ${
                  index === selectedIndex ? 'bg-electric-blue/20 border-l-2 border-electric-blue shadow-neon' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-electric-blue/20 to-cyber-purple/20 rounded-lg flex items-center justify-center border border-electric-blue/30">
                      <TrendingUp className="w-5 h-5 text-electric-blue" />
                    </div>
                    <div>
                      <div className="font-fira-code font-semibold text-slate-100">
                        {symbol.symbol}
                      </div>
                      <div className="font-fira-code text-sm text-slate-400 truncate max-w-xs">
                        {symbol.name}
                      </div>
                    </div>
                  </div>
                  <div className="font-fira-code text-xs text-electric-blue uppercase">
                    {symbol.exchange}
                  </div>
                </div>
              </button>
            ))
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-8 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-fira-code">NO_SYMBOLS_FOUND</p>
              <p className="font-fira-code text-sm">Try a different search term</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}