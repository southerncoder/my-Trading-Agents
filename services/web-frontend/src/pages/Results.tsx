import { Link, useNavigate } from 'react-router-dom'
import { KIND_INFO, SOURCE_LABEL } from '../components/portfolio/helpers'
import { sectionTitle, useLoad } from '../components/portfolio/ui'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import { fetchResults } from '../services/portfolio'

export function Results() {
  const { data, error } = useLoad(fetchResults, 'r')
  const navigate = useNavigate()
  const ft = data?.forwardTest
  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Results by source</h1>
        <p className="text-sm" style={muted}>
          Measured on the shadow portfolio, which takes every pick at the same size and exits by the rules, so your own choices do not bias the
          comparison. Every return sits next to SPY over the same days. A handful of positions says very little: wait for 20 or more closed ones.
        </p>
      </header>
      {error && <p role="alert" style={{ color: '#D4501A' }}>Could not load results: {error}</p>}
      {!data && !error && <p role="status" className="text-sm" style={muted}>Loading...</p>}

      {data && (
        <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="by-source">
          <h2 id="by-source" className={sectionTitle}>Which source picks better</h2>
          {data.bySource.length === 0 ? (
            <p className="text-sm" style={muted}>No shadow positions yet. They start after the first nightly run with picks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead><tr className="text-left" style={muted}><th>Source</th><th className="text-right">Positions</th><th className="text-right">Closed</th><th className="text-right">Made money</th><th className="text-right">Average return</th><th className="text-right">Average vs SPY</th></tr></thead>
                <tbody>
                  {data.bySource.map((s) => (
                    <tr key={s.source} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                      <td className="py-1.5"><Link to="/picks" className="underline decoration-dotted underline-offset-2 hover:decoration-solid" title="See tonight's picks">{SOURCE_LABEL[s.source] ?? s.source}</Link></td>
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
          )}
          <p className="text-xs" style={muted}>Open positions count at their latest nightly close. &ldquo;vs SPY&rdquo; is the position&apos;s return minus SPY&apos;s over the days it was held.</p>
        </section>
      )}

      {data && (
        <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="yours">
          <h2 id="yours" className={sectionTitle}>Your choices against the system&apos;s</h2>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead><tr className="text-left" style={muted}><th>Portfolio</th><th className="text-right">Return</th><th className="text-right">SPY</th><th className="text-right">Difference</th><th className="text-right">Worst drop</th></tr></thead>
              <tbody>
                {data.portfolios.map((p) => {
                  const diff = p.spyReturnPct === null ? null : Math.round((p.returnPct - p.spyReturnPct) * 100) / 100
                  return (
                    <tr key={p.id} className="clickable-row" onClick={() => navigate(`/portfolios/${p.id}`)} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                      <td className="py-1.5"><Link to={`/portfolios/${p.id}`} className="underline">{p.name}</Link>{KIND_INFO[p.kind].tag && <span style={muted}> ({KIND_INFO[p.kind].tag})</span>}</td>
                      <td className="text-right" style={{ color: moveColor(p.returnPct) }}>{fmtPct(p.returnPct, 2)}</td>
                      <td className="text-right">{p.spyReturnPct === null ? 'n/a' : fmtPct(p.spyReturnPct, 2)}</td>
                      <td className="text-right" style={{ color: moveColor(diff) }}>{diff === null ? 'n/a' : fmtPct(diff, 2)}</td>
                      <td className="text-right">{p.maxDrawdownPct ? `-${p.maxDrawdownPct}%` : '0%'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ft && (
        <section className="space-y-1 rounded-lg p-4 text-sm" style={card} aria-labelledby="forward">
          <h2 id="forward" className={sectionTitle}>Forward paper test: <span style={{ color: ft.status === 'passed' ? '#0A8F80' : ft.status === 'failed' ? '#D4501A' : undefined }}>{ft.status}</span></h2>
          <p>{ft.rule}</p>
          <p style={muted}>Started {ft.start}, ends {ft.end}: {ft.elapsed} of {ft.tradingDays} trading days. Closed positions so far: {ft.closedPositions}, of which {ft.beatSpy} beat SPY.</p>
          <p className="text-xs" style={muted}>The bar was written down before any results existed, so it cannot be bent to fit them.</p>
        </section>
      )}
    </div>
  )
}
