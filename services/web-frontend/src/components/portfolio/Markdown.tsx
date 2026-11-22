import { boldParts, mdBlocks } from './helpers'

function Inline({ text }: { text: string }) {
  return (
    <>
      {boldParts(text.replace(/^_(.*)_$/, '$1')).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
    </>
  )
}

/** Renders the review's Markdown subset as plain React elements (never as HTML). */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {mdBlocks(text).map((b, i) => {
        if (b.type === 'h') return b.level <= 2 ? <h2 key={i} className="pt-2 text-lg font-semibold"><Inline text={b.text} /></h2> : <h3 key={i} className="font-semibold"><Inline text={b.text} /></h3>
        if (b.type === 'ul') return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>
        if (b.type === 'table')
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{b.head.map((c, j) => <th key={j} className="px-2 py-1 text-left font-medium">{c}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="px-2 py-1">{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        return <p key={i}><Inline text={b.text} /></p>
      })}
    </div>
  )
}
