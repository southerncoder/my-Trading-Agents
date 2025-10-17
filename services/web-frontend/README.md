# TradingAgents Web Frontend

Modern React 19.x web interface for the TradingAgents multi-agent trading analysis system with HTTPS support.

## Features

- **Modern Stack**: React 19.x + TypeScript + Vite + Tailwind CSS
- **HTTPS Support**: Local development certificates with mkcert
- **Real-time Updates**: WebSocket integration for live analysis progress
- **Responsive Design**: Works on desktop, tablet, and mobile
- **No Authentication**: Simple local deployment (auth can be added later)
- **Interactive Charts**: Financial data visualization with Recharts
- **State Management**: Zustand with localStorage persistence

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

# Preview production build
npm run preview              # HTTP
npm run preview:https        # HTTPS
```

## Development

The frontend runs on `http://localhost:3000` and proxies API requests to `http://localhost:3001`.

### Available Scripts

- `npm run dev` - Start development server with hot reload (HTTP)
- `npm run dev:https` - Start development server with HTTPS
- `npm run build` - Build for production
- `npm run preview` - Preview production build (HTTP)
- `npm run preview:https` - Preview production build with HTTPS
- `npm run generate-certs` - Generate SSL certificates (Linux/macOS)
- `npm run generate-certs:windows` - Generate SSL certificates (Windows)
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components (Dashboard, Analysis, etc.)
├── services/           # API client and WebSocket
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── main.tsx           # Application entry point
```

## API Integration

The frontend expects a backend API running on port 3001 with the following endpoints:

- `GET /api/health` - System health check
- `GET /api/symbols/search?q=query` - Symbol search
- `POST /api/analysis` - Request new analysis
- `GET /api/analysis/:id/result` - Get analysis results
- `WS /ws` - WebSocket for real-time updates

## Configuration

### Environment Variables

Create `.env.local` for local development:

```bash
# HTTPS Configuration
HTTPS_ENABLED=true
VITE_HTTPS_ENABLED=true

# Secure API Configuration (when using HTTPS)
VITE_API_URL=https://localhost:3001/api
VITE_WS_URL=wss://localhost:3001

# Development Mode
NODE_ENV=development
VITE_NODE_ENV=development
```

### HTTP Configuration (Basic)
```bash
# Basic HTTP setup
HTTPS_ENABLED=false
VITE_HTTPS_ENABLED=false
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

### HTTPS Setup

#### 🔒 Certificate Generation
```bash
# Automatic certificate generation
npm run generate-certs:windows  # Windows PowerShell
npm run generate-certs          # Linux/macOS

# Manual generation with mkcert (recommended)
mkcert -install
mkcert -key-file certs/frontend-key.pem -cert-file certs/frontend-cert.pem localhost 127.0.0.1 ::1

# Start with HTTPS
npm run dev:https
```

#### 🛡️ Security Features
- **Locally Trusted Certificates**: mkcert generates browser-trusted certificates
- **Secure WebSocket**: Automatic wss:// connection when HTTPS enabled
- **API Proxy**: Vite proxies API requests with proper SSL handling
- **Development Security**: Self-signed certificate support for local development

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. Serve the `dist` folder with any static file server
3. Ensure the backend API is accessible at the configured URL

## Technology Stack

- **React 19.x** - UI framework with latest features
- **TypeScript 5.x** - Type safety and developer experience
- **Vite 7.x** - Fast build tool and dev server
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Recharts** - React charting library for financial data
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing

## Features Roadmap

### Phase 1 (Current)
- ✅ Basic UI structure and navigation
- ✅ Symbol search and selection
- ✅ Analysis request interface
- ✅ Real-time progress tracking
- ✅ Results visualization
- ✅ Analysis history

### Phase 2 (Next)
- [ ] Backtesting interface
- [ ] Advanced charting with technical indicators
- [ ] Portfolio tracking
- [ ] Export functionality (PDF, CSV)
- [ ] User preferences and settings

### Phase 3 (Future)
- [ ] Authentication system
- [ ] Collaborative features
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Real-time market data streaming