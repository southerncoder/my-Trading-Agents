import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookMarked, Search } from 'lucide-react'
import { PageHeader, muted } from '../components/viz'
import { ENTRY, GLOSSARY } from '../components/learn/glossary'

export function Glossary() {
  const { hash } = useLocation()
  const [q, setQ] = useState('')
  // Open at the linked entry (charts link to /glossary#term).
  useEffect(() => {
    const id = hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [hash])
  const query = q.trim().toLowerCase()
  const shown = GLOSSARY.filter((e) => !query || `${e.term} ${e.short} ${e.long}`.toLowerCase().includes(query))
  return (
    <div className="app-page mx-auto max-w-4xl space-y-6 p-3 sm:p-4 md:p-8">
      <PageHeader icon={BookMarked} title="Glossary" sub="The words this site uses, in plain English. Charts link here; hover a dotted word for its short meaning." />
      <label className="flex max-w-sm items-center gap-2 rounded border px-3 py-2" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
        <Search className="h-4 w-4" style={muted} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a word" className="w-full bg-transparent outline-none" aria-label="Find a word" />
      </label>
      <nav aria-label="Terms" className="flex flex-wrap gap-2 text-sm">
        {shown.map((e) => (
          <a key={e.id} href={`#${e.id}`} className="rounded-full px-3 py-1" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>{e.term}</a>
        ))}
      </nav>
      <div className="space-y-4">
        {shown.map((e) => (
          <section key={e.id} id={e.id} className="scroll-mt-20 space-y-2 rounded-2xl p-5" style={{ border: `1px solid ${hash === `#${e.id}` ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e2e8f0)'}` }}>
            <h2 className="text-xl font-bold">{e.term}</h2>
            <p className="text-lg font-medium">{e.short}</p>
            <p className="leading-relaxed">{e.long}</p>
            {e.example && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 6%, transparent)' }}>Example: {e.example}</p>}
            {e.seeAlso && (
              <p className="text-sm" style={muted}>
                See also:{' '}
                {e.seeAlso.map((id, i) => (
                  <span key={id}>{i ? ', ' : ''}<a href={`#${id}`} className="underline">{ENTRY[id]?.term ?? id}</a></span>
                ))}
              </p>
            )}
          </section>
        ))}
        {!shown.length && <p style={muted}>No word matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  )
}
