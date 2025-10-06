export default class YahooStubProvider {
  constructor() {}
  isConfigured() { return true; }
  async healthCheck() { return { healthy: true }; }
  async getQuote(symbol) { return { provider: 'yahoo', symbol, regularMarketPrice: 100 }; }
  async getHistorical(symbol) { return { provider: 'yahoo', symbol, data: [] }; }
  async getProspectus(symbol) { return { provider: 'yahoo', symbol, profile: {} }; }
}
