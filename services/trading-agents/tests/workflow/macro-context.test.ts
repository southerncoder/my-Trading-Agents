// The macro backdrop block given to the market analyst: passes the digest through, dated to the trade date, never throws.
import { macroBlock } from '../../src/agents/base/macro-context';

const assert = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(msg);
};

(async () => {
  try {
    console.log('🧪 Macro context block');
    let seen = '';
    const ok = await macroBlock('2026-11-20', async (asOf) => {
      seen = asOf;
      return { digest: 'MACRO BACKDROP as known on 2026-11-20 ...' };
    });
    assert(ok.startsWith('MACRO BACKDROP as known on 2026-11-20'), 'digest is passed through');
    assert(seen === '2026-11-20', 'asks for data as known on the trade date');
    const down = await macroBlock('2026-11-20', async () => {
      throw new Error('connect ECONNREFUSED');
    });
    assert(down.includes('unavailable') && down.includes('ECONNREFUSED') && down.includes('Do not describe'), 'an outage is stated with an instruction not to guess');
    console.log('🎉 Macro context block test complete');
  } catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
  }
})();
