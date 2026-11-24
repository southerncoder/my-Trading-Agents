// The SEC EDGAR block given to the fundamentals analyst: passes the digest through, point-in-time date, never throws.
import { secFundamentalsBlock } from '../../src/agents/base/sec-fundamentals';

const assert = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(msg);
};

(async () => {
  try {
    console.log('🧪 SEC fundamentals block');
    let seen = '';
    const ok = await secFundamentalsBlock('NVDA', '2026-11-20', async (t, asOf) => {
      seen = `${t}@${asOf}`;
      return { digest: 'SEC EDGAR FILINGS for NVDA ...' };
    });
    assert(ok === 'SEC EDGAR FILINGS for NVDA ...', 'digest is passed through');
    assert(seen === 'NVDA@2026-11-20', 'asks for figures as of the trade date');

    await secFundamentalsBlock('NVDA', 'not-a-date', async (_t, asOf) => {
      seen = asOf;
      return { digest: '' };
    });
    assert(/^\d{4}-\d{2}-\d{2}$/.test(seen), 'a bad trade date falls back to today');

    const missing = await secFundamentalsBlock('SPY', '2026-11-20', async () => {
      throw Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });
    });
    assert(missing.includes('unavailable') && missing.includes('no filer'), 'a 404 explains there is no SEC filer');

    const down = await secFundamentalsBlock('NVDA', '2026-11-20', async () => {
      throw new Error('connect ECONNREFUSED');
    });
    assert(down.includes('could not be reached') && down.includes('ECONNREFUSED'), 'an outage is stated, not hidden');
    console.log('🎉 SEC fundamentals block test complete');
  } catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
  }
})();
