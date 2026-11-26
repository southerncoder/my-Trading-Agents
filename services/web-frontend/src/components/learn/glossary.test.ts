import { describe, expect, it } from 'vitest'
import { ENTRY, GLOSSARY } from './glossary'

describe('glossary', () => {
  it('has unique ids and every "see also" points at a real entry', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length)
    for (const e of GLOSSARY) for (const id of e.seeAlso ?? []) expect(ENTRY[id], `${e.id} -> ${id}`).toBeDefined()
  })
})

describe('timingTitle', () => {
  it('asks the question that fits the call', async () => {
    const { timingTitle } = await import('./glossary')
    expect(timingTitle('Buy now')).toBe('Why act now?')
    expect(timingTitle('Buy if price reaches trigger')).toBe('Why wait for the trigger?')
    expect(timingTitle('Exit')).toBe('Why sell now?')
    expect(timingTitle('Trim')).toBe('Why sell now?')
    expect(timingTitle('Wait')).toBe('Why not act yet?')
  })
})
