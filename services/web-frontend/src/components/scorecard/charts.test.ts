import { describe, expect, it } from 'vitest'
import { familyOf } from './charts'

describe('familyOf', () => {
  it('sorts every call label into one of four families', () => {
    expect(familyOf('Buy now')).toBe('buy_now')
    expect(familyOf('Buy if price reaches trigger')).toBe('trigger')
    expect(familyOf('Wait')).toBe('wait')
    expect(familyOf('Keep')).toBe('wait')
    expect(familyOf('Exit')).toBe('exit')
    expect(familyOf('Trim')).toBe('exit')
    expect(familyOf('Short if price reaches trigger')).toBe('exit')
  })
})
