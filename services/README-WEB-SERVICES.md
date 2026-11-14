# TradingAgents Web Services

Modern web interface for the TradingAgents AI-powered trading analysis platform.

## 🏗️ Architecture

### Services Overview
- **Web Frontend** (`web-frontend/`): React 19.x + TypeScript + Tailwind CSS
- **Web API** (`web-api/`): Express 5.x + TypeScript + WebSocket support

### Technology Stack
```json
{
  "frontend": {
    "react": "^19.0.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.1",
    "tailwindcss": "^3.4.14",
    "zustand": "^5.0.1",
    "recharts": "^2.12.7"
  },
  "backend": {
    "express": "^5.0.1",
    "typescript": "^5.6.3",
    "ws": "^8.18.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0"
  }
}
```

## 🚀 Quick Start

### Development Mode

1. **Start API Server**:
   ```bash
   cd services/web-api
   npm install
   npm run dev
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   cd services/web-frontend
   npm install
   npm run dev
   ```

3. **Access Application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - WebSocket: ws://localhost:3001/ws

### Docker Deployment

```bash
# Start web services with all dependencies
docker compose up web-frontend web-api -d

# Start complete stack including web services
docker compose up -d

# View logs
docker compose logs -f web-frontend web-api

# Stop services
docker compose down
```

## 🎨 UI Design

### Futuristic Cyber Theme
- **Color Palette**: Dark backgrounds with electric blue, cyber purple, and neon accents
- **Typography**: Press Start 2P for headers, Fira Code for code/data, Inter for body text
- **Effects**: Neon glows, hover animations, gradient text, matrix-style backgrounds
- **Components**: Glassmorphism cards, animated progress bars, cyber-style buttons

### Key Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Updates**: WebSocket integration for live data
- **Interactive Charts**: Recharts integration for market data visualization
- **State Management**: Zustand for lightweight, type-safe state management

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /status` - System status and metrics

### Market Data
- `GET /market-data/:symbol` - Get current market data for symbol
- `GET /market-data/:symbol/history` - Get historical data

### Analysis
- `POST /analysis/start` - Start new trading analysis
- `GET /analysis/:id` - Get analysis results
- `GET /analysis/:id/progress` - Get analysis progress
- `DELETE /analysis/:id` - Cancel analysis

### Backtesting
- `POST /backtesting/start` - Start backtest
- `GET /backtesting/:id` - Get backtest results
- `GET /backtesting/history` - Get backtest history

### WebSocket Events
- `analysis:progress` - Real-time analysis progress updates
- `analysis:complete` - Analysis completion notification
- `market:update` - Live market data updates
- `system:status` - System status changes

## 🔧 Configuration

### Environment Variables

#### Web API (`web-api/.env`)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000

# Trading Agents Integration
TRADING_AGENTS_CLI_PATH=../trading-agents/dist/cli.js
TRADING_AGENTS_CONFIG_PATH=../trading-agents/config.json
```

#### Web Frontend (`web-frontend/.env`)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws

# Application Configuration
VITE_APP_NAME=TradingAgents
VITE_APP_VERSION=1.0.0
```

## 🐳 Docker Configuration

### Multi-stage Frontend Build
- **Stage 1**: Node.js build environment with Vite
- **Stage 2**: Nginx production server with optimized static assets
- **Features**: Gzip compression, security headers, API proxy, WebSocket support

### Backend Container
- **Base**: Node.js 22 Alpine for minimal footprint
- **Security**: Non-root user, dumb-init for signal handling
- **Health Checks**: Built-in health monitoring
- **Production**: Optimized for production deployment

### Network Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │
│   (nginx:80)    │◄──►│   (node:3001)   │
│                 │    │                 │
│ Static Assets   │    │ REST API        │
│ API Proxy       │    │ WebSocket       │
│ WebSocket Proxy │    │ Health Checks   │
└─────────────────┘    └─────────────────┘
```

## 🧪 Development

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Building
npm run build
```

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and WebSocket testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load testing and optimization

### Hot Reload Development
- **Frontend**: Vite HMR for instant React updates
- **Backend**: Nodemon with ts-node for TypeScript hot reload
- **WebSocket**: Automatic reconnection on server restart

## 📊 Monitoring & Observability

### Health Checks
- **Frontend**: Nginx status endpoint
- **Backend**: Express health endpoint with dependency checks
- **Docker**: Built-in container health monitoring

### Logging
- **Frontend**: Browser console and error tracking
- **Backend**: Structured logging with request correlation
- **Docker**: Container log aggregation

### Metrics
- **Performance**: Response times, throughput, error rates
- **Business**: Analysis requests, completion rates, user engagement
- **System**: Memory usage, CPU utilization, connection counts

## 🔒 Security

### Frontend Security
- **CSP Headers**: Content Security Policy for XSS protection
- **CORS**: Configured for specific origins only
- **Input Validation**: Zod schema validation for all forms
- **Sanitization**: Proper data sanitization and encoding

### Backend Security
- **Helmet.js**: Security headers middleware
- **Rate Limiting**: API endpoint rate limiting
- **Input Validation**: Request body and parameter validation
- **Error Handling**: Secure error responses without information leakage

### Container Security
- **Non-root Users**: All containers run as non-privileged users
- **Minimal Images**: Alpine-based images for reduced attack surface
- **Security Scanning**: Regular vulnerability scanning
- **Secrets Management**: Environment-based secret injection

## 🚀 Deployment

### Local Development
1. Clone repository
2. Install dependencies: `npm install` in both service directories
3. Start services: Use development scripts or Docker Compose
4. Access at http://localhost:3000

### Production Deployment
1. Build Docker images: `docker-compose -f docker-compose.web.yml build`
2. Deploy containers: `docker-compose -f docker-compose.web.yml up -d`
3. Configure reverse proxy (nginx/traefik) for HTTPS
4. Set up monitoring and logging aggregation

### Scaling Considerations
- **Horizontal Scaling**: Multiple API container instances behind load balancer
- **Database**: External database for persistent data storage
- **Caching**: Redis for session and data caching
- **CDN**: Static asset delivery via CDN

## 📝 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill processes if needed
taskkill /PID <process_id> /F
```

#### Docker Issues
```bash
# Clean up containers
docker-compose -f docker-compose.web.yml down -v

# Rebuild images
docker-compose -f docker-compose.web.yml build --no-cache

# View logs
docker-compose -f docker-compose.web.yml logs -f
```

#### WebSocket Connection Issues
- Check CORS configuration
- Verify WebSocket URL in frontend
- Check firewall/proxy settings
- Ensure WebSocket upgrade headers are properly handled

### Performance Optimization
- **Frontend**: Code splitting, lazy loading, asset optimization
- **Backend**: Connection pooling, caching, compression
- **Docker**: Multi-stage builds, layer optimization, resource limits

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with tests
3. Run quality checks: `npm run type-check && npm run lint`
4. Test Docker build: `docker-compose -f docker-compose.web.yml build`
5. Submit pull request

### Code Standards
- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **React**: Functional components with hooks, proper prop types
- **Styling**: Tailwind CSS utility classes, consistent design system
- **API**: RESTful design, proper HTTP status codes, error handling

---

## 📚 Additional Resources

- [React 19 Documentation](https://react.dev/)
- [Express 5.x Guide](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

For more information about the TradingAgents system, see the main project documentation.