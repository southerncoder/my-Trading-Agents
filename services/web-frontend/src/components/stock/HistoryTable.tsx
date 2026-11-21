import type { HistoryPoint } from '../../services/nightly'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from '../today/format'

interface Props {
  history: HistoryPoint[]
  selected: string
  onSelect: (date: string) => void
}

export function HistoryTable({ history, selected, onSelect }: Props) {
  const rows = [...history].reverse()
  return (
    <div className="overflow-x-auto rounded-lg" style={card}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={muted}>
            <th className="p-3 font-normal">Night</th>
            <th className="p-3 font-normal">Price</th>
            <th className="p-3 font-normal">Call</th>
            <th className="p-3 font-normal">Trigger</th>
            <th className="p-3 font-normal">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => {
            const prev = rows[i + 1]
            const change = prev ? (h.price / prev.price - 1) * 100 : null
            const on = h.date === selected
            return (
              <tr key={h.date} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', fontWeight: on ? 600 : 400 }}>
                <td className="p-3">
                  <button type="button" aria-current={on ? 'true' : undefined} onClick={() => onSelect(h.date)} className="underline">
                    {h.date}
                  </button>
                </td>
                <td className="p-3">
                  {fmtPrice(h.price)}{' '}
                  <span className="text-xs" style={{ color: moveColor(change) ?? muted.color }}>
                    {arrow(change)} {fmtPct(change)}
                  </span>
                </td>
                <td className="p-3">{h.label}</td>
                <td className="p-3">
                  {fmtPrice(h.trigger_price)}
                  <span className="ml-1 text-xs" style={muted}>
                    {h.trigger_type ?? ''}
                  </span>
                </td>
                <td className="p-3">{Math.round(h.confidence * 100)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
