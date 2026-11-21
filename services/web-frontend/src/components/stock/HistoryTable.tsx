import type { HistoryPoint } from '../../services/nightly'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from '../today/format'

interface Props {
  history: HistoryPoint[]
  selected: string
  onSelect: (date: string) => void
}

export function HistoryTable({ history, selected, onSelect }: Props) {
  const rows = [...history].reverse()
  const changeAt = (i: number) => {
    const prev = rows[i + 1]
    return prev ? (rows[i].price / prev.price - 1) * 100 : null
  }

  return (
    <>
      {/* Phones: one card per night. Tap a night to load its write-ups below. */}
      <ul className="space-y-2 md:hidden">
        {rows.map((h, i) => {
          const change = changeAt(i)
          const on = h.date === selected
          return (
            <li key={h.date} className="rounded-lg" style={{ ...card, borderColor: on ? 'var(--color-primary)' : undefined }}>
              <button
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => onSelect(h.date)}
                className="block w-full p-3 text-left"
              >
                <span className="flex items-baseline justify-between">
                  <span className="font-semibold underline">{h.date}</span>
                  <span>
                    {fmtPrice(h.price)}{' '}
                    <span className="text-xs" style={{ color: moveColor(change) ?? muted.color }}>
                      {arrow(change)} {fmtPct(change)}
                    </span>
                  </span>
                </span>
                <span className="mt-1 block text-sm">{h.label}</span>
                <span className="mt-1 flex flex-wrap gap-x-4 text-xs" style={muted}>
                  <span>
                    Trigger {fmtPrice(h.trigger_price)} {h.trigger_type ?? ''}
                  </span>
                  <span>Confidence {Math.round(h.confidence * 100)}%</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg md:block" style={card}>
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
              const change = changeAt(i)
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
    </>
  )
}
