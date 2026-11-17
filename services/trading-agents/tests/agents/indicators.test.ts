// Run: npx vite-node tests/agents/indicators.test.ts
import assert from 'node:assert/strict';
import { parseBars, rsi, macd, atr, indicatorBlock, typicalMoveLine } from '../../src/agents/base/indicators';
import { adjustmentOn, noiseRule } from '../../src/agents/base/evidence';

const near = (a: number | undefined, b: number, tol = 0.01) => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

// Wilder's own RSI worked example (first value 70.46 after 14 changes, 66.25 one bar later)
const wilder = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00];
near(rsi(wilder.slice(0, 15)), 70.46, 0.1);
near(rsi(wilder), 66.25, 0.1);
assert.equal(rsi([1, 2, 3]), undefined);
assert.equal(rsi(Array.from({ length: 20 }, (_, i) => 10 + i)), 100); // only gains

// MACD: a steady uptrend has a positive line; too little data gives undefined
const up = Array.from({ length: 60 }, (_, i) => 100 + i);
const m = macd(up)!;
assert.ok(m.macd > 0);
near(m.macd, 7, 0.01); // EMA12 lags by 5.5 bars, EMA26 by 12.5 bars on a +1/bar line
near(m.histogram, 0, 0.01);
assert.equal(macd(up.slice(0, 30)), undefined);

// ATR: constant 2-point daily range with no gaps
const flat = Array.from({ length: 20 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, open: 10, high: 11, low: 9, close: 10 }));
near(atr(flat), 2, 1e-9);

// CSV parsing skips comments and headers, and sorts by date
const csv = '# Stock data for X\nDate,Open,High,Low,Close,Adj Close,Volume\n2026-01-02,10,11,9,10.5,10.5,100\n2026-01-01,9,10,8,9.5,9.5,100\nbad,row\n';
const bars = parseBars(csv);
assert.equal(bars.length, 2);
assert.equal(bars[0]!.date, '2026-01-01');
assert.equal(bars[1]!.close, 10.5);

// Block: empty when history is too short, otherwise names the indicators
assert.equal(indicatorBlock(csv), '');
const rows = up.map((c, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')},${c},${c + 1},${c - 1},${c},${c},1000`).join('\n');
const block = indicatorBlock(rows);
assert.match(block, /computed_indicators/);
assert.match(block, /RSI\(14\): 100\.0 - overbought/);
assert.match(block, /MACD\(12,26,9\)/);
assert.match(block, /ATR\(14\): 2\.00/);
assert.match(block, /Bollinger\(20,2\)/);

// Adjustment switches
process.env.ANALYSIS_ADJUSTMENTS = 'indicators, flat';
assert.equal(adjustmentOn('indicators'), true);
assert.equal(adjustmentOn('flat'), true);
assert.equal(adjustmentOn('entrycheck'), false);
process.env.ANALYSIS_ADJUSTMENTS = 'all';
assert.equal(adjustmentOn('entrycheck'), true);
delete process.env.ANALYSIS_ADJUSTMENTS;
assert.equal(adjustmentOn('indicators'), false);

// Typical daily move line: ATR 2.00 on the +1/bar series, last close 159
const move = typicalMoveLine(rows);
assert.match(move, /^TYPICAL DAILY MOVE/);
assert.match(move, /last close 159\.00; ATR\(14\) 2\.00/);
assert.match(move, /within 1\.00 of the price/);
assert.equal(typicalMoveLine(csv), '');

// Noise rule follows its switch
delete process.env.ANALYSIS_ADJUSTMENTS;
assert.equal(noiseRule(), '');
process.env.ANALYSIS_ADJUSTMENTS = 'noise';
assert.match(noiseRule(), /NOISE RULE/);
process.env.ANALYSIS_ADJUSTMENTS = 'all';
assert.match(noiseRule(), /NOISE RULE/);
delete process.env.ANALYSIS_ADJUSTMENTS;

console.log('indicators tests passed');
