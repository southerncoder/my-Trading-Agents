import fs from 'fs';
import path from 'path';

/**
 * Disk-backed quota counters, response cache and status for the metered vendors (Finnhub, Alpha Vantage,
 * Marketstack, Tiingo). Each analysis is a separate `node cli.js analyze` process, so the counts must live on disk to
 * hold across a night's runs. In the container the directory is under the mounted /app/logs, where the web API
 * reads status.json for the Platform page.
 *
 * Free plans: Alpha Vantage 25 calls a day, Marketstack 100 a month, Finnhub 60 a minute. Limits here sit a little
 * below those so a stray manual run cannot push a provider over.
 */

export type Vendor = 'finnhub' | 'alpha-vantage' | 'marketstack' | 'tiingo';

export interface QuotaRule {
  perDay?: number;
  perMonth?: number;
}

export const VENDOR_QUOTAS: Record<Vendor, QuotaRule> = {
  finnhub: { perDay: 1500 },
  'alpha-vantage': { perDay: 20 },
  marketstack: { perDay: 6, perMonth: 90 },
  // Free plan: 1,000 requests a day, 50 an hour, 500 distinct symbols a month.
  tiingo: { perDay: 400 },
};

interface Counter {
  day: string;
  dayCount: number;
  month: string;
  monthCount: number;
  /** Set when the vendor refused (quota used up, key rejected, plan too small): no calls until this date. */
  blockedUntil?: string;
  blockReason?: string;
}

export interface VendorStatus {
  ok: boolean;
  detail: string;
  at: string;
  usedToday: number;
  usedThisMonth: number;
  limits: QuotaRule;
}

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

export class VendorStore {
  constructor(
    readonly dir: string = process.env.PROVIDER_CACHE_DIR || path.resolve(process.cwd(), 'logs', 'provider-cache'),
    private readonly now: () => Date = () => new Date(),
    private readonly quotas: Record<Vendor, QuotaRule> = VENDOR_QUOTAS,
  ) {}

  private readJson<T>(file: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.dir, file), 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(file: string, value: unknown): void {
    try {
      const full = path.join(this.dir, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      const tmp = `${full}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(value, null, 1));
      fs.renameSync(tmp, full);
    } catch {
      // A read-only or missing disk only loses caching and counting; the analysis carries on.
    }
  }

  private counter(vendor: Vendor): Counter {
    const all = this.readJson<Record<string, Counter>>('quota.json', {});
    const today = utcDay(this.now());
    const c: Counter = all[vendor] ?? { day: today, dayCount: 0, month: today.slice(0, 7), monthCount: 0 };
    if (c.day !== today) {
      c.day = today;
      c.dayCount = 0;
    }
    if (c.month !== today.slice(0, 7)) {
      c.month = today.slice(0, 7);
      c.monthCount = 0;
    }
    return c;
  }

  private saveCounter(vendor: Vendor, c: Counter): void {
    const all = this.readJson<Record<string, Counter>>('quota.json', {});
    all[vendor] = c;
    this.writeJson('quota.json', all);
  }

  /** Why no call may be made now, or undefined when one may. */
  refusal(vendor: Vendor, calls = 1): string | undefined {
    const c = this.counter(vendor);
    const today = utcDay(this.now());
    if (c.blockedUntil && today < c.blockedUntil) return c.blockReason ?? 'paused after the provider refused';
    const q = this.quotas[vendor];
    if (q.perDay !== undefined && c.dayCount + calls > q.perDay) return `daily budget of ${q.perDay} calls used`;
    if (q.perMonth !== undefined && c.monthCount + calls > q.perMonth) return `monthly budget of ${q.perMonth} calls used`;
    return undefined;
  }

  /** Count calls about to be made; false (and nothing counted) when the budget does not allow them. */
  tryConsume(vendor: Vendor, calls = 1): boolean {
    if (this.refusal(vendor, calls)) return false;
    const c = this.counter(vendor);
    c.dayCount += calls;
    c.monthCount += calls;
    delete c.blockedUntil;
    delete c.blockReason;
    this.saveCounter(vendor, c);
    return true;
  }

  /** Stop calling a vendor until tomorrow, or until next month for a monthly limit. */
  block(vendor: Vendor, until: 'day' | 'month', reason: string): void {
    const c = this.counter(vendor);
    const d = this.now();
    const next = until === 'day'
      ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
      : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    c.blockedUntil = utcDay(next);
    c.blockReason = reason;
    this.saveCounter(vendor, c);
  }

  private cacheFile(vendor: Vendor, key: string): string {
    return path.join('cache', vendor, `${key.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);
  }

  getCached<T>(vendor: Vendor, key: string, maxAgeMs: number): T | undefined {
    const hit = this.readJson<{ at: number; value: T } | null>(this.cacheFile(vendor, key), null);
    if (!hit || this.now().getTime() - hit.at > maxAgeMs) return undefined;
    return hit.value;
  }

  setCached(vendor: Vendor, key: string, value: unknown): void {
    this.writeJson(this.cacheFile(vendor, key), { at: this.now().getTime(), value });
  }

  /** Record the outcome of the latest use, for the Platform page's provider list. */
  setStatus(vendor: Vendor, ok: boolean, detail: string): void {
    const c = this.counter(vendor);
    const all = this.readJson<Record<string, VendorStatus>>('status.json', {});
    all[vendor] = { ok, detail, at: this.now().toISOString(), usedToday: c.dayCount, usedThisMonth: c.monthCount, limits: this.quotas[vendor] };
    this.writeJson('status.json', all);
  }
}
