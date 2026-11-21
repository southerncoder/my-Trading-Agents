import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Today } from './pages/Today'
import { Stock } from './pages/Stock'
import { Stocks } from './pages/Stocks'
import { Platform } from './pages/Platform'
import { Analysis } from './pages/Analysis'
import { Backtesting } from './pages/Backtesting'
import { History } from './pages/History'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/stock/:ticker" element={<Stock />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/analysis/:symbol" element={<Analysis />} />
          <Route path="/backtesting" element={<Backtesting />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App