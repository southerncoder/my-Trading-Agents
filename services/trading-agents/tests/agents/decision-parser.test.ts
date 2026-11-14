// Run: npx vite-node tests/agents/decision-parser.test.ts
import assert from 'node:assert/strict';
import { parseDecision } from '../../src/agents/base/decision-parser';
import { assessDataQuality, isUnavailable } from '../../src/agents/base/evidence';

const json = (o: object) => '```json\n' + JSON.stringify(o) + '\n```';

// JSON block wins over trailing lines
let r = parseDecision(`analysis\n${json({ decision: 'BUY', confidence: 0.62, action_now: 'enter_now' })}\nFINAL DECISION: HOLD\nCONFIDENCE: 0.2`);
assert.equal(r.decision, 'BUY');
assert.equal(r.confidence, 0.62);
assert.equal(r.source, 'json');

// BUY but wait_for_trigger -> downgraded to HOLD
r = parseDecision(json({ decision: 'BUY', confidence: 0.8, action_now: 'wait_for_trigger' }));
assert.equal(r.decision, 'HOLD');
assert.ok(r.downgradeReason);

// SELL but enter_now -> HOLD
r = parseDecision(json({ decision: 'SELL', confidence: 0.7, action_now: 'enter_now' }));
assert.equal(r.decision, 'HOLD');

// Confidence clamped
r = parseDecision(json({ decision: 'HOLD', confidence: 7 }));
assert.equal(r.confidence, 1);

// Lines fallback
r = parseDecision('text\nFINAL DECISION: SELL\nCONFIDENCE: 0.55');
assert.deepEqual([r.decision, r.confidence, r.source], ['SELL', 0.55, 'lines']);

// Echoed template is rejected -> default
r = parseDecision('FINAL DECISION: <exactly one word: BUY or HOLD or SELL>\nCONFIDENCE: <a decimal>');
assert.deepEqual([r.decision, r.confidence, r.source], ['HOLD', 0.3, 'default']);

// Placeholder JSON is rejected -> default
r = parseDecision('{"decision": "BUY|HOLD|SELL", "confidence": 0.00}');
assert.equal(r.source, 'default');

// Data quality heuristics
assert.equal(isUnavailable('Data acquisition failed for NVDA'), true);
assert.equal(isUnavailable('x'.repeat(2000) + ' not available '.repeat(8)), false); // long report, some gaps
assert.equal(isUnavailable('short ' + 'not available '.repeat(7) + 'pad pad pad pad pad pad'), true);
const q = assessDataQuality({
  market_report: 'm'.repeat(300),
  news_report: 'NEWS DATA UNAVAILABLE: HTTP 500 while fetching',
  fundamentals_report: 'f'.repeat(300),
  sentiment_report: 'SOCIAL DATA UNAVAILABLE: x'.padEnd(60, '.'),
});
assert.equal(q.criticalMissing, true);
assert.deepEqual(q.missing, ['news', 'social']);

console.log('decision-parser tests passed');
