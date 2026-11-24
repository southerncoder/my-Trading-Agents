import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, FlaskConical, Trophy, Users } from 'lucide-react'
import { kindInfo, SOURCE_LABEL } from '../components/portfolio/helpers'
import { useLoad } from '../components/portfolio/ui'
import { fmtPct, moveColor } from '../components/today/format'
import { fetchResults } from '../services/portfolio'
import { Card, HBars, PageHeader, SectionTitle, SegmentBar, StatTile, muted } from '../components/viz'

export function Results() {
  const { data, error } = useLoad(fetchResults, 'r')
  const navigate = useNavigate()
  const ft = data?.forwardTest
  const src = data?.bySource ?? []
  const closed = src.reduce((a, s) => a + s.closed, 0)
  const positions = src.reduce((a, s) => a + s.positions, 0)
  const best = [...src].filter((s) => s.avgExcessPct !== null).sort((a, b) => (b.avgExcessPct ?? 0) - (a.avgExcessPct ?? 0))[0]

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-3 sm:p-4 md:p-8">
      <PageHeader
        icon={Trophy}
        title="Results by source"
        sub="Measured on the shadow portfolio, which takes every pick at the same size and exits by the rules, so your own choices do not bias the comparison. Every return sits next to SPY over the same days."
      />
      {error && <p role="alert" style={{ color: '#D4501A' }}>Could not load results: {error}</p>}
      {!data && !error && <p role="status" className="text-lg" style={muted}>Loading...</p>}

      {data && (
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <StatTile icon={Users} label="Pick sources" value={src.length} />
          <StatTile icon={Briefcase} label="Shadow positions" value={positions} hint={`${closed} closed`} />
          <StatTile icon={Trophy} label="Best against SPY" value={best ? SOURCE_LABEL[best.source] ?? best.source : '—'} hint={best ? fmtPct(best.avgExcessPct, 2) : 'no data yet'} />
          <StatTile icon={FlaskConical} label="Forward test" value={ft?.status ?? '—'} hint={ft ? `${ft.elapsed} of ${ft.tradingDays} days` : undefined} />
        </div>
      )}

      {data && (
        <Card className="space-y-4">
          <SectionTitle id="by-source" icon={Users} title="Which source picks better" sub="Average return minus SPY over the same days, per source. Faded bars have fewer than 20 closed positions." />
          {src.length === 0 ? (
            <p style={muted}>No shadow positions yet. They start after the first nightly run with picks.</p>
          ) : (
            <>
              <HBars
                labelWidth={180}
                format={(v) => fmtPct(v, 2)}
                onRow={() => navigate('/picks')}
                rows={src
                  .filter((s) => s.avgExcessPct !== null)
                  .sort((a, b) => (b.avgExcessPct ?? 0) - (a.avgExcessPct ?? 0))
                  .map((s) => ({
                    key: s.source,
                    label: SOURCE_LABEL[s.source] ?? s.source,
                    value: s.avgExcessPct ?? 0,
                    faint: s.closed < 20,
                    note: `${s.positions} positions · ${s.winRatePct}% made money`,
                  }))}
              />
              <details>
                <summary className="cursor-pointer text-sm underline">Show as a table</summary>
                <div className="overflow-x-auto pt-2">
                  <table className="data-table w-full text-sm">
                    <thead><tr className="text-left" style={muted}><th>Source</th><th className="text-right">Positions</th><th className="text-right">Closed</th><th className="text-right">Made money</th><th className="text-right">Average return</th><th className="text-right">Average vs SPY</th></tr></thead>
                    <tbody>
                      {src.map((s) => (
                        <tr key={s.source} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                          <td className="py-1.5"><Link to="/picks" className="underline">{SOURCE_LABEL[s.source] ?? s.source}</Link></td>
                          <td className="text-right">{s.positions}</td>
                          <td className="text-right">{s.closed}</td>
                          <td className="text-right">{s.winRatePct}%</td>
                          <td className="text-right" style={{ color: moveColor(s.avgReturnPct) }}>{fmtPct(s.avgReturnPct, 2)}</td>
                          <td className="text-right" style={{ color: moveColor(s.avgExcessPct) }}>{s.avgExcessPct === null ? 'n/a' : fmtPct(s.avgExcessPct, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
          <p className="text-xs" style={muted}>Open positions count at their latest nightly close.</p>
        </Card>
      )}

      {data && data.portfolios.length > 0 && (
        <Card className="space-y-4">
          <SectionTitle id="yours" icon={Briefcase} title="Your choices against the system's" sub="Each portfolio's return minus SPY's since it started. Click a bar to open the portfolio." />
          <HBars
            labelWidth={200}
            format={(v) => fmtPct(v, 2)}
            onRow={(id) => navigate(`/portfolios/${id}`)}
            rows={data.portfolios
              .filter((p) => p.spyReturnPct !== null)
              .map((p) => ({
                key: String(p.id),
                label: `${p.name}${kindInfo(p.kind).tag ? ` (${kindInfo(p.kind).tag})` : ''}`,
                value: Math.round((p.returnPct - (p.spyReturnPct ?? 0)) * 100) / 100,
                note: `return ${fmtPct(p.returnPct, 2)} · worst drop ${p.maxDrawdownPct ? `−${p.maxDrawdownPct}%` : '0%'}`,
              }))
              .sort((a, b) => b.value - a.value)}
          />
        </Card>
      )}

      {ft && (
        <Card className="space-y-4">
          <SectionTitle
            id="forward"
            icon={FlaskConical}
            title={`Forward paper test: ${ft.status}`}
            sub={ft.rule}
          />
          <div className="space-y-1">
            <div className="flex justify-between text-sm" style={muted}><span>Started {ft.start}</span><span>Ends {ft.end}</span></div>
            <div className="h-4 overflow-hidden rounded-full" style={{ background: 'var(--color-border, #e2e8f0)' }} role="img" aria-label={`${ft.elapsed} of ${ft.tradingDays} trading days done`}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (ft.elapsed / Math.max(1, ft.tradingDays)) * 100)}%`, background: 'var(--viz-1, #2a78d6)' }} />
            </div>
            <div className="text-sm">{ft.elapsed} of {ft.tradingDays} trading days</div>
          </div>
          <SegmentBar unit=" positions" parts={[{ label: 'Beat SPY', value: ft.beatSpy, color: '#0A8F80' }, { label: 'Did not', value: Math.max(0, ft.closedPositions - ft.beatSpy), color: '#D4501A' }]} />
          <p className="text-xs" style={muted}>The bar was written down before any results existed, so it cannot be bent to fit them.</p>
        </Card>
      )}
    </div>
  )
}
