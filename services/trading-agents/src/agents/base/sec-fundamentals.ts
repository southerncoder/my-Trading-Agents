import { GovernmentDataClient } from '../../clients/government-data-client';
import { createLogger } from '../../utils/enhanced-logger';

const logger = createLogger('agent', 'SecFundamentals');

type Fetcher = (ticker: string, asOf: string) => Promise<{ digest: string }>;

let client: GovernmentDataClient | null = null;
function defaultFetcher(): Fetcher {
  // First call per ticker downloads the SEC company file (several MB) into the service's cache; allow for it.
  client ??= new GovernmentDataClient({ baseUrl: process.env.GOVERNMENT_DATA_URL ?? 'http://localhost:3005', timeout: 60000 });
  return (ticker, asOf) => client!.getFundamentalsSummary(ticker, asOf)
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The SEC EDGAR block for the fundamentals analyst: official 10-K/10-Q figures filed on or before the trade date
 * (point-in-time). Never throws: when the data cannot be had, the block says so and why, so the analyst does not
 * guess at it.
 */
export async function secFundamentalsBlock(ticker: string, tradeDate: string, fetcher: Fetcher = defaultFetcher()): Promise<string> {
  const asOf = DATE.test(tradeDate) ? tradeDate : new Date().toISOString().slice(0, 10);
  try {
    const { digest } = await fetcher(ticker, asOf);
    return digest;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const reason = status === 404
      ? 'the SEC has no filer for this ticker (an ETF, a foreign listing or not yet public)'
      : `the SEC data service could not be reached (${error instanceof Error ? error.message.slice(0, 120) : String(error)})`;
    logger.warn('secFundamentalsBlock', 'SEC fundamentals unavailable', { ticker, asOf, status, reason });
    return `SEC EDGAR FILINGS for ${ticker}: unavailable, because ${reason}. Rely on the vendor data above and say that official filings were not checked.`;
  }
}
