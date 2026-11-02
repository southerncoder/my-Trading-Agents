import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisProgress,
  BacktestResult,
  MarketData,
  TradingSymbol
} from '../types/trading'

interface TradingState {
  // Current analysis
  currentAnalysis: AnalysisRequest | null
  analysisProgress: AnalysisProgress | null
  analysisResult: AnalysisResult | null
  
  // Analysis history (stored in localStorage)
  analysisHistory: AnalysisResult[]
  
  // Backtesting
  currentBacktest: BacktestResult | null
  backtestHistory: BacktestResult[]
  
  // Market data
  marketData: Record<string, MarketData>
  watchlist: TradingSymbol[]
  
  // UI state
  isAnalyzing: boolean
  isBacktesting: boolean
  selectedSymbol: string | null
  
  // Actions
  setCurrentAnalysis: (analysis: AnalysisRequest | null) => void
  setAnalysisProgress: (progress: AnalysisProgress | null) => void
  setAnalysisResult: (result: AnalysisResult | null) => void
  addToAnalysisHistory: (result: AnalysisResult) => void
  
  setCurrentBacktest: (backtest: BacktestResult | null) => void
  addToBacktestHistory: (backtest: BacktestResult) => void
  
  updateMarketData: (symbol: string, data: MarketData) => void
  addToWatchlist: (symbol: TradingSymbol) => void
  removeFromWatchlist: (symbol: string) => void
  
  setIsAnalyzing: (analyzing: boolean) => void
  setIsBacktesting: (backtesting: boolean) => void
  setSelectedSymbol: (symbol: string | null) => void
  
  // Clear functions
  clearCurrentAnalysis: () => void
  clearAnalysisHistory: () => void
  clearBacktestHistory: () => void
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAnalysis: null,
      analysisProgress: null,
      analysisResult: null,
      analysisHistory: [],
      
      currentBacktest: null,
      backtestHistory: [],
      
      marketData: {},
      watchlist: [],
      
      isAnalyzing: false,
      isBacktesting: false,
      selectedSymbol: null,
      
      // Actions
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      
      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
      
      setAnalysisResult: (result) => set({ 
        analysisResult: result,
        currentAnalysis: result ? { ...get().currentAnalysis!, status: 'completed' } : null
      }),
      
      addToAnalysisHistory: (result) => set((state) => ({
        analysisHistory: [result, ...state.analysisHistory.slice(0, 49)] // Keep last 50
      })),
      
      setCurrentBacktest: (backtest) => set({ currentBacktest: backtest }),
      
      addToBacktestHistory: (backtest) => set((state) => ({
        backtestHistory: [backtest, ...state.backtestHistory.slice(0, 19)] // Keep last 20
      })),
      
      updateMarketData: (symbol, data) => set((state) => ({
        marketData: { ...state.marketData, [symbol]: data }
      })),
      
      addToWatchlist: (symbol) => set((state) => {
        const exists = state.watchlist.some(s => s.symbol === symbol.symbol)
        if (exists) return state
        return { watchlist: [...state.watchlist, symbol] }
      }),
      
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s.symbol !== symbol)
      })),
      
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      setIsBacktesting: (backtesting) => set({ isBacktesting: backtesting }),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      
      // Clear functions
      clearCurrentAnalysis: () => set({
        currentAnalysis: null,
        analysisProgress: null,
        analysisResult: null,
        isAnalyzing: false
      }),
      
      clearAnalysisHistory: () => set({ analysisHistory: [] }),
      clearBacktestHistory: () => set({ backtestHistory: [] }),
    }),
    {
      name: 'trading-agents-storage',
      partialize: (state) => ({
        // Only persist these fields to localStorage
        analysisHistory: state.analysisHistory,
        backtestHistory: state.backtestHistory,
        watchlist: state.watchlist,
        selectedSymbol: state.selectedSymbol,
      }),
    }
  )
)