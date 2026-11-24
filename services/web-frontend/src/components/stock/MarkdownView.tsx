import { parseMarkdown, type Inline } from './markdown'
import { tokenize } from './trail'

export const SOURCE_COLOR: Record<string, string> = {
  market: 'var(--viz-1, #2a78d6)',
  fundamentals: 'var(--viz-2, #eb6834)',
  news: 'var(--viz-3, #1baf7a)',
  social: 'var(--viz-4, #eda100)',
}

/** Plain text with money and percentages set off, and citation tags as chips that open the cited report. */
function Rich({ text, onCite }: { text: string; onCite?: (source: string) => void }) {
  return (
    <>
      {tokenize(text).map((t, i) => {
        if (t.kind === 'cite') {
          const color = SOURCE_COLOR[t.source ?? '']
          const label = t.source ?? ''
          return onCite && color ? (
            <button
              key={i}
              type="button"
              onClick={() => onCite(label)}
              title={`Open the ${label} report this cites`}
              className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full px-1.5 py-0 align-middle text-[11px] font-semibold"
              style={{ border: `1px solid ${color}`, color: 'var(--color-text-primary, inherit)' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
              {label}
            </button>
          ) : (
            <span key={i} className="text-xs" style={{ color: 'var(--color-text-muted, #64748b)' }}>{t.text}</span>
          )
        }
        if (t.kind === 'money' || t.kind === 'pct') {
          const neg = /^[−-]/.test(t.text)
          const pos = /^\+/.test(t.text)
          return (
            <span
              key={i}
              className="rounded px-1 font-semibold tabular-nums"
              style={{
                background: 'color-mix(in srgb, var(--color-primary, #2563eb) 9%, transparent)',
                color: neg ? '#D4501A' : pos ? '#0A8F80' : undefined,
              }}
            >
              {t.text}
            </span>
          )
        }
        return <span key={i}>{t.text}</span>
      })}
    </>
  )
}

function Inlines({ parts, onCite }: { parts: Inline[]; onCite?: (s: string) => void }) {
  return (
    <>
      {parts.map((p, i) => (p.bold ? <strong key={i}><Rich text={p.text} onCite={onCite} /></strong> : <Rich key={i} text={p.text} onCite={onCite} />))}
    </>
  )
}

/** "**RSI(14):** 52.5 (Neutral)" reads as a label and its value. */
function labelValue(item: Inline[]): { label: string; value: Inline[] } | null {
  const [first, ...rest] = item
  if (!first?.bold || !/:\s*$/.test(first.text) || first.text.length > 48) return null
  const value = rest.map((p, i) => (i === 0 ? { ...p, text: p.text.replace(/^\s*/, '') } : p)).filter((p) => p.text)
  return value.length ? { label: first.text.replace(/:\s*$/, ''), value } : null
}

/**
 * Renders model write-ups as plain React elements (no HTML is ever injected). Lists made of "Label: value"
 * lines become a figures grid; citation tags become chips that open the cited report.
 */
export function MarkdownView({ text, onCite }: { text: string; onCite?: (source: string) => void }) {
  return (
    <div className="space-y-4 text-base leading-relaxed">
      {parseMarkdown(text).map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h3 key={i} className={`flex items-center gap-2 ${b.level === 1 ? 'text-xl' : 'text-lg'} font-semibold`} style={{ borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '0.25rem' }}>
              <span className="inline-block h-4 w-1 rounded-full" style={{ background: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
              <Inlines parts={b.inline} onCite={onCite} />
            </h3>
          )
        }
        if (b.kind === 'bullets') {
          const pairs = b.items.map(labelValue)
          if (!b.ordered && pairs.filter(Boolean).length >= Math.max(2, b.items.length * 0.6)) {
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                {b.items.map((item, j) => {
                  const lv = pairs[j]
                  // A bold label with nothing after it introduces the cards below it.
                  if (!lv && item.length === 1 && item[0].bold) {
                    return (
                      <div key={j} className="pt-1 text-sm font-semibold uppercase tracking-wide sm:col-span-2" style={{ color: 'var(--color-text-muted, #64748b)' }}>
                        {item[0].text.replace(/:\s*$/, '')}
                      </div>
                    )
                  }
                  return (
                    <div key={j} className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                      {lv ? (
                        <>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted, #64748b)' }}>{lv.label}</div>
                          <div className="mt-0.5"><Inlines parts={lv.value} onCite={onCite} /></div>
                        </>
                      ) : (
                        <Inlines parts={item} onCite={onCite} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }
          const ListTag = b.ordered ? 'ol' : 'ul'
          return (
            <ListTag key={i} className={b.ordered ? 'list-decimal space-y-1.5 pl-6' : 'space-y-1.5'}>
              {b.items.map((item, j) => (
                <li key={j} className={b.ordered ? '' : 'flex gap-2'}>
                  {!b.ordered && <span className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />}
                  <span><Inlines parts={item} onCite={onCite} /></span>
                </li>
              ))}
            </ListTag>
          )
        }
        if (b.kind === 'code') {
          return (
            <pre key={i} className="overflow-x-auto rounded-xl p-3 text-xs" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>
              {b.text}
            </pre>
          )
        }
        return (
          <p key={i}>
            <Inlines parts={b.inline} onCite={onCite} />
          </p>
        )
      })}
    </div>
  )
}
