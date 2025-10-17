import { WebSocketServer, WebSocket } from 'ws'

interface AnalysisProgress {
  requestId: string
  phase: 1 | 2 | 3 | 4
  phaseName: 'Intelligence' | 'Research' | 'Risk Assessment' | 'Trading Decision'
  currentAgent: string
  progress: number
  message: string
  timestamp: string
}

interface WebSocketMessage {
  type: 'analysis_progress' | 'market_data' | 'error'
  data: any
  timestamp: string
}

const clients = new Set<WebSocket>()

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected')
    clients.add(ws)
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      data: { message: 'Connected to TradingAgents WebSocket' },
      timestamp: new Date().toISOString()
    }))
    
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString())
        console.log('Received WebSocket message:', data)
        
        // Handle different message types here
        // For now, just echo back
        ws.send(JSON.stringify({
          type: 'echo',
          data,
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('WebSocket message error:', error)
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: new Date().toISOString()
        }))
      }
    })
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected')
      clients.delete(ws)
    })
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      clients.delete(ws)
    })
  })
  
  console.log('WebSocket server setup complete')
}

export function broadcastProgress(progress: AnalysisProgress) {
  const message: WebSocketMessage = {
    type: 'analysis_progress',
    data: progress,
    timestamp: new Date().toISOString()
  }
  
  broadcast(message)
}

export function broadcastMarketData(marketData: any) {
  const message: WebSocketMessage = {
    type: 'market_data',
    data: marketData,
    timestamp: new Date().toISOString()
  }
  
  broadcast(message)
}

function broadcast(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message)
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        clients.delete(client)
      }
    } else {
      clients.delete(client)
    }
  })
  
  console.log(`Broadcasted ${message.type} to ${clients.size} clients`)
}