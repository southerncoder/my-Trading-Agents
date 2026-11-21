import { parseMarkdown, type Inline } from './markdown'

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  )
}

/** Renders model write-ups as plain React elements; no HTML is ever injected. */
export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {parseMarkdown(text).map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h3 key={i} className={b.level === 1 ? 'text-lg font-semibold' : 'font-semibold'}>
              <Inlines parts={b.inline} />
            </h3>
          )
        }
        if (b.kind === 'bullets') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inlines parts={item} />
                </li>
              ))}
            </ul>
          )
        }
        if (b.kind === 'code') {
          return (
            <pre key={i} className="overflow-x-auto rounded p-3 text-xs" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>
              {b.text}
            </pre>
          )
        }
        return (
          <p key={i}>
            <Inlines parts={b.inline} />
          </p>
        )
      })}
    </div>
  )
}
