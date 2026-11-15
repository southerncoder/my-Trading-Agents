// Run: npx vite-node tests/agents/decision-parser.test.ts
import assert from 'node:assert/strict';
import { parseDecision, normalizeActionNow, decisionLabel } from '../../src/agents/base/decision-parser';
import { compactFundamentals } from '../../src/agents/base/tool-data';
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

// BUY waiting on a trigger keeps its intent as a pending long entry
r = parseDecision(json({ decision: 'BUY', confidence: 0.8, action_now: 'enter_on_trigger' }));
assert.equal(r.actionNow, 'wait_for_trigger');
assert.equal(r.decision, 'HOLD');
assert.equal(r.pendingEntry, true);
assert.equal(r.pendingSide, 'long');
assert.equal(decisionLabel(r), 'Buy if price reaches trigger');

// Off-enum values are normalised so the consistency check cannot be bypassed
assert.equal(normalizeActionNow('enter_partial'), 'enter_now');
assert.equal(normalizeActionNow('Wait for pullback'), 'wait_for_trigger');
assert.equal(normalizeActionNow('trim'), 'reduce');
assert.equal(normalizeActionNow('short'), 'enter_now');
assert.equal(normalizeActionNow('gibberish'), undefined);

// SELL + enter_now is a short entry and is NOT downgraded
r = parseDecision(json({ decision: 'SELL', confidence: 0.7, action_now: 'enter_now' }));
assert.equal(r.decision, 'SELL');
assert.equal(decisionLabel(r), 'Short (bet price falls)');

// SELL waiting on a trigger -> pending short
r = parseDecision(json({ decision: 'SELL', confidence: 0.7, action_now: 'wait_for_trigger' }));
assert.equal(r.decision, 'HOLD');
assert.equal(r.pendingSide, 'short');
assert.equal(decisionLabel(r), 'Short if price reaches trigger');

// Fundamentals: Yahoo debtToEquity is a percent and must be labelled as such
const f = JSON.parse(compactFundamentals(JSON.stringify({ financialData: { debtToEquity: { raw: 16.77, fmt: '16.77' } } })));
assert.match(f.financialData.debtToEquity, /16\.8% of equity \(= 0\.17x/);

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

import { fetchError } from '../../src/agents/base/tool-data';
assert.strictEqual(fetchError('### get_historical_price_data\nERROR: fetch failed\n', 'get_historical_price_data'), 'fetch failed');
assert.strictEqual(fetchError('### get_historical_price_data\ndate,close\n', 'get_historical_price_data'), undefined);
console.log('fetchError tests passed');
