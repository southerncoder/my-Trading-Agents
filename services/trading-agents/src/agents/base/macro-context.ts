import { GovernmentDataClient } from '../../clients/government-data-client';
import { createLogger } from '../../utils/enhanced-logger';

const logger = createLogger('agent', 'MacroContext');

type Fetcher = (asOf: string) => Promise<{ digest: string }>;

let client: GovernmentDataClient | null = null;
function defaultFetcher(): Fetcher {
  // The first request of a night builds the summary from BLS and FRED; later ones come from the service's cache.
  client ??= new GovernmentDataClient({ baseUrl: process.env.GOVERNMENT_DATA_URL ?? 'http://localhost:3005', timeout: 60000 });
  return (asOf) => client!.getMacroSummary(asOf);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The macro backdrop block (jobs, inflation, rates, curve, volatility, credit, oil, growth) as known on the trade
 * date. Never throws: when it cannot be had, the block says so, so the analyst does not invent a macro picture.
 */
export async function macroBlock(tradeDate: string, fetcher: Fetcher = defaultFetcher()): Promise<string> {
  const asOf = DATE.test(tradeDate) ? tradeDate : new Date().toISOString().slice(0, 10);
  try {
    return (await fetcher(asOf)).digest;
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 120) : String(error);
    logger.warn('macroBlock', 'Macro data unavailable', { asOf, reason });
    return `MACRO BACKDROP: unavailable (${reason}). Do not describe the economy or interest rates beyond what the data above shows.`;
  }
}
