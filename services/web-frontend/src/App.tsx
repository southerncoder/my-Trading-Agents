import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Today } from './pages/Today'
import { Stock } from './pages/Stock'
import { Stocks } from './pages/Stocks'
import { Platform } from './pages/Platform'
import { Scorecard } from './pages/Scorecard'
import { Analysis } from './pages/Analysis'
import { Backtesting } from './pages/Backtesting'
import { History } from './pages/History'
import { Picks } from './pages/Picks'
import { Portfolios } from './pages/Portfolios'
import { Portfolio } from './pages/Portfolio'
import { Results } from './pages/Results'
import { Reviews } from './pages/Reviews'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/stock/:ticker" element={<Stock />} />
          <Route path="/scorecard" element={<Scorecard />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/analysis/:symbol" element={<Analysis />} />
          <Route path="/backtesting" element={<Backtesting />} />
          <Route path="/history" element={<History />} />
          <Route path="/picks" element={<Picks />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolios/:id" element={<Portfolio />} />
          <Route path="/results" element={<Results />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews/:week" element={<Reviews />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App