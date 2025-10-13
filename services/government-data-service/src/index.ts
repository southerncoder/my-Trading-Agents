import express from 'express';
import { GovFinancialData } from './GovFinancialData.js';
import { logger } from './utils/logger.js';

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize government data service
const govData = new GovFinancialData({
  fredApiKey: process.env.FRED_API_KEY,
  blsApiKey: process.env.BLS_API_KEY,
  userAgent: process.env.USER_AGENT || 'TradingAgents/1.0.0 (trading-agents@example.com)',
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'government-data-service',
    version: '1.0.0',
    rateLimiters: govData.getHealthStatus()
  };
  
  res.json(health);
});

// SEC endpoints
app.get('/api/sec/company/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    logger.info(`SEC company lookup request: ${ticker}`);
    
    const company = await govData.sec.getCompanyByTicker(ticker);
    if (!company) {
      return res.status(404).json({ error: `Company not found: ${ticker}` });
    }
    
    res.json(company);
  } catch (error) {
    logger.error('SEC company lookup failed', { error, ticker: req.params.ticker });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sec/filings/:cik', async (req, res) => {
  try {
    const { cik } = req.params;
    const { count = 10, type } = req.query;
    
    logger.info(`SEC filings request: CIK ${cik}`, { count, type });
    
    const filings = await govData.sec.getCompanyFilings(cik, {
      count: parseInt(count as string),
      type: type as string
    });
    
    res.json(filings);
  } catch (error) {
    logger.error('SEC filings request failed', { error, cik: req.params.cik });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sec/facts/:cik', async (req, res) => {
  try {
    const { cik } = req.params;
    logger.info(`SEC facts request: CIK ${cik}`);
    
    const facts = await govData.sec.getCompanyFacts(cik);
    res.json(facts);
  } catch (error) {
    logger.error('SEC facts request failed', { error, cik: req.params.cik });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FRED endpoints
app.get('/api/fred/series/:seriesId', async (req, res) => {
  try {
    if (!govData.fred) {
      return res.status(503).json({ error: 'FRED service not available - API key required' });
    }
    
    const { seriesId } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    logger.info(`FRED series request: ${seriesId}`, { startDate, endDate, limit });
    
    const observations = await govData.fred.getObservations(seriesId, {
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json(observations);
  } catch (error) {
    logger.error('FRED series request failed', { error, seriesId: req.params.seriesId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fred/search', async (req, res) => {
  try {
    if (!govData.fred) {
      return res.status(503).json({ error: 'FRED service not available - API key required' });
    }
    
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    logger.info(`FRED search request: "${query}"`, { limit });
    
    const series = await govData.fred.searchSeries(query as string, {
      limit: parseInt(limit as string)
    });
    
    res.json(series);
  } catch (error) {
    logger.error('FRED search request failed', { error, query: req.query.q });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fred/indicators', async (req, res) => {
  try {
    if (!govData.fred) {
      return res.status(503).json({ error: 'FRED service not available - API key required' });
    }
    
    const { startDate, endDate } = req.query;
    logger.info('FRED market indicators request', { startDate, endDate });
    
    const indicators = await govData.fred.getMarketIndicators({
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    res.json(indicators);
  } catch (error) {
    logger.error('FRED indicators request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// BLS endpoints
app.get('/api/bls/unemployment', async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    logger.info('BLS unemployment request', { startYear, endYear });
    
    const unemployment = await govData.bls.getUnemploymentRate({
      startYear: startYear ? parseInt(startYear as string) : undefined,
      endYear: endYear ? parseInt(endYear as string) : undefined
    });
    
    res.json(unemployment);
  } catch (error) {
    logger.error('BLS unemployment request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/bls/cpi', async (req, res) => {
  try {
    const { startYear, endYear, allItems = true } = req.query;
    logger.info('BLS CPI request', { startYear, endYear, allItems });
    
    const cpi = await govData.bls.getCPI({
      startYear: startYear ? parseInt(startYear as string) : undefined,
      endYear: endYear ? parseInt(endYear as string) : undefined,
      allItems: allItems === 'true'
    });
    
    res.json(cpi);
  } catch (error) {
    logger.error('BLS CPI request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/bls/indicators', async (req, res) => {
  try {
    const { startYear, endYear } = req.query;
    logger.info('BLS economic indicators request', { startYear, endYear });
    
    const indicators = await govData.bls.getEconomicIndicators({
      startYear: startYear ? parseInt(startYear as string) : undefined,
      endYear: endYear ? parseInt(endYear as string) : undefined
    });
    
    res.json(indicators);
  } catch (error) {
    logger.error('BLS indicators request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Census endpoints
app.get('/api/census/states/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { variables } = req.query;
    
    logger.info(`Census state data request: year ${year}`, { variables });
    
    const variableList = variables ? (variables as string).split(',') : [];
    const data = await govData.census.getStateEconomicData(parseInt(year), variableList);
    
    res.json(data);
  } catch (error) {
    logger.error('Census state data request failed', { error, year: req.params.year });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/census/counties/:year/:state', async (req, res) => {
  try {
    const { year, state } = req.params;
    const { variables } = req.query;
    
    logger.info(`Census county data request: year ${year}, state ${state}`, { variables });
    
    const variableList = variables ? (variables as string).split(',') : [];
    const data = await govData.census.getCountyEconomicData(parseInt(year), variableList, state);
    
    res.json(data);
  } catch (error) {
    logger.error('Census county data request failed', { error, year: req.params.year, state: req.params.state });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unified endpoints
app.get('/api/company/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    logger.info(`Unified company profile request: ${ticker}`);
    
    const profile = await govData.getCompanyProfile(ticker);
    res.json(profile);
  } catch (error) {
    logger.error('Unified company profile request failed', { error, ticker: req.params.ticker });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/company/:ticker/context', async (req, res) => {
  try {
    const { ticker } = req.params;
    logger.info(`Company with economic context request: ${ticker}`);
    
    const data = await govData.getCompanyWithEconomicContext(ticker);
    res.json(data);
  } catch (error) {
    logger.error('Company with economic context request failed', { error, ticker: req.params.ticker });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    logger.info('Economic dashboard request');
    
    const dashboard = await govData.getEconomicDashboard();
    res.json(dashboard);
  } catch (error) {
    logger.error('Economic dashboard request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    logger.info(`Cross-source search request: "${query}"`);
    
    const results = await govData.searchAllSources(query as string);
    res.json(results);
  } catch (error) {
    logger.error('Cross-source search request failed', { error, query: req.query.q });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/correlation', async (req, res) => {
  try {
    const { year, state } = req.query;
    logger.info('Cross-source correlation request', { year, state });
    
    const correlation = await govData.getCrossSourceCorrelation({
      year: year ? parseInt(year as string) : undefined,
      state: state as string
    });
    
    res.json(correlation);
  } catch (error) {
    logger.error('Cross-source correlation request failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack, url: req.url });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  logger.info(`Government Data Service started on port ${port}`, {
    port,
    hasFred: !!govData.fred,
    endpoints: [
      'GET /health',
      'GET /api/sec/company/:ticker',
      'GET /api/sec/filings/:cik',
      'GET /api/sec/facts/:cik',
      'GET /api/fred/series/:seriesId',
      'GET /api/fred/search',
      'GET /api/fred/indicators',
      'GET /api/bls/unemployment',
      'GET /api/bls/cpi',
      'GET /api/bls/indicators',
      'GET /api/census/states/:year',
      'GET /api/census/counties/:year/:state',
      'GET /api/company/:ticker',
      'GET /api/company/:ticker/context',
      'GET /api/dashboard',
      'GET /api/search',
      'GET /api/correlation'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;