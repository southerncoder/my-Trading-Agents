# Current Todos (Updated 2025-08-31)

## 🔥 High Priority - Zep Services
- [ ] Re-run ingestion `/entity-node` test while streaming logs to capture any 500 errors and full tracebacks.
- [ ] Add retry/backoff logic and improved error logging around embedder calls in `graphiti_core` or Graphiti wrappers.
- [ ] Harden `py_zep/secrets/start-wrapper.sh` JSON parsing for `/v1/models` listing.
- [ ] Move real `embedder_api_key` into Docker secrets and remove secrets from `.env.local`.
- [ ] Confirm wrapper writes diagnostics to `/tmp` and `/var/log` as expected in container runs.

## ⚡ High Priority - Core Placeholders  
- [ ] Create actual RiskManager class that integrates existing risk analysts (portfolio-manager, risky-analyst, safe-analyst, neutral-analyst)
- [ ] Implement real technical indicators calculations (RSI, MACD, SMA, EMA) in `technical-indicators.ts`
- [ ] Replace OpenAI data placeholders with actual web search integration in `openai-data.ts`

## 📊 Medium Priority - Data Integration
- [ ] Implement Yahoo Finance API integration to replace placeholder in `yahoo-finance.ts`
- [ ] Add Google News API integration in `google-news.ts`
- [ ] Implement Reddit API integration for social sentiment in `reddit.ts`
- [ ] Add SimFin data file reading for fundamental analysis in `simfin.ts`

## 🧠 Medium Priority - Memory System
- [ ] Implement similarity calculation algorithms in `context-retrieval-layer.ts`
- [ ] Add feature importance and accuracy metrics in `performance-learning-layer.ts`
- [ ] Complete pattern selection logic in `memory-consolidation-layer.ts`
- [ ] Implement actual ML parameter optimization algorithms

## 🔒 Security & Production
- [ ] Review and test the comprehensive pull request functionality
- [ ] Validate all environment variable configurations
- [ ] Test production deployment scenarios

Completed (high level):
- start-wrapper cleaned and installed
- docker-compose Neo4j URI fixed
- persisting embedder settings in `.env.local`
- verified direct embedder `/v1/embeddings` calls
