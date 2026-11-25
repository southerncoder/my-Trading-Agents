import { describe, expect, it } from 'vitest'
import { ENTRY, GLOSSARY } from './glossary'

describe('glossary', () => {
  it('has unique ids and every "see also" points at a real entry', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length)
    for (const e of GLOSSARY) for (const id of e.seeAlso ?? []) expect(ENTRY[id], `${e.id} -> ${id}`).toBeDefined()
  })
})
