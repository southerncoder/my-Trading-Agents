import { useNavigate } from 'react-router-dom'
import { Activity, Crosshair, PieChart } from 'lucide-react'
import type { NightlyDay } from '../../services/nightly'
import { Card, HBars, SectionTitle, SegmentBar, callColor, muted } from '../viz'
import { fmtPct } from './format'

/** The night at a glance: the mix of calls, how far each waiting stock is from its trigger, and the day's movers. */
export function NightCharts({ day }: { day: NightlyDay }) {
  const go = useNavigate()
  const mix = Object.entries(day.summary.by_label).sort((a, b) => b[1] - a[1])
  const waiting = day.rows
    .filter((r) => r.distance_to_trigger_pct != null && r.label !== 'Buy now')
    .sort((a, b) => Math.abs(a.distance_to_trigger_pct!) - Math.abs(b.distance_to_trigger_pct!))
    .slice(0, 12)
  const movers = day.rows
    .filter((r) => r.change_pct != null)
    .sort((a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!))
    .slice(0, 10)
    .sort((a, b) => b.change_pct! - a.change_pct!)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 lg:col-span-2">
        <SectionTitle icon={PieChart} title="Tonight's calls" sub={`${day.rows.length} stocks analysed on the night of ${day.date}.`} />
        <SegmentBar unit=" stocks" parts={mix.map(([label, n]) => ({ label, value: n, color: callColor(label) }))} />
      </Card>

      {waiting.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle icon={Crosshair} title="Closest to their trigger" sub="How far the price must move to reach each trigger. Click a bar for the stock." />
          <HBars
            labelWidth={70}
            format={(v) => fmtPct(v)}
            onRow={(t) => go(`/stock/${t}`)}
            rows={waiting.map((r) => ({ key: r.ticker, label: r.ticker, ticker: r.ticker, value: r.distance_to_trigger_pct!, note: r.trigger_type ?? '', color: callColor(r.label) }))}
          />
          <p className="text-xs" style={muted}>Negative: the price must fall to the trigger (pullback); positive: it must rise (breakout).</p>
        </Card>
      )}

      {movers.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle icon={Activity} title="Biggest movers" sub="Price change since each stock was last analysed (a weekly stock spans several days). Click a bar for the stock." />
          <HBars labelWidth={70} format={(v) => fmtPct(v)} onRow={(t) => go(`/stock/${t}`)} rows={movers.map((r) => ({ key: r.ticker, label: r.ticker, ticker: r.ticker, value: r.change_pct!, note: r.label }))} />
        </Card>
      )}
    </div>
  )
}
