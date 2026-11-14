import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Analysis } from './pages/Analysis'
import { Backtesting } from './pages/Backtesting'
import { History } from './pages/History'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
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