import { useEffect, useState } from 'react'
import { ChartGuide } from '../components/learn/Learn'
import { ZodError } from 'zod'
import { fetchScorecard, type Scorecard as ScorecardData, type ScoreCell } from '../services/nightly'
import { pivot } from '../components/scorecard/pivot'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import { Award, Building2, CalendarDays, CheckCircle2, Clock, Gauge, Layers, ListChecks, Target, Timer, TrendingUp, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BestWorst, ConfidenceScatter, HorizonLines, NightColumns } from '../components/scorecard/charts'
import { Card, HBars, PageHeader, SectionTitle, Segmented, StatTile } from '../components/viz'

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: ScorecardData | null }

function GroupTable({ title, cells, horizons }: { title: string; cells: ScoreCell[]; horizons: number[] }) {
  const rows = pivot(cells, horizons)
  return (
    <section className="rounded-lg" style={card}>
      <h3 className="sr-only">{title}</h3>
      {rows.length === 0 ? (
        <p className="pt-2 text-sm" style={muted}>Nothing has matured yet.</p>
      ) : (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}: average return versus the market after 1, 3 and 5 trading days</caption>
            <thead style={muted}>
              <tr>
                <th scope="col" className="p-2">Group</th>
                {horizons.map((h) => (
                  <th key={h} scope="col" className="p-2">After {h} day{h === 1 ? '' : 's'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <th scope="row" className="p-2 font-medium">{r.key}</th>
                  {r.cells.map((c, i) => (
                    <td key={horizons[i]} className="p-2" style={c && !c.enough ? muted : undefined}>
                      {c ? (
                        <>
                          <span style={{ color: c.enough ? moveColor(c.avg_excess_pct) : undefined }}>
                            {fmtPct(c.avg_excess_pct)}
                          </span>{' '}
                          <span style={muted}>
                            ({c.n} call{c.n === 1 ? '' : 's'}, {Math.round(c.up_share * 100)}% beat it)
                          </span>
                          {!c.enough && <span className="block text-xs">too early to judge</span>}
                        </>
                      ) : (
                        <span style={muted}>-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** One group's average return against the benchmark at the chosen horizon, as bars; the full table on request. */
function GroupChart({ id, icon, title, sub, cells, horizons, horizon }: { id: string; icon: React.ElementType; title: string; sub: string; cells: ScoreCell[]; horizons: number[]; horizon: number }) {
  const [table, setTable] = useState(false)
  const rows = cells
    .filter((c) => c.horizon === horizon)
    .sort((a, b) => b.avg_excess_pct - a.avg_excess_pct)
    .map((c) => ({
      key: c.key,
      label: c.key,
      value: c.avg_excess_pct,
      faint: !c.enough,
      note: `${c.n} call${c.n === 1 ? '' : 's'} · ${Math.round(c.up_share * 100)}% beat${c.enough ? '' : ' · too early'}`,
    }))
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SectionTitle id={id} icon={icon} title={title} sub={sub} />
        <button type="button" className="text-sm underline" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show all horizons as a table'}</button>
      </div>
      {table ? (
        <GroupTable title={title} cells={cells} horizons={horizons} />
      ) : rows.length ? (
        <HBars rows={rows} format={(v) => fmtPct(v, 2)} labelWidth={170} />
      ) : (
        <p style={muted}>Nothing has matured at {horizon} day{horizon === 1 ? '' : 's'} yet.</p>
      )}
      <ChartGuide shows={"How far each group's calls beat or lagged SPY, on average, after the chosen number of trading days."} good={"Bars to the right of zero in full color: the group beat the market on enough calls to count."} careful={"Faded bars rest on fewer than 10 calls. The same stock is called night after night, so calls are not independent: read these as hints."} terms={["vs-spy", "horizon", "sample"]} />
    </Card>
  )
}

function WaitingTable({ cells }: { cells: ScoreCell[] }) {
  const rows = cells.filter((c) => c.trigger).sort((a, b) => a.key.localeCompare(b.key) || a.horizon - b.horizon)
  if (rows.length === 0) return null
  return (
    <section className="pt-2">
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Fill rate and waiting versus buying now, by call and horizon</caption>
          <thead style={muted}>
            <tr>
              <th scope="col" className="p-2">Call</th>
              <th scope="col" className="p-2">Horizon</th>
              <th scope="col" className="p-2">Calls</th>
              <th scope="col" className="p-2">Triggered</th>
              <th scope="col" className="p-2">Cancelled</th>
              <th scope="col" className="p-2">Waiting vs buying now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`${c.key}-${c.horizon}`} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                <th scope="row" className="p-2 font-medium">{c.key}</th>
                <td className="p-2">{c.horizon} day{c.horizon === 1 ? '' : 's'}</td>
                <td className="p-2">{c.trigger?.n}</td>
                <td className="p-2">{Math.round((c.trigger?.fill_rate ?? 0) * 100)}%</td>
                <td className="p-2">{Math.round((c.trigger?.cancelled_rate ?? 0) * 100)}%</td>
                <td className="p-2" style={(c.trigger?.n ?? 0) >= 10 ? { color: moveColor(c.trigger?.wait_minus_now_pct) } : muted}>
                  {fmtPct(c.trigger?.wait_minus_now_pct)}
                  {(c.trigger?.n ?? 0) < 10 && <span className="block text-xs">too early to judge</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function Scorecard() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [horizon, setHorizon] = useState(5)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchScorecard()
      .then((data) => !cancelled && setState({ kind: 'ready', data }))
      .catch((e: unknown) =>
        !cancelled &&
        setState({
          kind: 'error',
          message: e instanceof ZodError ? 'The scorecard data was not in the expected shape' : 'Could not load the scorecard',
        }),
      )
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') return <p role="status" className="p-6" style={muted}>Loading the scorecard...</p>
  if (state.kind === 'error') {
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">Scorecard</h1>
        <p className="pt-2">{state.message}.</p>
      </div>
    )
  }
  if (!state.data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Scorecard</h1>
        <p className="pt-2">No scorecard yet.</p>
        <p className="text-sm" style={muted}>It is built after each nightly run once calls are a trading day old.</p>
      </div>
    )
  }

  const d = state.data
  const m = (h: number) => d.matured[String(h)] ?? 0
  const h = d.horizons.includes(horizon) ? horizon : d.horizons[0]
  const waiting = d.groups.label.filter((c) => c.trigger && c.horizon === h)
  const detail = d.detail.filter((x) => x.horizon === h)
  const byStock = d.groups.ticker.filter((c) => c.horizon === h).sort((a, b) => b.avg_excess_pct - a.avg_excess_pct)

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <PageHeader icon={Target} title="Scorecard" sub={<>Did past calls work? Each bar is how much the stock beat (or lagged) {d.benchmark} after the call, so a falling market does not make every call look bad.</>}>
        <Segmented label="Horizon" value={h} onChange={setHorizon} options={d.horizons.map((x) => ({ value: x, label: `${x} day${x === 1 ? '' : 's'}` }))} />
      </PageHeader>

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <StatTile icon={ListChecks} label="Calls in the ledger" value={d.calls} hint={d.unscored ? `${d.unscored} could not be scored` : 'all scorable'} />
        {d.horizons.slice(0, 3).map((x) => (
          <StatTile key={x} icon={x === 1 ? Clock : x === 3 ? Timer : CheckCircle2} label={`Finished after ${x} day${x === 1 ? '' : 's'}`} value={m(x)} hint={m(x) < 10 ? 'too few to judge yet' : 'enough to read'} />
        ))}
      </div>

      <p className="text-sm" style={muted}>
        Measured from the close on the day of the call, whether or not a "wait for the trigger" call ever triggered. Faded bars rest on fewer than 10
        calls. Calls repeat the same stock on different nights, so read every number as a hint, not a verdict. Updated{' '}
        {d.generated_at.slice(0, 16).replace('T', ' ')} UTC.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <SectionTitle icon={TrendingUp} title="Does the edge grow with time?" sub={`Average beat of ${d.benchmark} after 1, 3 and 5 trading days, per kind of call. Fewer calls have finished the longer horizons.`} />
          <HorizonLines cells={d.groups.label} horizons={d.horizons} benchmark={d.benchmark} />
          <ChartGuide shows={"For each kind of call, the average beat of SPY after 1, 3 and 5 trading days."} good={"A line above zero that climbs to the right: the call's edge grows as time passes instead of fading."} careful={"Later points rest on fewer calls (they need more days to finish). A lone dot means only one horizon has results yet."} terms={["vs-spy", "horizon", "call"]} />
        </Card>
        <Card className="space-y-4">
          <SectionTitle icon={CalendarDays} title="Night by night" sub={`Average beat of ${d.benchmark} after ${h} day${h === 1 ? '' : 's'} for the calls made each night. Faded: fewer than 10 calls.`} />
          <NightColumns cells={d.groups.night.filter((c) => c.horizon === h)} benchmark={d.benchmark} />
          <ChartGuide shows={"One column per night: the average result of that night's calls against SPY."} good={"Most columns above zero, with no single night carrying the whole result."} careful={"All calls from one night share the same market days, so one sector swing can push a whole column up or down."} terms={["vs-spy", "sample"]} />
        </Card>
      </div>

      {detail.length > 0 && (
        <Card className="space-y-4">
          <SectionTitle icon={Gauge} title="Confidence against the result" sub={`Every call finished at ${h} day${h === 1 ? '' : 's'}: how sure the model said it was (across) and how the stock did against ${d.benchmark} (up). If confidence meant something, the dots would climb to the right. Click a dot for the stock.`} />
          <ConfidenceScatter detail={detail} benchmark={d.benchmark} />
          <ChartGuide shows={"Each finished call as a dot: the confidence the model gave (across) and how the stock did against SPY (up)."} good={"Dots that climb to the right: surer calls doing better. That is what 'calibrated' would look like."} careful={"Confidences sit in a narrow band (mostly 55-68%), so a real slope needs many calls before it shows."} terms={["confidence", "vs-spy"]} />
        </Card>
      )}

      {detail.length > 0 && (
        <Card className="space-y-4">
          <SectionTitle icon={Trophy} title="Best and worst calls" sub={`Against ${d.benchmark} after ${h} day${h === 1 ? '' : 's'}. Opens the stock on the night of the call.`} />
          <BestWorst detail={detail} benchmark={d.benchmark} />
          <ChartGuide shows={"The six best and six worst calls against SPY at this horizon."} good={"Open a few of each: the lesson is in why the reasoning held or failed, not in the numbers."} careful={"Extremes are mostly luck. Watch for a stock or a kind of call that keeps showing up on one side."} terms={["vs-spy"]} />
        </Card>
      )}

      {byStock.length > 0 && (
        <Card className="space-y-4">
          <SectionTitle icon={Building2} title="By stock" sub={`Average beat of ${d.benchmark} after ${h} day${h === 1 ? '' : 's'}, across every call on each stock. Faded: fewer than 3 calls. Click for the stock.`} />
          <HBars
            labelWidth={90}
            format={(v) => fmtPct(v, 2)}
            onRow={(t) => navigate(`/stock/${t}`)}
            rows={byStock.map((c) => ({ key: c.key, label: c.key, ticker: c.key, value: c.avg_excess_pct, faint: c.n < 3, note: `${c.n} call${c.n === 1 ? '' : 's'} · ${Math.round(c.up_share * 100)}% beat` }))}
          />
          <ChartGuide shows={"Each stock's average result against SPY across all its calls."} good={"Results spread across many stocks, not one or two big winners."} careful={"Faded bars rest on fewer than 3 calls. Nightly repeats of the same view count as several calls but are really one opinion."} terms={["sample", "vs-spy"]} />
        </Card>
      )}

      <GroupChart id="by-call" icon={Award} title="By call" sub={`Average beat of ${d.benchmark} after ${h} day${h === 1 ? '' : 's'}, by what the system said.`} cells={d.groups.label} horizons={d.horizons} horizon={h} />
      <div className="grid gap-6 lg:grid-cols-2">
        <GroupChart id="by-confidence" icon={Gauge} title="By confidence" sub="Are surer calls better?" cells={d.groups.band} horizons={d.horizons} horizon={h} />
        <GroupChart id="by-setup" icon={Layers} title="By model setup" sub="Which model mix did best." cells={d.groups.profile} horizons={d.horizons} horizon={h} />
      </div>

      {waiting.length > 0 && (
        <Card className="space-y-4">
          <SectionTitle icon={Timer} title="Did waiting for the trigger pay?" sub={`Waiting minus buying at the call price, after ${h} day${h === 1 ? '' : 's'}. Positive means waiting won. A call that never triggered counts as 0%.`} />
          <HBars
            labelWidth={170}
            format={(v) => fmtPct(v, 2)}
            rows={waiting.map((c) => ({
              key: c.key,
              label: c.key,
              value: c.trigger?.wait_minus_now_pct ?? 0,
              faint: (c.trigger?.n ?? 0) < 10,
              note: `${Math.round((c.trigger?.fill_rate ?? 0) * 100)}% triggered · ${Math.round((c.trigger?.cancelled_rate ?? 0) * 100)}% cancelled`,
            }))}
          />
          <details>
            <summary className="cursor-pointer text-sm underline">All horizons as a table</summary>
            <WaitingTable cells={d.groups.label} />
          </details>
          <ChartGuide shows={"For 'wait for the trigger' calls: the return from waiting minus the return from buying at the call's price."} good={"Above zero: waiting for the trigger bought cheaper or avoided losses."} careful={"A call that never triggered counts as 0%; one cancelled at the walk-away dodged the fall, which helps this number."} terms={["trigger", "walk-away"]} />
        </Card>
      )}
    </div>
  )
}
