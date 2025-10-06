import nock from 'nock';
import request from 'supertest';

describe('MarketStack provider integration (mocked)', () => {
  const base = 'https://api.marketstack.com';
  const apiPath = '/v1';

  let app;

  const hasMarketStackKey = !!process.env.MARKETSTACK_API_KEY;

  beforeAll(async () => {
    // If no key present, set a placeholder so the app enables the provider (we'll mock HTTP calls).
    if (!process.env.MARKETSTACK_API_KEY) process.env.MARKETSTACK_API_KEY = 'test-key';
    // import app
    app = (await import('../../src/index.js')).default;
  });

  afterEach(() => nock.cleanAll());

  test('quote endpoint returns marketstack mocked data', async () => {
    const symbol = 'AAPL';
    if (!hasMarketStackKey) {
      nock(base)
        .get(`${apiPath}/eod`)
        .query(true)
        .reply(200, { data: [{ symbol: 'AAPL', date: '2025-10-01', open: 140, high: 142, low: 139, close: 141, volume: 100000 }] });
    }

    const res = await request(app).get(`/quote/${symbol}`);
    expect(res.status).toBe(200);
    expect(res.body.providerData).toBeDefined();
    expect(res.body.providerData.marketstack).toBeDefined();
    expect(res.body.providerData.marketstack.symbol).toBe('AAPL');
  }, 10000);

  test('historical endpoint returns marketstack mocked data', async () => {
    const symbol = 'AAPL';
    if (!hasMarketStackKey) {
      nock(base)
        .get(`${apiPath}/eod`)
        .query(true)
        .reply(200, { data: [{ symbol: 'AAPL', date: '2025-09-30', close: 140 }] });
    }

    const res = await request(app).get(`/historical/${symbol}`);
    expect(res.status).toBe(200);
    expect(res.body.providerData).toBeDefined();
    expect(res.body.providerData.marketstack).toBeDefined();
    expect(Array.isArray(res.body.providerData.marketstack.data)).toBe(true);
  }, 10000);
});
