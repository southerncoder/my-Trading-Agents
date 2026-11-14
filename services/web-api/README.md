# TradingAgents Web API

Express.js backend API server for the TradingAgents web frontend with comprehensive security features.

## Features

- **REST API**: Express.js 5.x with TypeScript
- **WebSocket**: Real-time updates for analysis progress
- **HTTPS Support**: Local development certificates with mkcert
- **Security**: Comprehensive protection with Helmet.js, CORS, rate limiting
- **Input Validation**: Zod schemas with security pattern detection
- **Rate Limiting**: API abuse prevention with configurable limits
- **Mock Data**: Simulated trading analysis for development

## Quick Start

### Basic Setup (HTTP)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Secure Setup (HTTPS)
```bash
# Generate local SSL certificates
npm run generate-certs          # Linux/macOS
npm run generate-certs:windows  # Windows PowerShell

# Start with HTTPS enabled
npm run dev:https
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start              # HTTP
npm run start:https    # HTTPS
```

## API Endpoints

### Health Check
- `GET /api/health` - System health and status

### Symbol Search
- `GET /api/symbols/search?q=query` - Search for trading symbols

### Analysis
- `POST /api/analysis` - Request new trading analysis
- `GET /api/analysis/:id/status` - Get analysis status
- `GET /api/analysis/:id/result` - Get analysis results

### WebSocket
- `WS /ws` - Real-time updates for analysis progress

## Development

The API server runs on `http://localhost:3001` and accepts requests from `http://localhost:3000` (frontend).

### Environment Variables

Create `.env.local` file:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Security Configuration
HTTPS_ENABLED=true
FRONTEND_URL=https://localhost:3000
ALLOWED_ORIGINS=https://localhost:3000,https://127.0.0.1:3000

# Rate Limiting (optional - has defaults)
API_RATE_LIMIT_MAX=1000          # Development: more lenient
ANALYSIS_RATE_LIMIT_MAX=100      # Development: more lenient
```

### Security Features

#### ✅ Implemented Security
- **CORS Protection**: Restricts API access to authorized origins
- **Rate Limiting**: Prevents API abuse (100 req/15min, 10 analysis/5min)
- **Input Validation**: Zod schemas with XSS/injection protection
- **Security Headers**: Comprehensive browser protection with Helmet.js
- **HTTPS Support**: Local development certificates with mkcert/OpenSSL
- **Request Monitoring**: Security event logging and suspicious activity detection

#### 🔒 HTTPS Configuration
```bash
# Generate certificates (automatic)
npm run generate-certs          # Uses mkcert (recommended) or OpenSSL fallback

# Manual certificate generation with mkcert
mkcert -install
mkcert -key-file certs/api-key.pem -cert-file certs/api-cert.pem localhost 127.0.0.1 ::1

# Enable HTTPS
export HTTPS_ENABLED=true
npm run dev:https
```

#### 🛡️ Security Monitoring
The API automatically detects and logs:
- XSS injection attempts
- SQL injection patterns  
- Directory traversal attempts
- Code injection attempts
- Rate limit violations
- Unauthorized origin requests

### Mock Analysis Flow

The API simulates the 4-phase TradingAgents analysis:

1. **Phase 1: Intelligence** (4 agents)
   - Market Analyst
   - Social Analyst  
   - News Analyst
   - Fundamentals Analyst

2. **Phase 2: Research** (3 agents)
   - Bull Researcher
   - Bear Researcher
   - Research Manager

3. **Phase 3: Risk Assessment** (4 agents)
   - Risky Analyst
   - Safe Analyst
   - Neutral Analyst
   - Portfolio Manager

4. **Phase 4: Trading Decision** (1 agent)
   - Learning Trader

Each phase takes 2-5 seconds per agent with real-time WebSocket updates.

## Integration with TradingAgents

To integrate with the actual TradingAgents system:

1. Replace mock analysis in `src/routes/analysis.ts` with calls to the actual trading-agents service
2. Connect to real market data providers for symbol search
3. Implement proper error handling and logging
4. Add authentication if needed

## Production Deployment

### Security Checklist
- [x] **HTTPS Enabled**: Production SSL certificates configured
- [x] **CORS Configured**: Only production domains allowed
- [x] **Rate Limiting**: Production limits enforced (100 req/15min)
- [x] **Security Headers**: Comprehensive protection enabled
- [x] **Input Validation**: All endpoints protected against injection
- [x] **Security Monitoring**: Logging and alerting configured

### Production Configuration
```bash
# Production environment
NODE_ENV=production
HTTPS_ENABLED=true
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# Security settings
API_RATE_LIMIT_MAX=100           # Production: strict limits
ANALYSIS_RATE_LIMIT_MAX=10       # Production: strict limits
```

### Additional Production Steps
1. Install production SSL certificates (Let's Encrypt, commercial CA)
2. Configure reverse proxy (nginx) with additional security headers
3. Set up monitoring and alerting for security events
4. Implement log aggregation and analysis
5. Regular security audits and dependency updates

## Authentication Architecture

### Current: No Authentication (MVP)
- **Local Development**: Direct API access for single-user scenarios
- **Security**: CORS, rate limiting, input validation, HTTPS

### Future: Planned Authentication Phases
1. **Phase 1 (3-6 months)**: Simple file-based authentication
2. **Phase 2 (6-12 months)**: Database authentication with JWT
3. **Phase 3 (12+ months)**: Enterprise SSO and compliance features

See `docs/AUTHENTICATION-ARCHITECTURE.md` for detailed planning.

## Technology Stack

- **Express.js 5.x** - Web framework
- **TypeScript** - Type safety
- **WebSocket (ws)** - Real-time communication
- **Zod** - Request validation and security
- **Helmet** - Comprehensive security headers
- **express-rate-limit** - API rate limiting
- **CORS** - Cross-origin request control
- **UUID** - Unique identifiers
- **Node.js HTTPS** - SSL/TLS support

## Documentation

- **[Security Setup Guide](docs/SECURITY-SETUP.md)** - Comprehensive security configuration
- **[Authentication Architecture](docs/AUTHENTICATION-ARCHITECTURE.md)** - Future authentication planning
- **[Certificate Management](certs/README.md)** - HTTPS certificate setup