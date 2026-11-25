import { describe, expect, it } from 'vitest'
import { heatAlpha } from './widgets'

describe('heatAlpha', () => {
  it('grows with the size of the move and caps', () => {
    expect(heatAlpha(0)).toBe(0.04)
    expect(heatAlpha(1.5)).toBeCloseTo(0.25, 2)
    expect(heatAlpha(-3)).toBeCloseTo(0.46, 2)
    expect(heatAlpha(10)).toBeCloseTo(0.46, 2)
  })
})
