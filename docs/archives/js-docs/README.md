# Trading Agents TypeScript Implementation

## Project Overview

This is a TypeScript conversion of a Python-based multi-agent trading system that uses LangChain and LangGraph to orchestrate intelligent agents for financial analysis and trading decisions.

## Project Structure

```
js/                           # TypeScript implementation root
├── src/                      # Source code
│   ├── agents/              # Trading agent implementations
│   │   ├── base/           # Base agent classes and interfaces
│   │   ├── analysts/       # Market analysis agents
│   │   ├── researchers/    # Investment research agents
│   │   ├── managers/       # Decision management agents
│   │   ├── trader/         # Trading strategy agents
│   │   ├── risk-mgmt/      # Risk management agents
│   │   └── utils/          # Agent utilities
│   ├── config/             # Configuration management
│   ├── dataflows/          # External data integration
│   ├── graph/              # Graph orchestration (TBD)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # General utilities
├── docs/                    # Project documentation
│   ├── agents/             # Agent specifications
│   ├── architecture/       # System architecture docs
│   └── progress/           # Development progress tracking
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── debugScripts/           # Debug and development scripts
│   └── results/            # Debug script outputs
├── dist/                   # Compiled JavaScript output
└── node_modules/           # Dependencies
```

## Intended Users

### Primary Users
- **Financial Analysts**: Looking for AI-powered analysis tools
- **Quantitative Traders**: Seeking automated trading decision support
- **Portfolio Managers**: Requiring comprehensive risk assessment
- **Financial Technology Developers**: Building on the framework

### Developer Users
- **AI/ML Engineers**: Extending agent capabilities
- **Full-Stack Developers**: Integrating with web applications
- **DevOps Engineers**: Deploying and scaling the system
- **Open Source Contributors**: Enhancing the codebase

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **AI Framework**: LangChain + LangGraph
- **LLM Providers**: OpenAI, Anthropic, Google GenAI
- **Data Sources**: Yahoo Finance, Finnhub, Google News, Reddit, SimFin
- **Testing**: Jest (planned)
- **Build**: TypeScript Compiler

## Current Status

✅ **Completed Components:**
- Project scaffolding and TypeScript configuration
- Configuration system with environment variable support
- Dataflows toolkit with modular API integration
- Agent state management and utilities
- Complete agent implementation (12 agents across 5 teams)

🚧 **In Progress:**
- Graph orchestration components
- Main trading graph implementation

📋 **Planned:**
- CLI interface with Rich-style formatting
- Comprehensive test suite
- Documentation and examples

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- API keys for data providers (optional for development)

### Installation
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys (optional)
# nano .env

# Build the project
npm run build

# Run development version
npm run dev
```

### Development Scripts
```bash
npm run build      # Compile TypeScript
npm run dev        # Run with ts-node
npm run lint       # Run ESLint
npm run test       # Run tests (planned)
```

## Agent Workflow

The system implements a multi-stage agent workflow:

1. **Analyst Team** (Parallel execution)
   - Market Analyst: Technical analysis
   - Social Analyst: Sentiment analysis  
   - News Analyst: News impact analysis
   - Fundamentals Analyst: Financial analysis

2. **Research Team** (Debate-style execution)
   - Bull Researcher: Positive investment thesis
   - Bear Researcher: Risk-focused arguments
   - Research Manager: Synthesizes final recommendation

3. **Trading Team**
   - Trader: Creates concrete trading strategies

4. **Risk Management Team** (Multi-perspective analysis)
   - Risky Analyst: Aggressive strategies
   - Safe Analyst: Conservative approaches
   - Neutral Analyst: Balanced perspective
   - Portfolio Manager: Final decision

## Configuration

The system supports multiple LLM providers and data sources:

### LLM Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Local/Custom endpoints

### Data Sources
- Yahoo Finance (market data)
- Finnhub (news, fundamentals)
- Google News (news analysis)
- Reddit (social sentiment)
- SimFin (financial statements)
- OpenAI (data analysis)

## Interactive CLI System

The Trading Agents framework includes a comprehensive command-line interface for interaction and debugging:

### CLI Features
- **Interactive Main Menu**: User-friendly navigation with multiple options
- **Configuration Management**: Save, load, and manage analysis configurations
- **Export System**: Multi-format result export (JSON, CSV, Markdown, HTML)
- **Historical Analysis**: Trend analysis and comparative insights
- **Real-time Progress**: Live progress tracking during analysis execution

### Command Structure
```bash
# Core commands
npm run cli                    # Interactive main menu
npm run cli:analyze           # Direct analysis execution
npm run cli:menu              # Show main menu
npm run cli:export            # Export analysis results
npm run cli:historical        # Historical data analysis
npm run cli:config            # Configuration management

# With compiled JavaScript
node dist/cli/cli.js --help   # Show all options
node dist/cli/cli.js menu     # Interactive menu
node dist/cli/cli.js analyze  # Run analysis
```

### Verbose Logging System

The CLI includes enterprise-grade verbose logging for debugging and monitoring:

#### Command Line Options
```bash
# Basic verbose logging
node dist/cli/cli.js --verbose [command]

# Specific log levels (debug, info, warn, error, critical)
node dist/cli/cli.js --log-level debug [command]

# Console output control
node dist/cli/cli.js --log-to-console [command]

# File logging control
node dist/cli/cli.js --no-file-logging [command]

# Maximum verbosity
node dist/cli/cli.js --verbose --log-level debug --log-to-console [command]
```

#### Logging Features
- **5 Log Levels**: Debug, Info, Warn, Error, Critical with intelligent filtering
- **Operation Timing**: Automatic performance monitoring with duration tracking
- **Trace Correlation**: Unique trace IDs for request tracking across complex workflows
- **Agent Activity Tracking**: Detailed monitoring of multi-agent interactions
- **API Call Logging**: HTTP request/response monitoring in debug mode
- **System Information**: Platform, memory, and runtime information
- **Structured Output**: JSON structured logs with colorized console formatting

#### Interactive Configuration
Access verbose logging setup through the main menu "Configure Verbose Logging" option:
- Step-by-step log level selection with descriptions
- Real-time configuration with immediate feedback
- File and console output customization
- Security warnings for debug mode information disclosure

### CLI Architecture
```
CLI System
├── main.ts                   # CLI orchestration and command registration
├── config-manager.ts         # Configuration persistence and management
├── export-manager.ts         # Multi-format result export system
├── historical-analyzer.ts    # Historical data analysis and trends
├── logging-manager.ts        # Verbose logging configuration and control
├── display.ts               # Terminal UI and progress visualization
├── message-buffer.ts        # Real-time progress tracking
├── utils.ts                 # User interaction and input utilities
└── types.ts                 # CLI type definitions and interfaces
```

## Development Guidelines

### Code Standards
- Follow TypeScript strict mode
- Use ESLint configuration
- Implement proper error handling
- Document complex functions
- Write unit tests for new features

### Agent Development
- Extend `AbstractAgent` base class
- Implement proper state validation
- Use specialized system prompts
- Handle tool integration properly
- Follow established naming conventions

### Testing Strategy
- Unit tests for individual agents
- Integration tests for workflows
- Mock external API calls
- Test error scenarios
- Validate state transitions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

## License

[License information to be added]

## Support

For questions, issues, or contributions:
- Check the documentation in `./docs/`
- Review existing issues and discussions
- Create detailed bug reports
- Follow the contribution guidelines