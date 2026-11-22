import { describe, expect, it } from 'vitest'
import { repairDeep, repairText } from './mojibake.js'

describe('repairText (UTF-8 that Windows PowerShell decoded as code page 437)', () => {
  it('restores punctuation and accents', () => {
    expect(repairText('netΓÇæcash')).toBe('net‑cash')
    expect(repairText('a ΓÇö b')).toBe('a — b')
    expect(repairText('caf├⌐')).toBe('café')
  })
  it('leaves real text alone, including characters that also exist in code page 437', () => {
    expect(repairText('café ½ price')).toBe('café ½ price')
    expect(repairText('Γ alone')).toBe('Γ alone')
    expect(repairText('plain')).toBe('plain')
  })
  it('repairs strings inside objects and arrays', () => {
    expect(repairDeep({ a: ['xΓÇöy'], b: 1, c: null })).toEqual({ a: ['x—y'], b: 1, c: null })
  })
})
