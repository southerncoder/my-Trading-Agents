/**
 * Technical indicators computed in code from the fetched daily price history.
 *
 * The Market Analyst used to write "RSI/MACD not available, confirm before acting" in nearly
 * every report, which fed the pipeline's habit of waiting for a trigger. These are standard
 * formulas (Wilder RSI and ATR, 12/26/9 MACD, 20-day Bollinger bands), so the model no longer
 * has to guess or hedge.
 */

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Rows look like `2026-11-13,98.1,99.6,97.9,99.34,...` (date, open, high, low, close). */
export function parseBars(text: string): Bar[] {
  const bars: Bar[] = [];
  // A row cut off by the prompt size limit would parse as a wrong price: drop it.
  const whole = String(text || '').replace(/[^\n]*\n\[truncated\]/g, '');
  for (const line of whole.split(/\r?\n/)) {
    if (!/^\d{4}-\d\d-\d\d,/.test(line)) continue;
    const c = line.split(',');
    const [open, high, low, close] = [c[1], c[2], c[3], c[4]].map(Number);
    if ([open, high, low, close].every(Number.isFinite)) {
      bars.push({ date: c[0] as string, open: open as number, high: high as number, low: low as number, close: close as number });
    }
  }
  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period - 1; i < values.length; i++) {
    prev = i === period - 1 ? prev : (values[i] as number) * k + prev * (1 - k);
    out.push(prev);
  }
  return out; // out[0] corresponds to values[period - 1]
}

export function rsi(closes: number[], period = 14): number | undefined {
  if (closes.length < period + 1) return undefined;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (closes[i] as number) - (closes[i - 1] as number);
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = (closes[i] as number) - (closes[i - 1] as number);
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

export function macd(closes: number[]): { macd: number; signal: number; histogram: number } | undefined {
  if (closes.length < 35) return undefined;
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const line = slow.map((s, i) => (fast[i + 14] as number) - s); // align: fast starts 14 bars earlier
  const sig = ema(line, 9);
  const m = line[line.length - 1] as number;
  const s = sig[sig.length - 1] as number;
  return { macd: m, signal: s, histogram: m - s };
}

export function atr(bars: Bar[], period = 14): number | undefined {
  if (bars.length < period + 1) return undefined;
  const tr: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i] as Bar;
    const pc = (bars[i - 1] as Bar).close;
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc)));
  }
  let v = tr.slice(0, period).reduce((s, x) => s + x, 0) / period;
  for (let i = period; i < tr.length; i++) v = (v * (period - 1) + (tr[i] as number)) / period;
  return v;
}

const f2 = (n: number) => n.toFixed(2);

/** A prompt-ready block, or '' when there is too little history to compute anything. */
export function indicatorBlock(priceText: string): string {
  const bars = parseBars(priceText);
  if (bars.length < 15) return '';
  const closes = bars.map((b) => b.close);
  const last = closes[closes.length - 1] as number;
  const lines: string[] = [];

  const r = rsi(closes);
  if (r !== undefined) {
    const zone = r >= 70 ? 'overbought (70+)' : r <= 30 ? 'oversold (30 or less)' : 'neutral (between 30 and 70)';
    lines.push(`RSI(14): ${r.toFixed(1)} - ${zone}`);
  }
  const m = macd(closes);
  if (m) {
    lines.push(
      `MACD(12,26,9): line ${f2(m.macd)}, signal ${f2(m.signal)}, histogram ${f2(m.histogram)} - ` +
        (m.histogram > 0 ? 'momentum positive (line above signal)' : 'momentum negative (line below signal)')
    );
  }
  const a = atr(bars);
  if (a !== undefined) lines.push(`ATR(14): ${f2(a)} (${((a / last) * 100).toFixed(1)}% of price) - a typical day's range`);
  if (closes.length >= 20) {
    const w = closes.slice(-20);
    const mean = w.reduce((s, v) => s + v, 0) / 20;
    const sd = Math.sqrt(w.reduce((s, v) => s + (v - mean) ** 2, 0) / 20);
    const upper = mean + 2 * sd;
    const lower = mean - 2 * sd;
    const pos = upper > lower ? ((last - lower) / (upper - lower)) * 100 : 50;
    lines.push(`Bollinger(20,2): lower ${f2(lower)}, middle ${f2(mean)}, upper ${f2(upper)} - price is ${pos.toFixed(0)}% of the way from lower to upper band`);
    const hi = Math.max(...bars.slice(-20).map((b) => b.high));
    const lo = Math.min(...bars.slice(-20).map((b) => b.low));
    lines.push(`20-day range: low ${f2(lo)}, high ${f2(hi)}`);
  }
  if (!lines.length) return '';
  return (
    `### computed_indicators (calculated in code from the ${bars.length} daily bars above, last bar ${(bars[bars.length - 1] as Bar).date}; these ARE available, use them)\n` +
    lines.join('\n')
  );
}
